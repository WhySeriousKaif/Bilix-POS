# Store Admin Reports Page — Interview Notes

## Purpose

The Reports page is data-driven. It loads branches, orders, refunds, products, and users from the backend, filters records by branch/date, aggregates them, renders charts, and exports the current report as CSV.

## State and refresh flow

```jsx
const [storeId, setStoreId] = useState(null);
const [branches, setBranches] = useState([]);
const [reportType, setReportType] = useState('sales');
const [dateRange, setDateRange] = useState('week');
const [selectedBranch, setSelectedBranch] = useState('all');
const [startDate, setStartDate] = useState('');
const [endDate, setEndDate] = useState('');
const [reportData, setReportData] = useState(null);
```

```jsx
useEffect(() => { fetchStoreId(); }, []);

useEffect(() => {
  if (!storeId) return;
  fetchBranches();
  generateReport();
}, [storeId, reportType, dateRange, selectedBranch, startDate, endDate]);
```

Changing a filter changes the dependency array, so the page requests/calculates fresh data and React redraws the UI.

## API map

| Purpose | Client method | Endpoint |
|---|---|---|
| Current profile/store | `userAPI.getProfile()` | `GET /api/users/profile` |
| Fallback store lookup | `storeAPI.getByAdmin()` | `GET /api/stores/admin` |
| Branches | `branchAPI.getByStoreId(id)` | `GET /api/branches/store/{storeId}` |
| Orders | `orderAPI.getByBranch(id)` | `GET /api/orders/branch/{branchId}` |
| Refunds | `refundAPI.getByBranch(id)` | `GET /api/refunds/branch/{branchId}` |
| Products | `productAPI.getByStoreId(id)` | `GET /api/products/storeId/{storeId}` |
| Employees | `userAPI.getAll()` | `GET /api/users/all` |

## Loading branch data

```jsx
const selectedBranches = selectedBranch === 'all'
  ? branches
  : branches.filter(b => String(b.id) === String(selectedBranch));

const results = await Promise.all(selectedBranches.map(async branch => {
  const [orders, refunds] = await Promise.all([
    orderAPI.getByBranch(branch.id),
    refundAPI.getByBranch(branch.id),
  ]);
  return { orders: orders.data || [], refunds: refunds.data || [] };
}));

const orders = results.flatMap(r => r.orders);
const refunds = results.flatMap(r => r.refunds);
```

`Promise.all` runs independent branch requests concurrently. `flatMap` combines one result array per branch.

## Date ranges

Custom start/end dates are used when selected. Otherwise the page subtracts 7 days, 1 month, 3 months, or 1 year from today for week/month/quarter/year. Each record is kept only when its `createdAt` falls inside the range.

## Sales report aggregation

```jsx
const totalSales = orders.reduce(
  (sum, order) => sum + Number(order.totalAmount || 0), 0
);
const totalRefunds = refunds.reduce(
  (sum, refund) => sum + Number(refund.amount || 0), 0
);

const summary = {
  totalSales,
  totalRefunds,
  netSales: totalSales - totalRefunds,
  totalOrders: orders.length,
  totalRefundCount: refunds.length,
  averageOrderValue: orders.length ? totalSales / orders.length : 0,
};
```

Sales are grouped by formatted day and payment method:

```jsx
const salesByDay = {};
orders.forEach(order => {
  const day = format(new Date(order.createdAt), 'MMM dd');
  salesByDay[day] = (salesByDay[day] || 0) + Number(order.totalAmount || 0);
});

const paymentMethods = {};
orders.forEach(order => {
  const method = order.paymentType || 'Unknown';
  paymentMethods[method] =
    (paymentMethods[method] || 0) + Number(order.totalAmount || 0);
});
```

The page converts these grouped objects into Recharts arrays such as `{ name: 'Aug 09', sales: 749 }`.

## Product report

Each order item is grouped by product ID. Quantity and revenue are accumulated, then the result is sorted and limited to the top ten.

```jsx
const totals = {};
orders.forEach(order => (order.orderItems || []).forEach(item => {
  const id = item.productId || item.product?.id;
  if (!totals[id]) totals[id] = { name: item.productName, quantity: 0, revenue: 0 };
  totals[id].quantity += Number(item.quantity || 0);
  totals[id].revenue += Number(item.price || 0) * Number(item.quantity || 0);
}));

const topProducts = Object.values(totals)
  .sort((a, b) => b.revenue - a.revenue).slice(0, 10);
```

## Employee and financial reports

Employee reports group orders by `cashierId`, counting orders and summing revenue. Financial reports calculate income from orders, expenses from refunds, net amount, and profit margin:

```jsx
const income = orders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
const expenses = refunds.reduce((s, r) => s + Number(r.amount || 0), 0);
const net = income - expenses;
const margin = income ? (net / income) * 100 : 0;
```

## CSV export

The current report is serialized into rows, placed in a `Blob`, and downloaded with a temporary object URL; export does not require another API call.

```jsx
const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = `${reportType}-report.csv`;
link.click();
URL.revokeObjectURL(url);
```

## Interview questions

**Why use `Promise.all`?** Independent branch requests run concurrently, reducing waiting time.

**Why separate fetching and aggregation?** Fetching obtains domain records; aggregation creates a testable report view model.

**How does the weekly/monthly selector update the graph?** It changes state, triggers the effect, recalculates date boundaries, filters records, and produces new chart arrays.

**Would this scale to millions of orders?** No. Move grouping into database/backend summary queries, paginate rows, cache common ranges, and let the frontend visualize DTOs.

## Current limitations to know

- `fetchBranches()` and `generateReport()` run together; because state updates are asynchronous, generation should ideally await/use the freshly loaded branches.
- Browser-side aggregation is suitable for this project but not very large datasets.
- CSV values should be escaped when names contain commas or quotes.
