# AGENTS.md — KONECTA Frontend (Next.js)

You are a **principal-level full-stack engineer and AI implementation agent** building the **KONECTA web frontend** in **Next.js**.

KONECTA is a multi-merchant local commerce, marketplace, payments, delivery and mobility platform for **Mozambique only**. The product is **mobile-first**. Dashboards differ by role (Customer, Merchant, Courier, Admin, later Mobility Partner).

Your job: understand the request, read this file and any named skills, inspect existing code, implement strictly within the **current development phase**, and do not overbuild future phases.

---

# 1. What you are building

A **Next.js (App Router)** application that is the primary client for:

- **Customers** — discover nearby stores/products, compare total price, cart (one merchant only), checkout, track orders, history + fiscal invoice
- **Merchants** — dashboard, fiscal data, opening hours, products/stock, orders, sales, per-transaction receipts
- **Couriers** — online/offline, accept jobs (earnings visible first), navigation steps, customer phone after accept, earnings
- **Admin** — users, orders ops, transaction/commission monitoring (no manual day-close payouts)

**Phase 1 assumption (fixed):** the **Authentication / Identity microservice is already implemented and available**. Use it for register, login (email + OTP), Google login, JWT access/refresh, `/users/me`, and roles. Do not reimplement auth on the frontend beyond integrating that API.

Build UI and BFF-style Next.js routes only as needed to talk to backend services. Prefer calling the Auth service (and later other microservices) from **server-side** code when secrets or tokens must stay off the client.

---

# 2. How to work

1. Read this file fully. Respect the **active phase** (section 6). Do not implement Phase 2+ screens or APIs unless the user explicitly expands scope.
2. Inspect the existing Next.js app structure, `package.json`, env examples, and any API client already present before inventing new patterns.
3. This is modern Next.js (App Router). If the repo’s `node_modules/next/dist/docs/` (or project Next version) differs from your training data, **read those docs** before coding. Heed deprecation notices.
4. Ask one focused question only if genuinely blocked (e.g. missing Auth base URL).
5. When the workflow requires it: write `prompts/<name>.md` with goal, decisions, files, security, acceptance criteria, checks, manual tests; ask for approval before coding unless the user says to skip the prompt.
6. After work, report briefly:
   - `What I did`
   - `Test`
   - `Needs your attention`

Do not design a new visual brand from scratch if the project already has tokens/components. Reuse existing UI primitives. Mobile-first: every customer and courier screen must work on small viewports first.

---
# test users:
## Admin:
username: dercio.anselmo@yahoo.com
password: EmitaSpencer13

## Store admin or MERCHANT
username: dercio.anselmo@zohomail.com
password: EmitaSpencer13

## MERCHANT_STAFF ou Funcionario
username: dercio.miguel@zohomail.com
password: Emit@Spencer13

## Customer
username: dercio.miguel@gmail.com
password: EmitaSpencer13


---

# 3. Tech stack (frontend)

| Concern | Choice |
|--------|--------|
| Framework | Next.js App Router + TypeScript |
| Styling | Tailwind CSS (project default); reuse existing design tokens/components |
| Auth integration | JWT from KONECTA Auth service (access + refresh); store refresh securely; attach Bearer access token to API calls |
| Data fetching | Server Components + server actions or route handlers where appropriate; client components for interactive maps, cart, live order status |
| Forms / validation | Prefer Zod + React Hook Form (or project standard) |
| Maps (Phase 1 basic / Phase 2 full) | Only when the phase requires it; use a single map provider already chosen in the repo |
| HTTP client | One shared API client module; never scatter raw `fetch` with duplicated auth headers |
| Env | `NEXT_PUBLIC_*` only for truly public values; Auth secrets and private keys never in the browser |

**Do not** use Clerk, NextAuth as a replacement for KONECTA Auth, or a fake in-browser-only user store as production auth. Phase 1 auth **is** the Java Auth microservice.


---

# 4. Backend already available (Phase 1)
Read the doc API_REFERENCE-security-service.md for the security, user register, login, etc.

### Authentication / Identity service

Integrate these capabilities (paths may match the Auth `AGENTS.md`; adapt if the live OpenAPI differs — prefer OpenAPI/contract over assumptions):

- `POST` register (profile fields + password)
- OTP verify / request
- `POST` login → access + refresh tokens
- `POST` refresh / logout
- Google OAuth2 start/callback as exposed by Auth
- `GET /users/me` — profile + role
- `GET` neighborhoods meta (`city=Maputo`) for bairro dropdowns
- Roles in JWT / `/me`: at least `CUSTOMER`, `MERCHANT`, `COURIER`, `ADMIN` (and `MOBILITY_PARTNER` reserved)

### Auth rules on the frontend

- Default self-registration role is **Customer**.
- After login, route users to the correct shell by role (customer app vs merchant panel vs courier app vs admin).
- Protect private routes with middleware or server-side session checks based on JWT validity.
- City for profile: **Maputo only**. Neighborhood: only values from the Auth neighborhoods list.
- Never log tokens. Never put refresh tokens in `localStorage` if the project already standardizes on httpOnly cookies via a BFF route — **match the security pattern already in the repo**; if greenfield, prefer httpOnly secure cookies set by a Next route handler that talks to Auth, or the documented Auth cookie strategy.

### Other backends in Phase 1

Assume (or stub only if the user says services are not ready) APIs for catalog, cart/orders, payments, merchant, courier, admin as they come online. Prefer real contracts. If a service is missing, feature-flag the UI and do not fake business-critical money flows.

---

# 5. Product rules the UI must enforce

These are business rules from the KONECTA BRD. The UI must make them obvious.

1. **One merchant per cart** — A cart belongs to exactly one store. Adding a product from another store must block mix and offer replace cart or finish current order.
2. **Proximity first** — Default lists sort by distance from user location (or selected location). User may open map / change area to browse elsewhere.
3. **Total price** — Always show product price + delivery fee = total where delivery applies.
4. **Catalog prices include IVA** — Display shelf price as-is; **invoice** document shows base + IVA breakdown.
5. **Store open/closed** — Show hours and open/closed state. If closed, user may still place an order that stays pending until open (`PENDING_STORE_OPEN`), with clear messaging.
6. **Payments** — Pay via M-Pesa, e-Mola, Visa, or COD as enabled. **Per-transaction split** is handled by the payments API (merchant amount + KONECTA commission). **No “Fecho do Dia” manual payout UI.**
7. **Order tracking** — Customer sees status timeline and ETA (distance + courier vehicle type when delivery).
8. **Courier** — Earnings visible **before** accept/reject. Customer **phone only after** job accepted.
9. **Merchant** — Stock, sales dashboard, fiscal fields (name, NUIT, address), hours, per-transaction receipt history.
10. **Language / money** — UI copy in **Portuguese (Mozambique)**; currency **MT (Metical)**.
11. By default the UI is dark mode. But the option for normal mode must also be available. And use the logos accordingly.
12. Use the UI-Model.png as ui model design

---

# 6. Development phases (implement only the active phase)

The user implements phase by phase. **Default active phase is Phase 1 (MVP)** unless the user states otherwise.

## Phase 1 — MVP (current)

**Goal:** Usable mobile-first web app + role dashboards with Auth service live.

### Customer
- Splash / onboarding (minimal)
- Register / login / OTP / Google (via Auth service)
- Home (location, search entry, categories, nearby products/stores, open/closed badges)
- Search + filters/sort (total price, distance, etc. as data allows)
- Store page, product page
- Cart (single merchant), checkout (address, pickup vs delivery, payment methods)
- Order confirmation (QR/code for pickup when applicable)
- Order tracking (status timeline; basic ETA)
- Order history + invoice/receipt view/download
- Profile (Maputo + bairro), favorites shell if trivial
- Bottom nav: Home | Search | Orders | Favorites | Profile + cart access

### Merchant
- Login (same Auth, role MERCHANT)
- Dashboard (Shops, sales today, orders, stock)
- The stock are made of products, so the merchant will create products (With all relevant fields of a normal e-comerce, including photos)
- Fiscal / store profile fields needed for invoices
- Opening hours
- Products CRUD + stock
- Orders list/detail (accept/reject, prepare, ready, pickup QR validation UX)
- Sales summary
- **Recebimentos por transação** (gross, commission, net, status) — not day-close
- One Merchant can create and manage multiple shops/store. His dashboard will be by shop

### Courier
- Login (same Auth, role COURIER)
- Dashboard + ONLINE/OFFLINE toggle
- New job offer with earnings before accept
- Job steps (to store → pickup → to customer → deliver)
- Customer phone on accepted job
- Basic earnings view

### Admin
- Login (same Auth, role ADMIN)
- Ops dashboard shell
- Users (search/disable if API exists)
- Orders ops (cancel/refund flows if API exists)
- **Transactions & commissions** monitoring (not manual transfer/comprovativo upload)

### Explicitly out of Phase 1
- Full real-time map tracking (can show static/basic status without live GPS map)
- Loyalty points, advanced ads, grouped deliveries
- Rent / Lease / Earn-to-Own mobility
- Native mobile apps
- Multi-city beyond Maputo
- AI recommendations

## Phase 2

- Real-time maps & courier tracking on customer order view
- Reviews/ratings
- Loyalty (KONECTA Points) + missions
- Promotions / advertising surfaces
- Grouped deliveries (courier)
- Richer merchant promos
- Customer reviews on products and stores

## Phase 3

- Mobility: Rent, Lease, Earn-to-Own
- Mobility partner dashboard
- Vehicle maintenance views for couriers

## Phase 4

- AI recommendations, demand prediction, advanced routing
- Geographic expansion beyond Maputo
- Native iOS/Android if still separate from this Next app

When working in Phase 2+, still keep Phase 1 rules intact (1 cart = 1 merchant, split payments, etc.).

---

# 7. Information architecture (Phase 1 routes — suggested)

Adapt names to repo conventions (`app/[locale]/…` only if i18n is already set; default PT copy is enough for MVP).

### Public / auth
- `/` marketing or redirect
- `/login`, `/register`, `/verify-otp`
- OAuth callback route as required by Auth

### Customer (`/` or `/app` shell)
- `/home`, `/search`, `/stores/[id]`, `/products/[id]`
- `/cart`, `/checkout/*`
- `/orders`, `/orders/[id]`, `/orders/[id]/invoice`
- `/favorites`, `/profile`, `/notifications`

### Merchant (`/merchant`)
- `/merchant`, `/merchant/products`, `/merchant/orders`, `/merchant/orders/[id]`
- `/merchant/settings/fiscal`, `/merchant/settings/hours`
- `/merchant/sales`, `/merchant/receipts`

### Courier (`/courier`)
- `/courier`, `/courier/jobs/[id]`, `/courier/earnings`

### Admin (`/admin`)
- `/admin`, `/admin/users`, `/admin/orders`, `/admin/transactions`

Middleware: unauthenticated users cannot access role shells; wrong role cannot access another role’s base path.

---

# 8. Screen inventory reference (Phase 1)

Use this as the checklist for UX implementation order (from BRD). Details of fields live in the BRD; do not invent fiscal or payment behavior.

**Customer:** Splash, Login/OTP, Home, Search, Store, Product, Cart (1 store), Checkout steps, Confirmation, Track order, Pickup QR, History, Invoice, Favorites, Notifications, Profile, Bottom nav.

**Merchant:** Dashboard, Fiscal data, Hours, Product list/edit, Stock, Orders list/detail, Sales, Per-transaction receipts.

**Courier:** Dashboard + online toggle, Job offer, Navigation steps, Job detail + call customer, Delivery confirm, Earnings.

**Admin:** Dashboard, Transactions/commissions, Users, Orders ops.

**Cross-cutting:** Open/closed badges, skeleton loaders, empty states, toast errors, “replace cart?” modal, strong CTAs on small screens.

---

# 9. Order status UI (align with backend states)

Display a clear timeline. Support at least:

`CREATED` → `PAID` → optional `PENDING_STORE_OPEN` → `STORE_CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → (`COURIER_ASSIGNED` → `PICKED_UP` → `IN_TRANSIT`) → `DELIVERED`  
Also `CANCELLED` / `REFUNDED`.

Pickup path skips courier states. Copy in Portuguese, human-readable (not raw enum-only).

---

# 10. Security & privacy (frontend)

- Tokens: follow section 4; never expose Auth client secrets.
- Customer phone: **courier UI only after accept**.
- Do not cache other users’ PII in client global state longer than needed.
- All payment confirmation states come from backend/payment API — UI must not mark paid on optimism alone without confirmation.
- XSS: do not `dangerouslySetInnerHTML` on user/store content unless sanitized.
- CSRF: if using cookie-based session bridge, configure SameSite and Next server actions accordingly.

---

# 11. Performance & poor networks (Mozambique context)

- Mobile-first layouts, large tap targets
- Progressive loading, optimized images (`next/image`)
- Skeletons instead of blank screens
- Avoid huge client bundles on Home/Search
- Graceful offline/error retries on critical actions (login, place order)

---

# 12. Environment

Maintain `.env.example` with:

- `NEXT_PUBLIC_APP_URL`
- `AUTH_API_BASE_URL` (server) and any public Auth URL if required
- Payment/catalog API bases as services appear
- Map provider key only if Phase needs maps and key is public-restricted

Never commit real secrets.

---

# 13. Checks to run

From the frontend app root:

1. `pnpm` / `npm` / `yarn` typecheck
2. Lint
3. Production build when routes, middleware, or next config change
4. Manual test script for the phase (login each role, cart single-store rule, checkout smoke)

Never claim checks passed without running them.

---

# 14. Acceptance criteria — Phase 1 (frontend)

- [ ] User registers/logs in against **real Auth service** (email/OTP and Google if enabled).
- [ ] `/users/me` drives profile and role-based routing.
- [ ] Customer can browse nearby-oriented home/search, open store/product, use **one-merchant cart**, checkout shell wired to payment methods agreed for MVP.
- [ ] Open/closed store state is visible; closed-store messaging exists.
- [ ] Customer can open order history and an invoice view that shows merchant fiscal fields + IVA breakdown when API provides them.
- [ ] Merchant can manage products/stock/orders and see per-transaction receipts (not day-close).
- [ ] Courier can go online, see earnings before accept, see customer phone only after accept.
- [ ] Admin can open transactions/commissions monitoring UI (data from API).
- [ ] No Phase 2+ mobility/loyalty/live-tracking scope unless explicitly requested.
- [ ] UI language Portuguese (MZ); amounts in MT.

---

# 15. Out of scope

- Rebuilding the Auth microservice inside Next.js
- Fecho do Dia / manual bank transfer proof upload
- Multi-merchant single cart
- Cities other than Maputo in Phase 1
- Native apps
- Designing a new product vision beyond the BRD rules above

---

# 16. When in doubt

- Stay in **Phase 1**.
- Trust **Auth service** for identity.
- Enforce **1 cart = 1 merchant** in UI even before backend double-checks.
- Prefer server-side token handling patterns already in the repo.
- Keep screens simple, fast, and readable on a small phone.
- Put long rationale in `prompts/`, not in chat noise.

---

# 17. Related backend agent docs

- Auth microservice: integrate per its `AGENTS.md` (JWT, roles, Maputo neighborhoods, no Kafka required for frontend).
- Future services (Stores, Products, Orders, Payments, Delivery) will own business data; this app is the multi-role client.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
