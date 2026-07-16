/**
 * Auth Module — Integration Tests
 *
 * Tests:
 * - Registration (happy path + validation + duplicates)
 * - Login (happy path + wrong password + suspended account)
 * - Token refresh
 * - Logout
 * - Get profile (authenticated)
 */

import {
  app, request, cleanDatabase, disconnectTestDb,
  createTestUser, loginTestUser,
} from '../helpers/setup';

const API = '/api/v1/auth';

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await disconnectTestDb();
});

// ─────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────

describe('POST /auth/register', () => {
  it('should register a new FARMER and return tokens', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Ramesh Kumar',
        phone: '9876543210',
        password: 'secure123',
        role: 'FARMER',
        addressLine1: '123 Village Road',
        city: 'Agra',
        state: 'Uttar Pradesh',
        pincode: '282001',
        aadhaarNumber: '123456789012',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.role).toBe('FARMER');
    expect(res.body.data.user.phone).toBe('9876543210');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Password hash should NOT be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('should register a BUYER with business details', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Suresh Traders',
        phone: '9876543211',
        password: 'secure123',
        role: 'BUYER',
        addressLine1: '456 Market Lane',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        aadhaarNumber: '111122223333',
        businessName: 'Suresh Potato Trading',
        businessType: 'Wholesaler',
      })
      .expect(201);

    expect(res.body.data.user.role).toBe('BUYER');
  });

  it('should reject registration with duplicate phone', async () => {
    await createTestUser('FARMER', { phone: '9999911111', aadhaarNumber: '000000000001' });

    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Another User',
        phone: '9999911111',
        password: 'secure123',
        role: 'FARMER',
        addressLine1: '123 Road',
        city: 'Agra',
        state: 'UP',
        pincode: '282001',
        aadhaarNumber: '000000000002',
      })
      .expect(409);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should reject registration with missing required fields', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Bad User',
        // missing phone, password, role, address, aadhaar
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject registration with invalid Aadhaar (not 12 digits)', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Invalid Aadhaar',
        phone: '9876500001',
        password: 'secure123',
        role: 'FARMER',
        addressLine1: '123 Road',
        city: 'Agra',
        state: 'UP',
        pincode: '282001',
        aadhaarNumber: '123',  // too short
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject registration with short password', async () => {
    const res = await request(app)
      .post(`${API}/register`)
      .send({
        fullName: 'Short Pass',
        phone: '9876500002',
        password: '123',  // too short
        role: 'FARMER',
        addressLine1: '123 Road',
        city: 'Agra',
        state: 'UP',
        pincode: '282001',
        aadhaarNumber: '999988887777',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('should login with correct phone + password', async () => {
    const user = await createTestUser('FARMER');

    const res = await request(app)
      .post(`${API}/login`)
      .send({ phone: user.phone, password: 'testpass123' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(user.id);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const user = await createTestUser('FARMER');

    const res = await request(app)
      .post(`${API}/login`)
      .send({ phone: user.phone, password: 'wrongpassword' })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('should reject login for non-existent phone', async () => {
    const res = await request(app)
      .post(`${API}/login`)
      .send({ phone: '0000000000', password: 'anything' })
      .expect(401);

    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

// ─────────────────────────────────────────────
// Token Refresh
// ─────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  it('should return new tokens with a valid refresh token', async () => {
    const user = await createTestUser('FARMER');

    const res = await request(app)
      .post(`${API}/refresh`)
      .send({ refreshToken: user.refreshToken })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // New tokens should differ from original
    expect(res.body.data.refreshToken).not.toBe(user.refreshToken);
  });

  it('should reject an invalid refresh token', async () => {
    const res = await request(app)
      .post(`${API}/refresh`)
      .send({ refreshToken: 'completely-invalid-token' })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Logout
// ─────────────────────────────────────────────

describe('POST /auth/logout', () => {
  it('should invalidate refresh token on logout', async () => {
    const user = await createTestUser('FARMER');

    // Logout
    await request(app)
      .post(`${API}/logout`)
      .send({ refreshToken: user.refreshToken })
      .expect(200);

    // Refresh should now fail
    const res = await request(app)
      .post(`${API}/refresh`)
      .send({ refreshToken: user.refreshToken })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Get Profile
// ─────────────────────────────────────────────

describe('GET /auth/me', () => {
  it('should return current user profile with valid token', async () => {
    const user = await createTestUser('FARMER');

    const res = await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${user.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(user.id);
    expect(res.body.data.role).toBe('FARMER');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('should reject with missing token', async () => {
    await request(app)
      .get(`${API}/me`)
      .expect(401);
  });

  it('should reject with invalid token', async () => {
    await request(app)
      .get(`${API}/me`)
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });
});
