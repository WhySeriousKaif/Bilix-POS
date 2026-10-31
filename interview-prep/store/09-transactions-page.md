# Store Admin Transactions — Interview Guide

This note follows `src/pages/store/transactions/TransactionsPage.jsx`.

## 1. Purpose

Transactions creates one financial timeline by combining branch sales (orders) and branch refunds. It displays total income, total expenses, net amount, filters, transaction history, and CSV export.

## 2. Loading branches, orders, and refunds

After resolving `storeId` from `GET /api/users/profile` or `GET /api/stores/admin`, the page loads branches:

```js
const branchesData = await branchAPI.getByStoreId(storeId)
```

Then it requests orders and refunds for every branch in parallel:

```jsx
const [ordersArrays, refundsArrays] = await Promise.all([
  Promise.all(branchesData.map(branch =>
    orderAPI.getByBranch(branch.id).catch(() => [])
  )),
  Promise.all(branchesData.map(branch =>
    refundAPI.getByBranch(branch.id).catch(() => [])
  )),
])

const allOrders = ordersArrays.flat()
const allRefunds = refundsArrays.flat()
```

Requests are:

- `GET /api/branches/store/{storeId}`
- `GET /api/orders/branch/{branchId}`
- `GET /api/refunds/branch/{branchId}`

## 3. Normalizing two domain objects

Orders and refunds have different backend shapes, so the page converts both into one common transaction view model.

Sale transaction:

```jsx
{
  id: `ORDER-${order.id}`,
  type: 'Sale',
  date: order.createdAt,
  reference: `TRX-${order.id}`,
  description: `Sale - Invoice INV-${order.id}`,
  amount: order.totalAmount || 0,
  paymentMethod: order.paymentType || 'CASH',
  status: order.status || 'COMPLETED',
  branch: order.branch,
}
```

Refund transaction:

```jsx
{
  id: `REFUND-${refund.id}`,
  type: 'Refund',
  date: refund.createdAt,
  reference: `TRX-REF-${refund.id}`,
  description: `Refund - Invoice INV-${refund.orderId || refund.id}`,
  amount: refund.amount || 0,
  paymentMethod: refund.paymentType || 'CASH',
  status: 'COMPLETED',
  branch: refund.branch,
}
```

This normalization lets one table render both sales and refunds without separate tables.

## 4. Financial cards

```jsx
const totalIncome = allOrders.reduce(
  (sum, order) => sum + (order.totalAmount || 0), 0
)
const totalExpenses = allRefunds.reduce(
  (sum, refund) => sum + (refund.amount || 0), 0
)
const netAmount = totalIncome - totalExpenses
```

The cards are therefore data-driven. In the current business model, refunds are treated as expenses for this summary; other expenses are not loaded by this page.

## 5. Sorting and filtering

The combined list is sorted newest first. Filters are client-side and derive `filteredTransactions` from the complete `transactions` array.

Supported filters:

- Date: all, today, last 7 days, last 30 days, last year
- Type: Sale or Refund
- Payment method: Cash, Card, Debit Card, UPI
- Branch: any loaded branch

The date filter calculates a start date and keeps transactions between `startDate` and `now`. Reset sets every filter back to `all`.

## 6. Export flow

Export uses the filtered rows, not the entire dataset. It creates CSV headers, converts each transaction to a row, creates a `Blob`, and triggers a browser download. No export API is called.

```jsx
const blob = new Blob([csvContent], {
  type: 'text/csv;charset=utf-8;'
})
const url = URL.createObjectURL(blob)
link.download = `transactions-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
link.click()
```

Sale amounts are written with `+`; refund amounts with `-`.

## 7. API summary

| Purpose | Endpoint |
|---|---|
| Current user/store | `GET /api/users/profile` |
| Store fallback | `GET /api/stores/admin` |
| Store branches | `GET /api/branches/store/{storeId}` |
| Branch sales | `GET /api/orders/branch/{branchId}` |
| Branch refunds | `GET /api/refunds/branch/{branchId}` |

## Example behind the scenes

If orders total ₹10,000 and refunds total ₹1,500:

```text
Total Income  = ₹10,000
Total Expenses = ₹1,500
Net Amount     = ₹8,500
```

If the user chooses `Refund` and `Last 30 Days`, only refund transactions in that time window remain visible. The summary cards remain based on the full loaded dataset in the current implementation.

## Interview questions and answers

### Why normalize orders and refunds?

They have different backend DTOs but share table concepts such as date, amount, branch, payment method, and status. A common view model simplifies rendering and filtering.

### Does changing a filter call the backend?

No. The page already loaded all branch orders and refunds, so filters derive a local list. For large datasets, filters should be sent as query parameters with pagination.

### What does “expense” mean here?

In this implementation it means refund amount. The page does not load operating expenses, payroll, or supplier costs.

### Why flatten arrays?

Each branch API returns its own array. `flat()` creates one store-wide collection for sorting, filtering, totals, and export.

### What security is required?

The backend must ensure the authenticated Store Admin can only read branches, orders, and refunds belonging to their store. The frontend’s branch filter is not a security boundary.

### How would you improve this page?

Add a backend transaction-report endpoint, paginate history, calculate filtered totals explicitly, support server-side date ranges, and use a dedicated expense model instead of treating refunds as every expense.

## Short interview answer

“The Transactions page aggregates branch orders and refunds into one normalized transaction model. Sales become income records and refunds become expense records. It calculates total income, total expenses, and net amount, then applies date, type, payment, and branch filters locally. Export builds a CSV from the filtered view in the browser. For production scale, I would move aggregation, filtering, and pagination into a backend reporting endpoint.”
