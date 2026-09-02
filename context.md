# KONECTA Frontend — Feature Context

> One context file tracks the **current** feature in progress. Update it
> before starting new implementation work within this feature (new
> decisions, new files, scope changes). When the user says it's time for a
> new feature, this file is replaced/reset for that feature — don't let it
> grow into a changelog of every past feature.

---

## Current feature: Auth (Customer + Merchant/Courier/Admin login)

**Scope (per `AGENTS.md` Phase 1, restricted subset):**
- Customer: Splash/onboarding (minimal), Register, Login, OTP verify, Google login.
- Merchant/Courier/Admin: same Auth login (role comes from the JWT, not chosen at login) — surfaced only as a small footer link on the splash page. No dashboards yet.

**Status:** Implemented and smoke-tested end-to-end against the live Auth service (`localhost:8091`). Favicon updated to brand logo. Not yet committed to git (user has not asked for a commit).

### Backend
- KONECTA Auth microservice, contract in `API_REFERENCE.md`. Base URL via server-only `AUTH_API_BASE_URL` env var — never exposed to the browser.
- Self-registration is always role `CUSTOMER`. Other roles (`MERCHANT`, `COURIER`, `ADMIN`, `MOBILITY_PARTNER`) are assigned by an admin backend-side — there is no separate "merchant registration" or "merchant login" flow, it's the same `/login` page.

### Architecture decisions
- **BFF pattern**: every Auth call goes through a Next.js Route Handler under `app/api/auth/*` and `app/api/meta/neighborhoods`, which calls the Auth service server-side (`lib/auth/authApi.ts`, marked `server-only`). The browser never sees `AUTH_API_BASE_URL` or raw tokens.
- **Cookies**: access + refresh tokens stored as `konecta_access_token` / `konecta_refresh_token`, httpOnly, `secure` in prod, `sameSite=lax`, path `/`.
- **JWT role routing**: `lib/auth/jwt.ts` decodes the JWT payload (no signature verification — that's the backend's job; this is only used for UI routing, since the token itself was written by our own server into an httpOnly cookie). `lib/auth/roles.ts` maps role → landing path (`CUSTOMER → /home`, `MERCHANT → /merchant`, `COURIER → /courier`, `ADMIN → /admin`, `MOBILITY_PARTNER → /` since it has no dashboard yet — mapping it to `/admin` caused an infinite redirect loop, fixed).
- **Route protection & silent refresh — all live in `proxy.ts`, not in Server Components**: `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts` — this repo's Next version deprecated the old convention; docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`, read that before assuming `middleware.ts` conventions from training data) now runs on **every page** (matcher excludes `/api/*`, `_next/*`, and anything with a file extension), not just the four protected shells. On each request it checks the access token; if expired/missing but a refresh token cookie exists, it calls `POST /api/v1/auth/refresh` itself, writes the new cookies onto the *response* (`response.cookies.set`), and mirrors them onto the *request* (`request.cookies.set`, passed via `NextResponse.next({ request })`) so a downstream Server Component's `cookies()` call sees the fresh token within the same request. If refresh fails, it clears both cookies on the response. Only after this does it apply role-based redirects for `/home`, `/merchant`, `/courier`, `/admin`.
  - **Why this had to move out of `lib/auth/session.ts`/Server Components**: `cookies().set()` throws "Cookies can only be modified in a Server Action or Route Handler" when called during a Server Component render. The original code called `refreshSession()` (which rotates the single-use refresh token against the backend, then tries to save the new pair) from `getCurrentUser()`/`getValidAccessToken()`, used directly in Server Components (`app/page.tsx`, `components/RoleLanding.tsx`, `app/complete-profile/page.tsx`). The backend call succeeded (burning the old refresh token — Auth rotates + revokes it immediately per `API_REFERENCE.md`), but persisting the new pair then threw, and that throw was uncaught on the second cookie write inside the catch block — **500 crash**, and the browser was left with a now-revoked refresh token, so every subsequent load crashed again until the user manually logged back in. Reported by the user as: worked in Chrome (session still fresh, refresh path never hit), crashed in Firefox after the access token's 15-minute expiry.
  - **Fix**: `lib/auth/session.ts` now has two tiers — `getValidAccessToken()`/`getCurrentUser()` are read-only (never call refresh, safe from any Server Component) — and `getValidAccessTokenWithRefresh()` (refreshes on expiry) for use only inside Route Handlers/Server Actions, where writing cookies is legal (used by `app/api/auth/me/route.ts` and `app/api/auth/profile/route.ts`). `proxy.ts` is the one place doing the actual refresh-and-persist for GET page navigations, using `NextRequest`/`NextResponse` cookie APIs (not `next/headers` `cookies()`, which isn't usable in Proxy).
  - **Verified live**: reproduced the exact crash by forging an expired-but-well-formed access token cookie alongside a real refresh token and hitting `/` — confirmed no crash, a rotated Set-Cookie pair, and correct downstream behavior (redirected to `/home` because the Server Component saw the mirrored fresh cookie). Also verified the refresh-failure path (garbage refresh token → cookies cleared, no crash, protected routes redirect to `/login`) and the regression case (already-valid session passes through untouched, no unnecessary refresh call).
- **Google OAuth**: browser hits `/api/auth/google/start` (redirects to the Auth service's `/oauth2/authorization/google`, keeping the base URL server-side) → Auth service redirects back to `/auth/callback?accessToken=...&refreshToken=...` (`app/auth/callback/route.ts`) → that route handler reads the query string server-side, sets httpOnly cookies, fetches `/users/me`, redirects to the role's landing path (or `/complete-profile`, see below). Tokens are never exposed to client JS. **Verified live**: the callback path was originally guessed as `/api/auth/google/callback`, but a real Google login showed the Auth service's `OAUTH_FRONTEND_REDIRECT_URI` is actually configured to `/auth/callback` — moved the route handler to match rather than asking to reconfigure the backend. If Google login 404s again, check this path first.
- **Mandatory profile completion after Google OAuth**: the Auth service auto-creates/links an account on first Google login with only email + name — `phone`, `address`, `neighborhood` come back `null`. It must NOT be possible to reach the app with a half-formed account, so:
  - `lib/auth/profile.ts` — `isProfileComplete(user)` checks `firstName`, `lastName`, `phone`, `address`, `neighborhood` are all non-blank (birthDate is excluded — `PATCH /api/v1/users/me` doesn't accept it, per `API_REFERENCE.md`, so it's not something the frontend can ever fix post-hoc; that's a backend contract limitation, not a frontend choice).
  - Every path that can land a user in the app checks this and redirects incomplete profiles to `/complete-profile` instead: `app/auth/callback/route.ts` (Google), `app/login/page.tsx` (email/password), `app/page.tsx` (splash, for already-authenticated visitors), and `components/RoleLanding.tsx` (defends `/home`, `/merchant`, `/courier`, `/admin` directly, e.g. against back-button navigation).
  - `/complete-profile` (`app/complete-profile/page.tsx` + `CompleteProfileForm.tsx`) is a server-gated page (redirects to `/login` if unauthenticated, redirects to the role home if already complete) with a form for the missing fields, submitting via the new `PATCH /api/auth/profile` route (`app/api/auth/profile/route.ts`) → `PATCH /api/v1/users/me`.
  - Email/password registration (`/register`) already collects every required field up front, so this gate is a no-op for that path — it only actually fires for Google-created accounts.
- **Gmail addresses auto-fall-back to Google login**: on `/login`, if password login fails with `INVALID_CREDENTIALS` and the typed email is `@gmail.com`/`@googlemail.com` (`isGmailAddress` in `lib/auth/client.ts`), the form redirects the browser to `/api/auth/google/start` instead of showing "wrong password" — a Gmail account that fails password login is far more likely to be a Google-registered account with no local password than a genuine typo. Uses `window.location.assign` (a full browser navigation, not `router.push`) because the target is a Route Handler that itself 307s onward to Google's consent screen — a client-side transition can't follow that. This trips a `@next/next/no-location-assign-relative-destination` **warning** (not an error — build/lint still pass) since the linter can't see the eventual external redirect; that's expected and fine to leave as a warning.
- **Register → OTP → Login**: kept as three separate pages/requests (not a client-held-password wizard), matching the API doc's documented flow exactly. After OTP verify, user is redirected to `/login?verified=1&email=...` to log in with the password they just set.
- **Theme**: dark-mode default (brand rule), toggle to light, implemented with `useSyncExternalStore` in `lib/theme/ThemeProvider.tsx` — deliberately not `useState` + `useEffect`, which caused either an eslint `set-state-in-effect` violation or a hydration mismatch (client's `localStorage` read disagreeing with the server's always-"dark" render). An inline script in `app/layout.tsx` (`themeInitScript`) applies the class before hydration to avoid a flash.
- **Brand assets**: `public/Logo-dark-mode.png` (self-contained dark badge, used in dark mode) vs `public/logo-normal.png` (transparent, navy shape, used in light mode). Favicon uses the dedicated `public/favicon_transparent_64x64.png` (small transparent K mark), set via `metadata.icons` in `app/layout.tsx`; the default `app/favicon.ico` was deleted so it doesn't win over the metadata-driven icon in some browsers. Colors/fonts token sheet was read from `public/UI-Model.png`.

### Key files
- `lib/auth/` — `types.ts`, `authApi.ts` (server-only fetch), `session.ts` (cookies), `jwt.ts` (decode), `roles.ts` (role→path map), `client.ts` (client-side fetch wrappers), `validation.ts` (zod schemas), `routeHelpers.ts` (error→NextResponse).
- `app/api/auth/*`, `app/api/meta/neighborhoods` — BFF route handlers.
- `proxy.ts` — runs on every page: silent token refresh + cookie persistence, then role/session gate for `/home`, `/merchant`, `/courier`, `/admin`.
- `app/page.tsx` (splash), `app/register`, `app/verify-otp`, `app/login` — public auth pages.
- `app/home`, `app/merchant`, `app/courier`, `app/admin` — minimal post-login stub landings (`components/RoleLanding.tsx`) — intentionally not full dashboards, out of scope for this feature.
- `app/complete-profile` — mandatory gate for Google-created accounts missing required fields (see profile-completion decision above).
- `components/ui/` — `Button`, `Input`, `Select` primitives; reuse these for future forms rather than inventing new ones.
- `.env.example` — `NEXT_PUBLIC_APP_URL`, `AUTH_API_BASE_URL`, note on `OAUTH_FRONTEND_REDIRECT_URI`.

### Verified working (live, against real Auth service)
- Register → 201; duplicate email → 409 `EMAIL_ALREADY_REGISTERED`.
- Invalid login → 401 `INVALID_CREDENTIALS`.
- Valid login → httpOnly cookies set, `/api/auth/me` returns profile.
- `/home` reachable with valid customer cookie; `/merchant` correctly redirects a CUSTOMER back to `/home`.
- Logout clears both cookies; subsequent `/home` request redirects to `/login?next=%2Fhome`.
- Google login round-trip end-to-end (user-tested): `/login` → Google → `/auth/callback` → cookies set → landed on `/home`.
- `/complete-profile`: unauthenticated request → redirects to `/login`; authenticated request from a user whose profile is already complete → redirects to `/home` (i.e. the gate is a no-op once a profile is filled in).
- `PATCH /api/auth/profile` → 200, correctly forwards to `PATCH /api/v1/users/me` with the Bearer token and returns the updated profile.
- Silent-refresh crash fix (see above): forged expired-access + valid-refresh cookie on `/` → no crash, cookies rotated, correct redirect. Forged expired-access + garbage-refresh → no crash, cookies cleared, protected route redirects to `/login`. Valid session → passes through with no unnecessary refresh call.

### Not verified (needs attention if picked up again)
- The actual "Google login → lands on `/complete-profile` → fill form → lands on `/home`" round trip with a *real* incomplete Google-created account — couldn't force that state through the live backend in this session (register always requires full fields; couldn't get a fresh, never-logged-in-before Google identity to test with). The redirect logic and the PATCH endpoint were verified individually (see above); the only untested link is the Google-callback → `/complete-profile` redirect itself. Worth a real click-through next time you're testing Google login.
- OTP verify screen against a real emailed code.
- Visual/UX pass in an actual browser (only curl/log-based smoke tests were run — no screenshots taken).

### Standing conventions to keep using
- Portuguese (Mozambique) copy, MT currency (not yet relevant — no money screens in this feature).
- One shared API client pattern — do not scatter raw `fetch` calls with duplicated headers; extend `lib/auth/client.ts` or add a sibling module per future service.
- Server-only secrets stay in files importing `"server-only"`.
