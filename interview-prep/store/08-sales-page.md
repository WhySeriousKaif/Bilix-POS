# Store Admin Sales — Interview Guide

This note follows `src/pages/store/sales/SalesPage.jsx` and the API services in `src/services/api.js`.

## 1. Page responsibility

The Sales page aggregates orders across every branch belonging to the current store. It shows summary cards, a seven-day sales line chart, payment-method distribution, branch sales, a searchable/filterable transaction table, and CSV export.

## 2. Resolving the store and branches

The page first resolves the store ID through `GET /api/users/profile`, falling back to `GET /api/stores/admin`. Once available, `fetchSalesData()` runs.

It loads branches with:

```js
const branchesData = await branchAPI.getByStoreId(storeId)
```

This is `GET /api/branches/store/{storeId}`.

## 3. Loading orders across branches

There is no single store-wide order endpoint in this page. It requests orders for every branch in parallel:

```jsx
const ordersArrays = await Promise.all(
  branchesData.map(branch =>
    orderAPI.getByBranch(branch.id).catch(() => [])
  )
)
const orders = ordersArrays.flat()
setAllOrders(orders)
```

Each call is `GET /api/orders/branch/{branchId}`. Flattening combines the per-branch arrays into one store-wide list.

## 4. Summary metrics

### Total sales

```jsx
const totalSales = orders.reduce(
  (sum, order) => sum + (order.totalAmount || 0),
  0
)
```

### Orders today

The code creates today’s midnight and tomorrow’s midnight, then counts orders in that half-open interval `[today, tomorrow)`.

### Average order value

```jsx
const avgOrderValue = orders.length > 0
  ? totalSales / orders.length
  : 0
```

### Active cashiers

The page loads users with `GET /api/users/all`, keeps store cashiers with roles `ROLE_BRANCH_CASHIER` or `ROLE_CASHIER`, then loads shift reports for each branch:

```js
shiftReportAPI.getByBranch(branch.id)
```

That is `GET /api/shift-reports/branch/{branchId}`. A shift is active when it started today and has no `shiftEnd`. A `Set` of cashier IDs prevents duplicate counting.

## 5. Seven-day sales chart

The page creates seven date keys, initializes each amount to zero, then adds each order’s total to the matching date:

```jsx
const salesByDay = {}
// create the last seven MMM dd keys with zero values

orders.forEach(order => {
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

The resulting array is passed to Recharts `LineChart`, with `date` on the X-axis and `sales` on the Y-axis. The graph is therefore computed from backend orders, not static chart values.

## 6. Payment-method distribution

The page groups order totals by `paymentType`:

```jsx
const paymentMethods = {}
orders.forEach(order => {
  const method = order.paymentType || 'CASH'
  paymentMethods[method] =
    (paymentMethods[method] || 0) + (order.totalAmount || 0)
})
```

It then converts the object into Recharts data such as `{ name: 'Card', value: 32000 }`. The mapping supports Cash, Card, UPI, Debit Card, and Credit Card, while unknown backend values are displayed as-is.

## 7. Branch sales breakdown

Orders are grouped by `order.branch.id`. For each branch the page calculates both sales amount and order count, then maps over `branchesData` so branches with zero sales still appear:

```jsx
setBranchSalesData(branchesData.map(branch => ({
  name: branch.name || `Branch ${branch.id}`,
  sales: salesByBranch[branch.id]?.sales || 0,
  orders: salesByBranch[branch.id]?.orders || 0,
})))
```

## 8. Transaction filters

The page keeps all orders in `allOrders` and derives `filteredOrders`. It filters by customer name/cashier name search, order status, payment method, and branch ID. Results are sorted newest first.

```jsx
if (statusFilter !== 'all') {
  filtered = filtered.filter(order => order.status === statusFilter)
}
if (paymentMethodFilter !== 'all') {
  filtered = filtered.filter(order => order.paymentType === paymentMethodFilter)
}
if (branchFilter !== 'all') {
  filtered = filtered.filter(order =>
    order.branch?.id?.toString() === branchFilter
  )
}
```

Changing a filter does not call the backend again; it recalculates the visible list from the loaded order collection.

## 9. CSV export

Export uses the currently filtered rows, creates CSV headers and escaped values, creates a browser `Blob`, and triggers a download with an object URL. It does not call another API.

```jsx
const blob = new Blob([csvContent], {
  type: 'text/csv;charset=utf-8;'
})
const url = URL.createObjectURL(blob)
link.href = url
link.download = `sales-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
link.click()
```

## API summary

| Purpose | Endpoint |
|---|---|
| Current user/store | `GET /api/users/profile` |
| Store fallback | `GET /api/stores/admin` |
| Store branches | `GET /api/branches/store/{storeId}` |
| Branch orders | `GET /api/orders/branch/{branchId}` |
| Store users | `GET /api/users/all` |
| Branch shifts | `GET /api/shift-reports/branch/{branchId}` |

## Interview questions and answers

### Why request orders branch by branch?

The current backend exposes branch-level order retrieval, so the frontend aggregates those responses. A store-wide reporting endpoint would reduce requests and be more scalable.

### Why use a `Set` for active cashiers?

A cashier could have more than one qualifying shift record. A `Set` counts each cashier only once.

### Why are filters client-side?

All orders are already loaded for the page, so local filtering is immediate and simple. For large datasets, filters should become query parameters with pagination.

### Is “Total Sales” net of refunds?

In this page it is the sum of `order.totalAmount`; the code does not subtract refunds. The business definition should be made explicit in a production reporting API.

### Why include zero-sales branches?

Mapping over the full branch list makes branches with no orders visible instead of silently omitting them.

### How would you improve performance?

Create a backend aggregate endpoint, query date ranges in SQL, paginate transactions, and return chart-ready grouped data instead of downloading every branch order.

## Short interview answer

“The Sales page resolves the store, loads its branches, and fetches orders for each branch. It computes total sales, today’s orders, average order value, active cashiers from open shift reports, seven-day sales, payment totals, and branch totals from those responses. The transaction table applies local search and filters, while CSV export uses the filtered rows in the browser. For scale, I would move aggregation and pagination into backend reporting endpoints.”
