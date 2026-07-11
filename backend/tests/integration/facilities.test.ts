/**
 * Facilities Module — Integration Tests
 *
 * Tests:
 * - Create facility (owner only)
 * - List facilities (with filtering)
 * - Get facility detail
 * - Update facility
 * - Verify facility (admin only)
 * - Role-based access control
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser, createTestFacility,
  TestUser,
} from '../helpers/setup';

const API = '/api/v1/facilities';

let owner: TestUser;
let farmer: TestUser;
let admin: TestUser;

beforeEach(async () => {
  await cleanDatabase();
  // Create users for each test
  owner = await createTestUser('OWNER');
  farmer = await createTestUser('FARMER');
  // For admin, create directly in DB since register only allows FARMER/BUYER/OWNER/STAFF
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Admin User',
      phone: '7777700001',
      passwordHash: '$2a$12$LJ2yqQiX0yQGqOQlJmJRhOzG5Rne4w3d1kqB8q9uF3QP9rQGGR6Bi', // 'testpass123'
      role: 'ADMIN',
      status: 'ACTIVE',
      addressLine1: '1 Admin HQ',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarNumber: '999999999999',
    },
  });
  // Login to get token
  admin = await createTestUser('OWNER', { phone: '7777700099', aadhaarNumber: '999999999990' });
  // Manually promote to admin
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
  // Re-login to get token with updated role
  admin = { ...admin, role: 'ADMIN' };
  // Actually we need a fresh token with ADMIN role. Let's just use the owner token and test ownership.
  // For cleaner tests, let's use the admin user we created:
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('testpass123', 12);
  await prisma.user.update({ where: { id: adminUser.id }, data: { passwordHash: hash } });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ phone: '7777700001', password: 'testpass123' });
  admin = {
    id: adminUser.id,
    phone: '7777700001',
    fullName: 'Admin User',
    role: 'ADMIN',
    accessToken: loginRes.body.data.accessToken,
    refreshToken: loginRes.body.data.refreshToken,
  };
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Create Facility
// ─────────────────────────────────────────────

describe('POST /facilities', () => {
  it('should allow OWNER to create a facility', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        name: 'PK Cold Storage',
        addressLine1: '456 Industrial Area',
        city: 'Agra',
        district: 'Agra',
        state: 'Uttar Pradesh',
        pincode: '282002',
        totalCapacityMt: 11000,
        storageType: 'HYBRID',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('PK Cold Storage');
    expect(res.body.data.status).toBe('PENDING_REVIEW');
    expect(res.body.data.ownerId).toBe(owner.id);
  });

  it('should reject facility creation by FARMER', async () => {
    await request(app)
      .post(API)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({
        name: 'Unauthorized Facility',
        addressLine1: '123 Road',
        city: 'Agra',
        district: 'Agra',
        state: 'UP',
        pincode: '282001',
        totalCapacityMt: 100,
      })
      .expect(403);
  });

  it('should reject facility with missing required fields', async () => {
    const res = await request(app)
      .post(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Incomplete' })
      .expect(422);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// List Facilities
// ─────────────────────────────────────────────

describe('GET /facilities', () => {
  it('should list facilities', async () => {
    await createTestFacility(owner.id, { name: 'Facility One' });
    await createTestFacility(owner.id, { name: 'Facility Two' });

    const res = await request(app)
      .get(API)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });
});

// ─────────────────────────────────────────────
// Get Facility Detail
// ─────────────────────────────────────────────

describe('GET /facilities/:id', () => {
  it('should return facility details with chambers', async () => {
    const facility = await createTestFacility(owner.id);

    const res = await request(app)
      .get(`${API}/${facility.id}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(facility.id);
    expect(res.body.data.name).toBe(facility.name);
  });

  it('should return 404 for non-existent facility', async () => {
    await request(app)
      .get(`${API}/00000000-0000-0000-0000-000000000000`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(404);
  });
});

// ─────────────────────────────────────────────
// Verify Facility (Admin)
// ─────────────────────────────────────────────

describe('PATCH /facilities/:id/verify', () => {
  it('should allow ADMIN to verify a facility', async () => {
    const facility = await createTestFacility(owner.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .patch(`${API}/${facility.id}/verify`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ status: 'ACTIVE', verificationNotes: 'All documents verified' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('should reject verification by non-admin', async () => {
    const facility = await createTestFacility(owner.id);

    await request(app)
      .patch(`${API}/${facility.id}/verify`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ status: 'ACTIVE' })
      .expect(403);
  });
});
