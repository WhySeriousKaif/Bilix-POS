# Branch Manager Transactions Page — Interview Notes

## What this page represents

Transactions is a financial ledger. It combines two backend collections—sales orders and refunds—into one normalized frontend list. A sale is positive cash flow; a refund is negative cash flow.

## When data is loaded

```jsx
useEffect(() => { fetchBranchId(); }, []);

useEffect(() => {
  if (branchId) fetchTransactions();
}, [branchId, dateFilter, typeFilter, paymentFilter]);

useEffect(() => {
  filterTransactions();
}, [searchQuery, transactions]);
```

The page first finds the authenticated manager's branch. It reloads whenever the date, transaction type, or payment dropdown changes. Search only filters the already loaded normalized list.

## Backend calls

| Purpose | API call |
|---|---|
| Find branch | `userAPI.getProfile()` → `GET /api/users/profile` |
| Today’s sales | `orderAPI.getTodayByBranch(branchId)` → `GET /api/orders/today/branch/{id}` |
| Other-period sales | `orderAPI.getByBranch(branchId, filters)` → branch orders endpoint |
| Branch refunds | `refundAPI.getByBranch(branchId)` → `GET /api/refunds/branch/{id}` |

Clicking Refresh calls `fetchTransactions()` again, so it repeats the order and refund requests and recalculates every card and row from the latest backend response.

## Date filtering

- **Today:** uses the dedicated today-orders endpoint.
- **This week:** loads branch orders/refunds and keeps records from Monday onward.
- **This month:** keeps records from the first day of the month onward.
- **All time:** loads the complete available branch collections.

```jsx
if (dateFilter === 'week') {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  filteredOrders = orders.filter(o =>
    o.createdAt && new Date(o.createdAt) >= weekStart
  );
  filteredRefunds = refunds.filter(r =>
    r.createdAt && new Date(r.createdAt) >= weekStart
  );
}
```

The current week/month filtering is client-side. A production backend should accept `from` and `to` query parameters so the database does the filtering.

## Converting two collections into one ledger

```jsx
const allTransactions = [
  ...filteredOrders.map(order => ({
    id: `order-${order.id}`,
    type: 'SALE',
    orderId: order.id,
    date: order.createdAt,
    amount: order.totalAmount || 0,
    paymentType: order.paymentType || 'CASH',
    customer: order.customer?.name || 'Walk-in',
    description: `Order #${order.id}`,
  })),
  ...filteredRefunds.map(refund => ({
    id: `refund-${refund.id}`,
    type: 'REFUND',
    refundId: refund.id,
    orderId: refund.orderId,
    date: refund.createdAt || refund.refundDate,
    amount: -(refund.amount || 0),
    paymentType: refund.paymentType || 'CASH',
    customer: 'N/A',
    description: `Refund #${refund.id}`,
  })),
];
```

This normalization gives the table one predictable shape even though orders and refunds have different backend DTOs. Refund amounts are negative so the ledger shows money leaving the branch.

## Financial cards

```jsx
const totalSales = filteredOrders.reduce(
  (sum, order) => sum + (order.totalAmount || 0), 0
);
const totalRefunds = filteredRefunds.reduce(
  (sum, refund) => sum + (refund.amount || 0), 0
);

setSummary({
  totalSales,
  totalRefunds,
  netAmount: totalSales - totalRefunds,
  transactionCount: finalTransactions.length,
});
```

- **Gross Sales:** sum of all matching order totals before refunds.
- **Total Refunds:** sum of refund amounts as a positive display total.
- **Net Cash Flow:** gross sales minus refunds.
- **Total Ledger Entries:** number of rows after the type filter (sales plus refunds).

Example: sales ₹1,000 + ₹500 and refunds ₹200 gives gross sales ₹1,500, refunds ₹200, net cash flow ₹1,300.

## Type and payment dropdowns

The type dropdown supports All Types, Sales, and Refunds. It filters the normalized list:

```jsx
if (typeFilter !== 'all') {
  finalTransactions = finalTransactions.filter(
    transaction => transaction.type === typeFilter
  );
}
```

The payment dropdown supports All Payments, Cash, Card, and UPI. It is sent as `paymentType` when loading orders and is also applied to both orders and refunds in the browser:

```jsx
if (paymentFilter !== 'all') {
  filteredOrders = filteredOrders.filter(o => o.paymentType === paymentFilter);
  filteredRefunds = filteredRefunds.filter(r => r.paymentType === paymentFilter);
}
```

## Search behavior

Search is local, not a request per keystroke. It checks order/refund ID, customer, and description:

```jsx
const query = searchQuery.toLowerCase();
const result = transactions.filter(transaction =>
  (transaction.orderId?.toString() || transaction.refundId?.toString() || '').includes(query) ||
  transaction.customer.toLowerCase().includes(query) ||
  transaction.description.toLowerCase().includes(query)
);
```

The summary cards use `summary` from all filtered backend records, while the table uses `filteredTransactions` after search. Therefore typing in search changes visible rows but does not incorrectly change gross sales totals.

## CSV export

The export button uses the currently visible, search-filtered rows:

```jsx
const headers = ['Type', 'ID', 'Date', 'Customer', 'Payment Type', 'Amount (INR)', 'Description'];
const rows = filteredTransactions.map(t => [
  t.type,
  t.orderId || t.refundId || '',
  format(new Date(t.date), 'yyyy-MM-dd HH:mm'),
  `"${t.customer}"`,
  t.paymentType,
  t.amount,
  `"${t.description}"`,
]);

const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
const uri = encodeURI(`data:text/csv;charset=utf-8,${csv}`);
const link = document.createElement('a');
link.href = uri;
link.download = 'branch_transactions.csv';
link.click();
```

No export API is called. The browser creates a data URI, creates a temporary link, clicks it, and downloads the CSV. In production, values should be escaped safely when they contain quotes/newlines, and large exports should be generated by the backend.

## Table rows

Each row displays type, ID reference, date/time, customer, payment method, signed amount, and description. A sale uses a positive green amount; a refund uses a negative red amount. Payment icons are selected from the payment type.

## Interview questions

### Why combine orders and refunds?

They are different domain resources but both represent ledger activity. Normalizing them lets one table and one export format display the branch’s cash movement.

### Why are refund amounts negative in the table but positive in the summary card?

The table represents cash direction, so refunds are negative. The summary label “Total Refunds” is easier to understand as a positive amount, then net cash flow subtracts it.

### Does clicking Refresh call one API?

It calls the order endpoint and refund endpoint again, then rebuilds normalized transactions and summary values.

### What would you improve?

Add server-side date/type/payment/search filters, pagination, decimal-safe money handling, CSV escaping, and a backend ledger endpoint that returns one consistent transaction DTO.
