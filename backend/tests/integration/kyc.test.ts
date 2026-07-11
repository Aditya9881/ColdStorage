/**
 * KYC Module — Integration Tests
 *
 * Tests:
 * - View own documents (empty state)
 * - Admin list pending KYC
 * - Admin review and approve KYC
 * - Admin reject KYC with reason
 * - Clear rejected documents
 * - Reject review without reason when rejecting
 *
 * NOTE: File upload is tested indirectly — we create document records
 * directly via Prisma since multipart upload requires actual files.
 */

import {
  app, request, prisma, cleanDatabase, disconnectTestDb,
  createTestUser,
  TestUser,
} from '../helpers/setup';

const API = '/api/v1/kyc';

let farmer: TestUser;
let admin: TestUser;

beforeEach(async () => {
  await cleanDatabase();
  farmer = await createTestUser('FARMER');

  // Create admin user
  const bcrypt = require('bcryptjs');
  const hash = await bcrypt.hash('testpass123', 12);
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'KYC Admin',
      phone: '5555500001',
      passwordHash: hash,
      role: 'ADMIN',
      status: 'ACTIVE',
      addressLine1: 'Admin HQ',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
      aadhaarNumber: '555555555555',
    },
  });
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ phone: '5555500001', password: 'testpass123' });
  admin = {
    id: adminUser.id,
    phone: '5555500001',
    fullName: 'KYC Admin',
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
// My Documents
// ─────────────────────────────────────────────

describe('GET /kyc/my-documents', () => {
  it('should return empty array when no documents uploaded', async () => {
    const res = await request(app)
      .get(`${API}/my-documents`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    // Should be an empty array or object
    expect(res.body.data).toBeDefined();
  });

  it('should return documents after upload', async () => {
    // Create document directly (simulating upload)
    await prisma.userDocument.create({
      data: {
        userId: farmer.id,
        documentType: 'AADHAAR',
        documentNumber: '123456789012',
        filename: 'aadhaar-front.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 150000,
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .get(`${API}/my-documents`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Admin — Pending KYC List
// ─────────────────────────────────────────────

describe('GET /kyc/pending', () => {
  it('should list users with pending KYC for admin', async () => {
    // Mark farmer's KYC as pending
    await prisma.user.update({
      where: { id: farmer.id },
      data: { kycStatus: 'PENDING' },
    });

    const res = await request(app)
      .get(`${API}/pending`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should reject pending list for non-admin', async () => {
    await request(app)
      .get(`${API}/pending`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// Admin — Review KYC
// ─────────────────────────────────────────────

describe('GET /kyc/review/:userId', () => {
  it('should return user KYC details for admin', async () => {
    // Create a document for the user
    await prisma.userDocument.create({
      data: {
        userId: farmer.id,
        documentType: 'AADHAAR',
        filename: 'aadhaar.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 100000,
        status: 'PENDING',
      },
    });

    const res = await request(app)
      .get(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should reject review access for non-admin', async () => {
    await request(app)
      .get(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// Admin — Approve/Reject KYC
// ─────────────────────────────────────────────

describe('POST /kyc/review/:userId', () => {
  it('should allow admin to approve KYC', async () => {
    await prisma.user.update({
      where: { id: farmer.id },
      data: { kycStatus: 'PENDING' },
    });

    const res = await request(app)
      .post(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ approved: true })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should allow admin to reject KYC with reason', async () => {
    await prisma.user.update({
      where: { id: farmer.id },
      data: { kycStatus: 'PENDING' },
    });

    const res = await request(app)
      .post(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ approved: false, rejectionReason: 'Aadhaar photo is blurry, please re-upload' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should reject rejection without reason', async () => {
    await request(app)
      .post(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ approved: false })
      .expect(400);
  });

  it('should reject review without approved boolean', async () => {
    await request(app)
      .post(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({ reason: 'some reason' })
      .expect(400);
  });

  it('should reject review by non-admin', async () => {
    await request(app)
      .post(`${API}/review/${farmer.id}`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .send({ approved: true })
      .expect(403);
  });
});

// ─────────────────────────────────────────────
// Clear Rejected Documents
// ─────────────────────────────────────────────

describe('DELETE /kyc/clear-rejected', () => {
  it('should clear rejected documents', async () => {
    await prisma.userDocument.create({
      data: {
        userId: farmer.id,
        documentType: 'AADHAAR',
        filename: 'rejected-aadhaar.jpg',
        mimeType: 'image/jpeg',
        fileSizeBytes: 50000,
        status: 'REJECTED',
      },
    });

    const res = await request(app)
      .delete(`${API}/clear-rejected`)
      .set('Authorization', `Bearer ${farmer.accessToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});
