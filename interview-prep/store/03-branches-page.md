# Store Admin Branches — Interview Guide

This note follows `src/pages/store/branches/BranchesPage.jsx` and the `branchAPI` methods in `src/services/api.js`.

## 1. Responsibilities

The Branches page lets a Store Admin load all branches belonging to the current store, search them, create a branch, edit a branch, delete a branch, and refresh the list.

## 2. State model

```jsx
const [branches, setBranches] = useState([])
const [filteredBranches, setFilteredBranches] = useState([])
const [searchQuery, setSearchQuery] = useState('')
const [storeId, setStoreId] = useState(null)
const [selectedBranch, setSelectedBranch] = useState(null)
const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
```

`branches` is the complete backend response. `filteredBranches` is the display list. `storeId` scopes every branch request to the logged-in admin's store. `newBranch` and `editBranch` are controlled forms.

## 3. Finding the store ID

On mount, the page first calls `GET /api/users/profile` through `userAPI.getProfile()`. If the profile contains `storeId`, that value is used. Otherwise it calls `GET /api/stores/admin` through `storeAPI.getByAdmin()` and uses the first owned store ID.

```jsx
const profile = await userAPI.getProfile()
if (profile?.storeId) {
  setStoreId(profile.storeId)
  return
}

const stores = await storeAPI.getByAdmin()
if (stores?.length > 0) setStoreId(stores[0].id)
```

If there is no store, loading ends and `NoStoreBanner` tells the admin to create one first.

## 4. Loading branches

When `storeId` changes, this effect runs:

```jsx
useEffect(() => {
  if (storeId) fetchBranches()
}, [storeId])
```

The request is:

```js
branchAPI.getByStoreId = (storeId) =>
  apiCall(`/branches/store/${storeId}`)
```

So the browser sends `GET /api/branches/store/{storeId}` with the JWT. The response is saved in `branches`, and the filtering effect derives `filteredBranches`.

## 5. Search flow

The search input is controlled by `searchQuery`:

```jsx
onChange={(e) => setSearchQuery(e.target.value)}
```

Whenever the query or backend list changes, `filterBranches()` runs. It searches name, address, phone, and email:

```jsx
const query = searchQuery.toLowerCase()
const filtered = branches.filter(branch =>
  branch.name?.toLowerCase().includes(query) ||
  branch.address?.toLowerCase().includes(query) ||
  branch.phone?.toLowerCase().includes(query) ||
  branch.email?.toLowerCase().includes(query)
)
```

This is client-side filtering; typing does not call the backend again. The Search button submits the form and reruns the same filter.

## 6. Refresh flow

The Refresh button calls `fetchBranches()`, which repeats `GET /api/branches/store/{storeId}`, replaces `branches`, and updates the table.

## 7. Create branch flow

Clicking Add Branch first checks that a store exists. The form collects name, address, phone, and email. Before sending, the code validates:

- branch name is required;
- email format if email is provided;
- phone format if phone is provided.

The payload is normalized before submission:

```jsx
const branchData = {
  name: newBranch.name.trim(),
  address: (newBranch.address || '').trim(),
  phone: (newBranch.phone || '').trim(),
  email: (newBranch.email || '').trim().toLowerCase(),
}
await branchAPI.create(branchData)
```

`branchAPI.create` sends `POST /api/branches` with JSON. The backend determines the authenticated Store Admin and associates the new branch with that admin's store. After success, the dialog closes, the form resets, `fetchBranches()` reloads the table, and a success toast is shown.

## 8. Edit branch flow

Clicking the edit icon copies the selected row into `editBranch` and opens the edit dialog:

```jsx
setSelectedBranch(branch)
setEditBranch({
  name: branch.name || '',
  address: branch.address || '',
  phone: branch.phone || '',
  email: branch.email || '',
})
setIsEditDialogOpen(true)
```

Save validates the branch ID and sends:

```js
branchAPI.update(selectedBranch.id, branchData)
```

This is `PUT /api/branches/{id}`. The page closes the dialog, clears the selected branch, reloads the branch list, and shows a toast.

## 9. Delete branch flow

Delete is intentionally confirmed first:

```jsx
const ok = await confirm({
  title: 'Delete this branch?',
  confirmLabel: 'Delete',
  variant: 'destructive',
})
if (!ok) return

await branchAPI.delete(id)
fetchBranches()
```

The request is `DELETE /api/branches/{id}`. Reloading after deletion prevents stale rows from remaining visible.

## 10. Table rendering

Each row is rendered from the backend DTO:

```jsx
{filteredBranches.map(branch => (
  <TableRow key={branch.id}>
    <TableCell>{branch.name || 'N/A'}</TableCell>
    <TableCell>{branch.address || 'N/A'}</TableCell>
    <TableCell>{branch.manager?.fullName || 'Not assigned'}</TableCell>
    <TableCell>{branch.phone || 'N/A'}</TableCell>
    <TableCell>{branch.email || 'N/A'}</TableCell>
  </TableRow>
))}
```

Optional chaining handles branches that do not have a manager yet.

## Example request lifecycle

1. User opens `/store/branches`.
2. Frontend resolves the current `storeId` from profile or owned stores.
3. Frontend sends `GET /api/branches/store/1`.
4. Backend returns branch DTOs.
5. React stores them in `branches` and filters them into `filteredBranches`.
6. User searches “Main”; filtering runs locally.
7. User adds a branch; frontend validates and sends `POST /api/branches`.
8. After success, frontend calls the GET endpoint again to show persisted data.

## Interview questions and answers

### Why keep both `branches` and `filteredBranches`?

`branches` remains the original backend response. `filteredBranches` is a derived view. Keeping the source list means clearing the search restores all rows without another request.

### Is the search server-side?

No. This page loads the store's branches once and filters name, address, phone, and email in the browser. Server-side search would require a query endpoint and is preferable when a store has many branches.

### Why resolve the store ID before loading branches?

Branches are scoped to a store. The store ID is part of the endpoint path and prevents displaying branches from another store.

### Why reload after create/update/delete?

The database is the source of truth. Reloading ensures generated IDs, normalized values, and relationship fields such as `manager` are current.

### How is authorization enforced?

The frontend sends the JWT, but the backend must enforce ownership and role checks. Hiding a button in React is not security.

### What happens if the email or phone is invalid?

The handler stops before the API request and shows a toast. Backend validation should still exist because frontend validation can be bypassed.

### How would you improve this page?

Use a shared form component for create/edit, debounce server-side search for large datasets, disable action buttons while mutations are pending, add pagination, and update a query cache instead of manually refetching.

## Short interview answer

“I resolve the current Store Admin’s store ID, then call `GET /api/branches/store/{storeId}`. The complete response stays in state, while a derived filtered list powers the search table. Add sends a validated DTO to `POST /api/branches`; edit sends `PUT /api/branches/{id}`; delete sends `DELETE /api/branches/{id}` after confirmation. After every mutation I reload the list so the UI reflects persisted backend data.”
