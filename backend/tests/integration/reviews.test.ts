/**
 * Reviews Module — Integration Tests
 *
 * Tests:
 * - Create review (farmer who has lots at facility)
 * - List reviews with aggregation and distribution
 * - Get review summary
 * - Update own review (upsert)
 * - Delete own review
 * - Reject review for facility where farmer has no lots
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility, createTestChamber, createTestLot,
  TestUser, TestFacility, TestChamber, TestLot,
} from '../helpers/setup';

const API = '/api/v1/reviews';

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
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Create Review
// ─────────────────────────────────────────────

describe('POST /reviews/:facilityId', () => {
  it('should allow FARMER with lots to create a review', async () => {
    const res = await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 4, comment: 'Great cold storage, well maintained!' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
    expect(res.body.data.comment).toBe('Great cold storage, well maintained!');
  });

  it('should reject review from farmer with no lots at facility', async () => {
    const otherFarmer = await createTestUser('FARMER');

    await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${otherFarmer.accessToken}`)
      .send({ rating: 5 })
      .expect(403);
  });

  it('should upsert — update existing review', async () => {
    // First review
    await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 3, comment: 'Decent' })
      .expect(201);

    // Update
    const res = await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 5, comment: 'Actually amazing after improvements!' })
      .expect(201);

    expect(res.body.data.rating).toBe(5);
    expect(res.body.data.comment).toBe('Actually amazing after improvements!');

    // Should still be just one review
    const count = await prisma.facilityReview.count({
      where: { facilityId: facility.id, userId: farmer.id },
    });
    expect(count).toBe(1);
  });

  it('should reject invalid rating (0 or 6)', async () => {
    await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 0 })
      .expect(422);

    await request(app)
      .post(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 6 })
      .expect(422);
  });

  it('should reject review for non-existent facility', async () => {
    await request(app)
      .post(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ rating: 4 })
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// List Reviews
// ─────────────────────────────────────────────

describe('GET /reviews/:facilityId', () => {
  it('should list reviews with aggregation', async () => {
    // Create some reviews
    await prisma.facilityReview.create({
      data: { facilityId: facility.id, userId: farmer.id, rating: 4, comment: 'Good' },
    });

    const res = await request(app)
      .get(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.reviews.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.averageRating).toBeDefined();
    expect(res.body.data.summary.totalReviews).toBeGreaterThanOrEqual(1);
    expect(res.body.data.summary.distribution).toBeDefined();
    expect(res.body.data.pagination).toBeDefined();
  });
});

// ─────────────────────────────────────────────
// Review Summary
// ─────────────────────────────────────────────

describe('GET /reviews/:facilityId/summary', () => {
  it('should return quick summary (average + count)', async () => {
    await prisma.facilityReview.create({
      data: { facilityId: facility.id, userId: farmer.id, rating: 5 },
    });

    const res = await request(app)
      .get(`${API}/${facility.id}/summary`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.facilityId).toBe(facility.id);
    expect(res.body.data.averageRating).toBe(5);
    expect(res.body.data.totalReviews).toBe(1);
  });
});

// ─────────────────────────────────────────────
// My Review
// ─────────────────────────────────────────────

describe('GET /reviews/:facilityId/my-review', () => {
  it('should return the current user\'s review', async () => {
    await prisma.facilityReview.create({
      data: { facilityId: facility.id, userId: farmer.id, rating: 4, comment: 'My review' },
    });

    const res = await request(app)
      .get(`${API}/${facility.id}/my-review`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.rating).toBe(4);
  });

  it('should return null if user has no review', async () => {
    const res = await request(app)
      .get(`${API}/${facility.id}/my-review`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.data).toBeNull();
  });
});

// ─────────────────────────────────────────────
// Delete Review
// ─────────────────────────────────────────────

describe('DELETE /reviews/:facilityId', () => {
  it('should delete own review', async () => {
    await prisma.facilityReview.create({
      data: { facilityId: facility.id, userId: farmer.id, rating: 3 },
    });

    const res = await request(app)
      .delete(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);

    // Verify deleted
    const review = await prisma.facilityReview.findUnique({
      where: { facilityId_userId: { facilityId: facility.id, userId: farmer.id } },
    });
    expect(review).toBeNull();
  });

  it('should return 404 when deleting non-existent review', async () => {
    await request(app)
      .delete(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(404);
  });
});
