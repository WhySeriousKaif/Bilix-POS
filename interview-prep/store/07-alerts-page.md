# Store Admin Alerts — Interview Guide

This note follows `src/pages/store/alerts/AlertsPage.jsx` and `src/hooks/useStoreAlerts.js`.

## 1. Design

Alerts are computed from existing business data; there is no separate notification table for these four alerts. The page resolves the current store and passes its ID to a reusable hook:

```jsx
const {
  inactiveCashiers,
  lowStockProducts,
  noSaleBranches,
  refundSpikes,
  loading,
  refetch: fetchAlerts,
} = useStoreAlerts(storeId)
```

The same hook can be shared by the notification bell in the Store Admin layout, keeping counts consistent between the page and header.

## 2. Store resolution

The page calls `GET /api/users/profile` first. If the profile has no `storeId`, it falls back to `GET /api/stores/admin` and uses the first store ID. Once set, the hook fetches alerts.

## 3. Base API requests

The hook starts these independent requests with `Promise.all`:

```jsx
const [allUsers, allProducts, allBranches, allRefunds] = await Promise.all([
  userAPI.getAll(),
  productAPI.getByStoreId(storeId),
  branchAPI.getByStoreId(storeId),
  // refunds from every branch are flattened
])
```

The mapped endpoints are:

| Data | Endpoint |
|---|---|
| Users | `GET /api/users/all` |
| Products | `GET /api/products/storeId/{storeId}` |
| Branches | `GET /api/branches/store/{storeId}` |
| Branch refunds | `GET /api/refunds/branch/{branchId}` |
| Today’s branch orders | `GET /api/orders/today/branch/{branchId}` |

Each optional request has a fallback `catch(() => [])`, so one failed data source does not destroy every alert category.

## 4. Inactive cashiers

First, users are restricted to the current store:

```jsx
const storeUsers = allUsers.filter(user =>
  user.storeId === storeId || user.store?.id === storeId
)
```

Cashier roles include both `ROLE_BRANCH_CASHIER` and `ROLE_CASHIER`. A cashier is inactive when they have never logged in or their last login is older than seven days:

```jsx
if (!cashier.lastLoginAt) return true
return new Date(cashier.lastLoginAt) < sevenDaysAgo
```

The result is mapped to a display object, sorted with never-logged-in users first, and limited to ten rows.

## 5. Low-stock products

Products with `quantity < 10` are treated as low stock:

```jsx
const lowStock = allProducts
  .filter(product => (product.quantity || 0) < 10)
  .map(product => ({
    id: product.id,
    name: product.name || 'N/A',
    category: product.category?.name || 'Uncategorized',
    price: product.sellingPrice || product.price || product.mrp || 0,
    quantity: product.quantity || 0,
  }))
  .sort((a, b) => a.quantity - b.quantity)
  .slice(0, 10)
```

The lowest quantities appear first. The page displays the product image, name, category, price, and current units.

## 6. No-sale branches

For every store branch, the hook requests today’s orders:

```jsx
const todayOrders = await orderAPI.getTodayByBranch(branch.id)
if (!todayOrders || todayOrders.length === 0) {
  branchesWithNoSales.push(branch)
}
```

Branches with no orders are limited to ten. If the request fails, the current implementation conservatively includes the branch as an alert; production systems may distinguish “no data” from “zero sales” to avoid false positives.

## 7. Refund spikes

Refunds from every branch are flattened, restricted to the last 30 days, and flagged when the amount is at least ₹1,000:

```jsx
const recentRefunds = allRefunds
  .filter(refund => new Date(refund.createdAt) >= thirtyDaysAgo)
  .map(refund => ({
    id: refund.id,
    cashierName: refund.cashier?.fullName || 'Unknown',
    amount: refund.amount || 0,
    reason: refund.reason || 'No reason provided',
  }))
  .filter(refund => refund.amount >= 1000)
  .sort((a, b) => b.amount - a.amount)
  .slice(0, 10)
```

## 8. Refresh and polling

The page Refresh button calls the hook’s `refetch` function, running the complete calculation again. The hook also supports optional polling through `pollIntervalMs`:

```jsx
useEffect(() => {
  if (!pollIntervalMs) return
  const interval = setInterval(fetchAlerts, pollIntervalMs)
  return () => clearInterval(interval)
}, [fetchAlerts, pollIntervalMs])
```

The current Alerts page does not pass a polling interval, so it refreshes on mount and manually when the user clicks Refresh.

## 9. UI rendering

Each alert category is a card. If its array is empty, the page displays a helpful empty state such as “All products are well stocked.” Otherwise it renders a table from the computed display objects. The page itself contains no alert business rules; those belong in the hook.

## Interview questions and answers

### Is there a notification API?

Not for these alerts. The frontend derives them from users, products, branches, orders, and refunds. A production system could move these calculations to backend reporting endpoints or an event-driven alert service.

### Why put the logic in a hook?

`useStoreAlerts` separates data calculation from presentation and lets the page and header notification bell share exactly the same rules.

### Why use `Promise.all`?

Users, products, branches, and refunds are independent sources, so parallel requests reduce total waiting time.

### What does “inactive cashier” mean here?

No login ever or a last login more than seven days ago. This is a business rule, not a Spring Security role check.

### Why limit each list to ten?

The dashboard should remain readable. Pagination or a “view all” route would be better for a large alert volume.

### What is a possible correctness issue?

Treating a failed “today’s orders” request as no sales can create a false alert. A production implementation should return an error status or an `unknown` state instead.

### How would you scale this?

Move aggregations to backend queries, add indexes on `store_id`, `created_at`, and `quantity`, cache short-lived alert summaries, and use scheduled/event-driven processing rather than downloading all users and products into the browser.

### Does the frontend enforce security?

No. The backend must authorize store ownership and role access. The frontend only controls display and usability.

## Short interview answer

“The Alerts page resolves the current store and passes its ID to a reusable `useStoreAlerts` hook. The hook loads users, products, branches, orders, and refunds, then derives four alert lists: cashiers inactive for seven days, products with quantity below ten, branches with no orders today, and refunds of at least ₹1,000 in the last 30 days. The page renders those lists in cards and tables. Refresh reruns the hook, and optional polling can keep the data current.”
