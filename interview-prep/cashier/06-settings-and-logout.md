# Cashier Settings and Logout — Interview Notes

The cashier Settings page loads the logged-in user's profile and the branch connected to that user. It allows the cashier to preview a profile image, edit branch contact information, and save those changes.

## Loading settings

On mount, the page calls:

```http
GET /api/users/profile
Authorization: Bearer <token>
```

The frontend first gets the profile because the profile identifies the current branch:

```jsx
const profile = await userAPI.getProfile();
setUserInfo(profile);
const currentBranchId = profile?.branchId || 1;
setBranchId(currentBranchId);
```

Then it loads that branch:

```http
GET /api/branches/{branchId}
```

Example:

```http
GET /api/branches/1
```

Frontend code:

```jsx
const branch = await branchAPI.getById(currentBranchId);
setBranchInfo({
  name: branch.name || '',
  address: branch.address || '',
  phone: branch.phone || '',
  email: branch.email || '',
});
```

## Branch information form

The form is controlled React state:

```jsx
const [branchInfo, setBranchInfo] = useState({
  name: '',
  address: '',
  phone: '',
  email: '',
});
```

Typing in an input changes only local state. No API request is made for every keystroke:

```jsx
onChange={(event) =>
  setBranchInfo({ ...branchInfo, name: event.target.value })
}
```

Example edited data:

```json
{
  "name": "Main Branch",
  "address": "123 Commerce Way, Tech City",
  "phone": "9876543210",
  "email": "mainbranch@mollapos.com"
}
```

## Save Changes API

Clicking Save Changes sends:

```http
PUT /api/branches/{branchId}
Content-Type: application/json
Authorization: Bearer <token>
```

Example:

```http
PUT /api/branches/1
```

Request body:

```json
{
  "name": "Main Branch",
  "address": "123 Commerce Way, Tech City",
  "phone": "9876543210",
  "email": "mainbranch@mollapos.com"
}
```

Frontend flow:

```jsx
setSaving(true);
await branchAPI.update(branchId, branchInfo);
toast.success('Branch information updated successfully!');
await fetchBranchInfo();
window.dispatchEvent(new CustomEvent('branchInfoUpdated'));
setSaving(false);
```

The second `fetchBranchInfo()` makes the backend response the source of truth. The custom event lets the shared cashier layout refresh branch information shown in its sidebar/popover.

## Profile image behavior

The current profile image flow is local-only:

1. The file input accepts an image.
2. The type is validated with `file.type.startsWith('image/')`.
3. Files larger than 5 MB are rejected.
4. `FileReader` converts the image to a data URL.
5. The data URL is stored in `localStorage` under `cashierAvatar`.
6. A browser `avatarUpdated` event updates the header preview.

```jsx
const reader = new FileReader();
reader.onloadend = () => {
  const result = reader.result;
  setAvatarUrl(result);
  localStorage.setItem('cashierAvatar', result);
  window.dispatchEvent(new CustomEvent('avatarUpdated'));
};
reader.readAsDataURL(file);
```

Therefore, uploading an image currently does **not** call a backend upload API. It is saved only in that browser. A production implementation should upload the file to storage and save the returned URL through a user-profile endpoint.

Removing the image deletes the local value:

```jsx
localStorage.removeItem('cashierAvatar');
window.dispatchEvent(new CustomEvent('avatarUpdated'));
```

## Logout and End Shift confirmation

The cashier layout has logout actions in the profile menu, desktop sidebar, and mobile sidebar. They all use the same handler. The handler now opens the shared confirmation dialog:

```jsx
const shouldLogout = await confirm({
  title: 'End shift and log out?',
  description: 'Your cashier session will be closed and you will return to the login page.',
  confirmLabel: 'End Shift & Logout',
  variant: 'destructive',
});

if (!shouldLogout) return;

dispatch(logoutUser());
navigate('/auth/login');
```

The dialog is provided by `ConfirmProvider`, so Cancel closes it without changing authentication. Confirm clears the Redux authentication state and navigates to login.

The Shift Summary page uses the same confirmation before calling the end-shift API:

```jsx
const shouldEnd = await confirm({
  title: 'End shift and log out?',
  description: 'Are you sure you want to end this cashier shift and log out?',
  confirmLabel: 'End Shift & Logout',
  variant: 'destructive',
});

if (!shouldEnd) return;
await shiftReportAPI.endShift(shiftData.id);
localStorage.removeItem('authToken');
window.location.href = '/login';
```

This prevents accidental logout. The Shift Summary action first closes the backend shift, then clears authentication and redirects.

## Interview questions and answers

**Q: Which API loads cashier settings?**  
**A:** `GET /api/users/profile`, followed by `GET /api/branches/{branchId}`.

**Q: Which API saves branch settings?**  
**A:** `PUT /api/branches/{branchId}` with the edited branch object.

**Q: Does typing call the API?**  
**A:** No. Inputs update local React state; the API is called only when Save Changes is clicked.

**Q: Where is the current avatar saved?**  
**A:** In browser `localStorage`, not the backend. This should be replaced with real file storage for production.

**Q: What happens after saving?**  
**A:** The page reloads branch data and dispatches `branchInfoUpdated` so other UI areas can refresh.

**Q: Why use a confirmation modal for logout?**  
**A:** It prevents accidental session termination and makes the destructive action explicit.

## Production improvements

1. Remove the fallback branch ID of `1` and require the authenticated profile's branch ID.
2. Upload profile images to a backend/storage service instead of localStorage.
3. Validate phone, email, and branch fields on both client and server.
4. Add optimistic-loading/error states for save and refresh.
5. End the shift on the backend before clearing auth; do not silently log out if the close request fails.

