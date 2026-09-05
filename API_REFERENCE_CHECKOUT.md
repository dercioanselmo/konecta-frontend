# KONECTA Checkout microservice — RESOLVED

**Status: RESOLVED.** `KONECTA-CHECKOUT-SERVICE` is live at
`http://localhost:8094` (registered in Eureka, confirmed via
`GET /eureka/apps`) and matches this proposal almost exactly — see
`API_REFERENCE-checkout-service.md` for backend's own authoritative
version of the contract. This file is kept only as the historical
end-of-slice record; the frontend now targets the real service.

Confirmed deltas from the original proposal below this file
originally made (Round 24), reconciled into the frontend this round:

- **`Idempotency-Key` request header** (optional, strongly recommended)
  on `POST /api/v1/checkout` — not in the original proposal. Now
  implemented: `app/checkout/CheckoutView.tsx` generates one
  `crypto.randomUUID()` per checkout page load (`useRef`, stable across
  re-renders and retries of the same attempt), `lib/checkout/client.ts`'s
  `placeOrder()` takes it as a second argument and sends it as the
  `Idempotency-Key` header, and `app/api/checkout/route.ts` forwards it
  from the incoming request through to the real backend call unchanged.
- **`503 SERVICE_UNAVAILABLE`** when Cart or Stores-and-Stock is
  unreachable — added to `CheckoutErrorCode` in `lib/checkout/types.ts`
  for type accuracy (it would have surfaced correctly as an untyped
  string before too, since `CheckoutErrorCode` also allows `| string`).
- **`deliveryFee` is confirmed always `null` this phase** (not just
  "sometimes") — no frontend change needed, the UI already renders it
  as optional/nullable everywhere.
- Server-side flow (reads cart from Cart service, re-checks price/stock,
  atomically decrements stock, snapshots the order, clears the cart) and
  `STORE_MISMATCH` being reserved/unreachable both confirmed exactly as
  assumed.
- Response payload shape confirmed byte-for-byte identical to what was
  built against: `orderId, status, storeId, storeName, storeLogoUrl,
  items[], subtotal, deliveryFee, total, deliveryMode, deliveryAddress,
  paymentMethod, contactEmail, contactPhone, createdAt`.

## Live verification performed

Full stack (Security `8091`, Stores-and-Stock `8092`, Cart `8093`,
Checkout `8094`) confirmed `UP` in Eureka. Verified directly against
the running services with a real customer account
(`dercio.miguel@gmail.com`):

- `POST /api/v1/checkout` and `GET /api/v1/orders/{orderId}` both
  correctly return `401 UNAUTHENTICATED` with the documented error body
  shape (`{code, message, details, timestamp}`) when called without a
  token.
- **PICKUP + CASH happy path — confirmed end-to-end**: real cart item
  (`Arroz 5kg Premiumz`, qty 1, in stock) → `POST /api/v1/checkout` with
  an `Idempotency-Key` header → `201` with `status: PENDING_STORE_OPEN`
  (store closed at test time — correct per AGENTS.md business rule #5)
  → `GET /api/v1/orders/{orderId}` returns the identical order →
  `GET /api/v1/cart` confirms the cart was cleared server-side after
  checkout. Response shape matches `Order` exactly, `deliveryFee: null`
  as documented.
- **`DELIVERY` validation — confirmed**: submitting `deliveryMode:
  DELIVERY` with `deliveryAddress: null` correctly returns `400`.
- **DELIVERY + MPESA happy path — confirmed end-to-end**: re-added the
  same product to a fresh cart, submitted `DELIVERY` with a full
  address, got `201` with the address echoed back verbatim.
- **`Idempotency-Key` genuinely prevents duplicates — confirmed**:
  resubmitted the identical DELIVERY request with the same key; got
  back the exact same `orderId` and `createdAt`, not a second order.
- `tsc --noEmit`, `eslint`, `npm run build` all clean after the
  Idempotency-Key change.

(An earlier pass of this verification reported a `500` as a suspected
Cart regression. That was a false alarm — the failing call was this
session's own mistake, hitting `POST /api/v1/cart` instead of the real
add-item endpoint, `POST /api/v1/cart/items`. No bug in Cart; retested
against the correct path immediately above.)

## What was needed from the other, already-existing services

Confirmed as originally reported — no changes:

- **KONECTA-SECURITY-SERVICE** — nothing needed, already had everything.
- **KONECTA-STORES-AND-STOCK-SERVICE** — the optional, non-blocking
  `address`/`neighborhood`-on-public-shop-row enhancement remains just
  that: optional. Not required for Checkout to function.

---

## Original proposal (Round 24, for reference)

<details>
<summary>Click to expand the original PROPOSED contract</summary>

Eureka name (per AGENTS.md): `KONECTA-CHECKOUT-SERVICE`.

### Why this exists

Checkout combines three sections on one screen (Entrega, Pagamento,
Contactos e resumo) and, on submit, needs to: read the caller's current
cart, validate it's still sellable, create an order record, and — this
phase only — mark it paid automatically (no real M-Pesa/e-Mola/Visa/COD
gateway yet). Cart contents are never sent in the request body — resolved
server-side from the caller's own cart, same principle as Cart's own
design.

### `POST /api/v1/checkout`

Request: `{ deliveryMode, deliveryAddress, paymentMethod, contactEmail,
contactPhone }`. Response `201` — the created `Order`. Errors:
`400 VALIDATION_ERROR`, `409 CART_EMPTY`, `409 STORE_MISMATCH`,
`409 PRODUCT_INACTIVE`, `409 INSUFFICIENT_STOCK`, `404 SHOP_NOT_FOUND`,
`401 UNAUTHENTICATED`.

### `GET /api/v1/orders/{orderId}`

Order detail scoped to the caller; `404 ORDER_NOT_FOUND` (unknown id or
belongs to another user), `401 UNAUTHENTICATED`.

### Data models

`Order`: `orderId, status, storeId, storeName, storeLogoUrl, items[],
subtotal, deliveryFee, total, deliveryMode, deliveryAddress,
paymentMethod, contactEmail, contactPhone, createdAt`.
`OrderItem`: `productId, name, photoUrl, unitPrice, quantity, lineTotal`.

Order status mirrors root `AGENTS.md` §9: `CREATED → PAID → (optional
PENDING_STORE_OPEN) → STORE_CONFIRMED → PREPARING → READY_FOR_PICKUP →
(COURIER_ASSIGNED → PICKED_UP → IN_TRANSIT) → DELIVERED`, plus
`CANCELLED` / `REFUNDED`.

</details>
