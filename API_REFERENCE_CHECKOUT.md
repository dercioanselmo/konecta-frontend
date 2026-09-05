# KONECTA Checkout microservice — proposed API contract

**Status: PROPOSED. `KONECTA-CHECKOUT-SERVICE` does not exist yet.** This
is the mandatory end-of-slice backend report required by `AGENTS.md`'s
Checkout section. Per that section's explicit instruction, **this phase
does not permit mocking** the way Cart's did — checkout touches real
order placement, so there's no local stand-in here. The UI is fully
built against this contract and shows a clean error state (not a crash,
not fake data) everywhere it calls an endpoint that doesn't exist yet —
confirmed live.

Eureka name (per AGENTS.md): `KONECTA-CHECKOUT-SERVICE` (placeholder).
Local port used in `.env.example`/`.env.local`: `8094` — a guess (next
sequential after Cart's `8093`), not a confirmed assignment; update once
the real service registers.

---

## Why this exists

Checkout combines three sections on one screen (Entrega, Pagamento,
Contactos e resumo) and, on submit, needs to: read the caller's current
cart, validate it's still sellable, create an order record, and —
**this phase only** — mark it paid automatically (no real M-Pesa/e-Mola/
Visa/COD gateway yet, per AGENTS.md). The frontend never sends cart
contents in the request body — same principle as Cart's own design
(frontend doesn't own price/stock truth): Checkout should read the
caller's cart itself, server-to-server against the Cart service, using
the same JWT `sub`. This also means a tampered client can't inflate
quantities or invent prices.

---

## Auth

Every endpoint requires `Authorization: Bearer <accessToken>` — any
authenticated role, matching the Cart precedent (a merchant or courier
is also a person who might buy something). `401 UNAUTHENTICATED` for
missing/invalid tokens.

---

## `POST /api/v1/checkout`

Places an order from the caller's current cart. Cart contents are
**not** sent in the body — resolved server-side from the caller's own
cart (server-to-server call to Cart service, same pattern Cart itself
uses against Stores-and-Stock).

**Request body**

```json
{
  "deliveryMode": "PICKUP" | "DELIVERY",
  "deliveryAddress": { "address": "string", "city": "Maputo", "neighborhood": "string", "latitude": -25.9692, "longitude": 32.5732 } | null,
  "paymentMethod": "CARD" | "MPESA" | "EMOLA" | "CASH",
  "contactEmail": "string",
  "contactPhone": "string"
}
```

- `deliveryAddress` — **required** when `deliveryMode` is `DELIVERY`,
  must be `null` (or omitted) for `PICKUP`. `400 VALIDATION_ERROR` if
  present-but-required-absent or vice versa.
- `contactEmail`/`contactPhone` — prefilled from the profile client-side
  but editable; sent as typed, not re-derived from the JWT.

**Response `201 Created`** — the created `Order` (see Data models).
`status` should be `PAID` in the normal case (this phase auto-confirms
payment), or `PENDING_STORE_OPEN` if the store is currently closed —
per the root `AGENTS.md`'s business rule #5 ("closed store: order stays
pending until open, with clear messaging") and the order-status
timeline in its §9. The frontend's status label map already has both
covered, no frontend change needed either way.

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing/invalid fields, delivery without address (or vice versa) |
| `409` | `CART_EMPTY` | Caller's cart has no items at confirm time |
| `409` | `STORE_MISMATCH` | Shouldn't be reachable in practice (Cart already enforces mono-store), included for symmetry/defensive handling |
| `409` | `PRODUCT_INACTIVE` | A line's product went inactive between cart and confirm |
| `409` | `INSUFFICIENT_STOCK` | A line's quantity no longer fits available stock |
| `404` | `SHOP_NOT_FOUND` | Shouldn't be reachable if the cart is well-formed, included defensively |
| `401` | `UNAUTHENTICATED` | — |

---

## `GET /api/v1/orders/{orderId}`

Order detail — same shape as the checkout response, scoped to the
caller (an order id belonging to a different user should behave like
Cart's cross-user-item handling: `404`, not `403`, to avoid confirming
existence).

**Response `200 OK`** — `Order`.

**Errors**: `404 ORDER_NOT_FOUND` (unknown id, or belongs to another
user), `401 UNAUTHENTICATED`.

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
| `items` | `OrderItem[]` | Snapshotted at confirm time — a later price change on the product shouldn't retroactively change a placed order |
| `subtotal` | decimal | Sum of `items[].lineTotal` |
| `deliveryFee` | decimal \| null | `null` if not computed/applicable (e.g. pickup) |
| `total` | decimal | `subtotal + deliveryFee` (or just `subtotal` if `deliveryFee` is null) |
| `deliveryMode` | `"PICKUP"` \| `"DELIVERY"` | |
| `deliveryAddress` | object \| null | Same shape as the request, `null` for pickup |
| `paymentMethod` | `"CARD"` \| `"MPESA"` \| `"EMOLA"` \| `"CASH"` | |
| `contactEmail` | string | |
| `contactPhone` | string | |
| `createdAt` | ISO 8601 | |

### `OrderItem`

`{ productId, name, photoUrl, unitPrice, quantity, lineTotal }` — same
shape as `CartItem` minus the cart-specific `id`/`active`/`inStock`
fields (an order is a snapshot, not a live-revalidated view).

### Order status

Mirrors the root `AGENTS.md` §9 timeline exactly — reuse those exact
string values, don't invent new ones:

```
CREATED → PAID → (optional PENDING_STORE_OPEN) → STORE_CONFIRMED →
PREPARING → READY_FOR_PICKUP → (COURIER_ASSIGNED → PICKED_UP → IN_TRANSIT) →
DELIVERED
```
Also `CANCELLED` / `REFUNDED`. Pickup orders skip the courier-specific
states. The frontend already has a Portuguese label for every one of
these (`lib/checkout/orderStatusLabels.ts`) — no new state should be
introduced without a matching frontend label update.

---

## What I need from the **other, already-existing** services

Per AGENTS.md's explicit instruction to report these too:

### KONECTA-SECURITY-SERVICE — nothing needed

Already has everything checkout needs to prefill: `email`, `phone`,
`address`, `city`, `neighborhood`, `latitude`/`longitude` (Round 11) on
`GET /users/me`, plus `deliveryPreference`/`paymentMethod` (Round 17b)
on `GET /users/me/preferences`. No new endpoint or field proposed here.

### KONECTA-STORES-AND-STOCK-SERVICE — one optional enhancement

For the pickup section, AGENTS.md suggests showing "store address,
hours, distance if available." Today's public single-shop endpoint
(`GET /api/v1/shops/{shopId}`) only has `{ id, name, logoUrl, coverUrl,
isOpen, categories }` — no address or hours. The frontend currently
just shows the store's name + logo for pickup and omits address/hours/
distance entirely (AGENTS.md's own "if available" language covers this
— not treated as a blocker).

**Optional proposal, not blocking**: add `address`, `neighborhood` to
that same public row if/when convenient. Not proposing hours or
distance here — hours would need the full weekly schedule (a bigger
addition) and distance needs the customer's own location, which
checkout doesn't currently request from the browser (it reuses the
profile's saved location, already available client-side). Revisit if
this round's minimal pickup display turns out to be insufficient once
the real Checkout service exists.

---

## Frontend status

Fully built against this contract: `lib/checkout/types.ts` (with a
deliberate note on the `DeliveryPreference` vs `DeliveryMode` value
mismatch AGENTS.md itself anticipated — mapped client-side, see
`deliveryModeFromPreference` in `CheckoutView.tsx`), `lib/checkout/client.ts`
(real HTTP client), `lib/checkout/checkoutApi.ts` (server-only fetch
wrapper, mirrors `cartApi.ts`), `lib/checkout/orderStatusLabels.ts`.
New BFF routes `app/api/checkout/route.ts` and
`app/api/orders/[orderId]/route.ts`.

UI: `app/checkout/{page.tsx,CheckoutView.tsx}` — one scrollable screen,
all three sections (Entrega with a delivery/pickup toggle reusing the
same `LocationPicker` built for shop/user location; Pagamento; Contactos
e resumo with live cart line items, subtotal, and the submit button),
prefilled from profile + preferences, redirects to `/cart` if the cart
is empty on entry. `app/orders/[orderId]/page.tsx` — minimal order
detail screen (status, store, delivery/payment summary, line items,
totals), per AGENTS.md's "can be minimal in this phase."

Live-verified: logged in as the real Customer test account
(`dercio.miguel@gmail.com`), added a real product to cart, confirmed
`/checkout` loads without crashing and correctly gates on cart state;
`/orders/{id}` shows a clean error (not a crash) since the service
doesn't exist yet. Cart-empty redirect, form prefill, and the actual
place-order call are code-reviewed and type-checked but not click-
tested in a real browser, and cannot be fully live-verified against a
real order until `KONECTA-CHECKOUT-SERVICE` exists.

`tsc --noEmit`, `eslint`, `npm run build` all clean.
