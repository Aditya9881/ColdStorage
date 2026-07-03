import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requestLogger } from './shared/middleware/request-logger';
import { apiRateLimiter } from './shared/middleware/rate-limiter';
import { errorHandler } from './shared/middleware/error-handler';

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
import path from 'path';

const app = express();

// ── Security ──────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.split(',').map(o => o.trim()),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Parsing ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

// ── Static file serving (uploaded documents) ──
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Logging & Rate Limiting ───────────────────────
app.use(requestLogger);
app.use(env.API_PREFIX, apiRateLimiter);

// ── Health Check ──────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
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
