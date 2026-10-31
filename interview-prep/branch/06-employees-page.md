# Branch Manager Employees Page — Interview Notes

## What the page displays

The page displays staff belonging to the current branch. Each row shows the employee name/ID, email, phone, role, and whether the employee currently has an open shift. Summary cards show total staff, active staff, cashiers, and managers.

## Loading flow

```jsx
useEffect(() => { fetchBranchId(); }, []);
useEffect(() => { if (branchId) fetchEmployees(); }, [branchId]);
useEffect(() => { filterEmployees(); }, [searchQuery, employees]);
```

The page first calls `userAPI.getProfile()` to obtain the manager's branch ID. Then it loads users and shift reports. Refresh calls `fetchEmployees()` again.

## APIs used

| Purpose | Client method | Endpoint |
|---|---|---|
| Find current branch | `userAPI.getProfile()` | `GET /api/users/profile` |
| Load users | `userAPI.getAll()` | `GET /api/users/all` |
| Load open/history shifts | `shiftReportAPI.getByBranch(branchId)` | `GET /api/shift-reports/branch/{id}` |
| Create staff member | `employeeAPI.createBranchEmployee(id, dto)` | `POST /api/employees/branch/{branchId}` |

## Filtering users to this branch

The current implementation loads all users and filters locally:

```jsx
const allUsers = await userAPI.getAll();
const branchEmployees = allUsers.filter(user =>
  user.branchId === branchId || user.branch?.id === branchId
);
```

This supports APIs where the relationship appears as either `branchId` or `branch.id`. A better production implementation would call the dedicated `employeeAPI.getByBranch(branchId)` endpoint so unrelated users never leave the server.

## Calculating active shift status

```jsx
const shifts = await shiftReportAPI.getByBranch(branchId);
const activeShiftCashiers = new Set();

shifts.forEach(shift => {
  if (shift.shiftStart && !shift.shiftEnd) {
    activeShiftCashiers.add(shift.cashier?.id);
  }
});

const employeesWithStatus = branchEmployees.map(employee => ({
  ...employee,
  isActive: activeShiftCashiers.has(employee.id),
}));
```

An employee is shown as **On Shift** when a shift has started and has no end time. The `Set` prevents duplicate shift records from changing the count.

## Search behavior

Search is client-side and checks name, email, phone, and role:

```jsx
const query = searchQuery.toLowerCase();
const result = employees.filter(employee => {
  const name = (employee.fullName || employee.name || '').toLowerCase();
  const email = (employee.email || '').toLowerCase();
  const phone = (employee.phone || '').toLowerCase();
  const role = (employee.role || '').toLowerCase();
  return name.includes(query) || email.includes(query) ||
    phone.includes(query) || role.includes(query);
});
```

Typing `cashier`, an email, or part of a phone number changes visible rows without another API request.

## Summary cards

```jsx
const summary = {
  total: employees.length,
  active: employees.filter(e => e.isActive).length,
  cashiers: employees.filter(e => e.role?.includes('CASHIER')).length,
  managers: employees.filter(e => e.role?.includes('MANAGER')).length,
};
```

These values are dynamic and are recalculated from the loaded employees array. They update after Refresh or after a new employee is created.

## Adding an employee

The form collects full name, email, phone, password, and role. Name, email, and password are required:

```jsx
await employeeAPI.createBranchEmployee(branchId || 1, newEmployee);
```

This sends:

```text
POST /api/employees/branch/{branchId}
```

After success, the dialog closes, the form resets, `fetchEmployees()` reloads users/shifts, and the summary/table update from backend data. The backend must hash the password and enforce that the manager can create staff only for their own branch.

## Role display

Backend roles such as `ROLE_BRANCH_CASHIER` are made readable by removing `ROLE_` and replacing underscores with spaces. This changes presentation only; authorization should continue using the original enum/authority.

## Interview questions

### Why are two APIs used to show active staff?

Users provide identity and role; shift reports provide live attendance/shift state. Combining them creates a richer row without storing a duplicated `isActive` field on the user.

### Is the employee list currently server-filtered?

No. It loads all users and filters by branch in the browser. The available `GET /api/employees/branch/{id}` endpoint would be more secure and efficient.

### How does adding an employee update the UI?

The POST creates the record; then `fetchEmployees()` reloads users and shifts. React state changes cause the cards and table to re-render.

### What production improvements are needed?

Use the branch employee endpoint, add server-side pagination/search, validate role permissions, never return password fields, hash passwords, audit employee changes, and use a real shift-status query for current time.
