# KONECTA Courier Orders Backend Handoff

**Date:** 2026-09-08
**Purpose:** Copy this file to the backend team. It identifies exactly which service owns each change.

## Ownership Summary

| Service | Must implement | Must not implement |
|---|---|---|
| `KONECTA-COURIER-SERVICE` | Courier order endpoints, assignment, courier QR, courier-safe responses, courier authorization | Product prices, stock, payment calculations |
| `KONECTA-ORDERS-SERVICE` | Order persistence, order status, courier assignment fields, transactions/locking, order ownership rules | Courier profile or shop-association approval |
| `KONECTA-STORES-AND-STOCK-SERVICE` | No new endpoint required for this slice | Do not implement courier assignment logic |
| `KONECTA-SECURITY-SERVICE` | No new endpoint required; existing JWT roles/claims are used | Do not implement order assignment |

The recommended implementation split is:

1. **Courier Service** owns the courier-facing API and orchestrates authorization.
2. **Orders Service** owns the order row and performs all atomic updates.
3. **Courier Service** calls Orders Service server-to-server.
4. Stores-and-Stock remains unchanged.

## 1. KONECTA-COURIER-SERVICE

Implement these endpoints in the Courier Service:

### Courier order discovery

```http
GET /api/v1/couriers/me/orders/available
GET /api/v1/couriers/me/orders/assigned
```

`available` must return only orders satisfying all conditions:

```text
status = READY_FOR_PICKUP
deliveryMode = DELIVERY
courierId IS NULL
courier association for order.shopId = ACTIVE
```

Pickup orders must never appear. Orders from shops without an `ACTIVE` courier association must never appear.

Response summary:

```json
[
  {
    "orderId": "uuid",
    "storeId": "uuid",
    "storeName": "Supermercado Baoba",
    "storeLogoUrl": "https://...",
    "status": "READY_FOR_PICKUP",
    "deliveryMode": "DELIVERY",
    "itemCount": 3,
    "total": 850.00,
    "paymentMethod": "CASH",
    "createdAt": "2026-09-08T10:00:00Z",
    "assignedCourierId": null
  }
]
```

`assigned` returns the authenticated courier's assigned orders, at least statuses `COURIER_ASSIGNED` and `IN_TRANSIT`.

### Courier detail

```http
GET /api/v1/couriers/me/orders/{orderId}
```

Allow access when the order is available to one of the courier's active shops or assigned to that courier.

Return a courier-safe detail:

```json
{
  "orderId": "uuid",
  "status": "COURIER_ASSIGNED",
  "storeId": "uuid",
  "storeName": "Supermercado Baoba",
  "customerName": "Cliente",
  "courierId": "uuid",
  "courierName": "Joao Entregador",
  "courierQrCode": "opaque-token",
  "contactPhone": "+258841234567",
  "deliveryAddress": {},
  "paymentMethod": "CASH",
  "total": 850.00,
  "items": [
    { "productId": "uuid", "name": "Produto", "quantity": 2 }
  ]
}
```

Do not return `unitPrice`, `lineTotal`, `subtotal`, or `deliveryFee` to the courier.

### Courier self-assignment

```http
POST /api/v1/couriers/me/orders/{orderId}/assignment
```

Validate that:

- The JWT user is a courier.
- The courier has an `ACTIVE` association with the order shop.
- The order is `READY_FOR_PICKUP`.
- The order is `DELIVERY`.
- The order has no assigned courier.

On success, request the Orders Service to atomically set:

```text
courierId = authenticated user id
status = COURIER_ASSIGNED
courierQrCode = new opaque token
```

Return the courier-safe detail.

If another courier already won the assignment race:

```http
409 CONFLICT
```

```json
{
  "code": "ORDER_ALREADY_ASSIGNED",
  "message": "Esta encomenda ja foi atribuida a outro entregador.",
  "details": []
}
```

### Cancel assignment

```http
DELETE /api/v1/couriers/me/orders/{orderId}/assignment
```

Allow only when the authenticated courier owns the assignment and status is `COURIER_ASSIGNED`.

The Orders Service must atomically set:

```text
courierId = null
courierQrCode = null
status = READY_FOR_PICKUP
```

The order must become available to other eligible couriers again. Reject cancellation after `IN_TRANSIT`.

### Courier status changes

```http
PATCH /api/v1/couriers/me/orders/{orderId}/status
```

Request:

```json
{ "status": "IN_TRANSIT" }
```

or:

```json
{ "status": "DELIVERED" }
```

Allowed transitions:

```text
COURIER_ASSIGNED -> IN_TRANSIT
IN_TRANSIT -> DELIVERED
```

Only the assigned courier may perform these operations. The Orders Service must validate the transition.

### Courier scans customer QR

```http
POST /api/v1/couriers/me/orders/scan-customer-qr
```

Request:

```json
{ "qrCode": "customer-order-qr-token" }
```

Validate that the courier owns the assignment, status is `IN_TRANSIT`, and the QR belongs to the order. Return the courier-safe detail. Do not mark the order delivered automatically.

## 2. KONECTA-ORDERS-SERVICE

The Orders Service owns the order database and must implement the atomic operations called by the Courier Service.

The internal endpoint names may differ, but it must support these operations:

### Atomic self-assignment

```text
assignOrderToCourier(orderId, courierId, courierQrCode)
```

Required checks in one transaction:

```text
order.status = READY_FOR_PICKUP
order.deliveryMode = DELIVERY
order.courierId IS NULL
```

Then set `courierId`, `status = COURIER_ASSIGNED`, and the courier QR token.

Use a database row lock or an atomic conditional update. Do not perform an unlocked read followed by a later update.

Conceptual SQL:

```sql
BEGIN;

SELECT * FROM orders WHERE id = :orderId FOR UPDATE;

IF status != 'READY_FOR_PICKUP' OR courier_id IS NOT NULL THEN
  ROLLBACK;
  RETURN ORDER_ALREADY_ASSIGNED;
END IF;

UPDATE orders
SET courier_id = :courierId,
    status = 'COURIER_ASSIGNED',
    courier_qr_code = :newQrToken,
    status_updated_at = CURRENT_TIMESTAMP
WHERE id = :orderId;

COMMIT;
```

### Atomic cancellation

```text
cancelCourierAssignment(orderId, courierId)
```

Only the assigned courier may cancel, and only from `COURIER_ASSIGNED`. Set the courier and QR fields to null and status back to `READY_FOR_PICKUP`.

### Status transition

```text
changeCourierOrderStatus(orderId, courierId, requestedStatus)
```

Allow only:

```text
COURIER_ASSIGNED -> IN_TRANSIT
IN_TRANSIT -> DELIVERED
```

Reject all other transitions with `INVALID_TRANSITION`.

### QR state

The order record must support a separate courier QR from the customer order QR:

```text
customerQrCode   // existing customer QR
courierQrCode    // new courier assignment QR
```

Generate a new courier QR when an order is assigned. Consume or clear it when the merchant scans it and the order changes to `IN_TRANSIT`.

## 3. KONECTA-COURIER-SERVICE: merchant endpoints

These endpoints are exposed by Courier Service because courier association and courier authorization belong there.

Merchant authorization:

```text
MERCHANT
MERCHANT_STAFF with matching shopId claim
ADMIN
```

### Active couriers for assignment

```http
GET /api/v1/merchant/shops/{shopId}/couriers/active
```

Return only active associations:

```json
[
  {
    "courierId": "uuid",
    "courierName": "Joao Entregador",
    "phone": "+258841234567",
    "status": "ACTIVE"
  }
]
```

### Manual assignment by merchant/staff

```http
PATCH /api/v1/merchant/shops/{shopId}/orders/{orderId}/courier
```

Request:

```json
{ "courierId": "courier-uuid" }
```

Validate caller authorization, order ownership by shop, active courier association, `DELIVERY` mode, and a valid status (`READY_FOR_PICKUP`, or `COURIER_ASSIGNED` if reassignment before pickup is supported). Ask Orders Service to perform the atomic update and generate a new courier QR.

### Merchant scans courier QR

```http
POST /api/v1/merchant/shops/{shopId}/orders/{orderId}/scan-courier-qr
```

Request:

```json
{ "qrCode": "opaque-courier-token" }
```

Validate shop authorization, order ownership, assigned courier ownership of the QR, current status `COURIER_ASSIGNED`, and that the QR has not been consumed. Ask Orders Service to change status to `IN_TRANSIT` and consume/clear the courier QR.

## 4. KONECTA-STORES-AND-STOCK-SERVICE

No new endpoint is required for this courier-order slice.

Existing store association and store data are sufficient. Do not place courier assignment or order status logic in this service.

## 5. KONECTA-SECURITY-SERVICE

No new endpoint is required.

Use the existing JWT for:

- User id (`sub`)
- Role (`COURIER`, `MERCHANT`, `MERCHANT_STAFF`, `ADMIN`)
- `shopId` claim for merchant staff authorization

## 6. Shared authorization rules

Every endpoint requires a valid Bearer JWT.

Courier endpoints must validate the courier role and active shop association where applicable. Assigned order detail and status changes must validate assignment ownership.

Merchant endpoints must validate `MERCHANT`, matching `MERCHANT_STAFF.shopId`, or `ADMIN` on every request.

Never trust client-supplied courier IDs, shop IDs, order IDs, totals, or QR ownership.

## 7. Standard errors

Use the existing error shape:

```json
{
  "code": "INVALID_TRANSITION",
  "message": "A encomenda nao pode passar para este estado.",
  "details": [],
  "timestamp": "2026-09-08T12:00:00Z"
}
```

Recommended codes:

```text
ORDER_NOT_FOUND
ORDER_ALREADY_ASSIGNED
COURIER_NOT_ASSOCIATED
COURIER_NOT_ACTIVE
COURIER_ASSIGNMENT_NOT_FOUND
INVALID_TRANSITION
INVALID_COURIER_QR
INVALID_CUSTOMER_QR
SHOP_ACCESS_DENIED
UNAUTHENTICATED
```

## 8. Frontend routes depending on this contract

```text
/courier
/courier/orders/{orderId}
/merchant/shops/{shopId}/orders/{orderId}
```

The frontend BFF proxies are already prepared for these contracts. The backend work is the service implementation, data ownership, authorization, QR validation, and transactional state changes described above.
