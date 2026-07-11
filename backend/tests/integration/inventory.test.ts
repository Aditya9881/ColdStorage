/**
 * Inventory Module — Integration Tests
 *
 * Tests:
 * - Lot intake (staff/owner creates a lot for a depositor)
 * - List lots (scoped by role)
 * - Get lot detail
 * - Release lot (full and partial)
 * - Quality update
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber, createTestLot,
  TestUser, TestFacility, TestChamber,
} from '../helpers/setup';

const API = '/api/v1/inventory';

let owner: TestUser;
let farmer: TestUser;
let facility: TestFacility;
let chamber: TestChamber;

beforeEach(async () => {
  await cleanDatabase();
  owner = await createTestUser('OWNER');
  farmer = await createTestUser('FARMER');
  facility = await createTestFacility(owner.id);
  chamber = await createTestChamber(facility.id);

  // Assign owner to facility
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
// Lot Intake
// ─────────────────────────────────────────────

describe('POST /inventory/intake', () => {
  it('should create a new lot for a depositor', async () => {
    const res = await request(app)
      .post(`${API}/intake`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        chamberId: chamber.id,
        depositorId: farmer.id,
        commodityCategory: 'POTATO',
        commodityName: 'Kufri Jyoti',
        intakeWeightKg: 5000,
        bagCount: 100,
        qualityGrade: 'A',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.lotNumber).toBeDefined();
    expect(res.body.data.receiptNumber).toBeDefined();
    expect(res.body.data.commodityName).toBe('Kufri Jyoti');
    expect(parseFloat(res.body.data.intakeWeightKg)).toBe(5000);
    expect(res.body.data.status).toBe('STORED');
  });

  it('should reject intake by FARMER (not staff/owner)', async () => {
    await request(app)
      .post(`${API}/intake`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        chamberId: chamber.id,
        depositorId: farmer.id,
        commodityCategory: 'POTATO',
        commodityName: 'Test',
        intakeWeightKg: 100,
      })
      .expect(403);
  });

  it('should reject intake with invalid chamber', async () => {
    const res = await request(app)
      .post(`${API}/intake`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        chamberId: '00000000-0000-0000-0000-000000000000',
        depositorId: farmer.id,
        commodityCategory: 'POTATO',
        commodityName: 'Test',
        intakeWeightKg: 100,
      })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// List Lots
// ─────────────────────────────────────────────

describe('GET /inventory', () => {
  it('should list lots for facility owner', async () => {
    await createTestLot(facility.id, chamber.id, farmer.id, owner.id);
    await createTestLot(facility.id, chamber.id, farmer.id, owner.id);

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('should list only farmer\'s own lots when logged in as FARMER', async () => {
    const otherFarmer = await createTestUser('FARMER');
    await createTestLot(facility.id, chamber.id, farmer.id, owner.id);
    await createTestLot(facility.id, chamber.id, otherFarmer.id, owner.id);

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Farmer should only see their own lots
    const allForFarmer = res.body.data.every(
      (lot: any) => lot.depositorId === farmer.id
    );
    expect(allForFarmer).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Get Lot Detail
// ─────────────────────────────────────────────

describe('GET /inventory/:id', () => {
  it('should return full lot details', async () => {
    const lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id);

    const res = await request(app)
      .get(`${API}/${lot.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(lot.id);
    expect(res.body.data.lotNumber).toBe(lot.lotNumber);
  });

  it('should return 404 for non-existent lot', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Release Lot
// ─────────────────────────────────────────────

describe('POST /inventory/:id/release', () => {
  it('should partially release a lot', async () => {
    const lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
      intakeWeightKg: 5000,
      currentWeightKg: 5000,
    });

    const res = await request(app)
      .post(`${API}/${lot.id}/release`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ weightKg: 2000, notes: 'Partial release for sale' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(parseFloat(res.body.data.currentWeightKg)).toBe(3000);
    expect(res.body.data.status).toBe('PARTIALLY_RELEASED');
  });

  it('should fully release a lot when releasing all weight', async () => {
    const lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
      intakeWeightKg: 1000,
      currentWeightKg: 1000,
    });

    const res = await request(app)
      .post(`${API}/${lot.id}/release`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ weightKg: 1000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(parseFloat(res.body.data.currentWeightKg)).toBe(0);
    expect(res.body.data.status).toBe('FULLY_RELEASED');
  });

  it('should reject release exceeding current weight', async () => {
    const lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
      intakeWeightKg: 1000,
      currentWeightKg: 1000,
    });

    await request(app)
      .post(`${API}/${lot.id}/release`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ weightKg: 5000 })
      .expect(400);
  });
});

// ─────────────────────────────────────────────
// Quality Update
// ─────────────────────────────────────────────

describe('PATCH /inventory/:id/quality', () => {
  it('should update quality grade of a lot', async () => {
    const lot = await createTestLot(facility.id, chamber.id, farmer.id, owner.id, {
      qualityGrade: 'A',
    });

    const res = await request(app)
      .patch(`${API}/${lot.id}/quality`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        qualityGrade: 'B',
        qualityNotes: 'Minor surface damage detected',
        moistureContent: 82.5,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.qualityGrade).toBe('B');
  });
});
