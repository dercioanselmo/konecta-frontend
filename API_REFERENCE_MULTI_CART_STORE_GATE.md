# Multi-cart + store-closed checkout gate — PROPOSED backend report

**Status: PROPOSED — nothing implemented yet, backend or frontend.**
This is the mandatory end-of-slice backend report for a business-rule
change to `AGENTS.md` (root §5 rules 1 and 5, the Cart-focus section's
C-01/C-03/C-11, and the Checkout section's §4.6-4.8). Superseded from an
earlier draft of this same document per user clarification — the
`PENDING_STORE_OPEN` order status is **not part of this design at all**,
not even as a fallback; read this version, not the first one.

## The rules, restated precisely

1. **A customer may hold more than one active cart — at most one per
   store.** Adding a product for a store that already has a cart updates
   that cart; a different store gets its own, independent cart. No
   cross-store merge, no conflict prompt.
2. **Checkout must never start a payment while the target store is
   closed — and no order is ever created for a closed-store attempt.**
   Instead, whatever the customer filled in on the checkout screen
   (delivery mode/address, payment method, contacts) is **saved onto
   that cart itself** as a draft. The cart just sits there, holding both
   its line items and that draft, until the customer comes back.
3. **Resuming is manual, not automatic.** Nothing fires the moment the
   store opens. The customer reopens that cart themselves (see the
   cart-icon/switcher behavior below) and finishes checkout.
4. **Cart icon (top right, global) shows total item count across every
   active cart.** Tapping it:
   - **More than one active cart** → show the cart switcher (list of
     carts).
   - **Exactly one active cart** → skip the switcher and go straight
     to either:
     - **that cart has a saved checkout draft** → open `/checkout`
       for that store, **pre-filled from the draft**, ready for the
       customer to hit confirm-and-pay (for real, this time, assuming
       the store is now open — if it's still closed the CTA stays
       disabled per rule 2, they just wait longer with everything
       already filled in).
     - **no draft saved** → open the plain `/cart` page for that store
       (pre-checkout stage), same as today.
   - Selecting one cart from the switcher applies the same
     draft-or-plain-cart routing logic.

---

## 1. KONECTA-CART-SERVICE — two changes

### 1a. The multi-cart rework (unchanged from the original proposal)

Today's model is **one cart per user**. New model: **one cart per
`(user, shopId)` pair** — a user can have several active carts at once,
one per shop.

**`GET /api/v1/carts`** — new. Lists every active cart for the caller
(cart-switcher + header badge total):

```json
{
  "carts": [
    {
      "storeId": "uuid",
      "storeName": "string",
      "storeLogoUrl": "string | null",
      "isStoreOpen": true,
      "itemCount": 3,
      "subtotal": 1200.50,
      "valid": true,
      "hasCheckoutDraft": false
    }
  ]
}
```

`hasCheckoutDraft` is new (§1b) — it's what the frontend uses to decide,
for the single-cart case, whether tapping the cart icon should land on
`/checkout` or `/cart` without a second round-trip.

**`GET /api/v1/carts/{storeId}`** — replaces today's singular
`GET /api/v1/cart`, scoped to one store. Same shape as today's response,
plus the full `checkoutDraft` object when present (§1b). `404
CART_NOT_FOUND` if the caller has no cart for that store.

**`POST /api/v1/carts/{storeId}/items`** (was `POST /api/v1/cart/items`)
— same contract as today's add-item endpoint, `shopId` moves from body
to path. **`409 STORE_MISMATCH` is retired** — a `storeId` with no
existing cart just creates a new one; there is no wrong-store case
anymore.

**`PATCH /api/v1/carts/{storeId}/items/{itemId}`**,
**`DELETE /api/v1/carts/{storeId}/items/{itemId}`**,
**`DELETE /api/v1/carts/{storeId}`** — same contracts as today's
equivalents, scoped by `storeId`; clearing one store's cart never
touches any other active cart.

*(Open question for backend, not a requirement either way: does an
emptied cart disappear from `GET /api/v1/carts` or stay as a zero-item
row? Either works for the frontend.)*

### 1b. New: checkout-draft storage on the cart

This is what makes rule 2/3 possible without ever touching the Checkout
service or creating any order while a store is closed.

**`PUT /api/v1/carts/{storeId}/checkout-draft`**

Saves (or overwrites) the checkout form's current values onto that
store's cart. Called by the frontend when the customer attempts to
finalize against a closed store — **not** a call to Checkout, just a
save against Cart.

Request body — same field shape as Checkout's own place-order request,
minus `storeId` (redundant, it's in the path):

```json
{
  "deliveryMode": "PICKUP" | "DELIVERY",
  "deliveryAddress": { "address": "string", "city": "Maputo", "neighborhood": "string", "latitude": -25.9692, "longitude": 32.5732 } | null,
  "paymentMethod": "CARD" | "MPESA" | "EMOLA" | "CASH",
  "contactEmail": "string",
  "contactPhone": "string"
}
```

**Response `200 OK`** — the full updated cart (same shape as
`GET /api/v1/carts/{storeId}`), so the frontend can confirm the draft
round-tripped without a second fetch.

**`DELETE /api/v1/carts/{storeId}/checkout-draft`** — clears a saved
draft (e.g. if the customer wants to start checkout fresh instead of
resuming). Also: **a successful order placement should clear both the
cart and its draft together** — once an order exists, there's nothing
left to resume.

`checkoutDraft` shape on `GET /api/v1/carts/{storeId}`:

```json
{
  "deliveryMode": "PICKUP",
  "deliveryAddress": null,
  "paymentMethod": "MPESA",
  "contactEmail": "cliente@exemplo.com",
  "contactPhone": "+258840000000",
  "savedAt": "2026-09-06T10:00:00Z"
}
```
`null` (not an empty object) when no draft has been saved for that cart.

---

## 2. KONECTA-CHECKOUT-SERVICE — mostly unchanged, `storeId` added, closed-store gate becomes a pure safety net

### `POST /api/v1/checkout` — request body gains `storeId`

Same as the original proposal — checkout now needs to know *which* of
the caller's carts to place, since there can be more than one:

```json
{
  "storeId": "uuid",
  "deliveryMode": "PICKUP" | "DELIVERY",
  "deliveryAddress": { ... } | null,
  "paymentMethod": "CARD" | "MPESA" | "EMOLA" | "CASH",
  "contactEmail": "string",
  "contactPhone": "string"
}
```

### Closed-store handling — defensive only, not the primary mechanism

Because the frontend now knows a cart's store open/closed state
up front (`isStoreOpen` on `GET /api/v1/carts`) and never calls
place-order while it reads closed — client-side saves a draft instead
(§1b) — Checkout itself should **still** reject a closed-store attempt
defensively, purely to cover the race where the store closes between
the frontend's last check and this request landing:

| Status | Code | When |
|---|---|---|
| `409` | `STORE_CLOSED` | Store is closed at the moment this request is processed |

No `opensAt`/hours payload needed on this error — it's a same-session
retry-safety net, not something the UI is expected to show a message
from (the frontend already knew and already handled the closed case
before ever calling this endpoint). Keep the body minimal:
`{ "code": "STORE_CLOSED", "message": "A loja está fechada.", "details": [] }`.

### `PENDING_STORE_OPEN` — not used by this feature at all

Confirmed per user clarification: **no order is ever created while a
store is closed**, so this feature has no use for that status, not even
as a fallback. If `PENDING_STORE_OPEN` already exists as an enum value
for other reasons, leave it alone — it's simply irrelevant to this
flow, not something to actively remove on backend's account.

---

## 3. KONECTA-STORES-AND-STOCK-SERVICE — nothing new required

The existing `isOpen: boolean` (already present on `NearbyShop`,
`PublicShop`, etc., and already what Cart/Checkout can read
server-to-server) is sufficient for this design — the UI only needs to
know open-or-not, not display an exact reopening time, since the flow
is "your data is saved, come back whenever the store opens" rather than
a countdown. No change requested here for this feature.

(The `address`/`neighborhood`-on-public-shop-row enhancement from the
original Checkout report, `API_REFERENCE_CHECKOUT.md`, still stands
separately — unrelated to this.)

---

## 4. KONECTA-SECURITY-SERVICE — nothing needed

No profile/auth field is implicated by multi-cart or the draft-on-cart
design.

---

## Frontend status

**Not yet implemented** — backend hasn't built any of the above yet
either. Once it exists, expect: `lib/cart/*` reworked from a
singular-cart model to a list-of-carts model, a cart-switcher screen,
the global cart icon's click handler gaining the routing logic in rule
4 above, `CheckoutView.tsx` prefilling from a cart's `checkoutDraft`
when present (instead of always from profile defaults) and saving a
draft via `PUT .../checkout-draft` instead of calling place-order when
the store reads closed, and `placeOrder()` gaining the `storeId` field.
