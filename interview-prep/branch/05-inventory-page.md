# Branch Manager Inventory Page — Interview Notes

## Page responsibility

Inventory shows the products stocked at the current branch. It loads branch inventory and store catalog products, supports local search, creates a stock record, adjusts an existing quantity, and derives stock-status summary cards from live API data.

## Initial loading flow

```jsx
useEffect(() => { fetchBranchId(); }, []);
useEffect(() => { if (branchId) fetchInventory(); }, [branchId]);
useEffect(() => { if (storeId) fetchProducts(); }, [storeId]);
```

`GET /api/users/profile` supplies `branchId` and `storeId`. Once the branch ID exists, inventory is loaded. Once the store ID exists, the product catalog is loaded for the Add Stock Item dropdown.

## API map

| Purpose | Client method | Endpoint |
|---|---|---|
| Find branch/store | `userAPI.getProfile()` | `GET /api/users/profile` |
| Load branch stock | `inventoryAPI.getByBranch(branchId)` | `GET /api/inventories/branch/{branchId}` |
| Load catalog products | `productAPI.getByStoreId(storeId)` | `GET /api/products/storeId/{storeId}` |
| Add stock record | `inventoryAPI.create(dto)` | `POST /api/inventories` |
| Adjust stock | `inventoryAPI.update(id, dto)` | `PUT /api/inventories/{id}` |

The Refresh button calls `fetchInventory()` and repeats the branch inventory GET request.

## Adding an inventory item

The form selects a catalog product and enters a positive quantity. The frontend validates both fields before sending:

```jsx
const quantity = parseInt(newInventory.quantity);
if (!newInventory.productId || Number.isNaN(quantity) || quantity <= 0) {
  toast.error('Choose a product and enter a positive quantity');
  return;
}

await inventoryAPI.create({
  branchId: branchId || 1,
  productId: parseInt(newInventory.productId),
  quantity,
});
```

This is `POST /api/inventories`. After success, the dialog closes, the form resets, and `fetchInventory()` loads the authoritative backend response. That refresh keeps the table and summary cards synchronized.

## Adjusting stock

Clicking Adjust Stock stores the selected inventory row and opens the edit dialog. The user enters the new absolute quantity:

```jsx
await inventoryAPI.update(selectedItem.id, {
  ...selectedItem,
  quantity: parseInt(editQuantity),
});
```

This is `PUT /api/inventories/{inventoryId}`. The backend persists the new quantity. The page closes the dialog and calls `fetchInventory()` again, so the updated row, status badge, and summary counts come from the server rather than manually mutating one row locally.

The current operation is an absolute update: entering `12` means “stock is now 12.” A production inventory system may prefer an adjustment DTO such as `{ change: +5, reason: 'restock' }` so the backend can maintain an audit trail.

## Search behavior

Search is client-side over the loaded inventory array and runs whenever the query or inventory changes:

```jsx
const query = searchQuery.toLowerCase();
const result = inventory.filter(item => {
  const name = item.product?.name?.toLowerCase() || '';
  const sku = item.product?.sku?.toLowerCase() || '';
  const category = item.product?.category?.name?.toLowerCase() || '';
  return name.includes(query) || sku.includes(query) || category.includes(query);
});
```

Typing a product name, SKU, or category filters the visible table without another backend call. For thousands of products, use a debounced endpoint with `branchId`, `search`, `page`, and `size` query parameters.

## Stock statuses

The status is derived dynamically from each returned quantity:

```jsx
const getStockStatus = quantity => {
  if (quantity === 0) return 'Out of Stock';
  if (quantity < 10) return 'Low Stock';
  return 'In Stock';
};
```

The threshold is currently 10 units. It is a frontend display rule; a production system should store a reorder level per product or category and return it from the backend.

## Summary cards

```jsx
const summary = {
  totalItems: inventory.length,
  inStock: inventory.filter(i => (i.quantity || 0) >= 10).length,
  lowStock: inventory.filter(i => (i.quantity || 0) > 0 && (i.quantity || 0) < 10).length,
  outOfStock: inventory.filter(i => (i.quantity || 0) === 0).length,
};
```

These values are not static. They are recalculated whenever `inventory` changes, which happens after initial load, refresh, add, or adjustment.

## Table data

Each row comes from an inventory DTO and reads nested product data for name, SKU, category, and selling price. The row also shows quantity, derived status, and the Adjust Stock action.

## Interview questions

### Which API is called when adding stock?

`POST /api/inventories` with branch ID, product ID, and quantity.

### Which API is called when adjusting stock?

`PUT /api/inventories/{id}` with the updated inventory DTO.

### How do the totals update after an adjustment?

The page fetches inventory again after the mutation. React recalculates summary values from the new array.

### Is search dynamic backend search?

Currently no; it is local filtering over loaded records. Backend search/pagination is preferable for large inventories.

### What should be improved for production?

Use configurable reorder thresholds, prevent duplicate product/branch inventory rows, validate branch ownership server-side, use stock-adjustment events with reasons, maintain an audit history, and use optimistic locking to prevent two managers overwriting each other.
