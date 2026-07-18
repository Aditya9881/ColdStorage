import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/database';
import { requestLogger } from './shared/middleware/request-logger';
import { apiRateLimiter } from './shared/middleware/rate-limiter';
import { errorHandler } from './shared/middleware/error-handler';
import { enforceHttps } from './shared/middleware/enforce-https';
import { sanitizeInput } from './shared/middleware/sanitize';

// Module routes
import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/users.routes';
import facilityRoutes from './modules/facilities/facilities.routes';
import chamberRoutes from './modules/chambers/chambers.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import invoiceRoutes from './modules/invoices/invoices.routes';
import pricingRoutes from './modules/pricing/pricing.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import temperatureRoutes from './modules/temperature/temperature.routes';
import notificationRoutes from './modules/notifications/notifications.routes';
import reportRoutes from './modules/reports/reports.routes';
import auditRoutes from './modules/audit/audit.routes';
import searchRoutes from './modules/search/search.routes';

// Phase 2: Marketplace modules
import discoveryRoutes from './modules/discovery/discovery.routes';
import marketplaceRoutes from './modules/marketplace/marketplace.routes';
import orderRoutes from './modules/orders/orders.routes';
import marketPriceRoutes from './modules/market-prices/market-prices.routes';

// Phase 3: KYC & Documents
import kycRoutes from './modules/kyc/kyc.routes';

// Phase 4: Booking Flow
import bookingRoutes from './modules/bookings/booking.routes';

// Phase A: Missing endpoints — IoT, Reviews, Warehouse Receipts, Escrow
import iotDeviceRoutes from './modules/iot-devices/iot-devices.routes';
import reviewRoutes from './modules/reviews/reviews.routes';
import warehouseReceiptRoutes from './modules/warehouse-receipts/warehouse-receipts.routes';
import escrowRoutes from './modules/escrow/escrow.routes';
import fileDownloadRoutes from './shared/routes/file-download.routes';
import path from 'path';
import { setupSwagger } from './shared/swagger';
import { isProd } from './config/env';

const app = express();

// ── Security ──────────────────────────────────────
if (isProd) {
  app.set('trust proxy', 1); // Trust first proxy (Nginx/ALB/Cloudflare)
  app.use(enforceHttps);
}
app.use(helmet({
  contentSecurityPolicy: isProd ? undefined : false, // CSP in prod, disabled in dev for hot reload
}));
// ── CORS — env-driven allowlist ────────────────
const allowedOrigins: string[] = [
  // Always allow localhost variants for development
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8082',
  'http://localhost:19006', // Expo web
];

// Add production origins from CORS_ORIGIN env var
if (env.CORS_ORIGIN) {
  env.CORS_ORIGIN.split(',')
    .map((o: string) => o.trim())
    .filter(Boolean)
    .forEach((o: string) => {
      if (!allowedOrigins.includes(o)) allowedOrigins.push(o);
    });
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow any origin for convenience
    if (!isProd) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));

// ── Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ── Input Sanitization ────────────────────────────
app.use(sanitizeInput);

// ── Static file serving (uploaded documents) ──
// KYC documents are now served through an authenticated route
// at /api/v1/files/kyc/:filename (see file-download.routes.ts).
// Public static serving is disabled to protect PII.
// Legacy path kept ONLY for development convenience:
if (!isProd) {
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads'), {
    setHeaders: (res) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }));
}

// ── Logging & Rate Limiting ───────────────────────
app.use(requestLogger);
app.use(env.API_PREFIX, apiRateLimiter);

// ── Health Check ──────────────────────────────────
app.get('/health', async (_req, res) => {
  let dbStatus = 'connected';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = 'disconnected';
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    uptime: Math.floor(process.uptime()),
    dependencies: { database: dbStatus },
  });
});

// ── API Routes ────────────────────────────────────
const api = env.API_PREFIX;
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/users`, userRoutes);
app.use(`${api}/facilities`, facilityRoutes);
app.use(`${api}/chambers`, chamberRoutes);
app.use(`${api}/inventory`, inventoryRoutes);
app.use(`${api}/invoices`, invoiceRoutes);
app.use(`${api}/pricing`, pricingRoutes);
app.use(`${api}/analytics`, analyticsRoutes);
app.use(`${api}/temperature`, temperatureRoutes);
app.use(`${api}/notifications`, notificationRoutes);
app.use(`${api}/reports`, reportRoutes);
app.use(`${api}/audit`, auditRoutes);
app.use(`${api}/search`, searchRoutes);

// Phase 2: Marketplace
app.use(`${api}/discover`, discoveryRoutes);
app.use(`${api}/marketplace`, marketplaceRoutes);
app.use(`${api}/orders`, orderRoutes);
app.use(`${api}/market-prices`, marketPriceRoutes);

// Phase 3: KYC & Documents
app.use(`${api}/kyc`, kycRoutes);

// Phase 4: Booking Flow
app.use(`${api}/bookings`, bookingRoutes);

// Phase A: New modules
app.use(`${api}/iot-devices`, iotDeviceRoutes);
app.use(`${api}/reviews`, reviewRoutes);
app.use(`${api}/warehouse-receipts`, warehouseReceiptRoutes);
app.use(`${api}/escrow`, escrowRoutes);

// Protected file downloads
app.use(`${api}/files`, fileDownloadRoutes);

// ── API Documentation ─────────────────────────────
setupSwagger(app);

// ── 404 Handler ───────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: `Route not found`,
    },
  });
});

// ── Global Error Handler ──────────────────────────
app.use(errorHandler);

export default app;
