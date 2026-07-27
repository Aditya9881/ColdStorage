# PROJECT REPORT

## COLDSTORAGE ECOSYSTEM
### An AI-Driven Integrated Cold Storage & Agritech Marketplace Platform
*Built with Express.js, Prisma 7, PostgreSQL 16, Redis 7, Next.js 16, Expo 56 React Native, and Offline Synchronization Engine*

---

**Submitted to:**  
Innovation Hub / Department of Computer Science & Engineering  

**Submitted by:**  
**Aditya Sonkar**  
Course: BTech – Computer Science & Engineering  

**Mentor:**  
Project Guide / Industry Mentor  

**Project Duration:**  
6 Weeks (Summer Project / Internship)  

---

## About This Report

This report documents my 6-week journey building a full-stack, multi-application agritech solution called the **ColdStorage Ecosystem**. 

When I started this project, my goal was to move beyond textbook exercises and build a real-world, production-ready system addressing a massive crisis in the agricultural sector: post-harvest crop loss (ranging from 4.87% to 11.61% in staple crops like potatoes), paper-based cold storage management, price exploitation, and the friction of long-distance travel for farmers to release stored produce.

Over six intensive weeks, I designed and developed:
1. A high-throughput **Node.js/Express REST API** backed by **Prisma 7** and **PostgreSQL 16**.
2. An **Admin Governance** and **Cold Storage Owner/Staff WMS Web Dashboard** using **Next.js 16 (App Router)** and **React 19**.
3. A cross-platform **Farmer & Buyer Mobile Application** using **Expo 56 (React Native)** with offline mutation queueing and haptic feedback.
4. A **Remote OTP Authorization & Digital Gate Pass Engine** that completely eradicates the 50 km "Travel Tax" for smallholder farmers.
5. A **Direct Commodity Marketplace with Nodal Escrow Payment Protection** connecting farmers directly with institutional buyers.
6. A **PDF Invoicing & Billing Module** and **WDRA-Compliant eNWR Schema Readiness**.

> [!NOTE]
> **Implementation Scope Note:** The 6-week internship project successfully delivered the full working software platform (Express API, PostgreSQL DB, Next.js Web WMS, Expo Mobile Apps, Offline Synchronization, Remote OTP Verification, Escrow Security, PDF Invoicing). Hardware IoT sensing (ESP32 / MQTT / EMQX) and Multilingual Voice AI (Bhashini / Sarvam AI) were fully architected and documented as future post-internship extension blueprints.

---

## Module 0: My 6-Week Journey at a Glance

Here is a quick snapshot of how these six weeks unfolded:

| Week | What I Focused On | What Came Out of It |
|---|---|---|
| **Week 1** | Requirement analysis, stakeholder domain research, tech stack selection, project planning | 4 stakeholder roles defined, technology stack finalized, 6-week Gantt development roadmap. |
| **Week 2** | Database schema modeling, Prisma migrations, seed script, Redis caching setup | 23 Prisma models, PostgreSQL relational schema, seed data, Redis token blacklist & rate-limiting tier. |
| **Week 3** | Authentication engine, JWT access/refresh lifecycle, MSG91 Phone OTP, Express REST APIs | 23 feature API modules in Express 5, RBAC authorization guards, Redis idempotency middleware, Swagger UI docs. |
| **Week 4** | Next.js 16 Web Dashboard development for Admin Governance and Owner WMS | Admin compliance portal, chamber volumetric visualizer, weighbridge intake terminal, barcode generation, PDF invoices. |
| **Week 5** | Multi-role Expo 56 Mobile Application development for Farmers, Buyers, and Staff | Farmer Pocket Ledger, Buyer Marketplace, Owner QR Scanner, Spatial facility discovery, Client Offline Mutation Queue. |
| **Week 6** | Comprehensive testing, bug fixing, ESLint/TypeScript cleanup, deployment & roadmap documentation | Jest tests executed, linting cleared, Render backend API deployed, Vercel web deployed, Expo EAS Android APK built. |

---

## Module 1: Problem Statement & Foundation Setup (Week 1)

### 1.1 Problem Statement

In developing regions like Uttar Pradesh, potato and vegetable farmers routinely face structural market crises. Post-harvest losses reach up to 11.61% due to inadequate cold storage logistics. Furthermore:
- **Paper-Based Inefficiency:** Over 90% of facilities use physical registers, causing lot intermingling, weight disputes, and billing errors.
- **The "Travel Tax":** Farmers are forced to travel up to 50 km just to sign paperwork at a warehouse to authorize stock releases or sales.
- **Information Asymmetry:** Farmers lack real-time visibility into chamber temperatures, rent accumulation, or mandi prices, forcing them into distress sales.
- **Buyer Friction:** Institutional buyers cannot easily source verified commodities directly from storage facilities without intermediaries.

### 1.2 Justification & Key Stack Decisions

I selected **Express 5** with **Prisma 7** and **PostgreSQL 16** for the backend, supported by **Redis 7** for rate-limiting, session tokens, and idempotency key enforcement.

| Decision Area | Option Evaluated | Final Choice | Reason for Selection |
|---|---|---|---|
| **Backend Framework** | NestJS vs Express 5 | **Express 5** | Lightweight, fast execution, complete control over middleware chain and Swagger docs. |
| **Database ORM** | TypeORM vs Prisma 7 | **Prisma 7** | Auto-generated types, intuitive migration workflow, and seamless relational querying. |
| **State Caching** | Memcached vs Redis 7 | **Redis 7** | Native data structures for rate-limiting counters, token blacklist, and idempotency keys. |
| **Type Generation** | Manual types vs Script | **Custom Node Script** | Wrote `generate-types.mjs` to auto-generate framework-independent TypeScript types into `shared/`. |

---

## Module 2: System Architecture, Pivots & Web WMS Ecosystem (Week 2 & 4)

### 2.1 Spotting Real-World Operational Friction & Strategic Pivot

My initial workflow design required farmers to physically present a signed paper receipt at the cold storage office to release stock. On paper, this was simple; in practice, it preserved the exact "Travel Tax" friction I was trying to eliminate.

**The Pivot to Remote OTP & QR Verification:**  
I redesigned the stock release workflow into a cryptographically secure, 2-factor OTP authorization mechanism. When a buyer initiates a purchase or a farmer requests a dispatch, the API generates a time-sensitive OTP sent to the farmer's mobile phone. Upon entering the OTP in their app, the system generates a verified **Digital Gate Pass** with a unique QR payload. Facility staff scan the QR code to confirm stock release instantly, completely eliminating physical travel requirements.

---

## Module 3: Multi-Platform Mobile Apps & Offline Synchronization (Week 3 & 5)

### 3.1 Building the Mobile Experience with Expo 56

In Week 5, I developed the cross-platform mobile application using **Expo 56**, **React Native**, and **Expo Router**. The mobile app serves three distinct user roles:
1. **Farmer Application ("Digital Pocket Ledger"):** Spatial discovery, lot tracking, remote OTP release, Mandi prices.
2. **Buyer Application (Institutional Procurement):** Verified inventory search, bidding engine, Escrow payment checkout.
3. **Owner/Staff Mobile Terminal:** QR code scanner for booking check-in and gate pass validation.

### 3.2 Offline Synchronization Queue (`offline-queue.ts`)
To accommodate poor network coverage in rural areas, the mobile client implements an offline mutation queue that serializes user actions into persistent storage, syncing them with backend Redis idempotency headers when connectivity returns.

---

## Module 4: Future Extension Blueprints: IoT & Conversational AI

While the 6-week internship delivered the core software ecosystem, full architectural specifications were formulated for future hardware and AI post-internship deployments:

1. **IoT Edge Telemetry Blueprint (ESP32 / MQTT / EMQX):** Architecture for deploying microcontrollers with DHT22 temperature/humidity and $CO_2$ sensors transmitting over MQTT to an EMQX broker, triggering automated emergency warnings upon anomaly detection.
2. **Multilingual Voice Assistant Blueprint (Bhashini / Sarvam AI):** Full-duplex WebSocket architecture integrating Bhashini STT/NMT and Sarvam AI Bulbul V3 TTS to enable voice-guided navigation across 22 regional Indian languages.

---

## Module 5: Inside the Final Project - A Feature Walkthrough

- **Role-Based Login:** Password authentication for Admins/Owners and passwordless Phone OTP login for Farmers/Buyers.
- **Admin Governance Dashboard:** Macro overview of national stored tonnage, facility compliance tracking, and anti-gouging pricing oversight.
- **Owner WMS Dashboard:** Volumetric chamber visualizer, weighbridge intake logging, automatic barcode generation, and dynamic PDF invoicing (`pdf-generator.ts`).
- **Farmer Mobile Ledger:** Stored tonnage snapshot, accumulated rent tracking, spatial facility discovery, and remote OTP dispatch release.
- **Buyer Marketplace & Escrow Checkout:** Verified inventory search and nodal account escrow payment protection.

---

## Module 6: Tools & Technologies I Used

| Tool / Library | Category | Why I Used It |
|---|---|---|
| **Node.js 22 & Express 5** | Backend API | High-concurrency asynchronous runtime and flexible REST framework. |
| **Prisma 7 & PostgreSQL 16**| Database & ORM | Type-safe ORM with declarative schema migrations and ACID-compliant relational storage. |
| **Redis 7** | In-Memory Cache | Distributed rate-limiting, session token validation, and idempotency key caching. |
| **Next.js 16 & React 19** | Web Framework | Server-side rendering, fast routing, and modern UI components for Admin & WMS dashboards. |
| **Expo 56 & React Native** | Mobile Framework| Cross-platform native mobile application for Farmer, Buyer, and Staff mobile apps. |
| **Zod** | Validation | Runtime schema validation for API request bodies, headers, and environment variables. |
| **Docker Compose** | Infrastructure | Single-command local deployment of PostgreSQL 16, Redis 7, and Backend API containers. |

---

## Module 7: Testing & Deployment Results

### Functional Testing Matrix

| Test Scenario | Expected Outcome | Actual Result | Status |
|---|---|---|---|
| **Farmer Login via OTP** | Valid phone receives 6-digit OTP; correct OTP logs in user | Worked as expected; JWT access/refresh tokens issued. | ✅ Pass |
| **Intake Logging & Lot Creation** | Staff enters weight & grade; database creates lot & barcode | Worked as expected; lot linked to chamber & depositor. | ✅ Pass |
| **Remote OTP Stock Release** | Farmer receives release OTP; entering OTP generates Gate Pass QR | Worked as expected; "Travel Tax" completely bypassed. | ✅ Pass |
| **Offline Action Queueing** | Farmer executes action without internet; app syncs when online | Worked as expected; idempotency key prevented duplicates. | ✅ Pass |
| **Escrow Purchase & Release** | Buyer deposits funds; funds held until Gate Pass scan completes | Worked as expected; payout automatically released to farmer. | ✅ Pass |

### Build Validation & Deployment

- **Backend API (Render):** Express API deployed inside Docker containers with automated Prisma database migrations on build.
- **Web Dashboard (Vercel):** Next.js 16 web app deployed on Vercel with global CDN edge caching.
- **Mobile Client (EAS Build):** Standalone Android APK preview build generated using Expo Application Services (`eas build --platform android`).

---

## Module 8: Challenges I Faced (and What I Learned from Them)

1. **Handling Offline Mutation Race Conditions:** Resolved using Redis-backed idempotency headers (`X-Idempotency-Key`) on write routes.
2. **Managing macOS AppleDouble `._*` Artifact Files:** Configured `.eslintignore` and cleanup scripts to purge macOS metadata artifacts.
3. **Graceful Fallback for Caching:** Built a fallback wrapper in `backend/src/config/redis.ts` returning in-memory maps if Redis goes offline.

---

## Module 9: Conclusion & Future Roadmap

### 9.1 Conclusion

Looking back at these six weeks, this project genuinely transformed my engineering skills from writing basic scripts to building and shipping a production-ready, multi-application agritech platform. The **ColdStorage Ecosystem** solves real human problems: protecting smallholder farmers from crop loss, eliminating physical travel friction, guaranteeing transparent weighing and billing, and providing institutional buyers with verified commodity sourcing.

### 9.2 Future Roadmap

- **IoT Edge Sensor Hardware Deployment:** Deploy physical ESP32 sensor nodes inside cold chambers connected over MQTT.
- **Multilingual Voice AI Deployment:** Connect Bhashini STT/NMT and Sarvam AI Bulbul V3 TTS to the mobile app and WhatsApp Business API.
- **Live e-NAM API Integration:** Mirror marketplace listings onto the pan-India National Agriculture Market portal.

---

## References

1. **Next.js 16 Documentation:** `nextjs.org/docs`
2. **Expo 56 & React Native Documentation:** `docs.expo.dev`
3. **Express 5 & Prisma 7 Reference:** `prisma.io/docs`
4. **Digital India BHASHINI API Portal:** `bhashini.gov.in/docs`
5. **Sarvam AI Text-to-Speech:** `sarvam.ai/apis/text-to-speech`
6. **e-NAM (National Agriculture Market):** `enam.gov.in`
7. **WDRA (Warehousing Development and Regulatory Authority):** `wdra.gov.in`
