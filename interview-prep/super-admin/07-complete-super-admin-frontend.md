# Super Admin Frontend: Complete Interview Guide

## 1. Page structure

`SuperAdminLayout` is the shared shell. It renders the top bar, sidebar, mobile menu, notification menu, logout confirmation, and an `<Outlet />` for the active route. Clicking a sidebar item changes the URL through React Router; the layout stays mounted while only the page content changes.

```jsx
<SuperAdminLayout>
  <Outlet />
</SuperAdminLayout>
```

## 2. Simple reusable UI

The pages use small local React wrappers such as `Card`, `Button`, `Table`, `Input`, and `Dialog`. They are ordinary HTML elements with Tailwind classes. This keeps the component behavior easy to explain and avoids a dependency on a prebuilt UI library.

```jsx
const Card = ({ children, className = '' }) =>
  <div className={`rounded-xl border bg-white dark:bg-slate-900 ${className}`}>
    {children}
  </div>
```

The wrapper does not fetch data or contain business logic; it only standardizes visual styling.

## 3. Backend data flow

Each page loads data inside `useEffect`, stores it in state, and renders the state. A search or filter creates derived data instead of changing the original response.

```jsx
useEffect(() => { fetchStores() }, [])

const fetchStores = async () => {
  const data = await storeAPI.getAll()
  setStores(data)
}

const visibleStores = stores.filter(store =>
  store.brand.toLowerCase().includes(searchQuery.toLowerCase())
)
```

The API service is the boundary between the page and HTTP. The page should not construct fetch requests directly in JSX.

## 4. Dashboard and charts

`Dashboard.jsx` combines store, branch, order, and refund responses. It calculates totals and passes arrays to Recharts. The graph is not static: changing backend data changes the chart data.

```jsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={monthlySales}>
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Bar dataKey="sales" fill="#2563eb" />
    <Bar dataKey="refunds" fill="#93c5fd" />
  </BarChart>
</ResponsiveContainer>
```

The dashboard cards follow the same pattern: calculate a value, then render a label, value, and icon. The store-status chart groups stores by `ACTIVE`, `PENDING`, and `BLOCKED`.

## 5. Stores, users, and pending requests

These pages follow the same CRUD-screen pattern:

1. Load records from an API.
2. Keep the complete response in state.
3. Filter locally from the search input.
4. Render a table.
5. Call the API for refresh, approval, blocking, or deletion.
6. Refresh state after a successful mutation.

The store eye button sets `selectedStore`. A native modal then displays the selected object. The modal is presentation-only; it does not make another request.

## 6. Subscription plans

Plans are rendered twice: as visual summary cards and as a table. Both use the same `plans` state, so an edit or delete operation updates both views after the API response.

```jsx
const handleUpdatePlan = async () => {
  const updated = await subscriptionAPI.update(editingPlan.id, form)
  setPlans(current => current.map(plan =>
    plan.id === updated.id ? updated : plan
  ))
}
```

The add/edit dialogs are simple controlled forms: each input reads from state and calls `setForm` on change.

## 7. Sales page

The sales page uses backend orders and refunds to calculate summary cards, daily sales, payment-method totals, top stores, store-admin summaries, and the all-sales table. Search, status, and store filters only change the displayed list.

```jsx
const filteredOrders = orders.filter(order => {
  const matchesSearch = order.customerName?.toLowerCase().includes(query)
  const matchesStatus = status === 'all' || order.status === status
  return matchesSearch && matchesStatus
})
```

Charts are visual projections of these arrays; the source of truth remains the API response.

## 8. Exports and settings

Exports now use native `<select>`, `<input>`, and `<button>` controls. The selected export type and date range are state variables. Clicking Export filters the backend records, serializes them as CSV or JSON, creates a Blob, and downloads it.

Settings uses controlled form fields. `handleSave` sends the current settings object to the settings API and shows a toast after success.

## Interview explanation

“I built the super-admin panel as a shared layout plus route-level pages. Each page follows container-style data flow: fetch through an API service, store the response in React state, derive filtered data, and render simple presentational components. Mutations call the backend and then update or reload state. Charts receive computed arrays, so they remain data-driven rather than hard-coded. I replaced the UI-library wrappers with small native React components while keeping the same visual contract.”

## Audit result

The super-admin pages no longer import the previous Card, Button, Table, Input, Label, Textarea, or Select UI components. Recharts remains intentionally used for data visualization because it provides chart primitives, while the surrounding cards and controls are native/simple components. Lucide remains an icon package, not a layout component.
