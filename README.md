# KONECTA — Frontend

Next.js (App Router) web client for **KONECTA**, a multi-merchant local
commerce, payments, delivery and mobility platform for Maputo, Mozambique.
Mobile-first. Roles: Customer, Merchant, Courier, Admin (Mobility Partner
reserved for later).

Full product/engineering ground rules live in [`AGENTS.md`](./AGENTS.md) —
read that first if you're implementing something new. This file is a
snapshot of **what's actually built so far**.

---

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript, Turbopack |
| Styling | Tailwind CSS v4, brand tokens in `app/globals.css` |
| Forms/validation | React Hook Form + Zod |
| Auth | KONECTA Auth microservice (Spring Boot, separate repo) — JWT access + refresh |
| HTTP | One shared server-only client (`lib/auth/authApi.ts`) behind Next.js Route Handlers (BFF pattern) — no raw `fetch` scattered around, no tokens ever reach the browser |
| Fonts | Poppins (`next/font/google`) |

---

## Getting started

```bash
cp .env.example .env.local   # set AUTH_API_BASE_URL to your local Auth service
npm install
npm run dev                  # http://localhost:3000
```

Checks before shipping anything:

```bash
npx tsc --noEmit   # after adding a new dynamic route, run `npx next typegen` first (see below)
npx eslint .
npm run build
```

---

## Architecture

### BFF pattern — nothing talks to the Auth service from the browser

Every call to the Auth microservice goes through a Next.js Route Handler
under `app/api/**`, which calls the backend server-side via
`lib/auth/authApi.ts` (marked `server-only`). `AUTH_API_BASE_URL` and raw
JWTs never reach client JavaScript.

### Sessions: httpOnly cookies + silent refresh in `proxy.ts`

- Access + refresh tokens live in `konecta_access_token` /
  `konecta_refresh_token`, httpOnly, `secure` in prod, `sameSite=lax`.
- **`proxy.ts`** (Next 16 renamed `middleware.ts` → `proxy.ts`) runs on
  nearly every page request. It's the *only* place a GET page navigation
  can legally refresh and persist cookies — `cookies()` during a Server
  Component render is read-only and throws if you try to write to it. If
  the access token is expired but the refresh token is valid, `proxy.ts`
  calls `POST /auth/refresh` itself, writes the new cookies onto the
  response, and mirrors them onto the request so the page that renders next
  sees the fresh token immediately.
- `lib/auth/session.ts` has two tiers: `getCurrentUser()` /
  `getValidAccessToken()` are **read-only** (safe from any Server
  Component); `getValidAccessTokenWithRefresh()` actively refreshes and is
  only for Route Handlers/Server Actions, where writing cookies is legal.
  Getting this split wrong crashed the splash page under Firefox once a
  session's access token expired — see git history / old context notes if
  you need the postmortem.

### Role-based routing & guards

- `lib/auth/jwt.ts` decodes the JWT payload (no signature check — that's
  the backend's job; this is UI routing only, on a token our own server
  wrote into an httpOnly cookie).
- `lib/auth/roles.ts` maps role → landing path: `CUSTOMER → /home`,
  `MERCHANT → /merchant`, `COURIER → /courier`, `ADMIN → /admin`,
  `MOBILITY_PARTNER → /` (no dashboard yet).
- `proxy.ts` only redirects unauthenticated users to `/login` — it does
  **not** decide role-based redirects. That's deliberate: the JWT's role
  claim is fixed at token-issue time and goes stale the instant a user's
  role changes server-side (e.g. an admin approves a role-upgrade request)
  without a fresh login, while the page guards below always check the
  *live* role. Two disagreeing sources of truth caused an infinite redirect
  loop for a just-approved user — see `context.md`/git history for the
  postmortem. Role-based routing now has exactly one authority.
- `components/RoleLanding.tsx` — shared guard component behind the
  `/home`, `/merchant`, `/courier` stub pages (see below); redirects to the
  correct role home using a live `GET /users/me` call.
- `components/admin/AdminShell.tsx` — same idea, but as an `app/admin/layout.tsx`
  wrapping every admin page in one guard instead of repeating it per page.

### Mandatory profile completion (Google OAuth gap)

The Auth service auto-creates/links an account on first Google login with
only email + name — `phone`/`address`/`neighborhood` come back empty. It
must be impossible to reach the app with a half-formed account, so every
entry point (`app/auth/callback/route.ts`, `app/login/page.tsx`,
`app/page.tsx`, `components/RoleLanding.tsx`, `components/admin/AdminShell.tsx`)
checks `lib/auth/profile.ts`'s `isProfileComplete()` and redirects to
**`/complete-profile`** if any required field is missing. Email/password
registration already collects everything up front, so this is a no-op for
that path.

### Theming

Dark mode by default (brand rule), light-mode toggle available.
`lib/theme/ThemeProvider.tsx` uses `useSyncExternalStore` (not
`useState`+`useEffect`, which either fails an eslint rule or causes a
hydration mismatch reading `localStorage`). An inline script in
`app/layout.tsx` applies the class before hydration to avoid a flash.

---

## What's built

### Public / Customer auth

| Route | Purpose |
|---|---|
| `/` | Splash. Redirects already-authenticated users to their role home (or `/complete-profile`). Footer link to `/login` for staff (same login, role comes from the JWT). |
| `/register` | Customer self-registration (Zod-validated, bairro dropdown from `/meta/neighborhoods`). Includes an optional "Quero registar-me como" role select — picking Comerciante/Entregador/Parceiro de Mobilidade submits a `requestedRole`, landing the account as `CUSTOMER` + `status: PENDING` until an admin approves it (see Admin section below). |
| `/verify-otp` | 6-digit OTP confirm + resend, then redirects to `/login`. |
| `/login` | Email/password + "Continuar com Google". A Gmail address that fails password login auto-redirects to Google login (`lib/auth/client.ts`'s `isGmailAddress`) — a Gmail account failing on password is almost always "registered via Google," not a typo. |
| `/auth/callback` | Google OAuth landing route (confirmed live path — **not** `/api/auth/google/callback`, see `.env.example`). Sets cookies server-side, never exposes tokens to client JS. |
| `/complete-profile` | Gate for accounts missing required fields (see above). |
| `/set-password` | Landing page for an admin-created account's invite email (`?email=...&code=...`). Sets the user's password via `POST /auth/set-password` and logs them straight in. **The exact query-param shape is a frontend assumption** — confirm it matches whatever URL the backend's invite email actually sends (see `app/set-password/page.tsx`'s doc comment). |

### Merchant / Courier / Admin — shared login

Same `/login` page for every role; login redirects to the right role home,
and each role's page guard (`RoleLanding`/`AdminShell`/`MerchantShell`)
re-confirms that live on every load. Courier (`/courier`) is still a
**stub landing page only** (`RoleLanding.tsx`) — "Bem-vindo(a)" + logout,
no real dashboard yet. Merchant and Admin are built out (see below).

### Merchant dashboard — shops, products & stock

Built against the real **Stores-and-Stock microservice**
(`STORES_API_BASE_URL`, separate from Auth) — see
[`API_REFERENCE_MERCHANT_DASHBOARD.md`](./API_REFERENCE_MERCHANT_DASHBOARD.md)
for the live contract. **A merchant can own multiple shops**; almost
everything is scoped under `/merchant/shops/[shopId]/...`.

| Route | Purpose |
|---|---|
| `/merchant` | Shop picker — cards per shop (open/closed, low-stock count), link to create a new one. |
| `/merchant/shops/new` | Create a shop (fiscal fields, categories, bairro). Auto-activates once name/NUIT/address/city/neighborhood are all filled; otherwise stays `DRAFT`. |
| `/merchant/shops/[shopId]` | Per-shop dashboard: status, open/closed, product counts, low-stock count. |
| `/merchant/shops/[shopId]/settings` | Fiscal/profile edit, categories, pickup/delivery flags, manual open/pause override. |
| `/merchant/shops/[shopId]/hours` | Weekly opening-hours editor (replace-all-week `PUT`). |
| `/merchant/shops/[shopId]/products` | Search/filter (low-stock toggle)/paginate; activate/deactivate inline. |
| `/merchant/shops/[shopId]/products/new`, `.../products/[productId]` | Create/edit a product — category→subcategory cascading picker, stock adjust (absolute set), image URLs (no upload endpoint — see below). |

**Not built — the backend doesn't own these yet**: Orders (merchant-facing
accept/reject/prepare/ready/pickup-QR), Sales summary, Receipts
("Recebimentos por transação"), and product **photo upload** (no
multipart endpoint exists — `imageUrls`/`primaryImageUrl` are plain string
fields the merchant pastes URLs into). Don't build UI for these until told
a backend for them exists.

### Admin dashboard — User management

The only Admin feature built so far (Orders ops, Transactions/commissions
are not started). Fully wired against the real backend contract in
[`API_REFERENCE-security-service.md`](./API_REFERENCE-security-service.md)
— there is no more assumed/mocked API surface here.

| Route | Purpose |
|---|---|
| `/admin` | Overview, shows a pending-approvals count. |
| `/admin/users` | Search/filter (role, status)/paginate the user directory. Inline actions: approve/reject (pending), activate/deactivate, edit link. |
| `/admin/users/new` | Direct onboarding form for Merchant/Courier/Admin/Mobility Partner — bypasses public self-registration. The created account has no password; the invited user completes setup via `/set-password`. |
| `/admin/users/[id]` | View/edit any user's profile, change role, activate/deactivate, approve/reject a pending role request. |

**Two independent status concepts** — don't conflate them:

- **`status`** (`PENDING` / `ACTIVE` / `REJECTED`) — tracks a *role-upgrade
  request* (`requestedRole`, submitted at `/register`). Only meaningful for
  self-registered customers who asked to become a Merchant/Courier/Mobility
  Partner. `approve`/`reject` only apply while `status: PENDING` — a 409
  `USER_NOT_PENDING` otherwise.
- **`enabled`** (boolean) — the existing suspend/restore toggle, orthogonal
  to `status`. Shown as a separate "Desativada" badge in the UI.

A user created directly via `/admin/users/new` gets their `role` assigned
immediately (no approval step) — `status`/`requestedRole` are only ever
populated by the self-service `requestedRole` path at `/register`.

---

## API integration

Every endpoint documented in
[`API_REFERENCE-security-service.md`](./API_REFERENCE-security-service.md)
(the live Auth service contract) is used somewhere in this frontend — none
are unused, and none of the frontend's calls are against assumed/mocked
endpoints anymore. See that file for the authoritative request/response
shapes.

| Endpoint | Frontend call site |
|---|---|
| `POST /auth/register` (incl. optional `requestedRole`) | `app/api/auth/register/route.ts` |
| `POST /auth/verify-otp` | `app/api/auth/otp/verify/route.ts` |
| `POST /auth/set-password` | `app/api/auth/set-password/route.ts` (`/set-password` page) |
| `POST /auth/login` | `app/api/auth/login/route.ts` |
| `POST /auth/refresh` | `lib/auth/session.ts`, `proxy.ts` |
| `POST /auth/logout` | `app/api/auth/logout/route.ts` |
| `POST /auth/otp/request` | `app/api/auth/otp/request/route.ts` |
| `GET /oauth2/authorization/google` | `app/api/auth/google/start/route.ts` |
| `GET /users/me` | `lib/auth/session.ts`, login/callback/`me` routes |
| `PATCH /users/me` | `app/api/auth/profile/route.ts` (complete-profile flow) |
| `GET /admin/users` (incl. `role`/`status` filters) | `app/api/admin/users/route.ts` |
| `POST /admin/users` | `app/api/admin/users/route.ts` |
| `GET /admin/users/{id}` | `app/api/admin/users/[id]/route.ts` |
| `PATCH /admin/users/{id}` | `app/api/admin/users/[id]/route.ts` |
| `PATCH /admin/users/{id}/role` | `app/api/admin/users/[id]/role/route.ts` |
| `PATCH /admin/users/{id}/enabled` | `app/api/admin/users/[id]/enabled/route.ts` |
| `POST /admin/users/{id}/approve` | `app/api/admin/users/[id]/approve/route.ts` |
| `POST /admin/users/{id}/reject` | `app/api/admin/users/[id]/reject/route.ts` |
| `GET /meta/neighborhoods` | `app/api/meta/neighborhoods/route.ts` |

---

## Project structure

```
app/
  page.tsx                    splash
  register/ verify-otp/ login/  public auth pages
  auth/callback/route.ts      Google OAuth landing (BFF)
  complete-profile/           profile-completion gate
  set-password/                admin-invite completion page
  home/ courier/               role stub landings (RoleLanding.tsx)
  admin/                      Admin dashboard (layout.tsx guards everything under it)
    page.tsx                  overview
    users/                    list, users/new (create), users/[id] (detail/edit)
  merchant/                   Merchant dashboard (layout.tsx guards everything under it)
    page.tsx                  shop picker
    shops/new/                create shop
    shops/[shopId]/           dashboard, settings/, hours/, products/ (list, new/, [productId]/)
  api/
    auth/                     BFF: register, login, logout, otp/*, profile, me, google/start, set-password
    admin/users/              BFF: list/create, [id] get/edit, role, enabled, approve, reject
    merchant/shops/           BFF: shops CRUD, status, hours, products CRUD, stock, active, dashboard/summary
    meta/neighborhoods/       BFF: bairro lookup (Auth service)
    meta/categories/          BFF: category/subcategory lookup (Stores service)

lib/
  auth/                       session/cookie handling, JWT decode, role maps, zod schemas,
                               client-side fetch wrappers, server-only Auth API client,
                               shared BFF auth helper (bffAuth.ts)
  admin/                      admin-specific types, PT role/status labels, zod schemas,
                               client-side fetch wrappers
  stores/                     Stores-service types, zod schemas, client-side fetch wrappers,
                               server-only Stores API client, PT weekday labels
  theme/                      dark/light ThemeProvider
  clsx.ts                     tiny className helper

components/
  ui/                         Button, Input, Select, Badge — reuse these, don't reinvent
  admin/                      AdminShell (layout guard)
  merchant/                   MerchantShell (layout guard), ShopNav (shop-scoped sub-nav)
  Logo.tsx ThemeToggle.tsx LogoutButton.tsx RoleLanding.tsx

proxy.ts                      runs on every page: silent token refresh + role gating
```

---

## Environment variables

See [`.env.example`](./.env.example). Key ones:

- `AUTH_API_BASE_URL` — server-only, the Auth microservice base URL. Never
  exposed to the browser.
- `STORES_API_BASE_URL` — server-only, the Stores-and-Stock microservice
  base URL (separate service from Auth, backs the Merchant dashboard).
- `NEXT_PUBLIC_APP_URL` — used to build the Google OAuth callback URL.
- The Auth service's `OAUTH_FRONTEND_REDIRECT_URI` must point at
  `${NEXT_PUBLIC_APP_URL}/auth/callback` (confirmed against a live login —
  not `/api/auth/google/callback`, despite that being the more
  REST-conventional-looking path).

---

## Known gaps / needs attention

- **No ADMIN account exists to test the admin flows live.** Self-registration
  always creates a `CUSTOMER`; promoting to `ADMIN` needs an *existing*
  admin token. Someone needs to seed the first admin on the backend side.
  Everything Admin-specific (list/create/edit/role/enable/approve/reject)
  has been verified for correct request shape and error handling, but not
  actually exercised end-to-end with a real admin session.
- **`/set-password`'s query-param shape is an assumption** — confirm the
  admin-invite email actually links to `?email=...&code=...` and adjust
  `app/set-password/page.tsx` if the real link is shaped differently.
- **OTP verify** has only been checked for request/response wiring, not
  against a real emailed code.
- **No visual/browser QA** on any screen — everything so far has been
  verified via `curl`/server logs against the live backends, plus
  typecheck/lint/build. Worth a real click-through pass.
- Courier is a login-only stub; no dashboard yet.
- Admin dashboard has no Orders ops or Transactions/commissions monitoring
  yet (out of scope for the current feature slice).
- Merchant dashboard has no Orders, Sales summary, Receipts, or product
  photo upload — the Stores-and-Stock service explicitly doesn't own those
  (see `API_REFERENCE_MERCHANT_DASHBOARD.md`'s "What's not here"). Don't
  build UI for them until told a backend exists.
- One `PATCH /merchant/shops/{shopId}` call returned a raw, non-standard
  `500 {"message":""}` once during live testing — not reproducible on
  retry (identical request succeeded immediately after). Likely a
  transient backend hiccup; noted in `context.md` in case it recurs.

---

## Related docs

- [`AGENTS.md`](./AGENTS.md) — product rules, phases, and how to work in this repo.
- [`API_REFERENCE-security-service.md`](./API_REFERENCE-security-service.md) — the live Auth service contract.
- [`API_REFERENCE_MERCHANT_DASHBOARD.md`](./API_REFERENCE_MERCHANT_DASHBOARD.md) — the live Stores-and-Stock service contract (rewritten by the backend team from the original frontend-authored spec once it shipped; Merchant dashboard is built against this).
- `context.md` — working notes for whatever feature is *currently* in progress (reset per feature, not a full history — this README is the durable reference).
