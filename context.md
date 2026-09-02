# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current feature: Admin dashboard — User management

**Scope (per user, narrower than `AGENTS.md`'s full Admin section):** Admin
dashboard, User management only — no Orders ops, no Transactions/commissions
yet. Within user management: list/search/filter users, create a user
directly (onboard Merchant/Courier/Admin), view/edit any user's profile,
change role, activate/deactivate, and approve/reject a self-registered
user's role-upgrade request.

**Status:** Backend now implements the full contract this feature needs
(`API_REFERENCE-security-service.md`, superseding the old `API_REFERENCE.md`
— that file is gone, update any stale references you find). Typecheck/lint/
build clean. Live-verified: registering with a `requestedRole` correctly
lands the account as `CUSTOMER` + `status: PENDING`, and the `/home` pending
banner renders correctly for that account. **Still not verified**: the
admin-only actions (list/create/edit/role/enable/approve/reject) — no ADMIN
account exists to test with (see "Needs your attention").

### How this feature evolved: built ahead of the backend, then reconciled

Originally the backend had none of this — no create-user endpoint, no
"pending" concept at all. I flagged the gap, the user said to build the
frontend against an assumed contract and document exactly what the backend
needed to add. That doc was `API_REFERENCE_ADMIN_USER_MANAGEMENT.md`. The
backend team then implemented (almost) exactly that proposal — the user
pointed me at the real, updated `API_REFERENCE-security-service.md` and I
reconciled the frontend against it. **The gap doc has since been deleted**
(its purpose was superseded) — don't recreate it or reference it, the real
API doc is now the only source of truth.

**Where the real contract differs from what was proposed** (worth knowing
if you're debugging something that doesn't match your intuition):

- `status` is `PENDING | ACTIVE | REJECTED` — **not** `PENDING | ACTIVE |
  DISABLED` as originally guessed. `enabled` (the pre-existing
  suspend/restore boolean) stays completely separate — a rejected request
  doesn't disable the account, and disabling an account doesn't touch
  `status`.
- `status`/`requestedRole` only ever get populated via the **self-service**
  path: `POST /auth/register` with an optional `requestedRole` field
  (`MERCHANT`/`COURIER`/`MOBILITY_PARTNER`, not `ADMIN`). A user created
  directly by an admin via `POST /admin/users` gets their role assigned
  immediately — no pending/approval step for that path at all.
- Admin-created accounts have **no password** — the backend emails a
  one-time "set up your account" link, completed via the new
  `POST /auth/set-password`. This wasn't part of the original ask but is
  required for admin-created users to ever be able to log in, so I added
  `/set-password` (page + BFF route) to close that loop.
- `status`/`requestedRole` are core fields on `UserProfileResponse` now —
  every user has them, not just ones admins look at. Moved the types from
  `lib/admin/types.ts` onto `UserProfile` itself (`lib/auth/types.ts`);
  `lib/admin/types.ts`'s `AdminUser` is now just a type alias for
  `UserProfile`, kept for readability at admin call sites.

### What got added beyond the original admin-only ask

To make the `PENDING`/approve/reject workflow actually reachable (nothing
produces a `PENDING` user except self-registration with `requestedRole`),
also touched the public register flow:

- `/register` (`app/register/page.tsx`) — added a "Quero registar-me como"
  select (Cliente / Comerciante / Entregador / Parceiro de Mobilidade).
  Non-Cliente choices submit `requestedRole`.
- `components/RoleLanding.tsx` (the `/home` stub) — shows a small pending
  banner naming the requested role when `status === "PENDING"`, so the loop
  from "customer applies to become a Merchant" → "admin sees it in
  `/admin/users?status=PENDING`" → "customer sees outcome" is visible
  end-to-end, not just backend-plumbed.
- `lib/auth/roleLabels.ts` — `ROLE_LABELS`/`REQUESTABLE_ROLES` moved here
  from `lib/admin/roleLabels.ts` since the public register page now needs
  them too (a public page importing from `lib/admin/*` would've been a
  layering smell). `lib/admin/roleLabels.ts` re-exports `ROLE_LABELS`/
  `REQUESTABLE_ROLES` from there and keeps the admin-only constants
  (`ONBOARDABLE_ROLES`, `ASSIGNABLE_ROLES`, `STATUS_LABELS`).

### Architecture

- **BFF routes**: `app/api/admin/users/route.ts` (GET list + POST create),
  `.../[id]/route.ts` (GET one + PATCH edit), `.../[id]/role/route.ts`,
  `.../[id]/enabled/route.ts`, `.../[id]/approve/route.ts`,
  `.../[id]/reject/route.ts`, plus `app/api/auth/set-password/route.ts`
  (mirrors the `/api/auth/login` pattern: exchange happens server-side,
  cookies get set, client only ever sees a `UserProfile`, never raw
  tokens). All proxy to the Auth service via `lib/auth/authApi.ts`, using a
  shared `requireAccessToken()` helper (`lib/admin/adminAuth.ts`) that just
  needs *a* valid session — role enforcement (403 for non-admins) is left
  to the backend, per its own model.
- **Route handler dynamic params**: this Next version (16.3.4) makes
  `params` a `Promise` in Route Handlers — use the `RouteContext<'/path/[id]'>`
  global typed helper (`ctx: RouteContext<"/api/admin/users/[id]">`, then
  `await ctx.params`), not a hand-written params type. Same pattern as
  `LayoutProps`/`PageProps` used elsewhere in this codebase. **After adding
  a new dynamic route, run `npx next typegen` (or `next build`) before
  `tsc --noEmit`** — the global route-literal types are generated, not
  hand-authored, and a bare `tsc` run against stale `.next/types` reports
  false positives on brand-new routes.
- **Auth/role gate**: `app/admin/layout.tsx` wraps every `/admin/*` page in
  `components/admin/AdminShell.tsx` (a Server Component) — one guard
  (unauthenticated → `/login`, incomplete profile → `/complete-profile`,
  wrong role → their own role home) instead of repeating `RoleLanding`-style
  checks per page. `/admin` itself is a real dashboard page now
  (`app/admin/page.tsx`), showing a pending-count badge fetched server-side.
- **Pages**: `/admin` (overview), `/admin/users` (list/search/filter/
  paginate + inline quick actions, client component), `/admin/users/new`
  (create form), `/admin/users/[id]` (detail/edit + role change + enable-
  disable + approve/reject — split into a thin Server Component `page.tsx`
  that awaits `params` and a client `UserDetailView.tsx`, same pattern as
  `complete-profile`), `/set-password` (public, same Suspense-wrapped
  client-form-reading-searchParams pattern as `/verify-otp`).
- **`lib/admin/`**: `types.ts`, `roleLabels.ts` (admin-only labels + re-export
  of the shared ones), `validation.ts` (zod schemas), `client.ts`
  (client-side fetch wrappers, mirrors `lib/auth/client.ts`'s pattern),
  `adminAuth.ts` (server-only BFF auth helper).
- **`components/admin/`**: `AdminShell.tsx`, `Badge.tsx` (small status/role
  pill, reused across list and detail views — also shows a "Desativada"
  badge separately from the status badge, since `enabled` and `status` are
  independent per the real contract).
- **Lint gotcha, hit twice in this feature**: `useEffect(() => { load(); },
  [load])` where `load` is an async `useCallback` that calls `setState`
  before its first `await` trips `react-hooks/set-state-in-effect` (same
  family of issue as the theme provider fix from the auth feature) —
  because those setState calls run synchronously up to the first `await`,
  they count as "within the effect." Fixed in both `app/admin/users/page.tsx`
  and `UserDetailView.tsx` by deferring the call: `queueMicrotask(() =>
  load())` inside the effect. Apply the same trick if this pattern shows up
  again.

### Verified working (live)

- Unauthenticated → `/admin/users` redirects to `/login?next=%2Fadmin%2Fusers`
  (`proxy.ts` runs on nearly every page — see the auth feature's history in
  git if you need that reasoning, this file was reset since then).
- A logged-in CUSTOMER hitting `/admin/users` gets redirected to `/home`
  (`AdminShell`'s role check); their token hitting the BFF directly
  (`GET /api/admin/users`) gets the backend's real `403` passed through
  without crashing.
- `POST /auth/register` with `requestedRole: "MERCHANT"` → `201`, response
  has `role: "CUSTOMER"`, `status: "PENDING"`, `requestedRole: "MERCHANT"`,
  exactly as documented.
- Logging into that pending account and loading `/home` renders the
  "pedido... pendente de aprovação" banner naming "Comerciante" correctly.
- Full build (`npm run build`) succeeds with all routes listed, including
  the new `/set-password` and `/api/auth/set-password`.

### Not verified — needs an ADMIN account to test

Still could not obtain admin credentials in this session (self-registration
always creates `CUSTOMER`; promoting to `ADMIN` requires an *existing*
admin token — a chicken-and-egg this environment has no way around). None of
the actual admin actions were exercised against a real admin session:
list/search/filter/paginate, create user (+ whether its invite email
actually links to what `/set-password` expects — that query-param shape is
still a frontend assumption, see the doc comment in
`app/set-password/page.tsx`), edit-any-user, role change, enable/disable,
approve, reject. Also no screenshots/visual QA — curl/log-based checks only.

### Standing conventions to keep using

- Portuguese (Mozambique) copy throughout.
- Reuse `components/ui/{Button,Input,Select}` and `components/admin/Badge.tsx`.
- BFF pattern for everything backend-facing; never call the Auth service
  directly from the client.
- One context file per feature, reset when the user says it's time for the
  next one — see instruction that started this file.
