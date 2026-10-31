# Branch Manager Orders Page — Interview Notes

## Page responsibility

The Orders page loads orders for the manager's branch, supports search and filters, shows pagination for the all-time unfiltered view, and opens/prints an individual order.

## Initial request flow

```jsx
useEffect(() => {
  fetchBranchId();
}, []);

useEffect(() => {
  if (branchId) {
    setCurrentPage(0);
    fetchOrders(0);
  }
}, [branchId, dateFilter, statusFilter, paymentFilter]);

useEffect(() => {
  if (branchId) fetchOrders(currentPage);
}, [currentPage]);
```

First the page calls `GET /api/users/profile` through `userAPI.getProfile()` to discover `branchId`. Once it exists, the page loads orders. Changing date/status/payment resets to page zero and fetches again. Clicking Next or Previous changes `currentPage`, which fetches the corresponding page.

## Order APIs

| Purpose | Client method | Endpoint |
|---|---|---|
| Find manager branch | `userAPI.getProfile()` | `GET /api/users/profile` |
| Today’s orders | `orderAPI.getTodayByBranch(branchId)` | `GET /api/orders/today/branch/{branchId}` |
| Branch orders with optional filters | `orderAPI.getByBranch(branchId, filters)` | `GET /api/orders/branch/{branchId}` |
| All-time paginated orders | `orderAPI.getByBranchPaged(branchId, page, size)` | Branch orders pagination endpoint |
| Single order details | `orderAPI.getById(orderId)` | `GET /api/orders/{id}` |
| Recent/fallback data | `orderAPI.getRecentByBranch(branchId)` | `GET /api/orders/recent/{branchId}` |

## Date dropdown behavior

The dropdown values are `today`, `week`, `month`, and `all`.

- **Today:** calls the dedicated today endpoint.
- **Week:** loads branch orders, then keeps records from Monday of the current week.
- **Month:** loads branch orders, then keeps records from the first day of the current month.
- **All Time:** when no status/payment filter is selected, uses the backend pagination endpoint.

```jsx
if (dateFilter === 'today') {
  allOrders = await orderAPI.getTodayByBranch(branchId);
} else {
  allOrders = await orderAPI.getByBranch(branchId, filters);
}

if (dateFilter === 'week') {
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  allOrders = allOrders.filter(order =>
    order.createdAt && new Date(order.createdAt) >= weekStart
  );
}

if (dateFilter === 'month') {
  const monthStart = startOfMonth(new Date());
  allOrders = allOrders.filter(order =>
    order.createdAt && new Date(order.createdAt) >= monthStart
  );
}
```

This is a hybrid design: today uses a backend query, while week/month are filtered in the browser after loading branch data. A production API could accept `from` and `to` dates so the database performs the filtering.

## Status filtering

The status select sends values such as `COMPLETED`, `PENDING`, and `CANCELLED`.

```jsx
const filters = {};
if (statusFilter !== 'all') filters.orderStatus = statusFilter;
if (paymentFilter !== 'all') filters.paymentType = paymentFilter;

allOrders = await orderAPI.getByBranch(branchId, filters);
```

For non-today filters, the page also applies a defensive client-side filter:

```jsx
if (statusFilter !== 'all' && dateFilter !== 'today') {
  filtered = filtered.filter(order => order.status === statusFilter);
}
```

The final table displays the status as a colored badge. The current visual fallback is `COMPLETED` when the response has no status.

## Payment filtering

Payment values are `CASH`, `CARD`, and `UPI`. The selected value is sent as `paymentType` and, for non-today views, checked again in the browser.

```jsx
if (paymentFilter !== 'all' && dateFilter !== 'today') {
  filtered = filtered.filter(order => order.paymentType === paymentFilter);
}
```

The table maps payment type to an icon: dollar sign for cash, card icon for card, and smartphone icon for UPI.

## Search behavior

Search is local over the currently loaded `orders` array; it does not call the backend on every keystroke.

```jsx
useEffect(() => {
  filterOrders();
}, [searchQuery, orders]);

const query = searchQuery.toLowerCase();
const result = orders.filter(order => {
  const id = order.id?.toString() || '';
  const customer = typeof order.customer === 'string'
    ? order.customer
    : (order.customer?.name || order.customer?.fullName || 'Walk-in');

  return id.includes(query) || customer.toLowerCase().includes(query);
});
```

Therefore typing `102` finds order `102`, and typing `rahul` finds a matching customer. For very large datasets, search should become a debounced backend parameter and pagination should remain server-side.

## Pagination

Pagination is currently used when date is `all` and status/payment are both `all`:

```jsx
const response = await orderAPI.getByBranchPaged(branchId, page, 10);
setOrders(response.content || []);
setTotalPages(response.totalPages || 0);
setTotalElements(response.totalElements || 0);
```

The page number is zero-based for the backend. `handlePageChange` prevents values below zero or beyond `totalPages`. When a filter changes, the page resets to zero so the user does not remain on an invalid later page.

Current limitation: week/month/status/payment views load and filter arrays in the browser, so they do not get server pagination. A stronger production endpoint would support all filters plus `page` and `size` together.

## Viewing and printing an order

The view action calls `orderAPI.getById`, stores the response in `selectedOrder`, and opens a dialog. If that request fails, the page attempts to use an order already in memory. Printing dynamically imports the invoice utility and downloads a PDF without making another order request.

```jsx
const order = await orderAPI.getById(orderId);
setSelectedOrder(order);
setIsViewDialogOpen(true);
```

## Important code review note

The current table calls `handleViewOrder(order)`, while the handler is written as if it receives an ID. It should be made consistent:

```jsx
onClick={() => handleViewOrder(order.id)}
```

or change the handler to accept the full order object. Passing `order.id` is clearer because the API needs an ID and the fallback lookup can reliably compare IDs.

## Interview questions

### Does changing a filter call the backend?

Yes. Date/status/payment are dependencies of the loading effect. The page resets to page zero and calls the appropriate order API. Search is different: it filters the currently loaded array locally.

### Why reset pagination after a filter change?

The previous page may not exist in the new filtered result. Resetting to zero avoids an empty or misleading screen.

### Why use a dedicated “today” endpoint?

The backend can filter today’s records efficiently using a database date condition, avoiding a large all-orders response.

### What would you improve?

Use one server-side query supporting date range, status, payment, search, page, and size; return `{ content, totalElements, totalPages }`; debounce search; normalize status/payment enums; and fix the view handler argument mismatch.
