# Courier Orders Frontend Integration Report

**Service:** `KONECTA-COURIER-SERVICE`  
**Base URL:** the courier service URL, normally `http://localhost:8096`  
**API prefix:** `/api/v1`  
**Date:** 2026-09-08

This document is the frontend integration guide for the courier order and merchant courier-assignment APIs implemented in this service.

## Important Rules

- Send `Authorization: Bearer <JWT>` on every request.
- Use UUID values as JSON strings.
- Dates are ISO-8601 timestamps, for example `2026-09-08T10:00:00Z`.
- Monetary values are decimal numbers, not formatted strings.
- The frontend must use the public Courier Service routes below. The paths used by the Courier Service when calling Orders Service are internal and must not be called directly by the browser.
- A merchant-facing `courierId` is this service's `courier_profiles.id`.
- A courier-facing order response contains no item prices, line totals, subtotal, or delivery fee.

## Roles

| Operation | Required role |
|---|---|
| Courier order list/detail/assignment/status/QR scan | `COURIER` |
| Merchant courier list and approval | `MERCHANT`, `MERCHANT_STAFF`, or `ADMIN` |
| Merchant order assignment and courier QR scan | `MERCHANT`, `MERCHANT_STAFF`, or `ADMIN` |

`MERCHANT` and `ADMIN` access is still checked against the requested shop by the backend. `MERCHANT_STAFF` must have access to the requested `shopId`.

## Courier Order Endpoints

### List available orders

```http
GET /api/v1/couriers/me/orders/available
```

Returns an array. The backend only returns orders that Orders Service reports as available and that belong to a shop where this courier has an active association.

Expected order eligibility:

- `status = READY_FOR_PICKUP`
- `deliveryMode = DELIVERY`
- no assigned courier
- courier has an `ACTIVE` association with the order's shop

Pickup orders must not be displayed in the courier available-orders screen.

Response:

```json
[
  {
    "orderId": "11111111-1111-1111-1111-111111111111",
    "storeId": "22222222-2222-2222-2222-222222222222",
    "storeName": "Supermercado Baoba",
    "storeLogoUrl": "https://example.com/logo.jpg",
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

### List assigned orders

```http
GET /api/v1/couriers/me/orders/assigned
```

Returns the authenticated courier's assigned orders. The expected useful statuses are `COURIER_ASSIGNED` and `IN_TRANSIT`.

The response item shape is the same as the available-orders response.

### Get courier-safe order detail

```http
GET /api/v1/couriers/me/orders/{orderId}
```

Allowed when:

- the order is unassigned and belongs to one of the courier's active shops, or
- the order is assigned to the authenticated courier.

An order assigned to another courier is returned as `404 ORDER_NOT_FOUND`.

Response:

```json
{
  "orderId": "11111111-1111-1111-1111-111111111111",
  "status": "COURIER_ASSIGNED",
  "storeId": "22222222-2222-2222-2222-222222222222",
  "storeName": "Supermercado Baoba",
  "customerName": "Cliente",
  "courierId": "33333333-3333-3333-3333-333333333333",
  "courierName": "Joao Entregador",
  "courierQrCode": "opaque-courier-token",
  "contactPhone": "+258841234567",
  "deliveryAddress": {
    "address": "Av. Julius Nyerere, 100",
    "city": "Maputo",
    "neighborhood": "Polana",
    "latitude": -25.9655,
    "longitude": 32.5832
  },
  "paymentMethod": "CASH",
  "total": 850.00,
  "items": [
    {
      "productId": "44444444-4444-4444-4444-444444444444",
      "name": "Produto",
      "quantity": 2
    }
  ]
}
```

Courier item objects contain only `productId`, `name`, and `quantity`. Do not expect `unitPrice`, `lineTotal`, `subtotal`, or `deliveryFee` in this response.

### Self-assign an order

```http
POST /api/v1/couriers/me/orders/{orderId}/assignment
```

No request body is required.

On success, the response is the courier-safe order detail. The backend asks Orders Service to atomically assign the authenticated courier, change the order to `COURIER_ASSIGNED`, and create a new courier QR token.

The frontend should disable or protect the assign button after submitting and refresh the order list after success. A simultaneous assignment by another courier returns `409 ORDER_ALREADY_ASSIGNED`.

### Cancel an assignment

```http
DELETE /api/v1/couriers/me/orders/{orderId}/assignment
```

No request body is required.

Success response: `204 No Content`.

Only the assigned courier can cancel, and only while the order is `COURIER_ASSIGNED`. After cancellation, the order returns to `READY_FOR_PICKUP` and can become available to another eligible courier.

### Change courier order status

```http
PATCH /api/v1/couriers/me/orders/{orderId}/status
Content-Type: application/json
```

Request for pickup start:

```json
{ "status": "IN_TRANSIT" }
```

Request for delivery completion:

```json
{ "status": "DELIVERED" }
```

Only these transitions are valid:

```text
COURIER_ASSIGNED -> IN_TRANSIT
IN_TRANSIT -> DELIVERED
```

The response is the updated courier-safe order detail. The frontend should not optimistically move to the next state until the request succeeds.

**Frontend amendment (2026-09-11): the UI no longer sends `COURIER_ASSIGNED -> IN_TRANSIT` from this endpoint.** Per product decision, a courier must never self-advance to "A caminho" — that transition only happens when the merchant/staff scans the courier's QR (`POST .../scan-courier-qr`, below). Leave the transition table on the backend as-is (harmless if it still accepts it), but the courier UI's own status button for this step was removed; only `IN_TRANSIT -> DELIVERED` (after scanning the customer's QR) is still sent by the courier client.

### Scan the customer's QR code

```http
POST /api/v1/couriers/me/orders/scan-customer-qr
Content-Type: application/json
```

Request:

```json
{ "qrCode": "customer-order-qr-token" }
```

The courier must own the assignment, the order must be `IN_TRANSIT`, and the QR must belong to that order. The response is the courier-safe order detail. Scanning does **not** automatically mark the order as delivered.

## Merchant Courier Endpoints

### List couriers for a shop

```http
GET /api/v1/merchant/shops/{shopId}/couriers
```

### List active couriers for manual assignment

```http
GET /api/v1/merchant/shops/{shopId}/couriers/active
```

Response:

```json
[
  {
    "courierId": "33333333-3333-3333-3333-333333333333",
    "courierName": "Joao Entregador",
    "phone": "+258841234567",
    "status": "ACTIVE"
  }
]
```

Use the returned `courierId` as the value in the merchant assignment request. This is the courier profile UUID, not the courier's JWT `sub`.

### Get one courier association

```http
GET /api/v1/merchant/shops/{shopId}/couriers/{courierId}
```

### Approve, suspend, or reactivate a courier association

```http
PATCH /api/v1/merchant/shops/{shopId}/couriers/{courierId}/status
Content-Type: application/json
```

Approve a pending association:

```json
{ "status": "ACTIVE" }
```

Suspend an active association:

```json
{ "status": "SUSPENDED" }
```

Reactivate a suspended association:

```json
{ "status": "ACTIVE" }
```

Valid transitions are:

```text
PENDING_STORE_APPROVAL -> ACTIVE
ACTIVE -> SUSPENDED
SUSPENDED -> ACTIVE
```

### Reject a pending association

```http
DELETE /api/v1/merchant/shops/{shopId}/couriers/{courierId}
```

Success response: `204 No Content`.

Rejection deletes the pending association. There is no `REJECTED` association status in this API.

## Merchant Order Endpoints

## Merchant Courier Detail Location Extension

For the merchant courier detail screen, extend:

```http
GET /api/v1/merchant/shops/{shopId}/couriers/{courierId}
```

The response must include the courier's saved base location and address:

```json
{
  "baseLatitude": -25.9655,
  "baseLongitude": 32.5832,
  "baseAddress": "Av. Julius Nyerere, 100",
  "baseNeighborhood": "Polana",
  "baseCity": "Maputo"
}
```

These fields are required for the Store Admin courier detail page to show
the store pin, courier-base pin, distance, and base address. The frontend
already supports these optional fields and renders the map when they are
present. They should come from the courier profile and must be scoped to
the requested shop association.

### Manually assign a courier

```http
PATCH /api/v1/merchant/shops/{shopId}/orders/{orderId}/courier
Content-Type: application/json
```

Request:

```json
{
  "courierId": "33333333-3333-3333-3333-333333333333"
}
```

The selected courier must have an `ACTIVE` association with the requested shop. Orders Service also validates order ownership, delivery mode, and the allowed order status.

On success, the response is a merchant order detail. It may contain prices because this endpoint is for merchant-side use.

### Merchant scans courier QR

```http
POST /api/v1/merchant/shops/{shopId}/orders/{orderId}/scan-courier-qr
Content-Type: application/json
```

Request:

```json
{ "qrCode": "opaque-courier-token" }
```

The QR must belong to the assigned courier and the order must be `COURIER_ASSIGNED`. On success, Orders Service moves the order to `IN_TRANSIT` and consumes/clears the courier assignment QR.

## Merchant Order Detail Shape

Merchant assignment responses have this shape:

```json
{
  "orderId": "11111111-1111-1111-1111-111111111111",
  "status": "COURIER_ASSIGNED",
  "customerName": "Cliente",
  "storeId": "22222222-2222-2222-2222-222222222222",
  "storeName": "Supermercado Baoba",
  "storeLogoUrl": "https://example.com/logo.jpg",
  "storeLatitude": -25.9655,
  "storeLongitude": 32.5832,
  "items": [
    {
      "productId": "44444444-4444-4444-4444-444444444444",
      "name": "Produto",
      "photoUrl": "https://example.com/product.jpg",
      "unitPrice": 400.00,
      "quantity": 2,
      "lineTotal": 800.00,
      "ivaRate": 16.00
    }
  ],
  "subtotal": 800.00,
  "deliveryFee": 50.00,
  "total": 850.00,
  "deliveryMode": "DELIVERY",
  "deliveryAddress": {
    "address": "Av. Julius Nyerere, 100",
    "city": "Maputo",
    "neighborhood": "Polana",
    "latitude": -25.9655,
    "longitude": 32.5832
  },
  "paymentMethod": "CASH",
  "contactEmail": "cliente@example.com",
  "contactPhone": "+258841234567",
  "courierLatitude": null,
  "courierLongitude": null,
  "etaMinutes": null,
  "etaAt": null,
  "createdAt": "2026-09-08T10:00:00Z",
  "statusUpdatedAt": "2026-09-08T10:15:00Z",
  "qrCode": "customer-order-qr-token"
}
```

## Standard Error Handling

Errors use this envelope:

```json
{
  "code": "ORDER_ALREADY_ASSIGNED",
  "message": "Esta encomenda já foi atribuída a outro entregador",
  "details": [],
  "timestamp": "2026-09-08T12:00:00Z"
}
```

Handle these codes explicitly:

| HTTP | Code | Frontend behavior |
|---:|---|---|
| `400` | `VALIDATION_ERROR` | Show request-field validation feedback. |
| `401` | `UNAUTHENTICATED` | Refresh authentication or redirect to login. |
| `403` | `ACCESS_DENIED` | Hide/disable the operation and show that the user lacks access. |
| `404` | `ORDER_NOT_FOUND` | Remove the order from the current list or show that it is no longer available. |
| `404` | `COURIER_ASSIGNMENT_NOT_FOUND` | Refresh assigned-order state. |
| `409` | `ORDER_ALREADY_ASSIGNED` | Refresh available orders; another courier won the race. |
| `409` | `COURIER_NOT_ASSOCIATED` | Do not allow self-assignment for this shop. |
| `409` | `COURIER_NOT_ACTIVE` | Refresh the merchant's active-courier list. |
| `409` | `INVALID_TRANSITION` | Refresh the order; its status changed or the action is not valid. |
| `409` | `INVALID_CUSTOMER_QR` | Ask the courier to scan the customer's QR again. |
| `409` | `INVALID_COURIER_QR` | Ask the merchant to scan the courier QR again. |

## Frontend Checklist

- [ ] All requests use the Courier Service base URL and `/api/v1` prefix.
- [ ] Browser calls do not use the internal Orders Service endpoints.
- [ ] Courier screens send a `COURIER` JWT.
- [ ] Merchant screens send `MERCHANT`, `MERCHANT_STAFF`, or `ADMIN` JWTs.
- [ ] Available orders are rendered only as delivery orders ready for pickup.
- [ ] Assignment buttons handle `409 ORDER_ALREADY_ASSIGNED` by refreshing data.
- [ ] Courier detail screens do not expect product prices or delivery-fee fields.
- [ ] Merchant assignment uses the UUID from `GET .../couriers/active`.
- [ ] Merchant assignment uses `PATCH .../orders/{orderId}/courier`.
- [ ] Merchant QR scanning uses `POST .../scan-courier-qr`.
- [ ] Courier QR scanning uses `POST /api/v1/couriers/me/orders/scan-customer-qr`.
- [ ] Status changes are sent only as `IN_TRANSIT` and `DELIVERED`.
- [ ] The frontend refreshes order state after assignment, cancellation, status change, and QR scan.
- [ ] `204 No Content` responses are not parsed as JSON.
- [ ] API errors are read from `code`, `message`, and `details`.

## Backend Verification

The current Courier Service implementation was validated with:

```text
./mvnw test
./mvnw -q -DskipTests compile
```

The Orders Service must still provide the corresponding internal atomic operations and enforce transaction-level assignment/status rules. The browser should never depend on those internal implementation details.

## Bug report (2026-09-11): `DELIVERED` transition 500s — RESOLVED

**Fixed and confirmed by the backend team, 2026-09-11.** Root cause:
`courier-service`'s `OrdersClient` Feign client had no HTTP client
configured, so it defaulted to JDK `HttpURLConnection`, which doesn't
support `PATCH` — every other courier-order call (POST/DELETE/GET)
worked, only the status-update PATCH ever hit this. Fix: added
`io.github.openfeign:feign-hc5` to `konecta-courier-service/pom.xml` so
Spring Cloud OpenFeign backs the client with Apache HttpClient5 instead.
Backend verified live: repro call now returns `200 DELIVERED`, and both
the `orders` table and `order_status_history` show a clean
`IN_TRANSIT -> DELIVERED` row attributed to the courier for order
`604bfe83-1a01-491c-bfb8-b2e92ecf7955`. No frontend change was needed —
the request/response contract was already correct. Original report kept
below for reference.

### Original report

Live-verified a full round trip against the real running services
(ports 8091-8096) with real test accounts: checkout → status walk to
`READY_FOR_PICKUP` → courier self-assign → merchant scans courier QR
(`IN_TRANSIT`, correct) → courier scans customer QR (succeeds) →
courier confirms delivery. The last step fails:

```http
PATCH /api/v1/couriers/me/orders/{orderId}/status
Content-Type: application/json

{ "status": "DELIVERED" }
```

Returns `500 INTERNAL_ERROR` every time (reproduced twice, hitting
`KONECTA-COURIER-SERVICE` on `:8096` directly, not through the Next.js
BFF — so this is not a proxy/serialization issue on the frontend side).
The order is left cleanly at `IN_TRANSIT` (no partial/corrupted state),
it just can't be advanced further from the courier side. Repro data:
order `604bfe83-1a01-491c-bfb8-b2e92ecf7955` (shop "Supermercado
Baoba", courier `f78099d2-2722-4c0c-9089-fc0ccd908cdb`), left in this
state intentionally for backend debugging. Every other endpoint in this
document was exercised successfully in the same live session — this is
the one open item.
