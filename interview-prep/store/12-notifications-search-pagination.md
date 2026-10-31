# Store Admin Header: Notifications, Search, and Pagination

## Notification bell

The Store Admin layout uses `useStoreAlerts(storeInfo?.id)`. This hook calls the existing alert-related APIs and refreshes them every 30 seconds. It derives four notification groups: low-stock products, branches with no sales today, refund spikes, and inactive cashiers.

```jsx
const { inactiveCashiers, lowStockProducts, noSaleBranches, refundSpikes } =
  useStoreAlerts(storeInfo?.id, { pollIntervalMs: 30000 });

const notifications = [
  ...lowStockProducts.map(p => ({ id: `stock-${p.id}`, message: `${p.name} is low on stock` })),
  ...noSaleBranches.map(b => ({ id: `branch-${b.id}`, message: `No sales at ${b.name}` })),
];
```

The bell displays `notifications.length` as a badge. Clicking it opens a popover; the list is empty when no alerts exist. There is no separate notification table in the backend currently: notifications are derived from live business data. This is a useful interview distinction between persisted notifications and computed alerts.

## Super Admin notifications

The Super Admin layout calls `storeAPI.getAll()` and filters stores whose status is `PENDING`. Each pending store becomes a notification such as “A new store is awaiting approval.”

## Navbar search

The Super Admin search loads stores and users once with `Promise.all`:

```jsx
const [stores, users] = await Promise.all([
  storeAPI.getAll(), userAPI.getAll()
]);
```

As the user types, `useMemo` lowercases the query and filters page names, store fields (`brand`, type, email, address), and user fields (`fullName`, email, role). Results are limited and clicking a result navigates with React Router. This is client-side search over already loaded data; for large datasets it should become a debounced backend endpoint such as `GET /api/search?q=...`.

## Logo menu

The Store Admin logo is now a button. Clicking it opens a small menu with Account Settings and Log out. It uses ordinary React state (`logoMenuOpen`) and closes when an action is selected. Logout still goes through the existing Redux `logoutUser` flow.

## Where pagination belongs

Pagination is most valuable on growing collections, not dashboard cards or charts. The best first implementation is the Store Admin Products page because a store can contain thousands of products. Other good candidates are Employees, Sales, Transactions, Orders, and Super Admin Users/Stores.

For a quick frontend-only learning implementation:

```jsx
const [page, setPage] = useState(1);
const pageSize = 10;
const pageCount = Math.ceil(filteredProducts.length / pageSize);
const visibleProducts = filteredProducts.slice(
  (page - 1) * pageSize,
  page * pageSize
);
```

Reset the page after a search/filter change:

```jsx
useEffect(() => setPage(1), [searchQuery, selectedCategory]);
```

Then render Previous/Next buttons and disable them at the boundaries. This is easy to explain but still downloads every product.

For production/server-side pagination, send the page and size to the backend:

```js
productAPI.getByStoreId(storeId, { page: page - 1, size: pageSize, search });
```

The backend returns `{ content, totalElements, totalPages, number }`, and the frontend renders `content` while using `totalPages` for controls. Server-side pagination is the stronger interview answer because the database does not send thousands of rows to the browser.

## Interview questions

**Are notifications persisted?** Not currently. They are computed from stock, branch sales, refund, and cashier data. A persistent design would add a notification table and read/unread state.

**Why poll every 30 seconds?** It gives near-real-time alerts without requiring WebSockets. WebSockets or Server-Sent Events would be better when immediate delivery matters.

**Why debounce search?** It prevents a backend request on every keystroke. The current Super Admin search is local, so it filters in memory instead.

**Where should pagination be added first?** Products or transactions, because they grow quickly. Charts should receive summarized ranges rather than paginated chart points.

**Why reset to page one after searching?** The previous page may not exist in the filtered result, so resetting prevents an apparently empty screen.
