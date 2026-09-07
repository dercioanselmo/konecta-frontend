# Courier (Entregador) onboarding + store association — PROPOSED API contract

**Status: PROPOSED. Nothing here exists on any backend service yet.**
Frontend is fully built against this contract (forms render, validate,
and call these endpoints) — every call will fail with a connection/
`ORDERS_API_BASE_URL`-style "not set" error, or a `404`/`500` from
whatever the base URL happens to resolve to, until a real backend
implements this. Scope: courier profile + documents + per-store
association and approval, up to but **not including** how a courier
receives/accepts job offers or interacts with an order — that's a
separate, later slice per the request that introduced this ("implement
until this profile validation, before I specify how he interacts with
orders").

A courier already exists as a platform `Role` (`COURIER`) — a customer
can self-request it at registration (`requestedRole`), subject to
**admin** approval, exactly like `MERCHANT`. That part is live. What's
new here is everything *after* a user's role is actually `COURIER`:
completing a courier-specific profile, and getting approved **per
store**, independently of the platform-level role approval.

---

## 1. New service: `KONECTA-COURIER-SERVICE`

Proposed as its own Eureka-registered microservice (same pattern as
Cart/Checkout/Orders each getting their own service), since courier
profile/documents/store-association is a new, self-contained domain —
not really Security's identity data, not really Stores-and-Stock's
merchant/catalog data. Local port suggestion: `8096`
(`COURIER_API_BASE_URL` in `.env`).

Auth: same JWT Bearer as every other service. A courier's own endpoints
(`/api/v1/couriers/me/**`) require role `COURIER`. The merchant-facing
endpoints (`/api/v1/merchant/shops/{shopId}/couriers/**`) require
`MERCHANT`/`MERCHANT_STAFF` (shopId claim match)/`ADMIN`, same rule as
every other merchant-scoped endpoint in this project.

---

## 2. Courier profile

### `GET /api/v1/couriers/me`

Returns the caller's own courier profile, or `404 COURIER_PROFILE_NOT_FOUND`
if they haven't started onboarding yet (frontend treats that 404 as "go
to onboarding", not an error banner).

```json
{
  "userId": "...",
  "baseLatitude": -25.9692,
  "baseLongitude": 32.5732,
  "transportType": "MOTORCYCLE",
  "plateNumber": "AAB-123-MP",
  "photoUrl": "https://...",
  "createdAt": "...",
  "updatedAt": "..."
}
```

`transportType` enum: `WALK` | `BICYCLE` | `MOTORCYCLE` | `EBIKE` | `CAR`.
`plateNumber` required (validated server-side) when `transportType` is
`MOTORCYCLE` or `CAR`, otherwise must be `null`. A `CAR`/`MOTORCYCLE`
courier is also expected to have at least one `CARTA_CONDUCAO` document
on file (see §3) — cross-check server-side, the frontend only nudges
for it in the UI, never trust the client's own view of "has a license
on file" as sufficient.

`photoUrl` is **not** owned by this service — it's the same profile
photo every role already has via
`POST /api/v1/users/photo/presign` + `POST /api/v1/users/photo`
(Security service, already live). This field just mirrors
`GET /users/me`'s own `photoUrl` for convenience; no separate upload
path needed here.

### `PUT /api/v1/couriers/me`

Creates the profile on first save, updates it after. Request body:
`{ baseLatitude, baseLongitude, transportType, plateNumber? }`.

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Missing plate for `MOTORCYCLE`/`CAR`, or a plate present for `WALK`/`BICYCLE`/`EBIKE` |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |
| `403` | `ACCESS_DENIED` | Caller's role isn't `COURIER` |

---

## 3. Courier documents

Multiple documents allowed, including more than one of the same type
(e.g. an expired BI plus its renewal, kept for history) — no uniqueness
constraint beyond `id`.

### `GET /api/v1/couriers/me/documents` → `CourierDocument[]`

### `POST /api/v1/couriers/me/documents/presign`

Same presign pattern as every other file upload in this project —
request `{ contentType }`, response `{ uploadUrl, key, expiresAt }`; the
frontend PUTs the file straight to S3, then calls confirm below.

### `POST /api/v1/couriers/me/documents`

Confirms the upload and creates the document record. Request body:

```json
{
  "type": "BI",
  "number": "123456789A",
  "issueDate": "2020-01-15",
  "expiryDate": "2030-01-15",
  "issuePlace": "Maputo",
  "fileKey": "the-key-from-presign"
}
```

`type` enum: `BI` | `CARTA_CONDUCAO` | `PASSAPORTE`. Response: the
created `CourierDocument` (with a resolved `fileUrl`, presigned GET,
same "don't cache long-term" caveat as product/shop photos elsewhere in
this project).

### `DELETE /api/v1/couriers/me/documents/{documentId}`

Removes a document the courier uploaded by mistake or wants to replace.
`404` if it doesn't belong to the caller.

---

## 4. Store association

A courier requests to join a store; that store's `MERCHANT`/
`MERCHANT_STAFF` approves, rejects, or later suspends the association.
Distinct from the platform-level role approval (§0) — a `COURIER` can
be fully platform-approved and still be `PENDING_STORE_APPROVAL` at
every single store until each one says yes.

`AssociationStatus` enum: `PENDING_STORE_APPROVAL` | `ACTIVE` | `SUSPENDED`.

### Courier side

**`GET /api/v1/couriers/me/shops`** → the courier's own associations,
each with the shop's `distanceKm` from the courier's `baseLatitude`/
`baseLongitude` (computed server-side, same haversine the existing
`GET /api/v1/shops?lat&lng` on Stores-and-Stock already does — reuse
that formula, don't reinvent it):

```json
[
  { "shopId": "...", "shopName": "...", "shopLogoUrl": "...", "status": "ACTIVE", "distanceKm": 1.4 },
  { "shopId": "...", "shopName": "...", "shopLogoUrl": "...", "status": "PENDING_STORE_APPROVAL", "distanceKm": 6.8 }
]
```

**`POST /api/v1/couriers/me/shops`** — request a new association.
Body: `{ "shopId": "..." }`. Creates the row as
`PENDING_STORE_APPROVAL`. No distance limit enforced server-side — the
**2 km guidance is a frontend-only confirmation prompt** ("this store
is further than usual, are you sure?"), not a hard rule the backend
rejects past. `409 ALREADY_ASSOCIATED` if a non-removed association to
that shop already exists.

**`DELETE /api/v1/couriers/me/shops/{shopId}`** — courier withdraws a
pending request or leaves an active/suspended association.

### Store side

**`GET /api/v1/merchant/shops/{shopId}/couriers`** → couriers
associated/requesting association with this shop:

```json
[
  {
    "courierId": "...",
    "courierName": "...",
    "courierPhone": "...",
    "photoUrl": "...",
    "transportType": "MOTORCYCLE",
    "plateNumber": "AAB-123-MP",
    "distanceKm": 1.4,
    "status": "PENDING_STORE_APPROVAL",
    "requestedAt": "..."
  }
]
```

**`GET /api/v1/merchant/shops/{shopId}/couriers/{courierId}`** — single
courier's detail for this shop: everything the list row has, plus
`documents: CourierDocument[]` (§3's shape) so the store has something
concrete to check before approving — not just a name and a status.

**`PATCH /api/v1/merchant/shops/{shopId}/couriers/{courierId}/status`**
— body `{ "status": "ACTIVE" | "SUSPENDED" }`. Allowed transitions:
`PENDING_STORE_APPROVAL → ACTIVE` (approve), `PENDING_STORE_APPROVAL →`
*(removed, not a status — reject is a `DELETE`, see below)*,
`ACTIVE ↔ SUSPENDED` (suspend / reactivate) both ways. `409
INVALID_TRANSITION` otherwise.

**`DELETE /api/v1/merchant/shops/{shopId}/couriers/{courierId}`** —
reject a pending request outright (distinct from suspending an already-
approved courier).

**Errors (both store-side endpoints)**

| Status | Code | When |
|---|---|---|
| `404` | `COURIER_NOT_FOUND` | No association between this courier and this shop |
| `409` | `INVALID_TRANSITION` | Requested status not reachable from the current one |
| `403` | `ACCESS_DENIED` | Staff `shopId` claim mismatch, or wrong role |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |

---

## 5. Required change to an existing endpoint: `GET /api/v1/shops`

**`KONECTA-STORES-AND-STOCK-SERVICE`'s existing `categoryId` param on
this endpoint needs to become optional.** Today it's required
(confirmed live: omitting it returns `400 VALIDATION_ERROR
categoryId: obrigatório`) — the courier's store-picker needs to browse
**every** active shop city-wide to choose which to request, not one
category at a time. When `categoryId` is omitted, return all active
shops within the existing distance-sort/pagination behavior, unchanged
otherwise (`NearbyShop[]`, `distanceKm` precomputed, same as today).

This is the only change asked of an already-live service in this
feature — everything else is the brand-new courier service above.

---

## Data models (frontend types, `lib/courier/types.ts`)

```ts
type TransportType = "WALK" | "BICYCLE" | "MOTORCYCLE" | "EBIKE" | "CAR";
type CourierDocumentType = "BI" | "CARTA_CONDUCAO" | "PASSAPORTE";
type AssociationStatus = "PENDING_STORE_APPROVAL" | "ACTIVE" | "SUSPENDED";

interface CourierProfile {
  userId: string;
  baseLatitude: number;
  baseLongitude: number;
  transportType: TransportType;
  plateNumber: string | null;
  photoUrl: string | null;
}

interface CourierDocument {
  id: string;
  type: CourierDocumentType;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuePlace: string;
  fileUrl: string;
}

interface CourierShopAssociation {
  shopId: string;
  shopName: string;
  shopLogoUrl: string | null;
  status: AssociationStatus;
  distanceKm: number;
}
```

---

## Frontend status

Fully built against this contract:

- `app/courier/onboarding/CourierOnboardingForm.tsx` — base location
  (reuses `LocationPicker` + the device-GPS pre-pin from the location
  round), transport type selector, plate number field (shown only for
  `MOTORCYCLE`/`CAR`, cross-checked client-side against having at least
  one `CARTA_CONDUCAO` document), a documents manager (add/list/delete,
  reusing `uploadAndConfirm` for the presign→PUT→confirm flow), and the
  existing user-photo upload (no new endpoint).
- `app/courier/stores/CourierStoresView.tsx` — lists every active shop
  (closest first) with `distanceKm`, an "Associar-me" action that shows
  a confirmation dialog when `distanceKm > 2`, and a separate "As suas
  lojas" section listing existing associations with their status and
  the same distance figure (shown both before and after association, as
  asked).
- `app/merchant/shops/[shopId]/couriers/CouriersList.tsx` (+ a detail
  view) — Pendente/Ativo/Suspenso tabs, Aprovar/Rejeitar/Suspender/
  Reativar actions, courier documents visible on the detail view so the
  store has something to actually confirm against.
- New "Entregadores" tab in `ShopNav` (visible to `MERCHANT` and
  `MERCHANT_STAFF`, same as every other tab there).

Not built (out of scope for this slice, per the request): job offers,
accept/reject, earnings, delivery-in-progress flows — anything about
how an *approved* courier actually works an order.
