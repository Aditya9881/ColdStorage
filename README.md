# ColdStorage — AI-Driven Cold Storage Ecosystem
 
A full-stack platform connecting **farmers**, **cold storage owners**, and **commodity buyers** with real-time inventory management, booking, marketplace, and IoT monitoring.

## Architecture 

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Frontend   │    │    Mobile    │    │   Backend    │
│  Next.js 16  │    │  Expo 56    │    │  Express 5   │
│   React 19   │    │  React Nat. │    │  Prisma 7    │
│  (Admin/WMS) │    │ (Farmer/    │    │  PostgreSQL  │
│              │    │  Buyer/Owner)│    │  Redis 7     │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │ cookies           │ bearer            │ 
       └───────────────────┴───────────────────┘
                     REST API /api/v1
```

### User Roles
| Role | Platform | Purpose |
|------|----------|---------|
| **Farmer** | Mobile | Discover facilities, book storage, manage inventory, sell on marketplace |
| **Buyer** | Mobile | Browse marketplace, place orders, track purchases |
| **Owner** | Web (WMS) + Mobile | Manage facility, chambers, bookings, inventory, invoicing |
| **Staff** | Web (WMS) | Day-to-day facility operations (intake, release, monitoring) |
| **Admin** | Web (Admin) | Platform administration, KYC review, facility verification |

## Prerequisites

- **Node.js** 22+
- **PostgreSQL** 16+
- **Redis** 7+ (optional — app degrades gracefully without it)
- **Docker** (for local infra via docker-compose)

## Quick Start

### 1. Infrastructure

```bash
# Start PostgreSQL + Redis
docker compose up -d
```

### 2. Backend

```bash
cd backend
cp .env.example .env          # Configure your env vars
npm install
npx prisma generate           # Generate Prisma client
npx prisma migrate deploy     # Run migrations
npx prisma db seed             # Seed demo data (optional)
npm run dev                    # Start dev server → http://localhost:4000
```

### 3. Frontend (Admin + WMS Dashboard)

```bash
cd frontend
npm install
npm run dev                    # Start Next.js → http://localhost:3000
```

### 4. Mobile (Farmer/Buyer/Owner App)

```bash
cd mobile
npm install
npx expo start                 # Start Expo dev server
# Press 'a' for Android emulator, 'i' for iOS simulator
```

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | ✅ | — | JWT signing key (min 32 chars in prod) |
| `JWT_REFRESH_SECRET` | ✅ | — | Refresh token signing key |
| `JWT_ACCESS_EXPIRY` | — | `15m` | Access token lifetime |
| `JWT_REFRESH_EXPIRY` | — | `7d` | Refresh token lifetime |
| `REDIS_URL` | — | — | Redis connection (optional) |
| `CORS_ORIGIN` | — | `localhost` | Comma-separated allowed origins |
| `PORT` | — | `4000` | Server port |
| `NODE_ENV` | — | `development` | Environment |
| `MSG91_AUTH_KEY` | — | — | SMS OTP provider key |
| `MSG91_TEMPLATE_ID` | — | — | OTP template ID |
| `ALERT_CHECK_INTERVAL_MS` | — | `300000` | Alert engine check interval |

### Frontend (`frontend/.env.local`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | ✅ | — | Backend API base URL |

## Available Scripts

### Backend
```bash
npm run dev           # Development server with hot reload (tsx watch)
npm run build         # Build for production
npm run start         # Start production server
npm test              # Run tests (Jest)
npm run db:migrate    # Create new migration
npm run db:studio     # Open Prisma Studio GUI
npm run db:seed       # Seed database
```

### Frontend
```bash
npm run dev           # Next.js dev server
npm run build         # Production build
npm run lint          # ESLint check
```

### Mobile
```bash
npx expo start        # Start Expo dev server
npx expo start --ios  # iOS simulator
npx expo start --android  # Android emulator
eas build --platform android --profile preview  # Build APK
```

## Project Structure

```
├── backend/
│   ├── prisma/              # Schema, migrations, seeds
│   ├── src/
│   │   ├── config/          # Database, Redis, env, logger
│   │   ├── modules/         # Feature modules
│   │   │   ├── auth/        # Login, register, OTP, JWT
│   │   │   ├── bookings/    # Storage booking lifecycle
│   │   │   ├── facilities/  # Facility CRUD + verification
│   │   │   ├── inventory/   # Lot intake, release, transfer
│   │   │   ├── marketplace/ # Commodity listings
│   │   │   ├── orders/      # Buy/sell order management
│   │   │   ├── notifications/ # In-app + alert engine
│   │   │   └── ...          # chambers, invoices, kyc, etc.
│   │   └── shared/          # Middleware, utils, schemas
│   └── tests/               # Unit + integration tests
│
├── frontend/
│   └── src/
│       ├── app/             # Next.js App Router pages
│       │   ├── (auth)/      # Login, register
│       │   └── (dashboard)/ # Admin + WMS routes
│       ├── components/      # Reusable UI components
│       ├── lib/             # API client, utilities
│       └── stores/          # Zustand state management
│
├── mobile/
│   ├── app/                 # Expo Router screens
│   │   ├── (auth)/          # Login
│   │   ├── (tabs)/          # Farmer tabs (home, inventory, etc.)
│   │   ├── (buyer)/         # Buyer tabs
│   │   └── (owner)/         # Owner mobile tabs
│   ├── contexts/            # Auth, Sync, Notification providers
│   └── lib/                 # API client, offline queue, i18n
│
├── shared/                  # Cross-project type generation
├── docker-compose.yml       # Local PostgreSQL + Redis
└── .github/workflows/       # CI pipeline
```

## Deployment

### Backend (Render)
- Build command: `npm run render-build`
- Start command: `npm run start`
- Runs migrations automatically during build

### Frontend (Vercel)
- Framework: Next.js (auto-detected)
- Set `NEXT_PUBLIC_API_URL` in Vercel environment

### Mobile (EAS)
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
eas submit --platform android
eas submit --platform ios
```

## API Documentation

Swagger UI available at: `http://localhost:4000/api-docs` (dev mode)

## License

Private — All rights reserved.
