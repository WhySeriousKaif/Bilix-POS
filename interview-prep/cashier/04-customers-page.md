# Cashier Customers Page — Interview Notes

The cashier Customers page displays customer records, calculates customer activity from orders, supports local search, allows adding a customer, and refreshes data after a successful create.

## Page loading flow

When the page opens, the component calls `fetchCustomers` once:

```jsx
useEffect(() => {
  fetchCustomers();
}, []);
```

The first backend request is:

```http
GET /api/customers
Authorization: Bearer <token>
```

Frontend API wrapper:

```jsx
getAll: () => apiCall('/customers')
```

The returned customer list is then enriched with order information. For every customer, the frontend makes another request:

```http
GET /api/orders/customer/{customerId}
```

Example:

```http
GET /api/orders/customer/7
```

Current code:

```jsx
const customersWithOrders = await Promise.all(
  (data || []).map(async (customer) => {
    const orders = await orderAPI.getByCustomerId(customer.id);

    return {
      ...customer,
      orderCount: orders?.length || 0,
      totalSpent: orders?.reduce(
        (sum, order) => sum + (order.totalAmount || 0),
        0
      ) || 0,
    };
  })
);
```

This means three customers cause one customer request plus three order requests. It is easy to understand, but it is an N+1 request pattern. A production backend should return `orderCount` and `totalSpent` in one customer-summary endpoint.

## Example backend data

Customer response:

```json
[
  {
    "id": 7,
    "name": "Rahul Sharma",
    "email": "rahul.sharma@example.com",
    "phone": "+919876512340"
  }
]
```

Orders for customer `7`:

```json
[
  { "id": 101, "totalAmount": 24999.0 },
  { "id": 102, "totalAmount": 6497.0 }
]
```

The frontend derives:

```text
orderCount = 2
totalSpent = ₹31,496.00
```

## Summary cards

The summary is calculated from the enriched customer array:

```jsx
const summary = {
  total: customers.length,
  withOrders: customers.filter(c => c.orderCount > 0).length,
  totalRevenue: customers.reduce(
    (sum, c) => sum + (c.totalSpent || 0),
    0
  ),
};
```

The cards mean:

- **Total Customers:** number of customer records returned by `GET /api/customers`.
- **Active Customers:** customers with at least one order.
- **Total Revenue:** sum of all customer order totals loaded by the order requests.

Example:

```text
Rahul: ₹31,496, 2 orders
Priya: ₹899, 1 order
Amit: ₹2,499, 1 order

Total customers: 3
Active customers: 3
Total revenue: ₹34,894
```

## Search behavior

The search box is controlled state:

```jsx
const [searchQuery, setSearchQuery] = useState('');

<Input
  value={searchQuery}
  onChange={(event) => setSearchQuery(event.target.value)}
/>
```

Whenever `searchQuery` or `customers` changes, the page filters locally:

```jsx
useEffect(() => {
  filterCustomers();
}, [searchQuery, customers]);
```

It checks name, email, and phone:

```jsx
const query = searchQuery.toLowerCase();

const filtered = customers.filter(customer => {
  const name = (customer.name || customer.fullName || '').toLowerCase();
  const email = (customer.email || '').toLowerCase();
  const phone = (customer.phone || '').toLowerCase();

  return name.includes(query) ||
    email.includes(query) ||
    phone.includes(query);
});
```

Examples:

- `rahul` matches Rahul Sharma.
- `example.com` matches customers using that email domain.
- `9876512340` matches a phone number.

No search API is called while typing in this page. The API wrapper does expose a server-side search endpoint:

```http
GET /api/customers/search?keyword=rahul
```

but `CustomersPage` currently uses the already-loaded list instead. For a large dataset, use the server-side search endpoint with debounce and pagination.

## Refresh button

The Refresh button calls the same `fetchCustomers` function:

```jsx
<Button onClick={fetchCustomers}>Refresh</Button>
```

That repeats:

```text
GET /api/customers
GET /api/orders/customer/{id} for each customer
```

The cards and table are then rebuilt from the fresh backend data.

## Adding a customer

The Add Customer dialog stores form values in `newCustomer`:

```jsx
const [newCustomer, setNewCustomer] = useState({
  name: '',
  email: '',
  phone: '',
});
```

The name is required before submission:

```jsx
if (!newCustomer.name) {
  toast.error('Name is required');
  return;
}
```

When the form is submitted:

```http
POST /api/customers
Content-Type: application/json
Authorization: Bearer <token>
```

Example request body:

```json
{
  "name": "Neha Kapoor",
  "email": "neha@example.com",
  "phone": "+919876500000"
}
```

API wrapper:

```jsx
create: (customer) => apiCall('/customers', {
  method: 'POST',
  body: JSON.stringify(customer),
})
```

After success, the page closes the dialog, clears the form, reloads the customers, and shows a toast:

```jsx
await customerAPI.create(newCustomer);
setIsAddDialogOpen(false);
setNewCustomer({ name: '', email: '', phone: '' });
fetchCustomers();
toast.success('Customer added successfully!');
```

## Edit action

The table shows an edit icon, but the current page does not yet implement an edit handler or edit dialog. The API service already provides the method needed:

```http
PUT /api/customers/{id}
```

Example:

```jsx
await customerAPI.update(7, {
  name: 'Rahul Sharma',
  email: 'rahul.new@example.com',
  phone: '+919876512340',
});
```

After updating, call `fetchCustomers()` so the table and summary cards display the backend's current values.

## Delete API available

The API wrapper also exposes:

```http
DELETE /api/customers/{id}
```

```jsx
await customerAPI.delete(7);
await fetchCustomers();
```

The current UI does not display a delete button. If deletion is added, confirm first and consider soft deletion so old orders still retain their customer history.

## Interview questions and answers

**Q: Which API loads customers?**  
**A:** `GET /api/customers`.

**Q: How are orders and total spending shown for each customer?**  
**A:** The frontend calls `GET /api/orders/customer/{customerId}`, counts the returned orders, and sums their `totalAmount` values.

**Q: Does the search box call the backend?**  
**A:** Not currently. It filters the already-loaded array by name, email, and phone. The API has a separate search endpoint for a scalable implementation.

**Q: Which API adds a customer?**  
**A:** `POST /api/customers` with name, email, and phone.

**Q: Why reload after adding?**  
**A:** The backend is the source of truth. Reloading ensures the new ID, normalized values, and summary totals are correct.

**Q: What is the weakness of the current implementation?**  
**A:** It has an N+1 request pattern: one customer request plus one order request per customer. A summary endpoint or backend join/aggregation would be more efficient.

## Production improvements

1. Replace hard-coded client-side aggregation with a backend summary query.
2. Add server-side search, pagination, and sorting.
3. Debounce search input if it becomes server-side.
4. Implement the existing edit icon with `PUT /api/customers/{id}`.
5. Add confirmation and authorization checks before deletion.
6. Keep historical orders valid if a customer is archived or soft-deleted.
7. Handle partial failures explicitly instead of silently assigning zero orders when one customer request fails.

