/**
 * Test Setup — shared utilities for integration tests
 *
 * Provides:
 * - Express app instance (no server.listen — Supertest handles that)
 * - Database cleanup between tests
 * - Helper to register + login users and get auth tokens
 * - Helper to create facilities, chambers, and lots for test scenarios
 */

import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/config/database';

export { app, request, prisma };

// ── Cleanup ──────────────────────────────────────
// Order matters due to foreign key constraints

const CLEANUP_ORDER = [
  'escrowTransaction',
  'order',
  'marketListing',
  'inventoryTransaction',
  'invoiceLineItem',
  'payment',
  'invoice',
  'warehouseReceipt',
  'inventoryLot',
  'temperatureReading',
  'ioTDevice',
  'facilityPricing',
  'facilityDocument',
  'facilityReview',
  'chamber',
  'notification',
  'auditLog',
  'userDocument',
  'userSession',
  'facility',
  'user',
] as const;

/**
 * Delete all data from the database in FK-safe order.
 * Call in beforeEach or afterAll to ensure test isolation.
 */
export async function cleanDatabase(): Promise<void> {
  for (const model of CLEANUP_ORDER) {
    // Use raw deleteMany — Prisma doesn't have a generic truncate
    await (prisma as any)[model].deleteMany();
  }
}

/**
 * Disconnect Prisma after all tests complete.
 */
export async function disconnectTestDb(): Promise<void> {
  await prisma.$disconnect();
}

// ── Auth Helpers ─────────────────────────────────

export interface TestUser {
  id: string;
  phone: string;
  fullName: string;
  role: string;
  accessToken: string;
  refreshToken: string;
}

let phoneCounter = 0;
let aadhaarCounter = 0;

function nextPhone(): string {
  phoneCounter++;
  return `80000${phoneCounter.toString().padStart(5, '0')}`;
}

function nextAadhaar(): string {
  aadhaarCounter++;
  return `${aadhaarCounter.toString().padStart(12, '0')}`;
}

/**
 * Register a user and return their auth tokens.
 */
export async function createTestUser(
  role: 'FARMER' | 'BUYER' | 'OWNER' | 'STAFF' | 'ADMIN' = 'FARMER',
  overrides: Record<string, any> = {},
): Promise<TestUser> {
  const phone = overrides.phone || nextPhone();
  const aadhaar = overrides.aadhaarNumber || nextAadhaar();

  const body: Record<string, any> = {
    fullName: overrides.fullName || `Test ${role} ${phone}`,
    phone,
    password: 'testpass123',
    role,
    addressLine1: '123 Test Street',
    city: 'Agra',
    state: 'Uttar Pradesh',
    pincode: '282001',
    aadhaarNumber: aadhaar,
    ...overrides,
  };

  // Add buyer-specific fields
  if (role === 'BUYER') {
    body.businessName = body.businessName || 'Test Trading Co';
    body.businessType = body.businessType || 'Wholesaler';
  }

  const res = await request(app)
    .post('/api/v1/auth/register')
    .send(body)
    .expect(201);

  const data = res.body.data;
  return {
    id: data.user.id,
    phone,
    fullName: data.user.fullName,
    role: data.user.role,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

/**
 * Login an existing user and return fresh tokens.
 */
export async function loginTestUser(phone: string, password = 'testpass123'): Promise<TestUser> {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ phone, password })
    .expect(200);

  const data = res.body.data;
  return {
    id: data.user.id,
    phone,
    fullName: data.user.fullName,
    role: data.user.role,
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  };
}

// ── Facility Helpers ─────────────────────────────

export interface TestFacility {
  id: string;
  name: string;
  ownerId: string;
}

/**
 * Create a facility directly via Prisma (skips API validation for speed).
 */
export async function createTestFacility(ownerId: string, overrides: Record<string, any> = {}): Promise<TestFacility> {
  const facility = await prisma.facility.create({
    data: {
      name: overrides.name || `Test Cold Storage ${Date.now()}`,
      addressLine1: '456 Industrial Area',
      city: 'Agra',
      district: 'Agra',
      state: 'Uttar Pradesh',
      pincode: '282002',
      totalCapacityMt: overrides.totalCapacityMt || 5000,
      storageType: overrides.storageType || 'BAG',
      status: overrides.status || 'ACTIVE',
      ownerId,
      ...overrides,
    },
  });

  return { id: facility.id, name: facility.name, ownerId };
}

// ── Chamber Helpers ──────────────────────────────

export interface TestChamber {
  id: string;
  chamberNumber: string;
  facilityId: string;
}

export async function createTestChamber(facilityId: string, overrides: Record<string, any> = {}): Promise<TestChamber> {
  const chamber = await prisma.chamber.create({
    data: {
      facilityId,
      chamberNumber: overrides.chamberNumber || `CH-${Date.now()}`,
      name: overrides.name || 'Test Chamber',
      capacityMt: overrides.capacityMt || 1000,
      targetTempMin: overrides.targetTempMin ?? 2,
      targetTempMax: overrides.targetTempMax ?? 4,
      targetHumidityMin: overrides.targetHumidityMin ?? 85,
      targetHumidityMax: overrides.targetHumidityMax ?? 95,
      commodityCategory: overrides.commodityCategory || 'POTATO',
      storageType: overrides.storageType || 'BAG',
      ...overrides,
    },
  });

  return { id: chamber.id, chamberNumber: chamber.chamberNumber, facilityId };
}

// ── Inventory Helpers ────────────────────────────

export interface TestLot {
  id: string;
  lotNumber: string;
  facilityId: string;
  chamberId: string;
  depositorId: string;
}

export async function createTestLot(
  facilityId: string,
  chamberId: string,
  depositorId: string,
  createdById: string,
  overrides: Record<string, any> = {},
): Promise<TestLot> {
  const ts = Date.now();
  const lot = await prisma.inventoryLot.create({
    data: {
      lotNumber: overrides.lotNumber || `LOT-TEST-${ts}`,
      receiptNumber: overrides.receiptNumber || `RCT-TEST-${ts}`,
      facilityId,
      chamberId,
      depositorId,
      commodityCategory: overrides.commodityCategory || 'POTATO',
      commodityName: overrides.commodityName || 'Kufri Jyoti Potato',
      intakeWeightKg: overrides.intakeWeightKg || 5000,
      currentWeightKg: overrides.currentWeightKg || 5000,
      bagCount: overrides.bagCount || 100,
      qualityGrade: overrides.qualityGrade || 'A',
      status: overrides.status || 'STORED',
      createdById,
      ...overrides,
    },
  });

  return {
    id: lot.id,
    lotNumber: lot.lotNumber,
    facilityId,
    chamberId,
    depositorId,
  };
}
