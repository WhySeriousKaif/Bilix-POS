# Super Admin Dashboard

## Dashboard data flow

The dashboard loads data from the backend when it mounts:

```jsx
const allStores = await storeAPI.getAll()
const branches = await branchAPI.getByStoreId(store.id)
const orders = await orderAPI.getByBranch(branch.id)
const refunds = await refundAPI.getByBranch(branch.id)
```

The frontend combines these responses to calculate total stores, pending stores, sales, refunds, monthly totals, store totals, and top products.

## KPI cards

Each card receives data as props:

```jsx
<StatCard label="Total Stores" value={stats.totalStores} icon={Store} />
```

`StatCard` is one reusable local component. The value is calculated from API data; it is not hard-coded.

## Simple sales chart

The sales chart uses normal `div` elements. The largest value becomes 100%, and every bar gets a proportional height:

```jsx
const height = (value / maxValue) * 92
<div style={{ height: `${height}%` }} />
```

Blue bars represent sales and light-blue bars represent refunds. This removes the chart library and makes the graph easy to explain.

## Donut chart

The store-status chart uses CSS `conic-gradient`. Each slice is calculated as a percentage of the total:

```jsx
background: conic-gradient(#2563EB 0% 50%, #F59E0B 50% 75%, #EF4444 75% 100%)
```

The inner circle creates the donut appearance. The legend is rendered from the same data array.

## Top products

Order items are grouped by product name. Quantity is added to `qty`, and `price * quantity` is added to revenue. The result is sorted by quantity and limited to five products.

## Interview explanation

“The dashboard is a read-only aggregation screen. It calls store, branch, order, and refund APIs, combines the responses in the frontend, and passes the calculated values to small reusable components. I used simple CSS bars and a conic-gradient donut instead of a chart package so the implementation remains transparent and easy to maintain.”
