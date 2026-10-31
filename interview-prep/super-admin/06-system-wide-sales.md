# System-wide Sales

## Data flow

The page loads all stores, their branches, orders, and refunds. It then calculates the dashboard values in the frontend:

```jsx
const stores = await storeAPI.getAll()
const branches = await branchAPI.getByStoreId(store.id)
const orders = await orderAPI.getByBranch(branch.id)
const refunds = await refundAPI.getByBranch(branch.id)
```

This produces total sales, today's order count, refunds, net sales, seven-day sales, payment distribution, store totals, and the store-admin/branch breakdown.

## Charts

The existing line and bar charts are kept because they provide useful axes, tooltips, and legends. Their data is built from the API response; no sales values are hard-coded.

## Filters

The sales table has three client-side filters:

- Search by customer, cashier, or store name
- Filter by order status
- Filter by store

Filtering changes `filteredOrders`; it does not request the backend again for every keystroke.

## CSV export

The export button converts the currently filtered orders into rows, creates a CSV blob, and starts a browser download. This means the exported file matches the filters currently visible on screen.

## Interview explanation

“System-wide Sales is an aggregation page. The API supplies raw orders and refunds, and the frontend derives statistics and chart datasets from them. Search and dropdown filters work on the loaded order list, while export serializes that same filtered list into CSV.”
