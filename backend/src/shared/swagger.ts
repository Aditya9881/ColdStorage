/**
 * OpenAPI / Swagger Configuration
 *
 * Auto-generates API documentation from JSDoc-style comments in route files.
 * Serves Swagger UI at /api/docs
 */

import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ColdStorage Ecosystem — API Documentation',
      version: '1.0.0',
      description: `
AI-Driven Cold Storage Platform connecting administrators, facility owners/staff,
farmers, and buyers through role-specific digital interfaces.

## Authentication
All endpoints (except health check and auth) require a Bearer JWT token.
Obtain tokens via \`POST /api/v1/auth/register\` or \`POST /api/v1/auth/login\`.

## Roles
- **SUPER_ADMIN** — Platform super-admin
- **ADMIN** — Platform administrator
- **OWNER** — Cold storage facility owner
- **STAFF** — Facility staff member
- **FARMER** — Produce depositor
- **BUYER** — Marketplace buyer
      `,
      contact: {
        name: 'ColdStorage API Team',
      },
    },
    servers: [
      { url: 'http://localhost:4000', description: 'Development' },
      { url: 'https://api.coldstorage.in', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT access token obtained from /auth/login or /auth/register',
        },
      },
      schemas: {
        // ── Common Schemas ──
        ApiResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object', nullable: true },
            error: {
              type: 'object',
              nullable: true,
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
              },
            },
            meta: { type: 'object', nullable: true },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer' },
            limit: { type: 'integer' },
            total: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },

        // ── Auth ──
        RegisterRequest: {
          type: 'object',
          required: ['fullName', 'phone', 'password', 'role', 'addressLine1', 'city', 'state', 'pincode'],
          properties: {
            fullName: { type: 'string', example: 'Ramesh Kumar' },
            phone: { type: 'string', pattern: '^[0-9]{10}$', example: '9876543210' },
            password: { type: 'string', minLength: 6, example: 'secure123' },
            role: { type: 'string', enum: ['FARMER', 'BUYER', 'OWNER', 'STAFF'] },
            addressLine1: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string', pattern: '^[0-9]{6}$' },
            aadhaarNumber: { type: 'string', pattern: '^[0-9]{12}$' },
            businessName: { type: 'string', description: 'Required for BUYER role' },
            businessType: { type: 'string', description: 'Required for BUYER role' },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['phone', 'password'],
          properties: {
            phone: { type: 'string', example: '9876543210' },
            password: { type: 'string', example: 'secure123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                fullName: { type: 'string' },
                phone: { type: 'string' },
                role: { type: 'string' },
                status: { type: 'string' },
              },
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
          },
        },

        // ── Facility ──
        Facility: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            addressLine1: { type: 'string' },
            city: { type: 'string' },
            district: { type: 'string' },
            state: { type: 'string' },
            pincode: { type: 'string' },
            totalCapacityMt: { type: 'number' },
            storageType: { type: 'string', enum: ['BAG', 'BULK', 'HYBRID'] },
            status: { type: 'string', enum: ['PENDING_REVIEW', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'] },
            ownerId: { type: 'string', format: 'uuid' },
          },
        },

        // ── Inventory Lot ──
        InventoryLot: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lotNumber: { type: 'string' },
            receiptNumber: { type: 'string' },
            commodityCategory: { type: 'string' },
            commodityName: { type: 'string' },
            intakeWeightKg: { type: 'number' },
            currentWeightKg: { type: 'number' },
            bagCount: { type: 'integer' },
            qualityGrade: { type: 'string' },
            status: { type: 'string', enum: ['STORED', 'PARTIALLY_RELEASED', 'FULLY_RELEASED', 'DAMAGED', 'DISPUTED'] },
          },
        },

        // ── Marketplace ──
        MarketListing: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lotId: { type: 'string', format: 'uuid' },
            sellerId: { type: 'string', format: 'uuid' },
            askingPricePerKg: { type: 'number' },
            status: { type: 'string', enum: ['ACTIVE', 'SOLD', 'WITHDRAWN', 'EXPIRED'] },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            listingId: { type: 'string', format: 'uuid' },
            buyerId: { type: 'string', format: 'uuid' },
            quantityKg: { type: 'number' },
            agreedPricePerKg: { type: 'number' },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'DISPATCHED', 'COMPLETED', 'CANCELLED'] },
          },
        },

        // ── Invoice ──
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            invoiceNumber: { type: 'string' },
            facilityId: { type: 'string', format: 'uuid' },
            depositorId: { type: 'string', format: 'uuid' },
            subtotal: { type: 'number' },
            taxAmount: { type: 'number' },
            totalAmount: { type: 'number' },
            paidAmount: { type: 'number' },
            status: { type: 'string', enum: ['ISSUED', 'PAID', 'OVERDUE', 'CANCELLED'] },
          },
        },

        // ── Warehouse Receipt ──
        WarehouseReceipt: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            lotId: { type: 'string', format: 'uuid' },
            receiptNumber: { type: 'string' },
            isNegotiable: { type: 'boolean' },
            isPledged: { type: 'boolean' },
            pledgedTo: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['ACTIVE', 'PLEDGED', 'REVOKED', 'EXPIRED'] },
          },
        },

        // ── Escrow ──
        EscrowTransaction: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            orderId: { type: 'string', format: 'uuid' },
            amount: { type: 'number' },
            status: { type: 'string', enum: ['PENDING', 'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED'] },
            pgReferenceId: { type: 'string', nullable: true },
            buyerPaidAt: { type: 'string', format: 'date-time', nullable: true },
            sellerReleasedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },

        // ── IoT Device ──
        IoTDevice: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            facilityId: { type: 'string', format: 'uuid' },
            chamberId: { type: 'string', format: 'uuid', nullable: true },
            deviceId: { type: 'string' },
            deviceType: { type: 'string' },
            mqttTopic: { type: 'string' },
            isActive: { type: 'boolean' },
            lastHeartbeat: { type: 'string', format: 'date-time', nullable: true },
          },
        },

        // ── Review ──
        FacilityReview: {
          type: 'object',
          properties: {
            facilityId: { type: 'string', format: 'uuid' },
            userId: { type: 'string', format: 'uuid' },
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string', nullable: true },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],

    // ── API Paths (manually documented for key endpoints) ──
    paths: {
      '/api/v1/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register a new user',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
          responses: {
            201: { description: 'User registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            409: { description: 'Phone number already exists' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Login with phone and password',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
          responses: {
            200: { description: 'Login successful', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/api/v1/auth/refresh': {
        post: {
          tags: ['Authentication'],
          summary: 'Refresh access token',
          security: [],
          requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { refreshToken: { type: 'string' } } } } } },
          responses: { 200: { description: 'New tokens issued' }, 401: { description: 'Invalid refresh token' } },
        },
      },
      '/api/v1/auth/me': {
        get: { tags: ['Authentication'], summary: 'Get current user profile', responses: { 200: { description: 'User profile' }, 401: { description: 'Unauthenticated' } } },
      },
      '/api/v1/facilities': {
        get: { tags: ['Facilities'], summary: 'List facilities', responses: { 200: { description: 'List of facilities' } } },
        post: { tags: ['Facilities'], summary: 'Create a new facility (OWNER only)', responses: { 201: { description: 'Facility created' }, 403: { description: 'Forbidden' } } },
      },
      '/api/v1/facilities/{id}': {
        get: { tags: ['Facilities'], summary: 'Get facility details', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Facility details' }, 404: { description: 'Not found' } } },
      },
      '/api/v1/inventory': {
        get: { tags: ['Inventory'], summary: 'List inventory lots (role-scoped)', responses: { 200: { description: 'List of lots' } } },
      },
      '/api/v1/inventory/intake': {
        post: { tags: ['Inventory'], summary: 'Create a new lot (OWNER/STAFF)', responses: { 201: { description: 'Lot created' }, 403: { description: 'Forbidden' } } },
      },
      '/api/v1/inventory/{id}/release': {
        post: { tags: ['Inventory'], summary: 'Release weight from a lot', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Lot updated' } } },
      },
      '/api/v1/invoices': {
        get: { tags: ['Invoices'], summary: 'List invoices (role-scoped)', responses: { 200: { description: 'List of invoices' } } },
        post: { tags: ['Invoices'], summary: 'Create an invoice (OWNER/STAFF)', responses: { 201: { description: 'Invoice created' } } },
      },
      '/api/v1/marketplace/listings': {
        get: { tags: ['Marketplace'], summary: 'Browse active marketplace listings', responses: { 200: { description: 'List of listings' } } },
        post: { tags: ['Marketplace'], summary: 'Create a listing (FARMER)', responses: { 201: { description: 'Listing created' } } },
      },
      '/api/v1/orders': {
        get: { tags: ['Orders'], summary: 'List orders (role-scoped)', responses: { 200: { description: 'List of orders' } } },
        post: { tags: ['Orders'], summary: 'Place an order (BUYER)', responses: { 201: { description: 'Order placed' } } },
      },
      '/api/v1/warehouse-receipts': {
        get: { tags: ['Warehouse Receipts'], summary: 'List warehouse receipts', responses: { 200: { description: 'List of receipts' } } },
        post: { tags: ['Warehouse Receipts'], summary: 'Generate eNWR for a lot (OWNER/STAFF)', responses: { 201: { description: 'Receipt generated' } } },
      },
      '/api/v1/escrow': {
        get: { tags: ['Escrow'], summary: 'List escrow transactions', responses: { 200: { description: 'List of transactions' } } },
      },
      '/api/v1/iot-devices': {
        get: { tags: ['IoT Devices'], summary: 'List IoT devices', responses: { 200: { description: 'List of devices' } } },
        post: { tags: ['IoT Devices'], summary: 'Register a new device (OWNER/STAFF)', responses: { 201: { description: 'Device registered' } } },
      },
      '/api/v1/reviews/{facilityId}': {
        get: { tags: ['Reviews'], summary: 'List reviews for a facility', parameters: [{ name: 'facilityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Reviews with aggregation' } } },
        post: { tags: ['Reviews'], summary: 'Create or update review (FARMER/BUYER)', parameters: [{ name: 'facilityId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 201: { description: 'Review created/updated' } } },
      },
      '/api/v1/kyc/my-documents': {
        get: { tags: ['KYC'], summary: 'View own KYC documents', responses: { 200: { description: 'User documents' } } },
      },
      '/api/v1/kyc/pending': {
        get: { tags: ['KYC'], summary: 'List pending KYC (ADMIN)', responses: { 200: { description: 'Pending users' }, 403: { description: 'Forbidden' } } },
      },
      '/api/v1/discover': {
        get: { tags: ['Discovery'], summary: 'Search facilities by location/commodity', responses: { 200: { description: 'Nearby facilities' } } },
      },
      '/api/v1/temperature': {
        get: { tags: ['Temperature/IoT'], summary: 'Get temperature readings', responses: { 200: { description: 'Temperature data' } } },
      },
      '/api/v1/analytics': {
        get: { tags: ['Analytics'], summary: 'Dashboard analytics', responses: { 200: { description: 'Analytics data' } } },
      },
    },
  },
  apis: [], // We use inline definitions above
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui { font-family: 'Inter', -apple-system, sans-serif; }
    `,
    customSiteTitle: 'ColdStorage API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }));

  // Raw JSON spec endpoint
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
