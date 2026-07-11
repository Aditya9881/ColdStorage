/**
 * Escrow Module — Integration Tests
 *
 * Tests:
 * - List escrow transactions (role-scoped)
 * - Get escrow detail
 * - Buyer pays (initiates escrow → HELD)
 * - Release escrow funds to seller
 * - Refund buyer (admin only)
 * - Dispute escrow
 * - Reject payment on unapproved order
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber, createTestLot,
  TestUser, TestFacility, TestChamber, TestLot,
} from '../helpers/setup';

const API = '/api/v1/escrow';

let owner: TestUser;
let farmer: TestUser;
let buyer: TestUser;
let admin: TestUser;
let facility: TestFacility;
let chamber: TestChamber;
let lot: TestLot;

beforeEach(async () => {
  await cleanDatabase();
  owner = await createTestUser('OWNER');
  farmer = await createTestUser('FARMER');
  buyer = await createTestUser('BUYER');
  facility = await createTestFacility(owner.id);
  chamber = await createTestChamber(facility.id);
  lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id);

  // Create admin
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('testpass123', 12);
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Escrow Admin',
      phone: '6666600001',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'ACTIVE',
      addressLine1: 'Admin HQ',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarNumber: '666666666666',
    },
  });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ phone: '6666600001', password: 'testpass123' });
  admin = {
    id: adminUser.id,
    phone: '6666600001',
    fullName: 'Escrow Admin',
    role: 'ADMIN',
    accessToken: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
  };
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// Helper to create a listing + approved order
async function createApprovedOrderWithListing() {
  const listing = await prisma.marketListing.create({
    data: {
      lotId: lot.id,
      sellerId: farmer.id,
      askingPricePerKg: 15,
      status: 'ACTIVE',
    },
  });

  const order = await prisma.order.create({
    data: {
      listingId: listing.id,
      buyerId: buyer.id,
      quantityKg: 1000,
      agreedPricePerKg: 15,
      totalAmount: 15000,
      status: 'APPROVED',
    },
  });

  return { listing, order };
}

// ─────────────────────────────────────────────
// Buyer Payment (Initiate Escrow)
// ─────────────────────────────────────────────

describe('POST /escrow/:orderId/pay', () => {
  it('should allow buyer to pay for an approved order', async () => {
    const { order } = await createApprovedOrderWithListing();

    const res = await request(app)
      .post(`${API}/${order.id}/pay`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ pgReferenceId: 'PAY-123456', pgProvider: 'razorpay' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('HELD');
    expect(parseFloat(res.body.data.amount)).toBe(15000);
    expect(res.body.data.pgReferenceId).toBe('PAY-123456');
  });

  it('should reject payment on non-approved order', async () => {
    const listing = await prisma.marketListing.create({
      data: { lotId: lot.id, sellerId: farmer.id, askingPricePerKg: 10 },
    });
    const order = await prisma.order.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        quantityKg: 500,
        agreedPricePerKg: 10,
        totalAmount: 5000,
        status: 'PENDING_APPROVAL',
      },
    });

    await request(app)
      .post(`${API}/${order.id}/pay`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({})
      .expect(400);
  });

  it('should reject payment by wrong buyer', async () => {
    const { order } = await createApprovedOrderWithListing();
    const otherBuyer = await createTestUser('BUYER');

    await request(app)
      .post(`${API}/${order.id}/pay`)
      .set('Authorization', `Bearer ${otherBuyer.accessToken}`)
      .send({})
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// List Escrow Transactions
// ─────────────────────────────────────────────

describe('GET /escrow', () => {
  it('should list escrow transactions for buyer', async () => {
    const { order } = await createApprovedOrderWithListing();
    await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.transactions.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Get Escrow Detail
// ─────────────────────────────────────────────

describe('GET /escrow/:id', () => {
  it('should return escrow detail with order and parties', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    const res = await request(app)
      .get(`${API}/${escrow.id}`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(escrow.id);
    expect(res.body.data.order).toBeDefined();
    expect(res.body.data.order.buyer).toBeDefined();
  });

  it('should return 404 for non-existent escrow', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Release Escrow
// ─────────────────────────────────────────────

describe('POST /escrow/:id/release', () => {
  it('should release escrow on dispatched order', async () => {
    const { order } = await createApprovedOrderWithListing();
    // Move order to DISPATCHED
    await prisma.order.update({ where: { id: order.id }, data: { status: 'DISPATCHED' } });

    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    const res = await request(app)
      .post(`${API}/${escrow.id}/release`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RELEASED');
    expect(parseFloat(res.body.data.netToSeller)).toBe(15000);
  });

  it('should reject release on non-held escrow', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'RELEASED',
        buyerPaidAt: new Date(),
        sellerReleasedAt: new Date(),
      },
    });

    await request(app)
      .post(`${API}/${escrow.id}/release`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(400);
  });
});

// ─────────────────────────────────────────────
// Refund Escrow
// ─────────────────────────────────────────────

describe('POST /escrow/:id/refund', () => {
  it('should allow admin to refund held escrow', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    const res = await request(app)
      .post(`${API}/${escrow.id}/refund`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'Order cancelled by seller' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('REFUNDED');
  });

  it('should reject refund by non-admin', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    await request(app)
      .post(`${API}/${escrow.id}/refund`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ reason: 'Want my money back' })
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// Dispute Escrow
// ─────────────────────────────────────────────

describe('POST /escrow/:id/dispute', () => {
  it('should allow buyer to dispute a held escrow', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    const res = await request(app)
      .post(`${API}/${escrow.id}/dispute`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({ reason: 'Received damaged goods' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('DISPUTED');
  });

  it('should reject dispute without reason', async () => {
    const { order } = await createApprovedOrderWithListing();
    const escrow = await prisma.escrowTransaction.create({
      data: {
        orderId: order.id,
        amount: 15000,
        status: 'HELD',
        buyerPaidAt: new Date(),
      },
    });

    await request(app)
      .post(`${API}/${escrow.id}/dispute`)
      .set('Authorization', `Bearer ${buyer.accessToken}`)
      .send({})
      .expect(400);
  });
});
