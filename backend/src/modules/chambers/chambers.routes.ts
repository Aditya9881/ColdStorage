import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';

const router = Router();

router.use(authenticate);

/**
 * POST /chambers — Add chamber to facility
 */
router.post('/', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    facilityId, chamberNumber, name, capacityMt,
    targetTempMin, targetTempMax, targetHumidityMin, targetHumidityMax,
    commodityCategory, storageType,
  } = req.body;

  // Verify facility exists and user has access
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }
  if (req.user!.role === UserRole.OWNER && facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only add chambers to your own facilities');
    return;
  }

  const chamber = await prisma.chamber.create({
    data: {
      facilityId,
      chamberNumber,
      name,
      capacityMt,
      targetTempMin,
      targetTempMax,
      targetHumidityMin,
      targetHumidityMax,
      commodityCategory,
      storageType: storageType || 'BAG',
    },
  });

  sendSuccess(res, chamber, 201);
}));

/**
 * GET /chambers?facilityId=xxx — List chambers for a facility
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  let facilityId = req.query.facilityId as string | undefined;

  // Auto-detect facility for owners/staff
  if (!facilityId) {
    if (req.user!.role === UserRole.OWNER) {
      const facility = await prisma.facility.findFirst({
        where: { ownerId: req.user!.userId },
        select: { id: true },
      });
      facilityId = facility?.id;
    } else if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
      facilityId = req.user!.facilityId;
    }
  }

  const where: any = {};
  if (facilityId) where.facilityId = facilityId;

  const chambers = await prisma.chamber.findMany({
    where,
    orderBy: { chamberNumber: 'asc' },
    include: {
      _count: { select: { lots: true } },
    },
  });

  sendSuccess(res, chambers);
}));

/**
 * GET /chambers/:id — Chamber details
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chamber = await prisma.chamber.findUnique({
    where: { id: req.params.id },
    include: {
      facility: { select: { id: true, name: true } },
      lots: {
        where: { status: { in: ['STORED', 'INTAKE_PENDING', 'PARTIALLY_RELEASED'] } },
        select: {
          id: true,
          lotNumber: true,
          commodityName: true,
          currentWeightKg: true,
          status: true,
          intakeDate: true,
          depositor: { select: { id: true, fullName: true, phone: true } },
        },
        orderBy: { intakeDate: 'desc' },
      },
      _count: { select: { lots: true } },
    },
  });

  if (!chamber) {
    errors.notFound(res, 'Chamber not found');
    return;
  }

  sendSuccess(res, chamber);
}));

/**
 * PATCH /chambers/:id — Update chamber configuration
 */
router.patch('/:id', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    name, capacityMt, targetTempMin, targetTempMax,
    targetHumidityMin, targetHumidityMax, commodityCategory, status, storageType,
  } = req.body;

  const existing = await prisma.chamber.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    errors.notFound(res, 'Chamber not found');
    return;
  }

  const updated = await prisma.chamber.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(capacityMt && { capacityMt }),
      ...(targetTempMin !== undefined && { targetTempMin }),
      ...(targetTempMax !== undefined && { targetTempMax }),
      ...(targetHumidityMin !== undefined && { targetHumidityMin }),
      ...(targetHumidityMax !== undefined && { targetHumidityMax }),
      ...(commodityCategory !== undefined && { commodityCategory }),
      ...(status && { status }),
      ...(storageType && { storageType }),
    },
  });

  sendSuccess(res, updated);
}));

/**
 * DELETE /chambers/:id — Decommission chamber
 */
router.delete('/:id', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const chamber = await prisma.chamber.findUnique({
    where: { id: req.params.id },
    include: { _count: { select: { lots: true } } },
  });

  if (!chamber) {
    errors.notFound(res, 'Chamber not found');
    return;
  }

  // Check for active lots
  const activeLots = await prisma.inventoryLot.count({
    where: {
      chamberId: req.params.id,
      status: { in: ['STORED', 'INTAKE_PENDING', 'PARTIALLY_RELEASED'] },
    },
  });

  if (activeLots > 0) {
    errors.badRequest(res, `Cannot decommission chamber with ${activeLots} active lots`);
    return;
  }

  await prisma.chamber.update({
    where: { id: req.params.id },
    data: { status: 'OFFLINE' },
  });

  sendSuccess(res, { message: 'Chamber decommissioned successfully' });
}));

export default router;
