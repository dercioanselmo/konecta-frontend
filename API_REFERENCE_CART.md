# KONECTA Cart microservice — proposed API contract

**Status: RESOLVED — superseded 2026-09-05.** The real Cart microservice
now exists and matches this proposal almost exactly (including the
`STORE_MISMATCH` shape and error codes) — see
`API_REFERENCE-cart-service-response-frontend.md` for the actual live
contract, which is what the frontend now runs against
(`lib/cart/cartApi.ts` → `http://localhost:8093`, `CART_API_BASE_URL`).
The mock (`lib/cart/mockStore.ts`) has been deleted. One thing this
proposal got wrong worth noting: it assumed `unitPrice` would stay
`null` forever without a public `price` field on the Stores-and-Stock
product list — the real service doesn't have that problem, since it
resolves price server-to-server directly against Stores-and-Stock, not
through the public browsing endpoint. Live-verified: adding a real
product now returns a real `unitPrice`/`lineTotal`/`subtotal` and
`valid: true`, no more "Preço indisponível". This document is kept
below **for historical reference only** — do not build against it.

---

*Original proposal follows, unchanged, for reference:*

This
document is the mandatory end-of-slice backend report required by
`AGENTS.md`'s Cart section — everything below is what the frontend needs,
not a confirmed live contract. The frontend currently runs against a
clearly-marked **mock** (`lib/cart/mockStore.ts`, behind an httpOnly
cookie) that implements this exact contract server-side inside the
Next.js app, so swapping the mock for real calls to the Cart service
later requires **no UI change** — only `lib/cart/client.ts`'s `fetch`
targets move from `/api/cart/**` (our own BFF) to wherever the real
service ends up proxied from.

Eureka name (per AGENTS.md): `KONECTA-CART-SERVICE` (placeholder — adjust
to whatever the backend team actually registers).

---

## Why this exists

Product rule (KONECTA BRD, AGENTS.md §4 of the Cart section): **a cart
belongs to exactly one store.** Adding a product from a second store must
not silently merge — the UI needs a `STORE_MISMATCH` signal it can turn
into a "replace cart?" prompt, not a generic error.

The frontend does **not** decrement stock or own price truth — this
service is expected to validate against Stores-and-Stock itself
(server-to-server, own integration, out of scope for this doc) and
return authoritative, already-validated line data. The frontend never
fabricates a price or stock state it doesn't have from a real response.

---

## Auth

Every endpoint below requires a valid KONECTA-SECURITY-SERVICE JWT
(`Authorization: Bearer <token>`) — any authenticated role can have a
cart (a merchant or courier can also be a person buying something), not
role-restricted the way admin/merchant endpoints are elsewhere. `401` for
missing/invalid token.

---

## `GET /api/v1/cart`

Returns the caller's cart, creating an empty one implicitly if they don't
have one yet (no separate "create cart" call needed).

**Response `200 OK`**

```json
{
  "storeId": "uuid | null",
  "storeName": "string | null",
  "storeLogoUrl": "string | null",
  "items": [
    {
      "id": "uuid",
      "productId": "uuid",
      "name": "string",
      "photoUrl": "string | null",
      "unitPrice": 350.0,
      "quantity": 2,
      "lineTotal": 700.0,
      "active": true,
      "inStock": true
    }
  ],
  "itemCount": 2,
  "subtotal": 700.0,
  "valid": true
}
```

- `unitPrice`/`lineTotal` are the **current, revalidated** price — if it
  changed since the item was added, this reflects the new price, not a
  stale one (the UI shows this as a plain updated number today; a
  "price changed" banner can be layered on later if useful, not required
  for this phase).
- `active`/`inStock` reflect the product's **current** state — this is
  what gives "revalidation feedback" (AGENTS.md's Cart section): a
  product that went inactive or out of stock after being added still
  shows in the cart, flagged, rather than silently vanishing.
- `valid` — `true` only if the cart is non-empty and every line is
  `active && inStock` with a known price. The frontend disables "Ir para
  checkout" whenever this is `false`.
- Empty cart: `storeId: null`, `items: []`, `subtotal: 0`, `valid: false`.

---

## `POST /api/v1/cart/items`

Add a product to the cart (or increase quantity if it's already there).

**Request body**

| Field | Type | Notes |
|---|---|---|
| `shopId` | uuid, required | |
| `productId` | uuid, required | |
| `quantity` | int, optional | Default `1`. Added to existing quantity if the line already exists. |

**Response `201 Created`** — the full updated cart (same shape as `GET`).

**Errors**

| Status | Code | When | Notes |
|---|---|---|---|
| `409` | `STORE_MISMATCH` | Cart already has items from a different shop | Body includes `currentStoreId`, `currentStoreName` so the UI can render the conflict prompt without a second call. |
| `404` | `PRODUCT_NOT_FOUND` | Unknown `productId` (or doesn't belong to `shopId`) | |
| `409` | `PRODUCT_INACTIVE` | Product exists but isn't currently sellable | |
| `409` | `INSUFFICIENT_STOCK` | Requested (or resulting) quantity exceeds available stock | |
| `404` | `SHOP_NOT_FOUND` | Unknown or non-active `shopId` | |

```json
{
  "code": "STORE_MISMATCH",
  "message": "O carrinho já tem produtos de outra loja.",
  "currentStoreId": "uuid",
  "currentStoreName": "Loja Real"
}
```

**Replace-cart flow** (frontend-driven, no dedicated endpoint proposed):
on `STORE_MISMATCH`, the UI offers "Substituir carrinho" → calls
`DELETE /api/v1/cart` then retries this same `POST`. A combined
`POST /api/v1/cart/replace` endpoint would save one round trip if
preferred, but isn't required.

---

## `PATCH /api/v1/cart/items/{itemId}`

Set a line's quantity directly (not increment).

**Request body**: `{ "quantity": 3 }` — integer. **`quantity <= 0`
removes the line** (same effect as `DELETE`, whichever is more natural
to implement; the frontend calls `DELETE` directly in that case today,
so this convenience isn't load-bearing).

**Response `200 OK`** — the full updated cart.

**Errors**: `404 PRODUCT_NOT_FOUND` (unknown `itemId` for this cart),
`409 INSUFFICIENT_STOCK`.

---

## `DELETE /api/v1/cart/items/{itemId}`

Remove one line. **Response `200 OK`** — the full updated cart (not
`204`, so the frontend doesn't need a follow-up `GET`).

---

## `DELETE /api/v1/cart`

Clear the entire cart (used directly, and as the first half of the
replace-cart flow above). **Response `200 OK`** — the empty cart shape.

---

## Data model

### `Cart`

| Field | Type |
|---|---|
| `storeId` | uuid \| null |
| `storeName` | string \| null |
| `storeLogoUrl` | string \| null |
| `items` | `CartItem[]` |
| `itemCount` | int — sum of all line quantities |
| `subtotal` | decimal \| null — null only if any line's price is unknown, never fabricated |
| `valid` | boolean |

### `CartItem`

| Field | Type |
|---|---|
| `id` | uuid — line id, not `productId` |
| `productId` | uuid |
| `name` | string |
| `photoUrl` | string \| null |
| `unitPrice` | decimal \| null |
| `quantity` | int |
| `lineTotal` | decimal \| null |
| `active` | boolean |
| `inStock` | boolean |

---

## What the mock does differently from the real thing (so this is obvious when swapped out)

- Persists state in a per-browser httpOnly cookie, not a real per-user
  database row — works for one browser/device only, doesn't survive
  clearing cookies, and two tabs share state only because they share the
  cookie jar (not real multi-device sync).
- Resolves product name/photo by fetching the **public**
  `GET /shops/{shopId}/products` list and searching it client-side within
  the mock (inefficient, and only sees the first 200 products per shop) —
  the real service is expected to look products up directly, presumably
  server-to-server with Stores-and-Stock, not through the public list.
- `unitPrice`/`lineTotal` are always `null` today because the public
  products list has no `price` field yet (see the small addition proposed
  in `API_REFERENCE_MERCHANT_DASHBOARD.md`) — **not** a Cart-service gap,
  a Stores-and-Stock one, but it blocks the cart from ever reaching
  `valid: true` until fixed.
- `active`/`inStock` are approximated from the product row's own
  `active`/`stockQuantity` fields **if the public endpoint ever adds
  them** — today it doesn't, so the mock defaults every line to
  `active: true, inStock: true` (optimistic, not a real check). The real
  service must not do this — it should reflect the actual current state.

---

## Frontend status

Fully built against this contract: `lib/cart/types.ts`, `lib/cart/client.ts`
(the real HTTP client, already correct), `lib/cart/mockStore.ts` (the
temporary mock, isolated so it's a one-file swap later), `lib/cart/useCart.ts`
(SWR-backed hook, single source of truth, no shadow state). UI: cart badge
in `components/customer/CustomerHeader.tsx` (only rendered for a known
logged-in user, since the cart API 401s otherwise), add-to-cart buttons
+ store-mismatch modal in `components/customer/ProductGrid.tsx` (used on
the product-browsing page), and the `/cart` page itself
(`app/cart/CartView.tsx`) — store header, line items with quantity
steppers, per-line revalidation messaging, subtotal, and an "Ir para
checkout" CTA that's disabled (`valid: false`) whenever any line has an
unknown price or is inactive/out of stock. `/checkout` is a placeholder
"coming soon" page per this phase's explicit scope (AGENTS.md: "Do not
implement checkout, payment, address, or order placement in this phase").

Live-verified against the mock through the real running app: add →
correct store name/product name, honest `unitPrice: null`; second add
from a different shop → `409 STORE_MISMATCH` with the right
`currentStoreName`; quantity update → persists and recomputes
`itemCount`. Not yet verified against a real Cart service, since one
doesn't exist yet.

`tsc --noEmit`, `eslint`, `npm run build` all clean.
