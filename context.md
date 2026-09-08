# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current handoff — Courier orders and assignment

**Status: integrated with the implemented Courier Service contract and validated on 2026-09-08.** This slice makes the courier dashboard the courier's home
and covers available delivery orders, atomic self-assignment, assignment
cancellation before pickup, courier-specific detail/QR, and merchant
manual assignment. Delivery job execution beyond these status actions is
not implemented as a general courier workflow.

### Product decisions

- Only `READY_FOR_PICKUP` orders with `deliveryMode: DELIVERY`, no assigned
  courier, and a store where the courier association is `ACTIVE` appear in
  the courier home list.
- Self-assignment must be atomic and server-authoritative; a second courier
  must receive a conflict and cannot claim the same order.
- A courier may cancel their assignment only before `IN_TRANSIT`; the order
  returns to `READY_FOR_PICKUP` and becomes available again.
- Courier detail hides item unit prices, line totals, subtotal, fees, and
  price summaries. It shows only the grand total amount, especially for
  cash-on-delivery context.
- A courier assignment QR is distinct from the customer's order QR. It is
  shown only before `IN_TRANSIT` and disappears once the order is moving.
- Merchant and staff can manually assign/reassign a courier from the shop
  order detail. Backend authorization and transition checks remain final.

### Proposed backend endpoints used by the frontend

The copy-ready backend contract, organized by owning service, is in
`API_REFERENCE_COURIER_ORDERS_BACKEND.md`.

- `GET /api/v1/couriers/me/orders/available`
- `GET /api/v1/couriers/me/orders/{orderId}`
- `POST /api/v1/couriers/me/orders/{orderId}/assignment`
- `DELETE /api/v1/couriers/me/orders/{orderId}/assignment`
- `PATCH /api/v1/couriers/me/orders/{orderId}/status`
- `POST /api/v1/couriers/me/orders/scan-customer-qr`
- `GET /api/v1/merchant/shops/{shopId}/couriers/active`
- `PATCH /api/v1/merchant/shops/{shopId}/orders/{orderId}/courier`
- `POST /api/v1/merchant/shops/{shopId}/orders/{orderId}/scan-courier-qr`

Assignment requests must reject already-assigned orders atomically with
`409 ORDER_ALREADY_ASSIGNED`; all endpoints must scope access to active
per-shop associations and validate status transitions server-side.

### Frontend implementation target

- `/courier` becomes the available/assigned order dashboard.
- `/courier/orders/[orderId]` shows courier-safe detail, grand total,
  status actions, and the dedicated courier QR.
- Existing merchant order detail gains manual courier assignment.
- Existing QR visual/scanner primitives are reused; no customer prices are
  exposed in courier views.
- Added the merchant active-courier BFF route used by the assignment
  selector: `GET /api/merchant/shops/[shopId]/couriers/active`.
- Integrated against `FRONTEND_COURIER_ORDERS_INTEGRATION_response.md`.
  Courier cancellation now correctly handles the backend `204 No Content`
  response and refetches the order; courier detail types contain no item
  prices, line totals, subtotal, or delivery fee.
- Merchant Entregadores now opens on `Ativos`; the `Pendentes` tab shows a
  visible count when approvals are waiting.
- Merchant courier detail loads the shop location and renders store and
  courier-base pins, distance, and base address when Courier Service
  returns `baseLatitude`, `baseLongitude`, `baseAddress`,
  `baseNeighborhood`, and `baseCity`.
- Courier home access now loads the courier profile and shop associations
  independently. A courier with at least one `ACTIVE` shop association can
  enter the home/order UI even if the profile read is stale or unavailable;
  only a courier with neither a profile nor an active shop association is
  redirected to onboarding.

### Validation

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed.

### Backend integration report

The backend implementation report is recorded in
`FRONTEND_COURIER_ORDERS_INTEGRATION_response.md`. The frontend uses the
public Courier Service routes only; internal Orders Service routes are not
called by the browser.

---

## Previous handoff — Courier onboarding + per-store approval

**Status: implemented and validated on 2026-09-08.** This slice covers
courier profile completion, documents, store association requests, and
merchant approval per shop. Delivery jobs, order acceptance, earnings,
and courier order access UI remain out of scope.

### Latest update

- Pending courier applicants can now open `/courier/stores` from the
  Entregador panel instead of being redirected back to onboarding. This
  lets them request a shop association before platform approval, so the
  Store Admin has a pending row to review.
- The device-location pattern remains active in onboarding: saved
  registration coordinates are used when present; otherwise
  `useDeviceLocationDefault` requests the device GPS and the map's Maputo
  coordinate is only the immediate render fallback.
- Backend follow-up: the Courier service must allow pending courier
  applicants to call `GET/POST/DELETE /api/v1/couriers/me/shops/**`.
  If it still enforces `ROLE_COURIER` there, the page opens but association
  requests will return `403` and cannot reach Store Admin approval.
- Removed the pending-approval onboarding explanation, driving-licence
  helper warning, and courier-role registration explanations requested by
  the user.
- Courier onboarding now preloads the map from the registration-saved
  `UserProfile.latitude`/`longitude`; an existing courier service profile
  still takes precedence, and Maputo remains the fallback.
- Registration continues forwarding the selected role and coordinates
  through OTP verification; only explanatory UI copy was removed.
- Validation after this update: `npx tsc --noEmit` and `npm run lint`.

### Product decisions

- A pending `CUSTOMER` with `requestedRole: COURIER` may complete the
  courier profile and upload documents before platform approval.
- Pending courier applicants may request store associations before the
  platform role approval; each store can then review that request.
- Each shop owns its own association status:
  `PENDING_STORE_APPROVAL`, `ACTIVE`, or `SUSPENDED`.
- A merchant approving one shop does not approve the courier globally or
  for any other shop. An `ACTIVE` association is the future gate for that
  shop's courier capabilities.
- No delivery/order UI is implemented yet.
- Courier onboarding document helper copy was removed as requested; the
  document controls and mandatory driving-licence validation remain.

### Frontend implementation

- Courier routes: `/courier`, `/courier/onboarding`, `/courier/stores`.
- Courier BFF routes under `app/api/courier/**` handle profile,
  documents, and own-shop associations.
- Merchant BFF routes now exist under
  `app/api/merchant/shops/[shopId]/couriers/**` for list, detail,
  reject, approve, suspend, and reactivate operations.
- `CourierStoresView` shows all requested/approved shops and their
  per-shop statuses.
- `CouriersList` lets merchant/staff users approve, reject, suspend, and
  reactivate associations. Courier detail includes uploaded documents.
- Pending applicants can open `/courier/stores` and request associations;
  approved couriers use the same screen to manage their store requests.

### Backend contract assumptions

- `KONECTA-COURIER-SERVICE` is live at `COURIER_API_BASE_URL`.
- Courier service supports profile, document, and store-association access
  for pending courier applicants; store-side approval remains per shop.
- Merchant courier endpoints enforce merchant ownership or matching
  `MERCHANT_STAFF.shopId` server-side.
- Stores-and-Stock `GET /api/v1/shops` accepts an omitted `categoryId` for
  the all-shop courier picker.

### Validation

- `npx tsc --noEmit` passed.
- `npm run lint` passed.
- `npm run build` passed and generated the courier merchant API/page routes.

### Next session checks

- Live-test a real courier: complete profile, confirm platform approval,
  request Supermercado Baoba, and verify the merchant sees the pending
  request.
- Approve the request as the store merchant and verify the courier sees
  `Ativo` for that shop only.
- Verify a second shop remains independent and that reject/suspend/
  reactivate transitions work against the live backend.

---

## Current feature: My Profile + mustChangePassword gate + Merchant Staff CRUD

**Status: built by AmazonQ (a different agent) in a session I wasn't part
of, then three rounds of bug-fixing on top of it** — typecheck/lint/build
clean, live-verified. **One known blocker remains and is 100% backend,
not frontend** — see Round 3 below.

### Round 3 — MERCHANT_STAFF can read but not write anything; entirely backend

**Frontend cleanup**: `ProductDetailView.tsx` had a dead `hideStaff` prop
(threaded in from `page.tsx`, never used — that page doesn't render
`ShopNav`, the only consumer of `hideStaff` anywhere else). Removed from
both the prop signature and the page.tsx caller. Confirmed via grep this
was the only dead usage — every other `hideStaff` pass-through
(`ShopSettingsForm`, `ProductsList`, `HoursForm`, `StaffList`, the
`/merchant/shops/[shopId]` dashboard page) genuinely feeds `ShopNav`.

**The reported bug ("MERCHANT_STAFF can't update products") is real, but
it's not this codebase's bug — it's the Stores-and-Stock backend.**
Verified live with a real staff account against a real shop/product:
`GET` (list, detail, dashboard summary) all work fine for staff, but
**every** write endpoint returns a genuine `403 ACCESS_DENIED` —
`POST .../products`, `PATCH .../products/{id}`, `.../stock`,
`.../active`, and (correctly, per the actual requirement)
`PATCH /merchant/shops/{shopId}`. The backend currently has no concept of
`MERCHANT_STAFF` on any write path at all — it's not "staff can edit shop
but not products" or vice versa, it's "staff can't write *anything*,"
which happens to look like "products don't work" from the UI since that's
the thing staff actually try to do.

**User's requirement, confirmed**: staff should have full read/write on
products (create/edit/stock/active/photos) for their one assigned shop,
but stay blocked from shop settings/logo/cover/hours and from staff
management (which is Security service's endpoint, already correctly
`MERCHANT`-only there).

**Documented, not implemented** (nothing to implement — this is 100%
backend authorization logic): added a new PROPOSED section to
`API_REFERENCE_MERCHANT_DASHBOARD.md` — "MERCHANT_STAFF access to product
endpoints" — spelling out the exact rule: a `MERCHANT_STAFF` JWT already
carries a `shopId` claim (per `API_REFERENCE-security-service.md`); the
Stores-and-Stock service should allow `ROLE_MERCHANT_STAFF` + matching
`jwt.shopId` on `/merchant/shops/{shopId}/products/**` (all methods) and
the dashboard summary read, while continuing to reject it everywhere else
under `/merchant/shops/{shopId}/**`. No inter-service call needed — the
claim already on the token is sufficient. **Nothing to build here until
that lands** — don't attempt a frontend workaround (e.g. hiding the
403 and pretending it worked) for a permission gap that only the backend
can actually close.

### Round 2 fixes — MERCHANT_STAFF login hung forever, plus two UX gaps

**1. MERCHANT_STAFF login → `/merchant` never finished loading, dev log
showed the same `GET /merchant/shops/{shopId}` 200 repeating forever.**
Root cause: `MerchantShell` needed to know "is a staff user currently on
the `/merchant` picker (redirect them to their one shop) or already on a
sub-route (don't re-redirect)" — AmazonQ solved this by having `proxy.ts`
reconstruct a **new** `Request` object (`new Request(request, { headers:
new Headers({...Object.fromEntries(request.headers), "x-pathname":
pathname}) })`) on every single matched request, just to smuggle the
current pathname into a custom header for `MerchantShell` to read via
`headers()`. This is fragile by construction — Next's client-side RSC
navigation depends on specific internal headers (`RSC`,
`Next-Router-State-Tree`, etc.) surviving untouched through proxy, and
wholesale reconstructing the headers object on every request risked
mangling them, which is consistent with the symptom: the browser's RSC
fetch for the navigation never resolved cleanly, so the client kept
retrying the same URL forever (curl-level testing showed the server side
was always perfectly fine — one redirect, then stable 200s — the loop was
a client no server issue, which is why it wouldn't show up as anything
but 200s in the dev log).

**Fix — delete the header-smuggling entirely, solve it where the route is
unambiguous instead**: `app/merchant/page.tsx` (the shop-picker page)
*is* the `/merchant` route by definition — no need to detect the
pathname at all. Moved the "MERCHANT_STAFF → redirect to their one shop"
logic there (`getCurrentUser()` + `redirect()` at the top of that page,
before the shops-list fetch). `MerchantShell` no longer touches
`headers()` at all — it only keeps `if (user.role === "MERCHANT_STAFF" &&
!user.shopId) redirect("/login")` as a data-integrity guard, unrelated to
pathname. `proxy.ts` reverted to the original simple
`NextResponse.next({ request })` (no custom Request reconstruction, no
`x-pathname`). **Lesson for next time**: don't thread ad-hoc request
headers through `proxy.ts` to answer "what route am I on" — a page/layout
file already knows that unambiguously from its own position in the file
tree; reach for that first. Verified live end-to-end: created a real
`MERCHANT_STAFF` account, logged in, confirmed the `mustChangePassword`
gate fires first (307 → `/change-password`), completed it, then confirmed
`/merchant` → exactly one 307 → `/merchant/shops/{shopId}` → stable
repeated 200s, and that the shop dashboard correctly hides the
"Funcionários" nav tab for staff.

**2. No success feedback on save.** `ProductDetailView.tsx`'s main edit
form and stock-adjust form, and `ShopSettingsForm.tsx`, called their
update functions and updated local state on success but never told the
user it worked — `ProfileForm.tsx` and `StaffDetailView.tsx` (both written
by AmazonQ) already had this right (`saved`/`profileSuccess` boolean state
→ green "Guardado com sucesso." text), it was specifically the
pre-existing product/shop forms (mine, from before AmazonQ's session) that
were missing it. Added the same `saved` state pattern to both.

**3. No user avatar/name in the header.** Built `components/UserMenu.tsx`
— a small Server Component (photo or initials-on-a-circle + first name,
linking to `/profile`) — and wired it into `AdminShell`, `MerchantShell`
(replacing the old plain "Perfil" text link in both), and `RoleLanding`
(which had no profile link in its header at all before). Takes `user` as
a prop — every shell already fetches it via `getCurrentUser()`, no extra
fetch needed. Photo rendered via `next/image` with `unoptimized` (same
reasoning as everywhere else `photoUrl` is rendered — presigned, expiring,
per-request URLs, not something Next's image optimizer should cache).

**Not yet investigated**: `ProductDetailView.tsx` still has an unused
`hideStaff` prop (dead code from AmazonQ's build, harmless, lint warning
only) — flagged to the user, not fixed, since it wasn't reported as
broken and wasn't in scope of what was asked this round.

### Bug triage session (after AmazonQ's build) — what was actually wrong

User reported "shop settings: neighborhood saves, email doesn't" and
"product updates aren't working." Diagnosed both by testing live against
the real backend rather than guessing from code:

1. **Shop `email` not saving — not a bug, existing documented backend
   limitation.** Confirmed live: `PATCH /merchant/shops/{shopId}` with
   `{"email": "..."}` returns `200` but `email` stays `null`. Matches
   `API_REFERENCE_MERCHANT_DASHBOARD.md`'s `Shop` model note verbatim:
   *"email | string? | Not settable via any current endpoint."* Nothing to
   fix on the frontend — the field is correctly wired, the backend just
   silently ignores it. If this needs to work, it's a backend ask, not a
   frontend one.

2. **Product updates silently failing — real frontend bug, now fixed.**
   `lib/stores/validation.ts`'s `createProductSchema` (reused for both
   create and edit) had `lowStockThreshold: z.number().int().min(0).optional()`
   fed by `register(..., { valueAsNumber: true })`. zod v4 rejects both
   `NaN` (what an emptied/untouched number input produces via
   `valueAsNumber`) and `null` (a value the API can legitimately return)
   for a plain `.optional()` number field — confirmed directly:
   `schema.safeParse({ lowStockThreshold: NaN, ... }).success === false`.
   This silently blocked the **entire** product edit/create form submit
   (react-hook-form's `handleSubmit` never even calls the submit callback
   on a validation failure), with only a small inline error under that one
   field to explain why — easy to miss, reads exactly like "nothing
   happens when I click save." **Fixed** by:
   - `lib/stores/validation.ts` — new exported `optionalNumberField`
     (`{ setValueAs: (v) => v === "" ? undefined : Number(v) }`), used
     instead of `{ valueAsNumber: true }` on `register("lowStockThreshold", ...)`
     in both `NewProductForm.tsx` and `ProductDetailView.tsx` — an emptied
     field now becomes `undefined` (genuinely "not provided"), not `NaN`.
   - `ProductDetailView.tsx`'s `load()` — `reset()` now coalesces
     `p.lowStockThreshold ?? undefined` defensively for the API-`null` case.
   - **Do not** reach for `z.preprocess` to solve this class of problem —
     tried it first, it reintroduces the exact `.coerce.number()` input/
     output type mismatch with react-hook-form's generic that was already
     fixed once before in this codebase (see the Admin feature's context
     history). `setValueAs` on `register()` is the correct tool: it
     transforms at the form layer, so the zod schema's inferred type stays
     clean.
   - Also added a top-level `actionError`/`formError` banner
     (`handleSubmit(onSubmit, () => setActionError("Verifique os campos
     assinalados a vermelho abaixo."))`) to all three merchant product/shop
     forms — so *any* future silent client-validation failure surfaces
     visibly instead of only as an easy-to-miss inline field error. Apply
     this same two-argument `handleSubmit` pattern to new forms going
     forward.
   - Verified live: the exact payload shape the fixed form now produces
     (numeric field omitted rather than sent as `NaN`) round-trips
     correctly against the real backend.

**Not yet investigated**: whether AmazonQ's build introduced other
inconsistencies beyond these two reported ones. A quick scan found one
harmless loose end — `ProductDetailView.tsx` accepts a `hideStaff` prop
that's threaded in but never used inside that component (dead prop, just
an eslint warning, not a functional bug). Full audit of AmazonQ's changes
wasn't done — this session only chased the two symptoms actually reported.

### What was built (by AmazonQ, before this session)

### What was built

#### 1. Self-service "My Profile" screen (`/profile`)
- Accessible to every authenticated role (CUSTOMER, MERCHANT, COURIER, ADMIN, MERCHANT_STAFF).
- Edit personal details (firstName, lastName, phone, address, city, neighborhood) via `PATCH /api/v1/users/me`.
- Change password via `POST /api/v1/auth/change-password` (requires current password).
- Upload profile photo: presign → PUT to S3 → confirm (Stores-and-Stock) → save URL to Security service via `PATCH /api/v1/users/me` with `photoUrl`.
- "Perfil" link added to MerchantShell and AdminShell headers.
- `/profile` and `/change-password` added to `AUTH_REQUIRED_PREFIXES` in `lib/auth/roles.ts` so proxy redirects unauthenticated users to `/login`.

#### 2. `mustChangePassword` gate (`/change-password`)
- `lib/auth/profile.ts` — new `mustChangePassword(user)` helper.
- `app/change-password/` — forced gate page + form (same pattern as `/complete-profile`).
- All shells (`RoleLanding`, `AdminShell`, `MerchantShell`) check `mustChangePassword` and redirect to `/change-password` before any other content.
- `/change-password` page itself redirects away if `mustChangePassword` is false (so it can't be visited unnecessarily).

#### 3. Merchant Staff CRUD (`/merchant/shops/[shopId]/staff`)
- "Funcionários" tab added to `ShopNav`.
- Staff list with search, enable/disable inline, link to edit.
- Create staff form (`/staff/new`) — collects all required fields + password, `shopId` injected from URL params. Staff is created with `mustChangePassword: true` — shown as a badge in the list.
- Edit staff form (`/staff/[staffId]`) — edit profile fields + enable/disable toggle.
- BFF routes: `GET/POST /api/merchant/staff`, `GET/PATCH /api/merchant/staff/[id]`, `PATCH /api/merchant/staff/[id]/enabled`.
- Client wrappers in `lib/merchant/client.ts`.

#### 4. Supporting changes
- `lib/auth/types.ts` — `UserProfile` extended with `shopId`, `ownerId`, `mustChangePassword`, `photoUrl`; `MERCHANT_STAFF` added to `Role`.
- `lib/auth/roles.ts` — `MERCHANT_STAFF` added to `ROLE_HOME`; `AUTH_REQUIRED_PREFIXES` exported.
- `lib/auth/roleLabels.ts` — `MERCHANT_STAFF: "Funcionário"` added.
- `lib/auth/validation.ts` — `changePasswordSchema` and `editProfileSchema` added.
- `lib/auth/client.ts` — `updateProfile`, `changePassword`, `presignUserPhoto`, `confirmUserPhoto` added; `MERCHANT_STAFF` added to `ROLE_HOME_CLIENT`.
- `proxy.ts` — imports and checks `AUTH_REQUIRED_PREFIXES` alongside `ROLE_PROTECTED_PREFIXES`.
- `MerchantShell` — now also allows `MERCHANT_STAFF` role (they land on `/merchant` too).
- BFF routes: `app/api/auth/change-password/route.ts`, `app/api/users/photo/presign/route.ts`, `app/api/users/photo/route.ts`.

### Architecture notes
- Photo URL stored in `photoUrl` on the Security service profile. The Stores-and-Stock confirm step (`POST /api/v1/users/me/photo`) returns a presigned GET URL (~1h TTL). Per the API doc, the intent is to store the stable object URL — coordinate with backend to ensure the confirm endpoint returns the permanent URL, not the presigned one. For now we store whatever confirm returns (same as the doc says "store as-is").
- Staff creation does NOT call Stores-and-Stock to verify shop ownership first (the Security service doesn't verify it either — it stores `shopId` as an opaque UUID). The URL param `shopId` comes from the merchant's own shop navigation, which is already gated by `MerchantShell` + the Stores-and-Stock service's own ownership check on every shop-scoped call. This is consistent with the architecture decision in the previous context.
- `MERCHANT_STAFF` users land on `/merchant` — `MerchantShell` now allows both `MERCHANT` and `MERCHANT_STAFF` roles. Staff see the same shop navigation but their `shopId` JWT claim scopes what the Stores-and-Stock service will authorize for them server-side.

### Needs attention before going live
- **Photo URL TTL**: confirm with backend that `POST /api/v1/users/me/photo` (Stores-and-Stock confirm step) returns the permanent S3 object URL, not the presigned GET URL. If it returns the presigned one, profile photos will break after ~1h.
- **Staff write actions visible but blocked**: `MERCHANT_STAFF` has read-only access on the backend. The edit/create/stock-adjust buttons are still rendered in the UI — the backend will return `ACCESS_DENIED` if staff try them. Hide those controls for staff in a follow-up if needed.
- **No visual QA yet** — built and verified via typecheck/lint/build only. Worth a click-through with the test accounts.

## Round 4: MERCHANT_STAFF write-permission fix confirmed + Admin shop access (2026-09-02/03)

- User confirmed the `MERCHANT_STAFF` product-write 403 gap (documented in Round 3 / `API_REFERENCE_MERCHANT_DASHBOARD.md`) was **fixed on the backend**. Marked that doc section RESOLVED, left the original write-up for reference.
- New ask: Admin panel gets a "Lojas" nav item (after "Utilizadores") giving Admins the same shop-management access as a shop's own `MERCHANT` — dashboard, products, hours, settings. Explicitly **not** shop creation or staff management (staff stays merchant-only, different ownership model on the Security service).
- **Live-verified first**: `GET /merchant/shops` and `GET /merchant/shops/{shopId}` both return `403 ACCESS_DENIED` for a real `ROLE_ADMIN` token — Admin currently has zero backend access to shop data. User chose (via AskUserQuestion) to build the frontend now and document the backend gap, rather than wait.
- **Key reuse insight**: the BFF routes (`app/api/merchant/shops/**`) and `lib/stores/client.ts` never check role themselves — only forward whatever token they have, letting the Stores-and-Stock service enforce authorization. So the exact same Merchant UI components work for Admin unmodified, just parameterized via new optional `basePath`/`listHref`/`listLabel` props (all defaulting to existing Merchant behavior — zero behavior change for Merchant callers). Applied to `ShopNav`, `ProductsList`, `ProductDetailView`, `NewProductForm`, `ShopSettingsForm`, `HoursForm`.
- Extracted the shop dashboard's Server Component body (was inline in `app/merchant/shops/[shopId]/page.tsx`) into `components/merchant/ShopDashboard.tsx` so both the Merchant and Admin dashboard pages can call it with different `basePath`/`listHref`/`listLabel`.
- New: `lib/stores/types.ts` — `AdminShopSummary`, `AdminShopsQuery`. `lib/stores/client.ts` — `listAllShops()`. `app/api/admin/shops/route.ts` — new BFF route proxying to the (not-yet-implemented) `GET /api/v1/admin/shops`. `app/admin/shops/page.tsx` — searchable/filterable all-shops table (name, owner, status, open/closed). `app/admin/shops/[shopId]/{page,products,products/new,products/[productId],hours,settings}/page.tsx` — thin wrappers around the reused Merchant components with `basePath="/admin/shops"`, `hideStaff` always on. `components/admin/AdminShell.tsx` — added "Lojas" nav link.
- Documented both required backend changes as a new PROPOSED section in `API_REFERENCE_MERCHANT_DASHBOARD.md`: (1) widen the role gate on every `/merchant/shops/**` endpoint to accept `ROLE_ADMIN` (bypassing the ownership check, not matching against it), (2) new `GET /api/v1/admin/shops` list endpoint (paginated, all shops, owner info included).
- Frontend fully built and wired; will 403/404 against the real backend until both gaps ship. Verified via `next typegen`, `tsc --noEmit`, `eslint .` (0 errors), and `npm run build` (all new `/admin/shops/**` routes registered) — no live click-through possible yet since the backend endpoints don't exist.

## Round 5: Admin shop access — backend delivered, live-verified 2026-09-03

- Backend implemented both PROPOSED items: widened `ROLE_ADMIN` bypass on `/merchant/shops/**` (root cause matched the earlier `MERCHANT_STAFF` bug — `@PreAuthorize` blocking before the existing admin-bypass logic in `getOwned` was reached), and new `GET /api/v1/admin/shops`. Automated suite: 32/32 passing including a new `admin_canManageAnyShopButNotCreateOne` test. Backend flagged two honest gaps themselves: `ownerName`/`ownerEmail` always `null` (no Security-service client wired up), and no live curl round-trip against a real Admin JWT yet.
- **Live-verified with a real ADMIN account** (logged in via `POST /api/v1/auth/login` against the real Auth service, real `ROLE_ADMIN` JWT): `GET /merchant/shops` (list) correctly still `403`s for Admin (intentionally merchant-only). `GET /api/v1/admin/shops` returns `500 INTERNAL_ERROR` on every param combination tried (paginated, filtered by status, bare) — reported back to backend with repro details in `API_REFERENCE_MERCHANT_DASHBOARD.md`.
- Could not verify the widened role gate on `GET /merchant/shops/{shopId}` (or the write endpoints) for Admin — needed a real `shopId`, which in turn needs the (currently broken) admin shop-list endpoint to discover one without merchant credentials.
- Frontend hardened for the confirmed `ownerName`/`ownerEmail: null` gap ahead of time: `lib/stores/types.ts`'s `AdminShopSummary` now types both as `string | null`, and `app/admin/shops/page.tsx` falls back to rendering the raw `ownerId` (monospace, with a title tooltip) when the name is missing, instead of showing `null`/`undefined`.
- Net status: Admin shop management is **not yet usable end-to-end** — the list page (the only entry point into `/admin/shops/{shopId}`) will show an error state until the `500` on `GET /api/v1/admin/shops` is fixed. Everything downstream (dashboard/products/hours/settings reuse of the Merchant components) is built and should work once a real `shopId` is reachable, but is unverified live.

## Round 5b: Admin shop access — CLOSED, fully live-verified 2026-09-03

- Backend traced the `500` to a stale `:8092` process left over from earlier in their session — it predated `AdminShopController` entirely, so it was never running the actual feature code. Not a code bug. Killed it, restarted clean against the real DB/S3, re-minted a genuine `ROLE_ADMIN` JWT, reran all three repro cases: all `200` now.
- Re-verified independently with a fresh admin login (`dercio.anselmo@yahoo.com` against the real Auth service):
  - `GET /api/v1/admin/shops` (bare, `?page=0&size=5`, `?status=ACTIVE`) → all `200`, real data: 2 shops ("Loja Real", "Loja Teste E2E 2"), correct `Page<T>` envelope, one row with a real presigned S3 logo URL. `ownerName`/`ownerEmail` both `null` on both rows — matches the documented/accepted gap (no Security-service client wired up).
  - Picked a real `shopId` (`14b4dbe9-d975-4d75-9bb7-39118dcd5828`, "Loja Real") from that response and tested the widened `ROLE_ADMIN` bypass directly: `GET` shop profile, dashboard summary, product list, and hours all `200` with real data. `PATCH` shop `description` → `200`, change persisted (this left a real, harmless mutation on that shop's `description` field: "Verificado via admin - live check 2026-09-03").
  - `GET /merchant/shops` (list) still correctly `403`s for Admin — confirms the "list my shops" endpoint stayed merchant-only as intended, not accidentally opened up.
- **Feature is fully closed.** Both `API_REFERENCE_MERCHANT_DASHBOARD.md` PROPOSED items are now marked RESOLVED with the live evidence above. Only remaining open item is the pre-existing, accepted `ownerName`/`ownerEmail: null` gap — frontend already handles it gracefully (falls back to raw `ownerId`), not a blocker.
- No frontend code changes needed in this round — this was purely a live-verification pass confirming Round 4's build works against the real backend.

## Round 6: "Lojas" box on the Admin dashboard home (2026-09-03)

- Ask: mirror the existing "Utilizadores" box on `/admin` for shops — same big card, count badge, on the initial panel (not just the top nav added in Round 4).
- `app/admin/page.tsx` — added a second `Link` card ("Lojas" → `/admin/shops`) below the existing "Utilizadores" one, same visual pattern (title + subtitle + count pill). Fetches `GET /api/v1/admin/shops?page=0&size=1` via `storesApiFetch` for `totalElements`, shown as an "N loja(s)" pill (brand-green, vs. the orange "pendente(s)" pill on Utilizadores since there's no urgency state for shops — just a count). Fails soft to no badge if the call errors, same pattern as the existing pending-count fetch.
- **Live-verified end-to-end** through the actual running Next app (not just direct backend curl): logged in via `POST /api/auth/login` on `localhost:3000` (real session cookie), fetched `/admin` — rendered HTML confirms both cards present, "Lojas" card shows "2 lojas" pill and links to `/admin/shops`, matching the real backend's 2 seeded shops. Also independently verified `GET /api/admin/shops` (the BFF route) through the same session cookie returns the same 2 real shops.
- `tsc --noEmit` and `eslint` both clean on the changed file.

## Round 7: Admin shop-list row click + confirmed user-photo TTL bug (2026-09-03)

**1. Admin couldn't enter a shop by clicking it in `/admin/shops`.** All my
earlier live curl checks (Round 5b) only exercised SSR HTML + BFF routes
directly, which all worked — but curl doesn't execute client-side JS, so
it couldn't catch a real in-browser click-navigation failure. Rather than
keep guessing blind, hardened the click target: `app/admin/shops/page.tsx`
now makes the **entire `<tr>`** clickable via `useRouter().push()` (with
`cursor-pointer`/hover styling), not just the shop-name `<Link>` text —
the `Link` stays (for accessibility/open-in-new-tab) with `stopPropagation`
so the two handlers don't double-navigate. `tsc`/`eslint` clean.

**2. Confirmed: user profile-photo URLs go dead ~1h after upload —
reproduced live, root cause found, not a frontend bug.** User reported the
top-right avatar had stopped resizing into its box — investigated by
auditing every `next/image` usage in the app (all correctly use
`relative <sized>` + `fill` + `object-cover`, compiled CSS confirmed
correct) before concluding the *markup* wasn't the problem. Then compared
`photoUrl` across two `GET /api/auth/me` calls ~2h apart (via a fresh
re-login each time): **identical byte-for-byte**, same `X-Amz-Date` query
param both times. Fetching that URL directly from S3 confirmed
`403 AccessDenied: Request has expired` (`Expires: 2026-09-03T17:35:36Z`,
`ServerTime: 2026-09-03T18:28:42Z`). A broken image doesn't crop/size the
way object-cover does, which is what read as a "resizing" regression.
- **Root cause**: KONECTA-SECURITY-SERVICE stores `photoUrl` as a static
  string, written once at upload time, and returns it verbatim on every
  `GET /users/me` — it was already a presigned S3 GET URL (1h TTL) at
  write time, per the Stores-and-Stock confirm step's documented
  behavior, and nothing ever refreshes it after that.
- **Confirmed this does NOT affect shop logos/covers or product
  photos** — those come back with a fresh `X-Amz-Date` on every `GET`
  (verified: two `GET /api/v1/admin/shops` calls minutes apart had
  different signatures), because Stores-and-Stock re-presigns on every
  read of the live shop/product record. User photos are different: the
  Security service has no S3 client and no "refresh on read" step, it
  just echoes back whatever string was last saved.
- Documented the confirmed bug + two viable fixes (store the S3 key and
  proxy a fresh presign per read, or serve user photos from a public/
  unsigned path since they're not sensitive) in
  `API_REFERENCE-security-service.md`'s Profile Photo section. Nothing
  to change on the frontend — it already renders whatever `photoUrl` it's
  given; the fix is entirely about which URL gets stored/returned.

## Round 8: Admin owner-name resolution + Funcionários tab (2026-09-03)

**1. `Proprietário` column showed a raw UUID instead of the owner's
name.** Known/documented gap: Stores-and-Stock's `GET /admin/shops` has
no client to the Security service, so `ownerName`/`ownerEmail` are
always `null`. Rather than wait on that backend work, resolved it
client-side: `app/admin/shops/page.tsx` now calls the existing
`getUser(id)` admin endpoint (already live, Security-service-backed) once
per **unique** `ownerId` missing a name, via `Promise.allSettled` so one
failed lookup doesn't break the others, cached in state so it only
happens once per owner per page load. Falls back to the raw `ownerId`
(as before) only if that specific lookup 404s. **Live-verified**: of the
2 real seeded shops, one resolved to a real name ("Natacha Anselmo"),
the other correctly fell back to its raw `ownerId` — that shop's
`ownerId` (`f94fbcbb-...`) turned out to be a real `404 USER_NOT_FOUND`
on the Security service (an orphaned/inconsistent test-data row, not a
frontend bug), which is exactly the fallback path being exercised
correctly.

**2. "Funcionários" wasn't reachable from the Admin's shop view** — the
Round 4 build deliberately hid it (`hideStaff` always on for admin
routes), a scope call I made unilaterally that the user has now
overridden: staff should be visible/manageable by Admin too, matching
"same access as Store Admin." Reversed it:
- `StaffList`, `NewStaffForm`, `StaffDetailView` (under
  `app/merchant/shops/[shopId]/staff/**`) gained the same
  `basePath`/`listHref`/`listLabel` props as every other shop-scoped
  component (Round 4's pattern), defaults unchanged for existing
  Merchant callers.
- Dropped `hideStaff` from all `app/admin/shops/[shopId]/**` pages so
  the "Funcionários" tab now renders in `ShopNav` for Admin.
- New `app/admin/shops/[shopId]/staff/page.tsx` and
  `.../staff/[staffId]/page.tsx`, reusing the Merchant components with
  `basePath="/admin/shops"`.
- **Staff *creation* deliberately excluded for Admin** (new `allowCreate`
  prop on `StaffList`, `false` for the admin variant, and no
  `/admin/shops/[shopId]/staff/new` route built) — mirrors the existing
  precedent of shop-creation staying Merchant-only, since "whose staff is
  it?" is a genuine ownership question for an Admin-created account, not
  addressed here.
- **Confirmed live** (real `ROLE_ADMIN` JWT): `GET /merchant/staff` still
  `403`s for Admin — same class of gap as the shops endpoints had before
  their fix, but staff needs a different shape of fix since it's scoped
  by `jwt.sub` with `shopId` as only an optional filter, not a path
  segment checked against an owner. Documented the required backend
  change (list: require+scope-by `shopId` for Admin instead of `jwt.sub`;
  detail/edit/enable: bypass the ownership check for `ROLE_ADMIN`, same
  pattern as the shops fix; create: stays Merchant-only) as a new
  PROPOSED section in `API_REFERENCE-security-service.md`.
- Frontend fully built, `tsc`/`eslint`/`build` all clean, and
  live-verified via the real running app: the "Funcionários" tab now
  renders on `/admin/shops/{shopId}`, the list page renders with the
  "Novo funcionário" button correctly hidden, and the underlying data
  call still `403`s exactly as documented (frontend shows the existing
  error state gracefully) until backend ships the fix above.

## Round 8b: Merchant-staff admin access — CLOSED, live-verified 2026-09-03/04

- Backend implemented exactly the proposed shape: `GET /merchant/staff` now requires `shopId` for `ROLE_ADMIN` (`400 SHOP_ID_REQUIRED` if missing, matches by shop instead of `jwt.sub`), `GET/PATCH .../staff/{id}` and `PATCH .../staff/{id}/enabled` bypass the ownership check for `ROLE_ADMIN`, `POST` (create) stays `MERCHANT`-only on purpose. New `MerchantStaffAdminAccessIntegrationTest`, suite 18/18 green.
- **First test attempt failed** (`403` on everything) — same root cause as Round 5b: a stale `:8091` process (`ps` showed it started hours before the fix would've been compiled in). Flagged it, backend restarted the service, retested clean.
- **Live-verified with a real ADMIN JWT** after restart, all cases from backend's own report reproduced independently: `GET` no `shopId` → `400 SHOP_ID_REQUIRED`; `GET ?shopId=...` → `200` with real staff (found 3 real seeded staff on "Loja Teste E2E 2"); `GET/PATCH` by a specific staff `id` → `200`, edit persisted (left a harmless test edit on one staff's `address`); `PATCH .../enabled` → `200`, toggled off then back on; `POST` (create) → still `403` as intended.
- Also verified through the **actual running Next app** (not just direct backend curl): logged in for a real session, hit `/api/merchant/staff?shopId=...` through the app's own BFF route — returned the same 3 real staff, confirming the whole chain (browser → BFF → Security service) works, not just the backend in isolation.
- **Feature is fully closed.** Admin now has full parity with Store Admin across shops, products, hours, settings, and staff (view/edit/enable, not create) — everything from Round 4 through here is live-verified end to end.

## Round 9: Shop GPS location — Leaflet/OSM (not Google Maps) + backend `500` found (2026-09-03/04)

- Ask: a "Localização" tab (after "Definições") where Merchant/Admin set a shop's GPS pin, for future proximity-based search. Backend implemented `PATCH /api/v1/merchant/shops/{shopId}/location` (dedicated endpoint, Maputo-area bounding-box validation, Admin-bypass, `MERCHANT_STAFF` blocked) before this round started. User then asked to use **free** Leaflet + OpenStreetMap instead of Google Maps (no Cloud project/billing/API key needed).
- **Frontend built**: `leaflet@1.9.4` + `react-leaflet@5.0.0` + `@types/leaflet` installed (React 19-compatible). `components/merchant/ShopNav.tsx` gained a "Localização" link. New `app/merchant/shops/[shopId]/location/{LocationMapInner.tsx,LocationForm.tsx,page.tsx}` — click-to-place/drag pin, address search + reverse-geocode confirmation via Nominatim (OSM's free geocoder), proxied server-side through new `app/api/geo/{search,reverse}/route.ts` (keeps Nominatim's required identifying `User-Agent` and rate limiting off the browser — never call Nominatim directly from client code). `app/admin/shops/[shopId]/location/page.tsx` reuses the same `LocationForm` via `basePath`, same pattern as every other admin tab. `lib/stores/types.ts`/`client.ts` got `latitude`/`longitude` on `Shop` and `setShopLocation()`. New BFF route `app/api/merchant/shops/[shopId]/location/route.ts`.
- Marker icons: Leaflet's default icon URLs don't resolve once bundled — pointed them at `unpkg.com/leaflet@1.9.4/dist/images/...` instead of fighting Turbopack's static-asset handling.
- Map component loaded via `next/dynamic(..., { ssr: false })` — Leaflet touches `window` at import time, must stay out of the SSR pass.
- `tsc`/`eslint`/`build` all clean (one `react-hooks/set-state-in-effect` fix needed — same `queueMicrotask` deferral pattern used throughout this codebase).
- **Live-verified against the real backend: found a bug.** `GET /merchant/shops/{shopId}` doesn't return `latitude`/`longitude` **at all** (not even as `null` — other nullable fields like `legalName`/`email`/`logoUrl` do come back as explicit `null`, these are just absent). `PATCH .../location` returns `500 INTERNAL_ERROR` for **both** a valid Maputo coordinate and an out-of-bounds one — ruled out a stale-process repeat of Round 5b/8b (the `:8092` process was started at 21:51, after any of today's other fixes, so it's running current code). This matches backend's own flagged gap exactly ("verified against Testcontainers, not yet against a live JWT") — the Testcontainers suite passing doesn't mean this dev environment's actual Postgres has the columns wired the way the entity expects. Reported back to backend with the exact repro; not yet fixed as of this entry.
- **Resolved**: user confirmed via manual UI test ("I tested and it is fine") after a backend fix — no further detail captured on the exact root cause, but the pin now saves and persists through the real "Localização" tab.

## Round 10: Category CRUD (with images) + customer Home page redesign (2026-09-04)

- Ask: add an Admin "Categorias" section — category CRUD with a suggestive photo per category (used for big boxes on the new customer home page), subcategories nested inside each category, and a read-only list of shops in that category linking into the existing `/admin/shops/{shopId}` UI (no changes needed there). Separately: redesign the customer Home (`/home`) around big attractive category boxes, **no login required to browse**, with a login/register entry point and the "Acesso para lojistas, entregadores e administração" footer link always present. Explicitly scoped to *just* this round — search, nearby stores/products, and store/product browsing are future rounds.
- **Backend check first**: read the Stores-and-Stock service's own `context.md` directly (`/Users/apple/Projects/konecta/backend/konecta-stores-and-stock-service/context.md`) rather than assume — found full category/subcategory CRUD (`/api/v1/admin/categories`, `/api/v1/admin/categories/{categoryId}/subcategories`) was **already implemented**, just undocumented in our own reference doc. Only two real gaps reported to backend: category images (no field existed at all) and a `categoryId` filter on `GET /api/v1/admin/shops`. Backend implemented both; **live-verified** end-to-end before building against it: public `GET /meta/categories` returns `imageUrl`; full presign → real `PUT` to S3 → confirm round-trip on a real category succeeded; `GET /admin/shops?categoryId=...` correctly scoped to two different real categories (confirmed via `store_categories` join, not a name-substring hack).
- **Frontend built**:
  - `lib/stores/types.ts`/`client.ts` — `Category.imageUrl`, `CreateCategoryPayload`, `UpdateCategoryPayload`, `Create/UpdateSubcategoryPayload`, `AdminShopsQuery.categoryId`, and client functions for the full category/subcategory CRUD + image presign/confirm.
  - New BFF routes under `app/api/admin/categories/**` (list/create, get/edit/delete, image presign/confirm, subcategories list/create/edit/delete) — `app/api/admin/shops/route.ts` needed no change, it already forwards the raw query string so `categoryId` passes through automatically.
  - `components/admin/AdminShell.tsx` — new "Categorias" nav link. `app/admin/page.tsx` — new "Categorias" dashboard box (purple pill, category count), same pattern as the "Lojas" box.
  - `app/admin/categories/page.tsx` — image-grid category browser. `app/admin/categories/new/page.tsx` — create form. `app/admin/categories/[categoryId]/CategoryDetailView.tsx` — edit fields + image upload (same `uploadAndConfirm` presign pattern as shop logos) + delete (surfaces the backend's `409 CATEGORY_IN_USE` message as-is) + inline subcategories CRUD (create/toggle-active/delete, surfaces `409 SUBCATEGORY_IN_USE`) + read-only shops-in-category list linking to `/admin/shops/{shopId}`.
  - `app/home/page.tsx` — fully rewritten: public (no auth check beyond "if logged in as a non-customer role, redirect to that role's dashboard" — preserves the existing per-role shell convention), Server Component fetching categories straight from the public Stores-and-Stock endpoint (no client-side loading flash). Header (logo, static "Maputo, Moçambique" location line, theme toggle, login CTA or `UserMenu` depending on auth state), a visual (non-functional yet, intentionally deferred to the Search phase) search bar matching the UI model, big category-image tiles (2-up on mobile, 3-up wider) linking to a new honest "coming soon" `app/categories/[categoryId]/page.tsx` (mirrors the existing `RoleLanding` "chega numa próxima fase" pattern rather than faking store data), and the required footer link.
  - `lib/auth/roles.ts` — removed `/home` from `ROLE_PROTECTED_PREFIXES` (with a comment explaining why) so `proxy.ts` no longer forces anonymous visitors to `/login`.
  - `app/page.tsx` (the old gated splash) simplified to a pure redirect — logged in → role home / `/complete-profile`; anonymous → `/home` — removing the now-redundant duplicate "unauthenticated landing" UI that used to live here.
- **Live-verified end-to-end through the real running app**: `/` anonymous → `307` to `/home`; `/home` anonymous → `200` with the category tiles, footer link, and "Entrar" CTA all present; `/home` as a logged-in Admin → `307` to `/admin` (role separation preserved); `/admin/categories` and its BFF routes return real data (9 categories, one with the just-uploaded image); a full subcategory create → toggle-inactive → delete round-trip through the app's own BFF succeeded (`201` → `200` → `204`).
- `tsc --noEmit`, `eslint`, and `npm run build` all clean throughout.

## Round 11: User (customer) profile geolocation — Security service (2026-09-04)

- Ask: let any user set their own location on `/profile`, backed by the Security service (not Stores-and-Stock — this is a person's location, not a shop's). Reported requirements mirroring the shop-location feature: `latitude`/`longitude` on the user profile, dedicated `PATCH /api/v1/users/me/location`, same Maputo bounding-box validation, no role restriction (any authenticated user, not just customers — a merchant or courier is also a person). Backend implemented exactly that (migration `V6__add_user_location.sql`, fields now on `UserProfileResponse` everywhere it's used — `/users/me`, admin user detail, merchant-staff detail — since they share one DTO), optional for now per my earlier default, flagged in their own `CONTEXT.md` to revisit once checkout needs delivery routing.
- **Live-verified before building** (established practice by now): fresh process check first (avoided the stale-process trap from Rounds 5b/8b), then `GET /users/me` confirmed `latitude`/`longitude: null`, `PATCH .../location` with a valid Maputo coordinate returned `200` with the value set, an out-of-bounds coordinate correctly `400`s with both `lat`/`lon` validation messages, and an unauthenticated call correctly `401`s.
- **Frontend built**: `lib/auth/types.ts` — `latitude`/`longitude` on `UserProfile`. `lib/auth/client.ts` — `setUserLocation()`. New BFF route `app/api/users/location/route.ts` (mirrors the existing `app/api/auth/profile/route.ts` pattern, `authApiFetch` not `storesApiFetch`, since this is the Security service). New `app/profile/LocationSection.tsx` — reuses the **exact same** Leaflet/OSM map component built for shop location (`app/merchant/shops/[shopId]/location/LocationMapInner.tsx`, imported directly across route folders — same precedent already used for the Admin shop-management reuse) and the same `/api/geo/search`/`/api/geo/reverse` proxy routes, so no new map/geocoding plumbing was needed at all — just pointed at the user endpoint instead of the shop one. Slotted into `ProfileForm.tsx` between the profile-details form and the change-password form.
- **Live-verified end-to-end through the real running app** (not just direct backend calls): `PATCH /api/users/location` through the app's own BFF route saved successfully, `GET /api/auth/me` confirmed the value persisted, and `/profile` renders the new "Localização" section with its map and save button.
- `tsc --noEmit`, `eslint`, and `npm run build` all clean.

## Round 12: Category → proximity-sorted shop browsing, with an anonymous auth+location gate (2026-09-04)

- Ask: clicking a category on `/home` should — if anonymous, gate to register/login with a message explaining registration + location are needed to show nearby stores first, then land back where they were headed; once authenticated with a location set, show a grid of shops in that category ("50% smaller boxes" than the home category tiles), with photos, ordered by proximity.
- **One new backend capability needed, reported to backend, not yet built**: a public `GET /api/v1/shops?categoryId=&lat=&lng=&page=&size=` on Stores-and-Stock, proximity-sorted (Haversine against each shop's own lat/lng from the Round 9 location feature), proposing to exclude shops with no location set. Full spec + open decision (exclude vs. append-unsorted for locationless shops) written up in `API_REFERENCE_MERCHANT_DASHBOARD.md`'s new "PROPOSED — Proximity shop browsing" section.
- **Frontend built** (everything not blocked on that endpoint):
  - **`next=` threaded through the whole auth chain** for the first time: `app/register/page.tsx` reads/forwards `next` to `verify-otp`; `app/verify-otp/page.tsx` reads/forwards it to `login`; `app/login/page.tsx` already supported it for the direct-login path and now also forwards it to `/complete-profile` on first-login-incomplete-profile; `app/complete-profile/page.tsx`/`CompleteProfileForm.tsx` read it from `searchParams` and use it as the post-completion redirect instead of always going to the role home.
  - **Google OAuth `next` preservation — fixed same round, frontend-only, no backend change needed.** Originally flagged as a gap requiring Auth-service state-param support; turned out unnecessary. `/api/auth/google/start/route.ts` now reads `next` from its own query string and, if it's a safe same-site relative path, stashes it in a short-lived (`maxAge: 600`) httpOnly cookie (`konecta_oauth_next`) on our own domain *before* redirecting to the Auth service's OAuth endpoint. Cookies for our origin are untouched by the browser visiting other origins in between (Google, the Auth service) — they're not cleared or blocked by that, `SameSite` only governs whether a cookie is *sent* on a cross-site request, not whether it persists — so the cookie is still there when `/auth/callback/route.ts` runs after the round trip. That route now reads and deletes it (one-time use) and uses it as the post-login destination (or threads it into `/complete-profile?next=...` if the OAuth account still needs onboarding). Also wired `next` into both Google entry points on `/login` (the "Continuar com Google" link and the auto-redirect-to-Google branch for a Gmail address with a failed password login).
  - `app/categories/[categoryId]/access/page.tsx` — new anonymous-only gate: shows the category's own image/name, an explanatory message ("crie a sua conta e defina a sua localização..."), and Criar conta/Entrar CTAs both carrying `next=/categories/{id}`. A logged-in visitor landing here (e.g. stale bookmark) gets redirected onward instead of shown the CTAs again.
  - `app/categories/[categoryId]/set-location/{page.tsx,SetLocationView.tsx}` — for a logged-in user with no location yet; reuses `LocationSection` (the same component built for `/profile` in Round 11) with an `onSaved` that routes to the shop grid instead of just showing a success message in place.
  - `app/categories/[categoryId]/page.tsx` — rewritten from the Round 10 static placeholder into the real gate dispatcher + shop grid: redirects to `/access` (no user) or `/set-location` (user, no location), otherwise fetches `NearbyShop[]` from the new (not-yet-existing) endpoint and renders a 3/4/5-column grid of shop photo tiles (visually smaller than the home category tiles, matching the "50% smaller" ask) with an open/closed dot and distance in km, linking to a new honest "coming soon" `app/stores/[storeId]/page.tsx` (store pages are a future round).
  - `lib/stores/types.ts` — new `NearbyShop` type, documented as backed by the not-yet-built endpoint.
- **Live-verified everything that doesn't depend on the new endpoint**: anonymous → `/categories/{id}` → `307` to `/access`, with the page rendering both CTAs carrying the correct URL-encoded `next` param. Logged-in-with-location → `/categories/{id}` renders the shop-grid page shell correctly and shows a graceful red error message (not a crash) since `GET /api/v1/shops` currently 401s (route doesn't exist). The logged-in-without-location → `/set-location` branch was **not** separately live-tested (no spare test account without a location handy) — code-reviewed only, structurally identical to the already-tested branches.
- `tsc --noEmit`, `eslint`, and `npm run build` all clean.

## Round 12b: `GET /api/v1/shops` closed + Google OAuth `next` preservation fixed (2026-09-04)

- Backend implemented `GET /api/v1/shops` exactly as proposed, including the exclude-unlocated-shops decision (matches the reasoning already written up: can't rank an unlocated shop, and it nudges merchants to finish setup). Haversine distance computed in Java over the filtered set then paginated manually — same pattern already used for `ProductService`'s low-stock filter, not worth a PostGIS investment at this data size.
- **First live test still 401'd** — same stale-`:8092`-process symptom as Rounds 5b/8b (identical `401 UNAUTHENTICATED` on every variant, valid or invalid). Confirmed via process start time predating the report; asked the user to restart, they did, retested clean immediately after: valid request returns real shops nearest-first with `distanceKm`; missing `lat`/`categoryId` each `400 VALIDATION_ERROR` with a field-specific message. Also re-verified through the **actual running frontend app** — `/categories/{id}` for a real logged-in session now renders "Loja Teste E2E 2" with its real logo photo instead of the fallback error message from Round 12.
- User asked how to actually fix the Google OAuth `next`-preservation gap flagged in Round 12 as needing backend state-param support. On closer look that was wrong — **no backend change needed at all**. Fixed frontend-only: `/api/auth/google/start/route.ts` now reads its own `next` query param and, if it's a safe same-site relative path, stashes it in a short-lived (`maxAge: 600`) httpOnly `konecta_oauth_next` cookie on our own domain before redirecting to the Auth service's OAuth endpoint. A cookie set for our origin is untouched by the browser visiting other origins in between (Google, the Auth service's own OAuth pages) — `SameSite` only governs whether a cookie is *sent* on a cross-site request, not whether it survives while other sites are visited — so it's still there when `/auth/callback/route.ts` runs after the full round trip. That route now reads + deletes it (one-time use) and uses it as the post-login redirect (or threads it into `/complete-profile?next=...` for an OAuth account that still needs onboarding, same pattern as the email/password path). Also wired `next` into both Google entry points already on `/login` — the "Continuar com Google" link and the auto-redirect-to-Google branch for a Gmail address whose password login just failed.
- `tsc --noEmit` and `eslint` clean on the OAuth changes (one pre-existing, unrelated `window.location.assign` warning on the same file, already documented as deliberate).
- **Feature is fully closed.** Category browsing with proximity-sorted shops, the anonymous auth+location gate, and `next` preservation across every login path (including Google) are all live-verified end to end.

## Round 13: Four small user-reported issues after Round 12 (2026-09-04)

- **1. Hydration mismatch on `/login`'s Google link `href` (only happened once).** Investigated by testing the actual **production build** (not dev — dev always SSRs fresh per request, doesn't reproduce static-shell behavior): first tried `export const dynamic = "force-dynamic"` on `/login`, `/register`, `/verify-otp`, reasoning it'd force per-request rendering instead of a stale static shell. **Reverted — empirically had zero effect.** Built and ran the app with `next start`, diffed the raw RSC payload for `/login` with and without the fix: Next explicitly marks the `useSearchParams()`-dependent subtree `BAILOUT_TO_CLIENT_SIDE_RENDERING` in both cases — meaning the server deliberately renders *nothing* for that content and tells the client to render it fresh, which is the correct, working mechanism specifically designed to avoid hydration mismatches from search-param-dependent content (there's nothing server-rendered to mismatch against once bailout kicks in). `force-dynamic` doesn't change that mechanism at all. Conclusion: this is a known, benign, one-off Next.js dev-mode warning (likely a transient router-prefetch race), not a code bug — correctly self-heals, doesn't affect the actual click (the href is right by the time it's interactive). Removed the ineffective `dynamic` exports rather than leave dead code.
- **2. Message text on `/categories/{id}/access` was left-aligned despite `text-center` on an ancestor.** Root cause: classic flexbox gotcha — the wrapping `<div className="flex flex-col gap-2">` around the heading and paragraph had no `items-center` of its own, so with the parent's default `align-items: stretch`, the paragraph's `max-w-xs`-constrained box sat flush at the flex line's start (left) even though the *text inside* that box was correctly centered by the inherited `text-center`. Fixed by adding `items-center` to that inner div. Checked the rest of the new pages for the same pattern (`app/stores/[storeId]/page.tsx` and the original category placeholder) — those have their `<p>` as a direct child of the `text-center` `<main>` with no intermediate flex wrapper, so they were never affected.
- **3. "Supermercado Baoba" shows Fechada in the Merchant dashboard and doesn't appear under the Supermercado category for a customer, despite being within its scheduled hours.** Diagnosed as **not a bug** — live data check on that specific shop: `latitude`/`longitude` are both `null` (never set via "Localização" — correctly excluded from the new proximity endpoint, which is designed exactly that way per Round 12's decision) and `hours.days` is an **empty array** (opening hours were never actually saved for this shop at all, not "wrong hours" — `isOpen` correctly computes `false` with no schedule to be inside of, regardless of current time). No code change; explained to the user that the merchant needs to save both Localização and Horário for this shop.
- **4. Add the shop's category as a visible badge on the Merchant `/merchant` dashboard's shop-picker boxes**, instead of only being visible after opening a shop's own Definições. `GET /api/v1/merchant/shops` (the list endpoint) doesn't return `categories` today — confirmed via a live call (only the single-shop `GET` has it) rather than assuming. Built the frontend ready for it anyway (established pattern): `ShopSummary.categories` added as **optional** so the type stays correct whether or not the field is present; `app/merchant/page.tsx` renders a small badge per category when the array is there, renders nothing otherwise (no broken UI while waiting on backend). Small, low-urgency addition proposed in `API_REFERENCE_MERCHANT_DASHBOARD.md`.
- `tsc --noEmit`, `eslint`, `npm run build` all clean throughout.

## Round 14: Real bug found in "Horário" — misleading unsaved-default UI (2026-09-04)

- User reported "Moda Zambeze" still shows Fechada despite setting geolocation and having a 6pm closing time. Live data check: `latitude`/`longitude` were correctly set this time (Round 13's fix confirmed working), but `hours.days` was **still an empty array** — same symptom as the previous shop in Round 13, which I'd written off as user error. Two shops with the identical symptom in a row was reason enough to check the frontend save path itself rather than assume user error twice.
- Verified backend + BFF both work correctly in isolation (`PUT .../hours` with a real 7-day payload → `isOpen` flips to `true` immediately, tested both directly against `:8092` and through the app's own `/api/merchant/shops/{id}/hours` BFF route) — ruled those out.
- **Found the actual bug**: `HoursForm.tsx`'s `load()` only overwrites its state with saved data `if (hours.days?.length === 7)` — when a shop has no saved hours (empty array), it silently falls back to `defaultDays()`, a fully-filled 08:00–18:00 schedule for every day. That default is visually indistinguishable from a real saved schedule — explains exactly why the user believed "closing time is 6pm" was already configured: it was the unsaved placeholder default, not their actual saved data, and nothing on screen said so.
- **Fix**: added a `hasSavedHours` flag, `true` only when real 7-day data was loaded from the backend, `false` when falling back to the default. When `false`, a visible orange banner now reads "Esta loja ainda não tem horário guardado — a loja aparece como fechada até guardar. Os valores abaixo são apenas uma sugestão; reveja-os e clique em 'Guardar horário'." Flips to `true` immediately on a successful save. Since `HoursForm` is shared between the Merchant and Admin routes (`basePath` pattern), this fix applies to both automatically, no separate change needed.
- Fixed the two already-affected test shops directly via the backend while diagnosing (both now have real saved hours and correctly show `isOpen: true`).
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 14b: Category badge on the shop dashboard's Painel tab (2026-09-04)

- User still doesn't see the category badge on `/merchant`'s shop-picker boxes — expected, that one depends on backend adding `categories` to `GET /merchant/shops` (proposed in Round 13, no urgency, likely not shipped yet — couldn't verify live myself, no merchant-role test credentials on hand and Admin can't call that owner-scoped endpoint by design). Also asked for the same badge inside a shop's own dashboard (the "Painel" tab), which needed **no backend wait** — `components/merchant/ShopDashboard.tsx` already fetches the full `Shop` object via the single-shop `GET`, which has always included `categories`.
- Added `shop.categories.map(...)` as additional `Badge`s in the existing status-badge row (next to ACTIVE/Aberta). Since `ShopDashboard` is shared between the Merchant and Admin routes, this applies to both automatically — same reuse pattern as the Round 14 hours fix.
- Live-verified through the real running app: `/admin/shops/{id}` for "Moda Zambeze" now renders a "Moda" badge on the Painel tab.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 15: Shop-picker category badge closed + store → subcategory → product browsing (2026-09-04)

- **Shop-picker box badge from Round 14/14b confirmed live.** Turned out the backend `ShopCardResponse` DTO already had `categories: List<CategoryResponse>` populated — I'd never actually verified the success case (only ever got `403` testing as Admin against this merchant-only endpoint, no merchant test credentials on hand). Diagnosed directly from the backend source on disk (`ShopCardResponse.java`, `StoreService.toCard()`) rather than guessing again — confirmed the compiled `.class` file (17:57) was newer than the source edit (17:43), but the **running `:8092` process had started at 16:48**, before both — same stale-process pattern as Rounds 5b/8b/12b. Flagged it, user restarted, confirmed working.
- **New ask**: after selecting a shop, show its subcategories as photo boxes (smaller than the shop-grid boxes), then selecting a subcategory shows that shop's products as photo boxes (photo + name only — no price/stock yet, that's the order flow, explicitly not this round). Also: clicking the KONECTA logo anywhere in the customer-facing app must go to `/home`, including when not logged in.
- **Logo-click fix**: new shared `components/customer/CustomerHeader.tsx` (logo → `/home`, optional back link) — applied to every customer-facing page, including the three from Round 12 that never actually had a logo/header at all (`/categories/{id}/access`, `/categories/{id}/set-location`, `/categories/{id}` shop grid). While touching `set-location`, fixed the same `items-center`-missing flexbox bug as Round 13's access-page fix (same copy-pasted pattern, same bug).
- **Three new backend gaps found and reported** (none exist today, all public/unauthenticated to match the rest of the browsing surface): (1) `GET /api/v1/shops/{shopId}` — no public single-shop detail endpoint exists at all; (2) subcategory images — `Subcategory` has no `imageUrl` field, same gap `Category` had before Round 10 fixed it there; (3) `GET /api/v1/shops/{shopId}/products` — no public products-in-a-shop list, only the `MERCHANT`/`ADMIN`-authenticated one. Full spec for all three in `API_REFERENCE_MERCHANT_DASHBOARD.md`'s new "PROPOSED — Store → subcategory → product browsing" section.
- **Frontend built ahead of all three**, per established pattern: `app/stores/[storeId]/page.tsx` rewritten from the Round 12 placeholder into a real shop header + subcategory grid (reuses the *existing* public `GET /meta/categories/{categoryId}/subcategories` per the shop's own categories — no new endpoint needed for that half); new `app/stores/[storeId]/subcategories/[subcategoryId]/page.tsx` — product grid. New types `PublicShop`, `PublicProduct`, `Subcategory.imageUrl` (all documented as backed by not-yet-built endpoints). Live-verified graceful degradation: `/stores/{id}` renders the header correctly and shows a clean error (not a crash) since `GET /api/v1/shops/{shopId}` 401s (route doesn't exist).
- Box sizing: read "10% smaller" as a soft visual instruction (not literal), applied as one grid-density step denser at each breakpoint than the previous screen (shop grid → subcategory grid → product grid), consistent with how the earlier "50% smaller" instruction was interpreted for the shop grid.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 15b: Store → subcategory → product browsing — CLOSED, live-verified 2026-09-04

- Backend implemented all three pieces exactly as proposed: `GET /shops/{shopId}` (404s correctly for unknown and non-ACTIVE shops), subcategory `imageUrl` + presign/confirm (reuses the `categories/` S3 prefix nested under `subcategories/`), `GET /shops/{shopId}/products` (minimal `{id, name, photoUrl}` row, `subcategoryId` filter, 404 for non-active shops). 39/39 tests pass.
- **Live-verified directly against the backend**: real shop detail with categories; `404 SHOP_NOT_FOUND` for an unknown id; full subcategory-image presign → real `PUT` to S3 → confirm round-trip; `subcategoryId` filter correctly scoped a shop's 50 products down to 10. Process was fresh this time (started at the exact moment of testing) — no stale-process detour needed for once.
- **Also re-verified through the actual running frontend app**: `/stores/{id}` renders the real shop header and subcategory grid (including the image just uploaded during the backend test — "Roupa Masculina" shows its photo, others correctly show "Sem foto"), `/stores/{id}/subcategories/{id}` renders the real product grid. No more fallback error states from Round 15.
- Backend separately asked about the earlier store-hours "closed at the wrong time" question — correctly declined to guess without the actual opening hours or shop id, rather than assume a bug. Left open for a future round if it resurfaces with concrete details.
- **Feature is fully closed.** The whole customer browsing chain — home categories → proximity-sorted shops → shop subcategories → products — is live end to end, all the way up to (not including) the actual order/cart flow, as scoped.
- `context.md` and `API_REFERENCE_MERCHANT_DASHBOARD.md` both updated to RESOLVED, including a stale trailing note backend caught themselves (the shop-list `categories` field was still marked PROPOSED there despite shipping earlier — fixed on their end).

## Round 16: Carrinho (Cart) — new AGENTS.md section, mocked against a proposed contract (2026-09-04)

- `AGENTS.md` gained a dedicated "Cart focus" section: a new Cart microservice is planned (doesn't exist yet), and this round's scope is Cart UI/flows only — explicitly **not** checkout/payment/address/order placement. Mandates ending every Cart slice with a documented backend-endpoint report, and permits mocking against that reported contract in the meantime (clearly marked, swappable later).
- **Real constraint that shaped the whole design**: the root AGENTS.md forbids faking money-critical data ("do not fake business-critical money flows"). The only public product data available (`GET /shops/{shopId}/products`, built in Round 15) has no `price` field — it was deliberately scoped out back when the ask was just "photo and name" for browsing. This means the mock **cannot** compute a real subtotal today. Resolved by making `unitPrice`/`lineTotal`/`subtotal` genuinely `null` (never fabricated) whenever price is unknown, showing "Preço indisponível" in the UI, and keeping the cart correctly `valid: false` (checkout disabled) until real prices are available — proposed adding `price` to that same public endpoint as a one-line follow-up in `API_REFERENCE_MERCHANT_DASHBOARD.md`.
- **Architecture**: installed `swr` (no query library existed yet) for cart state — single source of truth via a `useCart()` hook keyed `'cart'`, every mutation calls `mutate('cart')`, no parallel shadow state (per AGENTS.md §7). `lib/cart/types.ts`/`client.ts` implement the *real* proposed HTTP contract exactly as it will look once the Cart service exists. `lib/cart/mockStore.ts` is the one file standing in for that service today — httpOnly-cookie-backed (raw storeId + line quantities only, never price), re-resolving name/photo/price fresh from Stores-and-Stock on every read (the "revalidation feedback" requirement), isolated so swapping in real service calls later is a one-file change with zero UI impact. New `app/api/cart/**` BFF routes wrap the mock behind the exact contract `lib/cart/client.ts` expects.
- **UI built**: cart badge (`components/customer/CartBadge.tsx`) wired into `CustomerHeader` via a new `showCart` prop — threaded through every customer page that has a known logged-in user (`/home`, the category shop-grid, `/categories/{id}/set-location`, both `/stores/**` pages); anonymous pages don't render it at all rather than show a failed 401'd fetch. `components/customer/ProductGrid.tsx` — new client component replacing the static product tiles from Round 15, adds an "Adicionar" button per product plus the store-mismatch conflict modal (replace-cart calls `DELETE /api/cart` then re-adds, matching the proposed contract's suggested flow); redirects to `/login?next=<page>` if the visitor isn't logged in rather than silently failing. `app/cart/CartView.tsx` — store header, line items with +/− steppers, per-line revalidation messaging (inactive/out-of-stock/price-unavailable), subtotal, and an "Ir para checkout" CTA disabled whenever `cart.valid` is false. New honest-placeholder `/checkout` page (mirrors the established pattern from `/categories/{id}` and `/stores/{id}` before those were built out) since checkout is explicitly out of scope this round.
- New dedicated `API_REFERENCE_CART.md` — the mandatory end-of-slice backend report, describing the full proposed Cart microservice contract (all 5 endpoints, error codes including `STORE_MISMATCH`'s conflict-modal shape, data models) and explicitly calling out everything the mock does differently from what the real service should do, so nothing about the mock's shortcuts gets mistaken for the actual spec.
- **Live-verified against the mock through the real running app**: empty cart; add a real product (correct name/store, honest `null` price); add from a second shop → `409 STORE_MISMATCH` with the correct `currentStoreName`; quantity update persists and recomputes `itemCount`. (First store-mismatch test attempt gave a false negative from a curl artifact — forgot to persist `Set-Cookie` between requests, not a code bug — caught and redone correctly.)
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 16b: Real Cart microservice shipped — mock swapped out, CLOSED (2026-09-05)

- Backend delivered the real `KONECTA-CART-SERVICE` (port `8093`), matching Round 16's proposed contract almost exactly, including the `STORE_MISMATCH` shape. Live-verified directly first: `GET /cart` on a fresh account returns the same empty shape as the mock did.
- **Swapped the frontend from mock to real service, no UI changes needed** — exactly the outcome the mock's isolation was designed for. New `CART_API_BASE_URL` env var (`.env.local`/`.env.example`), new `lib/cart/cartApi.ts` (server-only fetch wrapper, mirrors `storesApi.ts`'s pattern) with its own `CartServiceError`/`cartApiErrorResponse` — needed a dedicated one rather than reusing the generic `ApiError`/`apiErrorResponse` helpers, since those strip any field beyond `code`/`message`/`details` and would have silently dropped `STORE_MISMATCH`'s `currentStoreId`/`currentStoreName`. All three `app/api/cart/**` BFF routes rewritten to call `cartApiFetch` instead of the mock. Deleted `lib/cart/mockStore.ts` entirely — no longer needed.
- **The old "no public price field" blocker turned out not to matter.** The real Cart service resolves price server-to-server directly against Stores-and-Stock, not through the public browsing endpoint — so the `price`-on-public-products-list ask from Round 16 is now withdrawn (marked in `API_REFERENCE_MERCHANT_DASHBOARD.md`), not blocking anything.
- **Live-verified end-to-end through the real running app** (not just direct backend calls): empty cart; added a real product → real `unitPrice` (1319.5 MT), correct `lineTotal`/`subtotal`, `valid: true` — no more "Preço indisponível"; added from a second shop → `409 STORE_MISMATCH` with the correct `currentStoreName` forwarded intact through the new error path; cart cleared cleanly.
- `API_REFERENCE_CART.md` (the proposal) marked RESOLVED/superseded, pointing to the backend's own `API_REFERENCE-cart-service-response-frontend.md` as the real contract, kept only for historical reference.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.
- **Feature is fully closed.** Cart now runs entirely against the real backend.

## Round 17: Customer checkout preferences (delivery + payment method) (2026-09-05)

- Ask: add delivery preference (Receber em casa / Levantar na loja) and payment method (Cartão / M-Pesa / e-Mola / Dinheiro vivo) to the customer profile, saved as checkout defaults for later. User explicitly asked to route the backend ask through **Stores-and-Stock**, not Security — flagged this clearly in the report rather than silently defaulting to the Security-service pattern used for photo/location, since Stores-and-Stock has zero user-keyed data today (even admin shop listings can't resolve an owner's name for exactly that reason) — this would be its first, a bigger step than it looks. Built it exactly as instructed regardless; the architectural note is there for the user to weigh, not a decision I made unilaterally.
- **Frontend built**: `lib/stores/types.ts` — `DeliveryPreference`, `PaymentMethod`, `CustomerPreferences`. `lib/stores/client.ts` — `getPreferences`/`setPreferences`. New BFF route `app/api/preferences/route.ts` (GET/PATCH, proxies to the proposed `/api/v1/users/me/preferences` on Stores-and-Stock). New `app/profile/PreferencesSection.tsx` — pill-toggle selection UI (same visual pattern as the category picker in `ShopSettingsForm`), saves immediately on selection (no separate submit button, matching how quick a preference toggle should feel). Slotted into `ProfileForm.tsx` between the location section and the change-password form.
- Degrades gracefully — live-verified: the endpoint doesn't exist yet (returns `500`, not `404` — flagged as worth a look once built, in case something's swallowing the route before a proper not-found), but `/profile` still renders correctly with the new section header, no crash.
- Full proposed contract (2 endpoints, request/response shapes, the architectural flag above) written up in `API_REFERENCE_MERCHANT_DASHBOARD.md`'s new "PROPOSED — Customer checkout preferences" section.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 17b: Checkout preferences shipped on Security (not Stores-and-Stock) — rewired, CLOSED (2026-09-05)

- Backend built it on **KONECTA-SECURITY-SERVICE** instead of Stores-and-Stock — matches the architectural note flagged in Round 17's report (Stores-and-Stock has no user-keyed data; this is squarely profile data, same domain as photo/location). Standalone `UserPreferencesResponse`, not merged into `UserProfileResponse`, exactly as asked.
- **Live-verified directly first**: `GET` returns both fields `null`; `PATCH` with only `deliveryPreference` sets it; a second `PATCH` with only `paymentMethod` leaves `deliveryPreference` untouched — genuine partial update confirmed, not a full-replace.
- **Rewired the frontend from Stores-and-Stock to Security**, matching the actual delivery: moved `UserPreferences`/`DeliveryPreference`/`PaymentMethod` types from `lib/stores/types.ts` to `lib/auth/types.ts`, moved `getPreferences`/`setPreferences` (renamed `getUserPreferences`/`setUserPreferences`) from `lib/stores/client.ts` to `lib/auth/client.ts` using the same `sendJson` pattern as `setUserLocation`. Deleted the old `app/api/preferences/**` BFF route (was pointed at Stores-and-Stock via `storesApiFetch`); new `app/api/users/preferences/route.ts` points at Security via `authApiFetch`, mirroring `app/api/users/location/route.ts` exactly. `app/profile/PreferencesSection.tsx` updated to the new import paths/names — no structural changes needed, the component itself was already service-agnostic.
- **Live-verified end-to-end through the real running app** (not just direct backend calls): `GET`/`PATCH /api/users/preferences` through the app's own BFF both return real, persisted data; `/profile` still renders the "Preferências de compra" section correctly.
- Docs: `API_REFERENCE_MERCHANT_DASHBOARD.md`'s proposal replaced with a one-line "MOVED — see Security's doc" pointer (kept the architectural reasoning there rather than duplicating it); full real contract added to `API_REFERENCE-security-service.md`'s new "Checkout preferences" section, right after the location section it was built like.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.
- **Feature is fully closed.**

## Round 18: Profile unified into 2 buttons; preferences added to register (2026-09-05)

- Ask: fold "Preferências de compra" and "Localização" into the same submit as the rest of `/profile` — no more per-section save buttons, only 2 buttons total on the whole page (Guardar alterações, Alterar palavra-passe). Also add the same preferences picker to `/register`, applied once the account is actually usable.
- **Split `LocationSection` into a presentational `LocationPicker` + a thin standalone wrapper.** New `components/customer/LocationPicker.tsx` — pure controlled map/search/coordinates UI, no save button, no API calls, exports `MAPUTO_DEFAULT`. `app/profile/LocationSection.tsx` now just wraps it with its own save button — kept **only** because `/categories/{id}/set-location` (the category-browsing gate from Round 12) still needs a standalone "save and continue" flow; that's a different, legitimate use case, not a leftover. Caught and fixed a real bug while building the picker: its address-search box used to be its own `<form>`, which is invalid HTML once nested inside the profile page's own outer `<form>` — the browser would've treated Enter-to-search as submitting the whole profile form. Replaced with a plain `<div>` + `onKeyDown` handling instead.
- **`PreferencesSection` made fully controlled** — dropped its own load/save/API calls entirely (`value`/`onChange` props only), since it's now always rendered inside someone else's form (profile or register).
- **`app/profile/page.tsx`** now fetches preferences server-side too (alongside the user), passed into `ProfileForm` as a prop — no client-side loading flicker, matches how the page already avoided that for the profile fields themselves.
- **`app/profile/ProfileForm.tsx`** rewritten: one `<form>` now covers Dados pessoais + Localização + Preferências, submitting via `Promise.all([updateProfile, setUserLocation, setUserPreferences])` — genuinely parallel, no swallowed errors (an early draft accidentally chained location-save inside a `.catch()` that silently discarded failures; caught and fixed before shipping). Photo upload stays its own independent immediate action (unchanged) since a photo isn't a "pending edit" the way form fields are. Password change stays fully separate, its own form/button, unrelated data.
- **`/register` gets the same `PreferencesSection`**, before "Criar conta". Since there's no authenticated session yet at register or OTP-verify time (the `PATCH .../preferences` endpoint requires one), the collected values are threaded through the existing `next`-param query-string chain (register → verify-otp → login, the same mechanism built in Round 12) as `deliveryPreference`/`paymentMethod`, then applied via `setUserPreferences` right after the very first successful login, before the final redirect — best-effort (errors swallowed there specifically, since failing to save a preference shouldn't block getting into the app; the user can always set it later in `/profile`). No backend change needed.
- **Live-verified through the real running app**: `/profile` renders exactly 2 `<form>` tags and exactly 2 buttons (confirmed by grep, not assumption) — no stray "Guardar localização"/"Preferências guardadas" section buttons left over; server-fetched real preferences (`HOME_DELIVERY`/`MPESA` from earlier test data) appear in the initial page payload, no loading flash. `/register` renders the preferences section with exactly one `<form>` tag — confirms the nested-form bug was actually fixed, not just reasoned about.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 19: Four small customer-UX fixes (2026-09-05)

- **1. `CustomerHeader` was missing the theme toggle and user menu everywhere except `/home`.** Real gap, not by design — the header component only ever grew a `CartBadge` (Round 16), never the universal chrome `/home` has always had inline. Rewrote `CustomerHeader` to take a `user: UserProfile | null` prop and always render `ThemeToggle` + (`UserMenu` or an "Entrar" link) + the cart badge when logged in — the canonical full header now. Updated all 7 call sites (`/home` stayed on its own inline header, unchanged; the other 6 — both `/stores/**` pages, both `/categories/{id}` pages, `/cart`, `/checkout` — switched from the old `showCart` boolean to the real `user` object, threading it from `getCurrentUser()` where not already available (`app/cart/page.tsx` → `CartView`). Live-verified: `/stores/{id}/subcategories/{id}` (the page the user flagged specifically) now renders both the theme toggle and the real username.
- **2. Cart line delete button.** Added a small trash-icon button next to the +/− stepper in `app/cart/CartView.tsx`, calling `removeCartItem` directly — one click instead of reducing quantity to zero. Kept the existing "quantity reaches 0 → removes" behavior exactly as-is, this is additive.
- **3. Product-box price/stock display.** `price` and `inStock` don't exist on the public products endpoint yet — proposed as a new backend addition (revives the Round 16 price ask, withdrawn back then because the real Cart service didn't end up needing it for its own computation; different reason this time, pure browsing display). Built `components/customer/ProductGrid.tsx` ready for it: shows price only when present (never fabricated), disables "Adicionar" and shows "Esgotado" only when `inStock === false` is explicitly known — deliberately **not** showing a raw stock count/quantity, matching the ask ("stock don't need to be shown... just keep the inability to add"). With neither field present (today), behaves exactly as before.
- **4. Search bar on every browsing screen.** Extracted Home's existing (intentionally non-functional — Search is a later phase per AGENTS.md) search bar into a shared `components/customer/SearchBar.tsx`, added to the category shop-grid, store subcategory-grid, and product-grid pages, matching Home's placement (directly under the header). Still a visual placeholder, not wired — building real search now would need backend search endpoints that don't exist, out of scope for what was actually asked (an input being present, not search working).
- Full proposed contract for `price`/`inStock` written up in `API_REFERENCE_MERCHANT_DASHBOARD.md`'s new "PROPOSED — price/inStock on the public shop-products list" section.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Live-verified through the real running app: search bar present on all three requested pages (grepped, not assumed); theme toggle + real username confirmed rendering on the product page; a real cart item added/removed cleanly through the live Cart service to sanity-check the surrounding code paths still work after the CustomerHeader/CartView changes.

## Round 19b: `price`/`inStock` on public products — CLOSED, live-verified 2026-09-05

- Backend added both fields to `GET /api/v1/shops/{shopId}/products` exactly as proposed.
- **Live-verified directly against the backend**: real prices, matching what the Cart service independently resolves for the same product ("Camisa Social" — 1319.50 MT both places, cross-checked against Round 16b's own test); found a genuine `inStock: false` row ("Bota de Cano Alto") to confirm the negative case actually works, not just the happy path.
- **Also re-verified through the real running frontend app**: the same real price/inStock data flows correctly into `ProductGrid`'s props via the page's server-side fetch.
- Backend flagged a mechanism detail worth remembering: `ProductStatus.OUT_OF_STOCK` is never actually assigned anywhere in that codebase — a zero-stock product stays `ACTIVE` and still lists normally; `inStock: false` is the *only* signal, there's no separate status to also check. Already exactly what the frontend relies on — logged in the doc so it's not rediscovered as a surprise later.
- `API_REFERENCE_MERCHANT_DASHBOARD.md` updated to RESOLVED, original proposal kept below for reference.
- **Feature is fully closed.**

## Round 20: Product detail page (2026-09-05)

- Ask: clicking a product opens a detail page — big photo, name, category/subcategory below it, price, description, quantity + add-to-cart, with a back-to-products link. The grid keeps its existing quick-add button unchanged.
- **Extracted the add-to-cart + STORE_MISMATCH-conflict logic out of `ProductGrid` into a shared `lib/cart/useAddToCart.ts` hook + `components/customer/CartConflictModal.tsx`**, specifically so the new detail page's "Adicionar ao carrinho" button and the grid's quick-add button share one implementation instead of duplicating the replace-cart flow. `ProductGrid.tsx` refactored to use the hook (behavior unchanged) and now wraps each tile in a `Link` to `/stores/{shopId}/products/{productId}`, with the existing Add button kept as a nested click target using `stopPropagation` so tapping it doesn't also navigate to the detail page.
- **New route** `app/stores/[storeId]/products/[productId]/page.tsx` — photo + details side-by-side on wider screens (stacked on mobile), name in large text, category/subcategory shown just below it, price, description, then `ProductDetailActions.tsx` (quantity stepper + add-to-cart, same shared hook/modal). Back link resolves to the exact subcategory grid the product belongs to (via a new `subcategoryId` field on the detail response), not just the shop page generically.
- **One new backend endpoint proposed**, not yet built: `GET /api/v1/shops/{shopId}/products/{productId}` — public single-product detail, mirrors the list endpoint's `inStock`-boolean-not-raw-quantity convention, denormalizes category/subcategory names onto the row like the merchant-side `Product` model already does. Full spec in `API_REFERENCE_MERCHANT_DASHBOARD.md`'s new "PROPOSED — Public single-product detail" section.
- Live-verified: grid tiles correctly link to the new detail-page URLs; the detail page itself degrades gracefully (clean error message, not a crash) since the endpoint doesn't exist yet.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 20b: Public single-product detail — CLOSED, live-verified 2026-09-05

- Backend implemented exactly as proposed, including the deliberate departure from the other two public shop endpoints: an unknown product and a product requested through the wrong shop's id both collapse into `404 PRODUCT_NOT_FOUND` (no distinct `SHOP_NOT_FOUND` here, per the ask's explicit error list) — didn't reuse `StoreService.getActivePublic`, the shop-ACTIVE check is inline in `ProductService.getPublicDetail` with a new `StoreRepository` dependency.
- **Live-verified directly against the backend**: a real product returns the full row (price/category/subcategory cross-checked against the same product's list-endpoint data — consistent); both a genuinely unknown product id and a real product requested via a different shop's id correctly `404 PRODUCT_NOT_FOUND`.
- **Also re-verified through the real running frontend app**: `/stores/{id}/products/{id}` renders the real name ("Camisa Social"), "Moda · Roupa Masculina", "1319.50 MT", and an enabled "Adicionar ao carrinho" button.
- `API_REFERENCE_MERCHANT_DASHBOARD.md` updated to RESOLVED, original proposal kept below for reference.
- **Feature is fully closed.**

## Round 21: Diagnosed "merchant login taking forever" + SWR retry storm (2026-09-05)

- User reported MERCHANT login (`dercio.anselmo@zohomail.com`) taking forever, alongside a dev log full of `GET /api/cart 502` repeating constantly.
- **Root cause of the 502s**: the Cart service (`:8093`) simply wasn't running at that moment — confirmed via `lsof`/`curl` (connection refused). Not a code bug on its own.
- **Root cause of the perceived login slowness**: live-timed the actual login flow directly (both raw `POST :8091/api/v1/auth/login` — 534ms, and the full app flow — login 567ms + `/merchant` 389ms) and found nothing unusually slow in isolation. The real culprit: **SWR's default retry behavior has no cap** — `useCart()` was using bare defaults, which retry a failing fetch indefinitely (every few seconds, plus again on every window focus/reconnect). With the Cart service down, any open tab showing the cart badge (e.g. `/home`, `/stores/**`) hammers `/api/cart` forever. Browsers cap concurrent connections per origin (typically 6 for HTTP/1.1) — a pile of retrying cart fetches in one tab can genuinely queue out a login POST happening in another tab to the same site.
- **Fix**: `lib/cart/useCart.ts` now passes `{ errorRetryCount: 3, revalidateOnFocus: false }` to `useSWR` — bounds the retries and stops re-fetching on every tab-focus, so a downed Cart service degrades quietly (falls back to the empty-cart shape) instead of an unbounded retry storm. This is a real robustness fix regardless of whether it was the exact cause this time — the failure mode (infinite retries against a downed dependency) was real and worth closing either way.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. No further action needed on the "slow login" report itself — it should self-resolve once the Cart service is back up and/or with this fix in place; flagged to the user that starting `:8093` will clear the `502`s.

## Round 22: Fixed a systemic Tailwind class-conflict bug, not just one button (2026-09-05)

- User reported the "Enviar foto" button on the merchant product detail page rendering "very disproportionately big," plus asked for a better label.
- **Investigated why a button with an explicit `className="w-auto px-4"` override could still render full-width** — found the actual root cause: `lib/clsx.ts` (used by `Button`/`Input`/`Select`, the project's own hand-rolled helper, not the real `clsx` npm package) was pure string concatenation with **no Tailwind-conflict resolution**. `Button`'s base classes include `h-12 w-full ... px-5`; when a caller passes `className="w-auto px-4"`, both the base and the override end up in the final class string, and which one visually wins depends on Tailwind's own generated stylesheet order — not the order they appear in the HTML `class` attribute. This is a systemic bug, not specific to this one button — every `Button`/`Input`/`Select` usage that overrides a base utility was at risk of the same silent-loss failure mode, just usually unnoticed because the base and override happened to agree, or the conflict was cosmetically minor.
- **Fixed at the root**: installed `tailwind-merge` (neither it nor a real `clsx` package existed in `package.json` before), rewrote `lib/clsx.ts` to run the joined class string through `twMerge` — same function name/signature, so none of the 3 call sites (`Button.tsx`, `Input.tsx`, `Select.tsx`) needed to change. Verified in isolation: `twMerge` on `Button`'s exact base string + `"w-auto px-4"` correctly drops `w-full`/`px-5` and keeps `w-auto`/`px-4`.
- Also renamed the button label "Enviar foto" → "Alterar foto" (`app/merchant/shops/[shopId]/products/[productId]/ProductDetailView.tsx`), matching the wording already used for the equivalent action elsewhere (`ProfileForm`'s "Alterar foto", `ShopSettingsForm`'s "Alterar logótipo").
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Could not live-verify the rendered button directly via curl — `ProductDetailView` is client-rendered, same limitation as every other client component in this app (SSR only shows "A carregar…"). Confidence instead comes from the isolated `twMerge` proof (the exact class conflict resolves correctly) plus the build/lint passing.

## Round 23: Bigger product photo on the detail page, same ratio as the list (2026-09-05)

- User asked for the product detail page's photo box to keep the same aspect ratio as the browsing grid's tiles, just bigger. It already used `aspect-square` (matching the grid exactly) — confirmed via live curl (this part of the page is plain Server Component markup, not client-gated, so directly verifiable). The actual gap was size: capped at a fixed `sm:w-80` (320px), modest for a hero product photo.
- Bumped to `sm:w-104` (416px) and widened the page container from `max-w-3xl` to `max-w-4xl` to give the larger image room without cramping the details column beside it. Ratio unchanged.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Live-verified: the rendered class list shows `aspect-square ... sm:w-104`, confirmed directly via curl since this section of the page isn't behind client-side hydration.

## Round 23b: Product photo box was actually stretching taller than wide — real fix (2026-09-05)

- User reported the Round 23 fix didn't work — the box was becoming a tall rectangle, distorting the image, not a square.
- Checked the compiled CSS directly: `.aspect-square { aspect-ratio: 1; }` was generating correctly — the utility itself wasn't broken. The real cause: this box is a flex item inside a `flex-direction: column` container on mobile (before `sm:flex-row` kicks in) — using `aspect-ratio` to determine a flex item's **main-axis** size (height, in a column-direction container) has known cross-browser inconsistency; it's a genuinely under-specified/inconsistently-implemented interaction between the flexbox and aspect-ratio specs, not something either utility does "wrong" in isolation.
- **Fixed with the old, bulletproof padding-percentage technique** instead of the `aspect-square` utility: a zero-height spacer div with `pt-[100%]` (padding-top as a percentage always resolves against the element's own *width*, regardless of flex/aspect-ratio spec interactions) forces the parent to the right height, with the actual photo absolutely positioned over it (`absolute inset-0`). Immune to the flex-item-aspect-ratio edge case entirely, since it never relies on `aspect-ratio` at all.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Live-verified via curl (this section of the page is plain Server Component markup, not client-gated) that the new spacer/absolute structure renders as expected.

## Round 23c: Photo was stretching to fill the screen vertically — actual root cause (2026-09-05)

- User clarified Round 23b's fix wasn't the issue at all — the photo box was being stretched **taller than intended to fill the screen vertically**, not just failing to be square. Root cause: `<main>` had `flex flex-1 flex-col ... sm:flex-row` inside a `min-h-screen` page, with no `items-center`/`justify-center` — flex's default `align-items: stretch` was forcing its children (the photo column and the details column) to stretch to fill `<main>`'s full available height, which itself was stretched to fill the whole remaining viewport via `flex-1`. The Round 23b padding-percentage fix was solving a real (and separately worth keeping) cross-browser aspect-ratio-in-a-flex-column issue, but wasn't the actual cause of this specific complaint.
- **Fix**: kept `<main>`'s `flex-1` (so the block still claims the leftover vertical space below the header, giving room to center within), but added `items-center justify-center` — `justify-center` centers the photo+details as a group within that space instead of stretching to fill it edge-to-edge; `items-center` stops the cross-axis stretch that was forcing the image column to grow taller than its own natural (now square, via Round 23b's fix) size.
- Hit a real syntax bug while writing the explanatory comment: placed a JSX `{/* ... */}` comment directly before an element inside a plain parenthesized JS expression (the ternary's `: ( ... )` branch, not JSX children) — invalid, `{/* */}` syntax only works inside JSX children. Caught immediately via the IDE's live TypeScript diagnostics before running any checks; switched to a `//` line comment instead, which is valid in that plain-JS context.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Live-verified via curl (this section renders server-side, no client hydration) that `<main>`'s class list now includes `items-center justify-center`.

## Round 24: Checkout (2026-09-05)

- `AGENTS.md` gained a dedicated "Checkout" section: one screen (Entrega + Pagamento + Contactos e resumo), payment auto-succeeds this phase (no real gateway), then navigate to a minimal Order screen. New `KONECTA-CHECKOUT-SERVICE` doesn't exist yet. **Explicit departure from Cart's rules**: this phase does **not** permit mocking — no local stand-in built, the UI shows a clean error state everywhere it calls the new service instead.
- **Caught a real type-duplication bug before it shipped**: `lib/checkout/types.ts`'s first draft redefined `PaymentMethod` from scratch, duplicating the one already in `lib/auth/types.ts` from Round 17. Fixed to import/re-export it instead of drifting into two independent copies.
- **Handled a deliberate value mismatch AGENTS.md itself calls out**: the profile's `DeliveryPreference` (`HOME_DELIVERY` | `PICKUP`, Round 17) and checkout's own `DeliveryMode` (`PICKUP` | `DELIVERY`) use different vocabularies for the same concept — AGENTS.md anticipates this exactly ("names may vary — map in client"). Added `deliveryModeFromPreference()` in `CheckoutView.tsx` rather than trying to unify the two types.
- **Built**: `lib/checkout/{types,client,checkoutApi,orderStatusLabels}.ts` (server-only fetch wrapper mirrors `cartApi.ts`'s pattern exactly, including its own `CheckoutServiceError`/`checkoutApiErrorResponse` — same reasoning as Cart's: the generic `ApiError` helper strips extra fields). New BFF routes `app/api/checkout/route.ts` (place order) and `app/api/orders/[orderId]/route.ts` (order detail). New env var `CHECKOUT_API_BASE_URL` (guessed port `8094`, flagged as unconfirmed in both `.env.example` and the doc).
- **`app/checkout/{page.tsx,CheckoutView.tsx}`** — one scrollable screen. Redirects to `/cart` if the cart is empty on entry (via `useCart()` + a `useEffect` redirect once loading settles, not before). Entrega section reuses the *exact* `LocationPicker` component built for shop/user location (Round 18/19) for the delivery-address map — third reuse of that component now. Pickup mode shows just the store name/logo from the cart response (no address/hours/distance — flagged as an optional, non-blocking backend enhancement rather than building around it now, matching AGENTS.md's own "if available" language). Pagamento and Contactos e resumo sections prefill from profile + preferences, submit calls the new checkout endpoint, success navigates to `/orders/{orderId}`.
- **`app/orders/[orderId]/page.tsx`** — minimal per AGENTS.md ("can be minimal in this phase"): status (Portuguese label via new `orderStatusLabels.ts`, mirroring the root AGENTS.md §9 timeline exactly, including `PENDING_STORE_OPEN` and the pickup-skips-courier-states rule), store, delivery/payment summary, line items, totals.
- **Backend report** (`API_REFERENCE_CHECKOUT.md`, the mandatory end-of-slice doc): full proposed contract for the two new Checkout endpoints, plus the explicitly-requested check of the other existing services — Security needs **nothing new** (already has everything from Rounds 11/17b), Stores-and-Stock gets **one optional, non-blocking** proposal (address/neighborhood on the public single-shop row, for a slightly richer pickup display later).
- Live-verified what's possible without the real service: logged in as the actual Customer test account, added a real cart item, confirmed `/checkout` loads and gates on cart state correctly, confirmed `/orders/{id}` degrades to a clean error (not a crash). The cart-empty redirect, form prefill, and place-order call itself are code-reviewed/type-checked but not yet click-tested in a browser or against a real order, since `KONECTA-CHECKOUT-SERVICE` doesn't exist to test against.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 24b: Real KONECTA-CHECKOUT-SERVICE delivered — Idempotency-Key wired in (2026-09-06)

- Backend delivered `API_REFERENCE-checkout-service.md`: the real service is live, registered in Eureka as `KONECTA-CHECKOUT-SERVICE` on port `8094` — the guessed placeholder port from Round 24 turned out exactly right. Contract matches the Round 24 proposal almost byte-for-byte, with one genuine addition surfaced by the doc itself: an optional but "strongly recommended" `Idempotency-Key` request header on `POST /api/v1/checkout`, generated client-side once per checkout attempt and resent unchanged on any retry of that same attempt, so a network hiccup on the client side can't create a duplicate order.
- **Implemented the header end to end**: `app/checkout/CheckoutView.tsx` generates one `crypto.randomUUID()` via `useRef` when the page mounts (stable across re-renders/retries within that page load); `lib/checkout/client.ts`'s `placeOrder()` now takes it as a second argument and sends it as `Idempotency-Key`; `app/api/checkout/route.ts` reads it off the incoming request's headers and forwards it unchanged to the real backend call.
- Also added `SERVICE_UNAVAILABLE` to `CheckoutErrorCode` (returned when Cart or Stores-and-Stock is unreachable from Checkout's side) and refreshed the now-stale "service doesn't exist yet" header comments in `lib/checkout/types.ts` and `lib/checkout/checkoutApi.ts` to point at the real doc.
- **Live verification was partial**: confirmed via `GET /eureka/apps` that only `KONECTA-CHECKOUT-SERVICE` was actually running at verification time (Security `8091`, Stores-and-Stock `8092`, and Cart `8093` were all down) — confirmed `POST /api/v1/checkout` and `GET /api/v1/orders/{orderId}` both correctly return `401 UNAUTHENTICATED` with the documented error shape when called without a token, but couldn't exercise a real end-to-end order placement (no way to get a real JWT or real cart without the other three services up). This is a genuine gap in this round's verification, not a "confirmed working" claim — full happy-path testing (login → add to cart → checkout → order detail) still needs to happen once the whole stack is up together.
- Flipped `API_REFERENCE_CHECKOUT.md` from `PROPOSED` to `RESOLVED`, folding in the confirmed deltas and preserving the original proposal in a collapsed `<details>` block for history.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 24c: Full-stack live verification of Checkout — PICKUP + DELIVERY both confirmed end-to-end (2026-09-06)

- With all four services up (Security `8091`, Stores-and-Stock `8092`, Cart `8093`, Checkout `8094`, confirmed via `GET /eureka/apps`), completed the live verification left open in Round 24b.
- **Confirmed via curl with the real customer account**: `401` on both endpoints without a token; `400 VALIDATION_ERROR` for `DELIVERY` mode with no address; a full **PICKUP + CASH** order placed successfully with an `Idempotency-Key` header (`201`, `status: PENDING_STORE_OPEN` — store was closed, correctly deferred per AGENTS.md rule #5, not silently force-confirmed); `GET /api/v1/orders/{orderId}` returned the identical order; `GET /api/v1/cart` confirmed the cart was cleared server-side after the order was placed. Response shape matches `Order` exactly.
- **First pass wrongly suspected a Cart-service regression**: re-adding an item after that first checkout returned a generic `500 INTERNAL_ERROR`, reproduced across products/shops/users, which read like a live backend bug. It wasn't — the repro itself called the wrong path, `POST /api/v1/cart`, instead of the real add-item endpoint documented in `API_REFERENCE-cart-service-response-frontend.md`: `POST /api/v1/cart/items`. Retested against the correct path and it worked immediately. **Lesson: re-check the target service's own reference doc for the exact path before concluding a backend regression, especially under time pressure mid-verification.**
- With the correct endpoint, completed the **DELIVERY + MPESA** happy path too: added item, submitted with a full address, got `201` with the address echoed back verbatim. Then resubmitted the identical request with the **same `Idempotency-Key`** — got back the exact same `orderId`/`createdAt`, confirming the header genuinely prevents duplicate orders on retry, not just accepted-and-ignored.
- No frontend code changes this round — purely the verification pass. `API_REFERENCE_CHECKOUT.md` updated with the corrected, complete live-verification results (both happy paths + idempotency-key proof), including a note correcting the earlier false alarm.

## Round 25: Multi-cart + store-closed checkout gate — rules + backend report (2026-09-06)

- New business rules from the user, applied on top of the already-shipped single-cart Checkout feature: (1) a customer may hold **multiple carts, one per store** — no more cross-store conflict/replace prompt; (2) checkout must **never start payment while the target store is closed**, and — after a follow-up clarification — **no order is ever created for a closed attempt at all** (this retires `PENDING_STORE_OPEN` from the new-order path entirely, not just "legacy"); instead the filled-in checkout form (delivery/payment/contacts) is **saved onto that store's cart as a draft**, resumed manually later; (3) the global cart icon shows the total item count across every cart, and its click routes to the switcher (>1 cart), or straight to a draft-prefilled `/checkout` or a plain `/cart` (1 cart), depending on whether that cart has a saved draft.
- Updated all three stacked `AGENTS.md` sections (root §5/§9, Cart-focus C-01/C-03/new C-11/C-12, Checkout §4.6-4.8) to match — nothing implemented yet at this point, this round was rules + backend scoping only.
- Wrote `API_REFERENCE_MULTI_CART_STORE_GATE.md` (went through one self-corrected revision after the draft-on-cart clarification): Cart service needs a real rework from one-cart-per-user to one-cart-per-`(user, shopId)` (`GET /api/v1/carts` list, `/api/v1/carts/{storeId}(/items/...)` scoped endpoints, `STORE_MISMATCH` retired) plus new checkout-draft storage (`PUT/DELETE /api/v1/carts/{storeId}/checkout-draft`, `checkoutDraft`/`hasCheckoutDraft` on cart reads). Checkout service needs `storeId` added to its place-order request and a defensive-only `409 STORE_CLOSED` (race-condition safety net, not the primary mechanism — the frontend already knows open/closed from the cart list and never calls place-order while closed). Stores-and-Stock and Security: nothing needed for this design.

## Round 26: Multi-cart + checkout-draft shipped by backend and (via Copilot, outside this session) the frontend — live-verified a real bug, root-caused it, handed off the fix (2026-09-06)

- Backend (Cart + Checkout services) and the frontend side (built by the user directly with Copilot, not this session) both implemented Round 25's design while this session was between turns. Cart: per-`(user, shopId)` carts, `GET /api/v1/carts`, scoped `/api/v1/carts/{storeId}` endpoints, checkout-draft save/clear. Checkout: `storeId` on the request, defensive `STORE_CLOSED`, `PENDING_STORE_OPEN` left in the enum for compatibility but unused by the new flow. `CheckoutView.tsx` picked up `storeId`, `saveCheckoutDraft`, live store-open polling (see Round 27), and card/M-Pesa/e-Mola detail fields.
- User reported: payment succeeds when the store is closed-then-reopened flow works, but **confirming an order against an already-open store fails** with a `503` (`"O serviço de checkout não conseguiu contactar o carrinho ou o stock"`), no visible error in the Checkout service's own console.
- **Live-verified and root-caused directly against the real running services** (all four up, confirmed via Eureka): logged in as the real customer, added an item to an open shop's cart via the new scoped endpoint (worked fine), then called `POST /api/v1/checkout` directly — reproduced the exact `503 SERVICE_UNAVAILABLE`. Traced it into the Checkout service's own source (`konecta-checkout-service`, sibling repo): `CartClient.java` was never updated off the **old singular** `GET /api/v1/cart` / `DELETE /api/v1/cart` mappings from before the multi-cart rework. Confirmed directly with curl that the real Cart service now serves that same path with the **new list envelope** (`{"carts": [...]}`) instead of a single cart object — Checkout's `CartDto` fails to deserialize that shape, `CheckoutService.fetchCart()` (lines 170-176) catches the failure and maps it straight to the generic `SERVICE_UNAVAILABLE`, silently (no stack trace at that log level), which is exactly the reported symptom.
- Reported the exact fix needed (scope `CartClient`'s two mappings to `/api/v1/carts/{storeId}`, thread `request.storeId()` through `CheckoutService.fetchCart()`/`clearCart()`) directly in chat rather than editing the Java backend myself — out of this session's Next.js-frontend charter and a separate repo. User's backend side applied it and confirmed payment now correctly proceeds to Encomenda (Order) when the store is open.
- No frontend code changed in this round — pure live-verification + root-cause diagnosis.

## Round 27: Live store-open refresh extended beyond checkout (2026-09-06)

- User liked that the checkout screen already updates its open/closed state live (from Round 26's build) when a merchant changes their hours, and asked for the same behavior everywhere the app shows a store's status — specifically flagged the cart page as missing it.
- Extracted the polling logic already built into `CheckoutView.tsx` into a shared hook, `lib/stores/useLiveStoreOpen.ts` (60s interval + re-check on window focus, seeded from a caller-supplied initial value to avoid a flash of the wrong state). `CheckoutView.tsx` now uses this hook instead of its own inline copy — no behavior change there, just de-duplicated.
- **Found and fixed the actual reason the cart page wasn't live**: `useCarts()` in `lib/cart/useCart.ts` (the multi-cart switcher list) had `revalidateOnFocus: false` and no `refreshInterval` at all — unlike `useCart()` (the single-cart detail), which already had both. Brought it in line.
- `app/cart/CartView.tsx` — both the per-cart switcher cards (new small `CartSwitcherCard` sub-component) and the main cart's store-status line now use `useLiveStoreOpen` directly, hitting the public store-status endpoint the same way Checkout does, rather than relying solely on Cart service's own (less frequently refreshed) `isStoreOpen` field.
- New `components/customer/StoreOpenBadge.tsx` — a small client wrapper around the hook for embedding inside a Server Component page. Applied to `app/stores/[storeId]/page.tsx`'s store header, seeded from the server-rendered `shop.isOpen`.
- **Deliberately not applied** to `/categories/[categoryId]`'s nearby-shops grid (up to ~50 shops) — one `useLiveStoreOpen` per row would mean up to 50 requests/minute per browsing customer. Flagged rather than silently skipped or built inefficiently; the right shape there is one batched re-fetch of the whole list per interval, not implemented yet.
- Added a standing rule to `AGENTS.md` §8 (Cross-cutting) requiring this pattern on every future screen that shows a store's open/closed state, naming the hook/component and explicitly carving out the multi-store-list exception so it doesn't get quietly forgotten or built as 50 individual pollers later. Also dropped a stale "replace cart?" modal mention from that same line (retired by Round 25's multi-cart redesign).
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Not yet click-tested live in a browser this round (verified the underlying `isOpen` data path via curl only).

## Round 28: Orders (Encomendas) — detail roadmap/map + hub, backend report (2026-09-06)

- New `AGENTS.md` section ("Encomendas / Orders"): order detail (status roadmap, tracking map, product list, value summary) and an orders hub (Activas/Histórico tabs, search/filter/sort). Cart and Checkout already shipped; this builds on top of the existing `/orders/[orderId]` minimal page from the Checkout round.
- **Order detail** (`app/orders/[orderId]/page.tsx` + new `OrderDetailView.tsx`): still reads through Checkout's existing, live `GET /api/v1/orders/{orderId}` per AGENTS.md's explicit allowance ("follow project wiring until Orders is up — then switch"), now wrapped in SWR polling (20s interval + revalidate-on-focus) that stops once the order reaches a terminal state (`DELIVERED`/`CANCELLED`/`REFUNDED`, or `PICKED_UP` for a pickup order specifically, since pickup orders don't continue to `IN_TRANSIT`/`DELIVERED`).
- New `components/orders/OrderStatusRoadmap.tsx` — delivery-mode-aware step sequence (pickup ends at "Levantado", reusing the same `PICKED_UP` enum value with a different label than delivery's "Recolhido"; `PENDING_STORE_OPEN` shown only when it's the actual current status, not as a permanent step every order passes through since there's no status-history array to know for sure). `CANCELLED`/`REFUNDED` render as a distinct banner instead of a broken progress bar.
- New `components/orders/OrderMap.tsx`/`OrderMapInner.tsx` — Leaflet/OSM (no paid Google requirement, matching the rest of the app), store + delivery pins (colored div-icons, no extra marker image assets needed), optional courier pin, straight-line dashed trajectory once `PICKED_UP`+ per AGENTS.md's explicit fallback when no real route geometry exists, ETA text. Renders `null` (not an error) when no coordinates are available — never blocks the rest of the page, matching AGENTS.md §4.2.
- **Orders hub** (`app/orders/page.tsx` + `OrdersHubView.tsx`): tabs, search (store/product/date range/order-id), sort, empty states. Built fully against a **new, not-yet-existing** `KONECTA-ORDERS-SERVICE` (`lib/orders/{types,ordersApi,client}.ts` + `app/api/orders/route.ts`, mirroring Checkout's own server-only-fetch-wrapper pattern) — **live-verified the graceful-degradation path**: with nothing listening on the guessed port (`8095`), the BFF route correctly returns a clean `502` (not a crash), and the hub shows "O serviço de encomendas ainda não está disponível" instead of an error page.
- Extended `lib/checkout/types.ts`'s `Order` with optional tracking fields (`storeLatitude/Longitude`, `courierLatitude/Longitude`, `etaMinutes`, `etaAt`) rather than forking a parallel type — same resource, richer once a real Orders service populates them; Checkout's current response (which omits them) still satisfies the type today. Realigned two `orderStatusLabels.ts` entries (`PAID` → "Pagamento confirmado", `STORE_CONFIRMED` → "Loja aceitou") to AGENTS.md's suggested wording.
- Added a "Pedidos" link to `CustomerHeader.tsx` — the app has no bottom tab bar (root AGENTS.md's Phase-1 spec names one but it was never actually built), so this is the pragmatic entry point given the existing top-header chrome; documented as a deliberate scope choice in `API_REFERENCE_ORDERS.md` rather than silently built as something AGENTS.md didn't literally ask for.
- Backend report: `API_REFERENCE_ORDERS.md` (PROPOSED) — new list/search/sort/paginate endpoint, detail endpoint (mostly = Checkout's existing shape + snapshotted store lat/lng + optional courier tracking/ETA fields), confirms Security/Stores-and-Stock need nothing, and that Checkout needs no changes either (the future switch-over is frontend-only, just repointing the BFF route).
- Live-verified via the real running app (authenticated session, an order placed in an earlier round): order detail renders correctly with the roadmap and money summary; map correctly shows only the delivery pin (no store lat/lng in Checkout's response yet, which is the expected/handled case) — confirms the optional-field degradation works as designed, not just in theory.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 28b: Real KONECTA-ORDERS-SERVICE delivered — switched over, live-verified (2026-09-06)

- Backend delivered `API_REFERENCE_konecta_order.md`: `KONECTA-ORDERS-SERVICE` is live on port `8095` (the guessed placeholder from Round 28 was exactly right again) and matches the proposed contract almost byte-for-byte. Notable clarification: it's explicitly a **read-only, interim** service — reads Checkout's own `orders`/`order_items` tables directly (same Postgres database), not an independent one yet; backend flagged this as a known temporary arrangement, not something to report back as a bug.
- **Switched order reads over to the real service**, per AGENTS.md's own instruction to bridge through Checkout only until Orders exists: `app/api/orders/[orderId]/route.ts` and `app/orders/[orderId]/page.tsx` now call `ordersApiFetch`/`OrdersServiceError` instead of Checkout's `checkoutApiFetch`/`CheckoutServiceError`. The orders-hub list route (`app/api/orders/route.ts`) already targeted this service from Round 28 and needed no change.
- **Fixed a real type gap surfaced by backend's doc**: `DeliveryAddress.latitude`/`longitude` can be `null` even when the address object itself is present (an unconfirmed/un-geocoded manual address) — my Round 28 type had them as non-nullable `number`. Fixed in `lib/checkout/types.ts` (shared with `CheckoutRequest`, which still always submits real numbers by construction — no frontend behavior change there) and added a null-guard in `components/orders/OrderMap.tsx`'s delivery-pin logic so a `null` lat/lng can't silently plot a pin at `(0,0)`.
- Live-verified through the real running app (authenticated session): `GET /api/orders?tab=ACTIVE` returns all 8 real orders from earlier rounds' testing; `?tab=HISTORY` correctly empty (no terminal orders exist yet); the switched-over detail route returns the exact Orders-service shape; the full SSR `/orders/{orderId}` page renders the roadmap correctly for a real PICKUP order ("Pagamento confirmado" done, "Levantado" muted) and correctly shows no map section since that order has no coordinates yet — confirms the optional-field degradation designed in Round 28 actually works against real data, not just in theory.
- Flipped `API_REFERENCE_ORDERS.md` to RESOLVED with the confirmed deltas, preserving the original proposal's structure for history.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 28c: Orders hub simplified to one search box, printable receipt, global nav fix (2026-09-06)

- User feedback on the freshly-shipped Orders hub: too many search controls taking up space. Replaced store/product/date-from/date-to/order-id/sort (6 controls) with **one single text input** meant to match store name, product name, order number, and product category all at once; removed date-range and sort UI entirely (not hidden — not built).
- **Real backend constraint surfaced by this change**: `KONECTA-ORDERS-SERVICE`'s list endpoint only exposes `storeName`/`productName`/`q` as separate AND-narrowing filters, and has no category param at all. Sending the same search text to all three at once would wrongly require every field to match simultaneously. Shipped an interim client-side workaround instead of a broken feature: `lib/orders/client.ts`'s new `searchOrders()` fans one query into three parallel requests and merges/dedupes the results by `orderId` (category matching genuinely isn't possible today — documented as a real gap, not faked). Filed the proper fix as a follow-up section in `API_REFERENCE_ORDERS.md`: a single `search` param with OR semantics across store/product/order-id/category.
- **Printable receipt** (`app/orders/[orderId]/receipt/page.tsx` + `PrintButton.tsx`): a dedicated print-styled page (order id, store, date, status, delivery/payment info, line items, totals) with a "Imprimir / Guardar como PDF" button that calls `window.print()` — no PDF-generation library, no backend PDF endpoint, matching AGENTS.md's own "no full fiscal invoice unless asked, and even then no NUIT/IVA breakdown without backend fiscal fields on the Order model." Linked from `OrderDetailView.tsx` as "Descarregar recibo." Live-verified: renders real order data and the print button correctly.
- **Fixed "Pedidos" missing from `/home`**: turned out `/home` had its own hand-rolled header copy instead of using the shared `CustomerHeader` component (the only page in the app doing this) — that's why Round 28's header change never reached it. Replaced with `<CustomerHeader user={user} />`, removing the duplicated markup entirely. Live-verified: "Pedidos" now appears on the real `/home` page.
- Updated `AGENTS.md`'s Orders section (§5.2 rewritten for the single-box search + documented backend gap, new §5.3 for the receipt, new §5b for the "every page must use the shared CustomerHeader" rule) and its acceptance criteria.
- `tsc --noEmit`, `eslint`, `npm run build` all clean. Live-verified via the real running app: `/home` shows "Pedidos", `storeName`-based search returns real matching data, and the receipt page renders correctly for a real order.

## Round 29: Roadmap spacing, merchant Orders tab (new, proposed backend), receipt sharing (2026-09-06)

- **Roadmap spacing halved**: `components/orders/OrderStatusRoadmap.tsx`'s connector line `minHeight` (24→12) and label `pb` (6→3) — was taking up too much vertical space for a quick-glance status list.
- **Map store pin**: confirmed the code already supports two pins (store + delivery) — `components/orders/OrderMap.tsx` was built that way in Round 28. The reason only the delivery pin ever shows is a real, already-documented data gap: `storeLatitude`/`storeLongitude` are `null` on every real order today (confirmed again live). Bumped priority on this in `API_REFERENCE_ORDERS.md`'s follow-up section now that it's blocking a concretely-requested feature, not a hypothetical one — needs Checkout to snapshot the store's lat/lng at order-creation time, same as it already does for `storeName`/`storeLogoUrl`.
- **Fixed "Pedidos" missing from home** turned out to be a header duplication bug from Round 28c's own fix not reaching every page — actually already fixed that round; this round's "visible from any page" request was already satisfied, just re-confirmed.
- **New: merchant/staff Orders tab** — the big piece this round. "Encomendas" added to `ShopNav` (right after Painel, both `MERCHANT` and `MERCHANT_STAFF` get it, unlike staff management which is owner-only). List (`MerchantOrdersList.tsx`): Activas/Histórico tabs, one search box (customer name/contact/product/order number — expanding on the customer hub's own single-box idea), **and a visible date range** (explicitly requested back for this surface, unlike the customer hub where it was dropped). Detail (`MerchantOrderDetailView.tsx`): reuses the same `OrderStatusRoadmap`/`OrderMap` components built for the customer side, plus new status-change action buttons (`lib/orders/statusTransitions.ts` — an explicitly-commented interim/non-authoritative next-action config; real transition validation must be server-side) and a shop-scoped "Descarregar recibo" link.
- **Real, larger backend gap surfaced**: today's `KONECTA-ORDERS-SERVICE` is customer-owner-scoped and read-only only — its own doc says so directly ("no merchant/staff/courier-facing views... nothing like that exists today", "no write endpoints at all"). This whole feature needs genuinely new backend capability: shop-scoped list/detail reads, plus a real status-write endpoint (which, per Checkout being "the sole writer" of the underlying table today, likely needs to live there or proxy through it — flagged as backend's call, not prescribed). Wrote it up as a new `API_REFERENCE_MERCHANT_ORDERS.md`, including a suggested (not mandated) transition table and a from-day-one correctly-designed single OR-semantics `search` param (learning from the customer hub's own AND-narrowing mistake — see Round 28c's follow-up in `API_REFERENCE_ORDERS.md`).
- **Extracted the receipt's presentational layout** into `components/orders/OrderReceipt.tsx` (+ relocated `PrintButton.tsx` into `components/orders/`) so both the customer-owner-scoped route and the new merchant-scoped one render identically without duplicating the JSX — the two routes differ only in how they fetch the order and what `backHref` they pass.
- **Admin parity for free**: `app/admin/shops/[shopId]/orders/**` — thin wrapper pages reusing `MerchantOrdersList`/`MerchantOrderDetailView` with `basePath="/admin/shops"`, matching the established Round 4 reuse pattern exactly.
- Updated `AGENTS.md`: new §7b (Merchant/staff order management) in the Orders section, a compactness note on the roadmap, updated acceptance criteria.
- Live-verified the degradation path against the real (but not-yet-extended) `KONECTA-ORDERS-SERVICE`: the proposed merchant list path returns the service's own structured `500 INTERNAL_ERROR` (unmapped route), which the BFF route surfaces as a normal error banner — not a crash, not a raw stack trace.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 30: Zero-item carts leaking into the cart switcher (2026-09-06)

- User reported a store still showing in the cart switcher after its cart was fully checked out — confirmed live: `GET /api/v1/carts` on the real Cart service keeps a zero-item row for that store (`itemCount: 0, valid: false`) rather than removing it entirely. This answers the "open question" flagged back in Round 25's backend report (whether an emptied cart disappears or stays as a zero-item row) — it stays.
- **Fixed centrally in `lib/cart/useCart.ts`'s `useCarts()`** rather than in each consumer: filters out any `itemCount === 0` row before returning, so both `CartBadge.tsx` (item-count total and its single-vs-multiple-carts routing decision) and `CartView.tsx` (the switcher itself) get the fix automatically, with no per-consumer filtering to remember or forget later.
- Not a bug in the Cart service to report — either behavior (delete vs. zero-item row) was always an acceptable design choice per the original ask; the frontend just needed to not blindly render every row it gets back.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 31: Real merchant order-management endpoints delivered — live-verified, one wording fix (2026-09-07)

- Backend delivered the merchant order-management endpoints on `KONECTA-ORDERS-SERVICE` itself (`API_REFERENCE_konecta_order.md` updated in place, not a new doc) — paths, shapes, and notably the **exact status-transition table** proposed in Round 29 were all adopted as-is. No code changes needed beyond one wording fix, since `app/api/merchant/shops/[shopId]/orders/**` were already built against these exact paths.
- **Live-verified end-to-end through the real running app** as the actual merchant account: list (`GET .../orders?tab=ACTIVE`) returns real orders with real resolved customer names ("Dercio 2 Anselmo3", not emails); detail matches the documented shape; `PATCH .../status` (`PENDING_STORE_OPEN → STORE_CONFIRMED`) succeeded on a real test order.
- **Confirmed the cross-service consistency claim directly, not just by trusting the doc**: immediately after that PATCH, fetched the same order through the *customer-facing* endpoint (different route, different auth, logged in as the actual customer) and got back `STORE_CONFIRMED` too — same row, live, not a cached copy.
- **Confirmed server-side transition enforcement**: attempted the invalid jump `STORE_CONFIRMED → DELIVERED` and got `409 INVALID_TRANSITION`, proving the backend validates independently of the frontend's own `statusTransitions.ts` hint config (which happens to match exactly, per backend adopting the proposed table verbatim).
- **One real gap found and fixed**: backend's `search` param matches customer *contact* (email/phone) — not name, since `customerName` is a live per-request Security lookup, not a stored/indexable column. The search box's placeholder text implied name-search; fixed to accurately say "Contacto do cliente, produto ou nº da encomenda."
- Flipped `API_REFERENCE_MERCHANT_ORDERS.md` to RESOLVED with the live-verification results; updated `lib/orders/statusTransitions.ts`'s comment from "interim, not authoritative" to "confirmed to match the real backend table exactly, server still validates independently."
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 32: Re-flagged the store-pin data gap to backend (2026-09-07)

- User asked why the order map still only shows one pin. Confirmed live (again) that `storeLatitude`/`storeLongitude` are `null` on a real DELIVERY order that has a real `deliveryAddress` with actual coordinates — the frontend's two-pin map (`components/orders/OrderMap.tsx`, built in Round 28) is fully correct and waiting purely on data, not a bug.
- Per user's explicit choice (asked via AskUserQuestion rather than assumed), wrote a standalone, easy-to-hand-off doc — `API_REFERENCE_ORDER_MAP_PIN.md` — re-flagging this with priority: Checkout needs to snapshot the shop's `latitude`/`longitude` (already on Stores-and-Stock's `Shop` record) onto the order at creation time, the same way it already snapshots `storeName`/`storeLogoUrl`. No new columns needed — Orders service already added them in an earlier migration, just nothing populates them yet.
- No frontend code changes — this round was purely live-verification + a backend hand-off doc.

## Round 33: Merchant dashboard order-status boxes, list status filter, urgency-color badges (2026-09-07)

- Three asks: (1) a new row of summary boxes on the shop dashboard's Painel tab — orders received-not-yet-accepted, accepted-in-preparation, and ready/en-route; (2) a status filter on the merchant orders list (default blank); (3) the status shown for each order (in both the list and detail) should escalate color — neutral → orange → yellow, every 5 minutes — for the four statuses where the merchant is the one expected to act (`Pagamento confirmado`, `Loja aceitou`, `Em preparação`, and `Pronto para levantamento` **only for delivery orders**, since a pickup order waiting there is on the customer, not the merchant).
- New `lib/orders/urgency.ts`: `urgencyApplies(status, deliveryMode?)` and `urgencyTier(createdAt, now)` (pure functions) plus a `useNow()` hook (ticks every 30s so a mounted badge's color escalates live without a page reload). New `components/orders/OrderStatusBadge.tsx` — the actual colored pill, used in both `MerchantOrdersList.tsx` (list rows) and `MerchantOrderDetailView.tsx` (header, where `deliveryMode` is available and accurate).
- **Real data gap found while building this**: the merchant list row (`MerchantOrderSummary`) doesn't carry `deliveryMode`, so the list can't accurately know whether a `READY_FOR_PICKUP` order should count as urgent. Resolved by over-including (treats every `READY_FOR_PICKUP` row as urgent on the list) rather than risk silently missing a delivery order that needs a courier — documented as a real, if minor, limitation and proposed adding `deliveryMode` to the list response.
- Dashboard boxes (`components/merchant/ShopDashboard.tsx`): fetches up to 200 active orders server-side and buckets by status client-side (no dedicated counts endpoint exists) — cross-verified live against the raw status breakdown for a real shop (5 `PENDING_STORE_OPEN` → "Recebidas (por aceitar): 5", 2 `STORE_CONFIRMED` → "Aceites (em preparação): 2", both matched exactly). Deliberately shows nothing (not a misleading "0") if the Orders-service call fails, tracked via a separate `ordersLoaded` flag rather than defaulting counts to zero. Removed the now-stale "Vendas, encomendas e recebimentos chegam numa próxima fase" line, since Orders now very much exists.
- Status filter (`MerchantOrdersList.tsx`): no `status` query param exists on the real backend list endpoint yet, so it's applied client-side on whatever page is fetched (bumped to `size=100` when a filter is active) — a real, documented interim limitation for shops with more than ~100 active orders.
- Filed all three real gaps (no counts endpoint, no `status` filter param, no `deliveryMode` on the list row) as a follow-up section in `API_REFERENCE_MERCHANT_ORDERS.md` — none block shipping, all are "correct but not optimal/fully accurate at scale" trade-offs made explicitly rather than silently.
- Live-verified through the real running app as the merchant account: dashboard boxes render with correct, cross-checked counts; the orders list page renders the new "Estado" filter and (via code review + type/lint checks, since badge color depends on client-side elapsed time not visible in raw SSR HTML) the escalating status badges.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 34: Badge contrast, per-status timer reset, cancel confirmation, receipt relabel (2026-09-07)

- User feedback on Round 33's escalating status badges: (1) real contrast bug — I'd used raw Tailwind `orange-700`/`yellow-800` (dark shades meant for light backgrounds) as text color against a translucent tint of the same hue, which in this dark-mode-first app produced dark text on a dark-tinted background, nearly unreadable; (2) the 5-minute timer wasn't resetting per status — it counted from `createdAt` always, so accepting an order that had already sat for 6+ minutes immediately showed the *new* status as already urgent.
- **Contrast fix**: realized `components/ui/Badge.tsx` already solves exactly this correctly (mid-brightness "500"-ish hues like `brand-green`/`brand-orange`/`red-500` against their own 10% tint — legible on both themes) — added a new `urgent` tone (`yellow-500`, same technique) and rewrote `OrderStatusBadge.tsx` to render through `Badge` instead of maintaining its own ad hoc, wrongly-toned classes.
- **Timer-reset fix**: backend doesn't expose a per-status timestamp (only `createdAt`) — genuinely can't be fixed with 100% correctness from the frontend alone. Implemented the best available fix: `MerchantOrderDetailView.tsx` now tracks a local `statusSince` state, set to `new Date().toISOString()` the moment its own `changeStatus` call succeeds, and passes that (falling back to `order.createdAt` otherwise) to the badge. This fixes exactly the scenario the user hit (their own just-made change), though a page reload or another staff member's change still falls back to `createdAt` until backend exposes a real per-status timestamp — filed as a follow-up ask (`statusUpdatedAt`, derivable from the already-existing `order_status_history` table's latest row).
- **Cancel confirmation**: `changeStatus` now takes a `destructive` flag and shows a native `window.confirm()` ("Tem a certeza que quer cancelar esta encomenda? Esta ação não pode ser revertida.") before proceeding — gated generically off the same `destructive` flag already in `statusTransitions.ts`, so any future destructive action automatically gets this too, not just today's "Cancelar."
- **Receipt relabel**: "Descarregar recibo" → "Recibo" with a small inline slip-icon SVG (rectangle with a torn/zigzag bottom edge + two text lines), applied to both the customer (`OrderDetailView.tsx`) and merchant (`MerchantOrderDetailView.tsx`) receipt links — live-verified the customer one renders "Recibo" through the real running app.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 35: statusUpdatedAt wired up; QR code pickup/delivery confirmation built (2026-09-07)

- **statusUpdatedAt**: backend added it to both merchant summary and detail responses — as a free read of `orders.updated_at` (Checkout sets it equal to `createdAt` at insert and never revisits a row; Orders' own status PATCH is the only other writer), not a new query. Live-verified: `statusUpdatedAt` on a real transitioned order was distinctly later than `createdAt`, matching backend's own reported test cases. Wired it into `Order`/`MerchantOrderSummary` types and `OrderStatusBadge` usage (`order.statusUpdatedAt ?? order.createdAt`), and removed the same-session-only local-tracking workaround from `MerchantOrderDetailView.tsx` that Round 34 had added as an interim fix — no longer needed now that the real field exists and is accurate everywhere, not just within one browser session.
- **New feature: QR code pickup/delivery confirmation.** Every order gets an opaque `qrCode` token (proposed, generated by Checkout at creation, never regenerated). Customer order detail (`components/orders/OrderQrCode.tsx`, new `qrcode` npm dependency) renders it client-side whenever present and the order isn't already terminal — no backend-generated image needed, just the raw token encoded in the browser.
- **Merchant/staff scanning ("in the store", courier explicitly deferred per the request)**: `components/merchant/QrScanner.tsx` — plain `getUserMedia` + a canvas frame-grab loop decoded with the new `jsqr` dependency, no all-in-one scanning library (same "build the specific piece" philosophy as the existing Leaflet map wrapper). New `/merchant/shops/[shopId]/orders/scan` screen (+ admin equivalent via the established reuse pattern) — scanning calls a new `completeOrderByQr()` action that jumps the order straight to its terminal success status (`PICKED_UP` for pickup, `DELIVERED` for delivery) from **any** non-cancelled/non-refunded status, bypassing the normal step-by-step transition table entirely — a deliberately wider, separately-validated action from the regular status-change buttons, not a loosening of that existing transition rule.
- Wrote `API_REFERENCE_ORDER_QR.md` (PROPOSED): `qrCode` field on Checkout's and Orders' order responses, new `POST /api/v1/merchant/shops/{shopId}/orders/complete-by-qr` (resolves the order **by token**, not by id in the URL, then checks the resolved order's shop matches the path — treats the token like a credential, never logged). Flagged an open idempotency question (repeat-scan of an already-completed order) without prescribing an answer, since either behavior is safe to handle on the frontend.
- Updated `AGENTS.md` with a new §7c documenting the feature and its scope boundary (courier scanning is out of scope for this round).
- Live-verified graceful degradation: a real order with no `qrCode` renders its detail page normally (no QR section, no error); the new `complete-by-qr` BFF route correctly surfaces the real Orders service's structured `500` for an unmapped path rather than crashing.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 36: Orders-service half of QR contract now live; verified, no frontend changes needed (2026-09-07)

- Backend (`KONECTA-ORDERS-SERVICE`) implemented its half of
  `API_REFERENCE_ORDER_QR.md`: `orders.qr_code` column + partial unique
  index, `qrCode` read-only on both detail endpoints (customer +
  merchant), `OrderRepository.findByQrCode`, and the real
  `POST /api/v1/merchant/shops/{shopId}/orders/complete-by-qr` (404
  `ORDER_NOT_FOUND` for unknown/wrong-shop token, 409
  `INVALID_TRANSITION` for cancelled/refunded, otherwise jumps to
  `PICKED_UP`/`DELIVERED` by delivery mode; re-scan of an already-done
  order is a no-op 200, the idempotency choice §2 left open).
- **Live-verified directly against the real services** (bypassing the
  UI, as customer `dercio.miguel@gmail.com` / merchant
  `dercio.anselmo@zohomail.com`): Orders' `GET /orders/{orderId}` returns
  the `qrCode` field; `complete-by-qr` returns the spec'd
  `404 ORDER_NOT_FOUND` for a bogus token (previously `500`) — the
  endpoint is genuinely live, not just documented. The BFF route was
  already a plain auth+passthrough, so it carries these real responses
  through unchanged.
- **No frontend code changed this round** — everything built in Round
  35 was already written against this exact contract and needed no
  adjustment now that the backend caught up.
- `tsc --noEmit`, `eslint`, `npm run build` all clean (no code changed).

## Round 37: Checkout-service now generating qrCode; feature fully live end-to-end (2026-09-07)

- Backend closed the last gap: `KONECTA-CHECKOUT-SERVICE` now generates
  a real `qrCode` token at order-creation time (§1 of
  `API_REFERENCE_ORDER_QR.md`).
- **Live-verified the complete round trip**, no mocks: placed a fresh
  order (`POST /api/v1/checkout`, order
  `837e6ecd-fbf0-4878-a36d-2464cfa0373a`, store "Supermercado Baoba") →
  got back a real token (`x0JAq31MBFGdCIGmER17FkKX9Ag71XAM`) → read the
  same order via `GET /api/v1/orders/{orderId}` and got the identical
  token back → called `complete-by-qr` as the merchant with that token
  and it jumped `PAID → PICKED_UP` in one call, `200`.
- No frontend code changed — everything built in Round 35 was already
  correct against this contract from the start; Rounds 36 and 37 were
  pure verification as the two backend services caught up piece by
  piece (Orders first, then Checkout).
- **No remaining backend gaps on this feature.** Pre-existing test
  orders keep `qrCode: null` forever (no backfill, expected) — only
  orders placed from now on carry a real code.
- `tsc --noEmit`, `eslint`, `npm run build` all clean (no code changed).

## Round 38: per-product IVA rate — structural change, frontend built, backend not started (2026-09-07)

- **New feature**: IVA in Mozambique varies by product, so it's now a
  per-product field (`ivaRate`, a %, defaulting to 17) instead of a
  platform-wide flat 17% assumed everywhere. Added a "Taxa de IVA (%)"
  input (default 17, editable) to both the merchant product forms
  (`NewProductForm.tsx`, `ProductDetailView.tsx`) — same "load 17 by
  default, let the merchant/staff change it" behavior asked for.
- **Money math reworked to be per-line**: `lib/checkout/moneyBreakdown.ts`'s
  `computeMoneyBreakdown` now takes the cart/order's `items` and sums
  IVA as `Σ lineTotal × rate/(100+rate)` per line (falling back to 17%
  only when items/rate are missing), instead of one flat rate applied to
  the whole subtotal. All three call sites (`CheckoutView.tsx`,
  `OrderMoneySummary.tsx`, `OrderReceipt.tsx` — i.e. checkout, customer/
  merchant/admin order detail, and all three receipt routes) pass their
  items through, so a mixed-IVA-rate cart shows one correct total
  everywhere without re-deriving the math per screen.
- Added `ivaRate?: number | null` to `Product`/`CreateProductPayload`/
  `UpdateProductPayload` (`lib/stores/types.ts`), `CartItem`
  (`lib/cart/types.ts`), and `OrderItem` (`lib/checkout/types.ts`) —
  optional/nullable everywhere since none of it exists on any backend
  response yet.
- **Live-verified the backend gap, not just assumed it**: `POST
  .../merchant/shops/{shopId}/products` with `ivaRate: 5` in the body
  returns `200` with the product created, but the field is silently
  dropped — not persisted, not returned, no validation error either.
  Confirmed this doesn't break the frontend submit (no error thrown),
  but the merchant's entered rate is currently lost until the backend
  implements storage for it.
- Wrote `API_REFERENCE_PRODUCT_IVA.md` (PROPOSED): `ivaRate` needed on
  Stores-and-Stock's product create/update/read, Cart's line items
  (read from the product at add-time), and Checkout/Orders' order line
  items (copied from the cart at checkout time, frozen at that value
  forever after — not reinterpreted if the product's rate later
  changes). This is a three-service chain, not a one-service add.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 39: all three backend services shipped ivaRate; feature fully live end-to-end (2026-09-07)

- Backend closed every gap from `API_REFERENCE_PRODUCT_IVA.md` in one
  pass: Stores-and-Stock persists `ivaRate` on products, Cart carries it
  onto each line at add-time, Checkout copies it onto the order line at
  purchase time, Orders returns it unchanged on both customer and
  merchant detail reads.
- **Live-verified the full round trip**, no mocks: created a product
  with `ivaRate: 5` → persisted and read back as `5.0` → added to cart
  (line carried `ivaRate: 5.0`) → checked out (order response carried
  `ivaRate: 5.0`) → read the same order back from both the customer and
  merchant Orders endpoints, both correct. Screenshotted the customer
  order detail page for a 300 MT / 5%-IVA line: **IVA 14.29 MT**,
  **Subtotal 270.00 MT**, **Taxa de serviço 30.00 MT** — matches the
  per-line math in `lib/checkout/moneyBreakdown.ts` exactly, not the old
  flat-17% figures.
- No frontend code changed — Round 38 built the whole feature (product
  form field, per-line IVA math, `ivaRate` threaded through
  Cart/Order/Product types) against this exact contract from the start;
  this round was pure verification once the backend caught up.
- **No remaining backend gaps on this feature.**
- `tsc --noEmit`, `eslint`, `npm run build` all clean (no code changed).

## Round 40: pickup/delivery QR scan UX hardened — manual entry, order-detail entry point, mismatch handling (2026-09-07)

- **New shared component `components/merchant/PickupQrScanner.tsx`**:
  camera scan (reuses `QrScanner.tsx`) **plus a manual code text input +
  Confirmar button, always rendered** — not gated behind camera failure,
  so staff can validate pickups even when the camera is denied/
  unavailable. Both paths call the same `completeOrderByQr`.
- **`expectedOrderId` prop**: when the scan page is opened from a
  specific order's detail view (`?expectedOrderId=`), a successful scan
  that resolves to a *different* order is shown as a distinct amber
  "Código de outra encomenda" warning instead of a plain green success —
  still completes the transition (the backend already validated shop
  ownership/status), just flags that the wrong customer's code was read.
  Deliberately **not** a new backend param — the resolve-and-transition
  already happens atomically server-side per `API_REFERENCE_ORDER_QR.md`,
  so the match check is a client-side UX nudge only, done by comparing
  the response's `orderId`, never a substitute for server-side
  authorization (already enforced: shop ownership + non-terminal/
  non-cancelled status).
- **New "Ler QR code" button on `MerchantOrderDetailView.tsx`** (green,
  next to Recibo), visible only while the order is non-terminal — links
  to `.../orders/scan?expectedOrderId={orderId}`. Extracted the
  terminal-status check (previously duplicated inline in the customer
  `OrderDetailView.tsx`) into a shared `lib/checkout/orderStatus.ts`'s
  `isTerminalOrderStatus(status, deliveryMode)`, used by both views now.
- `QrScanner.tsx` gained a small status caption ("A pedir permissão da
  câmara…" / "A procurar código…" / "A validar…") so the camera state is
  never just a bare video feed with no feedback.
- **Live-verified end-to-end**, no mocks, as both `MERCHANT` and
  `MERCHANT_STAFF`: placed two real orders, scanned one via manual entry
  from its own order-detail page (matched → green success → status
  flipped `PAID` → `PICKED_UP`, confirmed by reopening the order),
  scanned the other with a mismatched `expectedOrderId` (amber warning
  with the real resolved order's id/name), submitted a bogus code (red
  "Pedido não encontrado" — the real `404 ORDER_NOT_FOUND`), and
  confirmed a `MERCHANT_STAFF` account scanning a shop it doesn't belong
  to gets a clean "Acesso negado" (`403 ACCESS_DENIED`) rather than a
  crash — server-side shop-scoping already works, nothing new needed
  there.
- No new backend endpoints needed — `complete-by-qr` already covers
  everything; this round was frontend UX work on top of an
  already-complete backend contract.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 50: Courier backend shipped and live-verified end-to-end, no frontend changes needed (2026-09-08)

- `KONECTA-COURIER-SERVICE` is real and live — all 9 routes in its
  OpenAPI spec match `API_REFERENCE_COURIER.md` exactly.
  `KONECTA-STORES-AND-STOCK-SERVICE` also shipped the requested
  `categoryId`-optional change to `GET /api/v1/shops`.
- **Live-verified the whole chain**, temporarily promoting a real test
  account to `COURIER` (reverted immediately after, same discipline as
  Round 49): profile create/update with the `MOTORCYCLE`/`CAR` plate
  validation (`400` without a plate, `200` with one); the full document
  presign→S3-PUT→confirm flow; store association correctly **blocked**
  without a `CARTA_CONDUCAO` document on file, then succeeding once one
  existed; merchant-side list/detail-with-documents; every status
  transition (approve, suspend, reactivate) plus the invalid one
  correctly rejected (`409 INVALID_TRANSITION`). Then confirmed the
  same through the actual running app (not just curl): `/courier`
  showed the real saved profile and association, `/courier/stores`
  correctly disabled "Associar-me" for the already-joined shop.
- No frontend code changed — everything built in Round 49 was already
  correct against this exact contract; this round was pure verification.
- Cleaned up all test data afterward (withdrew the test association,
  deleted the test document, reverted the account's role to `CUSTOMER`).
- **No remaining backend gaps on this feature.**
- `tsc --noEmit`, `eslint`, `npm run build` all clean (no code changed).

## Round 51: register defaults to Entregador from the "lojistas/entregadores" link; clarified what happens after (2026-09-08)

- Two issues raised: (1) the "Acesso para lojistas, entregadores e
  administração" link on `/home` didn't pre-select a role on the
  register form, and (2) picking "Entregador" there silently registers
  "like a normal customer" with no sign of the courier-specific fields
  (photo/documents/transport/location) the user expected to see
  immediately.
- **Fix for (1)**: `requestedRole=COURIER` now rides through
  `/home`'s link → `/login?requestedRole=COURIER` → `/register?requestedRole=COURIER`
  (the "Criar conta" link on `/login` forwards whatever `requestedRole`
  it received) → the register form's "Quero registar-me como" select
  defaults to Entregador instead of Cliente.
- **Fix for (2) is a clarification, not new data collection** — and
  deliberately so: `requestedRole` at registration only marks the
  *platform-level* role request (admin-approved later); the account's
  real `role` stays `CUSTOMER` until approved, and only a genuine
  `COURIER`-role account can call the courier-service endpoints (they
  require `role: COURIER`) to save a photo/documents/location — there's
  no session capable of doing that at registration time. So instead of
  moving that data collection earlier (not technically possible without
  a new anonymous-upload capability, which wasn't asked for), added an
  inline notice that appears the moment "Entregador" is selected:
  "Depois de aprovado, terá de completar o seu perfil de entregador —
  localização de base, meio de transporte, documentos (BI, Carta de
  Condução ou Passaporte) e foto — antes de se poder associar a lojas."
  This replaces silent confusion with an accurate expectation — nothing
  was hidden or broken, the flow just wasn't explained.
- **Live-verified with a real registration**, not a mock: clicked the
  `/home` link through to a pre-filled "Entregador" register form,
  filled it with real data (a real email the user could check for the
  OTP), submitted, received the real OTP from the user via chat,
  verified it, logged in, and confirmed via the admin users API that
  the resulting account is exactly as designed:
  `role: CUSTOMER`, `status: PENDING`, `requestedRole: COURIER`, with
  the pinned location (`latitude`/`longitude`) correctly carried through
  the register → verify-otp → login relay from Round 48. Landed on
  `/home` as a normal customer shell, pending admin approval — this is
  the correct, existing behavior, not a bug. Left the account as-is
  (a real pending request) rather than force-approving it, since
  approving is the admin's call to make.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 52: courier onboarding moved to *before* admin approval, not after (2026-09-08)

- Per explicit correction: "every field must be completed before
  approved. The Store Manager needs all that fields to make decision."
  Round 51's clarifying-notice approach wasn't enough — the actual
  requirement is to collect the courier profile (base location,
  transport, plate, documents, photo) as the literal "second screen"
  right after registration, before the admin approval that flips
  `role` to `COURIER`.
- New `isPendingCourierApplicant(user)` in `lib/auth/profile.ts`:
  `role === "CUSTOMER" && status === "PENDING" && requestedRole === "COURIER"`.
- `app/login/page.tsx`: right after first login, a pending courier
  applicant is routed straight to `/courier/onboarding` instead of
  `/home` — this **is** the "second screen after Criar conta" the
  request asked for (register's own form is untouched; the redirect
  chain register → verify-otp → login already existed, this just adds
  one more branch to where login sends them).
- `/courier/onboarding` and `/courier` (hub) now accept
  `isPendingCourierApplicant` in addition to `role === "COURIER"` —
  fixed a real self-redirect bug found along the way in
  `app/courier/page.tsx` (`redirect("/courier")` on wrong role would
  have infinite-looped; now uses `roleHomePath(user.role)` like every
  other role-gated page).
- `CourierOnboardingForm.tsx` takes a `pendingApproval` prop: different
  copy (explains this is pre-approval, not post), the button reads
  "Guardar perfil" instead of "Guardar e escolher lojas", and — since
  store association requires the real `COURIER` role a pending
  applicant doesn't have yet — saving no longer redirects to
  `/courier/stores` for them, it just confirms the save in place.
- **This needs a real backend change**, documented as a new §0 in
  `API_REFERENCE_COURIER.md`: `GET/PUT /api/v1/couriers/me` and the
  `/documents/**` endpoints must accept a caller who is either
  `role: COURIER` (already approved) **or** `role: CUSTOMER` +
  `requestedRole: COURIER` + `status: PENDING` (applying). **Confirmed
  live that this isn't in place yet** — a real pending account got
  `403 ACCESS_DENIED` from both endpoints today (strict `role ==
  COURIER` check). Store association and the merchant-side approval
  endpoints are explicitly **not** part of this revision — those
  correctly still require the real role.
- **Live-verified the frontend half** against the same real pending
  account from Round 51: logging in landed directly on
  `/courier/onboarding` (not `/home`), showing the pending-approval
  banner, the base-location map (still holding the location saved
  during registration), and the rest of the form — confirmed the 403
  from the not-yet-updated backend degrades cleanly (amber banner, form
  still fillable) rather than crashing.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 53: §0's auth relaxation shipped and live-verified — courier onboarding fully unblocked (2026-09-08)

- Backend added a `CourierAccessGuard`: lets a request through on a
  real `ROLE_COURIER`, or on a live `GET /users/me` check (the
  caller's own forwarded token) showing `role: CUSTOMER` /
  `requestedRole: COURIER` / `status: PENDING` — wired into the profile
  (`GET/PUT /couriers/me`) and document controllers, replacing the old
  class-level `@PreAuthorize("hasRole('COURIER')")`.
- **Re-verified against the same real pending account** from Rounds
  51–52 (`dercio.miguel@yahoo.com`, still genuinely `CUSTOMER`/
  `PENDING`/`requestedRole: COURIER`): `PUT /couriers/me` now `200`s
  (was `403`), the full document presign→S3-PUT→confirm flow succeeds,
  and `GET /couriers/me/shops` correctly **still** `403`s for the same
  token — store association is untouched by this change, exactly as
  scoped.
- **Confirmed through the actual running app**: logged in as that
  account, landed on `/courier/onboarding` with **no amber
  "couldn't load" banner** this time (it loaded a real profile) —
  transport showing `A pé` and the `BI` document both correctly
  restored from the earlier direct-API test, proving the round-trip
  works through the real UI, not just curl.
- No frontend code changed — Round 52 already built the onboarding flow
  correctly against this exact contract; this round was pure
  verification once the backend shipped. Left the generic
  service-unavailable fallback banner in the code (still a reasonable
  safety net for a genuine outage) rather than deleting it — it just no
  longer triggers for the pending-applicant case it was originally
  covering.
- Left the test account's saved progress (`A pé` transport, one `BI`
  document, still pending admin approval) as real, valid data rather
  than tearing it down — it's a legitimate example of "applicant mid-
  onboarding," not throwaway clutter.
- **No remaining backend gaps on this feature.**
- `tsc --noEmit`, `eslint`, `npm run build` all clean (no code changed).

## Round 54: logo on the auth pages now links to /home like everywhere else (2026-09-08)

- Bug: the KONECTA logo on `/login`, `/register`, `/verify-otp`, and
  `/set-password` linked to `/login` (or, on register/verify-otp,
  effectively nowhere useful) instead of `/home` — inconsistent with
  every other customer-facing header (`CustomerHeader.tsx` and
  `complete-profile` already correctly go to `/home`/the user's role
  home). Per the existing rule: logged-out or customer-role, the logo
  always goes to `/home` (the categories page).
- Fixed all four `<Link href="/login">` wrappers around the logo to
  `<Link href="/home">`. `change-password`'s logo isn't a link at all
  (static, no fix needed there) and `complete-profile`'s was already
  correct (role-aware `ROLE_HOME_CLIENT[user.role]`).
- Live-verified by clicking the logo on both `/login` and `/register` —
  both now land on `/home`.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 55: register's courier notice updated for the before-approval flow; camera option added to the profile photo (2026-09-08)

- The register form's "Entregador" notice still said "Depois de
  aprovado, terá de completar..." — leftover from before Round 52 moved
  onboarding to *before* approval. Reworded to "A seguir ao registo,
  terá de completar... antes da aprovação da administração e de se
  poder associar a lojas" — matches the actual (now live-verified)
  order of operations.
- New `components/ui/PhotoCaptureInput.tsx`: a "Tirar foto" (live
  camera capture via plain `getUserMedia` + canvas snapshot, same
  library-free approach as `QrScanner.tsx`) button alongside the
  existing "Alterar foto" (plain file input) — both resolve to the same
  `File` handed to the caller, so `CourierOnboardingForm.tsx`'s upload
  logic didn't need to change, just the input source. Camera denial/
  unavailability shows a clean error with a "Cancelar" back to the
  two-button choice, not a crash.
- Scoped to the courier profile photo only, per the request ("in the
  Entregador profile") — not applied to other photo uploads (shop logo,
  product photos, generic profile photo elsewhere) unless asked.
- **Live-verified**: screenshotted the updated register notice; on
  `/courier/onboarding`, confirmed both "Tirar foto"/"Alterar foto"
  buttons render, clicking "Tirar foto" in a camera-less headless
  browser shows the clean error + Cancelar, and Cancelar correctly
  returns to the two-button idle state.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 56: photo capture collapsed to one button, upload as a fallback link inside it (2026-09-08)

- Round 55's two-top-level-buttons ("Tirar foto" + "Alterar foto") was
  a misread — corrected: `PhotoCaptureInput.tsx` now shows a single
  "Alterar foto" button that opens the camera view; a "Carregar foto em
  vez disso" text link sits next to Capturar/Cancelar inside that same
  view for anyone who'd rather upload (or whose camera is denied/
  unavailable) — not a second button competing for attention up front.
- Live-verified: idle state shows exactly one button; opening it and
  hitting the (expected, camera-less-browser) error still surfaces the
  upload fallback link right there, same clean-degradation behavior as
  before.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 57: photo capture mirrored, relabeled, reordered, and centered (2026-09-08)

- Front camera preview was showing un-mirrored, which reads backwards
  for a selfie/webcam shot — added `-scale-x-100` to the `<video>` and
  mirrored the canvas draw in `capture()` too (`ctx.translate` +
  `ctx.scale(-1, 1)` before `drawImage`), so the saved photo matches
  what the person saw while framing it, same as every selfie camera and
  webcam app.
- Upload changed from a plain text link ("Carregar foto em vez disso")
  to a real button labeled "Upload", reordered so the row reads
  Capturar → Upload → Cancelar (cancel last).
- Centered the whole "Foto de perfil" card (avatar stacked above the
  button, not side-by-side) and the camera-view buttons/error text —
  per the explicit ask to keep this whole little widget centered rather
  than left-aligned.
- Live-verified: avatar + "Alterar foto" button render centered at
  rest; opening it and hitting the (expected, camera-less browser)
  error shows the centered error text with Upload/Cancelar in that
  order.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 58: photo preview enlarged, per-document "Adicionar" button folded into the main save, real dropzone, and the licence check made a hard block (2026-09-08)

- **Photo preview was tiny after capture/upload** — the persistent
  avatar was a small `h-20 w-20` circle while the camera view itself
  was a much bigger 220px square, an odd size drop the moment a photo
  landed. Made both the same shape and size (`aspect-square max-w-55
  rounded-2xl`), so there's no jarring shrink between "taking it" and
  "seeing it saved."
- **Removed the standalone "Adicionar documento" button** — the
  new-document mini-form (type/number/dates/place/file) no longer has
  its own submit or its own network call. `handleSubmit` (the main
  "Guardar perfil" button) now does it all in one go: saves the
  profile, and — only if any of the document fields was touched, and
  only once all of them are filled — uploads and creates that document
  too, in the same click. Removed `handleAddDocument` and the
  now-unneeded `addingDoc` state entirely.
- **Real dropzone instead of a bare `<input type="file">`**: a dashed-
  border clickable area with an upload icon, "Carregar documento" (or
  the chosen filename), and "Imagem ou PDF" beneath — a native
  `<button>` element so the pointer cursor and accessibility come for
  free, no extra CSS needed for that part.
- **Caught a real gap from Round 51 while re-verifying**: the
  Mota/Carro → requires-Carta-de-Condução rule was only ever a soft
  amber nudge, never an actual block — `handleSubmit` would happily
  save a `CAR`/`MOTORCYCLE` profile with no licence on file. Added a
  real blocking check (`plateRequired && !hasLicence` → `setSaveError`,
  save aborted) right alongside the existing plate-number check, and
  reworded the nudge from "também precisa" to an explicit "Obrigatório...
  não é possível guardar sem ela."
- **Live-verified all of it** against the same real pending account:
  screenshotted the enlarged photo box and the new dropzone through the
  real UI; selected Carro, filled a plate, left the licence unfilled,
  clicked Guardar perfil, and confirmed the hard error now appears and
  the save genuinely doesn't go through — then reverted the account's
  transport back to `WALK` via a direct API call afterward to leave it
  clean.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 49: Courier onboarding + store association built end-to-end (frontend), backend entirely PROPOSED (2026-09-07)

- **New feature area**, biggest single addition so far: courier profile
  completion (base-location pin, transport type, plate + licence
  nudge, multi-document upload, profile photo), store-association
  browsing/requesting with distance shown before and after (2 km
  confirmation prompt, frontend-only), and store-side approval
  (Pendentes/Ativos/Suspensos, Aprovar/Rejeitar/Suspender/Reativar,
  documents visible on a detail view). Explicitly stops short of job
  offers / accept-reject / delivery-in-progress — a separate slice per
  the request.
- **Nothing on the backend exists yet** — this is fully built against a
  proposed contract, same methodology as every other feature in this
  project before its backend caught up (Cart/Checkout/Orders/QR).
  Wrote `API_REFERENCE_COURIER.md`: a whole new proposed
  `KONECTA-COURIER-SERVICE` (profile, documents, per-store
  association/approval) plus one required change to an already-live
  endpoint — `GET /api/v1/shops` on Stores-and-Stock needs `categoryId`
  to become optional (confirmed live: `400 VALIDATION_ERROR` without it
  today) so the courier's store-picker can browse every shop city-wide,
  not one category at a time.
- New `lib/courier/` module: `types.ts`, `client.ts` (browser-side,
  mirrors `lib/merchant/client.ts`'s pattern), `courierApi.ts`
  (server-only, mirrors `ordersApi.ts`/`storesApi.ts` — throws until
  `COURIER_API_BASE_URL` is set and a real service answers). New BFF
  routes under `app/api/courier/**` (profile, documents + presign,
  store associations) and `app/api/merchant/shops/[shopId]/couriers/**`
  (list, detail-with-documents, status, reject), plus
  `app/api/shops/nearby` proxying Stores' existing endpoint without
  `categoryId`.
- New UI: `components/courier/CourierShell.tsx` (header + Perfil/Lojas
  tabs, replaces the old bare `RoleLanding` placeholder for `COURIER`),
  `app/courier/onboarding/CourierOnboardingForm.tsx` (reuses
  `LocationPicker` + the device-GPS pre-pin hook from the location
  round, reuses the existing generic user-photo upload, reuses
  `uploadAndConfirm` for document files), `app/courier/stores/CourierStoresView.tsx`
  (reuses `ConfirmDialog` for the >2km prompt), and the merchant-side
  `CouriersList.tsx`/`CourierDetailView.tsx` (reuse `Badge`, mirror
  `StaffList.tsx`'s tab/action pattern). New "Entregadores" tab added to
  `ShopNav` (visible to `MERCHANT` and `MERCHANT_STAFF`, same as every
  other tab) and reused for Admin via the established
  `basePath`/`listHref`/`listLabel` pattern.
- Updated `AGENTS.md` with a new Courier onboarding section (explicitly
  authorized) documenting scope, the proposed backend, and the product
  rules (distance always server-computed, 2 km is frontend guidance not
  a backend cap, plate/licence nudge is client-side only — backend must
  independently enforce it, platform role approval vs. per-store
  approval are two separate things).
- **Live-verified end-to-end (UI only, no backend to complete the loop)**:
  temporarily promoted a real test account
  (`dercio.miguel@gmail.com`, normally `CUSTOMER`) to `COURIER` via the
  already-live `PATCH /api/v1/admin/users/{id}/role` endpoint, logged in
  as it, screenshotted `/courier` (shell + graceful "profile
  unavailable" banner), `/courier/onboarding` (photo/base-map/transport/
  documents form, all rendering correctly — confirmed the base map
  pre-pins Maputo since this headless browser has no GPS), clicking
  "Mota" correctly reveals the plate-number field + the "also upload
  Carta de Condução" nudge, and `/courier/stores` (graceful "conclude
  your profile first" redirect prompt, since no courier profile exists
  yet). **Reverted the test account back to `CUSTOMER` immediately
  after** — it's used throughout this project's conversation history
  for customer-side testing and must not stay changed.
- The merchant-side "Entregadores" tab also live-verified: renders
  correctly in `ShopNav`, degrades cleanly (Portuguese error banner, no
  crash) with no backend behind it.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 48: device GPS pre-pins every map, including a new one on registration (2026-09-07)

- Per explicit ask: every map used to set coordinates — registration,
  profile, store location — should default to the device's real GPS
  position (via the browser's Geolocation API) instead of the static
  Maputo pin, whenever there isn't already a saved location to show;
  falls back to the Maputo default (and manual pin/search, as before)
  on denial, timeout, or no geolocation support.
- New shared `lib/geo/useDeviceLocationDefault.ts` — a tiny hook,
  `useDeviceLocationDefault(hasSavedLocation, onLocated)`, called once
  on mount; no-ops entirely if a real saved location already exists (so
  reopening a screen with a stored address never silently jumps the pin
  to wherever the user happens to be right now). Wired into
  `app/profile/ProfileForm.tsx`, `app/profile/LocationSection.tsx`
  (existing maps), and the two registration entry points (see below,
  new maps). The merchant Store Details form
  (`app/merchant/shops/[shopId]/location/LocationForm.tsx`) got the same
  logic inlined instead, since its position is only known after an
  async shop fetch resolves, not synchronously at mount like the others.
- **New capability, not previously built**: after user clarification, a
  location map was added to *both* registration entry points that had
  none before — `app/register/page.tsx` (self-registration) and
  `app/complete-profile/CompleteProfileForm.tsx` (Google OAuth signups
  finishing their profile). Register has no authenticated session yet
  to call `PATCH .../location` directly, so the pinned coordinates ride
  through the existing register → verify-otp → login relay (same
  established pattern already used for delivery/payment preferences —
  query params carried across each redirect) and get saved via
  `setUserLocation` right after the very first successful login.
  Complete-profile already has a session, so it saves directly
  alongside `completeProfile()` on submit.
- Checkout's own `LocationPicker` (`app/checkout/CheckoutView.tsx`) is
  deliberately **not** touched — it already prefills from the profile's
  saved address per AGENTS.md, and overriding that with a fresh GPS
  fix on every checkout would fight that intentional behavior.
- **Live-verified**: screenshotted the new registration map (renders,
  defaults to Maputo in a headless browser with no GPS access — correct
  fallback behavior) and the merchant Store Details map for a shop that
  already has a saved location (pin stayed exactly on its stored
  coordinates, confirming the "don't override an existing save" guard
  works).
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 47: customer can share/export the pickup QR code (2026-09-07)

- Per explicit ask: the customer needs to be able to send the QR code
  to someone else (WhatsApp, email, etc.) so that person can do the
  pickup/delivery instead.
- `components/orders/OrderQrCode.tsx` gained two buttons under the QR
  image: **Partilhar** (Web Share API, `navigator.share`/`canShare` —
  shares the actual PNG as a file when the browser supports sharing
  files, which is what makes WhatsApp/etc. show it as an image rather
  than a link; falls back to sharing just the raw code as text if only
  plain `navigator.share` exists, and to a plain download if neither
  does) and **Transferir** (always-available plain image download via
  a generated `<a download>` click, no library). The feature-detect for
  file-sharing support runs once via a lazy `useState` initializer
  (`typeof navigator !== "undefined" && navigator.canShare(...)`)
  rather than an effect, to avoid a same-render setState-in-effect lint
  violation for what's really a one-time synchronous check.
- The user cancelling the native share sheet (`AbortError`) is treated
  as a no-op, not surfaced as an error.
- **Live-verified** in a real (headless, so no `navigator.share`)
  browser: both buttons render under the QR on the customer order
  detail page, and clicking either (Transferir's real download path,
  Partilhar's graceful no-`navigator.share` fallback path) completes
  without any console error or page disruption.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 46: "Alterar estado" collapsed to match the new 3/5-step roadmap (2026-09-07)

- Round 45 simplified the *display* roadmap but left the merchant's
  "Alterar estado" buttons on the old granular flow (Aceitar encomenda →
  Iniciar preparação → Marcar como pronto, three separate clicks) — this
  round collapses those into what the simplified roadmap implies: one
  "Marcar como pronto para levantamento" button from any of
  `PAID`/`PENDING_STORE_OPEN`/`STORE_CONFIRMED`/`PREPARING`.
- **Still no backend change** — `PATCH .../status` only ever allows one
  step at a time (confirmed live, `409 INVALID_TRANSITION` otherwise), so
  `lib/orders/statusTransitions.ts`'s `StatusAction` now carries a
  `path: OrderStatus[]` (the full chain to walk) instead of a single
  `status`, and `MerchantOrderDetailView.tsx`'s new `runTransition`
  calls `updateOrderStatus` once per step in sequence behind that one
  click, committing `setOrder` after each successful step (so a
  mid-chain failure still shows the real furthest-reached status, not a
  stale one). `READY_FOR_PICKUP`'s two next actions (Marcar como
  levantado / Atribuir estafeta) are single-step as before — unchanged,
  since those already correspond to their own distinct roadmap step.
- **Live-verified**: placed a fresh `PAID` order, clicked "Marcar como
  pronto para levantamento" once, confirmed via a direct backend read
  it landed on `READY_FOR_PICKUP` (i.e. all three chained PATCH calls
  actually went through, not just the first) — screenshotted before
  (one button) and after (roadmap step 2 lit, single next action
  "Marcar como levantado pelo cliente" shown).
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 45: order status roadmap simplified to 3/5 steps per delivery mode (2026-09-07)

- Per explicit ask ("There are too much status") + explicit authorization
  to edit `AGENTS.md`: the customer/merchant-facing status **roadmap**
  now shows only 3 steps for pickup (Pagamento confirmado → Pronto para
  levantamento → Entregue) and 5 for delivery (Pagamento confirmado →
  Pronto para levantamento → Entregador atribuído → A caminho →
  Entregue) — down from the previous 5/8-step walk through every raw
  backend status.
- **This is a display simplification, not a backend/enum change** — the
  real `OrderStatus` values (`STORE_CONFIRMED`, `PREPARING`, `PICKED_UP`,
  etc.) are untouched and still what the API sends/receives; they're
  just folded into the nearest visible step in
  `components/orders/OrderStatusRoadmap.tsx` (rewritten around a
  `{ label, statuses[] }` group table per mode instead of a flat step
  array) rather than each getting its own dot. `CANCELLED` never
  regresses `READY_FOR_PICKUP`'s spec — for delivery, `PICKED_UP` folds
  into "Entregador atribuído" (no distinct dot for "collected from
  store, not yet en route"); for pickup, anything from `PICKED_UP`
  onward folds into the final "Entregue" (defensive — a pickup order
  shouldn't reach `COURIER_ASSIGNED`/`IN_TRANSIT` in practice).
- Updated `AGENTS.md` (authorized): root §9 now states the 3/5-step
  rule directly (superseding the old raw enum walk) plus documents a
  **new, not-yet-built rule**: at "Pronto para levantamento", the
  customer or MERCHANT/MERCHANT_STAFF should be able to change the
  order's delivery mode (pickup ↔ delivery-to-address) — flagged
  explicitly as needing a real backend mutate-in-place endpoint before
  any UI is built for it, not a client-only toggle. The Orders section's
  §4.1 now points to §9 instead of duplicating the (now-outdated) raw
  status table.
- **Live-verified** against real orders: a delivery-mode order
  (`210214b0`) rendered the 5-step roadmap correctly at step 1; a
  pickup-mode order (`0655854e`) rendered the 3-step roadmap correctly.
  `MerchantOrderDetailView.tsx` gets this for free — same shared
  `OrderStatusRoadmap` component, no separate change needed there.
- `ORDER_STATUS_LABELS` (flat, mode-agnostic map used by badges/receipts
  elsewhere) is untouched — only the roadmap's own step labels changed;
  a badge showing raw "Recolhido" for a `PICKED_UP` order elsewhere in
  the app is unaffected by this round, by design (this was scoped to
  the roadmap specifically, not every status surface).
- **Not built this round**: the actual delivery-mode-change control —
  flagged as a rule in `AGENTS.md` for whenever that's picked up, needs
  its own backend contract first.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 44: reverted the pending-confirm scan UI; final confirmation moved back to the order detail page instead (2026-09-07)

- **Round 43's change (a staged "read code → tap Confirmar" step inside
  `PickupQrScanner.tsx`) is reverted** — back to instant submit-on-scan/
  manual-entry, per explicit direction ("go back to previous design").
- **What actually changes instead is the *target status* the scan
  should land on.** Rather than a UI confirm step before calling the
  API, the real fix is: the scan itself should never single-handedly
  close out an order. It should fast-forward the order to
  `READY_FOR_PICKUP` (the last status the *store* owns) from wherever it
  is, and the **actual final confirmation happens on the order detail
  page** — via the already-existing "Alterar estado" action buttons
  (`READY_FOR_PICKUP → PICKED_UP`/`COURIER_ASSIGNED`) — so staff check
  the product list against what's being handed over before confirming,
  rather than trusting a scan to finish the order unattended.
- **This is a backend contract revision, not a frontend one** — the
  target status a scan lands on is entirely backend logic; the
  frontend already just echoes back whatever `order.status` the API
  returns. Documented the full revision in `API_REFERENCE_ORDER_QR.md`
  (a `REVISION NEEDED` section under §2): replace the "any status →
  terminal" target with "any status → `READY_FOR_PICKUP`", with a
  no-op (not backward-moving) response for orders already at or past
  it. Everything else about the endpoint (token resolution, shop-match
  check, `CANCELLED`/`REFUNDED` rejection, auth, error codes) is
  unchanged and still correct as originally verified.
- Updated copy only: `PickupQrScanner.tsx`'s success panel now says
  "Encomenda avançada" + a line telling staff to confirm on the order
  page after checking products, instead of implying the scan itself
  completed the order; `ScanOrderView.tsx`'s intro text matches. Written
  generically enough (echoes whatever `order.status` actually comes
  back) that it reads correctly whether the backend has shipped the
  revision yet or not — today, before the backend ships it, a scan
  still jumps to the terminal status same as before, and the copy still
  makes sense either way.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 43: QR scan no longer auto-transitions — explicit confirm step added (2026-09-07)

- Per explicit ask: reading a code (camera decode or manual entry) must
  never call `complete-by-qr` by itself — it only *stages* the code.
  `PickupQrScanner.tsx` gained a `Stage` state machine
  (`idle → pending → result`): a successful camera decode or the manual
  form's now-relabeled "Ler código" button both just move to `pending`
  (shows the raw code + "Confirme para marcar a encomenda como
  levantada/entregue. Esta ação não pode ser revertida." + Cancelar/
  Confirmar levantamento/entrega buttons) — the API call, and the actual
  transition, only happens on that explicit Confirmar tap.
  "Cancelar" goes back to idle without ever calling the API.
- The camera component unmounts (releasing its tracks) the moment a
  code is staged, not just on a final result — no live feed running
  while the staff member is reviewing/deciding.
- **Live-verified**: staged a real order's code via manual entry,
  confirmed via a direct API read that the order was still `PAID`
  (unchanged) at that point, then tapped Confirmar and verified it
  flipped to `PICKED_UP` only then.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 42: active-order count + delay warning on the shop-picker cards (2026-09-07)

- `app/merchant/page.tsx` ("As suas lojas") now shows a pill per shop:
  **N encomendas ativas**, counted via the same `tab=ACTIVE` Orders
  filter already used everywhere else (excludes `DELIVERED`,
  `CANCELLED`, `REFUNDED`, and terminal pickup `PICKED_UP` — no new
  business rule, just reusing the hub's existing active/history split).
  Fetched per shop in parallel (`Promise.all`), same pattern as
  `ShopDashboard.tsx`'s existing per-shop Orders call — no dedicated
  counts endpoint exists yet, so this is capped to the first 200 active
  orders per shop like that dashboard already is.
- **Delay flag**: if any order in that page has been sitting in its
  current status for more than 5 minutes (`statusUpdatedAt ?? createdAt`
  vs now), the pill switches from green to orange — same visual
  language as the existing "produtos com stock baixo" warning pill
  right next to it, and appends "· atrasada".
- A shop with zero active orders shows no pill at all (not "0 encomendas
  ativas") — consistent with how the low-stock pill already only
  appears when the count is positive.
- **Live-verified** against real data: two shops with 7 long-stale
  active test orders each correctly showed the orange "7 encomendas
  ativas · atrasada" pill; shops with zero active orders showed nothing.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.

## Round 41: "Ler QR code" made a persistent floating action across every shop page (2026-09-07)

- Per explicit ask: the scan entry point must be reachable from **every**
  MERCHANT/MERCHANT_STAFF page for a shop, not just the Encomendas tab —
  "an activity that does not require navigating any menu."
- New `app/merchant/shops/[shopId]/layout.tsx` — a layout scoped to the
  whole `/merchant/shops/[shopId]/**` subtree (Painel, Encomendas + order
  detail/scan/receipt, Produtos + product detail/new, Horário,
  Funcionários + staff detail/new, Definições, Localização — every page
  under a shop, including the two product pages that don't even render
  `ShopNav`). Renders `children` plus a new
  `components/merchant/ScanQrFab.tsx`.
- `ScanQrFab`: a fixed bottom-right floating button (icon-only on narrow
  screens, icon+label from `sm:` up) linking to that shop's
  `.../orders/scan` — one tap from anywhere, no menu. Hides itself via
  `usePathname()` when already on the scan page (no point floating a
  button over the scanner it links to).
- **Live-verified**: screenshotted the FAB present on the shop dashboard
  and the Produtos list (pages that previously had no path to scanning
  at all without going through Encomendas first), and confirmed it
  correctly disappears on the scan page itself.
- Left the existing inline "Ler QR code" button on the Encomendas list
  and the order-detail one (Round 40) in place — the FAB is additive,
  not a replacement; both remain useful in their own context.
- `tsc --noEmit`, `eslint`, `npm run build` all clean.
