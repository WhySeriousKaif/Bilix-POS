# Bilix Pagination Implementation Practice

This folder is a practice reference. Do not copy these snippets blindly into `src/` or the Spring Boot backend. First understand the flow, then implement it yourself in the real project.

## Recommended order

Implement pagination in this order:

1. **Cashier Order History** — first implementation and easiest to verify.
2. **Cashier POS product catalog** — second implementation, with server-side search/category support.
3. Store products and branches.
4. Customers and employees.
5. Refunds and transactions.

Do not paginate dashboard summary cards. Cards such as total sales, total orders, and active employees should use aggregate endpoints, not a page of records.

## Why Order History should come first

The current order-history page already has a paged API wrapper:

```js
orderAPI.getByBranchPaged(branchId, page, size, sortBy, direction)
```

It maps to:

```http
GET /api/orders/branch/{branchId}/paged
```

Example:

```http
GET /api/orders/branch/1/paged?page=0&size=20&sortBy=createdAt&direction=desc
```

The table can show 20 records at a time and use the response metadata for Previous/Next controls.

## Backend practice implementation

### Repository

```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    Page<Order> findByBranchId(Long branchId, Pageable pageable);
}
```

### Service

```java
public Page<OrderDto> getOrdersByBranch(Long branchId, Pageable pageable) {
    return orderRepository.findByBranchId(branchId, pageable)
            .map(orderMapper::toDto);
}
```

### Controller

```java
@GetMapping("/branch/{branchId}/paged")
public Page<OrderDto> getOrdersByBranch(
        @PathVariable Long branchId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String direction) {

    if (page < 0) {
        throw new IllegalArgumentException("Page must be zero or greater");
    }
    if (size < 1 || size > 100) {
        throw new IllegalArgumentException("Size must be between 1 and 100");
    }

    Set<String> allowedSortFields = Set.of("id", "createdAt", "totalAmount");
    if (!allowedSortFields.contains(sortBy)) {
        throw new IllegalArgumentException("Unsupported sort field");
    }

    Sort sort = direction.equalsIgnoreCase("asc")
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();

    return orderService.getOrdersByBranch(
            branchId,
            PageRequest.of(page, size, sort)
    );
}
```

### Expected response

```json
{
  "content": [{
    "id": 102,
    "createdAt": "2026-10-29T20:02:00",
    "totalAmount": 749.0,
    "paymentType": "CASH",
    "status": "COMPLETED"
  }],
  "number": 0,
  "size": 20,
  "totalElements": 146,
  "totalPages": 8,
  "first": true,
  "last": false
}
```

## Frontend practice implementation

Add pagination state to `OrderHistory.jsx`:

```jsx
const [page, setPage] = useState(0);
const [pageSize] = useState(20);
const [totalPages, setTotalPages] = useState(0);
const [totalElements, setTotalElements] = useState(0);
```

Fetch one page:

```jsx
const response = await orderAPI.getByBranchPaged(
  branchId, page, pageSize, 'createdAt', 'desc'
);

setOrders(response.content || []);
setTotalPages(response.totalPages || 0);
setTotalElements(response.totalElements || 0);
```

Reload when the page changes:

```jsx
useEffect(() => {
  fetchOrders();
}, [page]);
```

Simple controls:

```jsx
<button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
  Previous
</button>
<span>Page {page + 1} of {totalPages}</span>
<button
  disabled={page + 1 >= totalPages}
  onClick={() => setPage(p => p + 1)}
>
  Next
</button>
```

When search or date filters change, reset to page zero. In a complete implementation, send those filters to the backend in the same paged request; do not filter only the current page and pretend it represents all matching records.

## POS Terminal product catalog

Yes, the POS product catalog should also be paginated. A real POS should not download thousands of products when the terminal opens. However, product pagination must be combined with server-side search, category filtering, and barcode lookup.

Recommended behavior:

- Load the first 12–24 products when the terminal opens.
- Send category and search terms to the backend.
- Reset to page zero when category/search changes.
- Debounce search by approximately 250–300 ms.
- Add a dedicated exact-SKU/barcode lookup endpoint.
- Keep the cart in local state; changing pages must not remove cart items.

Example:

```http
GET /api/products/store/1/paged?page=0&size=12&categoryId=4&search=watch
```

Exact barcode lookup:

```http
GET /api/products/store/1/barcode/8901234567890
```

The current `ProductSection` loads all store products and filters them in the browser. That is acceptable for a small demo catalog, but server-side pagination is the production improvement.

## Product backend practice

```java
public interface ProductRepository extends JpaRepository<Product, Long> {
    Page<Product> findByStoreIdAndCategoryIdAndNameContainingIgnoreCase(
            Long storeId,
            Long categoryId,
            String search,
            Pageable pageable
    );
}
```

For optional category/search parameters, use a clear specification or dedicated repository methods rather than hiding complicated behavior in the controller.

## Product frontend state

```jsx
const [productPage, setProductPage] = useState(0);
const [productSize] = useState(12);
const [productSearch, setProductSearch] = useState('');
const [categoryId, setCategoryId] = useState(null);
const [productTotalPages, setProductTotalPages] = useState(0);
```

```jsx
const handleSearchChange = (event) => {
  setProductSearch(event.target.value);
  setProductPage(0);
};

const response = await productAPI.getPagedByStore(profile.storeId, {
  page: productPage,
  size: productSize,
  search: productSearch,
  categoryId,
});

setProducts(response.content || []);
setProductTotalPages(response.totalPages || 0);
```

## POS edge cases

1. A product added to the cart must remain there when the cashier changes page.
2. Search must not be confused with barcode scanning; exact barcodes need precise lookup.
3. Category counts should come from a backend aggregate, not only the current page.
4. Stock must be revalidated by the backend at checkout.
5. A page size of 12 or 20 is better for product cards than 100.

## Other good pagination locations

| Area | Suggested size | Reason |
| --- | ---: | --- |
| Cashier Order History | 20 | Large chronological table |
| Cashier POS products | 12–24 | Product cards and fast search |
| Store products | 20 | Admin table with filters |
| Customers | 20 | Searchable list |
| Employees | 20 | Management table |
| Refunds | 20 | Financial audit list |
| Transactions | 20–50 | Potentially large history |
| Dashboard cards | None | Use aggregate queries |

## Practice sequence

1. Implement backend order pagination.
2. Test page 0 and page 1 with Postman or `curl`.
3. Add frontend Previous/Next controls.
4. Add total pages and empty states.
5. Add server-side search and date filters.
6. Add pagination to POS products with category/search parameters.
7. Add exact barcode lookup.
8. Test first page, last page, invalid size, search, and empty results.

## Your first hands-on task: Cashier Order History

The backend pagination endpoint already exists in this project. That means you should not create a new backend endpoint first. Your first task is to connect the existing endpoint to the page.

### Step 1: verify the backend endpoint

Start the backend and call this with a valid token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/orders/branch/1/paged?page=0&size=10&sortBy=createdAt&direction=desc"
```

Confirm that the response contains `content`, `totalPages`, `totalElements`, `number`, and `size`. If it fails, fix the backend/database/authentication before changing React.

The existing backend pieces are:

```text
OrderController.getOrdersByBranchPaged
    → OrderServiceImpl.getOrdersByBranchPaged
    → OrderRepository.findByBranchId(branchId, pageable)
    → Page<OrderDto>
```

### Step 2: understand the current frontend limitation

`OrderHistory.jsx` currently calls the non-paged endpoints and stores a complete list in `orders`. Search and date filtering then happen in the browser. Your goal is to replace that list request with `getByBranchPaged`.

Add these states near the existing order state:

```jsx
const [page, setPage] = useState(0);
const [pageSize] = useState(10);
const [totalPages, setTotalPages] = useState(0);
const [totalElements, setTotalElements] = useState(0);
```

### Step 3: fetch one page

For the first exercise, temporarily implement only the normal branch list. Do not combine date filters and search until page navigation works:

```jsx
const fetchOrders = async () => {
  try {
    setLoading(true);
    const response = await orderAPI.getByBranchPaged(
      branchId,
      page,
      pageSize,
      'createdAt',
      'desc'
    );

    setOrders(response.content || []);
    setTotalPages(response.totalPages || 0);
    setTotalElements(response.totalElements || 0);
  } catch (error) {
    console.error('Error fetching paged orders:', error);
    setOrders([]);
  } finally {
    setLoading(false);
  }
};
```

Run it when `branchId` or `page` changes:

```jsx
useEffect(() => {
  fetchOrders();
}, [branchId, page]);
```

### Step 4: add visible controls

Place this below the order table:

```jsx
<div className="flex items-center justify-between border-t p-4">
  <span className="text-sm text-muted-foreground">
    {totalElements === 0
      ? 'No orders'
      : `Page ${page + 1} of ${totalPages} (${totalElements} orders)`}
  </span>

  <div className="flex gap-2">
    <button
      disabled={page === 0}
      onClick={() => setPage(current => current - 1)}
    >
      Previous
    </button>
    <button
      disabled={totalPages === 0 || page + 1 >= totalPages}
      onClick={() => setPage(current => current + 1)}
    >
      Next
    </button>
  </div>
</div>
```

### Step 5: test manually

Use a branch with more than ten orders. Verify:

1. Page 1 shows at most ten orders.
2. Clicking Next requests `page=1`.
3. Clicking Previous returns to `page=0`.
4. Next is disabled on the last page.
5. Refreshing page 1 still requests page 1.
6. An empty branch displays `No orders`, not a broken table.

### Step 6: add filters after pagination works

Do not filter only the ten rows currently displayed. That would miss matching orders on other pages. The next backend change should accept search/date parameters together with pagination, for example:

```http
GET /api/orders/branch/1/paged?page=0&size=10&search=rahul&from=2026-10-01&to=2026-10-30
```

Then the repository/service applies those filters before calculating `totalPages`. Reset the page whenever a filter changes:

```jsx
setSearchQuery(value);
setPage(0);
```

### Step 7: only then paginate POS products

The current `ProductSection` calls `productAPI.getByStoreId(profile.storeId)` and loads the full catalog. After Order History is working, create a product endpoint that accepts `page`, `size`, `search`, and `categoryId`. Use a smaller page size such as 12 so the product-card layout remains usable.

Do not remove products from the cart when the product page changes. The cart is a separate piece of state.

## Interview explanation

“I started pagination with cashier Order History because it is a large table with a clear branch scope. The controller converts query parameters into a `Pageable`, the repository executes a paged query, and the service maps entities to DTOs. The frontend renders only `content` and uses `totalPages` for navigation. For the POS terminal, I also paginate products, but I combine pagination with server-side category/search filtering and barcode lookup so the cashier does not download the entire catalog.”

## Complete file-by-file practice plan

The real project already contains a backend paged endpoint and the frontend API helper. Do not delete working production code while learning. First copy the snippets below into your own notes, then implement one file at a time and compare your result with the existing files.

### Backend files

Work in `/Users/mdkaif/molla-pos-system/backend`.

1. `src/main/java/com/molla/repository/OrderRepository.java`

Add the import and method:

```java
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

Page<Order> findByBranchId(Long branchId, Pageable pageable);
```

2. `src/main/java/com/molla/service/OrderService.java`

Declare the service contract:

```java
Page<OrderDto> getOrdersByBranchPaged(
        Long branchId, int page, int size,
        String sortBy, String direction);
```

3. `src/main/java/com/molla/service/impl/OrderServiceImpl.java`

The implementation validates the request, creates a `PageRequest`, calls the repository, and maps each entity to a DTO:

```java
public Page<OrderDto> getOrdersByBranchPaged(
        Long branchId, int page, int size,
        String sortBy, String direction) {

    if (page < 0) {
        throw new IllegalArgumentException("page must be zero or greater");
    }
    if (size < 1 || size > 100) {
        throw new IllegalArgumentException("size must be between 1 and 100");
    }

    Set<String> allowedSorts = Set.of("id", "createdAt", "totalAmount");
    if (!allowedSorts.contains(sortBy)) {
        sortBy = "createdAt";
    }

    Sort sort = "asc".equalsIgnoreCase(direction)
            ? Sort.by(sortBy).ascending()
            : Sort.by(sortBy).descending();

    Pageable request = PageRequest.of(page, size, sort);
    Page<Order> result = orderRepository.findByBranchId(branchId, request);
    return result.map(OrderMapper::toDto);
}
```

4. `src/main/java/com/molla/controllers/OrderController.java`

Expose the HTTP endpoint:

```java
@GetMapping("/branch/{branchId}/paged")
public ResponseEntity<Page<OrderDto>> getPagedOrders(
        @PathVariable Long branchId,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size,
        @RequestParam(defaultValue = "createdAt") String sortBy,
        @RequestParam(defaultValue = "desc") String direction) {

    return ResponseEntity.ok(orderService.getOrdersByBranchPaged(
            branchId, page, size, sortBy, direction));
}
```

The response has `content`, `totalElements`, `totalPages`, `number`, and `size`. `content` is the only list rendered by React.

### Frontend files

Work in `/Users/mdkaif/molla-pos-system/pos-frontend`.

1. `src/services/api.js` — keep one reusable request helper:

```js
getByBranchPaged(branchId, page = 0, size = 10) {
  const query = new URLSearchParams({ page, size, sortBy: 'createdAt', direction: 'desc' });
  return apiCall(`/orders/branch/${branchId}/paged?${query}`);
}
```

2. `src/pages/cashier/OrderHistory.jsx` — add state:

```jsx
const [page, setPage] = useState(0);
const [pageSize] = useState(10);
const [totalPages, setTotalPages] = useState(0);
const [totalElements, setTotalElements] = useState(0);
```

Fetch one page, not the complete order list:

```jsx
useEffect(() => {
  let cancelled = false;

  async function loadPage() {
    setLoading(true);
    try {
      const result = await orderAPI.getByBranchPaged(branchId, page, pageSize);
      if (!cancelled) {
        setOrders(result.content ?? []);
        setTotalPages(result.totalPages ?? 0);
        setTotalElements(result.totalElements ?? 0);
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  }

  loadPage();
  return () => { cancelled = true; };
}, [branchId, page, pageSize]);
```

Render controls and reset the page when a filter changes:

```jsx
<button disabled={page === 0} onClick={() => setPage(p => p - 1)}>
  Previous
</button>
<span>Page {page + 1} of {Math.max(totalPages, 1)}</span>
<button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
  Next
</button>
```

```jsx
function changeDateFilter(value) {
  setDateFilter(value);
  setPage(0);
}
```

Important: current search/date filtering is client-side. Once pagination is enabled, move those filters into the backend query; otherwise a search sees only the current page.

### Testing checklist

Backend:

```bash
cd /Users/mdkaif/molla-pos-system/backend
./mvnw test
```

With the server running, call two pages:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/orders/branch/1/paged?page=0&size=2"
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/orders/branch/1/paged?page=1&size=2"
```

Also test an empty branch, `size=0`, `size=101`, a negative page, an invalid sort field, and a request without a token. The API should return a clear 4xx response for invalid input or authentication.

Frontend:

```bash
cd /Users/mdkaif/molla-pos-system/pos-frontend
npm run build
```

In the browser Network tab verify that Next changes `page=0` to `page=1`, Previous returns to page zero, the last-page button disables, an empty result is friendly, and opening order details/printing/refunding still works. Only after this passes should you repeat the same pattern for POS products (12–24 cards per request), branches, customers, employees, refunds, and transactions.
