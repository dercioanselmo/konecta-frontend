# KONECTA Cart Service — API reference

**Status: implemented and live-verified.** Everything below was exercised
against a running instance of this service (port `8093`), the real
`KONECTA-SECURITY-SERVICE`, and the real `KONECTA-STORES-AND-STOCK-SERVICE`
— not mocks. Example payloads are taken from that run.

Eureka name: `KONECTA-CART-SERVICE` · Local base URL: `http://localhost:8093`

---

## Swagger / OpenAPI

Active, no token required (same allowlist as `/actuator/health`):

| What | Where |
|---|---|
| Interactive UI | `GET /swagger-ui.html` → 302 redirect to `/swagger-ui/index.html` (springdoc's normal behavior) |
| Raw spec | `GET /v3/api-docs` → 200 OK, OpenAPI 3 JSON |

Point Postman's "import OpenAPI URL", or any codegen tool, at `/v3/api-docs`
once the service is running.

---

## Auth

Every endpoint below requires `Authorization: Bearer <accessToken>` from
`KONECTA-SECURITY-SERVICE`. **Any authenticated role** works — Customer,
Merchant, Merchant Staff, Admin all get their own cart; there is no role
restriction. The cart owner is always the JWT's `sub` claim — nothing in a
request body can override it.

No token, or an expired/malformed one → `401`:

```json
{ "code": "UNAUTHENTICATED", "message": "Autenticação necessária", "details": [], "timestamp": "..." }
```

---

## `GET /api/v1/cart`

Returns the caller's cart. If they don't have one yet, an empty one is
created implicitly — no separate "create cart" call. Every line's
price/active/stock is re-checked against Stores-and-Stock **on every
call**, not read from what was last saved.

**Response `200 OK`** — always, even for a brand-new empty cart.

Live example:

```json
{
  "storeId": "e060c908-bc88-4e02-b7a1-0fd4a3d01504",
  "storeName": "Loja Teste E2E 2",
  "storeLogoUrl": "https://konecta-media-....s3.amazonaws.com/stores/.../logo.png?X-Amz-...",
  "items": [
    {
      "id": "8736e6df-6eb6-45dd-a73e-f89d32508097",
      "productId": "c0042b64-ae37-4274-bc1f-f4d08838c7ae",
      "name": "Arroz 5kg Premiumz",
      "photoUrl": "https://konecta-media-..../products/..../f62ae936....jpg?X-Amz-...",
      "unitPrice": 400.01,
      "quantity": 2,
      "lineTotal": 800.02,
      "active": true,
      "inStock": true
    }
  ],
  "itemCount": 2,
  "subtotal": 800.02,
  "valid": true
}
```

Empty cart: `storeId: null, storeName: null, storeLogoUrl: null, items: [], itemCount: 0, subtotal: 0, valid: false`.

---

## `POST /api/v1/cart/items`

Adds a product, or — if that `productId` is already a line in the cart —
increases its quantity by the amount given (not a replace). The first
product added locks the cart to that `shopId` until it's emptied.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `shopId` | uuid | yes | Which shop's catalog `productId` resolves against. |
| `productId` | uuid | yes | Looked up server-side for name/price/stock/active — never trust client-supplied values for these. |
| `quantity` | int | no | Defaults to `1`. Added to the existing line's quantity if the product is already in the cart. |

Live example:

```json
{ "shopId": "e060c908-bc88-4e02-b7a1-0fd4a3d01504", "productId": "c0042b64-ae37-4274-bc1f-f4d08838c7ae", "quantity": 2 }
```

**Response `201 Created`** — full updated cart, same shape as `GET /cart`.

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `STORE_MISMATCH` | Cart already has items from a different shop. Body adds `currentStoreId` + `currentStoreName` (see below). |
| `404` | `SHOP_NOT_FOUND` | Unknown shop, or shop isn't `ACTIVE`. |
| `404` | `PRODUCT_NOT_FOUND` | Unknown `productId`, or it doesn't belong to `shopId`. |
| `409` | `PRODUCT_INACTIVE` | Product exists but the merchant has switched it off. |
| `409` | `INSUFFICIENT_STOCK` | Requested quantity (existing + new) exceeds live stock. |
| `503` | `STOCK_SERVICE_UNAVAILABLE` | Stores-and-Stock is down/timing out — the add is refused rather than risk overselling. |

`STORE_MISMATCH` body — live example:

```json
{
  "code": "STORE_MISMATCH",
  "message": "O carrinho já tem produtos de outra loja.",
  "currentStoreId": "e060c908-bc88-4e02-b7a1-0fd4a3d01504",
  "currentStoreName": "Loja Teste E2E 2"
}
```

No dedicated "replace" endpoint. The intended flow — `DELETE /cart` then
retry the `POST` — is what the frontend's mock already does.

---

## `PATCH /api/v1/cart/items/{itemId}`

Sets the quantity directly (not an increment, unlike `POST`). `itemId` is
the cart **line** id from a previous response's `items[].id` — not
`productId`.

**Request body**: `{ "quantity": <int> }` — `<= 0` removes the line
entirely (same result as `DELETE` on it).

**Response `200 OK`** — full updated cart.

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `PRODUCT_NOT_FOUND` | Unknown `itemId` for this cart (also used if the underlying product vanished from Stores-and-Stock entirely). |
| `409` | `INSUFFICIENT_STOCK` | New quantity exceeds live stock. |

---

## `DELETE /api/v1/cart/items/{itemId}`

Removes that line only. If it was the last line, the cart's `storeId`
clears too, so the next add can be from any shop.

**Response `200 OK`** — full updated cart (**not** `204`, so no follow-up
`GET` is needed).

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `PRODUCT_NOT_FOUND` | Unknown `itemId` for this cart — including another user's item id. |

---

## `DELETE /api/v1/cart`

Empties every line and clears `storeId`. Also the first half of the
store-mismatch "replace cart" flow above.

**Response `200 OK`** — the empty-cart shape (see `GET /cart`).

---

## Data models

The exact same two shapes are returned by all five endpoints above.

### `Cart`

| Field | Type | Notes |
|---|---|---|
| `storeId` | uuid \| null | null on an empty cart |
| `storeName` | string \| null | live from Stores-and-Stock, not cached |
| `storeLogoUrl` | string \| null | presigned S3 URL, expires ~1h |
| `items` | `CartItem[]` | — |
| `itemCount` | int | sum of all line quantities, not line count |
| `subtotal` | decimal \| null | `null` only if any line's price is unknown — never a fabricated number. `0` on an empty cart. |
| `valid` | boolean | true only if non-empty and every line is active + in-stock + priced. Gate "Ir para checkout" on this. |

### `CartItem`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | the **line** id — use this for PATCH/DELETE, not `productId` |
| `productId` | uuid | — |
| `name` | string | live product name (falls back to last-known snapshot if Stock is briefly unreachable) |
| `photoUrl` | string \| null | primary photo, or first available |
| `unitPrice` | decimal \| null | live IVA-inclusive price; null if unresolvable right now |
| `quantity` | int | — |
| `lineTotal` | decimal \| null | `unitPrice × quantity`, or null if price is null |
| `active` | boolean | live merchant on/off flag |
| `inStock` | boolean | live stock ≥ this line's quantity |

### `ApiError` — every error except `STORE_MISMATCH`

| Field | Type | Notes |
|---|---|---|
| `code` | string | machine-readable, see table below |
| `message` | string | Portuguese, human-readable |
| `details` | string[] | field-level notes on 400s; empty otherwise |
| `timestamp` | ISO 8601 | — |

### `StoreMismatchError` — `409 STORE_MISMATCH` only

| Field | Type | Notes |
|---|---|---|
| `code` | string | always `"STORE_MISMATCH"` |
| `message` | string | — |
| `currentStoreId` | uuid | the shop already in the cart |
| `currentStoreName` | string \| null | for the "replace cart?" prompt copy |

---

## Error codes at a glance

| Status | Code | Where it can occur |
|---|---|---|
| `401` | `UNAUTHENTICATED` | any endpoint — missing/invalid/expired token |
| `403` | `ACCESS_DENIED` | any endpoint — reserved; not currently reachable, since every role is allowed |
| `400` | `VALIDATION_ERROR` | POST/PATCH — missing `shopId`/`productId`, non-numeric `quantity`, etc. |
| `404` | `SHOP_NOT_FOUND` | POST |
| `404` | `PRODUCT_NOT_FOUND` | POST, PATCH, DELETE (item) — including a cross-user itemId |
| `409` | `STORE_MISMATCH` | POST — extended body, see Data models |
| `409` | `PRODUCT_INACTIVE` | POST |
| `409` | `INSUFFICIENT_STOCK` | POST, PATCH |
| `503` | `STOCK_SERVICE_UNAVAILABLE` | POST, PATCH — Stores-and-Stock unreachable during the specific add/update being made |
| `500` | `INTERNAL_ERROR` | anything unhandled |

---

## Behavior worth knowing before building the UI

| Rule | Detail |
|---|---|
| **Mono-store** | A cart holds lines from exactly one shop. The *first* add sets it; every later add from a different shop `409`s with `STORE_MISMATCH` instead of silently merging. |
| **Live data** | `unitPrice`, `active`, and `inStock` are re-fetched from Stores-and-Stock on *every* response, not read from what was saved when the item was added. If a price changed since add, the UI sees the new number immediately — no separate "price changed" event to listen for. |
| **Degrade, don't crash** | If Stock is briefly unreachable while building a *read* response, the affected line degrades to `active: false, inStock: false, unitPrice: null` (name/photo fall back to the last-known value) rather than failing the whole `GET`. A mutation actively being made (the item in a `POST`/`PATCH`) instead hard-fails with `503` — never oversell on a guess. |
| **No stock held** | Adding to cart never reserves or decrements inventory. Two customers can each add the last unit; stock is only truly consumed at checkout (out of this service's scope). |
| **Empty = invalid** | An empty cart reports `valid: false`, same as a non-empty one with a problem line — both should disable "Ir para checkout" the same way. |
| **Ownership** | The cart is looked up by the caller's JWT `sub` — there is no way to read or mutate another user's cart. Verified live against four real accounts of different roles (Admin, Merchant, Merchant Staff, Customer). |

---

## Backend package layout (for reference, not part of the contract)

```
com.konecta.cart_service
├── controller/   CartController
├── service/      CartService, StoreCatalogService, ServiceTokenProvider
├── repository/   CartRepository
├── entity/       Cart, CartItem
├── dto/          request/response shapes + error bodies
├── exception/    ApiException, StoreMismatchException, GlobalExceptionHandler
├── security/     SecurityConfig, JwtRolesConverter, RestAuthEntryPoints, CurrentUser
└── client/       StoresAndStockClient (Feign)
```

Full implementation notes and design rationale live in `context.md`.
