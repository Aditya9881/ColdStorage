import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { createAuditLog } from '../../shared/utils/audit';
import { generateFarmerRegNumber } from '../../shared/utils/reg-number-generator';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// ── Depositor Endpoints (Owner/Staff accessible) ──────────────

/**
 * GET /users/depositors — List farmers linked to the owner's facility
 * Returns farmers who have inventory lots at any facility owned by the requesting user,
 * or if the user is Staff, at their assigned facility.
 */
router.get('/depositors', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  let facilityIds: string[] = [];

  if (req.user!.role === UserRole.OWNER) {
    // Get all facilities owned by this user
    const facilities = await prisma.facility.findMany({
      where: { ownerId: req.user!.userId },
      select: { id: true },
    });
    facilityIds = facilities.map(f => f.id);
  } else if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    facilityIds = [req.user!.facilityId];
  }

  // For admins, return all farmers; for owners/staff, filter by facility association
  let where: any = { role: 'FARMER' };

  if (facilityIds.length > 0 && req.user!.role !== UserRole.SUPER_ADMIN && req.user!.role !== UserRole.ADMIN) {
    // Get unique depositor IDs from lots at these facilities
    const depositorIds = await prisma.inventoryLot.findMany({
      where: { facilityId: { in: facilityIds } },
      select: { depositorId: true },
      distinct: ['depositorId'],
    });

    // Also include farmers who were created by this owner (createdBy field)
    const createdByIds = await prisma.user.findMany({
      where: { role: 'FARMER', createdBy: req.user!.userId },
      select: { id: true },
    });

    const allIds = [...new Set([
      ...depositorIds.map(d => d.depositorId),
      ...createdByIds.map(d => d.id),
    ])];

    where.id = { in: allIds };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      status: true,
      registrationNumber: true,
      city: true,
      state: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, users);
}));

/**
 * POST /users/depositors — Owner registers a new farmer under their facility
 * Auto-generates a registration number like UP-001-FRM-042
 */
router.post('/depositors', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { fullName, phone, email, password, city, state: farmerState, pincode, addressLine1 } = req.body;

  if (!fullName || !phone || !password) {
    errors.badRequest(res, 'Name, phone, and password are required');
    return;
  }

  // Check if phone already exists
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    errors.conflict(res, 'A user with this phone number already exists');
    return;
  }

  // Determine the facility for registration number
  let facilityId: string | null = null;
  if (req.user!.role === UserRole.OWNER) {
    const facility = await prisma.facility.findFirst({
      where: { ownerId: req.user!.userId },
      select: { id: true },
    });
    facilityId = facility?.id || null;
  }

  // Generate registration number
  let registrationNumber: string | null = null;
  if (facilityId) {
    registrationNumber = await generateFarmerRegNumber(facilityId);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      fullName,
      phone,
      email: email || null,
      passwordHash,
      role: 'FARMER',
      status: 'ACTIVE',
      registrationNumber,
      city: city || null,
      state: farmerState || null,
      pincode: pincode || null,
      addressLine1: addressLine1 || null,
      createdBy: req.user!.userId,
    },
    select: {
      id: true,
      fullName: true,
      phone: true,
      email: true,
      role: true,
      status: true,
      registrationNumber: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'user.create_depositor',
    entityType: 'user',
    entityId: user.id,
    newValues: { fullName: user.fullName, phone: user.phone, registrationNumber: user.registrationNumber },
  });

  sendSuccess(res, user, 201);
}));
/**
 * GET /users — List all users (Admin only)
 */
router.get('/', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(req.query);
  const { role, status, facilityId, search } = req.query;

  const where: any = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (facilityId) where.facilityId = facilityId;
  if (search) {
    where.OR = [
      { fullName: { contains: search as string, mode: 'insensitive' } },
      { phone: { contains: search as string } },
      { email: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        facilityId: true,
        city: true,
        state: true,
        lastLoginAt: true,
        createdAt: true,
        facility: { select: { id: true, name: true } },
        ownedFacilities: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  sendSuccess(res, users, 200, buildPaginationMeta(page, limit, total));
}));

// ── Self-service Profile Endpoints ────────────────────
// IMPORTANT: These must be defined BEFORE /:id routes

/**
 * GET /users/me — Get current user profile
 */
router.get('/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true, fullName: true, phone: true, email: true,
      role: true, status: true, addressLine1: true, city: true,
      state: true, pincode: true, facilityId: true,
      createdAt: true, updatedAt: true,
    },
  });

  if (!user) {
    errors.notFound(res, 'User not found');
    return;
  }

  sendSuccess(res, user);
}));

/**
 * PATCH /users/me — Update own profile
 */
router.patch('/me', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { fullName, email, addressLine1, city, state, pincode } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      ...(fullName && { fullName }),
      ...(email !== undefined && { email: email || null }),
      ...(addressLine1 !== undefined && { addressLine1: addressLine1 || null }),
      ...(city !== undefined && { city: city || null }),
      ...(state !== undefined && { state: state || null }),
      ...(pincode !== undefined && { pincode: pincode || null }),
    },
    select: {
      id: true, fullName: true, phone: true, email: true,
      role: true, addressLine1: true, city: true, state: true, pincode: true,
    },
  });

  sendSuccess(res, updated);
}));

/**
 * PATCH /users/me/password — Change own password
 */
router.patch('/me/password', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    errors.badRequest(res, 'Current password and new password are required');
    return;
  }

  if (newPassword.length < 6) {
    errors.badRequest(res, 'New password must be at least 6 characters');
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { passwordHash: true },
  });

  if (!user) {
    errors.notFound(res, 'User not found');
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    errors.unauthorized(res, 'Current password is incorrect');
    return;
  }

  const passwordHash = await bcrypt.hash(newPassword, Number(env.BCRYPT_SALT_ROUNDS) || 12);
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash },
  });

  sendSuccess(res, { message: 'Password updated successfully' });
}));

/**
 * GET /users/:id — Get user details
 */
router.get('/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: paramString(req.params.id) },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      phoneVerified: true,
      role: true,
      status: true,
      facilityId: true,
      avatarUrl: true,
      preferredLang: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      pincode: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
      facility: { select: { id: true, name: true, status: true } },
    },
  });

  if (!user) {
    errors.notFound(res, 'User not found');
    return;
  }

  sendSuccess(res, user);
}));

/**
 * PATCH /users/:id — Update user profile
 */
router.patch('/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { fullName, email, phone, role, facilityId, addressLine1, addressLine2, city, state, pincode, preferredLang } = req.body;

  const existing = await prisma.user.findUnique({ where: { id: paramString(req.params.id) } });
  if (!existing) {
    errors.notFound(res, 'User not found');
    return;
  }

  const updated = await prisma.user.update({
    where: { id: paramString(req.params.id) },
    data: {
      ...(fullName && { fullName }),
      ...(email !== undefined && { email }),
      ...(phone && { phone }),
      ...(role && { role }),
      ...(facilityId !== undefined && { facilityId }),
      ...(addressLine1 !== undefined && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(pincode !== undefined && { pincode }),
      ...(preferredLang !== undefined && { preferredLang }),
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      facilityId: true,
      updatedAt: true,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'user.update',
    entityType: 'user',
    entityId: paramString(req.params.id),
    oldValues: { fullName: existing.fullName, role: existing.role },
    newValues: { fullName: updated.fullName, role: updated.role },
  });

  sendSuccess(res, updated);
}));

/**
 * PATCH /users/:id/status — Activate/suspend/deactivate user
 */
router.patch('/:id/status', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status } = req.body;

  const existing = await prisma.user.findUnique({ where: { id: paramString(req.params.id) } });
  if (!existing) {
    errors.notFound(res, 'User not found');
    return;
  }

  const updated = await prisma.user.update({
    where: { id: paramString(req.params.id) },
    data: { status },
    select: { id: true, fullName: true, status: true, updatedAt: true },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'user.status_change',
    entityType: 'user',
    entityId: paramString(req.params.id),
    oldValues: { status: existing.status },
    newValues: { status: updated.status },
  });

  sendSuccess(res, updated);
}));

export default router;
