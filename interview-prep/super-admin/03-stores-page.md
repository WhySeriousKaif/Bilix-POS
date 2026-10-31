# Super Admin Stores Page

## Data loading

When the page opens, it calls:

```jsx
const data = await storeAPI.getAll()
setStores(data || [])
```

The refresh button calls the same function again. `loading` controls the spinner while the request is running.

## Search flow

Search is client-side after the store list has been loaded:

```jsx
const filtered = stores.filter((store) =>
  store.brand?.toLowerCase().includes(query) ||
  store.contact?.email?.toLowerCase().includes(query)
)
```

The search checks brand, description, email, and phone. It does not call the backend for every keypress.

## Moderation flow

Approve, block, and reject actions call the same API with a different status:

```jsx
await storeAPI.moderate(storeId, 'ACTIVE')
await fetchStores()
```

After the update succeeds, the list is fetched again so the new status appears immediately.

## Details modal

Clicking the eye button stores the selected store in state:

```jsx
const [selectedStore, setSelectedStore] = useState(null)
```

The modal is rendered only when `selectedStore` is not null. Clicking the overlay clears the state and closes it.

## Interview explanation

“The Stores page has one source list from the API and a derived filtered list for search. Refresh reuses the same fetch function. Store moderation sends the selected ID and target status to the backend, then reloads the list. The details dialog is controlled by a selected-store state value.”
