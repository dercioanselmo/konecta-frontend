# KONECTA Auth API

Identity, sessions, and roles for every KONECTA client — Customer, Merchant, Courier, and Mobility dashboards alike.

**Base URL (local):** `http://localhost:8091`

---

## Overview & auth model

Tokens are stateless JWTs; sessions (refresh tokens) are tracked server-side so they can be revoked.

**Sending a token:**

```
Authorization: Bearer <accessToken>
```

**Access token claims:**

```json
{
  "sub": "<userId>",
  "email": "ana@example.com",
  "roles": "ROLE_CUSTOMER",
  "type": "access",
  "iat": 1788295559,
  "exp": 1788296459
}
```

For `MERCHANT_STAFF` tokens, one extra claim is present:

```json
{
  "sub": "<userId>",
  "email": "staff@loja.com",
  "roles": "ROLE_MERCHANT_STAFF",
  "shopId": "<shopId>",
  "type": "access",
  "iat": 1788295559,
  "exp": 1788296459
}
```

> Access tokens expire in **15 minutes** by default (`expiresInSeconds` in the login/refresh response tells you the real value). Refresh tokens last up to 14 days and **rotate on every use** — the old one is revoked the instant a new one is issued, so store the new pair every time.

---

## Registration flow

1. `POST /auth/register` — create the account. Response has `emailVerified: false`.
2. An OTP is emailed automatically. User enters the 6-digit code.
3. `POST /auth/verify-otp` with `purpose: "REGISTER"` — flips `emailVerified` to `true`.
4. `POST /auth/login` — exchange email + password for an access/refresh token pair.
5. Store both tokens. Attach the access token as a Bearer header on every request.
6. When a request 401s with `INVALID_REFRESH_TOKEN` or the access token nears expiry, call `POST /auth/refresh` to rotate.
7. `POST /auth/logout` when the user signs out, to revoke the refresh token server-side.

> Self-registration always assigns `CUSTOMER` immediately. A customer can additionally *request* to become a Merchant, Courier, or Mobility Partner at registration time (`requestedRole` field) — that role is only granted once an admin approves it. See [Role upgrade requests](#role-upgrade-requests) below. Admin can also be granted directly via [Assign role](#patch-apiv1adminusersidrole) — there is no self-request path to `ADMIN`.

---

## Auth

### `POST /api/v1/auth/register` — Public

Creates a customer account and fires off a registration OTP by email. City is locked to Maputo; neighborhood must be one of the seeded bairros (see [Meta](#get-apiv1metaneighborhoods)).

**Request body**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | Required |
| `lastName` | string | Required |
| `email` | string | Required, unique, normalized to lowercase |
| `password` | string | Required, 8–100 chars |
| `birthDate` | date | `YYYY-MM-DD`, must be in the past |
| `phone` | string | Mozambican mobile: `+258` optional, then `8[2-7]` + 7 digits |
| `address` | string | Required |
| `city` | string | Must be `"Maputo"` |
| `neighborhood` | string | Must match a seeded bairro for the given city |
| `requestedRole` | string, optional | If present, one of `MERCHANT`, `COURIER`, `MOBILITY_PARTNER` — submits a role-upgrade request for admin review. Omit entirely for a plain customer signup. |

**Response `201 Created`**

```json
{
  "id": "96f589ac-c8d5-4bf3-bd2b-6336ab323cc5",
  "firstName": "Dercio",
  "lastName": "Anselmo",
  "email": "dercio.anselmo@gmail.com",
  "birthDate": "1995-05-20",
  "phone": "+258841234567",
  "address": "Av. Julius Nyerere",
  "city": "Maputo",
  "neighborhood": "Central",
  "role": "CUSTOMER",
  "status": "ACTIVE",
  "requestedRole": null,
  "emailVerified": false,
  "phoneVerified": false,
  "enabled": true,
  "shopId": null,
  "ownerId": null,
  "mustChangePassword": false,
  "photoUrl": null,
  "createdAt": "2026-09-01T21:35:22.489Z"
}
```

If `requestedRole` was supplied, the response instead has `status: "PENDING"` and `requestedRole` set to what was requested — `role` stays `CUSTOMER` until approved.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 409 | `EMAIL_ALREADY_REGISTERED` | Email already exists |
| 400 | `VALIDATION_ERROR` | See `details[]` for the failing field(s), incl. bad city / neighborhood / phone |
| 400 | `ROLE_NOT_REQUESTABLE` | `requestedRole` was something other than `MERCHANT`, `COURIER`, or `MOBILITY_PARTNER` (e.g. `ADMIN`, or `CUSTOMER`) |

---

### `POST /api/v1/auth/verify-otp` — Public

Confirms a one-time code. Currently wired up for `purpose: "REGISTER"`, which marks the account's email as verified and returns the updated profile.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `target` | string | The email the OTP was sent to |
| `code` | string | 6-digit code |
| `purpose` | enum | `REGISTER` · `LOGIN` · `VERIFY_PHONE` |

**Response `200 OK`** — same shape as the register response, with `emailVerified: true`.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 400 | `OTP_NOT_FOUND` | No pending OTP for that target/purpose |
| 400 | `OTP_EXPIRED` | Code has passed its TTL (5 min default) |
| 400 | `OTP_INVALID` | Code doesn't match |
| 429 | `OTP_LOCKED` | Too many wrong attempts — request a new code |
| 400 | `UNSUPPORTED_OTP_PURPOSE` | `LOGIN` / `VERIFY_PHONE` aren't wired to an action yet |

---

### `POST /api/v1/auth/set-password` — Public

Completes an admin-issued invite (see [Create staff user](#post-apiv1adminusers)) — sets a password on an account that had none, and logs the user in. The `code` is the token embedded in the "Set up your KONECTA account" email link.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `email` | string | The invited account's email |
| `code` | string | The token from the invite email/link |
| `newPassword` | string | 8–100 chars |

**Response `200 OK`** — same shape as [Login](#post-apiv1authlogin) (logs the user straight in).

**Errors:** same OTP errors as [Verify OTP](#post-apiv1authverify-otp) (`OTP_NOT_FOUND`, `OTP_EXPIRED`, `OTP_INVALID`, `OTP_LOCKED`), plus `404 USER_NOT_FOUND`.

---

### `POST /api/v1/auth/login` — Public

Email + password → a fresh access/refresh pair. Works whether or not the email has been verified.

**Request body**

| Field | Type |
|---|---|
| `email` | string |
| `password` | string |

**Response `200 OK`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "tokenType": "Bearer",
  "expiresInSeconds": 900
}
```

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (never reveals which) |
| 403 | `ACCOUNT_DISABLED` | Admin has disabled this account |

---

### `POST /api/v1/auth/refresh` — Public

Trades a refresh token for a brand new access/refresh pair. The old refresh token is revoked immediately — a second call with the same one always fails.

**Request body**

| Field | Type |
|---|---|
| `refreshToken` | string |

**Response `200 OK`** — same shape as [Login](#post-apiv1authlogin).

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 401 | `INVALID_REFRESH_TOKEN` | Expired, revoked, already-used, or malformed |
| 403 | `ACCOUNT_DISABLED` | Account was disabled since the token was issued |

---

### `POST /api/v1/auth/logout` — Public

Revokes one refresh token / session. No Bearer header required — the refresh token in the body is the credential. Always returns 204, even if the token was already revoked, so it's safe to call on sign-out unconditionally.

**Request body**

| Field | Type |
|---|---|
| `refreshToken` | string |

**Response:** `204 No Content`

---

### `POST /api/v1/auth/otp/request` — Public

Issues a fresh OTP for any purpose/channel — use this to resend a code, or to kick off phone verification. Rate-limited per target/purpose (5 requests/hour by default).

**Request body**

| Field | Type | Notes |
|---|---|---|
| `target` | string | Email or phone, matching the channel |
| `channel` | enum | `EMAIL` · `SMS` |
| `purpose` | enum | `REGISTER` · `LOGIN` · `VERIFY_PHONE` |

**Response:** `202 Accepted`, empty body. Assume the code was sent; don't reveal target existence either way.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 429 | `OTP_RATE_LIMITED` | Too many requests for this target this hour |

---

### `POST /api/v1/auth/change-password` — JWT

Voluntary password change (profile settings screen) and the forced first-login change for merchant-created staff both use this endpoint. The only difference is whether the frontend *requires* the user to hit it before proceeding — driven by `mustChangePassword: true` on the profile.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `currentPassword` | string | Required — proves the caller knows the password being replaced |
| `newPassword` | string | Required, 8–100 chars |

**Response `200 OK`** — the updated `UserProfileResponse`, with `mustChangePassword: false`.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 401 | `INVALID_CREDENTIALS` | `currentPassword` is wrong |
| 400 | `VALIDATION_ERROR` | `newPassword` too short / too long |

---

### `GET /oauth2/authorization/google` — Public

Google sign-in isn't a JSON call — it's a browser redirect. Point the "Continue with Google" button's `href` straight at this URL.

1. Browser navigates to `GET /oauth2/authorization/google`.
2. Google handles consent, then redirects back to the API's callback.
3. On success, the API creates or links the account (email must be Google-verified) and 302-redirects the browser to `OAUTH_FRONTEND_REDIRECT_URI` with tokens attached: `?accessToken=...&refreshToken=...`.

> Read the tokens off the query string on that landing page, store them, then strip them from the URL. There's no JSON response to parse for this flow.

---

## Users (self)

Everything here operates on the caller's own account, resolved from the Bearer token — there's no `{id}` in the path.

### `GET /api/v1/users/me` — JWT

Current profile and role — call this once after login/refresh to hydrate the app's user state.

**Response `200 OK`** — `UserProfileResponse`.

---

### `PATCH /api/v1/users/me` — JWT

Updates the editable profile fields. Email, password, and role are *not* editable here — use [change-password](#post-apiv1authchange-password) for password changes.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | Required |
| `lastName` | string | Required |
| `phone` | string | Same MZ format as register |
| `address` | string | Required |
| `city` | string | Must be `"Maputo"` |
| `neighborhood` | string | Must match a seeded bairro |
| `photoUrl` | string, optional | URL of the user's profile photo — store as-is, no S3 involvement here. See [Profile photo](#profile-photo) below. |

**Response `200 OK`** — the updated `UserProfileResponse`.

---

### `PATCH /api/v1/users/me/location` — JWT, any authenticated role

New 2026-09-04. Sets the caller's own GPS location — used for
proximity-based sorting/search on the customer side, but not restricted
to `ROLE_CUSTOMER`: a merchant or courier is also a person who might want
their own location set, so this falls to the generic authenticated rule,
nothing role-specific.

**Request body** — both required together:

```json
{ "latitude": -25.9692, "longitude": 32.5732 }
```

**Response `200 OK`** — the updated `UserProfileResponse`, now including
`latitude`/`longitude` (also present on plain `GET`, `null` until set —
and on the admin user-detail and merchant-staff-detail responses too,
since they all share this one DTO).

**Errors**: `400 VALIDATION_ERROR` outside a generous Maputo-area
bounding box (`lat -26.3..-25.7`, `lon 32.3..32.8` — same range as the
Stores-and-Stock shop-location endpoint), with separate messages for
`latitude` and `longitude` if both are out of range. `401` if
unauthenticated.

Currently **optional** — a user (customer or otherwise) can have no
location set indefinitely. Flag: once checkout exists, delivery will
need somewhere to route to — worth revisiting whether this should become
required at that point, for customers at least.

**Frontend**: new "Localização" section on `/profile`, reusing the exact
same Leaflet + OpenStreetMap picker built for shop location — no new
map/geocoding plumbing, just pointed at this endpoint instead.

---

### Checkout preferences — `GET`/`PATCH /api/v1/users/me/preferences`

New 2026-09-05, live-verified. Originally requested against
Stores-and-Stock (see that service's own doc for the withdrawn proposal
and why); built here instead, since Stores-and-Stock has no user-keyed
data at all today and this is squarely profile data. **Any authenticated
role**, same as location — matches the `PATCH .../location` precedent.

Standalone `UserPreferencesResponse` — **not** merged into
`UserProfileResponse`, so it doesn't show up on `GET /users/me` or
anywhere else that DTO appears (admin user detail, merchant-staff
detail).

**`GET /api/v1/users/me/preferences`** — both fields `null` until set:

```json
{ "deliveryPreference": null, "paymentMethod": null }
```

**`PATCH /api/v1/users/me/preferences`** — genuine partial update
(confirmed live: setting one field, then only the other, leaves the
first untouched):

```json
{ "deliveryPreference": "PICKUP" }
```

**Response `200 OK`** (both endpoints) — the current preferences, same
shape as `GET`:

| Field | Type | Values |
|---|---|---|
| `deliveryPreference` | string \| null | `HOME_DELIVERY`, `PICKUP` |
| `paymentMethod` | string \| null | `CARD`, `MPESA`, `EMOLA`, `CASH` |

Migration `V7`, two nullable columns on `users`.

**Frontend**: new "Preferências de compra" section on `/profile`
(`app/profile/PreferencesSection.tsx`), pill-toggle UI, saves
immediately on selection. `lib/auth/types.ts`
(`UserPreferences`/`DeliveryPreference`/`PaymentMethod`),
`lib/auth/client.ts` (`getUserPreferences`/`setUserPreferences`), BFF
route `app/api/users/preferences/route.ts`. Not yet consumed anywhere
else — these are stored now so checkout can default to them once it's
built.

---

### Profile photo

This service stores the photo URL only — it does **not** talk to S3.

**Frontend flow:** call Stores-and-Stock's presign endpoint → `PUT` to S3 → confirm (returns the stable object URL) → `PATCH /api/v1/users/me` here with `photoUrl` set to that URL.

> The URL stored in `photoUrl` should be the stable object URL, not a presigned GET URL (those expire in ~1 hour). Coordinate with whoever builds the Stores-and-Stock confirm step to ensure it returns the permanent URL, not the presigned one.

### CONFIRMED BUG — `photoUrl` is a dead presigned URL after ~1h (2026-09-03)

The risk flagged above has materialized. **Live-verified 2026-09-03**:
called `GET /api/v1/auth/me` (via the frontend, real session) twice —
once, then again after a fresh re-login roughly two hours later. Both
times it returned the **exact same** `photoUrl`, byte-for-byte, including
the same `X-Amz-Date=20260903T163536Z` query param — i.e. this service is
returning the presigned URL it was handed at upload time, verbatim,
forever, not a freshly-generated one. Fetching that URL directly from S3
now returns:

```xml
<Error><Code>AccessDenied</Code><Message>Request has expired</Message>
<X-Amz-Expires>3600</X-Amz-Expires><Expires>2026-09-03T17:35:36Z</Expires>
<ServerTime>2026-09-03T18:28:42Z</ServerTime></Error>
```

**User-visible symptom**: every avatar in the app (top-right header menu,
`/profile` page) shows a broken image once ~1h has passed since the photo
was last uploaded — permanently, since nothing ever refreshes it.

**Confirmed NOT an issue for shop logos/covers or product photos** — those
come back with a fresh `X-Amz-Date` on every single `GET`, verified live
by comparing two `GET /api/v1/admin/shops` calls minutes apart (different
signatures each time). Stores-and-Stock re-presigns those on every read
because the shop/product record is fetched live each time. The Security
service's `photoUrl` field is different: it's a plain string column on
the user, only ever written once (at upload/save time), and read back
as-is on every `GET /users/me` — there's no "fetch live from S3/Stores"
step to refresh it.

**Two ways to actually fix this** (either works, first is simpler):

1. **Store the S3 key, not the presigned URL**, and have this service
   ask Stores-and-Stock for a fresh presigned GET on every `GET /users/me`
   (Stores-and-Stock already does exactly this for shops/products — same
   pattern, just needs an endpoint this service can call by key, or make
   user photos public/unsigned since a profile photo isn't sensitive).
2. **Serve user photos from a public (unsigned, non-expiring) S3
   path/CDN URL** instead of a presigned one — appropriate here since,
   unlike fiscal documents, a profile photo has no confidentiality
   requirement. Simplest fix if S3 bucket policy allows a public prefix
   for `users/**`.

Frontend has nothing to change here — it already stores and renders
whatever `photoUrl` it's given; the fix is entirely on which URL gets
stored and how it's kept fresh.

---

## Role upgrade requests

How a `CUSTOMER` becomes a `MERCHANT`/`COURIER`/`MOBILITY_PARTNER` without an admin creating their account directly:

1. `POST /auth/register` with `requestedRole` set — account is created as `CUSTOMER`, `status: "PENDING"`, `requestedRole` set to what was requested.
2. Admin reviews pending applications: `GET /admin/users?status=PENDING`.
3. Admin approves (`POST /admin/users/{id}/approve`) — `role` flips to `requestedRole`, `requestedRole` clears, `status` returns to `"ACTIVE"`.
   Or rejects (`POST /admin/users/{id}/reject`) — `role` stays `CUSTOMER`, `requestedRole` clears, `status` becomes `"REJECTED"`. The user can still log in and use the app as a normal customer either way.

`status` and `enabled` are independent — a disabled account is `enabled: false` regardless of `status`, and a rejected applicant is still `enabled: true`.

---

## Admin

Requires `ROLE_ADMIN` — a non-admin token gets a 403 `ACCESS_DENIED`, no token gets a 401.

### `GET /api/v1/admin/users` — Admin

Search and paginate the user directory.

**Query params**

| Param | Type | Notes |
|---|---|---|
| `query` | string | Optional — matches email, first or last name (contains, case-insensitive) |
| `role` | string | Optional — filter to one role code (e.g. `MERCHANT`) |
| `status` | string | Optional — `PENDING` \| `ACTIVE` \| `REJECTED` |
| `page` | int | Default 0 |
| `size` | int | Default 20 |
| `sort` | string | e.g. `createdAt,desc` |

**Response `200 OK`**

```json
{
  "content": [ { "id": "…", "email": "…", "role": "CUSTOMER" } ],
  "page": 0,
  "size": 20,
  "totalElements": 128,
  "totalPages": 7
}
```

---

### `GET /api/v1/admin/users/{id}` — Admin

Full profile for one user by id.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 404 | `USER_NOT_FOUND` | No user with that id |

---

### `POST /api/v1/admin/users` — Admin

Directly onboards a staff account (Merchant, Courier, Admin, or Mobility Partner) without self-registration. No password is collected — the new user gets an emailed one-time link to set their own password (see [Set password](#post-apiv1authset-password)).

**Request body**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | Required |
| `lastName` | string | Required |
| `email` | string | Required, unique |
| `phone` | string | Same MZ format as register |
| `address` | string | Required |
| `city` | string | Must be `"Maputo"` |
| `neighborhood` | string | Must match a seeded bairro |
| `role` | string | One of `MERCHANT`, `COURIER`, `ADMIN`, `MOBILITY_PARTNER` — **not** `CUSTOMER` (self-registration owns that role) |

**Response `201 Created`** — a `UserProfileResponse` with `emailVerified: false` and `role` set to what was requested. Becomes usable once the invite link is completed.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 409 | `EMAIL_ALREADY_REGISTERED` | Email already exists |
| 400 | `ROLE_NOT_ALLOWED` | `role` was `CUSTOMER` — use `/auth/register` instead |
| 400 | `UNKNOWN_ROLE` | `role` doesn't match a seeded role |
| 400 | `VALIDATION_ERROR` | Bad city/neighborhood/phone/etc. |

---

### `PATCH /api/v1/admin/users/{id}` — Admin

Same field set and validation as [`PATCH /api/v1/users/me`](#patch-apiv1usersme), but lets an admin edit *any* user's profile. Does not touch email, password, or role.

**Request body:** identical to `PATCH /api/v1/users/me`.

**Response `200 OK`** — the updated profile.

---

### `PATCH /api/v1/admin/users/{id}/role` — Admin

Directly moves a user into any role — bypassing the [role-request/approve flow](#role-upgrade-requests) entirely. Accepts `MERCHANT_STAFF` as well as the other role codes. Fires a `user.role_changed` event. If the user had a pending role request, it's cleared and `status` resets to `"ACTIVE"`.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `roleCode` | string | One of the [role codes](#roles), case-insensitive |

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 400 | `UNKNOWN_ROLE` | `roleCode` doesn't match a seeded role |

---

### `PATCH /api/v1/admin/users/{id}/enabled` — Admin

Suspend or restore an account. Disabling fires a `user.disabled` event and blocks future login/refresh attempts immediately.

**Query params**

| Param | Type |
|---|---|
| `enabled` | boolean |

**Response `200 OK`** — the updated profile.

---

### `POST /api/v1/admin/users/{id}/approve` — Admin

Approves a pending [role upgrade request](#role-upgrade-requests): grants `requestedRole` as the user's new `role`, clears `requestedRole`, sets `status: "ACTIVE"`. Fires a `user.role_changed` event.

**Request body:** none.

**Response `200 OK`** — the updated profile.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 404 | `USER_NOT_FOUND` | No user with that id |
| 409 | `USER_NOT_PENDING` | User has no pending role request (already decided, or never requested one) |

---

### `POST /api/v1/admin/users/{id}/reject` — Admin

Denies a pending role upgrade request. `role` is left unchanged (typically still `CUSTOMER`), `requestedRole` clears, `status` becomes `"REJECTED"`. Does **not** disable the account.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `reason` | string, optional | Free-text note stored server-side as `statusReason` |

**Response `200 OK`** — the updated profile.

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 404 | `USER_NOT_FOUND` | No user with that id |
| 409 | `USER_NOT_PENDING` | User has no pending role request |

---

## Merchant staff

Requires `ROLE_MERCHANT` — a non-merchant token gets a 403 `ACCESS_DENIED`.

All endpoints are scoped to the calling merchant's own staff — you can only see and manage accounts you created. A request for a staff id that belongs to a different merchant returns `404 USER_NOT_FOUND` (not 403 — don't confirm existence to non-owners).

> **`shopId` trust model:** this service stores `shopId` as an opaque UUID — it does **not** verify that the calling merchant actually owns that shop. The frontend must verify shop ownership against the Stores-and-Stock service before calling these endpoints. Authorization for list/get/edit/enable is by `ownerId == jwt.sub`, which this service enforces directly.

### RESOLVED — Admin access to a shop's staff

**Done, live-verified 2026-09-04** with a real `ROLE_ADMIN` JWT, exactly
as proposed below: `GET /merchant/staff` requires `shopId` for Admin
(`400 SHOP_ID_REQUIRED` if omitted, matches by shop not `jwt.sub`);
`GET`/`PATCH /merchant/staff/{id}` and `PATCH .../enabled` bypass the
ownership check for Admin; `POST` (create) correctly still `403`s for
Admin. Verified against 3 real seeded staff on a real shop, including a
persisted `PATCH` and an enable/disable round-trip, and independently
through the actual running frontend app's own BFF route (not just direct
backend calls). Covered by `MerchantStaffAdminAccessIntegrationTest`,
18/18 suite green. Leaving the original proposal below for reference.

**Ask**: the Admin "Lojas" section (see `API_REFERENCE_MERCHANT_DASHBOARD.md`'s
now-RESOLVED Admin-access section) gives an Admin the same shop-management
capabilities as the shop's own `MERCHANT` — that now includes a
"Funcionários" tab, wired identically to the Merchant one, reusing the
exact same `StaffList`/`NewStaffForm`/`StaffDetailView` components.

**Confirmed live** (real `ROLE_ADMIN` JWT, 2026-09-03):
`GET /api/v1/merchant/staff?shopId={realShopId}` returns
`403 ACCESS_DENIED` for Admin — this endpoint group is still gated to
`ROLE_MERCHANT` only, same class of gap as the shops endpoints were
before that fix.

**Why this one's a bit different from the shops fix**: shops/products are
scoped by `{shopId}` in the path and checked against `shop.ownerId`, so
"bypass the ownership check for `ROLE_ADMIN`" was a clean, local change.
Staff has no `{shopId}` path segment at all — `GET /merchant/staff` is a
flat list scoped by `ownerId == jwt.sub`, with `shopId` only as an
**optional filter** on top of that scope (see the `shopId` trust-model
note above). For an Admin, `jwt.sub` isn't a merchant's id at all, so
"scope by `jwt.sub`" doesn't degrade gracefully to "scope by nothing" —
it needs an explicit different rule for the Admin case.

**What's needed**, mirroring the shops fix's shape:

- `GET /api/v1/merchant/staff`: when the caller is `ROLE_ADMIN`, **do
  not** scope by `jwt.sub` at all. Instead **require** the `shopId` query
  param (400 if missing for an Admin caller) and scope by that instead —
  i.e. return every `MERCHANT_STAFF` whose stored `shopId` matches,
  regardless of who created them. `ROLE_MERCHANT` behavior is unchanged
  (scoped by `jwt.sub`, `shopId` still optional there).
- `GET /api/v1/merchant/staff/{id}`, `PATCH .../{id}`,
  `PATCH .../{id}/enabled`: widen the `ownerId == jwt.sub` check to also
  accept `ROLE_ADMIN` unconditionally (bypass, not compare) — same
  pattern as the shops fix, no `shopId` needed since these are already
  scoped by a specific staff `id`.
- `POST /api/v1/merchant/staff` (create): **leave `ROLE_MERCHANT`-only**,
  same reasoning as shop creation staying merchant-only — an Admin
  creating a staff account raises an ownership question (whose staff is
  it?) that's out of scope here. Not requested; the frontend's admin
  "Funcionários" tab only needs list/view/edit/enable-toggle to reach
  parity, matching how shop-creation was intentionally left out of the
  earlier shops fix too.

**Frontend status**: fully built and wired (`/admin/shops/{shopId}/staff`
list, `/admin/shops/{shopId}/staff/{staffId}` edit — reusing the exact
same components as Merchant, minus the "new" flow which still only links
from the Merchant side). Will `403` on list until the above ships;
nothing further needed on the frontend once it does.

### `GET /api/v1/merchant/staff` — Merchant

List and search the calling merchant's staff.

**Query params**

| Param | Type | Notes |
|---|---|---|
| `shopId` | uuid, optional | Filter to one shop |
| `query` | string, optional | Matches email, first or last name (contains, case-insensitive) |
| `page` | int | Default 0 |
| `size` | int | Default 20 |
| `sort` | string | e.g. `createdAt,desc` |

**Response `200 OK`** — `PageResponse<UserProfileResponse>`, only staff this merchant created.

---

### `POST /api/v1/merchant/staff` — Merchant

Creates a `MERCHANT_STAFF` account with a password set directly by the merchant (unlike admin-created staff, which use an invite link). The new account has `mustChangePassword: true` — the frontend should gate the staff member's first session behind the [change-password](#post-apiv1authchange-password) screen.

**Request body**

| Field | Type | Notes |
|---|---|---|
| `firstName` | string | Required |
| `lastName` | string | Required |
| `email` | string | Required, unique |
| `password` | string | Required, 8–100 chars |
| `phone` | string | Same MZ format as register |
| `address` | string | Required |
| `city` | string | Must be `"Maputo"` |
| `neighborhood` | string | Must match a seeded bairro |
| `shopId` | uuid | Required — stored as-is, ownership not verified here |

**Response `201 Created`**

```json
{
  "id": "b3f1a2c4-...",
  "firstName": "Carlos",
  "lastName": "Machava",
  "email": "carlos@loja.com",
  "role": "MERCHANT_STAFF",
  "status": "ACTIVE",
  "enabled": true,
  "shopId": "a1b2c3d4-...",
  "ownerId": "<calling-merchant-id>",
  "mustChangePassword": true,
  "photoUrl": null,
  "createdAt": "2026-09-01T21:35:22.489Z"
}
```

**Errors**

| Status | Code | Meaning |
|---|---|---|
| 409 | `EMAIL_ALREADY_REGISTERED` | Email already exists |
| 400 | `VALIDATION_ERROR` | Bad city/neighborhood/phone/password/etc. |

---

### `GET /api/v1/merchant/staff/{id}` — Merchant

Full profile for one staff member. Returns `404` if the id doesn't belong to a staff account owned by the caller.

**Response `200 OK`** — `UserProfileResponse`.

---

### `PATCH /api/v1/merchant/staff/{id}` — Merchant

Edit a staff member's profile. Same field set as [`PATCH /api/v1/users/me`](#patch-apiv1usersme) (name, phone, address, city, neighborhood, photoUrl). Does not touch email, password, or role.

**Request body:** identical to `PATCH /api/v1/users/me`.

**Response `200 OK`** — the updated profile.

---

### `PATCH /api/v1/merchant/staff/{id}/enabled` — Merchant

Activate or deactivate a staff account.

**Query params**

| Param | Type |
|---|---|
| `enabled` | boolean |

**Response `200 OK`** — the updated profile.

---

## Meta

### `GET /api/v1/meta/neighborhoods` — Public

Use this to populate the bairro dropdown on the registration and profile forms — don't hardcode the list client-side, it can grow.

**Query params**

| Param | Type | Notes |
|---|---|---|
| `city` | string | Default `"Maputo"` — the only supported city right now |

**Response `200 OK`**

```json
[
  { "city": "Maputo", "name": "Central" },
  { "city": "Maputo", "name": "Polana Cimento" },
  { "city": "Maputo", "name": "Alto Mae" },
  { "city": "Maputo", "name": "Sommerschield" }
]
```
*(~38 seeded bairros total)*

---

## Roles

One role per user. The `roles` claim on the access token is a single `ROLE_<CODE>` string — check it directly, or decode and switch on it for dashboard routing.

| Code | Name (PT) | Description |
|---|---|---|
| `CUSTOMER` | Cliente | Buys products. Default on self-registration. |
| `MERCHANT` | Comerciante | Manages store, stock, orders. |
| `COURIER` | Entregador | Accepts and completes deliveries. |
| `ADMIN` | Administrador | Platform operations. |
| `MOBILITY_PARTNER` | Parceiro de Mobilidade | Fleet / rent-lease-earn dashboards. |
| `MERCHANT_STAFF` | Funcionário | Created by a `MERCHANT` for one shop. Never self-registered. |

---

## Data models

### `UserProfileResponse`

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | |
| `firstName` | string | |
| `lastName` | string | |
| `email` | string | |
| `birthDate` | date | |
| `phone` | string | |
| `address` | string | |
| `city` | string | |
| `neighborhood` | string | |
| `role` | string | One of the role codes above |
| `status` | string | `PENDING` \| `ACTIVE` \| `REJECTED` — see [Role upgrade requests](#role-upgrade-requests) |
| `requestedRole` | string, nullable | Set only while `status` is `PENDING` |
| `emailVerified` | boolean | |
| `phoneVerified` | boolean | |
| `enabled` | boolean | |
| `shopId` | uuid, nullable | Set only for `MERCHANT_STAFF` |
| `ownerId` | uuid, nullable | Set only for `MERCHANT_STAFF` — the `MERCHANT` user id who created this account |
| `mustChangePassword` | boolean | `true` for merchant-created staff until they complete [change-password](#post-apiv1authchange-password) |
| `photoUrl` | string, nullable | Profile photo URL — set via `PATCH /api/v1/users/me` |
| `createdAt` | timestamp | |

### `TokenResponse`

| Field | Type |
|---|---|
| `accessToken` | string (JWT) |
| `refreshToken` | string (JWT) |
| `tokenType` | string — always `"Bearer"` |
| `expiresInSeconds` | number |

### `PageResponse<T>`

| Field | Type |
|---|---|
| `content` | T[] |
| `page` | number |
| `size` | number |
| `totalElements` | number |
| `totalPages` | number |

---

## Error format

Every non-2xx response — validation, auth, business-rule — shares this shape. Branch UI on `code`, show `message` as a fallback, never parse stack traces (there aren't any).

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Request validation failed",
  "details": [
    "phone: phone must be a valid Mozambique mobile number"
  ],
  "timestamp": "2026-09-01T21:35:22.489Z"
}
```

> **401 vs 403, quickly:** **401** means "no valid token was presented" (missing, expired, malformed). **403** means "valid token, wrong role" — e.g. a Customer token hitting an Admin route.

Both return the standard envelope: `401` as `{"code": "UNAUTHENTICATED", ...}`, `403` as `{"code": "ACCESS_DENIED", ...}`.

---

*KONECTA Security Service · generated from the live controller contracts, not a spec doc — update this page if the endpoints move.*
