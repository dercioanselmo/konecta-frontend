# Order map only shows one pin — needs Checkout to snapshot store lat/lng

**Status: PROPOSED, re-flagged with priority.** Originally noted as a
follow-up in `API_REFERENCE_ORDERS.md`; re-raising as its own short doc
because it's now the thing actually blocking a feature the user asked
for directly (the two-pin order tracking map), not a hypothetical.

## What's confirmed today

Live-checked a real order (`05fe2d93-1a7d-4975-a845-426fc532f9d8`,
`GET /api/v1/orders/{id}` on `KONECTA-ORDERS-SERVICE`):

```json
{
  "storeLatitude": null,
  "storeLongitude": null,
  "deliveryMode": "DELIVERY",
  "deliveryAddress": { "latitude": -25.9692, "longitude": 32.5732, ... }
}
```

`deliveryAddress` has real coordinates (the customer's own address, set
at checkout). `storeLatitude`/`storeLongitude` are `null` — as
documented, this is true for **every** order, old and new, because
nothing currently writes to those two columns.

## Frontend is fully ready, waiting on data only

`components/orders/OrderMap.tsx` already renders **two pins** — store
and delivery — whenever both coordinates are present, plus a courier
pin and trajectory line once those fields are populated too. Nothing
to build here; confirmed by code and by live testing. The map only ever
shows one pin today because the store side of the data is missing, not
because of any frontend limitation.

## The actual ask

`KONECTA-CHECKOUT-SERVICE` already looks up the shop (`storeName`,
`storeLogoUrl`) when creating an order — it needs to also read that
shop's `latitude`/`longitude` (already stored on Stores-and-Stock's own
`Shop` record, set via the merchant's own `/merchant/shops/{shopId}/location`
screen) and snapshot those two extra fields onto the order it creates,
the same way it already snapshots the name and logo. `KONECTA-ORDERS-
SERVICE`'s columns for this already exist (`storeLatitude`/
`storeLongitude`, added in its own earlier migration) — this is purely
"populate them at write time," no new column, no new service.

Orders placed before this ships will keep showing `null` (expected,
already documented) — only new orders would start carrying real
coordinates.
