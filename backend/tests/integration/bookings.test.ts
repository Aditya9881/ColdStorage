/**
 * Bookings Module — Integration Tests
 *
 * Tests:
 * - Create booking (farmer happy path)
 * - Create booking (validation errors)
 * - Create booking (unauthorized — non-farmer)
 * - List my bookings (farmer)
 * - List facility bookings (owner)
 * - Get booking by ID (farmer, owner, unauthorized)
 * - Update status: PENDING → CONFIRMED (owner)
 * - Update status: CONFIRMED → CANCELLED (farmer)
 * - Reject booking (owner)
 */

import {
  app, request, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber,
  TestUser, TestFacility, TestChamber,
} from '../helpers/setup';

const API = '/api/v1/bookings';

let farmer: TestUser;
let owner: TestUser;
let otherFarmer: TestUser;
let facility: TestFacility;
let chamber: TestChamber;

beforeAll(async () => {
  await cleanDatabase();
  // Create users
  farmer = await createTestUser('FARMER');
  otherFarmer = await createTestUser('FARMER');
  owner = await createTestUser('OWNER');
  // Create facility and chamber for the owner
  facility = await createTestFacility(owner.id);
  chamber = await createTestChamber(facility.id);
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Create Booking
// ─────────────────────────────────────────────

describe('POST /bookings', () => {
  it('should create a booking for a farmer', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'POTATO',
        commodityName: 'Kufri Jyoti Potato',
        estimatedWeightKg: 5000,
        estimatedBags: 100,
        preferredDate: new Date(Date.now() + 86400000).toISOString(), // tomorrow
        preferredSlot: 'MORNING',
        storageDuration: 90,
        farmerNote: 'Please handle with care',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.bookingNumber).toBeDefined();
    expect(res.body.data.status).toBe('PENDING');
    expect(res.body.data.farmerId).toBe(farmer.id);
    expect(res.body.data.facilityId).toBe(facility.id);
    expect(res.body.data.commodityCategory).toBe('POTATO');
    expect(res.body.data.estimatedWeightKg).toBe(5000);
  });

  it('should reject booking without required fields', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        // missing commodityCategory, commodityName, estimatedWeightKg, preferredDate
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject booking from non-farmer', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'POTATO',
        commodityName: 'Potato',
        estimatedWeightKg: 2000,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('should reject booking for non-existent facility', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: '00000000-0000-0000-0000-000000000000',
        commodityCategory: 'POTATO',
        commodityName: 'Potato',
        estimatedWeightKg: 2000,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(404);

    expect(res.body.error.code).toBe('FACILITY_NOT_FOUND');
  });

  it('should reject unauthenticated request', async () => {
    await request(app)
      .post(API)
      .send({
        facilityId: facility.id,
        commodityCategory: 'POTATO',
        commodityName: 'Potato',
        estimatedWeightKg: 2000,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      })
      .expect(401);
  });
});

// ─────────────────────────────────────────────
// List Bookings
// ─────────────────────────────────────────────

describe('GET /bookings/my', () => {
  it('should list farmer\'s own bookings', async () => {
    const res = await request(app)
      .get(`${API}/my`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.bookings).toBeDefined();
    expect(Array.isArray(res.body.data.bookings)).toBe(true);
    // At least the booking created above should exist
    expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
  });

  it('should return empty for farmer with no bookings', async () => {
    const res = await request(app)
      .get(`${API}/my`)
      .set('Authorization', `Bearer ${otherFarmer.accessToken}`)
      .expect(200);

    expect(res.body.data.bookings.length).toBe(0);
  });
});

describe('GET /bookings/facility/:facilityId', () => {
  it('should list facility bookings for owner', async () => {
    const res = await request(app)
      .get(`${API}/facility/${facility.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.bookings).toBeDefined();
    expect(res.body.data.bookings.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject facility bookings for farmer (unauthorized role)', async () => {
    const res = await request(app)
      .get(`${API}/facility/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Get Booking by ID
// ─────────────────────────────────────────────

describe('GET /bookings/:id', () => {
  let bookingId: string;

  beforeAll(async () => {
    // Create a booking for this describe block
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'ONION',
        commodityName: 'Red Onion',
        estimatedWeightKg: 3000,
        preferredDate: new Date(Date.now() + 172800000).toISOString(), // day after tomorrow
      });
    bookingId = res.body.data.id;
  });

  it('should return booking detail for the farmer who created it', async () => {
    const res = await request(app)
      .get(`${API}/${bookingId}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(bookingId);
    expect(res.body.data.facility).toBeDefined();
    expect(res.body.data.farmer).toBeDefined();
  });

  it('should return booking detail for the facility owner', async () => {
    const res = await request(app)
      .get(`${API}/${bookingId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.data.id).toBe(bookingId);
  });

  it('should reject access for another farmer', async () => {
    await request(app)
      .get(`${API}/${bookingId}`)
      .set('Authorization', `Bearer ${otherFarmer.accessToken}`)
      .expect(403);
  });

  it('should return 404 for non-existent booking', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Update Booking Status
// ─────────────────────────────────────────────

describe('PATCH /bookings/:id/status', () => {
  let bookingId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'POTATO',
        commodityName: 'Chandramukhi Potato',
        estimatedWeightKg: 4000,
        estimatedBags: 80,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      });
    bookingId = res.body.data.id;
  });

  it('should allow owner to confirm a PENDING booking', async () => {
    const res = await request(app)
      .patch(`${API}/${bookingId}/status`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        status: 'CONFIRMED',
        chamberId: chamber.id,
        ownerNote: 'Confirmed for Chamber 1',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CONFIRMED');
  });

  it('should reject invalid status transition', async () => {
    // Booking is now CONFIRMED; jumping to DISPATCHED is invalid
    const res = await request(app)
      .patch(`${API}/${bookingId}/status`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ status: 'DISPATCHED' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject status update from unauthorized farmer', async () => {
    await request(app)
      .patch(`${API}/${bookingId}/status`)
      .set('Authorization', `Bearer ${otherFarmer.accessToken}`)
      .send({ status: 'CANCELLED', cancelReason: 'Plans changed' })
      .expect(403);
  });
});

describe('Booking cancellation', () => {
  let bookingId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'VEGETABLES',
        commodityName: 'Mixed Vegetables',
        estimatedWeightKg: 1500,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      });
    bookingId = res.body.data.id;
  });

  it('should allow the booking farmer to cancel a PENDING booking', async () => {
    const res = await request(app)
      .patch(`${API}/${bookingId}/status`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        status: 'CANCELLED',
        cancelReason: 'Found a closer facility',
      })
      .expect(200);

    expect(res.body.data.status).toBe('CANCELLED');
  });
});

describe('Booking rejection by owner', () => {
  let bookingId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        facilityId: facility.id,
        commodityCategory: 'FRUITS',
        commodityName: 'Mango',
        estimatedWeightKg: 2000,
        preferredDate: new Date(Date.now() + 86400000).toISOString(),
      });
    bookingId = res.body.data.id;
  });

  it('should allow owner to reject a PENDING booking', async () => {
    const res = await request(app)
      .patch(`${API}/${bookingId}/status`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        status: 'REJECTED',
        ownerNote: 'Facility at full capacity',
      })
      .expect(200);

    expect(res.body.data.status).toBe('REJECTED');
  });
});
