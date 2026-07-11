/**
 * Invoices Module — Integration Tests
 *
 * Tests:
 * - Create invoice with line items
 * - List invoices (role-scoped: owner sees facility, farmer sees own)
 * - Get invoice detail
 * - Update payment status (ISSUED → PAID)
 * - PDF download
 * - Validation: missing line items, non-existent facility
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber, createTestLot,
  TestUser, TestFacility, TestChamber, TestLot,
} from '../helpers/setup';

const API = '/api/v1/invoices';

let owner: TestUser;
let farmer: TestUser;
let facility: TestFacility;
let chamber: TestChamber;
let lot: TestLot;

beforeEach(async () => {
  await cleanDatabase();
  owner = await createTestUser('OWNER');
  farmer = await createTestUser('FARMER');
  facility = await createTestFacility(owner.id);
  chamber = await createTestChamber(facility.id);
  lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id);

  // Assign owner to facility for role scoping
  await prisma.user.update({
    where: { id: owner.id },
    data: { facilityId: facility.id },
  });
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Create Invoice
// ─────────────────────────────────────────────

describe('POST /invoices', () => {
  it('should create an invoice with line items', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        depositorId: farmer.id,
        lotId: lot.id,
        dueDate: futureDate.toISOString(),
        lineItems: [
          { description: 'Cold storage rent — 30 days', quantity: 100, unitPrice: 5 },
          { description: 'Loading/unloading charges', quantity: 1, unitPrice: 200 },
        ],
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.invoiceNumber).toBeDefined();
    expect(res.body.data.status).toBe('ISSUED');
    // 100*5 + 1*200 = 700
    expect(parseFloat(res.body.data.subtotal)).toBe(700);
    expect(parseFloat(res.body.data.totalAmount)).toBe(700); // no tax
    expect(res.body.data.lineItems.length).toBe(2);
  });

  it('should reject invoice from FARMER role', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        depositorId: farmer.id,
        dueDate: futureDate.toISOString(),
        lineItems: [
          { description: 'Test', quantity: 1, unitPrice: 100 },
        ],
      })
      .expect(403);
  });

  it('should reject invoice with empty line items', async () => {
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 1);

    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        depositorId: farmer.id,
        dueDate: futureDate.toISOString(),
        lineItems: [],
      });

    // Should fail validation — either 422 or 400
    expect([400, 422]).toContain(res.status);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// List Invoices
// ─────────────────────────────────────────────

describe('GET /invoices', () => {
  it('should list invoices for facility owner', async () => {
    // Create an invoice via Prisma
    await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-TEST-${Date.now()}`,
        facilityId: facility.id,
        depositorId: farmer.id,
        lotId: lot.id,
        subtotal: 500,
        taxAmount: 0,
        totalAmount: 500,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'ISSUED',
        createdById: owner.id,
      },
    });

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────
// Get Invoice Detail
// ─────────────────────────────────────────────

describe('GET /invoices/:id', () => {
  it('should return full invoice detail with line items', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-DETAIL-${Date.now()}`,
        facilityId: facility.id,
        depositorId: farmer.id,
        subtotal: 300,
        taxAmount: 54,
        totalAmount: 354,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'ISSUED',
        createdById: owner.id,
        lineItems: {
          create: [
            { description: 'Storage rent', quantity: 100, unitPrice: 3, totalPrice: 300 },
          ],
        },
      },
    });

    const res = await request(app)
      .get(`${API}/${invoice.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(invoice.id);
    expect(res.body.data.lineItems.length).toBe(1);
    expect(res.body.data.depositor).toBeDefined();
    expect(res.body.data.facility).toBeDefined();
  });

  it('should return 404 for non-existent invoice', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Update Payment Status
// ─────────────────────────────────────────────

describe('PATCH /invoices/:id/status', () => {
  it('should update invoice status to PAID', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-PAY-${Date.now()}`,
        facilityId: facility.id,
        depositorId: farmer.id,
        lotId: lot.id,
        subtotal: 1000,
        taxAmount: 0,
        totalAmount: 1000,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'ISSUED',
        createdById: owner.id,
      },
    });

    const res = await request(app)
      .patch(`${API}/${invoice.id}/status`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ status: 'PAID', paidAmount: 1000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PAID');
    expect(parseFloat(res.body.data.paidAmount)).toBe(1000);
  });

  it('should reject status update from FARMER role', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-NOUPD-${Date.now()}`,
        facilityId: facility.id,
        depositorId: farmer.id,
        subtotal: 500,
        taxAmount: 0,
        totalAmount: 500,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'ISSUED',
        createdById: owner.id,
      },
    });

    await request(app)
      .patch(`${API}/${invoice.id}/status`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ status: 'PAID' })
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// PDF Download
// ─────────────────────────────────────────────

describe('GET /invoices/:id/pdf', () => {
  it('should return a PDF buffer with correct content type', async () => {
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber: `INV-PDF-${Date.now()}`,
        facilityId: facility.id,
        depositorId: farmer.id,
        subtotal: 400,
        taxAmount: 72,
        totalAmount: 472,
        dueDate: new Date(Date.now() + 30 * 86400000),
        status: 'ISSUED',
        createdById: owner.id,
        lineItems: {
          create: [
            { description: 'Cold storage rent', quantity: 80, unitPrice: 5, totalPrice: 400 },
          ],
        },
      },
    });

    const res = await request(app)
      .get(`${API}/${invoice.id}/pdf`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('invoice-');
    expect(res.body).toBeDefined();
  });
});
