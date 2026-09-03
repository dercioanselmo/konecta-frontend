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
