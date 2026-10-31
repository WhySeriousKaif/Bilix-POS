# Branch Manager Dashboard — Interview Notes

## What the dashboard does

The dashboard is a read-only summary of one branch. It loads the authenticated manager's branch, requests orders/refunds/customers/shift reports, calculates KPI values in JavaScript, and converts the same order data into charts, recent orders, and top products.

## When requests run

```jsx
useEffect(() => {
  fetchBranchId();
}, []);

useEffect(() => {
  if (branchId) fetchDashboardData();
}, [branchId]);
```

The first effect runs once when the component mounts. The second runs only after the branch ID has been found. Clicking Refresh calls `fetchDashboardData` again manually.

## Finding the branch

```jsx
const profile = await userAPI.getProfile();
setBranchId(profile?.branchId || 1);
```

The profile API identifies the manager's branch. The current code uses branch `1` as a development fallback when no branch ID is returned; production code should show an error or empty state instead of silently selecting a branch.

## API calls

Inside `fetchDashboardData`, independent requests run together:

```jsx
const [allOrders, todayOrders, customers, refunds, shiftReports] =
  await Promise.all([
    orderAPI.getByBranch(branchId),
    orderAPI.getTodayByBranch(branchId),
    customerAPI.getAll(),
    refundAPI.getByBranch(branchId),
    shiftReportAPI.getByBranch(branchId),
  ]);
```

| Data | Client method | Endpoint |
|---|---|---|
| Current manager profile | `userAPI.getProfile()` | `GET /api/users/profile` |
| All branch orders | `orderAPI.getByBranch(id)` | `GET /api/orders/branch/{branchId}` |
| Today's orders | `orderAPI.getTodayByBranch(id)` | `GET /api/orders/today/branch/{branchId}` |
| Customers | `customerAPI.getAll()` | Customer collection endpoint |
| Refunds | `refundAPI.getByBranch(id)` | `GET /api/refunds/branch/{branchId}` |
| Shift reports | `shiftReportAPI.getByBranch(id)` | `GET /api/shift-reports/branch/{branchId}` |
| Recent orders | `orderAPI.getRecentByBranch(id)` | `GET /api/orders/recent/{branchId}` |

Each individual request uses `.catch(() => [])`, so one failed secondary request does not necessarily prevent the other dashboard sections from rendering. The outer `try/finally` controls the loading state.

## KPI calculations

```jsx
const totalSales = allOrders.reduce(
  (sum, order) => sum + (order.totalAmount || 0), 0
);
const todaySales = todayOrders.reduce(
  (sum, order) => sum + (order.totalAmount || 0), 0
);
const refundAmount = refunds.reduce(
  (sum, refund) => sum + (refund.amount || 0), 0
);

setStats({
  totalSales: Math.max(0, totalSales - refundAmount),
  todaySales,
  totalOrders: allOrders.length,
  todayOrders: todayOrders.length,
  totalCustomers: customers.length || 0,
  activeCashiers: activeCashiersSet.size,
  totalRefunds: refunds.length,
});
```

- **Total Sales** is net sales: all branch order totals minus refund amounts.
- **Today's Sales** sums the separate today-orders response.
- **Total Orders** is the number of all branch orders returned.
- **Customers** is the customer collection length.
- **Active Staff** is calculated from today's shift reports where `shiftStart` is today and `shiftEnd` is missing.
- **Refunds** is the number of refund records, not their total amount.

## Active cashier calculation

```jsx
const activeCashiersSet = new Set();
shiftReports.forEach(shift => {
  if (!shift.shiftStart) return;
  const today = new Date();
  const shiftDate = new Date(shift.shiftStart);

  if (shiftDate.toDateString() === today.toDateString() && !shift.shiftEnd) {
    activeCashiersSet.add(shift.cashier?.id);
  }
});
```

A `Set` prevents one cashier with multiple shift records from being counted twice.

## Seven-day revenue chart

The page creates seven labels first, including days with zero sales. This is important because a chart should still show an empty day instead of removing it.

```jsx
const salesByDay = {};
const last7Days = Array.from({ length: 7 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - index));
  const label = format(date, 'MMM dd');
  salesByDay[label] = 0;
  return label;
});

allOrders.forEach(order => {
  const label = format(new Date(order.createdAt), 'MMM dd');
  if (Object.hasOwn(salesByDay, label)) {
    salesByDay[label] += order.totalAmount || 0;
  }
});

setSalesData(last7Days.map(date => ({
  date,
  sales: salesByDay[date] || 0,
})));
```

The rendered `AreaChart` receives `salesData`, uses `date` for the X axis, `sales` for the Y axis, and a gradient-filled `Area` for the visual line. Recharts handles scales, axes, tooltip, and responsive sizing; the application owns the data preparation.

## Payment type donut chart

```jsx
const paymentMethods = {};
allOrders.forEach(order => {
  const method = order.paymentType || 'CASH';
  paymentMethods[method] =
    (paymentMethods[method] || 0) + (order.totalAmount || 0);
});

setPaymentData(Object.entries(paymentMethods).map(([name, value]) => ({
  name,
  value,
})));
```

The `PieChart` uses `value` as the slice size. `innerRadius` creates the donut hole, `Cell` assigns colors, and `Tooltip` displays the amount. The legend is generated by mapping over the same `paymentData`, so it can show CASH, CARD, UPI, or any future payment type without hard-coded slices.

## Recent branch orders

```jsx
const recent = await orderAPI.getRecentByBranch(branchId).catch(() => []);
setRecentOrders(
  recent.length > 0 ? recent.slice(0, 5) : allOrders.slice(-5).reverse()
);
```

The preferred endpoint supplies recent records. If it returns no data, the page falls back to the last five records from the already loaded collection. Each row displays order ID, formatted creation time, amount, and payment type.

## Top products

The dashboard groups nested `orderItems` by product ID, accumulates quantity and revenue, sorts by revenue, and keeps five products:

```jsx
const productSales = {};
allOrders.forEach(order => {
  order.orderItems?.forEach(item => {
    const id = item.product?.id || item.id;
    if (!productSales[id]) {
      productSales[id] = { name: item.product?.name || 'Product', quantity: 0, revenue: 0 };
    }
    productSales[id].quantity += item.quantity || 1;
    productSales[id].revenue += (item.price || 0) * (item.quantity || 1);
  });
});

const topProducts = Object.values(productSales)
  .sort((a, b) => b.revenue - a.revenue)
  .slice(0, 5);
```

## Quick actions

Quick-action buttons do not fetch data. They call React Router navigation:

```jsx
<Button onClick={() => navigate('/branch/orders')}>View Orders</Button>
<Button onClick={() => navigate('/branch/inventory')}>Manage Inventory</Button>
```

This changes the URL and renders the route configured for that page without a full browser reload.

## Interview questions

### Why use `Promise.all`?

The five initial requests are independent. Running them concurrently reduces total waiting time compared with awaiting each request one after another.

### Why use a `Set` for active cashiers?

A cashier may have multiple shift records. A `Set` stores each cashier ID once and gives the correct unique count.

### Why initialize all seven dates to zero?

It preserves the time axis and makes no-sale days visible instead of producing a misleading chart with missing dates.

### Is the dashboard data static?

No. KPI values, chart points, payment slices, recent orders, and top products are generated from API responses. Only labels, colors, and fallback text are static.

### What would you improve for production?

Move totals/grouping into backend summary queries for large datasets, remove the hard-coded branch `1` fallback, normalize timezone handling, use decimal-safe money arithmetic, and return one dashboard-summary DTO to reduce network calls.
