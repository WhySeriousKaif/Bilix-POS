# Cashier Returns and Refunds — Interview Notes

The Returns/Refunds page lets a cashier find a completed order, inspect its items, select what the customer is returning, calculate the refund, and submit the refund to the backend.

## Page flow

The flow is:

1. Load orders for the cashier's branch.
2. Load the cashier's current shift.
3. Search by order ID or customer name.
4. Select an order.
5. Fetch the complete order details.
6. Select one or more items and return quantities.
7. Choose a reason and refund method.
8. Calculate the amount locally.
9. Submit a refund request.
10. Show success and refresh the order list.

## Initial API calls

When `RefundPage` mounts, it calls two functions:

```jsx
useEffect(() => {
  fetchOrders();
  fetchCurrentShift();
}, []);
```

### Load branch orders

```http
GET /api/orders/branch/{branchId}
```

Current example:

```http
GET /api/orders/branch/1
```

Frontend code:

```jsx
const data = await orderAPI.getByBranch(branchId);
setOrders(data || []);
```

The table displays the returned order ID, date/time, customer, total amount, and payment type. The current code keeps all branch orders available for return; it does not yet remove already fully-refunded orders.

### Load the current cashier shift

```http
GET /api/shift-reports/current?cashierId={cashierId}
```

Current example:

```http
GET /api/shift-reports/current?cashierId=1
```

The returned shift ID is saved in state:

```jsx
const shift = await shiftReportAPI.getCurrent(cashierId);
if (shift?.id) setShiftReportId(shift.id);
```

That shift ID is included in the refund request so the refund can be associated with the cashier's active shift.

The current frontend defaults both `branchId` and `cashierId` to `1`. In production, both should come from the authenticated user's profile or auth context.

## Search behavior

The search input is controlled by React:

```jsx
const [searchQuery, setSearchQuery] = useState('');

<Input
  value={searchQuery}
  onChange={(event) => setSearchQuery(event.target.value)}
/>
```

`OrderTable` filters the already-loaded `orders` array. It does not call the backend for every keystroke:

```jsx
const filteredOrders = orders.filter(order => {
  if (!searchQuery.trim()) return true;

  const query = searchQuery.toLowerCase();
  const orderId = order.id?.toString() || '';
  const customerName = typeof order.customer === 'string'
    ? order.customer
    : (order.customer?.name || order.customer?.fullName || 'Walk-in');

  return orderId.includes(query) ||
    customerName.toLowerCase().includes(query);
});
```

Examples:

- Typing `102` finds order `#102`.
- Typing `rahul` finds Rahul Sharma.
- Clearing the input displays all loaded orders again.

For a large branch, the better API design is server-side search with pagination:

```http
GET /api/orders/branch/1?search=rahul&page=0&size=20
```

## Selecting an order

Clicking **Select for Return** first asks the backend for the complete order:

```http
GET /api/orders/{orderId}
```

Example:

```http
GET /api/orders/102
```

Frontend flow:

```jsx
const handleSelectOrder = (order) => {
  orderAPI.getById(order.id)
    .then(fullOrder => setSelectedOrder(fullOrder))
    .catch(() => setSelectedOrder(order));
};
```

The detailed response contains `orderItems`, which are needed to decide which products and quantities are being returned.

## What the detail view displays

`OrderDetails` displays:

- Order ID and creation time
- Customer name and phone
- Payment type
- Total number of items
- Original order total
- Every product, quantity, unit price, and line total

The total item count is calculated from the order items:

```jsx
const totalItems = order.orderItems?.reduce(
  (sum, item) => sum + (item.quantity || 0),
  0
) || 0;
```

## Preparing return items

When an order is selected, `ReturnItemSection` creates a separate editable return model:

```jsx
const items = order.orderItems.map(item => ({
  orderItemId: item.id,
  productId: item.product?.id,
  productName: item.product?.name || 'N/A',
  orderedQty: item.quantity || 0,
  returnQty: 0,
  price: item.price || 0,
  isReturning: false,
}));
```

This is important: the original order is not mutated. The UI keeps a separate list describing the customer's return decision.

## Selecting quantities

The quantity input is limited between zero and the ordered quantity:

```jsx
const qty = Math.max(
  0,
  Math.min(value, returnItems[index].orderedQty)
);
```

If the cashier clicks **Yes**, the whole ordered quantity is selected. Clicking again changes it back to zero. A cashier can also return only part of an order, for example two units from an original quantity of five.

## Refund calculation

The refund is calculated from selected quantity multiplied by the original item price:

```jsx
const totalRefund = returnItems.reduce((total, item) => {
  if (item.isReturning && item.returnQty > 0) {
    return total + item.price * item.returnQty;
  }
  return total;
}, 0);
```

Example:

```text
Coffee beans: ₹749 × 1 = ₹749
Headphones:   ₹2,499 × 0 = ₹0
Total refund: ₹749
```

This is a frontend preview. The backend must recalculate and validate the amount from trusted order data; a client must never be allowed to refund an arbitrary amount.

## Return reason and refund method

The cashier must select both values before submitting:

```jsx
if (!returnReason || !refundMethod) {
  toast.error('Please select return reason and refund method');
  return;
}
```

Available reasons include defective item, wrong item, shipping damage, changed mind, size/color mismatch, quality issue, and other.

The refund method defaults to the original payment type when available:

```jsx
if (order?.paymentType) {
  setRefundMethod(order.paymentType);
}
```

The cashier can choose `CASH`, `CARD`, or `UPI`.

## Refund request and API call

After validation, the frontend creates a refund DTO:

```jsx
const refundData = {
  orderId: order.id,
  reason: returnReason,
  amount: totalRefund,
  paymentType: refundMethod,
  shiftReportId: shiftReportId || null,
  branch: branchId ? { id: branchId } : null,
  cashier: cashierId ? { id: cashierId } : null,
};
```

It sends:

```http
POST /api/refunds
Content-Type: application/json
Authorization: Bearer <token>
```

Example request body:

```json
{
  "orderId": 102,
  "reason": "Defective item",
  "amount": 749.0,
  "paymentType": "CASH",
  "shiftReportId": 12,
  "branch": { "id": 1 },
  "cashier": { "id": 1 }
}
```

The API wrapper uses `POST /refunds`:

```jsx
create: (refundDto) => apiCall('/refunds', {
  method: 'POST',
  body: JSON.stringify(refundDto),
}),
```

## Success flow

After a successful response:

```jsx
const refund = await refundAPI.create(refundData);
setProcessedRefund(refund);
setRefundDialogOpen(true);
setSelectedOrder(null);
fetchOrders();
```

This does four things:

1. Stores the backend-created refund.
2. Opens the success dialog.
3. Returns to the order search/table view.
4. Fetches the branch orders again so the screen reflects backend state.

The success dialog shows the refund order ID, amount, method, and reason. Its **Print Receipt** button currently closes the dialog; a real implementation should call a refund-receipt PDF generator.

## Refund API methods already available

The frontend API service exposes:

```jsx
refundAPI.getAll();                 // GET /api/refunds
refundAPI.getById(id);              // GET /api/refunds/{id}
refundAPI.getByCashier(cashierId);  // GET /api/refunds/cashier/{cashierId}
refundAPI.getByBranch(branchId);    // GET /api/refunds/branch/{branchId}
refundAPI.getByShift(shiftId);      // GET /api/refunds/shift/{shiftId}
refundAPI.create(refundDto);        // POST /api/refunds
refundAPI.delete(id);               // DELETE /api/refunds/{id}
```

The cashier page currently uses `create`. A refund-history page can use `getByCashier`, `getByBranch`, or `getByShift` depending on the required scope.

## Interview questions and answers

**Q: Which API loads orders for return?**  
**A:** `GET /api/orders/branch/{branchId}`.

**Q: Which API loads the selected order's items?**  
**A:** `GET /api/orders/{orderId}`.

**Q: How is a partial refund calculated?**  
**A:** For every selected item, `unit price × return quantity` is added to the total.

**Q: Which API actually creates the refund?**  
**A:** `POST /api/refunds` with order, reason, amount, payment type, branch, cashier, and shift information.

**Q: Why refresh orders after creating a refund?**  
**A:** The backend is the source of truth. Refreshing prevents the UI from showing stale order/refund information.

**Q: Is the amount calculated only on the frontend?**  
**A:** The frontend calculates a preview, but the backend must recalculate and validate it to prevent tampering.

## Production improvements

1. Get `branchId`, `cashierId`, and the shift from authenticated user context instead of defaults of `1`.
2. Prevent refunds beyond the remaining refundable quantity.
3. Exclude fully refunded orders from the selectable list.
4. Validate that the refund amount equals trusted server-side item prices.
5. Add idempotency keys so a double click cannot create two refunds.
6. Add pagination and server-side search for large order histories.
7. Implement the refund receipt download instead of only closing the dialog.
8. Use a transaction on the backend to update refund records, order status, inventory, and shift totals atomically.

