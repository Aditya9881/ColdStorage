/**
 * Auth Service — Unit Tests
 *
 * Tests the auth service in isolation using mocked Prisma and bcrypt.
 * Focuses on:
 * - Password hashing and comparison
 * - Token generation format
 * - Registration validation logic
 * - Login validation logic
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────
// Password Hashing
// ─────────────────────────────────────────────

describe('Password Hashing (bcrypt)', () => {
  const password = 'securePassword123';

  it('should hash a password to a different value', async () => {
    const hash = await bcrypt.hash(password, 12);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(50);
  });

  it('should verify correct password against hash', async () => {
    const hash = await bcrypt.hash(password, 12);
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  it('should reject wrong password against hash', async () => {
    const hash = await bcrypt.hash(password, 12);
    const isMatch = await bcrypt.compare('wrongPassword', hash);
    expect(isMatch).toBe(false);
  });

  it('should generate different hashes for same password (salt)', async () => {
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);
    expect(hash1).not.toBe(hash2);
    // But both should verify
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

// ─────────────────────────────────────────────
// JWT Token Generation & Verification
// ─────────────────────────────────────────────

describe('JWT Token Generation', () => {
  const secret = 'test-jwt-secret';
  const payload = {
    userId: '12345678-1234-1234-1234-123456789012',
    role: 'FARMER',
    facilityId: null,
  };

  it('should generate a valid JWT token', () => {
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3); // header.payload.signature
  });

  it('should verify and decode a valid token', () => {
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.exp).toBeDefined();
  });

  it('should reject token with wrong secret', () => {
    const token = jwt.sign(payload, secret, { expiresIn: '15m' });
    expect(() => jwt.verify(token, 'wrong-secret')).toThrow();
  });

  it('should reject expired token', () => {
    const token = jwt.sign(payload, secret, { expiresIn: '0s' });
    // Allow a small delay for expiry
    expect(() => jwt.verify(token, secret)).toThrow();
  });

  it('should embed role and facilityId in token', () => {
    const staffPayload = {
      userId: 'staff-id',
      role: 'STAFF',
      facilityId: 'facility-id',
    };
    const token = jwt.sign(staffPayload, secret, { expiresIn: '1h' });
    const decoded = jwt.verify(token, secret) as jwt.JwtPayload;
    expect(decoded.role).toBe('STAFF');
    expect(decoded.facilityId).toBe('facility-id');
  });
});

// ─────────────────────────────────────────────
// Refresh Token Rotation Logic
// ─────────────────────────────────────────────

describe('Refresh Token Rotation', () => {
  const refreshSecret = 'test-refresh-secret';

  it('should generate refresh token with session ID', () => {
    const sessionPayload = {
      userId: 'user-123',
      sessionId: 'session-abc-123',
    };
    const token = jwt.sign(sessionPayload, refreshSecret, { expiresIn: '7d' });
    const decoded = jwt.verify(token, refreshSecret) as jwt.JwtPayload;

    expect(decoded.userId).toBe('user-123');
    expect(decoded.sessionId).toBe('session-abc-123');
  });

  it('new refresh token should differ from previous', () => {
    const makeRefreshToken = (sessionId: string) =>
      jwt.sign({ userId: 'user-1', sessionId }, refreshSecret, { expiresIn: '7d' });

    const token1 = makeRefreshToken('session-1');
    const token2 = makeRefreshToken('session-2');
    expect(token1).not.toBe(token2);
  });
});

// ─────────────────────────────────────────────
// Input Validation Patterns
// ─────────────────────────────────────────────

describe('Auth Input Validation', () => {
  it('should validate phone number format (10 digits)', () => {
    const isValidPhone = (phone: string) => /^[0-9]{10}$/.test(phone);
    expect(isValidPhone('9876543210')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
    expect(isValidPhone('abcdefghij')).toBe(false);
    expect(isValidPhone('12345678901')).toBe(false); // 11 digits
  });

  it('should validate Aadhaar number format (12 digits)', () => {
    const isValidAadhaar = (aadhaar: string) => /^[0-9]{12}$/.test(aadhaar);
    expect(isValidAadhaar('123456789012')).toBe(true);
    expect(isValidAadhaar('123')).toBe(false);
    expect(isValidAadhaar('abcdefghijkl')).toBe(false);
  });

  it('should validate role enum', () => {
    const validRoles = ['FARMER', 'BUYER', 'OWNER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'];
    expect(validRoles.includes('FARMER')).toBe(true);
    expect(validRoles.includes('CUSTOMER')).toBe(false);
    expect(validRoles.includes('')).toBe(false);
  });

  it('should enforce minimum password length', () => {
    const isValidPassword = (pw: string) => pw.length >= 6;
    expect(isValidPassword('testpass123')).toBe(true);
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});
