# Cashier Shift Summary — Interview Notes

The Shift Summary page combines the active cashier shift, sales, payment methods, top-selling products, recent orders, and processed refunds.

## Page-load API

When the authenticated user is available, the page calls:

```http
GET /api/shift-reports/current?cashierId={user.id}
Authorization: Bearer <token>
```

Frontend code:

```jsx
useEffect(() => {
  if (user?.id) fetchShiftData();
}, [user]);

const data = await shiftReportAPI.getCurrent(user.id);
setShiftData(data);
```

The page uses one aggregated response instead of separate requests for every card.

Example response:

```json
{
  "id": 12,
  "cashier": { "id": 1, "fullName": "Alex Johnson" },
  "shiftStart": "2026-10-29T15:54:00",
  "shiftEnd": null,
  "totalOrders": 5,
  "totalSales": 35643.00,
  "totalRefunds": 500.00,
  "netSale": 35143.00,
  "paymentSummaries": [
    { "type": "CARD", "totalAmount": 24999.00, "transactionCount": 2, "percentage": 70.2 },
    { "type": "CASH", "totalAmount": 5644.00, "transactionCount": 2, "percentage": 15.8 }
  ],
  "topSellingProducts": [
    { "id": 8, "name": "Organic Coffee Beans", "sellingPrice": 749.00, "quantity": 3 }
  ],
  "recentOrders": [],
  "refunds": []
}
```

## Shift Information

The card displays cashier, start, end, and duration. If `shiftEnd` is null, the shift is ongoing:

```jsx
const end = shiftEnd ? new Date(shiftEnd) : new Date();
const hours = Math.floor(
  (end - new Date(shiftStart)) / (1000 * 60 * 60)
);
```

## Sales Summary

```jsx
const totalOrders = shiftData.totalOrders || 0;
const totalSales = shiftData.totalSales || 0;
const totalRefunds = shiftData.totalRefunds || 0;
const netSales = shiftData.netSale || (totalSales - totalRefunds);
```

Example: ₹35,643 sales minus ₹500 refunds equals ₹35,143 net sales. The backend should remain the financial source of truth.

## Payment Summary

`paymentSummaries` contains one object per payment type. The UI maps over it:

```jsx
paymentSummaries.map(payment => (
  <div key={payment.type}>
    <span>{payment.type}</span>
    <span>₹{payment.totalAmount.toFixed(2)}</span>
    <span>{payment.transactionCount} transactions ({payment.percentage}%)</span>
  </div>
))
```

Example: CARD ₹24,999 (2 transactions), UPI ₹5,000 (1), CASH ₹5,644 (2).

## Top Selling Items

The backend returns ranked products and the component displays up to five:

```jsx
topSellingProducts.slice(0, 5).map((product, index) => (
  <div key={product.id || index}>
    {index + 1}. {product.name} — units sold: {product.quantity}
  </div>
))
```

## Recent Orders and Refunds

Both lists are already included in the shift response, so these child components do not make additional API calls:

```jsx
recentOrders.slice(0, 10).map(order => (
  <tr key={order.id}>
    <td>#{order.id}</td>
    <td>{order.paymentType}</td>
    <td>₹{order.totalAmount.toFixed(2)}</td>
  </tr>
))
```

Refund rows show refund ID, order ID, reason, and a negative amount.

## Print Summary

Printing is local; it uses the already-fetched object:

```jsx
const handlePrint = () => {
  if (shiftData) exportShiftSummaryReportPDF(shiftData);
  else window.print();
};
```

No extra backend request is required.

## Start Shift

If there is no active shift, the page calls:

```http
POST /api/shift-reports/start?cashierId={cashierId}&branchId={branchId}
```

```jsx
await shiftReportAPI.startShift(user.id, user.branchId || 1);
await fetchShiftData();
```

The second call refreshes the newly-created shift data.

## End Shift and Logout

The End Shift button calls:

```http
PATCH /api/shift-reports/end?shiftReportId={shiftId}
```

```jsx
await shiftReportAPI.endShift(shiftData.id);
localStorage.removeItem('authToken');
window.location.href = '/login';
```

The backend closes the shift; the frontend clears the token and redirects. A production version should wait for backend confirmation before logging out.

## Error behavior

The current code inserts mock data if the API fails. This helps development but must not remain in production because fake sales could be displayed as real sales. Prefer a clear error state and retry button.

## Interview questions

**Which API loads the summary?** `GET /api/shift-reports/current?cashierId={id}`.

**Are separate sales and refund APIs called?** Not by this page; those summaries are fields in the aggregated shift response.

**How is net sales calculated?** Prefer backend `netSale`, otherwise `totalSales - totalRefunds`.

**Which API starts a shift?** `POST /api/shift-reports/start` with cashier and branch IDs.

**Which API ends it?** `PATCH /api/shift-reports/end` with the shift ID.

**How is the PDF generated?** Locally from the loaded object, without another API call.

## Production improvements

1. Derive cashier and branch IDs from authenticated context, not fallback `1` values.
2. Remove mock data from production builds.
3. Calculate financial totals atomically on the backend.
4. Add an explicit refresh endpoint/action.
5. Add backend limits or pagination for recent orders and refunds.

