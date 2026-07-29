# COLDSTORAGE ECOSYSTEM (AGROGENCE) — SHORT TECH STACK TABLE

---

## 📊 CONCISE PPT TECH STACK TABLE

| Layer / Component | Technology Used | Version / Stack | Primary Function in Project |
|---|---|---|---|
| **Backend REST API** | Node.js & Express.js | Node 22 / Express 5 | Asynchronous REST API server routing 23 feature modules. |
| **Language & Validation**| TypeScript & Zod | TS 5.x / Zod 3.x | Strict end-to-end type safety & runtime schema validation. |
| **Relational Database** | PostgreSQL | v16+ | ACID-compliant relational persistence (23 models, 18 enums). |
| **Database ORM** | Prisma ORM | v7.0 | Declarative schema modeling, migrations & type-safe queries. |
| **Caching & Security** | Redis | v7.0 | Sliding-window rate limiting, token blacklist & idempotency keys. |
| **Web Dashboards** | Next.js & React | Next 16 / React 19 | Admin Governance & Cold Storage Owner WMS (App Router). |
| **Web Styling & State**| CSS Modules & Zustand | — | Scoped component styling & global client state stores. |
| **Mobile Application** | Expo & React Native | Expo SDK 56 | Cross-platform native app for Farmers, Buyers, and Staff. |
| **Mobile Hardware APIs**| Camera, GPS & Haptics | — | Gate pass QR scanning, spatial facility search & touch feedback. |
| **Offline Sync Engine** | Client Queue & AsyncStorage | — | Offline action serialization & automatic idempotency flushing. |
| **Auth & Verification** | Dual JWT & MSG91 SMS | — | 15m Access / 7d Refresh tokens & passwordless 2-factor OTP. |
| **PDF & Utilities** | PDF Generator & Barcodes | — | Server PDF invoice rendering (`pdf-generator.ts`) & lot barcodes. |
| **DevOps & Containers** | Docker, Render, Vercel | — | Local multi-container stack, Render API & Vercel Web deployment. |
| **Future IoT & AI Specs**| ESP32, Bhashini, Sarvam AI | — | Post-internship MQTT edge telemetry & 22-language Voice AI. |

---

## 📋 DETAILED MULTI-TIER TECH STACK BREAKDOWN

### 1. Backend REST API Tier
- **Runtime:** Node.js v22+ (libuv event loop)
- **Framework:** Express.js v5.0 (`backend/src/app.ts`)
- **Validation:** Zod v3.x (`validate.ts`)
- **Authentication:** Dual JWT (Access 15m / Refresh 7d) + MSG91 SMS Gateway
- **Documentation:** Swagger UI / OpenAPI 3.0 (`swagger.ts`)

### 2. Database & Caching Tier
- **Database:** PostgreSQL v16+ (ACID compliance, B-Tree indexes)
- **ORM:** Prisma v7.0 (`backend/prisma/schema.prisma`)
- **Caching:** Redis v7.0 (Rate limiter, token blacklist, 24h idempotency keys)
- **Cache Fallback:** Resilient in-memory wrapper (`config/redis.ts`)

### 3. Web Administration Tier (Next.js 16)
- **Framework:** Next.js v16.0 (App Router) & React v19.0
- **Styling:** CSS Modules (`*.module.css`) + Global CSS
- **State Management:** Zustand (`auth-store.ts`, `facility-store.ts`)
- **API Client:** Axios interceptors (`api-client.ts`) with transparent 401 refresh

### 4. Mobile Application Tier (Expo 56)
- **Framework:** Expo SDK 56 / React Native (`mobile/app/`)
- **Navigation:** Expo Router (`(auth)`, `(tabs)`, `(buyer)`, `(owner)`)
- **Native Hardware:** Camera QR scanner, GPS spatial location (`discover.tsx`), Haptics
- **Offline Sync Queue:** Client queue (`offline-queue.ts`) + `AsyncStorage` + `X-Idempotency-Key`

### 5. Shared Layer & DevOps
- **Shared Types:** Custom script (`generate-types.mjs`) outputting `shared/types/index.ts`
- **Containers:** Docker Compose (`docker-compose.yml`)
- **Cloud Deployment:** Render (Express Docker API), Vercel (Next.js Web), Expo EAS (Android APK)
