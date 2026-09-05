# KONECTA Checkout Service — API reference

**Status: implemented and live-verified.** Everything below was exercised
against a running instance of this service (port `8094`), the real
`KONECTA-SECURITY-SERVICE`, `KONECTA-CART-SERVICE`, and
`KONECTA-STORES-AND-STOCK-SERVICE` — not mocks. Example payloads are taken
from that run (some fields shortened for readability).

Eureka name: `KONECTA-CHECKOUT-SERVICE` · Local base URL: `http://localhost:8094`

---

## Swagger / OpenAPI

Active, no token required:

| What | Where |
|---|---|
| Interactive UI | `GET /swagger-ui.html` → redirect to `/swagger-ui/index.html` |
| Raw spec | `GET /v3/api-docs` → 200 OK, OpenAPI 3 JSON |

---

## Auth

Every endpoint below requires `Authorization: Bearer <accessToken>` from
`KONECTA-SECURITY-SERVICE`. **Any authenticated role** works, same as Cart —
there is no role restriction (a merchant or courier is also a person who
might buy something).

No token, or an expired/malformed one → `401`:

```json
{ "code": "UNAUTHENTICATED", "message": "Autenticação necessária", "details": [], "timestamp": "2026-09-05T20:03:16.221102Z" }
```

---

## `POST /api/v1/checkout`

Places an order from the **caller's own current cart**. Cart contents are
**not** sent in the request body — this service reads the caller's cart
itself, server-to-server against Cart, using the same JWT. A tampered
client can't inflate quantities or invent prices this way.

**Optional header**: `Idempotency-Key: <any string>`. Strongly recommended
on the frontend's submit call — retrying the same key (e.g. after a network
timeout on the first attempt, where the order may have actually gone
through) returns the **original** order again instead of creating a
duplicate, even if the cart has since been emptied by the first attempt.

**Request body**

```json
{
  "deliveryMode": "PICKUP",
  "deliveryAddress": null,
  "paymentMethod": "CASH",
  "contactEmail": "dercio.miguel@gmail.com",
  "contactPhone": "+258841234567"
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `deliveryMode` | `"PICKUP"` \| `"DELIVERY"` | yes | — |
| `deliveryAddress` | object \| `null` | conditional | **Required** (and validated non-blank on `address`/`city`) when `deliveryMode` is `DELIVERY`; must be `null` or omitted for `PICKUP`. `400 VALIDATION_ERROR` either way if mismatched. |
| `paymentMethod` | `"CARD"` \| `"MPESA"` \| `"EMOLA"` \| `"CASH"` | yes | — |
| `contactEmail` | string | yes | Must be a well-formed email address. |
| `contactPhone` | string | yes | Non-blank. Sent as typed — not re-derived from the JWT or re-validated against the MZ phone format Security uses. |

`deliveryAddress` shape (all four sub-fields are stored as given; `latitude`/`longitude` are optional):

```json
{ "address": "Av. Julius Nyerere", "city": "Maputo", "neighborhood": "Central", "latitude": -25.9692, "longitude": 32.5732 }
```

**Response `201 Created`** — the created `Order` (see Data models below).
`status` is `PAID` in the normal case (this phase auto-confirms payment
with no real PSP), or `PENDING_STORE_OPEN` if the store is currently
closed:

```json
{
  "orderId": "bc9e1ee4-b2ca-4c84-8751-e329bab1072f",
  "status": "PENDING_STORE_OPEN",
  "storeId": "e060c908-bc88-4e02-b7a1-0fd4a3d01504",
  "storeName": "Loja Teste E2E 2",
  "storeLogoUrl": "https://konecta-media-....s3.amazonaws.com/stores/.../logo.png?X-Amz-...",
  "items": [
    {
      "productId": "c0042b64-ae37-4274-bc1f-f4d08838c7ae",
      "name": "Arroz 5kg Premiumz",
      "photoUrl": "https://konecta-media-..../products/..../f62ae936....jpg?X-Amz-...",
      "unitPrice": 400.01,
      "quantity": 2,
      "lineTotal": 800.02
    }
  ],
  "subtotal": 800.02,
  "deliveryFee": null,
  "total": 800.02,
  "deliveryMode": "PICKUP",
  "deliveryAddress": null,
  "paymentMethod": "CASH",
  "contactEmail": "dercio.miguel@gmail.com",
  "contactPhone": "+258841234567",
  "createdAt": "2026-09-05T20:59:00.540629Z"
}
```

For a `DELIVERY` order, `deliveryAddress` in the response echoes back what
was sent:

```json
{ "address": "Av. Julius Nyerere", "city": "Maputo", "neighborhood": "Central", "latitude": -25.9692, "longitude": 32.5732 }
```

### What happens server-side, in order

1. Read the caller's cart from Cart (`409 CART_EMPTY` if it has no items).
2. Re-check every line's live price and stock against Stores-and-Stock.
3. Atomically decrement stock for every line (all-or-nothing — a shortfall
   on any single line fails the whole order, nothing is decremented, and
   **no order is created**).
4. Persist the order with a price/name/photo **snapshot** — a later price
   change on the product will never retroactively change a placed order.
5. Clear the cart.

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields, malformed JSON, an unrecognized enum value, delivery without address (or vice versa) — see `details[]` for which field |
| `409` | `CART_EMPTY` | Caller's cart has no items at confirm time |
| `409` | `PRODUCT_INACTIVE` | A line's product went inactive (or was removed from sale) between cart and confirm |
| `409` | `INSUFFICIENT_STOCK` | A line's quantity no longer fits available stock — checked twice: once per-line against the live catalog, and once atomically at the final stock-commit step (the message names every product that failed) |
| `404` | `SHOP_NOT_FOUND` | Shouldn't be reachable if the cart is well-formed; included defensively |
| `409` | `STORE_MISMATCH` | Reserved for symmetry with Cart's own error set — **not currently reachable**, since Cart already enforces one store per cart before checkout ever sees it |
| `503` | `SERVICE_UNAVAILABLE` | Cart or Stores-and-Stock is unreachable/timing out — the order is refused rather than risk an inconsistent state |
| `401` | `UNAUTHENTICATED` | — |

---

## `GET /api/v1/orders/{orderId}`

Order detail — same shape as the checkout response, scoped to the caller.
An order id belonging to a different user behaves like Cart's cross-user
item handling: `404`, not `403`, so existence isn't confirmed to a caller
who doesn't own it.

**Response `200 OK`** — `Order` (same shape as the `POST /checkout`
response body above).

**Errors**: `404 ORDER_NOT_FOUND` (unknown id, or belongs to another user),
`401 UNAUTHENTICATED`.

---

## Data models

### `Order`

| Field | Type | Notes |
|---|---|---|
| `orderId` | uuid | |
| `status` | string | See Order status below |
| `storeId` | uuid | |
| `storeName` | string | |
| `storeLogoUrl` | string \| null | |
| `items` | `OrderItem[]` | Snapshotted at confirm time |
| `subtotal` | decimal | Sum of `items[].lineTotal` |
| `deliveryFee` | decimal \| null | Always `null` in this phase — no delivery-fee computation yet |
| `total` | decimal | `subtotal + deliveryFee`, or just `subtotal` when `deliveryFee` is `null` |
| `deliveryMode` | `"PICKUP"` \| `"DELIVERY"` | |
| `deliveryAddress` | object \| null | Same shape as the request's `deliveryAddress`; `null` for pickup |
| `paymentMethod` | `"CARD"` \| `"MPESA"` \| `"EMOLA"` \| `"CASH"` | |
| `contactEmail` | string | |
| `contactPhone` | string | |
| `createdAt` | ISO 8601 | |

### `OrderItem`

| Field | Type | Notes |
|---|---|---|
| `productId` | uuid | |
| `name` | string | Snapshotted product name at confirm time |
| `photoUrl` | string \| null | Snapshotted photo URL — note this is normally a **presigned** S3 URL (expires ~1h), same caveat as Cart's `photoUrl`/`storeLogoUrl` |
| `unitPrice` | decimal | Snapshotted price — will not change even if the live product price changes later |
| `quantity` | int | |
| `lineTotal` | decimal | `unitPrice × quantity` |

No `id`/`active`/`inStock` fields — unlike `CartItem`, an order is a fixed
historical snapshot, not a live-revalidated view.

### Order status

Mirrors the root `AGENTS.md` §9 timeline exactly:

```
CREATED → PAID → (optional PENDING_STORE_OPEN) → STORE_CONFIRMED →
PREPARING → READY_FOR_PICKUP → (COURIER_ASSIGNED → PICKED_UP → IN_TRANSIT) →
DELIVERED
```

Also `CANCELLED` / `REFUNDED`. Pickup orders skip the courier-specific
states. **Only `PAID` and `PENDING_STORE_OPEN` are actually produced by
this service today** — the rest of the timeline exists in the enum for
forward-compatibility with later phases (merchant confirmation, courier
assignment, real payment/cancellation flows) but nothing in this codebase
currently transitions an order into them.

### `ApiError` — every error except the stock-commit-conflict case (internal only, not user-facing)

| Field | Type | Notes |
|---|---|---|
| `code` | string | machine-readable, see table below |
| `message` | string | Portuguese, human-readable |
| `details` | string[] | field-level notes on 400s (e.g. `"contactEmail: must be a well-formed email address"`); empty otherwise |
| `timestamp` | ISO 8601 | |

---

## Error codes at a glance

| Status | Code | Where it can occur |
|---|---|---|
| `401` | `UNAUTHENTICATED` | any endpoint — missing/invalid/expired token |
| `400` | `VALIDATION_ERROR` | `POST /checkout` — missing/invalid fields, malformed JSON body, delivery/address mismatch |
| `404` | `SHOP_NOT_FOUND` | `POST /checkout` — defensive, not normally reachable |
| `404` | `ORDER_NOT_FOUND` | `GET /orders/{id}` — unknown id, or belongs to another user |
| `409` | `CART_EMPTY` | `POST /checkout` |
| `409` | `STORE_MISMATCH` | `POST /checkout` — reserved, not currently reachable |
| `409` | `PRODUCT_INACTIVE` | `POST /checkout` |
| `409` | `INSUFFICIENT_STOCK` | `POST /checkout` |
| `503` | `SERVICE_UNAVAILABLE` | `POST /checkout` — Cart or Stores-and-Stock unreachable |
| `500` | `INTERNAL_ERROR` | anything unhandled |

---

## Behavior worth knowing before building the UI

| Rule | Detail |
|---|---|
| **No client-supplied cart/prices** | The frontend never sends line items, quantities, or prices — only delivery/payment/contact choices. Everything money-related comes from the server side, re-read fresh at confirm time. |
| **Snapshot, not live** | Unlike a cart line, an order line never changes after creation — no `active`/`inStock` fields, because there's nothing to re-check once placed. |
| **Idempotency-Key is safe to always send** | Generate one client-side per submit attempt (e.g. a UUID created when the user taps "Confirmar pedido") and resend the *same* key on any retry of that same submit — a timeout or dropped response won't create a second order. |
| **`PENDING_STORE_OPEN` is a normal, non-error outcome** | It's still a `201`, not an error — the frontend's status label map already covers it per the original contract discussion. |
| **Ownership** | Orders are looked up by the caller's JWT `sub` — there is no way to read another user's order (`404`, not `403`, to avoid confirming existence). |
| **`deliveryFee` is always `null` for now** | No delivery-fee computation exists in this phase; `total` always equals `subtotal`. Don't build UI that assumes a non-null value soon. |

---

## Backend package layout (for reference, not part of the contract)

```
com.konecta.checkout_service
├── controller/   CheckoutController, OrderController
├── service/      CheckoutService, OrderQueryService
├── repository/   OrderRepository
├── dto/          request/, response/, client/ (Feign-facing shapes)
├── domain/       Order, OrderItem, DeliveryMode, PaymentMethod, OrderStatus
├── client/       CartClient, StoresAndStockClient (Feign), CollaboratorErrorDecoder
├── config/       SecurityConfig, JwtAuthenticationFilter, RestAuthenticationEntryPoint,
│                 FeignAuthConfig, FeignErrorDecoderConfig, OpenApiConfig
├── exception/    ApiException + subclasses, GlobalExceptionHandler
└── mapper/       OrderMapper
```

Full implementation notes and design rationale live in `context.md`.
