/**
 * Warehouse Receipts Module — Integration Tests
 *
 * Tests:
 * - Generate eNWR for a stored lot
 * - List receipts (scoped by role)
 * - Get receipt detail
 * - Pledge receipt to bank
 * - Redeem (unpledge) receipt
 * - Reject duplicate receipt for same lot
 * - Reject receipt for non-stored lot
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber, createTestLot,
  TestUser, TestFacility, TestChamber, TestLot,
} from '../helpers/setup';

const API = '/api/v1/warehouse-receipts';

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
  lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
    status: 'STORED',
  });
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Generate eNWR
// ─────────────────────────────────────────────

describe('POST /warehouse-receipts', () => {
  it('should generate eNWR for a stored lot', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ lotId: lot.id })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.receiptNumber).toContain('ENWR-');
    expect(res.body.data.lot).toBeDefined();
    expect(res.body.data.lot.lotNumber).toBe(lot.lotNumber);
  });

  it('should reject duplicate receipt for same lot', async () => {
    // First receipt
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ lotId: lot.id })
      .expect(201);

    // Duplicate
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ lotId: lot.id })
      .expect(409);
  });

  it('should reject receipt for released lot', async () => {
    const releasedLot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
      status: 'FULLY_RELEASED',
    });

    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ lotId: releasedLot.id })
      .expect(400);
  });

  it('should reject receipt creation by FARMER', async () => {
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ lotId: lot.id })
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// List Receipts
// ─────────────────────────────────────────────

describe('GET /warehouse-receipts', () => {
  it('should list receipts for facility owner', async () => {
    await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-TEST-${Date.now()}`,
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.receipts.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  it('should filter by pledged status', async () => {
    await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-PLEDGED-${Date.now()}`,
        isPledged: true,
        pledgedTo: 'SBI',
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const res = await request(app)
      .get(`${API}?pledged=true`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.data.receipts.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────
// Receipt Detail
// ─────────────────────────────────────────────

describe('GET /warehouse-receipts/:id', () => {
  it('should return full receipt detail', async () => {
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-DETAIL-${Date.now()}`,
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const res = await request(app)
      .get(`${API}/${receipt.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(receipt.id);
    expect(res.body.data.lot).toBeDefined();
    expect(res.body.data.lot.depositor).toBeDefined();
    expect(res.body.data.lot.facility).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Pledge Receipt
// ─────────────────────────────────────────────

describe('PATCH /warehouse-receipts/:id/pledge', () => {
  it('should allow farmer to pledge their receipt to a bank', async () => {
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-PLEDGE-${Date.now()}`,
        status: 'ACTIVE',
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const res = await request(app)
      .patch(`${API}/${receipt.id}/pledge`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ pledgedTo: 'State Bank of India', pledgeAmount: 250000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPledged).toBe(true);
    expect(res.body.data.pledgedTo).toBe('State Bank of India');
    expect(res.body.data.status).toBe('PLEDGED');
  });

  it('should reject double pledge', async () => {
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-DPLEDGE-${Date.now()}`,
        status: 'ACTIVE',
        isPledged: true,
        pledgedTo: 'HDFC Bank',
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    await request(app)
      .patch(`${API}/${receipt.id}/pledge`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ pledgedTo: 'ICICI Bank', pledgeAmount: 100000 })
      .expect(409);
  });
});

// ─────────────────────────────────────────────
// Redeem Receipt
// ─────────────────────────────────────────────

describe('PATCH /warehouse-receipts/:id/redeem', () => {
  it('should redeem (unpledge) a pledged receipt', async () => {
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-REDEEM-${Date.now()}`,
        status: 'PLEDGED',
        isPledged: true,
        pledgedTo: 'SBI',
        pledgeAmount: 200000,
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    const res = await request(app)
      .patch(`${API}/${receipt.id}/redeem`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.isPledged).toBe(false);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject redeem on non-pledged receipt', async () => {
    const receipt = await prisma.warehouseReceipt.create({
      data: {
        lotId: lot.id,
        receiptNumber: `ENWR-NOPLEDGE-${Date.now()}`,
        status: 'ACTIVE',
        isPledged: false,
        expiresAt: new Date(Date.now() + 365 * 86400000),
      },
    });

    await request(app)
      .patch(`${API}/${receipt.id}/redeem`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(400);
  });
});
