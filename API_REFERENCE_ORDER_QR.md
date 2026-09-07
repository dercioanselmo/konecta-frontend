# QR code pickup/delivery confirmation — API contract

**Status: FULLY LIVE.** Both `KONECTA-CHECKOUT-SERVICE` (qrCode
generation at order-creation time) and `KONECTA-ORDERS-SERVICE` (read
side + `complete-by-qr`) are implemented and live-verified end-to-end
2026-09-07 — a real checkout produces a real token, Orders reads back
the identical token, and a merchant scan-and-complete call jumps the
order straight to its terminal status. The frontend needed zero code
changes; it was already built against this exact contract.

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
4. Otherwise transition to `PICKED_UP` (order's `deliveryMode = PICKUP`)
   or `DELIVERED` (`deliveryMode = DELIVERY`) — regardless of the
   current status, even if it's still `PAID` or `PENDING_STORE_OPEN`
   (per the explicit ask: "from any state... to delivered or picked up").
5. Record this in `order_status_history` same as any other transition
   (`from_status` = whatever it was, `to_status` = the terminal one,
   `actor_user_id` = caller).
6. Return the updated order (same shape as `GET .../orders/{orderId}`).

**Errors**

| Status | Code | When |
|---|---|---|
| `404` | `ORDER_NOT_FOUND` | Unknown token, or token belongs to a different shop |
| `409` | `INVALID_TRANSITION` | Order is `CANCELLED` or `REFUNDED` |
| `403` | `ACCESS_DENIED` | Staff `shopId` claim mismatch, or wrong role |
| `401` | `UNAUTHENTICATED` | Missing/invalid token |

**Idempotency note**: scanning an already-`PICKED_UP`/`DELIVERED`
order's code again — should this succeed as a no-op (`200`, unchanged),
or fail? Not prescribing an answer; whichever is simpler to implement
correctly, since either behavior is defensible and the frontend handles
both fine (a repeat scan either shows "already confirmed" success or a
clean error, neither breaks anything).

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

No remaining backend gaps. `tsc --noEmit`, `eslint`, `npm run build` all
clean (no frontend code changed — verification only, both rounds).
