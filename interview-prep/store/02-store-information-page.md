# Store Admin Store Information — Interview Guide

This note follows `src/pages/store/stores/StoresPage.jsx` and the API methods in `src/services/api.js`.

## 1. Route and purpose

The Store Admin sidebar links to `/store/stores`. The page manages the business owner's store record: load it, display its basic/contact information, edit it, and create the first store when none exists.

## 2. State used by the page

```jsx
const [storeInfo, setStoreInfo] = useState(null)
const [loading, setLoading] = useState(true)
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
const [editForm, setEditForm] = useState({
  brand: '', description: '', storeType: '',
  contact: { address: '', phone: '', email: '' }
})
```

`storeInfo` is the server response displayed on the page. `editForm` and `createForm` are controlled-form state. Dialog booleans decide whether the corresponding modal is visible. `loading` controls the spinner.

## 3. Initial store request

```jsx
useEffect(() => {
  fetchStoreInfo()
}, [])

const fetchStoreInfo = async () => {
  setLoading(true)
  const stores = await storeAPI.getByAdmin()
  if (stores && stores.length > 0) {
    const store = stores[0]
    setStoreInfo(store)
    setEditForm({
      brand: store.brand || '',
      description: store.description || '',
      storeType: store.storeType || '',
      contact: {
        address: store.contact?.address || '',
        phone: store.contact?.phone || '',
        email: store.contact?.email || '',
      },
    })
  }
  setLoading(false)
}
```

The API method is:

```js
storeAPI.getByAdmin = () => apiCall('/stores/admin')
```

The shared `apiCall` adds the `/api` base URL and the JWT `Authorization` header, so the browser sends `GET /api/stores/admin`.

The backend identifies the authenticated Store Admin from the JWT and returns that admin's stores. The UI uses the first item because this role normally owns one store in the current product flow.

## 4. Displaying store data

The page does not hard-code the name, type, description, date, address, phone, or email. It reads them from `storeInfo`:

```jsx
<p>{storeInfo.brand || 'N/A'}</p>
<span>{storeInfo.storeType || 'Not specified'}</span>
<p>{storeInfo.description || 'No description provided'}</p>
<p>{storeInfo.contact?.address}</p>
<p>{storeInfo.contact?.phone}</p>
<p>{storeInfo.contact?.email}</p>
```

Optional chaining prevents a missing `contact` object from crashing the render.

## 5. Refresh flow

The Refresh button calls the same loader:

```jsx
<Button onClick={fetchStoreInfo}>Refresh</Button>
```

This repeats `GET /api/stores/admin`, replaces `storeInfo`, and refreshes the visible values.

## 6. Edit flow

Clicking Edit only opens the dialog:

```jsx
const handleEdit = () => setIsEditDialogOpen(true)
```

The form fields are controlled. For normal fields:

```jsx
const handleInputChange = (field, value) => {
  setEditForm(prev => ({ ...prev, [field]: value }))
}
```

For nested contact fields, the code preserves the other contact values:

```jsx
if (field.startsWith('contact.')) {
  const contactField = field.replace('contact.', '')
  setEditForm(prev => ({
    ...prev,
    contact: { ...prev.contact, [contactField]: value },
  }))
}
```

When Save is clicked:

```jsx
await storeAPI.update(storeInfo.id, editForm)
await fetchStoreInfo()
setIsEditDialogOpen(false)
window.dispatchEvent(new CustomEvent('storeInfoUpdated'))
toast.success('Store information updated successfully!')
```

The API method sends:

```js
storeAPI.update = (id, storeDto) => apiCall(`/stores/${id}`, {
  method: 'PUT',
  body: JSON.stringify(storeDto),
})
```

Therefore the request is `PUT /api/stores/{id}` with a JSON body containing `brand`, `description`, `storeType`, and the nested `contact` object. After success, the page reloads the server copy instead of assuming the update succeeded. The custom event tells the shared Store Admin layout to refresh its store name in the sidebar.

## 7. Create flow when no store exists

If the admin endpoint returns an empty list, `storeInfo` remains `null` and the page displays “No Store Found” with a Create Store button.

The create handler validates the required name, builds a DTO, and calls:

```jsx
await storeAPI.create({
  brand: createForm.brand,
  description: createForm.description || '',
  storeType: createForm.storeType || '',
  contact: createForm.contact,
})
```

The API method sends `POST /api/stores`. After creation, the dialog closes, the form resets, `fetchStoreInfo()` loads the new record, and `storeInfoUpdated` refreshes the layout.

## 8. Error and loading behavior

The page shows a spinner while loading. Update/create failures are logged for debugging and shown to the user through a toast. The edit handler also protects against a missing ID:

```jsx
if (!storeInfo?.id) {
  toast.error('Store ID not found')
  return
}
```

## 9. Example request flow

1. User opens `/store/stores`.
2. React runs `fetchStoreInfo()`.
3. Frontend sends `GET /api/stores/admin` with the JWT.
4. Spring Security validates the token and identifies the Store Admin.
5. Backend returns a store DTO.
6. React stores it in `storeInfo` and renders the page.
7. User edits the phone number.
8. Controlled input updates `editForm.contact.phone`.
9. Save sends `PUT /api/stores/1`.
10. The page reloads the updated DTO and broadcasts `storeInfoUpdated`.

## Interview questions and answers

### Why use `storeAPI` instead of calling `fetch` in the component?

The API service centralizes the base URL, JWT header, JSON handling, and endpoint paths. The component stays focused on state and presentation.

### Why call `fetchStoreInfo()` after an update?

The backend is the source of truth. Reloading the DTO ensures the UI displays the actual persisted value, including server-generated fields or normalization.

### Why use controlled inputs?

React state is the single source of truth. It makes validation, nested updates, reset behavior, and request construction predictable.

### Why spread `prev.contact` when changing one field?

Without the spread, changing `phone` could remove `address` and `email` from the nested object. The spread preserves the other fields.

### Why dispatch `storeInfoUpdated`?

The page and the shared layout are separate components. A small browser event lets the layout refetch its displayed store name after an edit/create without tightly coupling the components.

### Why does the page use `stores[0]`?

The current Store Admin model expects one owned store. If multi-store ownership is added later, the UI should introduce a store selector and keep the selected store ID in state instead of assuming index zero.

### What happens when the JWT is missing or expired?

The shared API helper receives an unauthorized response. The authentication flow should clear the session and redirect to login; the page itself should not try to manufacture store data.

### What would you improve for production?

Add schema validation, disable Save while the request is pending, validate email and phone formats, use a dedicated `getMyStore` response instead of a one-item list, and invalidate a shared query cache after mutations.

## Short interview answer

“The Store Information page is a controlled CRUD screen. On mount I call `GET /api/stores/admin`, store the returned DTO in React state, and render its basic and contact fields. Edit opens a controlled form; nested contact changes preserve the rest of the contact object. Save sends `PUT /api/stores/{id}`, then reloads the DTO so the backend remains the source of truth. If the admin has no store, the page shows a create form that sends `POST /api/stores`. Refresh repeats the GET request.”
