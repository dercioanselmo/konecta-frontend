# Merchant/staff order management — PROPOSED API contract

**Status: PROPOSED. None of this exists on any backend service yet.**
This is the mandatory end-of-slice backend report for the new merchant
Orders tab (per user request: "the orders tab... is the main tab inside
the store dashboard"). The UI is fully built against this contract and
degrades to a clean error state — confirmed live: hitting the (currently
unmapped) proposed path against the real `KONECTA-ORDERS-SERVICE`
returns a structured `500 INTERNAL_ERROR` body rather than a crash or
raw stack trace, and the frontend renders that as a normal error banner.

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
