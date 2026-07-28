# REFERENCES & APPENDICES

---

## REFERENCES

1. **Ultralytics YOLOv8 Documentation:** Ultralytics Inc. (2024). *YOLOv8 Computer Vision Architecture and API Reference*. Available at: `docs.ultralytics.com`
2. **Next.js 16 App Router Documentation:** Vercel Inc. (2025). *Next.js 16 Web Framework & React Server Components Guide*. Available at: `nextjs.org/docs`
3. **Expo 56 & React Native Documentation:** 650 Industries Inc. (2025). *Expo SDK 56 & Expo Router Architecture Guide*. Available at: `docs.expo.dev`
4. **Express.js 5 API Reference:** StrongLoop & OpenJS Foundation. (2024). *Express 5 Web Application Framework for Node.js*. Available at: `expressjs.com`
5. **Prisma 7 ORM Documentation:** Prisma Data Inc. (2025). *Prisma 7 Next-Generation Type-Safe Database Client & Schema Reference*. Available at: `prisma.io/docs`
6. **PostgreSQL 16 Manual:** PostgreSQL Global Development Group. (2024). *PostgreSQL 16.0 Object-Relational Database Documentation*. Available at: `postgresql.org/docs/16`
7. **Redis 7 Documentation:** Redis Ltd. (2024). *Redis 7 In-Memory Data Structure Store & Commands Reference*. Available at: `redis.io/docs`
8. **Digital India BHASHINI API Portal:** Ministry of Electronics and Information Technology (MeitY), Government of India. (2025). *Bhashini National Language Translation Mission APIs*. Available at: `bhashini.gov.in`
9. **Sarvam AI Voice Synthesis:** Sarvam AI. (2025). *Bulbul V3 Multilingual Text-to-Speech API for Indian Languages*. Available at: `sarvam.ai/apis/text-to-speech`
10. **EMQX MQTT Broker Manual:** EMQ Technologies Co., Ltd. (2024). *EMQX Enterprise MQTT Broker Documentation*. Available at: `emqx.com/en/docs`
11. **e-NAM (National Agriculture Market):** Small Farmers' Agribusiness Consortium (SFAC), Ministry of Agriculture & Farmers Welfare, GOI. (2024). *e-NAM Platform of Platforms (PoP) Integration Guidelines*. Available at: `enam.gov.in`
12. **WDRA (Warehousing Development and Regulatory Authority):** Department of Food and Public Distribution, GOI. (2024). *Electronic Negotiable Warehouse Receipt (eNWR) Guidelines and Repositories*. Available at: `wdra.gov.in`
13. **Ministry of Food Processing Industries (MoFPI):** Government of India. (2024). *Scheme for Integrated Cold Chain and Value Addition Infrastructure*. Available at: `mofpi.gov.in`

---

## APPENDIX A – PROJECT SCREENSHOTS & UI INTERFACE GUIDE

### A.1 Authentication & Role Login Screen
- **Interface Description:** Dual authentication tab interface supporting credential-based login (email/password) for Admins, Owners, and Staff, alongside passwordless Phone OTP verification for Farmers and Buyers.
- **Key Elements:** Phone number input, 6-digit OTP entry field, timer resend, and role badge selector.

### A.2 Admin Governance Dashboard
- **Interface Description:** High-density macro oversight dashboard for platform regulators and administrators.
- **Key Elements:** Tonnage stored KPI cards, capacity utilization gauges across states, facility KYC verification table (with document view/approve/reject buttons), and anti-gouging rental rate alerts.

### A.3 Owner & Staff WMS Dashboard
- **Interface Description:** Comprehensive Warehouse Management System dashboard rendered in Next.js 16.
- **Key Elements:** Volumetric chamber visualizer grid (showing occupied vs available space in MT), weighbridge intake entry form, quality grade dropdown (`A`/`B`/`C`), lot barcode generator modal, and dynamic PDF invoice preview button.

### A.4 Farmer Mobile Application ("Digital Pocket Ledger")
- **Interface Description:** Localized Expo 56 mobile app providing farmers with total asset visibility.
- **Key Elements:** Total deposited tonnage snapshot card, accumulated rental dues badge, spatial facility discovery map/list view (sorted by distance in km), live Mandi price feed ticker, and **Remote OTP Release Dialog** issuing Digital Gate Passes.

### A.5 Buyer Marketplace & Escrow Terminal
- **Interface Description:** Institutional procurement marketplace connecting buyers directly with stored lots.
- **Key Elements:** Search filters (crop variety, grade, facility location), direct buy button, price bidding modal, order tracking timeline, and nodal escrow hold status (`ESCROW_LOCKED`).

### A.6 Automated PDF Invoice Receipt
- **Interface Description:** Downloadable itemized PDF invoice rendered via `pdf-generator.ts`.
- **Key Elements:** Facility header, FSSAI/GST numbers, depositor details, stored lot weight, storage duration (days), itemized rate lines, tax subtotal, and QR payment scan code.

---

## APPENDIX B – DATABASE SCHEMA DEFINITIONS

Below is the complete database model structure defined in `backend/prisma/schema.prisma`:

```prisma
// ============================================
// ColdStorage Platform — Prisma Schema Summary
// ============================================

enum UserRole {
  SUPER_ADMIN
  ADMIN
  OWNER
  STAFF
  FARMER
  BUYER
}

enum UserStatus {
  PENDING_VERIFICATION
  PENDING_KYC
  KYC_SUBMITTED
  ACTIVE
  SUSPENDED
  DEACTIVATED
}

enum StorageType {
  BAG
  BULK
  HYBRID
}

enum BookingStatus {
  PENDING
  CONFIRMED
  ARRIVED
  WEIGHING
  STORED
  DISPATCH_REQUESTED
  DISPATCHING
  DISPATCHED
  COMPLETED
  CANCELLED
  REJECTED
}

enum QualityGrade {
  A
  B
  C
  REJECTED
}

model User {
  id                 String       @id @default(uuid()) @db.Uuid
  uniqueId           String?      @unique @db.VarChar(20)
  fullName           String       @db.VarChar(255)
  email              String?      @unique @db.VarChar(255)
  phone              String       @unique @db.VarChar(15)
  phoneVerified      Boolean      @default(false)
  role               UserRole
  status             UserStatus   @default(PENDING_VERIFICATION)
  facilityId         String?      @db.Uuid
  aadhaarNumber      String?      @unique @db.VarChar(12)
  panNumber          String?      @unique @db.VarChar(10)
  gstNumber          String?      @unique @db.VarChar(15)
  khasraNumber       String?      @db.VarChar(50)
  passwordHash       String       @db.VarChar(255)
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt
}

model Facility {
  id                 String       @id @default(uuid()) @db.Uuid
  facilityCode       String       @unique @db.VarChar(30)
  name               String       @db.VarChar(255)
  ownerId            String       @db.Uuid
  storageType        StorageType  @default(BAG)
  totalCapacityMt    Decimal      @db.Decimal(12, 2)
  availableCapacityMt Decimal     @db.Decimal(12, 2)
  addressLine1       String       @db.VarChar(255)
  city               String       @db.VarChar(100)
  state              String       @db.VarChar(100)
  latitude           Decimal?     @db.Decimal(10, 8)
  longitude          Decimal?     @db.Decimal(11, 8)
  chambers           Chamber[]
  bookings           Booking[]
}

model Chamber {
  id                 String       @id @default(uuid()) @db.Uuid
  facilityId         String       @db.Uuid
  chamberNumber      String       @db.VarChar(50)
  capacityMt         Decimal      @db.Decimal(12, 2)
  currentTempC       Decimal?     @db.Decimal(5, 2)
  targetTempC        Decimal?     @db.Decimal(5, 2)
  humidityPct        Decimal?     @db.Decimal(5, 2)
  readings           TemperatureReading[]
}

model Booking {
  id                 String        @id @default(uuid()) @db.Uuid
  bookingNumber      String        @unique @db.VarChar(30)
  status             BookingStatus @default(PENDING)
  farmerId           String        @db.Uuid
  facilityId         String        @db.Uuid
  commodityName      String        @db.VarChar(100)
  estimatedWeightKg  Decimal       @db.Decimal(12, 2)
  actualWeightKg     Decimal?      @db.Decimal(12, 2)
  qrCodeData         String?       @db.Text
  lotId              String?       @unique @db.Uuid
}

model InventoryLot {
  id                 String       @id @default(uuid()) @db.Uuid
  lotNumber          String       @unique @db.VarChar(30)
  barcodeData        String?      @db.VarChar(255)
  depositorId        String       @db.Uuid
  facilityId         String       @db.Uuid
  chamberId          String       @db.Uuid
  netWeightKg        Decimal      @db.Decimal(12, 2)
  bagCount           Int
  qualityGrade       QualityGrade @default(A)
  createdAt          DateTime     @default(now())
}
```

---

## APPENDIX C – API ENDPOINT REFERENCE DOCUMENTATION

Below is the complete reference table of Express 5 REST API routes mounted under `/api/v1`:

| Module | HTTP Method | Route Endpoint | Middleware Guards | Description |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/register` | `validate` | Registers a new user (Farmer, Buyer, Owner). |
| **Auth** | `POST` | `/api/v1/auth/login` | `validate`, `rateLimiter` | Authenticates credentials; returns JWT tokens. |
| **Auth** | `POST` | `/api/v1/auth/send-otp` | `rateLimiter` | Sends 6-digit SMS OTP via MSG91 gateway. |
| **Auth** | `POST` | `/api/v1/auth/verify-otp` | `validate` | Verifies phone OTP; issues auth session token. |
| **Auth** | `POST` | `/api/v1/auth/refresh` | None | Exchanges valid Refresh Token for new Access Token. |
| **Users**| `GET`  | `/api/v1/users/profile` | `authenticate` | Fetches currently authenticated user profile. |
| **KYC**  | `POST` | `/api/v1/kyc/upload` | `authenticate`, `upload` | Uploads identity document photo (Aadhaar/PAN/GST). |
| **KYC**  | `GET`  | `/api/v1/kyc/pending` | `requireRole(ADMIN)` | Lists pending user KYC verification submissions. |
| **Facilities**|`GET`| `/api/v1/facilities` | None | Lists cold storage facilities with spatial search filters.|
| **Facilities**|`POST`| `/api/v1/facilities` | `requireRole(OWNER)` | Onboards a new cold storage facility complex. |
| **Chambers**  |`POST`| `/api/v1/chambers` | `requireRole(OWNER)` | Adds a new chamber node to an owned facility. |
| **Bookings**  |`POST`| `/api/v1/bookings` | `authenticate`, `idempotency` | Submits a new storage booking request. |
| **Bookings**  |`POST`| `/api/v1/bookings/:id/request-dispatch` | `authenticate` | Triggers remote OTP release request to farmer phone. |
| **Bookings**  |`POST`| `/api/v1/bookings/:id/verify-dispatch-otp` | `authenticate` | Verifies OTP; issues cryptographically signed Gate Pass QR. |
| **Bookings**  |`POST`| `/api/v1/bookings/:id/scan-gate-pass` | `authenticate` | Scans gate pass QR at warehouse gate; executes dispatch. |
| **Inventory** |`POST`| `/api/v1/inventory/intake` | `requireRole(STAFF, OWNER)` | Logs weighbridge weight, creates `InventoryLot` & barcode.|
| **Invoices**  |`GET` | `/api/v1/invoices/:id/pdf` | `authenticate` | Generates downloadable PDF invoice binary stream. |
| **Marketplace**|`GET`| `/api/v1/marketplace/listings` | None | Returns verified commodity listings open for bidding. |
| **Orders**    |`POST`| `/api/v1/orders` | `requireRole(BUYER)`, `idempotency` | Places buy order; locks funds in Nodal Escrow. |
| **Escrow**    |`POST`| `/api/v1/escrow/release` | `requireRole(ADMIN)` | Releases held escrow payout to farmer bank account. |

---

## APPENDIX D – COMPLETE REPOSITORY FOLDER STRUCTURE

```text
ColdStorage 2/
├── backend/                        # Node.js Express API & Database Layer
│   ├── prisma/
│   │   ├── migrations/             # SQL Migration History
│   │   ├── schema.prisma           # Prisma 7 Database Schema
│   │   ├── seed.ts                 # Primary Seeding Script
│   │   └── seed-phase2.ts          # Marketplace Seeding Script
│   ├── src/
│   │   ├── config/                 # DB, Redis, Env, Winston Logger
│   │   ├── modules/                # 23 Feature Controllers & Routes
│   │   │   ├── auth/               # Login, Register, Refresh, OTP, RBAC
│   │   │   ├── bookings/           # Booking Lifecycle Engine
│   │   │   ├── facilities/         # Facility & Chamber CRUD
│   │   │   ├── inventory/          # Intake, Lot & Barcode Service
│   │   │   ├── invoices/           # Billing & PDF Invoicing Service
│   │   │   ├── marketplace/        # Commodity Listings & Bidding
│   │   │   ├── orders/             # Order Processing Engine
│   │   │   ├── escrow/             # Nodal Escrow Hold & Payout Release
│   │   │   ├── kyc/                # Identity Document Verification
│   │   │   ├── temperature/        # Chamber Microclimate Handler
│   │   │   └── notifications/      # SMS & Push Alert Engine
│   │   └── shared/                 # Reusable Middleware & Utilities
│   │       ├── middleware/         # Auth, Validate, Idempotency, Upload
│   │       └── utils/              # PDF Generator, ID Generator, Audit Log
│   ├── tests/                      # Jest Integration & Unit Tests
│   ├── jest.config.ts              # Jest Test Configuration
│   └── package.json                # Backend Dependencies & Scripts
│
├── frontend/                       # Next.js 16 Web Dashboard Application
│   ├── src/
│   │   ├── app/                    # App Router Structure
│   │   │   ├── (auth)/             # Web Login & Registration
│   │   │   ├── (dashboard)/        # Main Admin Dashboard Layout
│   │   │   │   ├── overview/       # Macro KPI Analytics
│   │   │   │   ├── facilities/     # Onboarding & Verification
│   │   │   │   └── kyc/            # Document Approval Panel
│   │   │   │   └── wms/            # WMS Sidebar Layout
│   │   │   │       ├── chambers/   # Volumetric Chamber Visualizer
│   │   │   │       ├── intake/     # Weighbridge Intake & QR Scanner
│   │   │   │       └── invoices/   # PDF Invoice Viewer & Download
│   │   │   └── page.tsx            # Public Marketing Landing Page
│   │   ├── components/             # Reusable UI Components
│   │   ├── hooks/                  # Custom React Hooks (useFetch)
│   │   ├── lib/                    # Unified API Client Interceptors
│   │   └── stores/                 # Zustand Stores (auth-store, facility-store)
│   ├── AGENTS.md                   # Next.js Development Guidelines
│   └── package.json                # Frontend Dependencies & Scripts
│
├── mobile/                         # Expo 56 Cross-Platform Mobile Application
│   ├── app/                        # Expo Router Native Screen Hierarchy
│   │   ├── (auth)/                 # Phone OTP & Credential Login
│   │   ├── (tabs)/                 # Farmer Experience (Ledger, Discovery, Lots)
│   │   ├── (buyer)/                # Buyer Experience (Marketplace, Bidding, Orders)
│   │   ├── (owner)/                # Owner Mobile Terminal (QR Gate Scanner)
│   │   ├── discover.tsx            # Spatial Facility Search & Filters
│   │   └── book-storage.tsx        # Interactive Storage Booking Form
│   ├── components/                 # Native UI Primitives
│   ├── contexts/                   # AuthContext, OfflineSyncContext
│   ├── lib/                        # API Client, Offline Queue (offline-queue.ts)
│   └── package.json                # Mobile Dependencies & Scripts
│
├── shared/                         # Cross-Project Type Generator Workspace
│   ├── types/
│   │   └── index.ts                # Auto-Generated Shared TypeScript Interfaces
│   └── generate-types.mjs          # Node.js Type Extraction Script
│
├── docker-compose.yml              # Local Multi-Container Stack (Postgres, Redis, API)
├── PROJECT_REPORT.md               # Master Project Report Document
├── CHAPTER_3_PROBLEM_STATEMENT_AND_LITERATURE.md
├── CHAPTER_4_INTERNSHIP_WORK_PERFORMED.md
├── CHAPTER_5_SYSTEM_DESIGN_AND_ARCHITECTURE.md
├── CHAPTER_6_MODULES_DEVELOPED.md
├── CHAPTER_7_TECHNOLOGIES_USED.md
├── CHAPTER_8_TESTING_AND_VALIDATION.md
├── CHAPTER_9_CHALLENGES_AND_LEARNINGS.md
├── CHAPTER_10_CONCLUSION_AND_FUTURE_SCOPE.md
└── APPENDICES_AND_REFERENCES.md     # Final References & Appendices Document
```
