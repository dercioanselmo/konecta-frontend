# QR code pickup/delivery confirmation — API contract

**Status: §1 fully live. §2's target status needs a revision — see
"REVISION NEEDED" below.** `KONECTA-CHECKOUT-SERVICE` (qrCode
generation at order-creation time) and `KONECTA-ORDERS-SERVICE` (read
side + `complete-by-qr`'s resolve/shop-check/error handling) are
implemented and live-verified end-to-end — a real checkout produces a
real token, Orders reads back the identical token. What's now changing
is **where `complete-by-qr` lands the order**: not the terminal status
(`PICKED_UP`/`DELIVERED`) as originally built and verified, but the
last **store-side** status (`READY_FOR_PICKUP`) instead — see the
revision below for why.

---

## 1. `qrCode` on the order

**Generated once, by `KONECTA-CHECKOUT-SERVICE`, at order-creation
time** — an opaque, unguessable per-order token (e.g. a random 24-32
char string; doesn't need to be human-typeable, it's only ever
QR-scanned, never manually entered). Stored on the order row, **never
regenerated** — the same code is valid for the order's whole lifetime
until it reaches a terminal status.

Add `qrCode: string` to:
- `KONECTA-CHECKOUT-SERVICE`'s own `POST /api/v1/checkout` response (so
  it's available immediately after payment, before Orders even has the
  row) and its `GET /api/v1/orders/{orderId}`.
- `KONECTA-ORDERS-SERVICE`'s `GET /api/v1/orders/{orderId}` (customer)
  and `GET /api/v1/merchant/shops/{shopId}/orders/{orderId}` (merchant) —
  **not** on the list endpoints, no reason to ship every order's QR
  token in a paginated list response.

**Security note**: because this token alone is sufficient to complete
an order (see §2), treat it like a credential — don't log it, don't
include it in analytics events, and the customer-facing detail endpoint
should keep returning it only to the order's own owner (already true by
construction, since that endpoint is owner-scoped).

---

## 2. `POST /api/v1/merchant/shops/{shopId}/orders/complete-by-qr`

The actual new capability. Distinct from the existing
`PATCH .../orders/{orderId}/status` (see `API_REFERENCE_MERCHANT_ORDERS.md`)
— this one has a **wider, special-cased transition rule**, not a
tighter one: it's allowed **from any status except `CANCELLED` and
`REFUNDED`**, straight to the order's terminal success status, skipping
every intermediate step.

**Auth**: same as every other merchant-scoped endpoint — `MERCHANT`
(shop owner), `MERCHANT_STAFF` (shopId claim match), or `ADMIN`.

**Request body**

```json
{ "qrCode": "the-scanned-token" }
```

No `orderId` in the path or body — the order is resolved **by the
token itself**, then its `storeId` is checked against the path's
`{shopId}` (so a code from a different shop can't be completed here).

**Behavior**

1. Resolve the order by `qrCode`. Unknown token → `404 ORDER_NOT_FOUND`
   (don't distinguish "wrong shop" from "doesn't exist" in the message
   — avoid leaking which shops have which order tokens).
2. If the resolved order's `storeId` doesn't match `{shopId}` →
   `404 ORDER_NOT_FOUND` (same reasoning).
3. If current status is `CANCELLED` or `REFUNDED` → `409 INVALID_TRANSITION`.
4. ~~Otherwise transition to `PICKED_UP`/`DELIVERED`~~ — **REVISION
   NEEDED, see below** — otherwise transition to `READY_FOR_PICKUP`
   regardless of current status (even `PAID`/`PENDING_STORE_OPEN`), and
   **already at or past `READY_FOR_PICKUP`** (i.e. `COURIER_ASSIGNED`,
   `PICKED_UP`, `IN_TRANSIT`) → no-op `200`, order unchanged (never move
   an order *backward*).
5. Record this in `order_status_history` same as any other transition
   (`from_status` = whatever it was, `to_status` = `READY_FOR_PICKUP`,
   `actor_user_id` = caller) — skip this write on the already-past no-op.
6. Return the updated order (same shape as `GET .../orders/{orderId}`).

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `ORDER_NOT_FOUND` | Unknown token, or token belongs to a different shop |
| `409` | `INVALID_TRANSITION` | Order is `CANCELLED` or `REFUNDED` |
| `403` | `ACCESS_DENIED` | Staff `shopId` claim mismatch, or wrong role |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |

---

### REVISION NEEDED (2026-09-07): target status changes from terminal to `READY_FOR_PICKUP`

The original version of this endpoint (built, shipped, and
live-verified working exactly as spec'd) jumped straight to the order's
**terminal** status — `PICKED_UP` for pickup, `DELIVERED` for delivery —
in one scan, with no further action needed. **That's being walked
back.** The product decision: a QR scan should never be the thing that
single-handedly closes out an order. It should fast-forward the order
to `READY_FOR_PICKUP` — the last status the *store* is responsible for —
from wherever it currently sits (so staff don't have to click through
Aceitar/Iniciar preparação/Marcar como pronto by hand when the customer
is already standing at the counter with their code), and then a human
makes the actual final call **on the order detail page**, via the
existing `PATCH .../orders/{orderId}/status` action buttons
(`READY_FOR_PICKUP → PICKED_UP` for pickup; `READY_FOR_PICKUP →
COURIER_ASSIGNED` for delivery — both already implemented, no change
needed there) — deliberately so staff can glance at the product list
against what's physically being handed over before confirming, not blindly
trust a scanned code to finish the order by itself.

Concretely: replace step 4's target status. Everything else in this
section — token resolution, shop-match check, `CANCELLED`/`REFUNDED`
rejection, auth rules, error codes — stays exactly as built and
verified. The one new wrinkle: since `READY_FOR_PICKUP` is *earlier*
than several already-reachable statuses (`COURIER_ASSIGNED`,
`PICKED_UP`, `IN_TRANSIT`), a re-scan after the order has already moved
past it must be a no-op, not a step backward — same idempotency
principle as the original idempotency note below, just resolved
concretely this time instead of left open.

The endpoint name/route (`complete-by-qr`) is left as-is despite no
longer "completing" anything — a rename is a bigger churn than the
behavior change itself and isn't requested; flagging the naming
mismatch here so nobody's confused reading the code cold.

---

## Frontend status

Fully built, no changes needed now that Orders is live: `Order.qrCode?:
string | null` (`lib/checkout/types.ts`), `components/orders/OrderQrCode.tsx`
(client-side rendering via the `qrcode` npm package — no backend image
needed, just the raw token), wired into the customer order detail screen.
Merchant side: `components/merchant/QrScanner.tsx` (camera capture +
`jsQR` decode, no all-in-one scanning library),
`app/merchant/shops/[shopId]/orders/scan/` (+ the equivalent under
`app/admin/shops/[shopId]/orders/scan/` via the established reuse
pattern), `lib/orders/merchantClient.ts`'s `completeOrderByQr()`, BFF
route `app/api/merchant/shops/[shopId]/orders/complete-by-qr/route.ts`.

**Live-verified end-to-end 2026-09-07** directly against the real
services (as customer `dercio.miguel@gmail.com` and merchant
`dercio.anselmo@zohomail.com`), bypassing the UI:
- `POST /api/v1/checkout` on a fresh order (store "Supermercado Baoba",
  order `837e6ecd-fbf0-4878-a36d-2464cfa0373a`) returned a real token
  (`qrCode: "x0JAq31MBFGdCIGmER17FkKX9Ag71XAM"`).
- `GET /api/v1/orders/{orderId}` (Orders, customer-scoped) read back
  the **identical** token straight after.
- `POST /api/v1/merchant/shops/{shopId}/orders/complete-by-qr` with that
  token jumped the order `PAID → PICKED_UP` in one call, `200`, correct
  `deliveryMode`-based terminal status.
- Earlier this session, an unknown token correctly returned
  `404 ORDER_NOT_FOUND` (not `500`).
- The BFF route (`app/api/merchant/shops/[shopId]/orders/complete-by-qr/route.ts`)
  is a plain passthrough (auth + JSON forward) and needed no change to
  carry any of this through to `ScanOrderView.tsx`.
- Orders placed before this shipped keep `qrCode: null` forever (no
  backfill) — expected, and the customer detail page's degrade-cleanly
  path (no QR section when absent/null) already handles it correctly.

**Frontend already updated for the revised target status (2026-09-07)**
— no frontend code change is actually needed once the backend ships the
revision above, since the UI already just echoes back whatever status
the API returns. What *did* change this round is copy/messaging:
`PickupQrScanner.tsx`'s success panel now says "Encomenda avançada" +
"Confirme a entrega ao cliente na página da encomenda depois de
verificar os produtos" instead of implying the scan itself finished the
order, and `ScanOrderView.tsx`'s intro copy matches. Until the backend
ships the revision, a scan still jumps straight to the terminal status
as originally built — the copy is intentionally generic enough
(echoes `order.status` as returned) to read correctly either way.

`tsc --noEmit`, `eslint`, `npm run build` all clean.
