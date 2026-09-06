# QR code pickup/delivery confirmation — PROPOSED API contract

**Status: PROPOSED. Nothing here exists on any backend service yet.**
End-of-slice backend report for the new QR feature: after payment, every
order carries a QR code the customer shows in the store (pickup) or to
whoever delivers it (delivery); scanning it at the store completes the
order in one step. The frontend is fully built against this contract —
`Order.qrCode` is optional/nullable so today's real orders (which don't
have one) still satisfy the type and simply don't show a QR; the new
scan screen calls a not-yet-existing endpoint and shows a clean error
until it exists (confirmed live: `500 INTERNAL_ERROR`, not a crash).

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

Fully built: `Order.qrCode?: string | null` (`lib/checkout/types.ts`),
`components/orders/OrderQrCode.tsx` (client-side rendering via the
`qrcode` npm package — no backend image needed, just the raw token),
wired into the customer order detail screen. Merchant side:
`components/merchant/QrScanner.tsx` (camera capture + `jsQR` decode,
no all-in-one scanning library), `app/merchant/shops/[shopId]/orders/scan/`
(+ the equivalent under `app/admin/shops/[shopId]/orders/scan/` via the
established reuse pattern), `lib/orders/merchantClient.ts`'s
`completeOrderByQr()`, new BFF route
`app/api/merchant/shops/[shopId]/orders/complete-by-qr/route.ts`.

**Live-verified the degradation path**: with `qrCode` absent from every
real order today, the customer detail page correctly renders with no QR
section (not an error) — confirmed against a real order. The new
`complete-by-qr` BFF route correctly surfaces the real Orders service's
structured error for an unmapped path (`500 INTERNAL_ERROR`) rather than
crashing, same pattern as every other not-yet-implemented endpoint in
this codebase.

`tsc --noEmit`, `eslint`, `npm run build` all clean.
