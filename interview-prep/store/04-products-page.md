# Store Admin Products — Interview Guide

This note follows `src/pages/store/products/ProductsPage.jsx` and the product/category methods in `src/services/api.js`.

## 1. Product page responsibilities

The page loads products belonging to the current store, loads categories for form dropdowns, supports local search, refresh, create, view, edit, delete, and optional Cloudinary image upload.

## 2. Store and data loading

The page first resolves the store ID exactly like Branches: `GET /api/users/profile`, then fallback `GET /api/stores/admin`. Once `storeId` exists, this effect starts both requests:

```jsx
useEffect(() => {
  if (storeId) {
    fetchProducts()
    fetchCategories()
  }
}, [storeId])
```

The requests are:

```js
productAPI.getByStoreId(id) // GET /api/products/storeId/{id}
categoryAPI.getByStoreId(id) // GET /api/categories/store/{id}
```

Products are saved in `products`; categories are saved in `categories`. If there is no store, the page shows `NoStoreBanner` and prevents adding a product.

## 3. Search and refresh

Search is client-side. The complete API response stays in `products`; `filteredProducts` is derived by matching:

```jsx
product.name
product.sku
product.brand
product.category.name
product.description
```

Typing updates `searchQuery`, and the filtering effect runs whenever `searchQuery` or `products` changes. Refresh simply calls `fetchProducts()` again, which sends `GET /api/products/storeId/{storeId}`.

The API service also contains a server-search method:

```js
productAPI.search = (storeId, keyword) =>
  apiCall(`/products/search/${storeId}/${encodeURIComponent(keyword)}`)
```

The current page does not use that method; it filters the already-loaded list locally. For very large inventories, server-side search and pagination would be better.

## 4. Product table

Each row displays ID, image, name/description, category, selling price, quantity, and actions. The price uses `sellingPrice` and falls back to legacy `price`; stock uses `quantity` and falls back to `stockQuantity`.

```jsx
<TableCell>₹{product.sellingPrice?.toFixed(2) || product.price?.toFixed(2) || '0.00'}</TableCell>
<TableCell>{product.quantity || product.stockQuantity || 0}</TableCell>
```

The view action sets `selectedProduct`, edit sets `editingProduct`, and delete starts the confirmation flow.

## 5. Product image behavior

`getProductImage(product)` first uses the stored product image, then `imageUrl`, and finally a category-based placeholder URL. If an image fails to load, the table uses a generic fallback image through `onError`.

When a user selects a file, the page validates that it is an image and below 10 MB, then calls `uploadToCloudinary(file)`. The returned URL is stored in the form and sent as the product's `image` field.

```jsx
const imageUrl = await uploadToCloudinary(file)
setNewProduct({ ...newProduct, image: imageUrl })
setImagePreview(imageUrl)
```

The backend stores the URL, not the binary file.

## 6. Create product flow

Required validation includes product name, SKU, selling price greater than zero, non-negative MRP, non-negative quantity, and a selected category.

Categories can be existing categories, common category names, or a custom category. For a new category, the page first sends:

```js
await categoryAPI.create({
  name: newProduct.customCategory.trim(),
  storeId,
})
```

That is `POST /api/categories`. The returned category ID is then placed in the product DTO.

The final product payload is normalized and converted to correct numeric types:

```jsx
const productData = {
  name: newProduct.name.trim(),
  description: newProduct.description.trim(),
  sku: newProduct.sku.trim(),
  mrp: newProduct.mrp ? parseFloat(newProduct.mrp) : null,
  sellingPrice: parseFloat(newProduct.sellingPrice),
  brand: newProduct.brand.trim(),
  image: newProduct.image || '',
  quantity: parseInt(newProduct.quantity) || 0,
  storeId,
  categoryId: finalCategoryId,
}
await productAPI.create(productData)
```

`productAPI.create` sends `POST /api/products`. After success, the form resets, products and categories reload, and a toast confirms creation.

## 7. View product flow

The eye button does not make another request. It sets the already-loaded object into `selectedProduct`:

```jsx
const handleViewProduct = product => setSelectedProduct(product)
```

The dialog then displays image, name, description, selling price, MRP, category, stock, and SKU. This is efficient because the table already received the required DTO. A future version could call `GET /api/products/{id}` if the list response becomes intentionally lightweight.

## 8. Edit product flow

Clicking edit copies the selected product into `editProduct` form state, including converting numeric values to strings for inputs. Category logic is the same as creation: existing category IDs are reused, while a custom category is created first with `POST /api/categories`.

The update payload contains the edited values and store ID:

```jsx
await productAPI.update(editingProduct.id, productData)
```

This sends `PUT /api/products/{id}`. On success, the dialog closes, image state is cleared, and `fetchProducts()` reloads the persisted product.

## 9. Delete product flow

The page asks for confirmation before deletion:

```jsx
const ok = await confirm({
  title: 'Delete this product?',
  variant: 'destructive',
})
if (!ok) return

await productAPI.delete(id)
fetchProducts()
```

The request is `DELETE /api/products/{id}`. Reloading avoids leaving a deleted product in the table.

## 10. API summary

| Action | Service method | Request |
|---|---|---|
| Store profile | `userAPI.getProfile()` | `GET /api/users/profile` |
| Store fallback | `storeAPI.getByAdmin()` | `GET /api/stores/admin` |
| Load products | `productAPI.getByStoreId(id)` | `GET /api/products/storeId/{id}` |
| Search endpoint available | `productAPI.search(id, q)` | `GET /api/products/search/{id}/{q}` |
| Load categories | `categoryAPI.getByStoreId(id)` | `GET /api/categories/store/{id}` |
| Create category | `categoryAPI.create(dto)` | `POST /api/categories` |
| Create product | `productAPI.create(dto)` | `POST /api/products` |
| Update product | `productAPI.update(id, dto)` | `PUT /api/products/{id}` |
| Delete product | `productAPI.delete(id)` | `DELETE /api/products/{id}` |

## Example end-to-end flow

1. User opens `/store/products`.
2. Frontend resolves store ID.
3. Frontend requests products and categories for that store.
4. React renders the product table from backend DTOs.
5. User searches “coffee”; local filtering checks name, SKU, brand, category, and description.
6. User clicks Add Product and uploads an image; Cloudinary returns a URL.
7. If needed, frontend creates a category first.
8. Frontend sends `POST /api/products` with the category ID and image URL.
9. Frontend reloads products and categories.

## Interview questions and answers

### Why load categories separately?

Products reference a category. The category list is needed to render a selection control and send a valid `categoryId` when creating or editing.

### Why convert price and quantity before sending?

HTML input values are strings. `parseFloat` and `parseInt` ensure the JSON contains numeric values expected by the backend.

### Why upload images to Cloudinary instead of the Spring API?

The image service handles storage and delivery. The application database stores a lightweight URL rather than a large binary object.

### Why create a category before a product?

The product needs the persisted category ID as a relationship. The category must exist before the product DTO references it.

### Is viewing a product an API call?

Not currently. The selected product already exists in the list state. A dedicated detail endpoint would be appropriate if the list omitted large or sensitive fields.

### Is search server-side?

The page currently filters locally, although the API service exposes a server-search endpoint. Local filtering is simple for small lists; server search is better for large inventories.

### What security must the backend enforce?

The backend must verify that the authenticated Store Admin owns the store/product and that the user is allowed to create, update, or delete it. Frontend checks are only usability checks.

## Short interview answer

“The Products page resolves the current store, then loads products and categories through separate APIs. The complete product list remains in state, while search derives a filtered view. Create validates the form, optionally creates a category, uploads an image to Cloudinary, and sends `POST /api/products`. Edit sends `PUT /api/products/{id}` and delete sends `DELETE /api/products/{id}` after confirmation. After mutations I reload the data so the UI reflects the persisted backend state.”
