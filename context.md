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
