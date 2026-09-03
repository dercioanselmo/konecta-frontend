# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current feature: My Profile + mustChangePassword gate + Merchant Staff CRUD

**Status: fully built, typecheck clean, lint clean, production build clean.**

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
