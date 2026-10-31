# Store Admin Settings Page — Interview Notes

## Purpose

Settings loads the current store and user, displays editable forms, and persists store settings. Account, preferences, and security sections are currently UI placeholders.

## State model

```jsx
const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [storeInfo, setStoreInfo] = useState(null);
const [userInfo, setUserInfo] = useState(null);
const [storeForm, setStoreForm] = useState({
  brand: '', description: '', storeType: '',
  contact: { address: '', phone: '', email: '' },
});
const [userForm, setUserForm] = useState({ fullName: '', email: '', phone: '' });
```

Server objects and temporary form values are separate. Typing in a field does not pretend that the backend is already updated.

## API map

| Purpose | Method | Endpoint |
|---|---|---|
| Load current admin store | `GET` | `/api/stores/admin` |
| Load authenticated profile | `GET` | `/api/users/profile` |
| Save store settings | `PUT` | `/api/stores/{id}` |

## Initial loading

```jsx
useEffect(() => { fetchData(); }, []);

const fetchData = async () => {
  const [storeResponse, profileResponse] = await Promise.all([
    storeAPI.getByAdmin(), userAPI.getProfile(),
  ]);
  const store = storeResponse.data?.[0] || storeResponse.data;
  const user = profileResponse.data;
  setStoreInfo(store);
  setUserInfo(user);
  setStoreForm(toStoreForm(store));
  setUserForm(toUserForm(user));
  setLoading(false);
};
```

The two independent requests are started together. The response is mapped into form-friendly values.

## Nested contact input

```jsx
if (name.startsWith('contact.')) {
  const field = name.split('.')[1];
  setStoreForm(previous => ({
    ...previous,
    contact: { ...previous.contact, [field]: value },
  }));
}
```

The inner spread is essential: without it, editing a phone number would erase address and email from local state.

## Saving the store

```jsx
const handleStoreSave = async event => {
  event.preventDefault();
  if (!storeInfo?.id) return;

  setSaving(true);
  try {
    await storeAPI.update(storeInfo.id, storeForm);
    await fetchData();
    window.dispatchEvent(new CustomEvent('storeInfoUpdated'));
    toast.success('Store settings updated successfully');
  } catch (error) {
    toast.error('Failed to update store settings');
  } finally {
    setSaving(false);
  }
};
```

Flow: prevent native submit, validate the ID, send a PUT DTO, reload authoritative server data, notify other UI components, show feedback, and always clear the saving state.

## Fields currently supported

`brand`, `storeType` (`RETAIL`, `WHOLESALE`, `ONLINE`, `HYBRID`), `description`, `contact.address`, `contact.phone`, and `contact.email`.

## Account, preferences, and security

The account section reads `GET /api/users/profile`; full name/email are disabled and phone is editable in local state. Its save handler currently displays “will be available soon” and makes no API call. Preferences and Security are placeholders for future currency/timezone/notifications and password/2FA/session features.

## Interview questions

**Why separate server and form state?** The server object is the last persisted truth; the form is temporary input and can be cancelled or validated.

**Why reload after PUT?** The server may normalize values, update timestamps, or apply rules; reloading returns the authoritative representation.

**Why dispatch `storeInfoUpdated`?** A header or other component may display the brand. The event tells it to refresh without tightly coupling components.

**What validation belongs here?** Required brand/type, valid email/phone, length limits, enum validation, and matching backend validation because frontend checks can be bypassed.

**How would you implement account saving?** Add a validated `PATCH /api/users/profile` DTO and call it from `handleUserSave`, then reload the profile.

**What production improvements are useful?** Field-level errors, disabled controls during save, optimistic-lock/version checks, audit logging, and query-cache invalidation after mutation.
