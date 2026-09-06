# Orders — API inventory

Base URL: `http://localhost:8095` · Eureka name: `KONECTA-ORDERS-SERVICE`
Auth: `Authorization: Bearer <JWT>` from `KONECTA-SECURITY-SERVICE` (HS256, shared secret — the secret string's raw UTF-8 bytes are the HMAC key, not base64-decoded). Any authenticated role; no role restriction.
Errors: `{ code, message, details[], timestamp }` — `code` machine-readable, `message`/`details` in Portuguese.
Owns: nothing yet writes here — this service reads the same `orders`/`order_items` tables `KONECTA-CHECKOUT-SERVICE` owns and writes to, plus a handful of additive tracking columns it added itself (see "Data ownership" below). Read-only: **no write endpoints exist on this service.**

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

**This service does not currently write orders and has no create/update
endpoint.** It is a read model over `KONECTA-CHECKOUT-SERVICE`'s own
`orders`/`order_items` tables — same physical Postgres database
(`konecta-checkout`), not a separate one. Checkout remains the sole writer.

Practical implications for anyone integrating against this service:

- **An order only shows up here once Checkout has placed it.** There is no
  independent order-creation path — don't expect a `POST` here.
- **The tracking fields (`storeLatitude/Longitude`, `courierLatitude/
  Longitude`, `etaMinutes`, `etaAt`) exist as columns this service added
  via its own migration, but nothing currently populates them** — no
  courier-tracking source exists on the platform yet (per AGENTS.md's
  collaborator table). Expect `null` for all of them on every order today.
  This is the expected, documented state — not a bug to report.
- **This arrangement is explicitly interim.** AGENTS.md's own instruction
  is not to leave two conflicting sources of truth long-term; the
  documented follow-up (see `context.md`) is for Checkout to eventually
  create orders through this service (via Feign) instead of owning the
  table directly, at which point this service gets its own independent
  database. Any integration built against this service today should not
  assume today's physical-database detail is permanent — only the HTTP
  contract in this document is the stable interface.

---

## What this service does *not* expose (known gaps for other services)

- **No write endpoints at all.** No order creation, no status transitions,
  no cancellation. `KONECTA-CHECKOUT-SERVICE` remains the only service that
  can create an order in this phase; nothing can move an order out of
  whatever status Checkout (or a future courier/merchant flow) set it to.
- **No status-transition endpoint.** AGENTS.md's full state machine
  (`canTransition(from, to, deliveryMode)`) is specified but not
  implemented here — there's nothing to enforce yet since nothing writes.
  A future merchant/staff/courier PATCH endpoint would need to be built
  here, gated by role + store membership per AGENTS.md §7.
- **No `order_status_history` persistence.** AGENTS.md §4 asks for a
  status-history table (`order_id, from_status, to_status, actor_user_id,
  created_at, note`) — not built, since nothing here produces transitions
  to record yet.
- **No stock-release on cancel.** AGENTS.md §8 asks for Stock reservation
  release on `CANCELLED`/`REFUNDED` — not applicable yet; this service
  doesn't observe or cause status changes.
- **No `order.status_changed` Kafka event.** Listed as optional/"not
  required to ship list/detail" in AGENTS.md §8 — not built.
- **No merchant/staff/courier-facing views.** Every endpoint here is
  customer-owner-scoped only (`customer_user_id` from the JWT). A "orders
  for my shop" or courier-assignment view would need new, separately
  role-gated endpoints — nothing like that exists today.
- **No admin listing/search over all orders.** No `GET
  /api/v1/admin/orders` equivalent to other services' admin list endpoints.
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
