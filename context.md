# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current feature: Merchant dashboard

**Scope (per `AGENTS.md` §6, Merchant Phase 1):** dashboard (shops overview,
per-shop summary), fiscal/store profile, opening hours, products CRUD +
stock, categories/subcategories, product photos + shop logo/cover upload.
**Not built**: Orders, Sales summary, Receipts — the backend explicitly
doesn't own these yet (see below).

**Status: fully built and live-verified end-to-end**, including real S3
photo/logo/cover uploads, against the real **Stores-and-Stock microservice**
(`localhost:8092`, `KONECTA-STORES-AND-STOCK-SERVICE`), using a real
MERCHANT session (`dercio.anselmo@zohomail.com`). Also — separately, same
session — **the Admin User Management feature (previous feature slice) got
its first-ever live test with real ADMIN credentials**
(`dercio.anselmo@yahoo.com`) and every action (list, create, role change,
enable/disable, edit, approve) confirmed working correctly. Went from
spec-only → real implementation in one sitting once the backend team
delivered `API_REFERENCE_MERCHANT_DASHBOARD.md` rewritten with the live
contract (that file is now the authoritative reference — the frontend-
authored original spec is gone, replaced in place — and it was rewritten a
second time mid-feature when photo upload landed, see below).

### What's built vs. explicitly not (backend-owned split)

Confirmed live, built against real endpoints:
- Shops: list (with per-shop `lowStockCount`/`isOpen`/`logoUrl` cards),
  create (auto-activates once name+nuit+address+city+neighborhood are all
  present, else `DRAFT`), get/edit fiscal profile, manual open/pause
  override, opening hours (`GET`/`PUT`, replace-all-week), **logo/cover
  upload** (presigned S3, see below).
- Products: CRUD, category→subcategory cascading picker, stock adjust
  (absolute set), archive/restore via `active` toggle, low-stock filter,
  **photo upload/delete/set-primary** (presigned S3).
- Dashboard summary (product counts + low-stock count only — no sales/
  orders numbers, see below).
- Public category/subcategory meta endpoints.

**Explicitly NOT built — the backend doesn't own these** (per the spec's
"What's not here" section): Orders (merchant-facing list/detail/accept/
reject/etc.), Sales summary, Receipts. Don't build UI for these until the
user says a backend for them exists — same discipline as the rest of this
app: build against confirmed live endpoints, not guesses.

### What changed from the original (frontend-authored) spec — don't be surprised by these

- **`category` is no longer a free string.** Real two-level taxonomy now:
  `Shop.categories` (many, top-level, via `categoryIds` on create/update)
  and `Product.subcategoryId` (one, product-level, scoped to a category).
  `GET /api/v1/meta/categories` and
  `GET /api/v1/meta/categories/{categoryId}/subcategories` back the
  cascading picker in the product forms.
- **Shop has a real status machine**: `DRAFT | PENDING_REVIEW | ACTIVE |
  SUSPENDED | CLOSED`, plus `activationReady` (true once the fiscal fields
  are all filled). Not in the original spec, which assumed a simpler
  DRAFT/ACTIVE binary. The create/edit forms surface this but don't gate
  on it — a `DRAFT` shop is still usable, just shown with a badge.
- **Opening hours use Portuguese day codes** (`SEGUNDA...DOMINGO`), not
  English `MONDAY...SUNDAY` as originally guessed.
- **Times come back as `HH:mm:ss`** (e.g. `"08:00:00"`), not `HH:mm`.
  `<input type="time">` needs `HH:mm` to render — `HoursForm.tsx` trims to
  5 chars on load (`toInputTime`/`normalizeDays`). Caught this by actually
  testing live against the real service, not from reading the doc — if a
  future time-related field misbehaves, check for this same trailing-
  seconds pattern first.
- **Photo/logo/cover upload arrived mid-feature as a breaking change**:
  first revision of the doc said no upload endpoint existed (frontend used
  plain `imageUrls`/`primaryImageUrl` text fields as an interim). Second
  revision replaced that entirely with a **presigned S3 flow**:
  `Product.photos: {id, url, isPrimary}[]` (the `imageUrls`/
  `primaryImageUrl` fields are gone), plus new `Shop.logoUrl`/`coverUrl`
  upload endpoints. Every photo/logo/cover `url` is a **presigned GET that
  expires** (~1h) — never cache it, always re-fetch the parent resource.
  See "Architecture" below for the upload flow itself.
- **`todaySalesTotal`/`pendingOrdersCount` don't exist** on the shops-list
  cards, and the dashboard summary doesn't have sales/orders fields either
  — both need the Orders/Payments service this backend doesn't own.

### Architecture

- **New env var**: `STORES_API_BASE_URL` (server-only, `.env.example` and
  `.env.local` updated) — this is a *separate* microservice from Auth, not
  an extension of it.
- **`lib/stores/`**: `types.ts`, `storesApi.ts` (server-only fetch client,
  mirrors `lib/auth/authApi.ts`), `client.ts` (client-side fetch wrappers),
  `validation.ts` (zod schemas), `dayLabels.ts` (PT weekday labels).
- **Shared BFF auth helper extracted**: `requireAccessToken()` moved from
  `lib/admin/adminAuth.ts` to `lib/auth/bffAuth.ts` (generic — just
  resolves/refreshes a Bearer token, role enforcement is left to whichever
  backend service is called). `lib/admin/adminAuth.ts` now just re-exports
  it, so existing admin route imports didn't need to change.
- **`Badge` moved** from `components/admin/Badge.tsx` to
  `components/ui/Badge.tsx` — it was already generic, now genuinely shared
  between the Admin and Merchant features. Updated all three import sites.
- **BFF routes** under `app/api/merchant/shops/**` and
  `app/api/meta/categories/**`, one Route Handler per endpoint, same
  pattern as the Admin/Auth features — proxy to `storesApiFetch`, never
  call the Stores service from the client.
- **Route structure**: `app/merchant/layout.tsx` → `MerchantShell` (auth +
  role guard, mirrors `AdminShell`) wraps everything. `/merchant` (shop
  picker, Server Component fetching directly via `storesApiFetch` — no
  BFF round-trip needed for a page that already runs server-side).
  `/merchant/shops/new` (create). Everything else is shop-scoped under
  `/merchant/shops/[shopId]/...`: `page.tsx` (dashboard), `settings/`,
  `hours/`, `products/` (list, `new/`, `[productId]/`). Each shop-scoped
  page shares `components/merchant/ShopNav.tsx` for the Painel/Produtos/
  Horário/Definições sub-nav — this IA segment (`[shopId]`) isn't in
  `AGENTS.md` §7 yet, which still shows the old flat single-shop routes;
  worth reconciling that doc once someone reads this.
- Most shop-scoped pages are a thin Server Component `page.tsx` (just
  awaits `params`) + a client component doing the actual fetch/form work
  — same split used by `complete-profile` and admin's user-detail page.
- **Photo/logo/cover upload — presigned two-step, NOT proxied through our
  BFF for the actual bytes**: `lib/stores/upload.ts`'s `uploadAndConfirm()`
  (1) calls our BFF's `.../presign` route (server-side, adds the Bearer
  token) to get `{uploadUrl, key}`, (2) does a **plain client-side `fetch`
  PUT straight to `uploadUrl`** (S3) — no Authorization header, the
  signature in the URL is the auth, and this deliberately bypasses our own
  server entirely, matching the doc's explicit instruction not to route
  the file through the API — (3) calls our BFF's confirm route (POST,
  `{key}`) which verifies the object landed and returns the updated
  resource. Used from `ProductDetailView.tsx` (photos) and
  `ShopSettingsForm.tsx` (logo/cover) via a hidden `<input type="file">` +
  a visible button triggering `.click()` on it. Photo upload is **not
  available on the create-product form** — a product needs an id first, so
  photos are added after creation, on the detail page.
- Images from S3 are rendered with `next/image`'s `unoptimized` prop (the
  URLs are presigned, per-request, and query-string-heavy — not something
  Next's built-in image optimizer/domain-allowlist should touch).
- **Lint gotcha hit again** (third time now, same family as the theme
  provider and admin-users-list fixes): an effect with an early-return
  synchronous `setState` (`if (!categoryId) { setSubcategories([]); return; }`)
  trips `react-hooks/set-state-in-effect` even though the non-early-return
  branch is async. Fixed by folding both branches into one promise chain
  (`const load = categoryId ? listSubcategories(categoryId) :
  Promise.resolve([]); load.then(setSubcategories)...`) instead of an
  early-return. **Recognize this pattern going forward**: any effect whose
  body can synchronously call `setState` on some branch (not just at the
  very top) needs the same treatment — either the microtask-defer trick
  used for `load()` calls, or folding into one promise chain like this.
- **Zod `.coerce.number()` breaks with react-hook-form's generic** — the
  resolver's inferred input type becomes `unknown`, not `number`,
  producing a type error on `useForm<T>`. Fixed by using plain `z.number()`
  in the schema and `{ valueAsNumber: true }` on the corresponding
  `register()` calls instead of coercion. Apply this pattern for any future
  numeric form field — don't reach for `.coerce` with RHF.

### Verified live (real MERCHANT session, `dercio.anselmo@zohomail.com`)

Full round trip: list shops (empty) → create shop → check
`activationReady`/auto-`ACTIVE` → shop dashboard page renders → set opening
hours (confirmed the `HH:mm:ss` quirk here) → fetch categories →
fetch subcategories for a category → create a product with a subcategory
(denormalized `categoryName`/`subcategoryName` came back correctly) →
adjust stock below threshold → confirmed `lowStock` flips + the `lowStock`
list filter picks it up → deactivate/reactivate product → edit shop
settings (`PATCH`) → manual pause (`PATCH .../status`) → dashboard summary
reflects `productCount`/`activeProductCount`/`lowStockCount` correctly →
shops-list card reflects the updated `lowStockCount`. Also confirmed
role/auth gating: unauthenticated → `/login?next=%2Fmerchant`.

One observed anomaly, **not reproducible on retry**: a single `PATCH
/merchant/shops/{shopId}` call returned a raw `500 {"message":""}`
(non-standard envelope) on the first attempt with a specific field
combination; the identical request succeeded immediately after and every
time since. Likely a transient backend hiccup (JIT warm-up, connection
pool, race on a fresh dev instance) — logged here in case it recurs, not
something the frontend can or should work around. The doc's later revision
now explicitly says unexpected server errors come back as a proper
`{code: "INTERNAL_ERROR", ...}` envelope going forward — if a raw
`{"message":""}` shows up again, that's worth re-flagging since it'd mean
something bypassed the backend's own error handling.

**Photo/logo/cover upload — verified against the real S3 bucket**
(`konecta-media-564956047797`), not a mock: presigned a product photo →
`PUT` real bytes straight to S3 (bypassing our server entirely, as
designed) → confirmed with our BFF → response correctly showed
`isPrimary: true` on the first photo for a product. Same flow verified for
shop logo upload — confirmed with `logoUrl` populated on both the shop
detail and the shops-list card afterward.

**Admin User Management — first live test ever, all passed**: logged in as
real ADMIN (`dercio.anselmo@yahoo.com`). Listed real users (including every
test account from earlier sessions). Registered a fresh user with
`requestedRole: COURIER`, approved it via the real `POST .../approve` —
response correctly showed `role: COURIER`, `status: ACTIVE`,
`requestedRole: null`. Used `POST /admin/users` to create a staff account
directly (`role: MERCHANT`, `status: ACTIVE` immediately, no approval
step — matches the doc). Changed that user's role, disabled the account,
and edited their profile — all via the real BFF routes, all correct.

### Standing conventions to keep using

- Portuguese (Mozambique) copy throughout, MT currency, IVA-inclusive
  shelf prices.
- One context file per feature, reset when the user says it's time for the
  next one.
