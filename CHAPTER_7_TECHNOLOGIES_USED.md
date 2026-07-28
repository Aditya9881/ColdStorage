# CHAPTER 7: TECHNOLOGIES USED

---

## 7.1 Node.js & Express.js

The backend server of the **ColdStorage Ecosystem** is built on **Node.js (v22+)** and **Express.js (v5)**, forming an asynchronous, non-blocking RESTful API architecture.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXPRESS 5 SERVER PIPELINE                          │
├─────────────────────────────────────────────────────────────────────────┤
│ [Client Request]                                                        │
│        │                                                                │
│        ▼                                                                │
│  [Node.js 22 Runtime / Event Loop]                                      │
│        │                                                                │
│        ▼                                                                │
│  [Express 5 Middleware Chain]                                           │
│  - Helmet Security & CORS Headers                                       │
│  - Morgan Logging & Cookie Parser                                       │
│  - Redis Rate Limiter Guard                                             │
│  - JWT Bearer Authentication & RBAC Guard                              │
│  - Zod Request Schema Validation                                        │
│  - Idempotency Header Verification                                      │
│        │                                                                │
│        ▼                                                                │
│  [Controller Handler Execution] ──► [Prisma ORM] ──► [PostgreSQL 16]    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Characteristics:
- **Asynchronous Non-Blocking I/O:** Node.js leverages single-threaded event loops (libuv) to execute concurrent database, network, and file I/O operations without thread pool starvation.
- **Express 5 Routing & Middleware:** `src/app.ts` initializes Express 5, mounting modular feature routers (`/api/v1/auth`, `/api/v1/facilities`, `/api/v1/inventory`, etc.) behind strict middleware chains.
- **Standardized Response Envelopes:** Implements a unified response utility (`api-response.ts`), ensuring every endpoint returns a predictable JSON structure (`{ success: boolean, data?: T, meta?: object, error?: string }`).
- **Interactive Swagger Documentation:** Configured OpenAPI/Swagger UI mounted at `/api-docs` using source code JSDoc annotations in `src/shared/swagger.ts`.

---

## 7.2 PostgreSQL

**PostgreSQL (v16+)** serves as the primary relational database management system (RDBMS) for the platform, ensuring ACID compliance across all financial transactions, inventory ledgers, and user records.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      POSTGRESQL RELATIONAL ENGINE                       │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│    ACID Consistency      │    Advanced Data Types   │ Spatial & Indexing│
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ • Atomicity on payments  │ • UUID Primary Keys      │ • B-Tree Indexing │
│ • Strict FK isolation    │ • Native PostgreSQL Enums│   on User Roles   │
│ • Transactional rollback │ • JSONB Document fields  │ • Composite Index │
│ • Nodal Escrow safety    │ • Timestamptz Timestamps │   on Status/Type  │
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

### Key Technical Characteristics:
- **ACID Guarantees:** Ensures strict Atomicity and Isolation for multi-table writes—such as recording a crop intake, creating an `InventoryLot`, logging an `InventoryTransaction`, and issuing a `WarehouseReceipt` within a single database transaction.
- **Rich Scalar & Object Types:** Utilizes native `UUID` fields (`@db.Uuid`) for non-sequential primary keys, `Decimal` types (`@db.Decimal(12,2)`) for precise financial amounts, `JSONB` fields for dynamic device metadata, and native PostgreSQL Enums for status management.
- **High-Performance Indexing:** Indexing strategies (`@@index([role])`, `@@index([facilityId])`, `@@index([status])`) optimize query execution times across millions of records.

---

## 7.3 Prisma ORM

**Prisma 7** is used as the object-relational mapping (ORM) layer, bridging Node.js TypeScript code with the PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PRISMA ORM ARCHITECTURE                          │
├─────────────────────────────────────────────────────────────────────────┤
│  [Declarative Schema (schema.prisma)] ──► 23 Models & 18 Enums          │
│                    │                                                    │
│                    ▼                                                    │
│  [Prisma CLI Tools] ──► npx prisma migrate dev (SQL Migration Scripts)  │
│                    │                                                    │
│                    ▼                                                    │
│  [Prisma Client API] ──► Auto-generated Type-Safe Query Interface        │
│                    │                                                    │
│                    ▼                                                    │
│  [Type Generator Script] ──► node shared/generate-types.mjs              │
│                                  (Exports to shared/types/index.ts)     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Characteristics:
- **Declarative Schema Definition:** `backend/prisma/schema.prisma` models 23 core entities and 18 enums in clear, readable syntax with explicit foreign key relationships (`@relation`).
- **Type-Safe Database Access:** Prisma Client auto-generates TypeScript interfaces, providing compile-time type safety and preventing SQL injection vulnerabilities.
- **Automated Migration Workflow:** `npx prisma migrate dev` generates structured versioned SQL files in `backend/prisma/migrations/`.
- **Shared Type Generator (`generate-types.mjs`):** A custom Node.js script extracts scalar model fields from Prisma schema and outputs framework-independent TypeScript definitions to `shared/types/index.ts`.

---

## 7.4 Redis

**Redis 7** operates as an in-memory key-value cache, session manager, and rate-limiting engine.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDIS IN-MEMORY ENGINE                          │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│   Sliding-Window Rate    │  Token Blacklist Store   │ Idempotency Key   │
│        Limiting          │                          │     Caching       │
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ • Prevents DDoS & Brute  │ • Revokes Refresh Tokens │ • Stores API payload│
│   force attacks          │   upon user logout       │   for 24 hours    │
│ • Tracks IP / User ID    │ • Instant lookup time    │ • Prevents double │
│   request counters       │   (O(1) sub-millisecond) │   payments/intakes│
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

### Key Technical Characteristics:
- **High-Speed Rate Limiting (`rate-limiter.ts`):** Tracks incoming request frequencies using Redis keys with automatic expiration, protecting sensitive API routes from abuse.
- **Token Blacklisting & Revocation:** Provides sub-millisecond lookup times to verify whether a Refresh Token has been revoked upon logout.
- **Idempotency Enforcement (`idempotency.ts`):** Stores response payloads keyed by `X-Idempotency-Key` headers for 24 hours, returning cached results if a client retries a transaction.
- **Resilient Fallback Wrapper (`config/redis.ts`):** Implements a graceful degradation wrapper that falls back to in-memory maps if Redis is unavailable during local development.

---

## 7.5 Next.js

The web administration and WMS dashboards are built using **Next.js 16 (App Router)** and **React 19**.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS 16 APP ROUTER LAYOUT                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│                      [Root App Layout (layout.tsx)]                     │
│                                   │                                     │
│         ┌─────────────────────────┴─────────────────────────┐           │
│         ▼                                                   ▼           │
│ [Admin Dashboard Layout]                           [WMS Dashboard Layout]
│  - Overview Analytics                               - Chamber Visualizer
│  - Facility Verification                            - Weighbridge Intake
│  - KYC Approval Panel                               - PDF Invoicing     
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Characteristics:
- **App Router & Server Components:** Leverages file-based routing in `frontend/src/app` with React Server Components (RSC) for fast initial rendering and optimized client-side hydration.
- **Dual Layout System:** Configures distinct layout wrappers for Admin Governance (`(dashboard)/layout.tsx`) and Warehouse Management (`wms/layout.tsx`).
- **CSS Modules Styling:** Employs scoped CSS Modules (`*.module.css`) for UI component styling, preventing CSS scope pollution.
- **Zustand State Management:** Integrates with lightweight Zustand stores (`auth-store.ts`, `facility-store.ts`) for synchronized client state.

---

## 7.6 React Native (Expo)

The cross-platform mobile application is constructed using **Expo 56** and **React Native**, serving Farmers, Buyers, and Facility Staff.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       EXPO 56 MOBILE ARCHITECTURE                       │
├──────────────────────────┬──────────────────────────┬───────────────────┤
│  Expo Router File System │ Hardware Native Access   │ Offline Sync Queue│
├──────────────────────────┼──────────────────────────┼───────────────────┤
│ • (auth) Login & OTP     │ • Camera QR Code Scanner │ • Local Storage   │
│ • (tabs) Farmer Ledger   │ • GPS Location Discovery │   AsyncStorage    │
│ • (buyer) Marketplace    │ • Expo Haptics           │ • Flush queue upon│
│ • (owner) WMS Terminal   │ • Secure Token Storage   │   reconnection    │
└──────────────────────────┴──────────────────────────┴───────────────────┘
```

### Key Technical Characteristics:
- **File-Based Native Routing:** Uses **Expo Router** to manage deep links and nested role-based navigation tabs.
- **Native Device APIs:** Accesses camera hardware for gate pass QR scanning, GPS location services for spatial facility search (`discover.tsx`), and native haptics for touch feedback.
- **Offline Mutation Queue (`mobile/lib/offline-queue.ts`):** Serializes client operations during network outages into `AsyncStorage`, automatically flushing queued requests with idempotency headers when connectivity returns.

---

## 7.7 Docker

**Docker** and **Docker Compose** containerize the application infrastructure to ensure consistent execution environments across development and cloud deployment.

```yaml
# docker-compose.yml Architecture Summary
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    volumes: [postgres_data:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  api:
    build: ./backend
    ports: ["4000:4000"]
    environment: [DATABASE_URL, JWT_ACCESS_SECRET, ...]
```

### Key Technical Characteristics:
- **Containerized Local Stack:** `docker-compose up -d` spins up isolated PostgreSQL 16, Redis 7, and Node.js API containers in seconds.
- **Production Build Pipeline (`render-build`):** Configured Docker production builds on Render, compiling TypeScript assets and executing Prisma database migrations automatically upon deployment.

---

## 7.8 Git & GitHub

**Git** and **GitHub** provide distributed version control, source code tracking, and CI/CD automation.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       GIT & GITHUB WORKFLOW                             │
├─────────────────────────────────────────────────────────────────────────┤
│  [Local Worktree] ──► [Commit] ──► [Push to GitHub Main / Feature]      │
│                                                │                        │
│                                                ▼                        │
│  [GitHub Actions (.github/workflows/)] ──► Automated Lint & Build Test  │
│                                                │                        │
│                                                ▼                        │
│  [Cloud Deployment Triggers] ──► Render (API) & Vercel (Frontend Web)   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Characteristics:
- **Source Integrity & Hygiene:** Enforces feature branching and commit isolation. Protects production configurations through `.gitignore` rules masking environment secrets (`.env`, `.env.local`).
- **CI/CD Integration:** Integrates with **GitHub Actions (`.github/workflows/`)** to automatically execute code quality checks, ESLint verification, and build compilation scripts on push events.
