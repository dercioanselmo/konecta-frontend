# Merchant/staff order management — RESOLVED

**Status: RESOLVED.** Backend implemented this on `KONECTA-ORDERS-SERVICE`
itself (not a separate service) — see `API_REFERENCE_konecta_order.md`'s
"Merchant order management" section for the authoritative version. Paths,
request/response shapes, and — notably — the **exact transition table**
proposed below were all adopted as proposed; no frontend code changes
were needed beyond wording (see "Confirmed deltas").

**Confirmed deltas / clarifications from backend's doc:**

- **`search` matches customer *contact* (email/phone), not name.**
  `customerName` is resolved live from Security per-request, not stored
  on the order row, so it can't participate in the same DB-level search
  query as the other fields. Fixed the search box's placeholder text
  (`MerchantOrdersList.tsx`) from implying name-search to correctly
  saying "Contacto do cliente, produto ou nº da encomenda."
- **Role set is `MERCHANT`, `MERCHANT_STAFF`, or `ADMIN`** — matches
  what was already built (Admin reuses the same views via
  `basePath="/admin/shops"`).
- **Ownership check for `MERCHANT`** is a live call to
  Stores-and-Stock's own `GET /api/v1/merchant/shops/{shopId}` with the
  caller's forwarded token — an implementation detail, no frontend impact.
- **`order_status_history`** is a new table this service owns outright,
  recording every transition (`from_status, to_status, actor_user_id,
  created_at`) — not currently surfaced anywhere in the UI; flagging as
  a nice-to-have for a future "histórico de estados" detail section, not
  requesting anything now.
- Two services can now write to the same `orders` row (Checkout on
  creation, Orders on merchant status changes) — backend flagged this
  explicitly as a currently-safe-but-unguarded (no optimistic locking)
  arrangement. Nothing for the frontend to do about this; noted for
  awareness.

## Live verification performed

Logged in as the real merchant account through the actual running app:

- `GET /api/merchant/shops/{shopId}/orders?tab=ACTIVE` → real orders
  with **real resolved customer names** ("Dercio 2 Anselmo3"), not
  emails or placeholders.
- `GET /api/merchant/shops/{shopId}/orders/{orderId}` → full detail,
  matches the documented shape exactly.
- `PATCH .../status` with `{"status":"STORE_CONFIRMED"}` on a real
  `PENDING_STORE_OPEN` test order → `200`, status updated.
- **Cross-service consistency confirmed**: immediately after that PATCH,
  fetched the same order through the **customer-facing**
  `GET /api/orders/{orderId}` (different route, different auth scope,
  logged in as the actual customer) — returned `STORE_CONFIRMED`,
  confirming both endpoints really do read the same row live, not a
  cached or eventually-consistent copy.
- **Server-side enforcement confirmed**: attempted the invalid jump
  `STORE_CONFIRMED → DELIVERED` → correctly rejected with
  `409 INVALID_TRANSITION`, proving the backend validates independently
  of whatever the frontend's own `statusTransitions.ts` config renders.
- `tsc --noEmit`, `eslint`, `npm run build` all clean after the wording fix.

---

## Why this exists, and a real architectural wrinkle to flag

`KONECTA-ORDERS-SERVICE` (see `API_REFERENCE_konecta_order.md`) is
explicitly **customer-owner-scoped only and read-only today** — its own
doc says so directly: *"No merchant/staff/courier-facing views. Every
endpoint here is customer-owner-scoped only... nothing like that exists
today"* and *"No write endpoints at all... Checkout remains the only
service that can create an order in this phase."*

So this ask needs two things that don't exist anywhere yet:

1. **Shop-scoped reads** — "orders for my shop," not "orders for me as a
   customer." New surface area, doesn't conflict with the existing
   customer-facing endpoints.
2. **A status-write endpoint** — genuinely new capability. Given
   Checkout is documented as the sole writer of the underlying
   `orders`/`order_items` table today, a `PATCH .../status` most likely
   needs to either live on Checkout directly, or on Orders as a proxy
   that calls through to Checkout — **the frontend doesn't need to know
   which**, only the HTTP contract below. Flagging this explicitly
   rather than assuming it's a trivial addition to a read-only service.

The frontend targets these paths through its own `ORDERS_API_BASE_URL`
(same service registration as the customer-facing endpoints) — adjust
if backend decides the write half should physically live elsewhere; the
contract, not the routing, is what matters here.

---

## Auth

`Authorization: Bearer <accessToken>`, role `MERCHANT` (shop owner) or
`MERCHANT_STAFF` (their `shopId` JWT claim must match the path's
`shopId` — same pattern already established for Stores-and-Stock's own
merchant-scoped endpoints). `403 ACCESS_DENIED` for a `MERCHANT_STAFF`
whose `shopId` claim doesn't match, `404` for a shop the caller doesn't
own at all (don't confirm existence to a non-owner).

---

## `GET /api/v1/merchant/shops/{shopId}/orders` — list, search, filter

**Query params**

| Param | Type | Notes |
|---|---|---|
| `tab` | `ACTIVE` \| `HISTORY` | Same split as the customer-facing list |
| `search` | string | **Single box, OR semantics** — matches if **any** of: customer name, customer email/phone, any line item's product name, or the order id substring contains this text (case-insensitive). Learn from the customer hub's own gap (see `API_REFERENCE_ORDERS.md`'s follow-up section) — build this one with OR semantics from day one, don't repeat the `storeName`/`productName`/`q` AND-narrowing mistake. |
| `dateFrom` / `dateTo` | `YYYY-MM-DD` | Inclusive range on `createdAt` — **visible in the merchant UI**, unlike the customer hub where it was deliberately dropped |
| `page` / `size` | int | Default `page=0`, `size=20` |

Sort is fixed most-recent-first, not user-facing (matches the customer
hub's own simplification).

**Response `200 OK`**

```json
{
  "content": [
    {
      "orderId": "uuid",
      "status": "PAID",
      "customerName": "string",
      "customerPhone": "string",
      "itemCount": 2,
      "total": 800.02,
      "createdAt": "2026-09-06T10:00:00Z"
    }
  ],
  "totalElements": 5,
  "totalPages": 1,
  "page": 0,
  "size": 20
}
```

`storeId`/`storeName` are omitted from this row shape (redundant — the
whole list is already scoped to one shop via the URL).

---

## `GET /api/v1/merchant/shops/{shopId}/orders/{orderId}` — detail

Same shape as the customer-facing `Order` (see
`API_REFERENCE_konecta_order.md`), **plus `customerName`** (not present
on that model — it only carries `contactEmail`/`contactPhone`).
`404 ORDER_NOT_FOUND` for an unknown id or one belonging to a different
shop.

---

## `PATCH /api/v1/merchant/shops/{shopId}/orders/{orderId}/status` — the actual new capability

**Request body**: `{ "status": "STORE_CONFIRMED" }` — one of the
`OrderStatus` enum values already shared with Checkout/Orders.

**This must be validated server-side against a real state machine** —
the frontend's `lib/orders/statusTransitions.ts` renders a plausible
set of next-step buttons per current status (accept → prepare → ready →
picked-up/courier-assigned, plus cancel from most pre-ready states) but
is explicitly commented as **an interim UI hint, not authoritative** —
never trust a client-submitted status as valid without a real
`canTransition(from, to, deliveryMode, actorRole)` check server-side.
Suggested transition table (adjust freely — this is a starting point,
not a demand):

| From | To (merchant-triggerable) |
|---|---|
| `PAID`, `PENDING_STORE_OPEN` | `STORE_CONFIRMED`, `CANCELLED` |
| `STORE_CONFIRMED` | `PREPARING`, `CANCELLED` |
| `PREPARING` | `READY_FOR_PICKUP`, `CANCELLED` |
| `READY_FOR_PICKUP` (pickup order) | `PICKED_UP` |
| `READY_FOR_PICKUP` (delivery order) | `COURIER_ASSIGNED` |
| `COURIER_ASSIGNED` (delivery order) | `PICKED_UP` |

`IN_TRANSIT`/`DELIVERED` are intentionally **not** merchant-triggerable
in this proposal — those read as courier/system-driven, out of a
merchant's own responsibility boundary. Revisit once a courier flow
exists.

**Response `200 OK`** — the updated `Order`/detail shape (same as GET).

**Errors**

| Status | Code | When |
|---|---|---|
| `409` | `INVALID_TRANSITION` | Requested status isn't reachable from the current one |
| `404` | `ORDER_NOT_FOUND` | Unknown id or wrong shop |
| `403` | `ACCESS_DENIED` | Staff `shopId` claim mismatch |

---

## Data models

### `MerchantOrderSummary`

`{ orderId, status, customerName, customerPhone, itemCount, total, createdAt }`

### `MerchantOrder`

Same as `Order` (see `API_REFERENCE_konecta_order.md`) plus `customerName: string`.

---

## Frontend status

Fully built: `lib/orders/merchantTypes.ts`, `lib/orders/merchantClient.ts`,
`lib/orders/statusTransitions.ts` (the interim next-action config, with
an explicit comment that real enforcement is server-side), new BFF
routes `app/api/merchant/shops/[shopId]/orders/route.ts` and
`.../orders/[orderId]/route.ts` (GET + PATCH). UI: `MerchantOrdersList.tsx`
(tabs, one search box, visible date range — per this round's explicit
ask, unlike the customer hub) and `MerchantOrderDetailView.tsx` (reuses
the same `OrderStatusRoadmap`/`OrderMap` components built for the
customer side, plus the status-action buttons and a merchant-scoped
printable-receipt link). Admin gets the same views for free via the
established `basePath`/`listHref`/`listLabel` reuse pattern
(`app/admin/shops/[shopId]/orders/**`).

**Live-verified the degradation path**: with the real
`KONECTA-ORDERS-SERVICE` running but this path unmapped, the BFF route
correctly surfaces the service's own structured error response (a
`500 INTERNAL_ERROR` body, not a raw stack trace or a Next.js crash
page) as a normal in-UI error banner.

`tsc --noEmit`, `eslint`, `npm run build` all clean.

---

## Follow-up asks (2026-09-07): dashboard counts, status filter, deliveryMode on list rows

Three real gaps surfaced while building the merchant dashboard's new
order-status summary boxes and the list's new status filter — all
worked around client-side for now, listed here in case backend wants to
close them properly:

1. **No dedicated counts endpoint.** The dashboard's three new boxes
   ("Recebidas (por aceitar)" / "Aceites (em preparação)" / "Prontas /
   em entrega") are computed by fetching up to 200 active orders and
   bucketing by status client-side — correct today, but silently caps
   out at 200 orders and does one extra full-list fetch just to get
   three numbers. A `GET /api/v1/merchant/shops/{shopId}/orders/counts`
   (or similar) returning `{ notYetAccepted, acceptedInPrep,
   readyOrEnRoute }` — or even just per-status counts generically —
   would be both more correct at scale and cheaper.
2. **No `status` filter on the list endpoint.** The new "Estado" filter
   on the merchant orders list currently over-fetches (`size=100` when a
   status is selected) and filters client-side — correct for a shop with
   a modest order volume, silently incomplete beyond that. A `status`
   query param on `GET /api/v1/merchant/shops/{shopId}/orders` (single
   exact-match value) would remove the need for this workaround entirely.
3. **`deliveryMode` isn't on `MerchantOrderSummary`.** The list's
   status badges escalate color (white → orange → yellow, every 5 min)
   for orders sitting in a merchant-actionable status without moving —
   but `READY_FOR_PICKUP` should only escalate for **delivery** orders
   (a pickup order waiting there is waiting on the customer, not the
   merchant), and the list row has no way to know which. Today it
   over-includes (treats every `READY_FOR_PICKUP` row as urgent) rather
   than risk under-including a delivery order that actually needs a
   courier assigned. Adding `deliveryMode` to `MerchantOrderSummary`
   would let the list get this exactly right, matching what the detail
   endpoint already provides.

None of these block anything — the interim behavior is correct enough
to ship, just not optimal at scale or in the one specific edge case (3).

---

## Follow-up ask (2026-09-07): a per-status timestamp

Confirmed the urgency badge's timer needs to reset when an order enters
a new status, not keep counting from `createdAt` — right now the
frontend can only do this correctly for a status change made *in the
current browser session* (tracked in local component state the moment
`PATCH .../status` succeeds); reloading the page, or another staff
member's change, falls back to `createdAt` and can show a misleadingly
"urgent" color immediately after a status that's actually brand new.

The doc already mentions `order_status_history` records
`created_at` per transition — exposing the **latest** entry's timestamp
as e.g. `statusUpdatedAt` on both `GET .../orders/{orderId}` and each
row of `GET .../orders` (list) would let the frontend compute this
correctly everywhere, not just in the one session that made the change.
