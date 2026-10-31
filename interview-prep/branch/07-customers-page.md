# Branch Manager Customers Page — Interview Notes

## What the page displays

The page displays customer name/avatar, email, phone, order count, and total amount spent. Summary cards show total customers, customers with at least one order, and combined customer revenue.

## Loading flow

```jsx
useEffect(() => { fetchCustomers(); }, []);
useEffect(() => { filterCustomers(); }, [searchQuery, customers]);
```

On mount, the page calls `customerAPI.getAll()`. For every returned customer, it calls `orderAPI.getByCustomerId(customer.id)` to calculate order count and lifetime spend.

## APIs used

| Purpose | Client method | Endpoint |
|---|---|---|
| Load customers | `customerAPI.getAll()` | `GET /api/customers` |
| Load one customer's orders | `orderAPI.getByCustomerId(id)` | `GET /api/orders/customer/{customerId}` |
| Add customer | `customerAPI.create(dto)` | `POST /api/customers` |
| Available but not used here | `customerAPI.search/update/delete` | `/customers/search`, `PUT /customers/{id}`, `DELETE /customers/{id}` |

## Enriching customers with purchase history

```jsx
const data = await customerAPI.getAll();
const customersWithOrders = await Promise.all(
  data.map(async customer => {
    const orders = await orderAPI.getByCustomerId(customer.id);
    return {
      ...customer,
      orderCount: orders.length,
      totalSpent: orders.reduce(
        (sum, order) => sum + (order.totalAmount || 0), 0
      ),
    };
  })
);
setCustomers(customersWithOrders);
```

`Promise.all` runs the customer-order requests concurrently. For example, a customer with three orders of ₹100, ₹250, and ₹50 receives `orderCount: 3` and `totalSpent: 400`.

## Summary calculations

```jsx
const summary = {
  total: customers.length,
  withOrders: customers.filter(c => c.orderCount > 0).length,
  totalRevenue: customers.reduce(
    (sum, c) => sum + (c.totalSpent || 0), 0
  ),
};
```

These values are derived from backend data and recalculate after Refresh or after a new customer is added.

## Search behavior

Search runs locally whenever the query or enriched customer list changes:

```jsx
const query = searchQuery.toLowerCase();
const result = customers.filter(customer => {
  const name = (customer.name || customer.fullName || '').toLowerCase();
  const email = (customer.email || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();
  return name.includes(query) || email.includes(query) || phone.includes(query);
});
```

Typing a name, email, or phone number changes visible rows without an API request. The API client has a `customerAPI.search(keyword)` method, but this page currently does not use it.

## Adding a customer

The Add Customer dialog collects name, email, and phone. Name is required:

```jsx
await customerAPI.create({
  name: newCustomer.name,
  email: newCustomer.email,
  phone: newCustomer.phone,
});
```

This calls `POST /api/customers`. After success, the dialog closes, local form state resets, `fetchCustomers()` reloads customers and their orders, and the table/cards update from the backend.

## Refresh behavior

Refresh invokes `fetchCustomers()` again. It reloads the customer collection and recomputes each customer's order count and total spending. It is therefore a full data refresh, not just a browser repaint.

## Important production limitation

The current enrichment makes one order request per customer (the N+1 request pattern). For 500 customers this can mean 501 requests. A production design should provide a backend summary endpoint, for example `GET /api/customers/branch/{id}/summary`, returning each customer with order count and total spent, or use one grouped SQL query.

The current page also loads all customers rather than filtering by branch. If customers are global in the domain, that may be intentional; otherwise the backend should scope the endpoint to the branch.

## Interview questions

### Why use `Promise.all`?

Customer order requests are independent, so they can run concurrently instead of waiting sequentially.

### Is search server-side?

No. The page filters the enriched customer array in memory. The existing search endpoint could be used with debounce for large data.

### How is lifetime value calculated?

It is the sum of every order's `totalAmount` for that customer.

### How does a new customer appear?

The POST creates it, then `fetchCustomers()` reloads the authoritative list and recalculates metrics.

### What would you improve?

Add branch-scoped summary queries, server-side pagination/search, customer detail/edit/delete actions, safe money arithmetic, and a single aggregation endpoint to avoid N+1 requests.
