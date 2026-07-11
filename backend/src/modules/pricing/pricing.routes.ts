import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';

const router = Router();

router.use(authenticate);

/**
 * POST /pricing — Set pricing for a facility + commodity
 */
router.post('/', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    facilityId, commodityCategory, pricingModel,
    rateAmount, effectiveFrom, effectiveUntil,
    ratePerMtPerDay,
  } = req.body;

  // Verify facility
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  if (req.user!.role === UserRole.OWNER && facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only set pricing for your own facilities');
    return;
  }

  // Archive any existing active pricing for same facility + commodity
  await prisma.facilityPricing.updateMany({
    where: {
      facilityId,
      commodityCategory,
      status: 'ACTIVE',
    },
    data: { status: 'ARCHIVED' },
  });

  const actualRateAmount = rateAmount !== undefined ? rateAmount : ratePerMtPerDay;
  const actualPricingModel = pricingModel || 'PER_DAY_PER_MT';

  const pricing = await prisma.facilityPricing.create({
    data: {
      facilityId,
      commodityCategory,
      pricingModel: actualPricingModel,
      rateAmount: actualRateAmount,
      effectiveFrom: new Date(effectiveFrom),
      effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null,
      status: 'ACTIVE',
      createdById: req.user!.userId,
    },
  });

  sendSuccess(res, {
    ...pricing,
    ratePerMtPerDay: Number(pricing.rateAmount),
  }, 201);
}));

/**
 * GET /pricing?facilityId=xxx — Get facility pricing
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { facilityId, commodityCategory, status } = req.query;

  const where: any = {};
  if (facilityId) where.facilityId = facilityId as string;
  if (commodityCategory) where.commodityCategory = commodityCategory as any;
  if (status) where.status = status as any;

  const pricing = await prisma.facilityPricing.findMany({
    where,
    orderBy: { effectiveFrom: 'desc' },
    include: {
      facility: { select: { id: true, name: true, city: true, state: true } },
      createdBy: { select: { id: true, fullName: true } },
    },
  });

  const mappedPricing = pricing.map((p) => ({
    ...p,
    ratePerMtPerDay: Number(p.rateAmount),
  }));

  sendSuccess(res, mappedPricing);
}));

/**
 * PATCH /pricing/:id — Update pricing
 */
router.patch('/:id', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { rateAmount, effectiveFrom, effectiveUntil, pricingModel, ratePerMtPerDay } = req.body;

  const existing = await prisma.facilityPricing.findUnique({ where: { id: req.params.id as string } });
  if (!existing) {
    errors.notFound(res, 'Pricing entry not found');
    return;
  }

  const actualRateAmount = rateAmount !== undefined ? rateAmount : ratePerMtPerDay;

  const updated = await prisma.facilityPricing.update({
    where: { id: req.params.id as string },
    data: {
      ...(actualRateAmount !== undefined && { rateAmount: actualRateAmount }),
      ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
      ...(effectiveUntil !== undefined && { effectiveUntil: effectiveUntil ? new Date(effectiveUntil) : null }),
      ...(pricingModel && { pricingModel }),
    },
  });

  sendSuccess(res, {
    ...updated,
    ratePerMtPerDay: Number(updated.rateAmount),
  });
}));

/**
 * PATCH /pricing/:id/approve — Admin approves/rejects pricing
 */
router.patch('/:id/approve', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, maxAllowedRate } = req.body;

  const updated = await prisma.facilityPricing.update({
    where: { id: req.params.id as string },
    data: {
      status,
      adminApproved: status === 'ACTIVE',
      ...(maxAllowedRate !== undefined && { maxAllowedRate }),
    },
  });

  sendSuccess(res, updated);
}));

/**
 * GET /pricing/analytics — Regional pricing comparison (Admin)
 */
router.get('/analytics', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const activePricing = await prisma.facilityPricing.findMany({
    where: { status: 'ACTIVE' },
    include: {
      facility: { select: { state: true, district: true, city: true } },
    },
  });

  // Group by state + commodity
  const byRegion: Record<string, { rates: number[]; count: number }> = {};

  for (const p of activePricing) {
    const key = `${p.facility.state}-${p.commodityCategory}`;
    if (!byRegion[key]) byRegion[key] = { rates: [], count: 0 };
    byRegion[key].rates.push(Number(p.rateAmount));
    byRegion[key].count++;
  }

  const analytics = Object.entries(byRegion).map(([key, data]) => {
    const [state, commodity] = key.split('-');
    const rates = data.rates.sort((a, b) => a - b);
    return {
      state,
      commodity,
      minRate: rates[0],
      maxRate: rates[rates.length - 1],
      avgRate: Math.round((rates.reduce((s, r) => s + r, 0) / rates.length) * 100) / 100,
      medianRate: rates[Math.floor(rates.length / 2)],
      facilityCount: data.count,
    };
  });

  sendSuccess(res, analytics);
}));

export default router;
