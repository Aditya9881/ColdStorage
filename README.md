# ColdStorage Ecosystem

AI-Driven Integrated Cold Storage Platform connecting administrators, facility owners/staff, farmers, and institutional buyers through role-specific digital interfaces.

## Architecture

```
┌─────────────────┐  ┌──────────────────┐  ┌───────────────────┐
│  Next.js Web    │  │  React Native    │  │  WhatsApp Bot     │
│  Admin + WMS    │  │  Farmer + Buyer  │  │  (Phase B)        │
│  :3000          │  │  Expo            │  │                   │
└────────┬────────┘  └────────┬─────────┘  └────────┬──────────┘
         │                    │                      │
         └────────────────────┼──────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Express.js API    │
                    │  Node.js + TS      │
                    │  :4000             │
                    └──┬──────────┬──────┘
                       │          │
              ┌────────▼──┐  ┌───▼──────┐
              │PostgreSQL │  │  Redis   │
              │  :5432    │  │  :6379   │
              └───────────┘  └──────────┘
```

## Quick Start

### Prerequisites

- **Node.js** ≥ 22.x
- **PostgreSQL** ≥ 16.x
- **Redis** ≥ 7.x (optional — falls back to in-memory)
- **Docker** + **Docker Compose** (alternative to manual setup)

### Option 1: Docker (Recommended)

```bash
# Start all services (PostgreSQL + Redis + Backend)
docker compose up -d

# Run database migrations
cd backend && npx prisma migrate deploy

# Seed with demo data
cd backend && npm run db:seed

# Backend API: http://localhost:4000/health
# Frontend: cd frontend && npm run dev  → http://localhost:3000
```

### Option 2: Manual Setup

```bash
# 1. Backend
cd backend
cp .env.example .env        # Edit DATABASE_URL, JWT secrets
npm install
npx prisma migrate dev      # Create DB + run migrations
npm run db:seed              # Seed demo data
npm run dev                  # Start → http://localhost:4000

# 2. Frontend
cd frontend
cp .env.example .env.local   # Edit API URL if needed
npm install
npm run dev                  # Start → http://localhost:3000

# 3. Mobile
cd mobile
npm install
npx expo start               # Scan QR with Expo Go
```

## Project Structure

```
ColdStorage/
├── backend/                 # Node.js + Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma    # 20+ models, 890 lines
│   │   ├── seed.ts          # Demo data seeder
│   │   └── migrations/
│   └── src/
│       ├── config/          # DB, Redis, Env, Logger
│       ├── modules/         # 22 feature modules
│       │   ├── auth/        # JWT auth + refresh tokens
│       │   ├── users/       # User CRUD + admin management
│       │   ├── facilities/  # Facility onboarding + verification
│       │   ├── chambers/    # Chamber CRUD + capacity
│       │   ├── inventory/   # Lot intake, release, transfer
│       │   ├── invoices/    # Billing + payment tracking
│       │   ├── pricing/     # Per-commodity pricing + admin caps
│       │   ├── temperature/ # IoT telemetry + MQTT + simulator
│       │   ├── notifications/ # Alerts + push service
│       │   ├── marketplace/ # Farmer listings
│       │   ├── orders/      # Buyer orders + OTP approval
│       │   ├── discovery/   # Geo-search for facilities
│       │   ├── market-prices/ # Mandi price data
│       │   ├── kyc/         # KYC document upload + review
│       │   ├── analytics/   # Macro dashboards
│       │   ├── reports/     # PDF generation
│       │   ├── audit/       # Immutable audit trail
│       │   ├── search/      # Global search
│       │   ├── iot-devices/ # IoT device registry
│       │   ├── reviews/     # Facility reviews + ratings
│       │   ├── warehouse-receipts/ # eNWR generation + pledge
│       │   └── escrow/      # Payment escrow lifecycle
│       └── shared/          # Middleware, schemas, utils
├── frontend/                # Next.js Admin + WMS Dashboard
│   └── src/
│       ├── app/
│       │   ├── (auth)/      # Login
│       │   └── (dashboard)/
│       │       ├── admin/   # 8 admin pages
│       │       └── wms/     # 10 WMS pages
│       ├── components/      # UI library (11 components)
│       ├── hooks/           # useApiQuery, useAuth, useTheme
│       ├── stores/          # Zustand auth + facility stores
│       └── lib/             # API client, formatters
├── mobile/                  # React Native (Expo) Farmer + Buyer App
│   ├── app/
│   │   ├── (auth)/          # Login, Register
│   │   ├── (tabs)/          # Home, Inventory, Discover, Marketplace, Profile
│   │   ├── (buyer)/         # Buyer-specific screens
│   │   ├── facility/        # Facility detail
│   │   ├── lots/            # Lot detail
│   │   ├── listing/         # Create/view marketplace listings
│   │   ├── orders/          # Order list + detail
│   │   ├── place-order/     # Order placement flow
│   │   ├── market-prices/   # Mandi prices
│   │   └── kyc/             # KYC re-upload
│   ├── components/          # Themed, AuthWall, SyncBadge, etc.
│   ├── contexts/            # Auth, Sync, Notification contexts
│   └── lib/                 # API client, offline queue, i18n, storage
├── shared/                  # Auto-generated shared types
└── docker-compose.yml       # PostgreSQL + Redis + Backend
```

## Demo Credentials

After running `npm run db:seed`:

| Role | Phone | Password |
|:---|:---|:---|
| Super Admin | 9999900001 | password123 |
| Facility Owner | 9999900002 | password123 |
| Staff | 9999900003 | password123 |
| Farmer | 9999900004 | password123 |
| Buyer | 9999900005 | password123 |

## API Endpoints

Base URL: `http://localhost:4000/api/v1`

| Module | Endpoints | Description |
|:---|:---|:---|
| `/auth` | POST login, register, refresh, logout | JWT authentication |
| `/users` | GET/PATCH/DELETE users | User management |
| `/facilities` | CRUD + verify + documents | Facility lifecycle |
| `/chambers` | CRUD | Chamber management |
| `/inventory` | Intake, release, transfer, quality | Lot management |
| `/invoices` | CRUD + payments | Billing |
| `/pricing` | CRUD + admin approval | Rate management |
| `/temperature` | Readings + alerts | IoT telemetry |
| `/notifications` | List + mark read | User notifications |
| `/marketplace` | Listings CRUD | Farmer sell listings |
| `/orders` | Place + approve/reject + OTP | Order flow |
| `/discover` | Geo search | Facility discovery |
| `/market-prices` | Live prices | Mandi price data |
| `/kyc` | Upload + review | KYC documents |
| `/analytics` | Dashboard stats | Platform analytics |
| `/reports` | PDF generation | Reports |
| `/audit` | Trail browsing | Audit logs |
| `/search` | Global search | Cross-entity search |
| `/iot-devices` | CRUD + heartbeat | IoT device registry |
| `/reviews` | CRUD + ratings | Facility reviews |
| `/warehouse-receipts` | Generate + pledge/redeem | eNWR management |
| `/escrow` | Pay + release + refund + dispute | Payment escrow |

## Tech Stack

- **Backend:** Node.js, Express 5, TypeScript, Prisma ORM
- **Database:** PostgreSQL 16, Redis 7
- **Frontend:** Next.js 16, React 19, Zustand, Framer Motion
- **Mobile:** React Native 0.85, Expo 56, Expo Router
- **IoT:** MQTT (mqtt.js), Temperature simulator
- **Auth:** JWT with refresh token rotation, bcrypt
- **Validation:** Zod schemas
- **PDF:** PDFKit

## Development Phases

- [x] **Phase 1** — Core Web Ecosystem (DB, Admin, WMS)
- [x] **Phase 2** — Mobile Apps (Farmer + Buyer) + Marketplace
- [ ] **Phase A** — Hardening & Polish (in progress)
- [ ] **Phase B** — Conversational AI & Voice (Bhashini, Sarvam, WhatsApp)
- [ ] **Phase C** — National Scaling (e-NAM, WDRA, Payment Gateway)
- [ ] **Phase D** — Production Infrastructure (K8s, Monitoring, Security)

## License

Proprietary — All rights reserved.
