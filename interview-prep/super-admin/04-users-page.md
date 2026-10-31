# Super Admin Users Page

## Loading users

The page calls `userAPI.getAll()` once when it mounts. The response is stored in `users`; refresh calls the same function again.

## Search and role filtering

Filtering is done in the browser:

```jsx
const filteredUsers = users.filter((user) => {
  const matchesRole = roleFilter === 'all' || user.role === roleFilter
  const matchesSearch = user.fullName?.toLowerCase().includes(query)
    || user.email?.toLowerCase().includes(query)
  return matchesRole && matchesSearch
})
```

The role dropdown is a native `<select>`. Its options are created from the roles that actually appear in the API response.

## Displaying relationships

The table displays `storeId` and `branchId` when available. The user list does not need another request because these IDs are already included in each user response.

## Interview explanation

“I load the system-wide user list once, then derive the visible list from two pieces of state: a text search and a selected role. This keeps filtering instant and avoids unnecessary API calls. The table is reusable markup and the role label map converts backend enum values such as `ROLE_BRANCH_MANAGER` into readable text.”
