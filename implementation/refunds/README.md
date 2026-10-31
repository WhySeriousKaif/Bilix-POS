# Production partial-refund implementation

## What a production flow does

1. The cashier selects an order and the backend loads the order items.
2. The cashier selects a quantity for one or more items, a reason, and a refund method.
3. The UI sends the selected item IDs and quantities to the backend.
4. The backend validates ownership, permissions, quantities, and the remaining refundable quantity inside one database transaction.
5. The backend saves a `Refund` and its `RefundItem` rows, updates inventory, and marks the order `PARTIALLY_REFUNDED` or `REFUNDED`.
6. The API returns a receipt DTO. The UI shows a loader, success dialog, and downloadable receipt.
7. Future order/refund queries calculate remaining quantities from persisted refund items, so a refresh cannot make an item refundable again.

## Backend files to write

These files belong in `/Users/mdkaif/molla-pos-system/backend`.

### 1. `model/RefundItem.java`

```java
@Entity
@Getter @Setter @NoArgsConstructor
public class RefundItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Refund refund;

    @ManyToOne(optional = false)
    private OrderItem orderItem;

    private int quantity;
    private double amount;
}
```

Add this relationship to `Refund`:

```java
@OneToMany(mappedBy = "refund", cascade = CascadeType.ALL, orphanRemoval = true)
private List<RefundItem> items = new ArrayList<>();
```

### 2. `payload/dto/RefundItemRequest.java`

```java
public record RefundItemRequest(Long orderItemId, int quantity) {}
```

### 3. Update `payload/dto/RefundDto.java`

```java
private List<RefundItemRequest> items;
```

Use a separate response DTO in production so internal entities are never returned directly:

```java
public record RefundReceiptDto(
        Long refundId, Long orderId, double amount,
        String reason, PaymentType paymentType,
        LocalDateTime createdAt,
        List<RefundItemReceiptDto> items) {}

public record RefundItemReceiptDto(
        Long orderItemId, Long productId,
        String productName, int quantity, double amount) {}
```

### 4. `repository/RefundItemRepository.java`

```java
public interface RefundItemRepository extends JpaRepository<RefundItem, Long> {
    @Query("select coalesce(sum(i.quantity), 0) from RefundItem i "
         + "where i.orderItem.id = :orderItemId")
    int refundedQuantity(@Param("orderItemId") Long orderItemId);
}
```

### 5. Service transaction

Add this operation to `RefundService` and implement it in `RefundServiceImpl`:

```java
@Transactional
public RefundReceiptDto createPartialRefund(Long orderId, RefundDto request) {
    User cashier = userService.getCurrentUser();
    Order order = orderRepository.findById(orderId)
        .orElseThrow(() -> new NotFoundException("Order not found"));
    accessControlService.requireBranchAccess(cashier, order.getBranch().getId());

    if (request.getItems() == null || request.getItems().isEmpty()) {
        throw new BadRequestException("Select at least one item");
    }

    Refund refund = Refund.builder()
        .order(order).branch(order.getBranch()).cashier(cashier)
        .reason(request.getReason()).paymentType(request.getPaymentType())
        .build();

    double total = 0;
    for (RefundItemRequest line : request.getItems()) {
        OrderItem item = orderItemRepository.findById(line.orderItemId())
            .orElseThrow(() -> new NotFoundException("Order item not found"));
        if (!item.getOrder().getId().equals(orderId)) {
            throw new BadRequestException("Item does not belong to this order");
        }
        int alreadyRefunded = refundItemRepository.refundedQuantity(item.getId());
        int remaining = item.getQuantity() - alreadyRefunded;
        if (line.quantity() < 1 || line.quantity() > remaining) {
            throw new BadRequestException("Refund quantity exceeds remaining quantity");
        }
        double amount = item.getPrice() * line.quantity();
        refund.getItems().add(new RefundItem(null, refund, item, line.quantity(), amount));
        total += amount;
    }

    refund.setAmount(total);
    Refund saved = refundRepository.save(refund);

    boolean allReturned = order.getOrderItems().stream().allMatch(item ->
        item.getQuantity() <= refundItemRepository.refundedQuantity(item.getId()));
    order.setStatus(allReturned ? OrderStatus.REFUNDED : OrderStatus.PARTIALLY_REFUNDED);
    orderRepository.save(order);
    return refundMapper.toReceipt(saved);
}
```

The real implementation should use pessimistic locking or another concurrency strategy around the order-item quantity check so two cashiers cannot refund the same unit simultaneously.

### 6. Controller endpoint

```java
@PostMapping("/orders/{orderId}/partial")
public ResponseEntity<RefundReceiptDto> refundItems(
        @PathVariable Long orderId,
        @Valid @RequestBody RefundDto request) {
    return ResponseEntity.status(HttpStatus.CREATED)
        .body(refundService.createPartialRefund(orderId, request));
}
```

### 7. Backend tests

Write integration tests for:

- one item from a two-item order;
- the remaining item on a second request;
- rejecting a third refund for the same quantity;
- rejecting an item from another order;
- marking the order `PARTIALLY_REFUNDED`, then `REFUNDED`;
- inventory restoration and shift-summary totals;
- unauthorized cashier and concurrent refund attempts.

## Frontend files to write

### API helper in `src/services/api.js`

```js
createPartialRefund: (orderId, payload) => apiCall(`/refunds/orders/${orderId}/partial`, {
  method: 'POST',
  body: JSON.stringify(payload),
}),
```

### Return component behavior

The existing `ReturnItemSection.jsx` should send:

```js
{
  reason,
  paymentType: refundMethod,
  items: selectedItems.map(item => ({
    orderItemId: item.orderItemId,
    quantity: item.returnQty,
  }))
}
```

It now displays a spinner while processing and prevents duplicate clicks. The backend must persist the `items` field before the UI can reliably hide already-refunded products after a refresh.

### Receipt

`ReturnReceiveDialog.jsx` now creates a PDF refund receipt. A production receipt should use the returned receipt DTO, not values recalculated in the browser.

## Production limitations to discuss in an interview

- A refund must be transactional: refund record, inventory, order status, and shift totals must succeed or roll back together.
- Never trust branch, cashier, amount, or item price from the browser; derive them from authenticated data and database prices.
- Validate authorization and prevent cross-branch refunds.
- Store item-level refund rows for partial refunds and audit history.
- Use idempotency keys so a double-click or network retry cannot create two refunds.
- Lock inventory/order rows during quantity validation.
- Return a stable receipt ID and audit timestamp.
- Do not physically delete orders after refund; retain them with `REFUNDED` status.
- Paginate refund history and order history at the database layer.
- Protect receipt endpoints and log refund events without exposing payment secrets.
