# ColdStorage Ecosystem — Project Reference

> Analysis baseline: 14 July 2026. Use this as the working map before changing the repository. It describes the code present at the baseline, including known incomplete areas; it is not a claim that all features are production-ready.

## 1. Repository at a glance

This is a TypeScript multi-application cold-storage platform for Indian agricultural logistics. It has no root `package.json` or workspace manager; each application is installed and run independently.

| Area | Location | Stack | Primary responsibility |
|---|---|---|---|
| API | `backend/` | Express 5, Prisma 7, PostgreSQL, Redis | Authentication, WMS, marketplace, booking, KYC, IoT, financial workflows |
| Web | `frontend/` | Next.js 16 / React 19 | Marketing landing page, admin dashboards, owner/staff WMS |
| Mobile | `mobile/` | Expo 56 / React Native / Expo Router | Farmer, buyer, and owner/staff experiences |
| Shared | `shared/` | TypeScript source generator | Framework-independent types generated from Prisma |
| Local services | `docker-compose.yml` | PostgreSQL 16, Redis 7, API | Local infrastructure and backend container |

The product brief is `Cold Storage Ecosystem Development.md`. It sets out an ecosystem including governance, WMS, farmer/buyer apps, IoT, eNWR/financing, and future voice/WhatsApp integrations.

## 2. How to run and validate

### Local dependencies

`docker compose up -d` starts PostgreSQL on `5432`, Redis on `6379`, and the API on `4000`. The API container is configured with `/api/v1` and local development credentials in Compose. EMQX MQTT and a frontend container are commented out.

The backend requires `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`; `backend/src/config/env.ts` lists all environment keys. The web uses `NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:4000/api/v1`. Mobile selects localhost for iOS, `10.0.2.2` for Android emulator, and hard-coded production URLs for release builds.

| Application | Install/run | Validation |
|---|---|---|
| API | `cd backend && npm run dev` | `npm run type-check`, `npm test` |
| Web | `cd frontend && npm run dev` | `npm run lint`, `npm run build` |
| Mobile | `cd mobile && npm start` | `npx tsc --noEmit` |
| Shared types | root: `node shared/generate-types.mjs` | Regenerates `shared/types/index.ts` after schema changes |

API docs are mounted by Swagger setup (see `backend/src/shared/swagger.ts`); health is `GET /health`.

## 3. System topology and request flow

```text
Next.js dashboard ─┐
                   ├─ HTTP + Bearer JWT ─> Express API (/api/v1) ─> Prisma ─> PostgreSQL
Expo mobile app ───┘                                  │
                                                      ├─ Redis: rate limiting, idempotency, cache fallback
                                                      ├─ uploads/: KYC/facility documents (local volume)
                                                      └─ MQTT or dev temperature simulator -> temperature readings/alerts
```

The API returns the standard shape from `backend/src/shared/utils/api-response.ts`: `{ success, data, meta?, error? }`. Both clients store access/refresh tokens and refresh on `401`; web uses `localStorage`, mobile uses the platform storage wrapper. Mobile additionally has an offline mutation queue with idempotency keys.

## 4. Backend architecture

### Entry points and cross-cutting behavior

- `src/server.ts` connects PostgreSQL, tries Redis without making it mandatory, starts Express, MQTT ingestion or a development simulator, and the alert engine. It also shuts down all services gracefully.
- `src/app.ts` applies Helmet, CORS, JSON/urlencoded parsing, cookies, compression, static `/uploads`, request logging, rate limiting, route registration, Swagger, 404 handling, and global errors.
- `src/modules/auth/auth.middleware.ts` supplies JWT authentication, role authorization, and token generation/verification.
- `src/shared/middleware/validate.ts`, `upload.ts`, `idempotency.ts`, and `rate-limiter.ts` are reusable guards. Idempotency uses Redis if available, otherwise deliberately fails open.
- `src/shared/utils/audit.ts`, `pdf-generator.ts`, `reg-number-generator.ts`, `id-generator.ts`, pagination/query helpers, and SMS service support domain modules.

### API module map

All routes are under `/api/v1`; check the corresponding `*.routes.ts` before editing endpoint behavior or authorization.

| Prefix | Module | Main capabilities |
|---|---|---|
| `/auth` | auth | OTP send/verify, register/login, refresh/logout, current profile, push token |
| `/users` | users | Current-user profile/password, depositor management, admin user management/status |
| `/facilities`, `/chambers`, `/pricing` | facility WMS | Facility onboarding/documents/status, chambers, storage pricing/approval/analytics |
| `/inventory`, `/invoices`, `/reports` | facility WMS | Lots, intake/release/transactions, billing and CSV exports |
| `/analytics`, `/audit`, `/search` | admin support | KPI/capacity/revenue/compliance analytics, audit logs, global search |
| `/temperature`, `/iot-devices`, `/notifications` | monitoring | Temperature overview/history/ingest, device registry/heartbeats, notifications/read state |
| `/discover`, `/reviews`, `/bookings` | farmer-facing discovery | Facility discovery/reviews, booking lifecycle and QR verification |
| `/marketplace`, `/orders`, `/market-prices` | buyer/farmer marketplace | Listings, orders/approval/dispatch OTP, external/cached market-price data |
| `/kyc`, `/warehouse-receipts`, `/escrow` | compliance/finance | KYC documents/review, eNWR pledge/redemption, buyer payment/hold/release/refund/dispute |

The detailed endpoint declarations are in `backend/src/modules/**/**.routes.ts`; no standalone OpenAPI source is maintained—the Swagger definition is generated from source annotations/configuration.

### Database domain model

Prisma schema: `backend/prisma/schema.prisma`; migrations: `backend/prisma/migrations/`; seeds: `prisma/seed.ts` and `seed-phase2.ts`.

| Domain | Models |
|---|---|
| Identity/KYC | `User`, `UserSession`, `UserDocument`, `PhoneOTP` |
| Facilities | `Facility`, `Chamber`, `FacilityDocument`, `FacilityPricing` |
| Storage/billing | `Booking`, `InventoryLot`, `InventoryTransaction`, `Invoice`, `InvoiceLineItem`, `Payment` |
| Operations | `TemperatureReading`, `Notification`, `IoTDevice`, `AuditLog` |
| Marketplace | `MarketListing`, `Order`, `FacilityReview` |
| Finance | `WarehouseReceipt`, `EscrowTransaction` |

Primary role enum: `SUPER_ADMIN`, `ADMIN`, `OWNER`, `STAFF`, `FARMER`, `BUYER`. The lifecycle enums cover user/KYC, facility/chamber, lot/quality/transaction, pricing/invoice, marketplace/order, booking, document, and notification states. Enumerations and scalar model types can be regenerated into `shared/types/index.ts`.

Important domain relationships: facilities own chambers, pricing, documents, lots and devices; lots link to depositors, chamber/facility, inventory transactions, marketplace listings, and an optional unique warehouse receipt; orders link a buyer to a listing and optionally one escrow record. Bookings connect a farmer with a facility and flow into warehouse operations.

### Backend test coverage

Jest setup is in `backend/jest.config.ts`. There are unit tests for auth and inventory services and integration tests for auth, facilities, inventory, invoices, marketplace, KYC, reviews, IoT devices, warehouse receipts, and escrow. There is no visible integration coverage for booking, chamber, pricing, analytics, notifications, reports, search, market prices, or temperature modules.

## 5. Web dashboard

The Next App Router source is in `frontend/src/app/`. `src/app/page.tsx` is the public landing experience; `src/app/(auth)/login` and `register` are authentication pages. `src/app/(dashboard)/layout.tsx` renders the admin sidebar for all non-WMS dashboard paths, while `wms/layout.tsx` owns the WMS sidebar/layout.

| Web area | Routes/features |
|---|---|
| Public | Landing, login, registration |
| Admin | Overview, analytics, facilities/detail, users, KYC, pricing, compliance, audit |
| WMS | Overview, facility/chambers/monitoring/pricing/settings, depositors/detail, inventory/intake/detail, invoices/create/detail |

Reusable UI is in `src/components/ui/`; charts in `components/charts/`; navigation in `components/layout/`; landing sections in `components/features/landing/`. Styling is CSS Modules plus `src/styles/globals.css` and `app/globals.css`. Client state uses Zustand (`stores/auth-store.ts` and `facility-store.ts`); fetch and token refresh logic is in `src/lib/api-client.ts` and reusable request hooks in `src/hooks/`.

Frontend-specific instruction: before making Next.js changes, read `frontend/AGENTS.md`. It requires consulting the installed Next 16 documentation for changed APIs/conventions.

## 6. Mobile application

Expo Router routes are under `mobile/app/`, with providers at the root for auth, offline synchronization, notifications, and toast UI.

| Audience | Route group | Key screens |
|---|---|---|
| Guest/auth | `(auth)` and `discover` | Login, registration, public facility discovery |
| Farmer | `(tabs)` | Dashboard, discovery, inventory, marketplace, profile; booking, lots, listings, orders, receipts, invoices |
| Buyer | `(buyer)` | Buyer home, orders, watchlist, profile; listing and order/payment flow |
| Owner/staff | `(owner)` | Operational home, bookings, QR scan, profile; weigh and booking operations |
| Shared | root routes | Notifications, market prices, settings, facility detail/review, KYC re-upload |

Mobile networking is in `mobile/lib/api-client.ts`; it queues opted-in offline writes via `offline-queue.ts`, supports idempotency keys, and refreshes tokens. UI primitives live in `mobile/components/ui/`; storage, localization, notifications, haptics, and KYC uploads live in `mobile/lib/`.

## 7. Current baseline and caution points

### Working-tree state

- The root repository has uncommitted backend schema/auth, frontend page/style/API-client edits and untracked frontend files/assets.
- `mobile/` is a nested Git repository rather than a configured root submodule. It also has many modified route/UI files and an untracked `GlassMeshBackground.tsx`.
- Do not use reset/checkout/clean while working here. Treat these changes as user work unless a future task explicitly scopes them.

### Validation run on this baseline

| Check | Result | Notes |
|---|---|---|
| `backend: npm run type-check` | Pass | TypeScript compiles without emitting output. |
| `frontend: npm run lint` | Fail | 151 errors and 52 warnings. Several are macOS AppleDouble `._*` files being linted; the remainder includes `any`, React hook-rule, and JSX-escaping violations. |
| `mobile: npx tsc --noEmit` | Fail | 5 errors: duplicate style property in `(tabs)/index.tsx`; invalid font weight, `StyleSheet.absoluteFillObject`, and unsupported `whiteSpace` styles in `discover.tsx`. |

The analysis did not run database-mutating integration tests or alter code. Backend tests may require a configured test database and environment values.

### Repository hygiene and design notes

- `._*` AppleDouble artifact files exist in source directories, including executable TypeScript locations. They are not source and currently break lint parsing; adding an ignore rule/removing only the artifacts should be a separately authorized cleanup task.
- Root `README.md` is empty. This reference currently fills the missing orientation role; a future task could derive a concise public README from it.
- The mobile release API base in `mobile/lib/api-client.ts` (`coldstorage-api.onrender.com`) differs from `mobile/contexts/AuthContext.tsx` (`api.coldstorage.in`). Consolidate this before production release.
- `shared/types/index.ts` is generated only from scalar schema fields and intentionally omits sensitive fields and relations. It is not a fully generated API contract.
- The long-term brief includes AI/voice/WhatsApp and external e-NAM/subsidy integrations, but the present source implements the operational platform, not those integrations.

## 8. Change checklist for future tasks

1. Identify the owning app/module above and inspect its route, service, client screen, and corresponding schema models together.
2. Preserve active working-tree changes; check both root Git status and `git -C mobile status` before touching mobile code.
3. If the Prisma schema changes: create/apply the appropriate migration, regenerate Prisma Client, then regenerate `shared/types/index.ts`.
4. Keep response envelopes, JWT authorization, Zod validation, audit behavior, and idempotency consistent with neighboring endpoints.
5. Validate at the narrowest useful scope first. Record pre-existing lint/type errors separately from errors introduced by a task.
6. Update this reference when an architectural, route, model, integration, or runbook change materially alters the map.
