# KONECTA Orders microservice — RESOLVED

**Status: RESOLVED.** `KONECTA-ORDERS-SERVICE` is live at
`http://localhost:8095` (registered in Eureka, guessed port turned out
correct again) and matches this proposal essentially exactly — see
`API_REFERENCE_konecta_order.md` for backend's own authoritative
version. This file is kept as the historical end-of-slice record; the
frontend now targets the real service for all order reads.

**Confirmed deltas / clarifications from backend's doc, reconciled into
the frontend:**

- **Read-only, explicitly interim data ownership**: this service reads
  Checkout's own `orders`/`order_items` tables directly (same Postgres
  database) rather than owning its own — backend flagged this as a
  known, temporary arrangement, not a bug. No frontend impact; the HTTP
  contract is what's stable.
- **`DeliveryAddress.latitude`/`longitude` can be `null`** even when the
  address itself is present — my original proposal had these as
  non-nullable. Fixed in `lib/checkout/types.ts` (shared with
  `CheckoutRequest`, which still always submits real numbers by
  construction) and guarded in `components/orders/OrderMap.tsx`.
- **Tracking fields (`courierLatitude/Longitude`, `etaMinutes`,
  `etaAt`) and `storeLatitude/Longitude` are confirmed always `null`
  today** — no courier-tracking source exists yet, and Checkout hasn't
  been updated to populate store coordinates at order-creation time.
  Matches what the frontend already assumed and degrades for.
- Everything else (list query params, response envelope, detail shape,
  `tab` active/history split, error codes) confirmed byte-for-byte
  identical to what was proposed and built against.

## Live verification performed

Logged in as the real customer through the actual running Next app
(not just raw backend curl):

- `GET /api/orders?tab=ACTIVE` → `200`, real data, 8 orders (all
  `PAID`/`PENDING_STORE_OPEN` from earlier rounds' testing).
- `GET /api/orders?tab=HISTORY` → `200`, correctly empty (no terminal
  orders exist yet).
- `GET /api/orders/{orderId}` (the switched-over BFF route) → `200`,
  matches the Orders service's response exactly.
- Full SSR page (`/orders/{orderId}`) renders correctly: a real PICKUP
  order's roadmap shows "Pagamento confirmado" (done) and "Levantado"
  (muted, not yet reached) with the right labels; the map section
  correctly renders nothing since this order has no coordinates yet
  (expected — confirms the optional-field degradation works against
  real data, not just in theory).
- `tsc --noEmit`, `eslint`, `npm run build` all clean after switching
  `app/api/orders/[orderId]/route.ts` and `app/orders/[orderId]/page.tsx`
  from Checkout's bridge endpoint to `ordersApiFetch`.

---

## Why this exists

Checkout's own `GET /api/v1/orders/{orderId}` (live today, see
`API_REFERENCE-checkout-service.md`) is enough for the *very first*
view of an order right after placing it, but AGENTS.md's Orders section
asks for a proper hub (Activas/Histórico tabs, search, filters, sort)
and a richer detail screen (status roadmap, tracking map, ETA) — none
of which Checkout is meant to own long-term. Per that section: *"Prefer
Orders service for all order reads... If temporarily only Checkout has
the order, follow project wiring until Orders is up — then switch."*

The frontend currently does exactly that split:
- **Order detail** (`/orders/[orderId]`) still reads through Checkout's
  existing endpoint (works today, live-verified).
- **Orders hub** (`/orders`, list/search/filter) has **no existing
  endpoint at all** to bridge through — it's built fully against this
  proposed contract and shows a clean "serviço ainda não disponível"
  message until this service exists.

---

## Auth

Every endpoint requires `Authorization: Bearer <accessToken>`, scoped to
the caller — a customer only ever sees their own orders. `401
UNAUTHENTICATED` for missing/invalid tokens, same shape as Checkout's.

---

## `GET /api/v1/orders` — list, search, filter, sort, paginate

**Query params**

| Param | Type | Notes |
|---|---|---|
| `tab` | `ACTIVE` \| `HISTORY` | **Active**: everything before a terminal state — `PAID` through `IN_TRANSIT`/`READY_FOR_PICKUP`/etc., excluding `DELIVERED`, `CANCELLED`, `REFUNDED`, and `PICKED_UP` **when `deliveryMode` is `PICKUP`** (a pickup order is "done" once collected). **History**: the complement — `DELIVERED`, `CANCELLED`, `REFUNDED`, and `PICKED_UP` for pickup orders. |
| `storeName` | string | Optional, partial/contains match on the order's store name |
| `productName` | string | Optional, matches if **any line item** on the order contains this in its name |
| `dateFrom` / `dateTo` | ISO date (`YYYY-MM-DD`) | Optional, inclusive range on `createdAt` |
| `q` | string | Optional free text on the order id (e.g. the short 8-char prefix shown in the UI) |
| `sort` | `createdAt,desc` \| `createdAt,asc` | Default `createdAt,desc` |
| `page` / `size` | int | Standard pagination, frontend currently requests `size=20` |

**Response `200 OK`**

```json
{
  "content": [
    {
      "orderId": "uuid",
      "status": "PAID",
      "storeId": "uuid",
      "storeName": "string",
      "storeLogoUrl": "string | null",
      "itemCount": 3,
      "total": 1279.75,
      "createdAt": "2026-09-06T10:00:00Z"
    }
  ],
  "totalElements": 12,
  "totalPages": 1,
  "page": 0,
  "size": 20
}
```

`itemCount` is the sum of line quantities (or line count — whichever is
cheaper to compute; the UI just displays it as "N artigo(s)", doesn't
do math on it).

---

## `GET /api/v1/orders/{orderId}` — full detail (eventually replaces Checkout's)

Same shape as Checkout's existing `Order` response (`orderId, status,
storeId, storeName, storeLogoUrl, items[], subtotal, deliveryFee, total,
deliveryMode, deliveryAddress, paymentMethod, contactEmail,
contactPhone, createdAt`), **plus** new fields the frontend is already
coded to read (all optional/nullable — the detail screen just skips the
map/ETA pieces when they're absent, which is what happens today reading
Checkout's response):

| Field | Type | Notes |
|---|---|---|
| `storeLatitude` / `storeLongitude` | number \| null | **Snapshotted at order-creation time**, not a live Stores-and-Stock lookup — same reasoning as `storeName`/`storeLogoUrl` already being snapshots: a store relocating shouldn't retroactively change where a past order's map pin sits. |
| `courierLatitude` / `courierLongitude` | number \| null | Present once a courier is en route; `null` before assignment and for pickup orders |
| `etaMinutes` | number \| null | Present alongside courier position |
| `etaAt` | ISO 8601 \| null | Alternative to `etaMinutes` if that's easier to compute server-side; the frontend only reads `etaMinutes` today — flagging `etaAt` as a nice-to-have alternative, not requesting both |

If real route geometry (an actual road path, not a straight line) is
available, that would be a further enhancement — **not requested here**;
the frontend draws a straight dashed line store→delivery as the
stand-in trajectory once `status` reaches `PICKED_UP`, per AGENTS.md
§4.2's explicit fallback ("if not, show straight line... and ETA text").

**Errors**: `404 ORDER_NOT_FOUND` (unknown id or belongs to another
user — same as Checkout's precedent, `404` not `403` to avoid confirming
existence), `401 UNAUTHENTICATED`.

---

## Data models

### `OrderSummary` (list row)

`{ orderId, status, storeId, storeName, storeLogoUrl, itemCount, total, createdAt }`

### `Order` (detail) — see Checkout's own doc for the base shape; this
service's response is that shape plus the tracking fields in the table
above.

### Order status

No changes — reuse the exact same enum Checkout already defines
(`CREATED, PAID, PENDING_STORE_OPEN, STORE_CONFIRMED, PREPARING,
READY_FOR_PICKUP, COURIER_ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED,
CANCELLED, REFUNDED`). The frontend's status-roadmap component
(`components/orders/OrderStatusRoadmap.tsx`) already has Portuguese
labels and a per-delivery-mode step sequence for every one of these; no
new status value should be introduced without a matching frontend update.

---

## What's needed from the other, already-existing services

- **KONECTA-SECURITY-SERVICE** — nothing needed, already has everything
  (profile for header/contacts prefill elsewhere, not used by Orders reads).
- **KONECTA-STORES-AND-STOCK-SERVICE** — nothing needed for this feature.
  Store info on an order is a **snapshot** taken at checkout time (see
  `storeLatitude`/`storeLongitude` above), not a live lookup — consistent
  with how `storeName`/`storeLogoUrl` already work on Checkout's own
  response.
- **KONECTA-CHECKOUT-SERVICE** — no change requested. Once Orders exists,
  the frontend's `/api/orders/[orderId]` BFF route switches from calling
  Checkout's `GET /api/v1/orders/{orderId}` to calling this new service's
  equivalent instead — a frontend-only change, nothing Checkout needs to
  do differently.
- **A courier/delivery-tracking source** — not named in AGENTS.md's
  service table, so not assumed to exist yet. Wherever courier position
  data actually originates (a future Courier service, or Orders itself
  if it owns that data), it just needs to reach `courierLatitude`/
  `courierLongitude`/`etaMinutes` on this endpoint's response — not
  prescribing which service computes it.

---

## Frontend status

Fully built against this contract:

- `lib/orders/types.ts`, `lib/orders/ordersApi.ts` (server-only fetch
  wrapper, mirrors `checkoutApi.ts`'s pattern), `lib/orders/client.ts`
  (client-side `listOrders()` + `OrdersApiError`). New BFF route
  `app/api/orders/route.ts`.
- `app/orders/page.tsx` + `OrdersHubView.tsx` — tabs (Activas/Histórico),
  search by store/product/date-range/order-id, sort, empty states.
  **Live-verified**: with no Orders service running, the hub correctly
  shows "O serviço de encomendas ainda não está disponível" instead of
  crashing (confirmed the underlying BFF route returns a clean `502`,
  not a raw stack trace, when the service is unreachable).
- `components/orders/OrderStatusRoadmap.tsx` — the "roadmap" status UI,
  delivery-mode-aware step sequences, Portuguese labels, `CANCELLED`/
  `REFUNDED` shown as a distinct banner instead of a broken progress bar.
- `components/orders/OrderMap.tsx` + `OrderMapInner.tsx` — Leaflet/OSM
  map (no paid Google requirement, matching the rest of the app), store
  + delivery pins, optional courier pin, straight-line trajectory once
  picked up, ETA text. Renders nothing (not an error) when no
  coordinates are available yet — never blocks the rest of the page.
- `app/orders/[orderId]/page.tsx` + `OrderDetailView.tsx` — still reads
  through Checkout's existing endpoint (works today), enhanced with the
  roadmap, map, full product list, and value summary (subtotal/delivery
  fee/total). Polls every 20s (and on window focus) while the order is
  non-terminal, stops polling once it reaches a terminal state.
- `components/customer/CustomerHeader.tsx` — added a "Pedidos" link
  (the app has no bottom tab bar yet — this is the pragmatic entry point
  given the existing top-header chrome; flagging this as a scope choice,
  not silently deviating from AGENTS.md's "bottom nav" phrasing).
- `lib/checkout/types.ts` — `Order` gained the optional tracking fields
  listed above; `lib/checkout/orderStatusLabels.ts` — a couple of labels
  (`PAID`, `STORE_CONFIRMED`) realigned to AGENTS.md's suggested wording.

`tsc --noEmit`, `eslint`, `npm run build` all clean. Order detail
live-verified against a real existing order (via the real running app,
authenticated session) — roadmap and money summary render correctly;
map correctly shows only the delivery pin for that order (no store
lat/lng in Checkout's response today, which is expected and handled).
The hub's empty/unavailable state live-verified the same way. Full
list/search behavior against real data is not verifiable until this
service exists.
