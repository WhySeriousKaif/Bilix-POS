# Store Admin Employees — Interview Guide

This note follows `src/pages/store/employees/EmployeesPage.jsx` and the `employeeAPI` methods in `src/services/api.js`.

## 1. Responsibility

The Employees page lets a Store Admin view employees belonging to the store, search them, load branches for assignment, create employees, edit employee details, change roles/branches, and delete employees.

## 2. State and roles

```jsx
const [employees, setEmployees] = useState([])
const [filteredEmployees, setFilteredEmployees] = useState([])
const [storeId, setStoreId] = useState(null)
const [currentUserId, setCurrentUserId] = useState(null)
const [branches, setBranches] = useState([])
```

The page offers `ROLE_STORE_MANAGER`, `ROLE_STORE_EMPLOYEE`, `ROLE_BRANCH_MANAGER`, and `ROLE_BRANCH_CASHIER`. The current user ID is captured from the profile so the UI can avoid treating the logged-in admin as an employee being managed.

## 3. Resolving store and loading data

The page first calls `GET /api/users/profile`. It saves the current user ID and uses `profile.storeId` when available. Otherwise it calls `GET /api/stores/admin` and uses the first store ID.

When `storeId` is ready, two requests run:

```jsx
fetchEmployees()
fetchBranches()
```

They call:

```js
employeeAPI.getByStore(storeId) // GET /api/employees/store/{storeId}
branchAPI.getByStoreId(storeId) // GET /api/branches/store/{storeId}
```

Employees populate the table; branches populate the branch selector used for branch-specific roles.

## 4. Search

Search is client-side. The filter checks full name, email, phone, and role:

```jsx
const query = searchQuery.toLowerCase()
const filtered = employees.filter(employee =>
  employee.fullName?.toLowerCase().includes(query) ||
  employee.email?.toLowerCase().includes(query) ||
  employee.phone?.toLowerCase().includes(query) ||
  employee.role?.toLowerCase().includes(query)
)
```

The original `employees` response stays intact, so clearing the search restores every employee without another request. Refresh repeats `GET /api/employees/store/{storeId}`.

## 5. Create employee

The form validates full name, email, password length, role, optional phone format, and branch assignment for `ROLE_BRANCH_MANAGER` and `ROLE_BRANCH_CASHIER`.

```jsx
const employeeData = {
  fullName: newEmployee.fullName.trim(),
  email: newEmployee.email.trim().toLowerCase(),
  phone: (newEmployee.phone || '').trim(),
  password: newEmployee.password,
  role: newEmployee.role,
  branchId: newEmployee.branchId
    ? parseInt(newEmployee.branchId)
    : null,
}

await employeeAPI.createStoreEmployee(storeId, employeeData)
```

This sends `POST /api/employees/store/{storeId}`. The backend should authorize the current Store Admin and hash the password before saving it. The frontend never sends a role without first checking the required branch relationship for branch roles.

After success, the form resets, the employee list reloads, branches reload, and a toast confirms creation.

## 6. Branch assignment rule

Branch Manager and Branch Cashier require a selected branch. Store Manager and Store Employee may be store-level roles and can have a null `branchId`.

The branch is selected from the already loaded `branches` list. The page also verifies that the selected ID exists locally before sending the request.

## 7. Edit employee

Clicking Edit copies the row into edit state. The password is intentionally blank:

```jsx
setEditEmployee({
  fullName: employee.fullName || '',
  email: employee.email || '',
  phone: employee.phone || '',
  password: '',
  role: employee.role || '',
  branchId: employee.branchId?.toString() || employee.branch?.id?.toString() || '',
})
```

This prevents displaying or pre-filling a password. The update DTO includes a password only if the admin typed a new one:

```jsx
const employeeData = {
  fullName: editEmployee.fullName,
  email: editEmployee.email,
  phone: editEmployee.phone || '',
  role: editEmployee.role,
  branchId: editEmployee.branchId ? parseInt(editEmployee.branchId) : null,
}
if (editEmployee.password) employeeData.password = editEmployee.password

await employeeAPI.updateEmployee(selectedEmployee.id, employeeData)
```

The request is `PUT /api/employees/{employeeId}`. After success, the dialog closes and the employee list reloads.

## 8. Delete employee

Delete uses the shared confirmation dialog and then calls:

```js
await employeeAPI.deleteEmployee(id)
```

This sends `DELETE /api/employees/{employeeId}`. The list is reloaded after success.

## 9. API summary

| Purpose | Service | Endpoint |
|---|---|---|
| Current user/store | `userAPI.getProfile()` | `GET /api/users/profile` |
| Store fallback | `storeAPI.getByAdmin()` | `GET /api/stores/admin` |
| Employees for store | `employeeAPI.getByStore(id)` | `GET /api/employees/store/{id}` |
| Branch selector data | `branchAPI.getByStoreId(id)` | `GET /api/branches/store/{id}` |
| Add store employee | `employeeAPI.createStoreEmployee(id, dto)` | `POST /api/employees/store/{id}` |
| Update employee | `employeeAPI.updateEmployee(id, dto)` | `PUT /api/employees/{id}` |
| Delete employee | `employeeAPI.deleteEmployee(id)` | `DELETE /api/employees/{id}` |

## Example behind the scenes

Suppose the Store Admin selects “Branch Cashier” and branch `2`. The frontend validates that branch `2` exists, then sends:

```json
{
  "fullName": "Alex Johnson",
  "email": "alex@example.com",
  "phone": "9876543210",
  "password": "secret123",
  "role": "ROLE_BRANCH_CASHIER",
  "branchId": 2
}
```

The backend authenticates the Store Admin, verifies that branch `2` belongs to the admin's store, hashes the password, saves the user, and returns a DTO without exposing the password.

## Interview questions and answers

### Why load branches on the employee page?

Branch-specific roles need a valid branch selector. Loading branches also lets the frontend reject an invalid branch ID before submitting.

### Why should the password be omitted during edit?

Passwords are never read back from the database. A blank password means “keep the current password”; a supplied password means “replace it after hashing on the backend.”

### Is frontend role validation security?

No. It improves user experience. The backend must enforce which roles the Store Admin may create and verify store/branch ownership.

### Why parse `branchId`?

Select values are strings, while the backend relationship expects a numeric ID. Converting it avoids sending an incorrect JSON type.

### Why reload employees after a mutation?

Reloading guarantees the table reflects persisted role, branch, ID, and server-generated fields.

### What happens if the store has no branches?

Branch-specific roles cannot be created until a branch exists. The UI should show an empty selector or guide the admin to create a branch first.

### How would you improve this page?

Add pagination/server-side search for large employee lists, disable buttons during mutations, use a schema validator, and provide a dedicated role-permission policy on the backend.

## Short interview answer

“The Employees page resolves the current store, then loads employees and branches. Search is a local derived filter. Creating an employee sends a validated DTO to `POST /api/employees/store/{storeId}`; branch roles require a valid branch ID. Editing sends `PUT /api/employees/{id}` and only includes a password when it is intentionally changed. Deleting sends `DELETE /api/employees/{id}` after confirmation. The backend remains responsible for authorization, ownership checks, and BCrypt password hashing.”
