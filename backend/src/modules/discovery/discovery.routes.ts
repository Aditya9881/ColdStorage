import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';

const router = Router();

// Discovery routes are PUBLIC — no auth required for guest-first flow

// ── GET /discover/facilities — Search facilities ──
router.get('/facilities', asyncHandler(async (req, res) => {
  const { commodity, state, city, page = '1', limit = '20' } = req.query;

  const where: any = { status: 'ACTIVE' };
  if (commodity) where.chambers = { some: { commodityCategory: commodity, status: 'OPERATIONAL' } };
  if (state) where.state = { contains: state, mode: 'insensitive' };
  if (city) where.city = { contains: city, mode: 'insensitive' };

  const pageNum = Math.max(1, parseInt(String(page ?? '1')));
  const pageSize = Math.min(50, parseInt(String(limit ?? '20')));

  const facilities = await prisma.facility.findMany({
    where,
    include: {
      chambers: {
        where: { status: 'OPERATIONAL' },
        select: { id: true, chamberNumber: true, name: true, capacityMt: true, occupiedMt: true, commodityCategory: true, targetTempMin: true, targetTempMax: true },
      },
      pricing: {
        where: { status: 'ACTIVE' },
        select: { commodityCategory: true, pricingModel: true, rateAmount: true, rateCurrency: true },
      },
      reviews: { select: { rating: true } },
      _count: { select: { lots: true, reviews: true } },
    },
    skip: (pageNum - 1) * pageSize,
    take: pageSize,
    orderBy: { name: 'asc' },
  });

  const enriched = facilities.map((f: any) => {
    // Compute capacity from chambers (not the potentially-stale totalCapacityMt field)
    const totalCapacity = f.chambers.reduce((sum: number, c: any) => sum + Number(c.capacityMt || 0), 0);
    const totalOccupied = f.chambers.reduce((sum: number, c: any) => sum + Number(c.occupiedMt || 0), 0);
    const avgRating = f.reviews.length > 0
      ? f.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / f.reviews.length : null;
    const { reviews, ...rest } = f;
    return {
      ...rest, totalCapacity,
      availableCapacity: Math.max(0, totalCapacity - totalOccupied),
      utilizationPercent: totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0,
      avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
      reviewCount: f._count.reviews,
    };
  });

  const total = await prisma.facility.count({ where });
  res.json({ success: true, data: { facilities: enriched, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
}));

// ── GET /discover/facilities/:id — Detail ──
router.get('/facilities/:id', asyncHandler(async (req, res) => {
  const id = paramString(req.params.id);
  const facility: any = await prisma.facility.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, fullName: true, phone: true } },
      chambers: { where: { status: 'OPERATIONAL' }, select: { id: true, chamberNumber: true, name: true, capacityMt: true, occupiedMt: true, commodityCategory: true, targetTempMin: true, targetTempMax: true } },
      pricing: { where: { status: 'ACTIVE' }, orderBy: { commodityCategory: 'asc' } },
      reviews: { include: { user: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 20 },
      _count: { select: { lots: true, reviews: true, chambers: true } },
    },
  });
  if (!facility) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' } }); return; }

  // Compute capacity from chambers (not the potentially-stale totalCapacityMt field)
  const totalCapacity = facility.chambers.reduce((sum: number, c: any) => sum + Number(c.capacityMt || 0), 0);
  const totalOccupied = facility.chambers.reduce((sum: number, c: any) => sum + Number(c.occupiedMt || 0), 0);
  const avgRating = facility.reviews.length > 0
    ? facility.reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / facility.reviews.length : null;

  res.json({ success: true, data: { ...facility, totalCapacity, availableCapacity: Math.max(0, totalCapacity - totalOccupied), avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null } });
}));

// ── POST /discover/facilities/:id/reviews — Authenticated ──
router.post('/facilities/:id/reviews', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { rating, comment } = req.body;
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Login required to leave a review' } }); return; }
  if (!rating || rating < 1 || rating > 5) { res.status(400).json({ success: false, error: { code: 'INVALID_RATING', message: 'Rating must be 1-5' } }); return; }

  const id = paramString(req.params.id);
  const facility = await prisma.facility.findUnique({ where: { id } });
  if (!facility) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Facility not found' } }); return; }

  const review = await prisma.facilityReview.upsert({
    where: { facilityId_userId: { facilityId: id, userId } },
    update: { rating, comment },
    create: { facilityId: id, userId, rating, comment },
    include: { user: { select: { id: true, fullName: true } } },
  });
  res.status(201).json({ success: true, data: review });
}));

// ── GET /discover/facilities/:id/reviews ──
router.get('/facilities/:id/reviews', asyncHandler(async (req, res) => {
  const id = paramString(req.params.id);
  const reviews = await prisma.facilityReview.findMany({
    where: { facilityId: id },
    include: { user: { select: { id: true, fullName: true } } },
    orderBy: { createdAt: 'desc' },
  });
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : null;
  res.json({ success: true, data: { reviews, avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null, total: reviews.length } });
}));

export default router;
