import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { paramString } from '../../shared/utils/query-helpers';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { validate } from '../../shared/middleware/validate';
import { createListingSchema, uuidParamSchema } from '../../shared/schemas';
import { idempotent } from '../../shared/middleware/idempotency';

const router = Router();
router.use(authenticate);

// ── POST /marketplace/listings — Create listing ──
router.post('/listings', authorize(UserRole.FARMER), validate({ body: createListingSchema }), idempotent, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { lotId, askingPricePerKg, minQuantityKg, description, expiresAt } = req.body;
  const sellerId = req.user!.userId;

  if (!lotId || !askingPricePerKg) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'lotId and askingPricePerKg are required' } }); return; }

  const lot = await prisma.inventoryLot.findFirst({
    where: { id: lotId, depositorId: sellerId, status: { in: ['STORED', 'PARTIALLY_RELEASED'] } },
  });
  if (!lot) { res.status(404).json({ success: false, error: { code: 'LOT_NOT_FOUND', message: 'Lot not found or not available' } }); return; }

  const existing = await prisma.marketListing.findFirst({ where: { lotId, status: 'ACTIVE' } });
  if (existing) { res.status(409).json({ success: false, error: { code: 'ALREADY_LISTED', message: 'Lot already has an active listing' } }); return; }

  const listing = await prisma.marketListing.create({
    data: {
      lotId, sellerId,
      askingPricePerKg: parseFloat(askingPricePerKg),
      minQuantityKg: minQuantityKg ? parseFloat(minQuantityKg) : null,
      description, expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
    include: {
      lot: {
        select: { lotNumber: true, commodityName: true, commodityCategory: true, currentWeightKg: true, qualityGrade: true, intakeDate: true,
          facility: { select: { name: true, city: true, state: true } } },
      },
    },
  });
  res.status(201).json({ success: true, data: listing });
}));

// ── GET /marketplace/listings — Browse listings ──
router.get('/listings', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { commodity, state, city, minPrice, maxPrice, grade, sortBy = 'newest', page = '1', limit = '20' } = req.query;
  const where: any = { status: 'ACTIVE' };

  if (commodity) where.lot = { ...where.lot, commodityCategory: commodity };
  if (grade) where.lot = { ...where.lot, qualityGrade: grade };
  if (state) where.lot = { ...where.lot, facility: { state: { contains: state as string, mode: 'insensitive' } } };
  if (city) where.lot = { ...where.lot, facility: { ...where.lot?.facility, city: { contains: city as string, mode: 'insensitive' } } };
  if (minPrice) where.askingPricePerKg = { ...where.askingPricePerKg, gte: parseFloat(minPrice as string) };
  if (maxPrice) where.askingPricePerKg = { ...where.askingPricePerKg, lte: parseFloat(maxPrice as string) };

  const orderBy: any = sortBy === 'price_asc' ? { askingPricePerKg: 'asc' } : sortBy === 'price_desc' ? { askingPricePerKg: 'desc' } : { listedAt: 'desc' };
  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const [listings, total] = await Promise.all([
    prisma.marketListing.findMany({
      where,
      include: {
        lot: { select: { lotNumber: true, commodityName: true, commodityCategory: true, currentWeightKg: true, qualityGrade: true, intakeDate: true,
          facility: { select: { id: true, name: true, city: true, state: true } } } },
        seller: { select: { id: true, fullName: true } },
        _count: { select: { orders: true } },
      },
      orderBy, skip: (pageNum - 1) * pageSize, take: pageSize,
    }),
    prisma.marketListing.count({ where }),
  ]);

  res.json({ success: true, data: { listings, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
}));

// ── GET /marketplace/my-listings — Farmer's own ──
router.get('/my-listings', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const listings = await prisma.marketListing.findMany({
    where: { sellerId: req.user!.userId },
    include: {
      lot: { select: { lotNumber: true, commodityName: true, currentWeightKg: true, qualityGrade: true,
        facility: { select: { name: true, city: true } } } },
      _count: { select: { orders: true } },
    },
    orderBy: { listedAt: 'desc' },
  });
  res.json({ success: true, data: listings });
}));

// ── GET /marketplace/listings/:id — Detail ──
router.get('/listings/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const listing = await prisma.marketListing.findUnique({
    where: { id: paramString(req.params.id) },
    include: {
      lot: { select: { id: true, lotNumber: true, commodityName: true, commodityCategory: true, currentWeightKg: true, intakeWeightKg: true,
        qualityGrade: true, qualityNotes: true, moistureContent: true, bagCount: true, intakeDate: true, status: true,
        facility: { select: { id: true, name: true, city: true, state: true, storageType: true } },
        chamber: { select: { chamberNumber: true, name: true, targetTempMin: true, targetTempMax: true } } } },
      seller: { select: { id: true, fullName: true, city: true, state: true } },
      orders: { select: { id: true, status: true, quantityKg: true, agreedPricePerKg: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!listing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } }); return; }
  res.json({ success: true, data: listing });
}));

// ── PATCH /marketplace/listings/:id — Update/withdraw ──
router.patch('/listings/:id', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { askingPricePerKg, minQuantityKg, description, status } = req.body;
  const listing = await prisma.marketListing.findFirst({ where: { id: paramString(req.params.id), sellerId: req.user!.userId } });
  if (!listing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found' } }); return; }

  const updated = await prisma.marketListing.update({
    where: { id: paramString(req.params.id) },
    data: {
      ...(askingPricePerKg !== undefined && { askingPricePerKg: parseFloat(askingPricePerKg) }),
      ...(minQuantityKg !== undefined && { minQuantityKg: parseFloat(minQuantityKg) }),
      ...(description !== undefined && { description }),
      ...(status === 'WITHDRAWN' && { status: 'WITHDRAWN' as const }),
    },
    include: { lot: { select: { lotNumber: true, commodityName: true, currentWeightKg: true } } },
  });
  res.json({ success: true, data: updated });
}));

export default router;
