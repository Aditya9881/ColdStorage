
# ColdStorage — AI-Driven Cold Storage Ecosystem
A production-oriented, full-stack platform connecting **farmers**, **cold-storage owners**, **facility staff**, **commodity buyers**, and **platform administrators**. ColdStorage combines storage discovery and booking, lot and inventory operations, marketplace trading, escrow-protected orders, digital warehouse receipts, IoT monitoring, multilingual mobile experiences, notifications, and WhatsApp-assisted workflows in one monorepo.

> **Repository status:** Active development. The web, mobile, and backend applications are integrated, but production credentials, infrastructure, messaging providers, and deployment configuration must be supplied by each environment.
## Product Capabilities
### Farmer
- Discover verified cold-storage facilities and review their capacity, pricing, chambers, amenities, and reviews.
- Create and track storage bookings through the full booking lifecycle.
- View stored lots, inventory health, invoices, receipts, and release details.
- Browse mandi prices and marketplace listings.
- Create produce listings, review buyer orders, and manage dispatch.
- Use Hindi or English mobile interfaces, offline-aware actions, push notifications, and WhatsApp-assisted flows.
### Buyer
- Browse and search commodity listings.
- Maintain a watchlist and inspect listing details.
- Place orders, complete payment flows, and monitor order status.
- Track escrow state, invoices, dispatch, and delivery.
- Manage profile, notifications, and account preferences from a buyer-specific mobile experience.
### Owner and Staff
- Operate cold-storage facilities from the WMS web dashboard and owner mobile application.
- Manage chambers, available capacity, pricing, bookings, depositors, inventory, invoices, and facility settings.
- Verify farmer arrivals and booking QR codes.
- Record weighing, intake, storage, dispatch, and release events.
- Register IoT devices and monitor temperature and chamber conditions.
- Issue warehouse receipts and review operational analytics and alerts.
### Admin
- Review users, facilities, KYC submissions, and verification queues.
- Manage pricing and compliance workflows.
- Inspect audit logs and platform analytics.
- Supervise facilities, users, and operational activity through the web console.
## Architecture
```text
┌───────────────────────────┐     ┌───────────────────────────┐
│ Web application           │     │ Mobile application        │
│ Next.js 16 + React 19     │     │ Expo 56 + React Native    │
│ Admin + WMS dashboards    │     │ Farmer + Buyer + Owner    │
│ Cookie-based web sessions │     │ Bearer-token sessions     │
└──────────────┬────────────┘     └──────────────┬────────────┘
               │                                 │
               └──────────────┬──────────────────┘
                              │ REST /api/v1
                    ┌─────────▼──────────┐
                    │ Express 5 API      │
                    │ TypeScript         │
                    │ Prisma 7 + pg      │
                    └──────┬───────┬─────┘
                           │       │
                  ┌────────▼───┐ ┌─▼─────────────┐
                  │ PostgreSQL │ │ Redis         │
                  │ system of  │ │ cache, rate   │
                  │ record     │ │ limits, state │
                  └────────────┘ └───────────────┘
                           │
                 ┌─────────▼──────────┐
                 │ MQTT / IoT devices │
                 │ temperature events │
                 └────────────────────┘
```
### Applications
| Application | Stack | Primary users | Authentication |
|---|---|---|---|
| `frontend/` | Next.js 16, React 19, TypeScript, Zustand, Recharts, Framer Motion | Admin, Owner, Staff | Secure cookie-based web session |
| `mobile/` | Expo 56, React Native 0.85, React 19, Expo Router | Farmer, Buyer, Owner | Bearer access and refresh tokens |
| `backend/` | Express 5, TypeScript, Prisma 7, PostgreSQL, Redis | All clients and integrations | JWT, role authorization, CSRF protection for production cookie requests |
| `shared/` | Type generation scripts | All applications | Not applicable |
## Current Feature Set
| Domain | Implemented scope |
|---|---|
| Authentication | Registration, login, phone OTP verification, access/refresh tokens, sessions, logout, password reset, profile updates, role-based access |
| KYC | Farmer, buyer, owner and facility documentation; authenticated document access; review and re-upload flows |
| Facility discovery | Search, facility details, capacity, chambers, pricing, reviews, comparison and discovery endpoints |
| Bookings | Farmer booking creation, owner/staff management, status transitions, OTP support, QR verification and weighing workflow |
| Inventory | Lot intake, stored-lot tracking, transactions, transfer/release operations, receipts, gate passes and farmer lot-health views |
| Marketplace | Listings, commodity discovery, watchlist-oriented buyer UI, order creation, approval/rejection, dispatch and completion |
| Payments and escrow | Payment records, escrow funding/status, release, refund and dispute workflows |
| Invoices and receipts | Invoice creation and retrieval, PDF-oriented flows, warehouse receipts, pledge and redemption operations |
| IoT monitoring | Device registration, heartbeat, MQTT ingestion, temperature history, local development simulator and alert engine |
| Notifications | In-app notifications, read state, push-token registration, operational and temperature alerts |
| Market intelligence | Mandi/market-price endpoints and farmer mobile price views |
| WhatsApp | Meta webhook verification and inbound handling; Hindi/English menus; booking, booking-status, mandi-price, profile and dispatch flows |
| Platform operations | Analytics, reports, audit logs, pricing, compliance, users and admin verification workflows |
| Mobile resilience | Secure token storage, connectivity awareness, offline queue, sync status, push notifications and shared loading/error/empty states |
## Mobile Experience
The Expo application uses role-specific navigation rather than forcing every user into the same dashboard:

- **Farmer:** home, facility discovery, storage booking, bookings, inventory, mandi prices, marketplace, lots, invoices, receipts and profile.
- **Buyer:** marketplace-oriented home, watchlist, orders, payment and escrow status, and profile.
- **Owner:** facility overview, bookings, arrival/QR scanning, weighing and profile.

The roles share a design system—typography, spacing, buttons, cards, chips, feedback states and navigation conventions—while preserving role-appropriate information architecture. The component library includes glass and premium cards, gradient buttons, progress indicators, search, status chips, bottom sheets, skeletons, toasts, and standardized empty and error states.

Hindi and English translations are included, with device-locale detection and manual language selection. The project is structured so additional regional languages can be introduced without redesigning core flows.
## WhatsApp Integration
The backend includes a WhatsApp Business webhook at:

```text
GET  /api/v1/whatsapp/webhook
POST /api/v1/whatsapp/webhook
```

Current flows cover:

- Hindi and English language selection.
- Main-menu navigation.
- Storage booking assistance.
- Booking list and booking-detail lookup.
- Mandi-price lookup.
- Profile assistance.
- Dispatch-related actions.

The integration requires a Meta WhatsApp Business configuration and the environment variables documented below. Before public production launch, configure approved templates, webhook security, monitoring, retention policy, human escalation and provider-specific limits.
## Backend Modules
The REST API is mounted under `/api/v1` and currently includes:

```text
auth                 users                facilities
chambers             inventory            invoices
pricing              analytics            temperature
notifications        reports              audit
search               discover             marketplace
orders               market-prices        kyc
bookings             iot-devices          reviews
warehouse-receipts   escrow               files
whatsapp
```

API documentation is served at `/api/docs`, and the OpenAPI JSON document is available through the Swagger setup. The service health endpoint is `GET /health`.
## Repository Structure
```text
.
├── .github/
│   └── workflows/
│       └── ci.yml                 # Backend, frontend and mobile CI checks
├── backend/
│   ├── prisma/
│   │   ├── migrations/            # PostgreSQL migrations
│   │   ├── schema.prisma          # Data model and enums
│   │   ├── seed.ts                # Base seed data
│   │   └── seed-phase2.ts         # Extended development data
│   ├── scripts/                   # Backend operational scripts
│   ├── src/
│   │   ├── config/                # Environment, DB, Redis, logger, Sentry
│   │   ├── modules/               # Domain-oriented API modules
│   │   │   ├── auth/
│   │   │   ├── bookings/
│   │   │   ├── facilities/
│   │   │   ├── inventory/
│   │   │   ├── marketplace/
│   │   │   ├── orders/
│   │   │   ├── temperature/
│   │   │   ├── whatsapp/
│   │   │   └── ...
│   │   └── shared/                # Middleware, schemas, routes, services, utils
│   ├── tests/
│   │   ├── integration/
│   │   └── unit/
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── public/
│   └── src/
│       ├── app/
│       │   ├── (auth)/            # Login, registration, password recovery
│       │   ├── (dashboard)/
│       │   │   ├── admin/         # Admin and compliance console
│       │   │   └── wms/           # Owner/staff warehouse dashboard
│       │   └── discover/          # Public discovery experience
│       ├── components/            # Layout, UI, charts and feature components
│       ├── hooks/                 # Reusable hooks and tests
│       ├── lib/                   # API and application utilities
│       ├── stores/                # Zustand stores
│       ├── styles/
│       └── types/
├── mobile/
│   ├── app/
│   │   ├── (auth)/                # Mobile authentication
│   │   ├── (tabs)/                # Farmer navigation
│   │   ├── (buyer)/               # Buyer navigation
│   │   ├── (owner)/               # Owner navigation
│   │   ├── booking/               # Booking detail routes
│   │   ├── facility/              # Facility details and reviews
│   │   ├── invoices/              # Invoice routes
│   │   ├── lots/                  # Inventory-lot details
│   │   ├── orders/                # Order, payment and escrow routes
│   │   └── receipts/              # Warehouse receipt routes
│   ├── assets/
│   ├── components/
│   │   └── ui/                    # Shared mobile design system
│   ├── constants/
│   ├── contexts/                  # Auth, notifications and synchronization
│   ├── hooks/
│   ├── lib/                       # API, i18n, secure storage, offline queue
│   ├── app.json
│   ├── eas.json
│   └── package.json
├── shared/
│   ├── generate-types.mjs
│   └── types/
├── DEPLOYMENT.md
├── vercel.json
└── README.md
```
## Technology Stack
### Backend
- Node.js 22 and TypeScript.
- Express 5 REST API.
- PostgreSQL with Prisma 7 and the `pg` adapter.
- Redis with graceful in-memory degradation where supported.
- JWT authentication, bcrypt password hashing and Zod validation.
- Helmet, CORS allowlisting, compression, rate limiting, input sanitization and production CSRF protection.
- MQTT ingestion for IoT telemetry.
- Swagger/OpenAPI documentation.
- Jest, Supertest and ts-jest for unit and integration tests.
### Web
- Next.js 16 App Router.
- React 19 and TypeScript.
- Zustand state management.
- Recharts, Framer Motion and Lucide icons.
- Vitest and Testing Library infrastructure.
### Mobile
- Expo 56 and Expo Router.
- React Native 0.85 and React 19.
- Expo Camera for QR scanning.
- Expo Notifications, Location, Localization, SecureStore and Image Picker.
- AsyncStorage, NetInfo and an offline action queue.
- Reanimated, SVG, blur and linear-gradient UI primitives.
- EAS development, preview and production build profiles.
## Prerequisites
- **Node.js 22 or later**.
- **npm** compatible with the lockfiles.
- **PostgreSQL** (PostgreSQL 16 is used in CI).
- **Redis 7** recommended; the API can start without Redis with reduced caching/rate-limit capabilities.
- **Expo-compatible Android or iOS environment** for native development.
- **Docker** is optional for containerized backend development; no root `docker-compose.yml` is currently committed.
## Quick Start
### Clone and install
```bash
git clone https://github.com/Aditya9881/ColdStorage.git
cd ColdStorage

cd backend && npm ci
cd ../frontend && npm ci
cd ../mobile && npm ci
```
### Configure PostgreSQL
Create a PostgreSQL database and set `DATABASE_URL` in `backend/.env`.

```bash
cd backend
cp .env.example .env
```

Example local connection:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/coldstorage_dev?schema=public
```

Update both JWT secrets before starting the API. Production secrets must be long, random values and must not include placeholder terms.
### Initialize the backend
```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npm run db:seed            # Optional development/demo data
npm run dev
```

The API starts at `http://localhost:4000` by default.

Useful local URLs:

```text
API base:      http://localhost:4000/api/v1
Health check:  http://localhost:4000/health
API docs:      http://localhost:4000/api/docs
```
### Start the web app
Create `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Then run:

```bash
cd frontend
npm run dev
```

The web application starts at `http://localhost:3000`.
### Start the mobile app
Set the mobile API URL before starting Expo. Use a LAN-accessible host or deployed API when running on a physical device; `localhost` on the phone points to the phone itself.

```dotenv
EXPO_PUBLIC_API_URL=http://YOUR_LAN_IP:4000/api/v1
```

```bash
cd mobile
npm start
# or
npm run android
npm run ios
```
## Environment Variables
### Backend
Copy `backend/.env.example` to `backend/.env`. The committed example contains the required core variables; optional integration variables should be added only when enabling the related service.

| Variable | Required | Default | Purpose |
|---|---:|---|---|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Yes | — | Access-token signing secret |
| `JWT_REFRESH_SECRET` | Yes | — | Refresh-token signing secret |
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `4000` | HTTP port |
| `API_PREFIX` | No | `/api/v1` | REST API prefix |
| `JWT_ACCESS_EXPIRY` | No | `15m` | Access-token lifetime |
| `JWT_REFRESH_EXPIRY` | No | `7d` | Refresh-token lifetime |
| `BCRYPT_SALT_ROUNDS` | No | `12` | Password hashing work factor |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | API rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Maximum requests in the window |
| `CORS_ORIGIN` | No | Local web origins | Comma-separated exact origin allowlist |
| `VERCEL_PROJECT_DOMAIN` | Production web | — | Allows matching Vercel production/preview domains |
| `REDIS_URL` | Recommended | `redis://127.0.0.1:6379` | Redis cache and shared state |
| `DB_POOL_MAX` | No | `10` | PostgreSQL pool size |
| `DB_IDLE_TIMEOUT` | No | `30000` | Pool idle timeout in milliseconds |
| `DB_CONNECT_TIMEOUT` | No | `10000` | Database connection timeout in milliseconds |
| `MSG91_AUTH_KEY` | OTP production | — | MSG91 authentication key |
| `MSG91_TEMPLATE_ID` | OTP production | — | MSG91 OTP template |
| `MSG91_APPROVAL_TEMPLATE_ID` | Optional | — | MSG91 approval notification template |
| `MSG91_SENDER_ID` | Optional | — | SMS sender identifier |
| `DATA_GOV_API_KEY` | Market data | — | Data-provider API key for market prices |
| `MQTT_BROKER_URL` | IoT production | — | MQTT broker URL; development simulator runs when absent |
| `MQTT_USERNAME` | Optional | — | MQTT username |
| `MQTT_PASSWORD` | Optional | — | MQTT password |
| `ALERT_CHECK_INTERVAL_MS` | No | Service default | Alert-engine polling interval |
| `WHATSAPP_ACCESS_TOKEN` | WhatsApp | — | Meta WhatsApp Cloud API access token |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp | — | WhatsApp Business phone-number ID |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp | — | Webhook verification token; set explicitly in production |
| `SENTRY_DSN` | Optional | — | Backend error-monitoring DSN |
| `LOG_LEVEL` | No | `debug` | Application log level |
### Frontend
Create `frontend/.env.local`:

| Variable | Required | Purpose |
|---|---:|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API base URL, normally ending in `/api/v1` |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Browser-side monitoring DSN |
### Mobile
Set locally or through EAS environment configuration:

| Variable | Required | Purpose |
|---|---:|---|
| `EXPO_PUBLIC_API_URL` | Yes | Backend API base URL, reachable from the device |

Never commit production credentials, signing keys, private database URLs or provider tokens.
## Available Scripts
### Backend
```bash
npm run dev             # TypeScript development server with watch mode
npm run build           # Generate Prisma Client and compile TypeScript
npm run start           # Apply migrations and start compiled API
npm run render-build    # Install, generate Prisma Client and compile on Render
npm run type-check      # TypeScript check without emission
npm test                # Jest test suite
npm run test:watch      # Jest watch mode
npm run db:generate     # Generate Prisma Client
npm run db:migrate      # Create/apply a development migration
npm run db:push         # Push schema without creating a migration
npm run db:seed         # Seed development data
npm run db:studio       # Open Prisma Studio
npm run db:reset        # Reset the development database
```
### Frontend
```bash
npm run dev             # Next.js development server
npm run build           # Production build
npm run start           # Start the production build
npm run lint            # ESLint
npm test                # Vitest suite
npm run test:watch      # Vitest watch mode
npm run test:coverage   # Vitest coverage run
```
### Mobile
```bash
npm start               # Expo development server
npm run android         # Native Android development build/run
npm run ios             # Native iOS development build/run
npm run web             # Expo web development server
npx tsc --noEmit        # Mobile type check
```
## Database and Migrations
The Prisma schema contains the platform’s users and sessions, KYC documents, facilities and chambers, bookings, inventory lots and transactions, invoices, pricing, listings, orders, payments, escrow transactions, reviews, notifications, temperature readings, IoT devices, warehouse receipts, audit logs and WhatsApp sessions.

Use migrations for every production schema change:

```bash
cd backend
npm run db:migrate      # Development: create and apply migration
npx prisma migrate deploy  # Staging/production: apply committed migrations
```

Do not use `prisma db push` against production databases. Back up the production database before applying destructive or high-risk migrations.
## Testing and CI
GitHub Actions runs on pushes and pull requests to `main` and `develop`:

- Backend: dependency installation, Prisma generation, type checking, migrations and Jest tests against PostgreSQL 16 and Redis 7.
- Frontend: ESLint and TypeScript checks.
- Mobile: TypeScript checks.

Run the equivalent checks locally before opening a pull request:

```bash
cd backend
npm run type-check
npm test

cd ../frontend
npm run lint
npx tsc --noEmit
npm test

cd ../mobile
npx tsc --noEmit
```

Backend tests cover authentication, bookings, escrow, facilities, inventory, invoices, IoT devices, KYC, marketplace, reviews and warehouse receipts, plus selected unit-level services.
## Security and Reliability
The API includes:

- Role-based authorization for Farmer, Buyer, Owner, Staff, Admin and Super Admin operations.
- Short-lived access tokens and refresh-token sessions.
- Production JWT-secret strength validation.
- Password hashing with bcrypt.
- Request validation and input sanitization.
- Helmet security headers and compression.
- API and authentication rate limiting.
- Exact-origin CORS allowlisting with optional Vercel project-domain handling.
- HTTPS enforcement and CSRF checks in production.
- Authenticated KYC file downloads; public production access to uploaded identity documents is disabled.
- Database health checks, graceful process shutdown and background cleanup of expired sessions and OTPs.
- Optional Sentry integration.
- Redis fallback for supported cache and rate-limit operations.

Production note: uploaded files are written to local storage by the current implementation. Use durable object storage before relying on uploads in an ephemeral container environment.
## IoT and Alerts
When `MQTT_BROKER_URL` is configured, the backend starts MQTT ingestion for device telemetry. In development, when no broker is configured, a temperature simulator supplies local test readings. The alert engine runs alongside the API and evaluates operational conditions using its configured interval.

Production deployments should use authenticated and encrypted MQTT connections, per-device credentials, topic-level authorization, device rotation procedures and monitoring for stale heartbeats.
## Deployment
### Backend
The repository contains a multi-stage `backend/Dockerfile` running on Node.js 22 Alpine as a non-root user. The backend package also provides Render-oriented build and start scripts:

```text
Root directory: backend
Build command:  npm run render-build
Start command:  npm run start
Health check:   /health
```

Set all required backend variables in the hosting provider. Attach a production PostgreSQL instance and, preferably, Redis. Run committed Prisma migrations as part of the release process.
### Frontend
Deploy `frontend/` to Vercel or another Next.js-compatible service:

```text
Root directory: frontend
Build command:  npm run build
Environment:    NEXT_PUBLIC_API_URL=https://API_HOST/api/v1
```

Add the deployed web origin to backend `CORS_ORIGIN`. If Vercel preview URLs are used, configure `VERCEL_PROJECT_DOMAIN` carefully instead of allowing every `*.vercel.app` origin.
### Mobile
The EAS configuration defines development, preview and production profiles. The Android production profile creates an app bundle.

```bash
cd mobile

eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform ios --profile production

eas submit --platform android --profile production
eas submit --platform ios --profile production
```

Configure `EXPO_PUBLIC_API_URL` and signing credentials through EAS. Validate deep links, push-notification credentials, camera permissions, image permissions and production API connectivity before submission.
## API Usage
All protected mobile/API requests use an access token:

```http
Authorization: Bearer <access-token>
```

Web requests use the configured secure cookie flow. Mutating cookie-authenticated requests in production also require the CSRF mechanism implemented by the backend.

Swagger UI:

```text
http://localhost:4000/api/docs
```

Health check:

```text
http://localhost:4000/health
```
## Development Guidelines
- Preserve role-based behavior; do not make Farmer, Buyer and Owner dashboards identical.
- Reuse shared design-system components while keeping role-specific workflows and information hierarchy.
- Keep API contracts, generated shared types and client behavior synchronized.
- Add a Prisma migration for schema changes.
- Add or update tests for business-critical changes.
- Never log passwords, OTPs, access tokens, KYC identifiers or provider credentials.
- Keep Hindi and English copy aligned when changing user-facing mobile text.
- Treat WhatsApp, SMS, push, MQTT and market-data services as external dependencies with explicit failure handling.
## Production Checklist
- [ ] Use a paid or otherwise production-supported PostgreSQL plan with automated backups and restore testing.
- [ ] Configure Redis for shared rate limits, caching and conversation state.
- [ ] Generate strong, independent access and refresh secrets.
- [ ] Restrict `CORS_ORIGIN` and configure the exact Vercel project domain.
- [ ] Configure MSG91, WhatsApp, market-data and MQTT credentials only where needed.
- [ ] Move uploads/KYC documents to encrypted durable object storage.
- [ ] Enable monitoring, error reporting, uptime checks and structured log retention.
- [ ] Apply migrations and execute backend, frontend and mobile checks.
- [ ] Validate RBAC for Farmer, Buyer, Owner, Staff, Admin and Super Admin accounts.
- [ ] Test booking, QR, payment, escrow, inventory and release workflows end to end.
- [ ] Verify Hindi/English copy, offline behavior and physical-device API connectivity.
- [ ] Configure EAS signing and push-notification credentials.
- [ ] Document backup, rollback, incident-response and credential-rotation procedures.
## Project Status
The repository already contains substantial production-oriented foundations, including security middleware, tests, CI, role-specific web and mobile routes, IoT ingestion, operational alerts, escrow, digital warehouse receipts and WhatsApp flows. Some infrastructure and integrations remain environment-dependent. A feature should be considered production-ready only after its provider credentials, failure paths, observability, data retention, security review and end-to-end tests are completed.
## License
Private — All rights reserved.
