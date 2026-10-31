# Branch Manager Settings Page — Interview Notes

## Purpose

Settings loads the current branch configuration, lets the manager edit branch identity/contact fields, and saves them through the backend. It also displays POS defaults such as tax rate, currency, and invoice footer.

## Initial loading

```jsx
useEffect(() => {
  fetchBranchInfo();
}, []);

const profile = await userAPI.getProfile();
const currentBranchId = profile?.branchId || 1;
const branch = await branchAPI.getById(currentBranchId);
```

The APIs are:

```text
GET /api/users/profile
GET /api/branches/{branchId}
```

The response fills local `branchInfo` state. Loading remains true until the request finishes, so the form does not render incomplete values.

## Editable fields

The form displays and edits:

- branch name;
- physical address;
- contact phone;
- official email;
- invoice footer;
- default tax rate;
- currency symbol.

The current save request sends only identity/contact fields:

```jsx
await branchAPI.update(branchId, {
  name: branchInfo.name,
  address: branchInfo.address,
  phone: branchInfo.phone,
  email: branchInfo.email,
});
```

This is a `PUT` request to `/api/branches/{branchId}`. Tax rate, currency, and invoice footer currently live only in local state and are not included in the backend update.

## Save and synchronization flow

1. Manager edits controlled inputs.
2. Clicking Save sets `saving` to true.
3. The branch update API persists the fields.
4. A success toast is shown.
5. The page dispatches `branchInfoUpdated`.
6. `BranchLayout` listens for that event and reloads the branch header information.
7. `finally` clears the saving state.

```jsx
window.dispatchEvent(new CustomEvent('branchInfoUpdated'));
```

This event keeps the sidebar/header branch name synchronized without coupling the settings page directly to the layout component.

## Error handling

If profile or branch loading fails, the page shows an error toast. If saving fails, it shows a failure toast and leaves the form available for another attempt. The save button is disabled while the request is in progress.

## Interview questions

### Why call profile before branch details?

The authenticated profile identifies which branch the manager is allowed to manage. That ID is then used to fetch the branch record.

### How do other components learn about the update?

The page dispatches a custom `branchInfoUpdated` browser event; the shared layout listens and calls its own fetch function.

### Are tax rate and currency persisted?

Not currently. They are displayed and editable locally, but the current PUT payload omits them. A complete implementation needs backend fields/DTO validation and inclusion in the update payload.

### What production improvements are needed?

Remove the hard-coded branch `1` fallback, validate email/phone/tax values, authorize branch ownership server-side, persist POS preferences, audit configuration changes, and reload authoritative data after a successful PUT.
