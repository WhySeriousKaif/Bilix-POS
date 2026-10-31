# Cashier Order History — Interview Notes

## What happens when the page opens?

The page loads the current branch's orders. In the present implementation, `branchId` defaults to `1`:

```jsx
const [branchId] = useState(1);

useEffect(() => {
  fetchOrders();
}, [dateFilter, customDateStart, customDateEnd]);
```

The page is therefore branch-specific, but the branch ID should eventually come from the logged-in user's profile or an authentication context instead of being hard-coded.

## API calls

For the **Today** filter:

```http
GET /api/orders/today/branch/{branchId}
```

Example:

```http
GET /api/orders/today/branch/1
```

For **This Week**, **This Month**, and the initial fallback:

```http
GET /api/orders/branch/{branchId}
```

Example response shape (the exact fields depend on the backend DTO):

```json
[
  {
    "id": 1024,
    "createdAt": "2026-10-29T10:25:00",
    "customer": { "name": "Amit Verma", "email": "amit@example.com" },
    "totalAmount": 749.00,
    "paymentType": "CASH",
    "status": "COMPLETED",
    "orderItems": []
  }
]
```

`orderAPI` is the frontend API wrapper. It adds the base URL and authorization headers, sends the request, and returns the parsed JSON to the React page.

## Loading and preparing the data

The component stores the result in state and sorts newest orders first:

```jsx
const data = await orderAPI.getByBranch(branchId);

data.sort(
  (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
);

setOrders(data || []);
```

The table is rendered from this state. `loading` is used to show a loading state while the request is in progress, and errors should be handled with a user-friendly message.

## Today, week, month, and custom date filters

The date buttons update `dateFilter`:

```jsx
setDateFilter('today');
setDateFilter('week');
setDateFilter('month');
setDateFilter('custom');
```

Changing the filter re-runs `fetchOrders` because the filter values are dependencies of the effect.

### Today

The backend endpoint already returns today's orders, so the browser receives a smaller response.

### This week

The current code fetches all branch orders and filters them in the browser:

```jsx
const data = await orderAPI.getByBranch(branchId);
const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

const weeklyOrders = data.filter(
  order => new Date(order.createdAt) >= weekStart
);
```

### This month

It uses the same branch endpoint and keeps orders created after the first day of the current month:

```jsx
const monthStart = startOfMonth(new Date());

const monthlyOrders = data.filter(
  order => new Date(order.createdAt) >= monthStart
);
```

### Custom range

The two calendar controls set `customDateStart` and `customDateEnd`. The end date is changed to `23:59:59.999` so orders created later on that selected day are included:

```jsx
const start = new Date(customDateStart);
const end = new Date(customDateEnd);
end.setHours(23, 59, 59, 999);

const rangeOrders = data.filter(order => {
  const created = new Date(order.createdAt);
  return created >= start && created <= end;
});
```

Important: the current implementation does **not** send week/month/custom dates to the backend. It downloads all branch orders first, then filters locally. That is simple for learning, but a production API should support something like:

```http
GET /api/orders/branch/1?from=2026-10-01&to=2026-10-29
```

This reduces response size and database/network work.

## How search works

Search is local; each keystroke does not call the backend. The component searches the already-loaded `orders` array and stores the result in `filteredOrders`:

```jsx
useEffect(() => {
  filterOrders();
}, [searchQuery, orders]);
```

The search checks order ID, customer name, email, and phone:

```jsx
const query = searchQuery.toLowerCase();

const filtered = orders.filter(order => {
  const id = String(order.id ?? '');
  const customer = typeof order.customer === 'string'
    ? order.customer
    : (order.customer?.name || order.customer?.fullName || 'Walk-in');
  const email = typeof order.customer === 'object'
    ? (order.customer?.email || '')
    : '';
  const phone = typeof order.customer === 'object'
    ? (order.customer?.phone || '')
    : '';

  return id.includes(query) ||
    customer.toLowerCase().includes(query) ||
    email.toLowerCase().includes(query) ||
    phone.includes(query);
});

setFilteredOrders(filtered);
```

Example: typing `1024` finds order `1024`; typing `amit` finds Amit Verma; typing a phone number finds that customer's order. Search does not mutate the original `orders` list.

For a large system, search should be debounced and performed by the backend:

```http
GET /api/orders/branch/1?search=amit&page=0&size=20
```

## Opening one order

Clicking the eye/details action makes a separate request:

```http
GET /api/orders/{id}
```

Frontend flow:

```jsx
const handleViewOrder = async (orderId) => {
  const order = await orderAPI.getById(orderId);
  setSelectedOrder(order);
  setIsViewDialogOpen(true);
};
```

The selected order is then shown in a modal. This second request is useful because the list response can stay small while the detail response includes customer information and all `orderItems`.

## Printing an invoice

Printing does not call the order-list endpoint again. The selected order is passed to the invoice utility:

```jsx
const { downloadInvoicePDF } = await import('@/utils/invoiceGenerator');
downloadInvoicePDF(order);
```

The browser creates and downloads a PDF from the already-loaded order data.

## Refund action

The current order-history handler asks for confirmation and contains a placeholder for the refund flow. The actual refund API should be called only after confirmation, for example:

```http
POST /api/refunds
```

After a successful refund, refresh the list or update the affected order so the status and totals remain synchronized with the backend.

## Interview questions and short answers

**Q: Which API runs when Order History opens?**  
**A:** The branch orders endpoint runs. For today the code uses `GET /api/orders/today/branch/{branchId}`; for the other filters it currently uses `GET /api/orders/branch/{branchId}`.

**Q: Does typing in the search box call an API?**  
**A:** No. The loaded list is filtered in memory by order ID, customer name, email, and phone.

**Q: How does the calendar filter work?**  
**A:** Calendar state changes trigger `fetchOrders`; the current code fetches branch orders and filters `createdAt` in the browser. A production design should send `from` and `to` query parameters to the backend.

**Q: Why is the detail endpoint separate?**  
**A:** It keeps the list response lightweight and loads full order information only when the user opens an order.

**Q: What does React render?**  
**A:** `orders` is the fetched source list, while `filteredOrders` is the view list after search. The table maps over `filteredOrders`.

## Small improvements to make later

1. Replace the hard-coded `branchId = 1` with the authenticated user's branch ID.
2. Add backend date-range, search, and pagination parameters.
3. Avoid fetching all orders when a custom date has only a start date; wait until both dates exist.
4. Remove unused imports such as `startOfToday`, `subDays`, and `subMonths`.
5. Add consistent error handling and an empty-state message.

