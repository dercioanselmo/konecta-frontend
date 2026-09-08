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

1. **One merchant per cart, multiple carts per customer** — A cart belongs to exactly one store, but a customer may hold **one active cart per store** at the same time (e.g. a cart at Store A waiting for it to open, and a separate cart being built at Store B). Adding a product for a store that already has an active cart adds/updates a line in **that store's** cart — it never merges into or replaces a different store's cart. There is no "replace cart" prompt anymore: browsing a second store simply opens/continues that store's own cart alongside the first. A customer cannot have two separate carts for the *same* store — a second add to an already-carted store is always a line change on the existing one.
2. **Proximity first** — Default lists sort by distance from user location (or selected location). User may open map / change area to browse elsewhere.
3. **Total price** — Always show product price + delivery fee = total where delivery applies.
4. **Catalog prices include IVA** — Display shelf price as-is; **invoice** document shows base + IVA breakdown.
5. **Store open/closed** — Show hours and open/closed state. **A closed store blocks checkout finalization outright — payment must never start while the store is closed, and no order is ever created for a closed-store attempt** (not even a pending one — `PENDING_STORE_OPEN` plays no part in this flow). Instead, whatever the customer filled in on the checkout screen (delivery mode/address, payment method, contacts) is **saved onto that cart itself** as a draft, and the cart just sits there — items plus draft — until the customer comes back on their own once the store is open. Nothing auto-fires when it opens; resuming is manual (see the Cart section's cart-icon/switcher routing, which sends the customer straight back to a pre-filled checkout when a cart already has a saved draft).
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

**Cross-cutting:** Open/closed badges, skeleton loaders, empty states, toast errors, strong CTAs on small screens.

**Live open/closed badges — required everywhere a store's status is shown, not just checkout.** Any screen displaying a store's open/closed state (cart, store page, checkout, and any future one — product page, order screens, merchant-facing "your store as customers see it" previews, etc.) must reflect a merchant's hours change **without the customer reloading the page**. Use the shared `useLiveStoreOpen(storeId, initialIsOpen)` hook (`lib/stores/useLiveStoreOpen.ts` — polls the public store-status endpoint every 60s + on window focus); wrap it in a small client component (see `components/customer/StoreOpenBadge.tsx`) when the badge needs to sit inside a Server Component page, exactly like `/stores/[storeId]` does. Always seed it with the server-rendered `isOpen` value so there's no flash of the wrong state before the first client check. **Exception, stated explicitly rather than silently skipped**: a list of many stores at once (e.g. the nearby-shops grid on `/categories/[categoryId]`) should NOT get one `useLiveStoreOpen` call per row — that's one request per store per interval, which doesn't scale. For a multi-store list, batch-refresh the whole list on the same interval instead (one request updates every row's badge at once); this hasn't been built yet as of this note — do it if/when that screen's live-accuracy is asked for, don't build 50 individual pollers to get there.

---

# 9. Order status UI (align with backend states)

**The customer/merchant-facing timeline shows only a simplified set of
steps per delivery mode — not the full backend enum.** Too many visible
steps reads as noise; the backend keeps its finer-grained statuses for
internal tracking (e.g. the merchant's own accept/prepare workflow), but
the roadmap/timeline only ever renders these:

**Delivery (5 steps):**
1. Pagamento confirmado
2. Pronto para levantamento — **at this step, the customer or the
   MERCHANT/MERCHANT_STAFF can change the delivery mode** (switch
   between pickup at the store and delivery to the customer's address)
3. Entregador atribuído
4. A caminho
5. Entregue

**Pickup (3 steps):**
1. Pagamento confirmado
2. Pronto para levantamento — same mode-change rule as delivery step 2
3. Entregue

Backend statuses **not shown as their own step**, folded into the
nearest one above instead (still real enum values — this is a display
simplification, not an enum change): `CREATED`/`PENDING_STORE_OPEN`/
`STORE_CONFIRMED`/`PREPARING` all fold into step 1 (still "Pagamento
confirmado" until the order reaches `READY_FOR_PICKUP`); for delivery,
`PICKED_UP` (courier collected from the store) folds into step 3
("Entregador atribuído") since there's no separate visible dot for it;
for pickup, `PICKED_UP`/`COURIER_ASSIGNED`/`IN_TRANSIT`/`DELIVERED` all
fold into the final "Entregue" step (pickup orders shouldn't reach
those in practice, but the mapping is defensive rather than a crash if
one does). `CANCELLED`/`REFUNDED` render as their own distinct banner,
not a step in the timeline. See `components/orders/OrderStatusRoadmap.tsx`
for the exact grouping.

`PENDING_STORE_OPEN` plays **no part** in the current flow — per rule 5 in §5, no order is ever created while a store is closed, so this status should never appear on a new order. Leave it in the enum/label map only in case it's returned for some unrelated reason; don't design any UI around expecting it.

**Change-delivery-mode-at-"Pronto para levantamento" is a documented
rule, not yet built** — no endpoint or UI exists for it yet. When it's
picked up: both the customer's own order view and the merchant/staff
order detail need a control (visible only while status is
`READY_FOR_PICKUP`) to flip `deliveryMode` and, when switching to
delivery, collect/edit the delivery address — needs a real backend
capability (today's Orders/Checkout services have no mutate-in-place
endpoint for `deliveryMode`/`deliveryAddress` post-creation). Report the
endpoint need the same way every other gap in this project has been
handled — don't invent a client-only toggle that doesn't call a real API.

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


# AGENTS.md — KONECTA Frontend (Cart focus)

You are a **principal-level full-stack engineer and AI implementation agent** building the **KONECTA** customer-facing **Next.js** frontend, with the current priority on the **Cart** experience.

KONECTA is a multi-merchant local commerce platform for **Mozambique** (Maputo-first). Mobile-first UI. Portuguese (MZ) copy. Currency **MT**.

---

# 1. What you are building (this phase)

Implement the **Carrinho** end-to-end in the frontend:

- Add / update quantity / remove / clear
- **One store per cart** (hard rule)
- Cart page (and badge in chrome)
- Revalidation feedback (stock, price, inactive product)
- CTA **Ir para checkout** only when cart is valid
- **Do not implement checkout, payment, address, or order placement in this phase** unless the user explicitly expands scope

Auth, store browse, and product pages may already exist — reuse them. Wire cart to the **Cart microservice** and read product/store display data as needed via existing APIs or cart aggregates.

---

# 2. Backend services already available (Eureka)

| Eureka name | Port (local) | Role |
|-------------|--------------|------|
| `KONECTA-SECURITY-SERVICE` | `8091` | Auth, JWT, users, roles |
| `KONECTA-STORES-AND-STOCK-SERVICE` | `8092` | Stores, products, inventory |
| **Cart service** (new) | TBD | System of record for user carts |

- Obtain JWT from Security; send `Authorization: Bearer` on Cart (and other) APIs.
- Cart service is responsible for cart state; it talks to Stores-and-Stock for price/stock validation.
- Frontend **does not** call Stock to decrement inventory on add-to-cart.

---

# 3. How to work

1. Read this file and inspect existing Next.js routes, auth session handling, and API client patterns.
2. Implement **only Cart** UI/flows unless asked otherwise.
3. Prefer App Router, TypeScript, existing design system / Tailwind patterns.
4. After **each** implementation slice, in your closing report / prompt notes you **must** include:

### Mandatory end-of-implementation report: backend endpoints needed

Document clearly for the backend agent:

- Purpose of each endpoint (e.g. get cart, add item, update qty, remove, clear, validate)
- HTTP method suggestion
- Request body fields the UI will send
- Response fields the UI needs
- Error cases the UI handles (`STORE_MISMATCH`, `INSUFFICIENT_STOCK`, `PRODUCT_INACTIVE`, etc.)

This report drives `context.md` on the Cart service. **Do not assume undocumented endpoints exist.**

5. If Cart API is not ready, you may mock against the contract you report — but mark mocks clearly and replace when API exists.

---

# 4. Product rules (Cart)

| ID | Rule |
|----|------|
| C-01 | Each individual cart belongs to **exactly one** `storeId`. A customer may hold **multiple concurrent carts**, at most **one per store** — never two carts for the same store. |
| C-02 | All lines in a given cart must be products of that cart's store. |
| C-03 | Adding a product for a store that already has an active cart **updates that store's own cart** (new line, or qty bump on an existing line) — it is never treated as a conflict and never touches any other store's cart. There is no cross-store merge and no "replace cart" prompt; each store's cart is independent. |
| C-04 | Show store name (and logo if available) on cart. |
| C-05 | Prices are **IVA-inclusive** catalog prices. |
| C-06 | Quantities are integers ≥ 1; max bounded by available stock when known. |
| C-07 | Subtotal = sum of line totals; focus cart on **product subtotal** (delivery fee is checkout — show only as optional estimate labeled as such). |
| C-08 | Badge on cart icon reflects total item quantity **summed across every active cart** (define once and stay consistent). |
| C-09 | Empty cart: clear empty state + CTA to continue shopping. |
| C-10 | “Ir para checkout” enabled only if cart non-empty and last validation succeeded. |
| C-11 | A customer picks **which cart** to view/act on when they have more than one — e.g. a cart-switcher/list showing each active cart by store name, item count, and that store's open/closed state. Opening "Ir para checkout" always goes to *that* store's checkout, never a merged view of every cart. |
| C-12 | **Global cart-icon click routing**: tapping the header cart icon, when the customer has **more than one** active cart, opens the cart switcher (C-11). With **exactly one** active cart, skip the switcher entirely and go straight to: **`/checkout` for that store, pre-filled from its saved checkout draft**, if that cart has one (see the Checkout section's §4.8) — or plain `/cart` for that store if it doesn't. Selecting a cart from the switcher applies this same draft-or-plain-cart routing. |

**Out of scope this phase:** address, pickup vs delivery choice, payment methods, order creation, COD, M-Pesa.

---

# 5. Screens and UX

- **Cart page** (`/cart` or project convention): if the customer has more than one active cart, a cart switcher/list (store name/logo, item count, open/closed badge) sits above the line-item view; selecting one shows that store's lines, steppers, remove, subtotal, store header, primary CTA.
- **Add to cart** from product (and list if applicable): toast + badge update — badge reflects the sum across **all** the customer's active carts (see C-08).
- Loading/skeleton while fetching or revalidating.
- Inline errors per line (out of stock, price changed, product inactive).
- Mobile-first: large steppers, sticky CTA.

Reuse bottom nav / header patterns already in the app.

---

# 6. Auth and session

- Cart APIs require authenticated customer (`CUSTOMER` or whatever role buys).
- If unauthenticated user taps add-to-cart: redirect to login **or** guest cart policy if product already supports it — match existing app behaviour; prefer authenticated cart for production purchase path.
- On 401: refresh token via Security flow already in app; retry once; else login.

---

# 7. State management

- Prefer server state via TanStack Query / SWR keyed by `['carts']` (list of the customer's active carts) — this replaces the old single-cart `['cart']` key now that a customer can hold more than one.
- After mutations (add/update/remove/clear) on any one cart: invalidate or patch that cart's entry in the list; don't force a full refetch of every other cart unnecessarily.
- Do not keep a parallel “shadow” cart that can diverge from API without sync.

---

# 8. Acceptance criteria (frontend Cart)

- [ ] User can add product; badge updates
- [ ] Same-store second product updates qty or second line correctly
- [ ] Adding a product for a **different** store opens/updates a **second, independent** cart — no conflict modal, no mixed-store lines within either cart
- [ ] Customer can see and switch between all their active carts
- [ ] Update qty and remove work; empty state when last item removed (removing all lines from one cart doesn't affect the customer's other carts)
- [ ] Subtotals compute correctly in UI from API data
- [ ] Invalid stock/price states show messages; checkout CTA disabled when invalid
- [ ] No checkout/payment screens shipped in this phase
- [ ] End-of-slice report lists required backend endpoints for the backend agent

---

# 9. When in doubt

- Cart ≠ Checkout.
- One store per cart — but a customer may have several carts, one per store.
- Stock is validated via **Cart API** (which calls Stores-and-Stock); frontend does not own inventory math.
- Always finish with **endpoint needs report** for backend.


# AGENTS.md — KONECTA Frontend (Checkout)

You are a **principal-level full-stack engineer and AI implementation agent** building the **KONECTA** Next.js frontend **Checkout** flow.

KONECTA is multi-merchant local commerce for **Mozambique** (Maputo-first). Mobile-first. UI copy in **Portuguese (MZ)**. Currency **MT**.

Cart is **already implemented**. This phase is **Checkout only** (single screen), then navigation to the **Order** screen after simulated payment success.

---

# 1. What you are building

One **Checkout screen** that combines three blocks on the **same page** (steps/sections, not separate routes unless the existing app pattern strongly prefers tabs on one URL):

1. **Delivery mode + delivery location**
2. **Payment mode + payment details**
3. **Review / confirm** (order contacts + summary + submit)

Also:

- Prefill from **customer profile** (Security / user profile APIs already in the platform)
- **Back to cart** to edit lines anytime before successful place-order
- After **payment confirmed** → navigate to **Order detail** screen  
  - **This phase:** payment always succeeds automatically (no real M-Pesa / e-Mola / Visa / COD gateway yet)
- Default **delivery mode** = customer’s preferred mode from profile  
- Default **payment method** = customer’s preferred payment method from profile  
- **Email and mobile phone** are captured on the order (prefill from profile; editable if product allows)

**Out of scope unless user expands:** real payment provider integration, full order history redesign, courier flows.

**Multi-cart note:** the customer may hold several active carts (one per store — see the Cart section's C-01/C-11). Checkout always operates on **one specific store's cart**, reached from that store's entry in the cart switcher. Nothing here merges carts across stores.

---

# 2. Platform services (Eureka)

| Eureka name | Local | Use from frontend |
|-------------|-------|-------------------|
| `KONECTA-SECURITY-SERVICE` | `:8091` | JWT, profile (address, geo, preferred delivery, preferred payment, email, phone) |
| `KONECTA-STORES-AND-STOCK-SERVICE` | `:8092` | Store name/address/hours if needed for pickup display |
| Cart service (already built) | (registered name/port as in project) | Load cart summary; user may return to edit |
| **`KONECTA-CHECKOUT-SERVICE`** (new) | TBD | Place order / checkout confirm; returns order id |

Always send `Authorization: Bearer <access_token>`.

---

# 3. How to work

1. Inspect existing cart, auth, profile, and routing patterns before adding pages.
2. Implement the single checkout page + navigation to order screen.
3. **At the end of every implementation slice**, report in the prompt/notes the **backend endpoints** the UI needs (method, purpose, request fields, response fields, errors). This drives `context.md` on `konecta-checkout`.
4. Do not invent payment provider SDKs in this phase — call checkout “confirm” and treat success as paid/confirmed per API contract.

---

# 4. Checkout screen — functional requirements

## 4.1 Layout (one screen)

Single scrollable page (mobile-first) with clear sections:

| Section | Content |
|---------|---------|
| **A. Entrega** | Mode + location / pickup info |
| **B. Pagamento** | Method + details placeholder |
| **C. Contactos e resumo** | Email, phone, cart lines summary, totals, submit |
| **Chrome** | Back link/button → **Cart**; store name; loading/error toasts |

## 4.2 Delivery mode (`Levantar na loja` | `Receber`)

| Rule | Detail |
|------|--------|
| Initial value | Customer **preferred delivery mode** from profile |
| User can change | Toggle / radio between pickup and delivery |
| **Receber (delivery)** | Show delivery address; initial = profile geolocation/address; user can **change** address (edit fields and/or map pin if maps already exist; otherwise address text + lat/lng if profile has them) |
| **Levantar na loja** | Show store address, hours, distance if available; no customer delivery address required |
| Validation | Delivery requires a usable address (and lat/lng if the API requires them); pickup requires cart store to accept pickup if flag exists |

## 4.3 Payment mode

| Rule | Detail |
|------|--------|
| Initial value | Customer **preferred payment method** from profile |
| Options (UI ready) | Align with product: M-Pesa, e-Mola, Visa, COD (Cash on delivery) — show as selectable even if gateway not integrated |
| This phase | Selecting a method + confirming checkout **auto-confirms payment** via backend (no external redirect) |
| Details | Show method-specific hints only (e.g. “Pagamento na entrega” for COD); no real card capture PCI flow yet |

## 4.4 Contacts on the order

| Field | Behaviour |
|-------|-----------|
| Email | Prefill from profile; included in place-order payload |
| Phone (celular) | Prefill from profile; included in place-order payload |
| Editable | Yes, so the order can carry contact details used for this purchase |

## 4.5 Summary

- Lines from **current cart** (name, qty, unit price, line total)
- Store name
- Product **subtotal**
- Delivery fee: show if API returns estimate; otherwise “Calculado na confirmação” / value from checkout response
- **Total** from checkout quote/confirm response when available
- Prices IVA-inclusive as elsewhere

## 4.6 Actions

| Action | Behaviour |
|--------|-----------|
| Voltar ao carrinho | Navigate to cart; cart remains editable |
| Confirmar e pagar (label changes to something like "Guardar e aguardar abertura" while the store is closed) | **Store open**: call checkout place-order; on success → **Order screen** with `orderId`; that store's cart (and any saved draft on it) is cleared server-side. **Store closed**: never calls place-order — instead saves the current form values (delivery mode/address, payment method, contacts) onto that store's cart as a checkout draft, and shows confirmation that it's saved for when the store opens. |
| Failure | Stay on checkout; show API error (stock, validation, etc.) |

## 4.8 Store-closed gating (payment must never start while closed — draft saved on the cart instead)

| Rule | Detail |
|------|--------|
| Closed store | The screen still renders fully (delivery/payment sections, summary) so the customer can fill everything in ahead of time. The CTA's action changes from "place the order" to "save a checkout draft on this cart" (see the Cart section — this is a Cart-service call, not a Checkout-service one). No order/payment attempt is made at all until the store is actually open. |
| Pre-fill on return | Opening `/checkout` for a cart that already has a saved draft pre-fills the form from that draft instead of from profile defaults — the customer sees exactly what they entered before, not a reset form. |
| No auto-pending order | `PENDING_STORE_OPEN` plays no part here — no order exists at all until the customer actually completes checkout with the store open. |
| Resuming | Manual, not automatic. The customer comes back on their own (via the cart icon/switcher's draft-aware routing — Cart section C-12) once the store is open, and completes checkout like normal. Nothing fires the moment the store opens. |
| Store re-opens mid-session | If the customer already has `/checkout` open when the store's hours flip to open (poll or re-check open/closed state at a sensible interval, or at minimum re-check on focus/re-entry), swap the CTA back to "Confirmar e pagar" and re-enable it without requiring a full page reload. |

## 4.7 After success

- Navigate to Order screen (e.g. `/orders/[orderId]` or project convention).
- Order screen can be minimal in this phase (id, status, summary) if not fully built — wire navigation and pass id.

---

# 5. Profile fields expected (from Security / user profile)

Use whatever the security/profile API already exposes. Conceptually:

- Preferred delivery mode: `PICKUP` | `DELIVERY` (names may vary — map in client)
- Preferred payment method
- Default address / lat / lng / city / neighborhood
- Email, phone

If a field is missing, sensible defaults: delivery mode `DELIVERY` or `PICKUP` per product decision; payment `COD` or first enabled method; require user to fill address before submit for delivery.

---

# 6. Cart interaction

- Checkout always targets **one specific store's cart** (non-empty, mono-store) — the customer arrives here already having picked which cart from the cart switcher.
- If that cart is empty on entry → redirect to cart or home with message.
- Re-fetch that cart (and the store's open/closed state) when entering checkout.
- User may leave to cart, edit, return to checkout — **re-load** cart and re-run any quote/validate.
- The customer's *other* carts (different stores) are unaffected by anything happening in this checkout session.

---

# 7. Acceptance criteria (frontend)

- [ ] One checkout screen with delivery, payment, contacts, summary
- [ ] Prefill delivery mode, payment method, address/geo, email, phone from profile
- [ ] User can change delivery address and modes
- [ ] Back to cart works; edits reflected when returning
- [ ] Confirm calls checkout API; on success goes to Order screen with order id
- [ ] No real payment provider; success path is automatic per backend
- [ ] While the store is closed, the CTA saves a checkout draft **onto the cart** instead of calling place-order — no order/payment attempt is made at all
- [ ] Reopening a cart with a saved draft (via the cart icon/switcher) lands on `/checkout` pre-filled from that draft, not from profile defaults
- [ ] Cart + draft are preserved and checkout is resumable, unassisted, once the store opens — no auto-created pending order, `PENDING_STORE_OPEN` plays no part
- [ ] End-of-slice **endpoint needs report** for backend agent

---

# 8. Test users (local)

Use only in local/dev; never commit secrets to public repos if policy forbids.

| Role | Username (email) | Password |
|------|------------------|----------|
| Admin | `dercio.anselmo@yahoo.com` | `EmitaSpencer13` |
| Merchant (store admin) | `dercio.anselmo@zohomail.com` | `EmitaSpencer13` |
| Merchant staff (`STORE_STAFF` / Funcionário) | `dercio.miguel@zohomail.com` | `Emit@Spencer13` |
| Customer | `dercio.anselmo4@gmail.com` | `EmitaSpencer13` |

Checkout is exercised primarily as **Customer**.

---

# 9. When in doubt

- Checkout ≠ Cart; one store already enforced by cart, though a customer may have several carts (one per store).
- A closed store means **no payment attempt at all**, not a pending one — the CTA saves a draft on the cart instead of submitting.
- Payment integration is stubbed; UI still collects method for the order record.
- Always report backend endpoint needs after each slice.



# KONECTA Frontend (Encomendas / Orders)

You are a **principal-level full-stack engineer and AI implementation agent** building the **KONECTA** Next.js frontend for **customer orders**: detail (tracking), active list, and history.

KONECTA is multi-merchant local commerce for **Mozambique** (Maputo-first). **Mobile-first**. **All UI copy in Portuguese (Portugal/Mozambique style as used in the app)**. Currency **MT**. Prices are IVA-inclusive unless the invoice screen says otherwise.

Cart and Checkout are already implemented. After checkout success the user lands on the **Order** experience.

---

# 1. What you are building

1. **Order detail / tracking screen** — status roadmap, map, line items, value summary  
2. **Orders hub** — tabs **Activas** vs **Histórico**, search and filters, most recent first  
3. Navigation from checkout success (`orderId`) and from bottom nav **Pedidos**

Orders are **permanent** in the system: the customer can open any past order anytime.

**Out of scope unless asked:** merchant/staff order console, courier app, real payment capture, full fiscal PDF (link if API provides).

---

# 2. Platform services (Eureka)

| Eureka name | Local | Frontend use |
|-------------|-------|----------------|
| `KONECTA-SECURITY-SERVICE` | `localhost:8091` | JWT, profile |
| `KONECTA-STORES-AND-STOCK-SERVICE` | `localhost:8092` | Store display if needed |
| Cart service | as registered | Return to cart only from checkout, not from completed orders |
| `KONECTA-CHECKOUT-SERVICE` | `localhost:8094` | Place order (already); may still expose get-order until Orders owns reads |
| **`KONECTA-ORDERS-SERVICE`** (new) | TBD | **Source of truth** for list/detail/status/history/search |

Prefer **Orders service** for all order reads and customer-driven status views. If temporarily only Checkout has the order, follow project wiring until Orders is up — then switch.

Always send `Authorization: Bearer <access_token>`.

---

# 3. How to work

1. Reuse checkout patterns: summary columns, layout, auth client, map stack (Leaflet/OSM or whatever the app already uses — **no paid Google requirement**).  
2. After **each** implementation slice, report **backend endpoints needed** (method, purpose, request/response fields, errors) for the Orders agent / `context.md`.  
3. Do not implement merchant accept/prepare UI here unless the user expands scope.

---

# 4. Order detail screen

## 4.1 Status UI (“roadmap”)

- Present status as a **creative vertical or horizontal roadmap** (timeline with steps, icons, current step highlighted, completed steps checked, future steps muted).
- Labels in **Portuguese**, human-friendly (not raw enums only).
- **Simplified step set — see the root AGENTS.md's §9 for the current
  canonical rule** (superseding the raw 8-status enum walk this section
  used to list): 5 steps for delivery (Pagamento confirmado → Pronto
  para levantamento → Entregador atribuído → A caminho → Entregue), 3
  for pickup (Pagamento confirmado → Pronto para levantamento →
  Entregue). Several raw backend statuses fold into the nearest step
  rather than getting their own dot — §9 has the exact grouping and the
  new "change delivery mode at Pronto para levantamento" rule.
- `CANCELLED`/`REFUNDED` render as their own banner, not a roadmap step.
- Polling or refetch on focus for active orders; optional live updates later.
- **Keep it compact** — per user feedback, the vertical space between steps was cut in half from the first version (`components/orders/OrderStatusRoadmap.tsx`'s connector/label spacing). Don't let it creep back up; a status list is a quick glance, not the page's main content.

## 4.2 Map

- Always visible on detail when coordinates exist.
- **Pins:**
  - **Loja** (store lat/lng)
  - **Local de entrega** (customer delivery point) when mode is delivery; for pickup, store pin is enough (or store + optional user location if useful).
- **After status ≥ `PICKED_UP` (delivery):** if API provides courier position or route geometry, show **trajectory** and **ETA**; if not, show straight line store→delivery + ETA text when API sends `etaMinutes` / `etaAt`.
- Do not block the page if map fails — keep list and status.

## 4.3 Product list

- Keep the list of purchased products visible (name, image if any, qty).
- Align with cart/checkout visual language.

## 4.4 Value summary (same idea as checkout)

Table/section with at least:

| Coluna | Conteúdo |
|--------|----------|
| Produto | Nome |
| Quantidade | Inteiro |
| Preço unitário | MT |
| Preço total da linha | qty × unit |

Then footer:

- Subtotal  
- Taxa de entrega (se aplicável)  
- Total  

Reuse/adapt the **checkout summary component** so cart, checkout, and order detail stay consistent.

## 4.5 Other detail fields

- Order number / id  
- Store name  
- Delivery mode (Levantar na loja / Receber)  
- Address or store pickup info  
- Contact email & phone on the order  
- Payment method (even if stubbed)  
- Created at  

---

# 5. Orders hub (lista)

## 5.1 Tabs

| Tab | Contents |
|-----|----------|
| **Activas** | Not terminal success/cancel/refund — e.g. from `PAID` through `IN_TRANSIT` / `READY_FOR_PICKUP` / etc. (exclude `DELIVERED`, `CANCELLED`, `REFUNDED`, and terminal `PICKED_UP` for pickup if you treat it as history) |
| **Histórico** | `DELIVERED`, `CANCELLED`, `REFUNDED`, and completed pickup (`PICKED_UP` when mode is pickup) |

Define active vs history once in code to match backend filter query params.

## 5.2 Sort and search

**One single text input, nothing else.** Per user decision (superseding
the original multi-field draft below): the hub has exactly **one**
search box, no visible date-range fields and no visible sort control —
they were taking up too much space for how rarely they'd be used.
Typing in it matches, in one shot, across:

- Store name
- Product name (any line item)
- Order number (id substring)
- Product category

Sort is fixed at most-recent-first (`createdAt` desc) — not user-facing.
Date filtering is dropped from the UI entirely (not just hidden — don't
build hidden fields for it either).

**Backend reality check**: `KONECTA-ORDERS-SERVICE`'s list endpoint (see
`API_REFERENCE_konecta_order.md`) exposes `storeName`, `productName`,
and `q` (order-id substring) as **separate, narrowing (AND) filters** —
sending the same text to all three at once would wrongly require every
field to match simultaneously, and there is **no category param at
all**. Until backend adds a single OR-across-fields search param (see
the end-of-slice report), the frontend fans the one search box out into
parallel calls against `storeName`/`productName`/`q` and merges the
results client-side (deduped by `orderId`) — category matching is
**not currently possible** and is documented as a backend gap, not
silently faked.

Empty states in Portuguese for no results.

## 5.3 Receipt (printable slip)

Order detail gets a **"Descarregar recibo"** action producing a
formal, printable slip the customer can save as PDF via the browser's
own print dialog (no PDF-generation library, no backend PDF endpoint —
a dedicated print-styled view is enough for this phase). Not a full
fiscal invoice (no merchant NUIT/fiscal breakdown — that needs backend
fields that don't exist yet on the Order model); scope it as a receipt:
order id, store, date, line items, quantities, prices, totals, payment
method, delivery info.

---

# 5b. Global navigation

**"Pedidos" must be reachable from every page, including `/home`.**
Every customer-facing page should render the shared `CustomerHeader`
(`components/customer/CustomerHeader.tsx`) rather than a hand-rolled
copy of it — `/home` had drifted into its own inline header that
missed this and any future header addition; fixed once here, watch for
new pages repeating that mistake instead of reusing the shared component.

---

# 6. Product rules (general project)

- One store per order (from mono-store cart).  
- Customer sees **only own** orders.  
- Maputo-first geography where relevant.  
- Test as **Customer** primarily.

---

# 7. Test users (local)

| Role | Username | Password |
|------|----------|----------|
| Admin | `dercio.anselmo@yahoo.com` | `EmitaSpencer13` |
| Merchant | `dercio.anselmo@zohomail.com` | `EmitaSpencer13` |
| Merchant staff | `dercio.miguel@zohomail.com` | `Emit@Spencer13` |
| Customer | `dercio.miguel@gmail.com` | `EmitaSpencer13` |

---

# 7b. Merchant/staff order management

**"Encomendas" is the primary tab inside the store dashboard** (`ShopNav`,
right after "Painel") — both `MERCHANT` (shop owner) and
`MERCHANT_STAFF` get it; this is not an owner-only feature the way staff
management is.

- **List**: Activas / Histórico tabs, default Activas, newest first,
  not user-facing sort. **One search box** — same single-box idea as the
  customer hub, but scoped to the shop and additionally matching
  **customer name and contact** (the customer hub has no such fields to
  search). **Date interval is visible here** — unlike the customer hub,
  where it was explicitly dropped; the merchant use case (reconciling a
  day's orders) needs it.
- **Detail**: reuse the same roadmap/map/product-list/money-summary
  presentation built for the customer side. Add a **status-change
  control**: the merchant/staff can move an order forward along the
  established status flow (accept → prepare → ready →
  picked-up/courier-assigned), plus cancel from any pre-ready state.
  This is a real, new backend capability (today's Orders service is
  read-only and customer-scoped only) — build the UI against the
  proposed contract, degrade cleanly until it exists, and **never treat
  the client-side next-action list as authoritative** — the backend
  must validate every transition itself.
- **Receipt**: the same printable-slip action as the customer side,
  reachable from the merchant's own order detail (needs its own
  shop-scoped fetch — the customer-owner-scoped receipt route won't
  authorize a merchant viewing someone else's order).
- Admin gets the same views for free via the existing
  `basePath`/`listHref`/`listLabel` reuse pattern already used for
  products/staff/settings.

---

# 7c. QR code pickup/delivery confirmation

Every paid order carries an opaque QR token (`Order.qrCode`), generated
once at checkout time and never regenerated. The customer shows it —
in the store for pickup, or to whoever is delivering it for delivery —
and scanning it completes the order in one step.

- **Customer side**: the order detail screen (`app/orders/[orderId]/OrderDetailView.tsx`)
  shows the QR (`components/orders/OrderQrCode.tsx`, rendered client-side
  from the token via the `qrcode` package — no image from the backend)
  whenever `qrCode` is present **and** the order isn't already terminal
  (delivered/picked-up/cancelled/refunded) — no reason to show a code
  for an order that's already done.
- **Merchant/staff side ("in the store", for now)**: a camera-based
  scanner (`components/merchant/QrScanner.tsx`, plain `getUserMedia` +
  `jsQR`, no all-in-one scanning library — same "build the specific
  piece we need" philosophy as the Leaflet map wrapper) reachable from
  "Ler QR code" on the Orders tab. Scanning a valid code calls a
  dedicated **complete-by-qr** action that jumps the order straight to
  its terminal success status — `PICKED_UP` for pickup, `DELIVERED`
  for delivery — **from any non-terminal, non-cancelled/non-refunded
  status**, bypassing the normal step-by-step transition table entirely.
  This is deliberately a different, wider-scoped action than the regular
  status-change buttons (§7b) — validate this server-side as its own
  rule, not by loosening the regular transition table to allow arbitrary
  jumps.
- **Courier-facing scanning is explicitly out of scope for this round** —
  "for now, later in the delivery UI" per the request that introduced
  this. Don't build a separate courier scan surface yet.
- Never trust a client-decoded QR value as sufecient by itself — the
  scan only *proposes* a token; the backend must independently resolve
  it to a real order, confirm it belongs to the scanning shop, and
  reject cancelled/refunded/already-terminal orders, the same
  never-trust-the-client discipline as every other status change in
  this app.

---

# 8. Acceptance criteria (frontend)

- [ ] Order detail: roadmap status UI in PT, map with store (+ delivery) pins  
- [ ] Trajectory/ETA when order is picked up and data exists  
- [ ] Summary columns: qty, unit price, line total (+ subtotal/delivery/total)  
- [ ] Product list visible on detail  
- [ ] Tabs Activas / Histórico; default newest first  
- [ ] One search box matches store, product, order number (category pending a backend param — documented, not faked)  
- [ ] No visible date-range or sort controls on the hub  
- [ ] "Pedidos" reachable from every customer page via the shared `CustomerHeader`, including `/home`  
- [ ] Order detail has a "Descarregar recibo" printable/PDF-via-print action  
- [ ] Checkout success navigates to order detail  
- [ ] Endpoint needs reported after each slice for Orders backend  

---

# 9. When in doubt

- UI always Portuguese.  
- Detail = status art + map + lines + money summary.  
- History never deletes orders.  
- Orders **read API** = `KONECTA-ORDERS-SERVICE` when available.  


# AGENTS.md — KONECTA Frontend (Courier onboarding)

You are a **principal-level full-stack engineer and AI implementation agent** building the **KONECTA** Next.js frontend's **Courier (Entregador) onboarding and store-association** flow.

`COURIER` already exists as a platform role (self-requestable at registration, subject to **admin** approval — that part is live via the Security service). This phase is everything *after* a user's role is actually `COURIER`: completing a courier-specific profile, and getting approved **per store**, independently of the platform-level role approval. **Job offers, accept/reject, earnings, and delivery-in-progress flows are explicitly out of scope** until specified separately.

---

# 1. What you are building

1. **Courier profile completion** (`/courier`, `/courier/onboarding`): pin a base location (map, device-GPS pre-pinned per the location rule elsewhere in this file, Maputo-default fallback), choose one main transport (`A pé` | `Bicicleta` | `Mota` | `e-bike` | `Carro`), plate number + Carta de Condução required when Mota/Carro, upload identity documents (BI / Carta de Condução / Passaporte — more than one allowed, each with number/issue date/expiry date/local de emissão), and a profile photo (reuses the existing generic user-photo upload, no new endpoint).
2. **Store association** (`/courier/stores`): browse every active shop city-wide (not filtered by category), closest-first, each showing distance from the courier's base; request association with one or more; a distance over **2 km** shows a confirmation prompt before the request goes through (frontend-only guidance, not a hard backend limit). The same distance figure is shown both in the browse list (before associating) and in the "As suas lojas" list (after).
3. **Store-side approval** (`/merchant/shops/{shopId}/couriers`, new "Entregadores" tab in `ShopNav`, available to `MERCHANT` and `MERCHANT_STAFF`): a Pendentes/Ativos/Suspensos list, Aprovar/Rejeitar on a pending request, Suspender/Reativar on an existing one, and a detail view showing the courier's uploaded documents (so there's something concrete to confirm against, not just a name).

---

# 2. Backend status: entirely PROPOSED, nothing live yet

See `API_REFERENCE_COURIER.md` for the full contract. Summary:

- **New service**: `KONECTA-COURIER-SERVICE` (proposed port `8096`, env `COURIER_API_BASE_URL`) owns the courier profile, documents, and store-association rows — a new domain, not really Security's identity data or Stores-and-Stock's catalog data.
- **One required change to an existing, live endpoint**: `KONECTA-STORES-AND-STOCK-SERVICE`'s `GET /api/v1/shops` requires `categoryId` today (confirmed live: `400 VALIDATION_ERROR` without it) — the courier store-picker needs it to become **optional**, returning all active shops (still with `distanceKm`) when omitted.
- Frontend is fully built against this contract (`lib/courier/types.ts`, `lib/courier/client.ts`, `lib/courier/courierApi.ts`, BFF routes under `app/api/courier/**` and `app/api/merchant/shops/[shopId]/couriers/**`) — every call degrades cleanly (a Portuguese error banner, never a crash) until the real service exists, same methodology as every other proposed-then-built feature in this project (Cart, Checkout, Orders, QR).

---

# 3. Product rules

| Rule | Detail |
|---|---|
| Distance source | `distanceKm` is always computed **server-side** (reuse the same haversine `GET /api/v1/shops?lat&lng` already uses) — the frontend never computes or fakes it. |
| 2 km guidance | A frontend-only confirmation dialog, not a backend-enforced cap — the backend accepts an association request at any distance. |
| Platform role vs. store approval | Two independent approvals: `requestedRole: COURIER` → admin, platform-wide, already live; store association → that store's `MERCHANT`/`MERCHANT_STAFF`, per shop, new. A courier can be platform-approved and still `PENDING_STORE_APPROVAL` everywhere. |
| Plate + licence | `plateNumber` required (and shown) only for `MOTORCYCLE`/`CAR`; the UI nudges for a `CARTA_CONDUCAO` document when one of those is picked and none exists yet — but the backend must independently enforce this, never trust the client's view of "has a licence on file." |
| Documents | Multiple allowed, including more than one of the same type (e.g. an expired BI kept alongside its renewal) — no uniqueness constraint. |
| Never trust client-only approval | Every status transition (approve/reject/suspend/reactivate) is validated server-side, same discipline as every other status-change endpoint in this project. |

---

# 4. When in doubt

- This slice ends at "courier profile complete + associated with at least one approved store." Nothing about receiving or working an order.
- Report backend endpoint needs the same way every other feature in this project has (see `API_REFERENCE_COURIER.md`) — don't invent undocumented endpoints.
- UI always Portuguese; reuse `LocationPicker`, `ConfirmDialog`, `Badge`, and the existing photo-upload pattern rather than inventing new primitives.


<!-- END:nextjs-agent-rules -->
