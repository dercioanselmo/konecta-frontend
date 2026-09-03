# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current feature: My Profile + mustChangePassword gate + Merchant Staff CRUD

**Status: built by AmazonQ (a different agent) in a session I wasn't part
of, then I fixed two reported bugs on top of it** — typecheck/lint/build
clean.

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
