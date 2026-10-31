# Store Admin Categories — Interview Guide

This note follows `src/pages/store/categories/CategoriesPage.jsx` and the category/product API methods in `src/services/api.js`.

## 1. Responsibility

The Categories page manages categories owned by the current store. It loads categories, calculates how many products belong to each category, supports search and refresh, and allows create, edit, and delete operations.

## 2. State

```jsx
const [categories, setCategories] = useState([])
const [filteredCategories, setFilteredCategories] = useState([])
const [productCounts, setProductCounts] = useState({})
const [storeId, setStoreId] = useState(null)
```

`categories` is the backend response. `filteredCategories` is the search result. `productCounts` is a small lookup object such as `{ 4: 12, 5: 3 }`, where the key is a category ID and the value is its product count.

## 3. Resolving the current store

The page first calls `GET /api/users/profile` through `userAPI.getProfile()`. If no `storeId` is present, it falls back to `GET /api/stores/admin` through `storeAPI.getByAdmin()` and uses the first owned store.

Once `storeId` exists, two loads begin:

```jsx
useEffect(() => {
  if (storeId) {
    fetchCategories()
    fetchProductCounts()
  }
}, [storeId])
```

## 4. Loading categories

```js
categoryAPI.getByStoreId = (storeId) =>
  apiCall(`/categories/store/${storeId}`)
```

This sends `GET /api/categories/store/{storeId}`. The response is stored in `categories` and rendered in the table.

## 5. Calculating product counts

There is no separate count request in the current frontend. The page loads the store's products and groups them locally:

```jsx
const products = await productAPI.getByStoreId(storeId)
const counts = {}

products.forEach(product => {
  if (product.category?.id) {
    counts[product.category.id] =
      (counts[product.category.id] || 0) + 1
  }
})

setProductCounts(counts)
```

That request is `GET /api/products/storeId/{storeId}`. If a product has no category, it is not counted under a category. The table reads `productCounts[category.id] || 0`.

## 6. Search and refresh

Search is client-side and currently checks only the category name:

```jsx
const query = searchQuery.toLowerCase()
const filtered = categories.filter(category =>
  category.name?.toLowerCase().includes(query)
)
```

The original `categories` array remains unchanged, so clearing the query restores all rows. Refresh calls `fetchCategories()` again. Product counts are not explicitly reloaded by the Refresh button in the current code; a production improvement would refresh both categories and counts together.

## 7. Create category

The form requires a non-empty name, checks duplicates case-insensitively against the loaded list, and builds this DTO:

```jsx
const categoryData = {
  name: newCategory.name.trim(),
  description: (newCategory.description || '').trim(),
  storeId,
}
await categoryAPI.create(categoryData)
```

The API sends `POST /api/categories`. After success, the dialog and form reset, categories reload, product counts reload, and a toast is displayed.

The duplicate check is a user-friendly optimization; the backend must still enforce a unique category rule because another request could create the same name concurrently.

## 8. Edit category

Clicking Edit copies the row into controlled edit state:

```jsx
setSelectedCategory(category)
setEditCategory({
  name: category.name || '',
  description: category.description || '',
})
setIsEditDialogOpen(true)
```

Save validates the name and ID, then sends:

```js
categoryAPI.update(selectedCategory.id, {
  name: editCategory.name,
  description: editCategory.description || '',
})
```

This is `PUT /api/categories/{id}`. The list is reloaded after success.

## 9. Delete category

Deletion requires the shared confirmation dialog. The message explains the domain rule: products are not deleted, but lose their category association.

```jsx
const ok = await confirm({
  title: 'Delete this category?',
  description: 'Products in this category will not be deleted, but they will lose their category association.',
  variant: 'destructive',
})
if (!ok) return

await categoryAPI.delete(id)
await fetchCategories()
await fetchProductCounts()
```

The request is `DELETE /api/categories/{id}`.

## API summary

| Purpose | Service | Endpoint |
|---|---|---|
| Identify user/store | `userAPI.getProfile()` | `GET /api/users/profile` |
| Store fallback | `storeAPI.getByAdmin()` | `GET /api/stores/admin` |
| Load categories | `categoryAPI.getByStoreId(id)` | `GET /api/categories/store/{id}` |
| Load products for counts | `productAPI.getByStoreId(id)` | `GET /api/products/storeId/{id}` |
| Create | `categoryAPI.create(dto)` | `POST /api/categories` |
| Update | `categoryAPI.update(id, dto)` | `PUT /api/categories/{id}` |
| Delete | `categoryAPI.delete(id)` | `DELETE /api/categories/{id}` |

## Example behind the scenes

Suppose the backend returns category `Coffee` with ID `4`, and three products have `category.id = 4`. The frontend creates `{ 4: 3 }`, and the table displays `3` in the Products column. If the user searches `cof`, only the Coffee row is rendered; no new API request is needed.

## Interview questions and answers

### Why load products on the Categories page?

The current UI displays a product count per category, so the frontend derives counts from the product response. A production API could return `productCount` directly or expose an aggregate endpoint.

### What happens to products when a category is deleted?

According to the UI confirmation message, products remain but their category relationship is cleared. The backend should implement that relationship behavior transactionally.

### Is the duplicate-name check sufficient for correctness?

No. It improves UX but is race-prone. The database/backend must enforce a store-scoped unique constraint and return a conflict if two requests race.

### Why use a lookup object for counts?

It gives constant-time lookup while rendering each row: `productCounts[category.id]`. An array scan for every row would be less efficient.

### Is category search server-side?

No. It filters the loaded list locally. Server-side search or pagination would be better for a very large category set.

### Why reload after mutations?

Reloading makes the backend the source of truth and ensures the table reflects persisted names, IDs, relationship changes, and product counts.

### What security must the backend enforce?

The JWT identifies the user, but the backend must verify that the category belongs to the authenticated Store Admin's store before allowing read, update, or delete operations.

## Short interview answer

“The Categories page resolves the current store, loads categories with `GET /api/categories/store/{storeId}`, and loads products to derive a category-to-count map. Search filters category names locally. Create sends `POST /api/categories`, edit sends `PUT /api/categories/{id}`, and delete sends `DELETE /api/categories/{id}` after confirmation. After mutations I reload categories and counts so the UI reflects persisted backend data.”
