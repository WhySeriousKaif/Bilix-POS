# Cashier POS Terminal — Interview Notes

## Overall flow

The POS Terminal has two cooperating parts:

1. `ProductSection` loads and filters products.
2. `CartContext` and `CustomerPaymentSection` maintain the cart and complete checkout.

The product grid does not create an order when a product is clicked. It only updates local cart state. The order is persisted after the cashier chooses a payment method and presses Continue/Process Payment.

## Loading products

```jsx
const profile = await userAPI.getProfile();
const products = await productAPI.getByStoreId(profile.storeId);
setProducts(products || []);
```

The calls are:

```text
GET /api/users/profile
GET /api/products/storeId/{storeId}
```

The profile identifies the cashier's store. The product API returns the catalog used by the terminal. After a successful checkout, the page listens for `productsUpdated` and fetches products again so stock counts stay current.

## Category pills

Categories are derived from the fetched products, not hard-coded:

```jsx
const categories = useMemo(() => {
  const counts = new Map();
  products.forEach(product => {
    const name = product.category?.name || 'Others';
    counts.set(name, (counts.get(name) || 0) + 1);
  });

  return [
    { name: 'All', count: products.length },
    ...Array.from(counts.entries()).map(([name, count]) => ({ name, count })),
  ];
}, [products]);
```

If the backend returns five Electronics products and three Snacks products, the UI creates `All (8)`, `Electronics (5)`, and `Snacks (3)` automatically.

Clicking a category sets `activeCategory`. It does not call the backend again; it filters the already loaded catalog.

## Product search

```jsx
const filteredProducts = products.filter(product => {
  if (activeCategory !== 'All' &&
      (product.category?.name || 'Others') !== activeCategory) {
    return false;
  }

  if (!search.trim()) return true;
  const query = search.toLowerCase();
  return product.name?.toLowerCase().includes(query) ||
    product.sku?.toLowerCase().includes(query) ||
    product.brand?.toLowerCase().includes(query) ||
    product.category?.name?.toLowerCase().includes(query);
});
```

Typing `coffee` matches product name; typing an SKU or brand also works. Category and search filters are combined with AND behavior: the product must be in the selected category and match the search text.

## Barcode scanning

Most barcode scanners behave like keyboards: they type the SKU and press Enter. The terminal searches for an exact SKU match on Enter:

```jsx
const product = products.find(
  p => p.sku?.toLowerCase() === search.trim().toLowerCase()
);
if (product) {
  addToCart(product);
  setSearch('');
}
```

F1 focuses the search input so the cashier can scan without using the mouse.

## Add to cart

`ProductCard` calls `addToCart(product)`. The cart context either increments an existing line or adds a new one:

```jsx
setCartItems(previous => {
  const existing = previous.find(item => item.product.id === product.id);

  if (existing) {
    return previous.map(item => item.product.id === product.id
      ? { ...item, quantity: item.quantity + 1 }
      : item
    );
  }

  return [...previous, {
    id: Date.now(), product, quantity: 1,
    price: product.sellingPrice || product.price || 0,
  }];
});
```

This is local React state. No order API is called yet. The cart panel re-renders because it consumes the same `CartContext`.

## Totals, discount, and note

```jsx
const subtotal = cartItems.reduce(
  (sum, item) => sum + item.price * item.quantity, 0
);

const discountAmount = discount.type === 'percentage'
  ? subtotal * discount.value / 100
  : discount.value;

const total = Math.max(0, subtotal - discountAmount);
```

The discount can be percentage-based or a fixed amount. The order note is maintained in context and displayed in the checkout UI; the current `orderDto` does not yet send the note to the backend.

## Continue/payment flow

When the cashier presses Continue/Process Payment, the flow depends on the selected payment method.

### Cash

Cash skips the online gateway and directly creates the backend order.

### Card or UPI

1. `POST /api/payments/create-order?amount=...&currency=INR` creates a Razorpay order.
2. Razorpay opens its checkout UI.
3. After payment, the frontend sends Razorpay IDs/signature to `POST /api/payments/verify-payment`.
4. Only when verification succeeds does it create the POS order.

```jsx
const response = await paymentAPI.createOrder({ amount: total, currency: 'INR' });
// Open Razorpay with response.id, response.amount, response.key

const verification = await paymentAPI.verifyPayment({
  razorpay_order_id: response.razorpay_order_id,
  razorpay_payment_id: response.razorpay_payment_id,
  razorpay_signature: response.razorpay_signature,
});

if (verification?.verified) await createBackendOrder();
```

## Creating the order

```jsx
const orderDto = {
  customerId: selectedCustomer?.id || null,
  paymentType,
  status: 'COMPLETED',
  orderItems: cartItems.map(item => ({
    productId: item.product.id,
    quantity: item.quantity,
    price: item.price,
  })),
  totalAmount: total,
};

const createdOrder = await orderAPI.create(orderDto);
```

This calls:

```text
POST /api/orders
```

The backend should derive cashier and branch from the authenticated user rather than trusting client-supplied IDs. After success, the cart is cleared, `productsUpdated` is broadcast, and a success toast displays the order number and amount.

## Interview questions

### Does clicking Add to Cart call the backend?

No. It updates `CartContext` locally. The backend is called only during payment/order creation.

### How do category counts stay accurate?

They are recomputed from the products returned by the backend with `useMemo`.

### Why verify Razorpay before creating the order?

Without server-side signature verification, a modified client could claim that payment succeeded and create a paid order without paying.

### What happens after checkout?

The backend order is created, the cart is cleared, the product grid refetches stock through `productsUpdated`, and the cashier sees a success notification.

### What production improvements are needed?

Send and persist order notes, use decimal-safe money arithmetic, validate stock atomically on the backend, prevent duplicate submissions with an idempotency key, and fetch/search large catalogs server-side with pagination.
