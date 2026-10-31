# Branch Manager Refunds Page — Interview Notes

## Page responsibility

The Refunds page lists refunds for the current branch, calculates refund totals, searches existing records, creates a full or partial refund, and displays the refund/order details in a modal.

## Loading the page

```jsx
useEffect(() => { fetchBranchId(); }, []);

useEffect(() => {
  if (branchId) fetchRefunds();
}, [branchId]);
```

The page first calls `userAPI.getProfile()` to obtain `branchId`. Once the ID is available, it calls `fetchRefunds`. The Refresh button calls `fetchRefunds` again manually.

## List API

```jsx
const data = branchId
  ? await refundAPI.getByBranch(branchId)
  : await refundAPI.getAll();

const sorted = (data || []).sort((a, b) =>
  new Date(b.createdAt || b.refundDate || 0) -
  new Date(a.createdAt || a.refundDate || 0)
);
setRefunds(sorted);
```

The normal Branch Manager request is:

```text
GET /api/refunds/branch/{branchId}
```

The fallback `GET /api/refunds` is used only when no branch ID is available. Sorting is client-side so the newest refund appears first.

## Processing a refund

The Process Refund button opens a form containing order ID, amount, reason, and payment method. Before sending, the page validates that an order ID exists and that the amount is greater than zero.

```jsx
await refundAPI.create({
  orderId: parseInt(newRefund.orderId),
  branchId: branchId || 1,
  amount: parseFloat(newRefund.amount),
  reason: newRefund.reason || 'Customer request',
  paymentType: newRefund.paymentType,
});
```

The API call is:

```text
POST /api/refunds
```

The backend should validate the order, branch ownership, amount, and whether the refund exceeds the refundable order balance. After a successful POST, the frontend closes and resets the form, calls `fetchRefunds()` again, and displays a success toast. That refresh is what makes the new record and totals appear immediately in the UI.

## Full versus partial refund

The frontend accepts any positive amount. A full refund uses the complete refundable order amount; a partial refund uses a smaller amount entered by the manager. The current React code does not calculate the maximum itself—the backend must enforce that rule.

Example:

```text
Order total: ₹1,000
Refund amount: ₹250
Result: partial refund; remaining refundable balance should be ₹750
```

The `paymentType` field records whether the money is returned as cash, card reversal, or UPI refund. It does not itself move money through a payment provider; that requires a separate payment/refund integration.

## Refund totals

```jsx
const totalRefundAmount = refunds.reduce(
  (sum, refund) => sum + (refund.amount || 0),
  0
);
```

The two summary cards use the current `refunds` state:

- **Total Processed Refunds:** `refunds.length`
- **Total Value Refunded:** sum of every `amount`

They update after `fetchRefunds()` replaces state following a successful refund or refresh.

## Search behavior

Search is local and runs whenever `searchQuery` or `refunds` changes:

```jsx
const query = searchQuery.toLowerCase();
const filtered = refunds.filter(refund => {
  const refundId = refund.id?.toString() || '';
  const orderId = refund.orderId?.toString() || '';
  const reason = refund.reason?.toLowerCase() || '';

  return refundId.includes(query) ||
    orderId.includes(query) ||
    reason.includes(query);
});
```

Typing `25` can match refund ID `25` or order ID `25`; typing `damaged` matches the reason. No API call occurs for each keystroke because filtering happens against the already loaded array. For a large refund history, use a debounced backend search endpoint and pagination.

## Table columns

Each row displays:

1. Refund ID
2. Order ID
3. Created/refund date
4. Reason
5. Payment type
6. Refund amount
7. View-details action

The list is rendered from `filteredRefunds`, while summary cards intentionally use all `refunds`, so searching does not incorrectly change the overall totals.

## Details action and modal

```jsx
const handleViewRefund = async refund => {
  let order = null;
  if (refund.orderId) {
    order = await orderAPI.getById(refund.orderId);
  }
  setSelectedRefund({ ...refund, order });
  setIsViewDialogOpen(true);
};
```

Clicking the eye button does two things:

1. It uses the refund already in the table.
2. It calls `GET /api/orders/{orderId}` to enrich the modal with order information.

The modal then displays refund ID/date, order number, refund amount, payment type, and reason. The dialog itself is UI state; opening it does not create another refund.

## Refresh behavior

The Refresh button invokes `fetchRefunds`, which calls `GET /api/refunds/branch/{branchId}` again, sorts the response, updates `refunds`, and recalculates the totals through React rendering.

## Interview questions

### Which API creates a refund?

`POST /api/refunds` through `refundAPI.create(refundDto)`.

### How does the new refund appear without manually editing the table?

After POST succeeds, the page calls `fetchRefunds()` again. The new backend response replaces `refunds`, and the table/totals re-render from that state.

### Is search server-side?

No. Current search is client-side over loaded refunds. Server-side search is better for large datasets.

### How is a partial refund calculated?

The frontend sends the entered amount. The backend must compare it with the order's refundable balance and reject an excessive amount.

### What should be improved for production?

Use decimal-safe money types, backend authorization and ownership checks, idempotency keys to prevent double refunds, pagination, an explicit refund status, audit logs, and payment-provider reconciliation.
