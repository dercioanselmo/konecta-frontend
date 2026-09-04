# Merchant Dashboard — API reference

**This backend is live.** This file has been rewritten from the original
frontend-authored spec to describe what the **Stores-and-Stock service**
actually implements today, verified against a running instance with real
JWTs issued by KONECTA-SECURITY-SERVICE. Sections the backend does **not**
own (Orders, Sales, Receipts) are called out explicitly — see
[What's not here](#whats-not-here) — rather than removed, so the frontend
knows what to stub vs. what to wire up now.

> One section below is **not** live yet:
> [PROPOSED — `MERCHANT_STAFF` access to product endpoints](#proposed--merchant_staff-access-to-product-endpoints-not-yet-implemented) —
> every write endpoint in this service currently rejects `MERCHANT_STAFF`
> tokens outright, confirmed live; that section spells out exactly what
> needs to change.

**Product photo and shop logo/cover upload is now implemented — via a
private S3 bucket, not a multipart endpoint on this service.** This is a
**breaking change from the previous revision of this doc**, which had it
as a single `multipart/form-data POST`. The real flow is presigned and
two-step:

1. Ask this service for a presigned upload URL (`POST .../presign`,
   `{ contentType }` → `{ uploadUrl, key, expiresAt }`).
2. Upload the file **directly to S3** with a plain `PUT` to `uploadUrl` —
   this service is not in that request at all, so don't send an `
   Authorization` header on that call, and don't route it through this
   API. `Content-Type` on the `PUT` must match what you presigned.
3. Tell this service the upload finished (`POST .../presign`'s sibling
   endpoint without `/presign`, body `{ key }`) — it verifies the object
   actually landed in S3 and returns the created resource.

See [Photos](#photos) and the logo/cover endpoints under
[Shops](#1-shops) for the exact paths. Every photo/logo/cover `url` this
API returns is a **presigned GET URL that expires** (1 hour by default)
— don't cache it long-term, re-fetch the parent resource if displaying
an image beyond that window.

Full request/response contracts (including what changed from the original
spec, and why) live in this service's `context.md` — treat this file as
the frontend-facing summary of that.

**Base URL (local):** `http://localhost:8092`
**Eureka service name:** `KONECTA-STORES-AND-STOCK-SERVICE`

**Swagger / OpenAPI is live** (springdoc): interactive docs at
`http://localhost:8092/swagger-ui.html`, raw spec at
`http://localhost:8092/v3/api-docs`. Both are public (no token needed to
view them — you still need a real token to actually call anything from
the "Try it out" panel). Useful as a live cross-check against this
document, but this document is the one written for how the frontend
actually consumes each endpoint — springdoc only reflects the Java method
signatures, not usage notes like presign flows or Portuguese error text.

---

## Auth

`Authorization: Bearer <accessToken>` — the **same** access token the Auth
service already issues. No new login/token mechanism.

- Role `MERCHANT` required on every endpoint below except `GET
  /api/v1/meta/categories` (public).
- No token → `401`, code `UNAUTHENTICATED`.
- Valid token, wrong role → `403`, code `ACCESS_DENIED`.
- A `{shopId}` that exists but isn't owned by the caller → `404`, code
  `SHOP_NOT_FOUND` (not `403` — avoids confirming the shop's existence to
  a non-owner).
- Error envelope, same shape as the Auth service's — `code` is a
  machine-readable English identifier; **`message` and `details` are in
  Portuguese** (this is a Portuguese-language product) rather than
  English validation defaults:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Falha na validação do pedido",
  "details": ["quantity: não pode ser negativo"],
  "timestamp": "2026-09-02T21:13:36.003771Z"
}
```

- Any unexpected server-side error also now comes back in this same
  envelope (`500 {"code":"INTERNAL_ERROR", "message": "Ocorreu um erro
  interno. Tente novamente.", ...}`) instead of falling through to a bare
  framework error page — if you see a `500` with no `code`/`message`
  fields at all going forward, that's worth flagging again, since it
  would mean something bypassed our error handling entirely.

---

## RESOLVED — `MERCHANT_STAFF` access to product endpoints

**Fixed on the backend** (per merchant confirmation, 2026-09-02) — leaving
the original write-up below for reference.

**Confirmed live** (real staff account, real shop, real product): every
write endpoint in this service currently returns `403 ACCESS_DENIED` for
a `ROLE_MERCHANT_STAFF` token — `POST .../products`,
`PATCH .../products/{id}`, `PATCH .../products/{id}/stock`,
`PATCH .../products/{id}/active`, and `PATCH /merchant/shops/{shopId}`
all rejected identically. Reads (`GET`) work fine for staff already.

**The product ask**: `MERCHANT_STAFF` should have full read/write access to
everything under `/merchant/shops/{shopId}/products/**` (create, edit,
stock adjust, active toggle, photo upload/delete/set-primary) for the one
shop they're assigned to — same permissions as `MERCHANT` there. They
should **stay blocked** from shop-level writes: `PATCH /merchant/shops/{shopId}`,
the logo/cover endpoints, `PATCH .../status`, `PUT .../hours`. (Staff
management itself — `/merchant/staff/**` — isn't even this service's
concern, it lives on the Security service and is already `MERCHANT`-only
there.)

**How to tell the two apart**: per
`API_REFERENCE-security-service.md`'s `MERCHANT_STAFF` JWT claims, a staff
access token carries a `shopId` claim (the one shop they're assigned to)
alongside `roles: "ROLE_MERCHANT_STAFF"`. Proposed authorization rule for
every endpoint in this service:

- `ROLE_MERCHANT` + `{shopId}` in the path owned by `jwt.sub` → allowed
  everywhere (unchanged, this already works).
- `ROLE_MERCHANT_STAFF` + `{shopId}` in the path **equal to `jwt.shopId`**
  → allowed on `/merchant/shops/{shopId}/products/**` (all methods) and
  `/merchant/shops/{shopId}/dashboard/summary` (`GET`, already presumably
  fine since it's a read). **Not** allowed on any other
  `/merchant/shops/{shopId}/**` endpoint (profile, logo, cover, status,
  hours) — those stay `MERCHANT`-only.
- `ROLE_MERCHANT_STAFF` with a `{shopId}` in the path that **doesn't**
  match their token's `shopId` claim → `403`/`404`, same as a non-owner
  `MERCHANT` today.

This doesn't require a call back to the Security service — the `shopId`
claim already on the token is enough to decide the above locally.

---

## RESOLVED — Admin access to shop management

**Ask** (unchanged): the Admin panel has a "Lojas" section where an Admin
can browse every shop on the platform and manage any one of them with the
same capabilities as its owning `MERCHANT` — dashboard, products
(create/edit/stock/active/photos), opening hours, and shop settings
(profile, logo, cover, pause/resume). Staff management is explicitly
**out of scope**. Creating a new shop and `GET /merchant/shops` ("list my
shops") deliberately stayed `MERCHANT`-only — correct, an Admin owns no
shops.

**Item 1 — widen the role gate on `/merchant/shops/**`: done, fully
live-verified 2026-09-03** with a real `ROLE_ADMIN` JWT against a real
shop (`14b4dbe9-d975-4d75-9bb7-39118dcd5828`, "Loja Real"):
`GET /merchant/shops` (list) still correctly `403`s (merchant-only, as
intended); `GET` on the shop profile, dashboard summary, product list,
and hours all returned `200` with real data; `PATCH` on the shop profile
(`description`) returned `200` and the change persisted. Root cause was
the same class of bug as the earlier `MERCHANT_STAFF` gap — `@PreAuthorize`
blocking before the existing admin-bypass logic in the `getOwned` service
methods was ever reached. Automated suite has
`admin_canManageAnyShopButNotCreateOne` passing (32/32) per backend.
Note: the live `PATCH` above left a real, visible change on "Loja Real"'s
`description` field ("Verificado via admin - live check 2026-09-03") —
harmless test-data mutation, flagging in case it's confusing later.

**Item 2 — `GET /api/v1/admin/shops`: done, fully live-verified
2026-09-03.** The earlier `500` was traced by backend to a stale process
on `:8092` predating the feature (started before `AdminShopController`
existed) — not a code bug. Against the restarted, current-code instance,
all three original repro cases return `200` with real data (2 shops,
correct pagination envelope, one row with a real presigned S3 logo URL).
`ownerName`/`ownerEmail` come back `null` as documented/expected (no
Security-service client wired up yet to resolve them from `ownerId`).

Response shape (confirmed live):

```json
{
  "content": [{
    "id": "uuid",
    "name": "string",
    "logoUrl": "string | null",
    "status": "DRAFT | PENDING_REVIEW | ACTIVE | SUSPENDED | CLOSED",
    "isOpen": true,
    "ownerId": "uuid",
    "ownerName": "string | null",
    "ownerEmail": "string | null",
    "createdAt": "ISO-8601"
  }],
  "page": 0, "size": 20, "totalElements": 2, "totalPages": 1
}
```

**Frontend status**: fully built, wired, and now live-verified end to
end (`/admin/shops` list page, `/admin/shops/{shopId}` dashboard/products/hours/settings
— reusing the exact same components as the Merchant dashboard), including
graceful handling of the still-null owner fields (falls back to
rendering the raw `ownerId`). **Feature is closed** — only remaining
open item is the known/accepted `ownerName`/`ownerEmail` gap, which is
not a blocker.

---

## Confirmed: multi-shop model

The multi-shop assumption from the original spec is confirmed and built
exactly as proposed: one merchant owns N shops, every resource below is
scoped under `/api/v1/merchant/shops/{shopId}/...`, and the backend
verifies `{shopId}` belongs to `jwt.sub` on every call (`ROLE_ADMIN`
bypasses this check; no admin-facing routes are exposed yet, but the
underlying service methods already support it).

---

## 1. Shops

### `GET /api/v1/merchant/shops` — list the caller's shops

**Response `200 OK`**

```json
[
  {
    "id": "14b4dbe9-d975-4d75-9bb7-39118dcd5828",
    "name": "Loja Real",
    "logoUrl": null,
    "isOpen": false,
    "lowStockCount": 1
  }
]
```

> **Changed from the original spec:** `todaySalesTotal` and
> `pendingOrdersCount` are **not returned** — they require the
> Orders/Payments database, which this service does not own (see
> [What's not here](#whats-not-here)). Don't fake them client-side;
> just don't render those two fields yet.

**PROPOSED small addition (2026-09-04)**: add `categories: Category[]`
to this list response too — it's already on the single-shop `GET`, just
missing here. Ask: the merchant's `/merchant` shop-picker dashboard wants
to show each shop's category as a small badge without an extra request
per shop. Frontend (`ShopSummary.categories?`) already treats it as
optional and simply won't render a badge until this ships — no urgency,
whenever convenient.

### `POST /api/v1/merchant/shops` — create a shop

**Request body** — unchanged from the original spec:

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `nuit` | string | Optional at creation, but required (along with address/city/neighborhood) before the shop shows `status: "ACTIVE"` |
| `address` | string | Required |
| `city` | string | Must be `"Maputo"` — anything else is `400 VALIDATION_ERROR` |
| `neighborhood` | string | Free string for now (see [Categories/taxonomy note](#whats-not-here)) |
| `phone` | string | Not yet validated against the MZ format Auth uses |
| `categoryIds` | uuid[], optional | **Changed since the categories section below was written**: a store can now belong to **several** top-level categories (was a single free-string `category`). Ids come from `GET /api/v1/meta/categories`. Unknown id → `400 VALIDATION_ERROR`. |
| `description` | string, optional | |

**Response `201 Created`** — a [`Shop`](#shop). If `name` + `nuit` +
`address` + `city` + `neighborhood` are all present, the shop is created
`ACTIVE` immediately; otherwise it's `DRAFT` (see `status` /
`activationReady` on the model — this is new versus the original spec,
which didn't have an explicit status machine).

**Errors**: `400 VALIDATION_ERROR` (missing required field, or `city` ≠
`"Maputo"`).

### `GET /api/v1/merchant/shops/{shopId}` — full shop profile

Returns the full [`Shop`](#shop) model.

### `PATCH /api/v1/merchant/shops/{shopId}` — edit profile fields

Same field set as create, all optional/partial. Also accepts `logoUrl`,
`coverUrl`, `acceptsPickup`, `acceptsDelivery` (new — not in the original
spec's request body, but present on the `Shop` model). `categoryIds`
**replaces** the full set when sent (omit to leave categories unchanged,
send `[]` to clear all). If the shop was `DRAFT` and the edit fills in
the last missing activation field, `status` flips to `ACTIVE`
automatically as part of this call — no separate "activate" endpoint.

### Logo / cover upload — presigned, two calls each

Same pattern for both `logo` and `cover` (swap the path segment):

#### `POST /api/v1/merchant/shops/{shopId}/logo/presign`

**Request body**: `{ "contentType": "image/jpeg" }` (JPEG/PNG/WEBP only).

**Response `200 OK`**: `{ "uploadUrl": "https://konecta-media-....s3.amazonaws.com/stores/.../logo/xyz.jpg?X-Amz-...", "key": "stores/{shopId}/logo/xyz.jpg", "expiresAt": "..." }`

Then `PUT` the raw file bytes to `uploadUrl` yourself, `Content-Type`
header matching what you presigned — **not through this API**, directly
to S3.

#### `POST /api/v1/merchant/shops/{shopId}/logo`

**Request body**: `{ "key": "stores/{shopId}/logo/xyz.jpg" }` (the `key`
from the presign response above).

**Response `200 OK`** — the updated [`Shop`](#shop) (not just the URL —
one less merge step for the frontend). `logoUrl` in the response is a
fresh presigned GET URL.

**Errors**: `400 VALIDATION_ERROR` if the object isn't actually in S3
yet (the `PUT` in step 2 didn't finish or failed) or if `key` doesn't
belong to this shop.

`.../cover/presign` and `.../cover` work identically, setting `coverUrl`.

### `PATCH /api/v1/merchant/shops/{shopId}/status` — manual open/pause override

Unchanged from the original spec.

**Request body**: `{ "manuallyClosed": boolean, "reason": string? }`

**Response `200 OK`** — updated [`Shop`](#shop).

### `GET` / `PUT /api/v1/merchant/shops/{shopId}/hours` — opening hours

Unchanged from the original spec.

**`PUT` request body** — full week, replace-all:

```json
{
  "days": [
    { "day": "SEGUNDA", "opensAt": "08:00", "closesAt": "18:00", "closed": false },
    { "day": "DOMINGO", "opensAt": null, "closesAt": null, "closed": true }
  ]
}
```

`GET` returns the same shape. **`day` is Portuguese** (this changed from
an earlier draft that used English `DayOfWeek` names like `MONDAY`) —
one of `SEGUNDA, TERCA, QUARTA, QUINTA, SEXTA, SABADO, DOMINGO`,
Monday-first, uppercase, no accents (same style as `category` codes).
`isOpen` on the `Shop` model and shop-list cards is computed server-side
from this schedule plus the manual override, evaluated in
`Africa/Maputo` — confirmed working end-to-end, including overnight
windows (e.g. `21:00`→`02:00`).

---

### `PATCH /api/v1/merchant/shops/{shopId}/location` — GPS coordinates

**Implemented** (dedicated endpoint, matching `.../hours`). `MERCHANT`
(owner) or `ADMIN` (any shop); `MERCHANT_STAFF` → `403`.

**Request body** — both fields required together:

```json
{ "latitude": -25.9692, "longitude": 32.5732 }
```

**Response `200 OK`** — the updated `Shop`, now including `latitude`/
`longitude` (also present on plain `GET`, `null` until set).

**Errors**: `400 VALIDATION_ERROR` if outside a generous Maputo-area
bounding box (`lat -26.3..-25.7`, `lon 32.3..32.8` — covers Matola/KaTembe
too, a sanity check rather than precise city limits).

A missing location does **not** block `activationReady` — a shop can go
`ACTIVE` without ever setting one. Flag: once proximity-based search
ships (Phase 1 customer Home/Search), a shop with no location won't be
findable there — worth revisiting whether it should gate activation at
that point.

**Frontend**: new "Localização" tab in `ShopNav` (after "Definições"),
built with **Leaflet + OpenStreetMap** (not Google Maps — switched by
request, avoids any Cloud billing/API-key setup). Click-to-place or
drag the pin; address search and reverse-geocode confirmation both go
through Nominatim (OSM's free geocoder), proxied via `app/api/geo/search`
and `app/api/geo/reverse` so the browser never calls Nominatim directly
(keeps its usage-policy-required identifying `User-Agent` and rate
control server-side). Available to both Merchant and Admin via the
same `basePath` pattern as every other shop tab.

---

## 2. Products & stock

All under `/api/v1/merchant/shops/{shopId}/products`.

### `GET .../products` — list/search/paginate

**Query params**: `query` (name contains, case-insensitive), `categoryId`
(uuid — matches products in any subcategory under that category),
`subcategoryId` (uuid — exact match, takes precedence over `categoryId`
if both given), `active` (`true`/`false`), `lowStock` (`true` → only
items at/under their threshold), `page`, `size`, `sort`.

**Response `200 OK`** — a page envelope (this service's own shape, not
literally the Auth service's `PageResponse<T>`, but the same fields):

```json
{
  "content": [ /* Product[] */ ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1
}
```

### `POST .../products` — create

**Request body**

| Field | Type | Notes |
|---|---|---|
| `name` | string | Required |
| `description` | string | Required |
| `subcategoryId` | uuid, optional | **Changed since the categories section below was written**: was a free-string `category`, now a reference to a product-level subcategory (see [Category taxonomy](#category-taxonomy)). Ids from `GET /api/v1/meta/categories/{categoryId}/subcategories`. Unknown id → `400 VALIDATION_ERROR`. |
| `price` | number | IVA-inclusive, ≥ 0, required |
| `stockQuantity` | integer | Required, ≥ 0 |
| `lowStockThreshold` | integer, optional | Defaults to `5` |
| `active` | boolean | Default `true` |

Photos are **not** set here — this is a JSON body, not multipart. Upload
them separately after creating the product; see [Photos](#photos) below.

**Response `201 Created`** — a [`Product`](#product) (`photos: []` on a
freshly created one).

### `GET` / `PATCH .../products/{productId}` — detail / edit

Same field set as create (including `lowStockThreshold`), partial on
`PATCH`. Note: there's currently no way to explicitly **clear** a
product's `subcategoryId` via `PATCH` — omitting the field and sending
`null` both mean "leave unchanged" (same limitation as every other
optional field in this API).

### `PATCH .../products/{productId}/active?active=true|false` — archive/restore

Unchanged from the original spec. Query param, not a body.

### `PATCH .../products/{productId}/stock` — adjust stock

**Request body**: `{ "quantity": integer }` — sets the **absolute**
stock level, ≥ 0. Confirmed as implemented (no delta/audit-trail variant
— an internal `StockMovement` history is recorded server-side for every
adjustment, but there's no API to read it yet).

**Errors**: `400 VALIDATION_ERROR` on a negative quantity, e.g.:

```json
{ "code": "VALIDATION_ERROR", "message": "Falha na validação do pedido",
  "details": ["quantity: não pode ser negativo"], "timestamp": "..." }
```

### Photos

**Implemented — presigned S3 upload, two calls, not a multipart POST.**

#### `POST .../products/{productId}/photos/presign` — get an upload URL

**Request body**: `{ "contentType": "image/jpeg" }` (JPEG/PNG/WEBP only).

**Response `200 OK`**: `{ "uploadUrl": "https://konecta-media-....s3.amazonaws.com/products/.../xyz.jpg?X-Amz-...", "key": "products/{productId}/xyz.jpg", "expiresAt": "2026-09-02T21:18:00Z" }`

`uploadUrl` is valid for 5 minutes (`presign-put-ttl-seconds`). `PUT`
the raw file bytes there yourself, with a `Content-Type` header matching
what you presigned — **do not** send this through this service, and
don't send an `Authorization` header on that request (S3 doesn't want
one; the signature in the URL is the auth).

**Errors**: `400 VALIDATION_ERROR` for an unsupported `contentType`:

```json
{ "code": "VALIDATION_ERROR", "message": "Falha na validação do pedido",
  "details": ["contentType: formato não suportado (use JPEG, PNG ou WEBP)"], "timestamp": "..." }
```

#### `POST .../products/{productId}/photos` — confirm the upload

**Request body**: `{ "key": "products/{productId}/xyz.jpg" }` (the `key`
from the presign response).

**Response `201 Created`**: `{ "id": "uuid", "url": "https://....s3.amazonaws.com/...?X-Amz-...", "isPrimary": boolean }`
— matches the original spec's shape. `url` is a **presigned GET**, valid
1 hour (`presign-get-ttl-seconds`) — it will stop working after that;
re-fetch the product if you need the image later. The **first** photo
confirmed for a product is automatically `isPrimary: true`; later ones
default to `false` until explicitly promoted (see below).

**Errors**: `400 VALIDATION_ERROR` if the object isn't in S3 yet (the
`PUT` didn't finish or failed) or `key` doesn't belong to this product.

#### `DELETE .../products/{productId}/photos/{photoId}` — remove

`204 No Content`. Deletes the object from S3 too, not just the
database row. If the deleted photo was primary and others remain, the
next one (upload order) is auto-promoted — a product with photos always
has exactly one primary, never zero.

#### `PATCH .../products/{productId}/photos/{photoId}/primary` — set cover photo

No body. **Response `200 OK`**: `{ "id", "url", "isPrimary": true }`.

---

## User profile photo — different audience, read this carefully

**New.** `POST /api/v1/users/me/photo/presign` and
`POST /api/v1/users/me/photo` — **not** under `/merchant/shops/**`, and
**not role-restricted to `MERCHANT`** — any authenticated user (customer,
courier, admin, merchant) can call these, since a profile photo isn't a
merchant-business concept.

**Important — this service does not persist the result.** Stores-and-Stock
has no user table (KONECTA-SECURITY-SERVICE owns user profiles). These two
endpoints only get you a presigned upload URL and, after upload, hand back
a presigned GET URL for the file. **Your frontend is responsible for then
sending that URL to KONECTA-SECURITY-SERVICE** (e.g. `PATCH
/api/v1/users/me` there, if/when that service adds a photo field — check
its own reference doc) to actually save it on the user's profile. This
service is just S3 plumbing here, not the system of record.

Same presigned two-step pattern as everything else in this document:

#### `POST /api/v1/users/me/photo/presign`

**Request body**: `{ "contentType": "image/jpeg" }` (JPEG/PNG/WEBP only).

**Response `200 OK`**: `{ "uploadUrl": "https://konecta-media-....s3.amazonaws.com/users/{userId}/xyz.jpg?X-Amz-...", "key": "users/{userId}/xyz.jpg", "expiresAt": "..." }`

`{userId}` is the caller's own `sub` from their JWT — you can't presign
into another user's folder. `PUT` the raw bytes to `uploadUrl` yourself,
same rules as every other upload in this doc (matching `Content-Type`,
not through this API, no `Authorization` header on that request).

#### `POST /api/v1/users/me/photo`

**Request body**: `{ "key": "users/{userId}/xyz.jpg" }` (the `key` from
the presign response).

**Response `200 OK`**: `{ "url": "https://....s3.amazonaws.com/...?X-Amz-..." }`
— a presigned GET, 1 hour TTL, same as everywhere else. This is **not**
persisted anywhere by this call; use it to show an immediate preview,
then send it to the Security service to actually save.

**Errors**: `400 VALIDATION_ERROR` if the object isn't in S3 yet, or if
`key` doesn't belong to the caller.

---

## 3. Dashboard summary

### `GET /api/v1/merchant/shops/{shopId}/dashboard/summary`

**Response `200 OK`**

```json
{
  "isOpen": false,
  "productCount": 1,
  "activeProductCount": 1,
  "lowStockCount": 1
}
```

> **Changed from the original spec:** `salesTodayTotal`,
> `ordersTodayCount`, `ordersByStatus` are **not returned** — same reason
> as the shop-list cards above (Orders/Payments-dependent, not owned
> here). `productCount` / `activeProductCount` are new fields this
> service can compute honestly.

---

## Category taxonomy

**This section replaces the old free-string `category` field entirely.**
Categories are now a real, two-level, admin-managed taxonomy:

- **Category** (top-level, store-facing) — e.g. `SUPERMERCADO`, `BELEZA`.
  A shop can belong to **several** (`Shop.categories`, set via
  `categoryIds` on create/update — see §1 above).
- **Subcategory** (product-facing) — scoped to exactly one parent
  Category, e.g. `LEGUMES_E_FRUTAS` under `SUPERMERCADO`. A product
  references **one** subcategory (`Product.subcategoryId`).

Both levels are enforced by real foreign keys now (an unknown id is
`400 VALIDATION_ERROR`), not a free string.

### `GET /api/v1/meta/categories` — public, no auth required

Active top-level categories, for a shop-category picker.

**Response `200 OK`**

```json
[
  { "id": "12a1aaae-42d6-413d-8a86-ab951482fb93", "code": "SUPERMERCADO", "name": "Supermercado", "sortOrder": 1, "active": true },
  { "id": "d604474a-b880-4bc4-83c2-7ce1054149eb", "code": "MODA", "name": "Moda", "sortOrder": 2, "active": true },
  { "id": "5049977c-b938-4da5-9594-d07486195a55", "code": "ELETRONICA", "name": "Eletronica", "sortOrder": 3, "active": true },
  { "id": "464d57b3-8b90-4bc0-ab0d-1f97d65c06ec", "code": "RESTAURANTE", "name": "Restaurante", "sortOrder": 4, "active": true },
  { "id": "1450c832-1f9f-46ce-b6b9-d0974248be11", "code": "FARMACIA", "name": "Farmacia", "sortOrder": 5, "active": true },
  { "id": "5a3ad256-2bb9-4cc7-988f-06bdbf690f9b", "code": "BELEZA", "name": "Beleza", "sortOrder": 6, "active": true },
  { "id": "7836021c-87f4-4f85-a82b-7fde6e2614ff", "code": "CASA_E_JARDIM", "name": "Casa e Jardim", "sortOrder": 7, "active": true },
  { "id": "1a4f40ec-342f-40f7-a209-8c45ac14d3f3", "code": "OUTROS", "name": "Outros", "sortOrder": 99, "active": true }
]
```

Ids are stable per environment but not guaranteed identical across
environments — always resolve them via this endpoint, don't hardcode.

### `GET /api/v1/meta/categories/{categoryId}/subcategories` — public

Active subcategories under one category, for a product-subcategory
picker scoped to whichever top category the merchant picked for the
shop (or is browsing).

**Response `200 OK`**

```json
[
  { "id": "9223fbef-3099-493f-917d-226a8ee6b8d8", "categoryId": "12a1aaae-42d6-413d-8a86-ab951482fb93",
    "categoryCode": "SUPERMERCADO", "categoryName": "Supermercado",
    "code": "LEGUMES_E_FRUTAS", "name": "Legumes e Frutas", "sortOrder": 1, "active": true }
]
```

**Errors**: `404 CATEGORY_NOT_FOUND` for an unknown `categoryId`.

### Admin CRUD for categories/subcategories — now used by this frontend too

`ROLE_ADMIN` only. Originally deferred here as "a different frontend's
concern" — it isn't anymore, the Admin panel's "Categorias" section
(2026-09-04) is built against this, so documenting the actually-used
subset. Full detail lives in this service's own `context.md` §2/§4;
this is the frontend-relevant summary.

**`/api/v1/admin/categories`**

| Method | Notes |
|---|---|
| `GET` | All categories, active and inactive. |
| `POST` | Body `{ code*, name*, sortOrder?, active? }`. `code` uppercased server-side. `409 CATEGORY_CODE_ALREADY_EXISTS` on duplicate. |
| `GET /{categoryId}` | |
| `PATCH /{categoryId}` | Body `{ name?, sortOrder?, active? }` — `code` immutable after creation. |
| `DELETE /{categoryId}` | `204`. `409 CATEGORY_IN_USE` if it has subcategories or is assigned to any shop — deactivate (`active: false`) instead. |

**`/api/v1/admin/categories/{categoryId}/subcategories`** — same shape
one level down: `GET` (all under the category, `404 CATEGORY_NOT_FOUND`
if the category doesn't exist), `POST` (`409 SUBCATEGORY_CODE_ALREADY_EXISTS`
if the code is taken **within this category** — codes are per-category,
not global), `GET/PATCH/DELETE /{subcategoryId}` (`code` immutable,
`409 SUBCATEGORY_IN_USE` on delete if any product references it).

**Category images** — same presigned two-step pattern as shop logos/product
photos, new `2026-09-04`:

- `POST /api/v1/admin/categories/{categoryId}/image/presign` — body
  `{ contentType }`, response `{ uploadUrl, key, expiresAt }`.
- `POST /api/v1/admin/categories/{categoryId}/image` — body `{ key }`,
  confirms the upload and returns the updated `Category` with `imageUrl`
  set (a presigned GET, same 1h TTL as everywhere else in this doc).
- `imageUrl` (`string | null`) is on `Category` everywhere it appears,
  including the **public** `GET /api/v1/meta/categories` — that's how the
  customer home page's category tiles get their picture without needing
  auth.

**`categoryId` filter on `GET /api/v1/admin/shops`** — new `2026-09-04`,
optional query param, filters to shops carrying that top-level category
(via the `store_categories` join, so it's a real many-to-many match, not
a name/substring heuristic). Live-verified against two different real
categories returning correctly different shop sets.

---

## RESOLVED — Proximity shop browsing

**Done, live-verified 2026-09-04** — implemented exactly as proposed,
including the exclude-unlocated-shops decision. First attempt still
401'd (same stale-`:8092`-process pattern as Rounds 5b/8b — the process
predated the fix); after a restart, verified directly: a valid request
returns real shops nearest-first with `distanceKm`, a missing `lat` or
`categoryId` each correctly `400 VALIDATION_ERROR`s with a field-specific
message (not a bare 500). Also verified through the **actual running
frontend app**, not just direct backend calls: logged in for a real
session, hit `/categories/{id}` — the shop grid now renders a real shop
with its real logo photo, no more fallback error. Leaving the original
proposal below for reference.

**Ask** (2026-09-04): the customer flow now is — anonymous visitor
browses category tiles on `/home` (no login needed) → clicks a category
→ gated to create an account + set their location (reusing
`PATCH /api/v1/users/me/location` from the Security service) → lands on
a grid of shops in that category, nearest-first, each with a photo. This
is the first real use of "Proximity first" (AGENTS.md §5.2).

**New endpoint**: `GET /api/v1/shops` — **public**, no auth required
(matches `/meta/categories`; the login/location gate is a frontend UX
decision, not something this endpoint needs to enforce).

**Query params**

| Param | Type | Notes |
|---|---|---|
| `categoryId` | uuid, required | |
| `lat` | decimal, required | Caller's own latitude — this service has no way to look up a user's location itself (no client to Security service), so the frontend passes what it already has from the logged-in customer's profile. |
| `lng` | decimal, required | |
| `page` | int | Default 0 |
| `size` | int | Default 20 |

**Behavior**: only `status=ACTIVE` shops carrying that category, sorted
by distance from `(lat, lng)` ascending (Haversine against the shop's
own `latitude`/`longitude` from the location feature — §1 above).
**Proposal: exclude shops with no location set** — they can't be
meaningfully ranked, and it's a natural incentive for a merchant to
finish their shop setup. (Alternative: append them unsorted at the end —
your call, either is fine for v1.)

**Response `200 OK`** — standard `Page<T>` envelope, each row:

```json
{
  "id": "uuid",
  "name": "string",
  "logoUrl": "string | null",
  "coverUrl": "string | null",
  "isOpen": true,
  "distanceKm": 1.4
}
```

**Frontend status**: fully built and live-verified end-to-end
(`/categories/{id}` — the shop grid; `/categories/{id}/access` — the
anonymous gate with a "why" message and Criar conta/Entrar CTAs;
`/categories/{id}/set-location` — reuses the existing location picker
for a logged-in user who hasn't set one yet; `next=` threaded through
register → OTP verify → login → complete-profile **and** Google OAuth
so the user lands back where they were headed regardless of which auth
path they took — Google OAuth's `next` preservation turned out to need
no backend change, just a short-lived cookie set on our own domain
before the redirect to Google, since that survives the round trip
untouched).

---

## RESOLVED — Store → subcategory → product browsing

**Done, live-verified 2026-09-04** — all three pieces implemented exactly
as proposed. `GET /shops/{shopId}` returns real shop + categories,
`404`s correctly for both an unknown id and a non-`ACTIVE` shop. Public
subcategories now carry `imageUrl`; full presign → real `PUT` to S3 →
confirm round-trip succeeded on a real subcategory. `GET
/shops/{shopId}/products` returns the minimal `{id, name, photoUrl}`
row, correctly scoped by `subcategoryId` (10 of 50 products when
filtered). Also re-verified through the **actual running frontend
app**: `/stores/{id}` renders the real shop header and subcategory grid
(including the just-uploaded image), and
`/stores/{id}/subcategories/{id}` renders the real product grid — no
more fallback error state. Leaving the original proposal below for
reference.

## Store → subcategory → product browsing

**Ask** (2026-09-04): next step after the shop grid — select a shop →
see its subcategories as photo boxes → select a subcategory → see its
products as photo boxes (photo + name only, no price/stock yet — that
comes with the actual order flow, deliberately not built yet). Three
gaps, all public/unauthenticated (matches the rest of the customer
browsing surface):

**1. `GET /api/v1/shops/{shopId}` — public single-shop detail.** Doesn't
exist today — `GET /api/v1/shops` (the category-proximity list) has no
by-id counterpart, and the only single-shop `GET` is the `MERCHANT`/`ADMIN`-
authenticated one under `/merchant/shops/{shopId}`. Needed shape:

```json
{
  "id": "uuid", "name": "string",
  "logoUrl": "string | null", "coverUrl": "string | null",
  "isOpen": true,
  "categories": [{ "id": "...", "code": "...", "name": "...", "sortOrder": 1, "active": true, "imageUrl": "..." }]
}
```

`categories` is what lets the frontend know which subcategories to show
next (reusing the existing public `GET /meta/categories/{categoryId}/subcategories`
for each of the shop's categories — no new endpoint needed for that part).

**2. Subcategory images.** Same gap `imageUrl` filled for `Category` in
Round 10 — `Subcategory` has no image field at all today. Same
presigned two-step pattern: `POST /api/v1/admin/categories/{categoryId}/subcategories/{subcategoryId}/image/presign`
→ confirm, `ROLE_ADMIN` only (matches category images), `imageUrl`
added to the `Subcategory` model everywhere it appears, including the
public subcategories-by-category endpoint.

**3. `GET /api/v1/shops/{shopId}/products` — public products-in-a-shop
list.** Doesn't exist — the only products list today is the
`MERCHANT`/`ADMIN`-authenticated `.../merchant/shops/{shopId}/products`.
Needed: public, only `active=true` products, optional `subcategoryId`
filter, paginated. Row shape — deliberately minimal, matching the ask:

```json
{ "id": "uuid", "name": "string", "photoUrl": "string | null" }
```
(`photoUrl` = the product's primary photo, same as `Product.photos[isPrimary]` today.)

**Frontend status**: fully built and live-verified end-to-end
(`app/stores/[storeId]/page.tsx` — shop header + subcategory grid;
`app/stores/[storeId]/subcategories/[subcategoryId]/page.tsx` — product
grid). New shared `components/customer/CustomerHeader.tsx` (logo →
`/home` from anywhere in the customer-facing app, per explicit request)
used across every customer page now, including the two new ones.

---

## WITHDRAWN — `price` on the public shop-products list (2026-09-04, withdrawn 2026-09-05)

No longer needed. This was proposed so the Cart mock could compute a
subtotal — but the **real** Cart microservice shipped instead
(`API_REFERENCE-cart-service-response-frontend.md`) and resolves price
server-to-server directly against this service, not through the public
browsing endpoint at all. Live-verified: cart line `unitPrice`/`lineTotal`
are real numbers, no dependency on this endpoint changing. Leaving the
original ask below only in case a public product price ever becomes
independently useful for the browsing grid itself (e.g. showing price
before adding to cart) — not blocking anything today.

<details>
<summary>Original text</summary>

`GET /api/v1/shops/{shopId}/products` currently returns only
`{ id, name, photoUrl }` (deliberately minimal per the original
browsing-grid ask). Proposed addition: `price` (decimal, IVA-inclusive,
matching `Product.price` from the merchant-side model) on this same
public row.

</details>

---

## MOVED — Customer checkout preferences

Built on **KONECTA-SECURITY-SERVICE**, not this service — see
`API_REFERENCE-security-service.md`'s "Checkout preferences" section for
the live contract. (Originally proposed here 2026-09-05; the
architectural note about this service having no user-keyed data still
stands as the reason it landed on Security instead — kept there as
context, not repeated in two places.)

---

## RESOLVED — `price`/`inStock` on the public shop-products list

**Done, live-verified 2026-09-05** — both fields exactly as proposed.
Confirmed directly against the backend (real prices matching what the
Cart service independently resolves for the same products, e.g.
"Camisa Social" at 1319.50 MT both places; a genuine `inStock: false`
row found — "Bota de Cano Alto") and through the actual running frontend
app (the same real data flowing correctly into `ProductGrid`'s props).

**One mechanism note from backend worth keeping in mind**:
`ProductStatus.OUT_OF_STOCK` is never actually assigned anywhere in this
codebase — nothing transitions a product to it based on stock level. A
zero-stock product stays `status == ACTIVE` and still appears in the
listing as normal; `inStock: false` is the *only* signal for "disable
Adicionar" — there's no separate out-of-stock status to also check.
Already exactly what the frontend does; flagging so it's not a surprise
later if an actual `OUT_OF_STOCK` status transition is ever looked for —
it doesn't exist yet.

Leaving the original proposal below for reference.

## WITHDRAWN (superseded above) — `price`/`inStock` on the public shop-products list (2026-09-05)

**Ask**: product boxes on the customer browsing grid
(`/stores/{id}/subcategories/{id}`) need to show price, and disable
"Adicionar" for an out-of-stock product **before** the customer tries
to add it — right now the only way to discover either is the Cart
service's `409 INSUFFICIENT_STOCK` after attempting to add, which is a
worse experience than just not offering it. Explicitly **not** asking
for a raw stock count/quantity to be shown — just enough to disable the
button, nothing that reads like "3 left" pressure-selling.

`GET /api/v1/shops/{shopId}/products` currently returns only
`{ id, name, photoUrl }`. Proposed addition, same row:

```json
{ "id": "uuid", "name": "string", "photoUrl": "string | null", "price": 350.0, "inStock": true }
```

- `price` — decimal, IVA-inclusive, matching `Product.price`. (This
  revives the Round 16 ask that was withdrawn once the real Cart service
  turned out not to need it — different reason this time: browsing
  display, not cart computation.)
- `inStock` — boolean, `true` if `stockQuantity > 0`. Deliberately not
  the raw quantity.

**Frontend status**: fully built (`components/customer/ProductGrid.tsx`)
— shows price only when present (never fabricated), disables the button
and shows "Esgotado" only when `inStock === false` known; with neither
field present (today), behaves exactly as before — no price shown, Add
always enabled, relying on the Cart service's own stock check as the
fallback. `PublicProduct.price`/`inStock` are optional so the type is
correct either way.

---

## What's not here

Everything below is **out of scope for this service**, per its
`AGENTS.md` (Orders/Payments/Delivery are separate services, not this
one). Nothing in these sections exists at `localhost:8092` — don't point
the frontend at them yet.

- **Orders** (`GET/PATCH .../orders/**`) — the whole merchant-facing
  order list/detail/status-transition surface from the original spec.
  Belongs to a future Orders service.
- **Sales summary** (`GET .../sales/summary`) — needs the Orders/Payments
  database.
- **Receipts** (`GET .../receipts/**`) — Payments domain.

(Product photo / shop logo / cover upload used to be listed here as not
implemented — it now is, see [Photos](#photos) and the logo/cover
endpoints under [Shops](#1-shops).)

If/when any of these move to this service or a sibling one, this file
will be updated and the frontend team told directly — don't build against
guessed shapes for them.

---

## Data models

### `Shop`

```json
{
  "id": "14b4dbe9-d975-4d75-9bb7-39118dcd5828",
  "name": "Loja Real",
  "legalName": null,
  "nuit": "400123456",
  "email": null,
  "phone": "+258841112223",
  "address": "Av. 24 de Julho",
  "city": "Maputo",
  "neighborhood": "Central",
  "categories": [
    { "id": "12a1aaae-42d6-413d-8a86-ab951482fb93", "code": "SUPERMERCADO", "name": "Supermercado", "sortOrder": 1, "active": true }
  ],
  "description": null,
  "logoUrl": null,
  "coverUrl": null,
  "status": "ACTIVE",
  "isOpen": false,
  "manuallyClosed": false,
  "activationReady": true,
  "acceptsPickup": true,
  "acceptsDelivery": false,
  "createdAt": "2026-09-02T21:13:00Z",
  "updatedAt": "2026-09-02T21:13:00Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `name` | string | |
| `legalName` | string? | New — optional, not on create/update body yet |
| `nuit` | string? | |
| `email` | string? | Not settable via any current endpoint |
| `phone` | string? | |
| `address` | string? | |
| `city` | string? | |
| `neighborhood` | string? | |
| `categories` | `Category[]` | **Changed**: was a single free-string `category`; now a list (see [Category taxonomy](#category-taxonomy)). Set/replaced via `categoryIds` (uuid[]) on create/update. |
| `description` | string? | |
| `logoUrl` | string? | |
| `coverUrl` | string? | New |
| `status` | `DRAFT` \| `PENDING_REVIEW` \| `ACTIVE` \| `SUSPENDED` \| `CLOSED` | New — not in the original spec |
| `isOpen` | boolean | Computed: hours + manual override + `status == ACTIVE` |
| `manuallyClosed` | boolean | |
| `activationReady` | boolean | New — true once name/nuit/address/city/neighborhood are all set |
| `acceptsPickup` | boolean | New, default `true` |
| `acceptsDelivery` | boolean | New, default `false` |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | New |

### `Product`

```json
{
  "id": "53e7bdd1-ce94-4771-9a8a-f62c478e340c",
  "shopId": "14b4dbe9-d975-4d75-9bb7-39118dcd5828",
  "name": "Arroz 5kg",
  "description": "Arroz agulha",
  "subcategoryId": "9223fbef-3099-493f-917d-226a8ee6b8d8",
  "subcategoryName": "Legumes e Frutas",
  "categoryId": "12a1aaae-42d6-413d-8a86-ab951482fb93",
  "categoryName": "Supermercado",
  "price": 350.00,
  "stockQuantity": 20,
  "lowStockThreshold": 5,
  "active": true,
  "lowStock": false,
  "photos": [
    { "id": "e6a72e4e-e179-4078-bd66-c3b6478a02a5", "url": "http://localhost:8092/uploads/products/.../xyz.jpg", "isPrimary": true }
  ],
  "createdAt": "2026-09-02T21:13:35Z",
  "updatedAt": "2026-09-02T21:13:36Z"
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `shopId` | uuid | |
| `name` | string | |
| `description` | string | |
| `subcategoryId` | uuid? | **Changed**: was a free-string `category`; now a reference to a product-level subcategory (see [Category taxonomy](#category-taxonomy)). Set via `subcategoryId` on create/update. |
| `subcategoryName` | string? | Denormalized, read-only |
| `categoryId` | uuid? | Denormalized from the subcategory's parent category, read-only |
| `categoryName` | string? | Denormalized, read-only |
| `price` | number | IVA-inclusive |
| `stockQuantity` | integer | |
| `lowStockThreshold` | integer | |
| `active` | boolean | |
| `lowStock` | boolean | New — server-computed, `stockQuantity <= lowStockThreshold` |
| `photos` | `{ id, url, isPrimary }[]` | **Matches the original spec exactly** now that upload is implemented — the earlier `imageUrls`/`primaryImageUrl` fields from a prior revision of this doc are gone. Managed via [Photos](#photos) endpoints, not through `PATCH .../products/{id}`. |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | New |

### `Category`

`{ id, code, name, sortOrder, active, imageUrl }` — `imageUrl` (string |
null) new 2026-09-04, see [Admin CRUD for categories](#admin-crud-for-categoriessubcategories--now-used-by-this-frontend-too).

---

## Verified live

Everything in this document has been exercised end-to-end against a
running instance using **real JWTs issued by KONECTA-SECURITY-SERVICE**
(not synthetic test tokens) — including this revision's category
taxonomy: admin creates a category and subcategory → merchant token
gets `403` on the same admin endpoint → public reads reflect the new
category/subcategory → merchant creates a shop with `categoryIds` →
merchant creates a product with `subcategoryId`, response correctly
carries denormalized `subcategoryName`/`categoryId`/`categoryName`. Plus
the original flow: shop create → auto-activation → product create →
low-stock flag → dashboard summary → stock adjust → negative-stock
rejection → 401/403 boundaries.

This revision's S3 upload flow was verified against the **real bucket**
(`konecta-media-564956047797`), not a mock: presign a product photo
upload → `PUT` the actual bytes straight to S3 with the returned
`uploadUrl` (this service never touched them) → confirm with this
service → fetch the file back via the returned presigned `GET` URL →
byte-for-byte match with what was uploaded → delete the photo → the S3
object is genuinely gone (confirmed via a direct `HeadObject` call, not
just "removed from our database"). Shop logo upload (presign → `PUT` →
confirm) and unsupported-content-type rejection were verified the same
way. All matched this document.
