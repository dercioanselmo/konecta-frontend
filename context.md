# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

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
