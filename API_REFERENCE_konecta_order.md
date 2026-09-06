# Orders — API inventory

Base URL: `http://localhost:8095` · Eureka name: `KONECTA-ORDERS-SERVICE`
Auth: `Authorization: Bearer <JWT>` from `KONECTA-SECURITY-SERVICE` (HS256, shared secret — the secret string's raw UTF-8 bytes are the HMAC key, not base64-decoded). Customer endpoints: any authenticated role. Merchant endpoints: `MERCHANT`, `MERCHANT_STAFF`, or `ADMIN` only.
Errors: `{ code, message, details[], timestamp }` — `code` machine-readable, `message`/`details` in Portuguese.
Owns: `order_status_history` (this service's own table, created here). Reads (and, as of the merchant status-write endpoint, **also writes status to**) the same `orders`/`order_items` tables `KONECTA-CHECKOUT-SERVICE` owns — same physical database, plus a handful of additive tracking columns this service added itself. See "Data ownership" below before assuming anything about who else may write these rows.
Calls out to: `KONECTA-STORES-AND-STOCK-SERVICE` (merchant shop-ownership check) and `KONECTA-SECURITY-SERVICE` (`customerName` resolution on merchant endpoints) — both forward the caller's own Bearer token, no service credential.

---

## Orders — `/api/v1/orders`

| Method & path | Role | Returns |
|---|---|---|
| `GET /` | any authenticated, owner-scoped | `200` → `PageResponse<OrderSummary>` |
| `GET /{orderId}` | any authenticated, owner-only | `200` → `Order` |

### `GET /api/v1/orders` — list, search, filter, sort, paginate

Scoped to the caller's own `customer_user_id` — there is no way to list
another user's orders.

**Query params** (all optional unless noted)

| Param | Type | Notes |
|---|---|---|
| `tab` | `ACTIVE` \| `HISTORY` | Omit to get both. **Active**: everything not covered by History. **History**: `DELIVERED`, `CANCELLED`, `REFUNDED`, and `PICKED_UP` **when `deliveryMode = PICKUP`** (a picked-up pickup order is done; a picked-up delivery order is still active — still in transit). Invalid value → `400 VALIDATION_ERROR`. |
| `storeName` | string | Partial/contains match (case-insensitive) on the order's store name. |
| `productName` | string | Matches if **any line item** on the order contains this in its name (case-insensitive). |
| `dateFrom` | `YYYY-MM-DD` | Inclusive lower bound on `createdAt`'s calendar date. |
| `dateTo` | `YYYY-MM-DD` | Inclusive upper bound on `createdAt`'s calendar date. |
| `q` | string | Free text, substring match (case-insensitive) against the order id's text form — the frontend types the short 8-char prefix shown in the UI, but any substring works. |
| `sort` | `createdAt,desc` \| `createdAt,asc` | Default `createdAt,desc`. Any other value → `400 VALIDATION_ERROR` (not silently ignored). |
| `page` | int | Default `0`. |
| `size` | int | Default `20`. |

**Response `200 OK`**

```json
{
  "content": [
    {
      "orderId": "5a303521-1c7a-4367-95cb-fb8c2fd73b50",
      "status": "PAID",
      "storeId": "59c24b56-ad96-4d4b-9f0a-7801052c674f",
      "storeName": "Supermercado Baoba",
      "storeLogoUrl": "https://konecta-media-....s3.amazonaws.com/stores/.../logo/....png?X-Amz-...",
      "itemCount": 1,
      "total": 1279.75,
      "createdAt": "2026-09-06T14:22:02.777584Z"
    }
  ],
  "totalElements": 8,
  "totalPages": 2,
  "page": 0,
  "size": 5
}
```

`itemCount` is the sum of line quantities (computed in the database, not by
loading every line — cheap even at scale). This is a hand-rolled envelope,
**not** Spring Data's own `Page` JSON (different field names) — it's the
exact shape the frontend contract asked for.

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Invalid `tab` or `sort` value |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |

---

### `GET /api/v1/orders/{orderId}` — full detail

Same base shape as Checkout's own `GET /api/v1/orders/{orderId}` response,
**plus** tracking fields for the roadmap/map UI (all nullable):

```json
{
  "orderId": "5a303521-1c7a-4367-95cb-fb8c2fd73b50",
  "status": "PAID",
  "storeId": "59c24b56-ad96-4d4b-9f0a-7801052c674f",
  "storeName": "Supermercado Baoba",
  "storeLogoUrl": "https://konecta-media-....s3.amazonaws.com/stores/.../logo/....png?X-Amz-...",
  "storeLatitude": null,
  "storeLongitude": null,
  "items": [
    {
      "productId": "632d48d3-fef0-4f73-82fb-a899c3cdc968",
      "name": "Cha Preto (caixa) (5)",
      "photoUrl": null,
      "unitPrice": 1279.75,
      "quantity": 1,
      "lineTotal": 1279.75
    }
  ],
  "subtotal": 1279.75,
  "deliveryFee": null,
  "total": 1279.75,
  "deliveryMode": "PICKUP",
  "deliveryAddress": null,
  "paymentMethod": "CASH",
  "contactEmail": "dercio.miguel@gmail.com",
  "contactPhone": "+258841234567",
  "courierLatitude": null,
  "courierLongitude": null,
  "etaMinutes": null,
  "etaAt": null,
  "createdAt": "2026-09-06T14:22:02.777584Z"
}
```

Scoped to the caller's own `customer_user_id` — an id belonging to another
user returns `404`, not `403` (doesn't confirm existence to a non-owner).

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `ORDER_NOT_FOUND` | Unknown id, or belongs to another user |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |

---

## Merchant order management — `/api/v1/merchant/shops/{shopId}/orders`

Shop-scoped order management for merchants/staff (admin reuses the same
views). Distinct from the customer-facing endpoints above, which are
owner-scoped by `customer_user_id` and can never see another customer's
order regardless of role.

### Auth

`Authorization: Bearer <accessToken>`, role `MERCHANT` (shop owner),
`MERCHANT_STAFF`, or `ADMIN`. Any other role (e.g. `CUSTOMER`) → `403
ACCESS_DENIED` before any handler runs.

- **`MERCHANT_STAFF`**: the JWT's own `shopId` claim (see
  `API_REFERENCE_konecta_security.md`) must equal the path's `{shopId}`.
  Mismatch → `403 ACCESS_DENIED`. This service trusts the claim as-is (no
  extra lookup) — it's short-lived (15 min) and issued by Security itself.
- **`MERCHANT`**: this service has no shop/ownership data of its own, so
  ownership is verified by calling `KONECTA-STORES-AND-STOCK-SERVICE`'s own
  `GET /api/v1/merchant/shops/{shopId}` **with the caller's own forwarded
  token** — that endpoint already implements the owner/assigned/admin
  check; its `200` authorizes, its `404` (shop not owned/assigned/found) is
  mapped to this service's own `404 SHOP_NOT_FOUND`.
- **`ADMIN`**: no ownership check — any `shopId`.

### `GET /` — list, single-box OR search, filter, paginate

**Query params**

| Param | Type | Notes |
|---|---|---|
| `tab` | `ACTIVE` \| `HISTORY` | Same split as the customer-facing list. Omit for both. |
| `search` | string | **OR semantics** — matches if **any** of: customer contact (email or phone), any line item's product name, or the order id substring contains this text (case-insensitive). Deliberately OR, not the customer hub's separate AND-narrowing params. |
| `dateFrom` / `dateTo` | `YYYY-MM-DD` | Inclusive range on `createdAt`. |
| `page` / `size` | int | Default `page=0`, `size=20`. |

Sort is fixed most-recent-first — not exposed as a param on this endpoint.

**Response `200 OK`**

```json
{
  "content": [
    {
      "orderId": "1df782e9-9173-4437-bca2-2f8c6a0cf466",
      "status": "STORE_CONFIRMED",
      "customerName": "Dercio Miguel",
      "customerPhone": "+258841234567",
      "itemCount": 2,
      "total": 800.02,
      "createdAt": "2026-09-05T20:09:50.272251Z"
    }
  ],
  "totalElements": 7,
  "totalPages": 1,
  "page": 0,
  "size": 20
}
```

`storeId`/`storeName` are omitted — the whole list is already scoped to one
shop via the URL.

`customerName` is a real `"First Last"` name resolved from Security — see
"customerName source" below for the lookup mechanics and the (rare)
fallback case.

### `GET /{orderId}` — detail

Same shape as the customer-facing `Order` (see "Data models" above) plus
`customerName`. `404 ORDER_NOT_FOUND` for an unknown id or one belonging to
a different shop than `{shopId}`.

### `PATCH /{orderId}/status` — transition an order's status

**The only write endpoint on this service.** Validated server-side against
a real state machine — **never trust a client-submitted status as valid
without this check**, regardless of what a frontend's own UI hints at.

**Request**: `{ "status": "STORE_CONFIRMED" }` — any `OrderStatus` enum
value; one not in the enum at all → `400 VALIDATION_ERROR`.

**Merchant-triggerable transitions**:

| From | To |
|---|---|
| `PAID`, `PENDING_STORE_OPEN` | `STORE_CONFIRMED`, `CANCELLED` |
| `STORE_CONFIRMED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY_FOR_PICKUP`, `CANCELLED` |
| `READY_FOR_PICKUP` (pickup order) | `PICKED_UP` |
| `READY_FOR_PICKUP` (delivery order) | `COURIER_ASSIGNED` |
| `COURIER_ASSIGNED` (delivery order) | `PICKED_UP` |

Any other `(from, to)` pair — including `IN_TRANSIT`/`DELIVERED`, which are
intentionally **not** merchant-triggerable (courier/system-driven) — is
`409 INVALID_TRANSITION`.

On success: the order's `status`/`updated_at` are updated in place (same
row Checkout created), a row is appended to this service's own
`order_status_history` (`order_id, from_status, to_status, actor_user_id`
= the caller's JWT `sub`, `created_at`), and the response is the updated
detail (same shape as `GET`). The change is immediately visible through
both this service's own customer-facing `GET /api/v1/orders/{orderId}`
**and** Checkout's own `GET /api/v1/orders/{orderId}` — same row, live-
verified.

**Errors**

| Status | Code | When |
|---|---|---|
| `400` | `VALIDATION_ERROR` | `status` isn't a real `OrderStatus` value |
| `409` | `INVALID_TRANSITION` | Requested status isn't reachable from the current one for this order's `deliveryMode` |
| `404` | `ORDER_NOT_FOUND` | Unknown id or wrong shop |
| `403` | `ACCESS_DENIED` | Staff `shopId` claim mismatch, or wrong role |
| `404` | `SHOP_NOT_FOUND` | `MERCHANT` token for a shop they don't own |

### `MerchantOrderSummary`

`{ orderId, status, customerName, customerPhone, itemCount, total, createdAt }`

### `MerchantOrder`

Same as `Order` (customer-facing detail, above) plus `customerName: string`.

### customerName source

No order itself captures a customer's real name — only
`contactEmail`/`contactPhone` (Checkout's `CheckoutRequest` never collected
one). `customerName` is resolved live, per request, from
`KONECTA-SECURITY-SERVICE`'s `GET /api/v1/users/{id}/summary` (order
detail) / `GET /api/v1/users/summaries` (list — one batched call for every
distinct customer on the page, not N calls) using the order's
`customer_user_id`, formatted as `"{firstName} {lastName}"`.

**Fallback**: if that lookup fails for a given customer — Security
unreachable, an unrecognized id (batch endpoint silently omits unknown
ids; single endpoint 404s) — `customerName` falls back to that order's own
`contactEmail` rather than failing the whole list/detail response. A
merchant seeing an email instead of a name in this fallback case is a
resilience trade-off, not a bug to chase — check whether Security itself
is degraded before assuming this service is broken.

See `API_REQUEST-orders-needs-from-security.md` for how this endpoint came
to exist and `context.md` for the full implementation notes
(`CustomerNameResolver`).

---

## Data models

### `OrderSummary` (list row)

`orderId (uuid), status (string, see Order status), storeId (uuid), storeName, storeLogoUrl (nullable), itemCount (int), total (decimal), createdAt (ISO 8601)`

### `Order` (detail)

`orderId (uuid), status (string), storeId (uuid), storeName, storeLogoUrl (nullable), storeLatitude (number|null), storeLongitude (number|null), items: OrderItem[], subtotal (decimal), deliveryFee (decimal|null), total (decimal), deliveryMode (PICKUP|DELIVERY), deliveryAddress (object|null), paymentMethod (CARD|MPESA|EMOLA|CASH), contactEmail, contactPhone, courierLatitude (number|null), courierLongitude (number|null), etaMinutes (int|null), etaAt (ISO 8601|null), createdAt (ISO 8601)`

### `OrderItem`

`productId (uuid), name, photoUrl (nullable, presigned S3, ~1h TTL — a snapshot from checkout time, may 404/expire and re-presign on a later read from Checkout's own storage layer; this service does not re-sign it), unitPrice (decimal, snapshotted at checkout time), quantity (int), lineTotal (decimal)`

### `DeliveryAddress`

`address, city, neighborhood, latitude (number|null), longitude (number|null)` — `null` (the whole object) for `PICKUP` orders.

### `PageResponse<T>`

`content: T[], totalElements (long), totalPages (int), page (int, 0-based), size (int)`

### Order status

Mirrors the platform-wide timeline (root `AGENTS.md` §4 / §9) and Checkout's
own enum exactly — same names, same values, no additions:

```
CREATED, PAID, PENDING_STORE_OPEN, STORE_CONFIRMED, PREPARING,
READY_FOR_PICKUP, COURIER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED,
CANCELLED, REFUNDED
```

The frontend's status-roadmap component
(`components/orders/OrderStatusRoadmap.tsx`) already has Portuguese labels
and a per-delivery-mode step sequence for every one of these — **do not add
a new value here without a matching frontend update.**

**Active vs History split** (`tab` param):

| Tab | Statuses |
|---|---|
| **Active** | Everything not in History — `PAID` through `IN_TRANSIT`/`COURIER_ASSIGNED`/etc., including `PICKED_UP` **for delivery orders** (still in transit to the customer). |
| **History** | `DELIVERED`, `CANCELLED`, `REFUNDED`, and `PICKED_UP` **for pickup orders** (collected = done). |

---

## Data ownership — read this before wiring anything against this service

This service is a read model over `KONECTA-CHECKOUT-SERVICE`'s own
`orders`/`order_items` tables — same physical Postgres database
(`konecta-checkout`), not a separate one. **Checkout remains the sole
writer of order *creation*** — there is no `POST` here, an order only
shows up once Checkout has placed it.

**As of the merchant status-write endpoint, this service also writes**:
`PATCH /api/v1/merchant/shops/{shopId}/orders/{orderId}/status` updates
`orders.status`/`updated_at` directly — the same row Checkout created, in
the same shared table. This makes two services capable of writing to that
table (Checkout on creation, Orders on merchant-triggered status changes).
They write disjoint fields in practice (Checkout never revisits a row
after creation; Orders only ever touches `status`/`updated_at` on an
existing row) and there's no known conflict scenario today, but there is
also no optimistic-locking guard against a hypothetical future write path
colliding — flagging this rather than silently declaring it safe.
`order_status_history` is a brand-new table this service created and owns
outright; Checkout has no knowledge of it.

Other practical implications for anyone integrating against this service:

- **The tracking fields (`storeLatitude/Longitude`, `courierLatitude/
  Longitude`, `etaMinutes`, `etaAt`) exist as columns this service added
  via its own migration, but nothing currently populates them** — no
  courier-tracking source exists on the platform yet (per AGENTS.md's
  collaborator table). Expect `null` for all of them on every order today.
  This is the expected, documented state — not a bug to report.
- **`customerName` is a live cross-service lookup, not stored on the
  order** — a Security outage degrades it to `contactEmail`, it doesn't
  fail the request. See "customerName source" above.
- **This arrangement is explicitly interim.** AGENTS.md's own instruction
  is not to leave two conflicting sources of truth long-term; the
  documented follow-up (see `context.md`) is for Checkout to eventually
  create orders through this service (via Feign) instead of owning the
  table directly, at which point this service gets its own independent
  database and becomes the sole writer for both creation and status.
  Any integration built against this service today should not assume
  today's physical-database detail is permanent — only the HTTP contract
  in this document is the stable interface.

---

## What this service does *not* expose (known gaps for other services)

- **No order creation.** `KONECTA-CHECKOUT-SERVICE` remains the only
  service that can create an order in this phase — no `POST` here.
- **No cancellation-specific endpoint beyond the generic status PATCH.**
  `CANCELLED` is reachable via the same `PATCH .../status` as any other
  merchant transition — there's no dedicated "cancel" action, refund
  handling, or customer-initiated cancellation endpoint.
- **No courier-facing write endpoints.** The merchant transition table
  covers `COURIER_ASSIGNED` and pickup/delivery `PICKED_UP`, but there's no
  role/endpoint for an actual courier actor to drive `IN_TRANSIT` →
  `DELIVERED` themselves — those two remain unreachable through any
  endpoint on this service today (by design, until a courier flow exists).
- **No stock-release on cancel.** AGENTS.md §8 asks for Stock reservation
  release on `CANCELLED`/`REFUNDED` — `PATCH .../status` will happily set
  `CANCELLED` without calling Stores-and-Stock to release anything.
- **No `order.status_changed` Kafka event.** Listed as optional/"not
  required to ship list/detail" in AGENTS.md §8 — not built. A status
  change today is only visible by polling `GET`.
- **No admin listing/search over all orders across every shop.** The
  `ADMIN` role can hit any single shop's merchant endpoints (no ownership
  check), but there's no cross-shop `GET /api/v1/admin/orders`.
- **No optimistic locking on the status write** — see "Data ownership"
  above for the (currently theoretical) concurrent-write risk this
  introduces on a table Checkout also has a handle on.
- **`courierLatitude`/`courierLongitude`/`etaMinutes`/`etaAt` are always
  `null` today** — see "Data ownership" above. Don't build a feature that
  assumes these are populated without first confirming a courier-tracking
  source has been wired up to write them.
- **`deliveryFee` is always `null`** — inherited directly from Checkout's
  own response, which never sets it in this phase (no delivery-fee
  calculation exists on the platform yet).
- **Store info (`storeName`, `storeLogoUrl`, `storeLatitude/Longitude`) is
  a snapshot taken at checkout time, not a live lookup** — a store that
  relocates or rebrands after an order is placed will not retroactively
  change how that order's map pin or logo render. This is intentional
  (matches how `storeName`/`storeLogoUrl` already behave on Checkout's own
  response) — don't report this as a staleness bug.
- **`storeLatitude`/`storeLongitude` are `null` for every order placed
  before this service's migration ran**, and will stay `null` even for
  orders placed afterward until Checkout itself is updated to populate
  them at order-creation time (out of scope for this slice — see "Data
  ownership"). Today, expect these `null` on every order.

---

## Ops

| Method & path | Auth |
|---|---|
| `GET /v3/api-docs`, `GET /swagger-ui.html` | public |

No `/actuator/health` — the actuator dependency isn't included in this
service.
