# Store Admin Dashboard — Interview Guide

This note follows the actual `src/pages/store/Dashboard.jsx` code.

## 1. Page lifecycle

When the Store Admin dashboard mounts, `useEffect` calls `fetchDashboardData()` once:

```jsx
useEffect(() => {
  fetchDashboardData()
}, [])
```

The page starts with `loading = true`, so it shows a spinner. After all requests and calculations finish, `setLoading(false)` allows the dashboard to render.

## 2. Finding the current store

The first request is:

```jsx
const profile = await userAPI.getProfile()
```

This calls `GET /api/users/profile`. The profile normally contains `storeId`. If it does not, the fallback calls:

```jsx
const stores = await storeAPI.getByAdmin()
```

That calls `GET /api/stores/admin`, then the first returned store ID is used.

The store ID is important because branches and products belong to a store.

## 3. Loading dashboard data

After `currentStoreId` is known, the page loads:

```jsx
const [branches, products, allUsers, allOrders] = await Promise.all([
  branchAPI.getByStoreId(currentStoreId),
  productAPI.getByStoreId(currentStoreId),
  userAPI.getAll(),
  // orders from every branch are combined
  Promise.all(
    branches.map(branch => orderAPI.getByBranch(branch.id))
  ).then(results => results.flat())
])
```

The service methods map to these backend endpoints:

| UI data | Frontend service | HTTP endpoint |
|---|---|---|
| Current user | `userAPI.getProfile()` | `GET /api/users/profile` |
| Store fallback | `storeAPI.getByAdmin()` | `GET /api/stores/admin` |
| Branches | `branchAPI.getByStoreId(id)` | `GET /api/branches/store/{storeId}` |
| Products | `productAPI.getByStoreId(id)` | `GET /api/products/storeId/{storeId}` |
| Users | `userAPI.getAll()` | `GET /api/users/all` |
| Orders | `orderAPI.getByBranch(id)` | `GET /api/orders/branch/{branchId}` |

`Promise.all` starts independent requests together, reducing total waiting time. Each request currently has `.catch(() => [])`, so one failed optional request does not blank the entire dashboard.

## 4. Total sales, products, branches, and employees

The frontend derives the four cards from the responses:

```jsx
const storeEmployees = allUsers.filter(user =>
  user.storeId === currentStoreId || user.store?.id === currentStoreId
)

const totalSales = allOrders.reduce(
  (sum, order) => sum + (order.totalAmount || 0),
  0
)

setStats({
  totalSales,
  totalBranches: branches.length,
  totalProducts: products.length,
  totalEmployees: storeEmployees.length,
})
```

So the cards are not hard-coded. Sales is the sum of order totals; branches and products are array lengths; employees are users belonging to the current store.

## 5. Recent sales

The page sorts all branch orders by creation time, takes five, and maps them into a small display object:

```jsx
const recent = allOrders
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  .slice(0, 5)
  .map(order => ({
    id: order.id,
    branchName: order.branch?.name || 'Unknown Branch',
    date: order.createdAt,
    amount: order.totalAmount || 0,
  }))
```

The UI then renders `recentSales.map(...)`. This is a common presentation pattern: keep the API object intact, create a smaller view model, and render that model.

## 6. Sales trend chart

The current implementation creates seven date labels and groups orders by day:

```jsx
const salesByDay = {}
const last7Days = Array.from({ length: 7 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - i))
  const key = format(date, 'MMM dd')
  salesByDay[key] = 0
  return key
})

allOrders.forEach(order => {
  const key = format(new Date(order.createdAt), 'MMM dd')
  if (salesByDay.hasOwnProperty(key)) {
    salesByDay[key] += order.totalAmount || 0
  }
})

setSalesData(last7Days.map(date => ({
  date,
  sales: salesByDay[date] || 0,
})))
```

That array is passed into Recharts:

```jsx
<LineChart data={salesData}>
  <XAxis dataKey="date" />
  <YAxis />
  <Tooltip />
  <Line dataKey="sales" stroke="#22c55e" />
</LineChart>
```

Recharts is intentionally used here because it is a charting primitive, not a complete page UI component.

## 7. Important current limitation

The Daily/Weekly/Monthly `<select>` is currently visual only. It has no `value`, `onChange`, or period state, so selecting Weekly or Monthly does not make a new API call or change the chart yet. The current chart always represents the last seven days.

An interview-safe explanation is: “The current version has a seven-day aggregation. The period selector is the next extension point; I would add a `period` state, recalculate the date range, and either call a period-specific backend endpoint or aggregate the returned orders by week/month.”

There is also an optimization opportunity: branches are fetched once for the main `branches` value and fetched again inside the orders expression. The cleaner production version would reuse the first `branches` response before requesting branch orders.

## Interview answer

“When the Store Admin dashboard loads, I first identify the logged-in admin’s store. Then I fetch that store’s branches and products, all users, and orders for each branch. I derive dashboard metrics in the frontend: total sales is the sum of order totals, branch and product totals are collection sizes, and employees are filtered by store ID. I transform recent orders into a small view model and aggregate orders by date for a seven-day Recharts line chart. Refresh simply runs the same fetch pipeline again.”
