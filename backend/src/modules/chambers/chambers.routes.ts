import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';

const router = Router();

router.use(authenticate);

/**
 * Recalculate facility totalCapacityMt from the sum of all its operational chambers.
 * Called after every chamber create, update, or delete.
 */
async function recalcFacilityCapacity(facilityId: string): Promise<void> {
  const result = await prisma.chamber.aggregate({
    where: { facilityId, status: { not: 'OFFLINE' } },
    _sum: { capacityMt: true },
  });
  await prisma.facility.update({
    where: { id: facilityId },
    data: { totalCapacityMt: result._sum.capacityMt ?? 0 },
  });
}

/**
 * POST /chambers — Add chamber to facility
 */
router.post('/', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    facilityId, chamberNumber, name, capacityMt,
    targetTempMin, targetTempMax, targetHumidityMin, targetHumidityMax,
    commodityCategory, storageType,
  } = req.body;

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

  // Recalculate facility total capacity
  await recalcFacilityCapacity(facilityId);

  sendSuccess(res, chamber, 201);
}));

/**
 * GET /chambers?facilityId=xxx — List chambers for a facility
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  let facilityId = req.query.facilityId as string | undefined;

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
  const id = paramString(req.params.id);
  const chamber = await prisma.chamber.findUnique({
    where: { id },
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
  const id = paramString(req.params.id);
  const {
    name, capacityMt, targetTempMin, targetTempMax,
    targetHumidityMin, targetHumidityMax, commodityCategory, status, storageType,
  } = req.body;

  const existing = await prisma.chamber.findUnique({ where: { id } });
  if (!existing) {
    errors.notFound(res, 'Chamber not found');
    return;
  }

  const updated = await prisma.chamber.update({
    where: { id },
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

  // Recalculate facility total capacity if capacity or status changed
  if (capacityMt !== undefined || status !== undefined) {
    await recalcFacilityCapacity(existing.facilityId);
  }

  sendSuccess(res, updated);
}));

/**
 * DELETE /chambers/:id — Decommission chamber
 */
router.delete('/:id', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const chamber = await prisma.chamber.findUnique({
    where: { id },
    include: { _count: { select: { lots: true } } },
  });

  if (!chamber) {
    errors.notFound(res, 'Chamber not found');
    return;
  }

  const activeLots = await prisma.inventoryLot.count({
    where: {
      chamberId: id,
      status: { in: ['STORED', 'INTAKE_PENDING', 'PARTIALLY_RELEASED'] },
    },
  });

  if (activeLots > 0) {
    errors.badRequest(res, `Cannot decommission chamber with ${activeLots} active lots`);
    return;
  }

  await prisma.chamber.update({
    where: { id },
    data: { status: 'OFFLINE' },
  });

  // Recalculate facility total capacity (offline chamber excluded)
  await recalcFacilityCapacity(chamber.facilityId);

  sendSuccess(res, { message: 'Chamber decommissioned successfully' });
}));

export default router;
