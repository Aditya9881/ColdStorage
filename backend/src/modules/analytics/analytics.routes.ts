import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

/**
 * GET /analytics/overview — Platform-wide macro analytics
 */
router.get('/overview', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const [
    totalFacilities,
    activeFacilities,
    pendingFacilities,
    totalUsers,
    totalFarmers,
    totalOwners,
    totalLots,
    activeLots,
    totalInvoices,
  ] = await Promise.all([
    prisma.facility.count(),
    prisma.facility.count({ where: { status: 'ACTIVE' } }),
    prisma.facility.count({ where: { status: 'PENDING_REVIEW' } }),
    prisma.user.count(),
    prisma.user.count({ where: { role: 'FARMER' } }),
    prisma.user.count({ where: { role: 'OWNER' } }),
    prisma.inventoryLot.count(),
    prisma.inventoryLot.count({ where: { status: { in: ['STORED', 'INTAKE_PENDING', 'PARTIALLY_RELEASED'] } } }),
    prisma.invoice.count(),
  ]);

  // Calculate total stored tonnage
  const storedWeight = await prisma.inventoryLot.aggregate({
    where: { status: { in: ['STORED', 'PARTIALLY_RELEASED'] } },
    _sum: { currentWeightKg: true },
  });

  // Total revenue (paid invoices)
  const revenue = await prisma.invoice.aggregate({
    where: { status: { in: ['PAID', 'PARTIALLY_PAID'] } },
    _sum: { paidAmount: true },
  });

  sendSuccess(res, {
    facilities: {
      total: totalFacilities,
      active: activeFacilities,
      pendingReview: pendingFacilities,
    },
    users: {
      total: totalUsers,
      farmers: totalFarmers,
      owners: totalOwners,
    },
    inventory: {
      totalLots,
      activeLots,
      totalStoredKg: Number(storedWeight._sum.currentWeightKg || 0),
      totalStoredMt: Math.round(Number(storedWeight._sum.currentWeightKg || 0) / 1000 * 100) / 100,
    },
    financial: {
      totalInvoices,
      totalRevenue: Number(revenue._sum.paidAmount || 0),
    },
  });
}));

/**
 * GET /analytics/capacity — National/regional capacity utilization
 */
router.get('/capacity', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const facilities = await prisma.facility.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      state: true,
      district: true,
      totalCapacityMt: true,
      chambers: {
        select: { occupiedMt: true },
      },
    },
  });

  // Aggregate by state
  const byState: Record<string, { totalCapacity: number; totalOccupied: number; facilityCount: number }> = {};

  for (const f of facilities) {
    if (!byState[f.state]) {
      byState[f.state] = { totalCapacity: 0, totalOccupied: 0, facilityCount: 0 };
    }
    const occupied = f.chambers.reduce((sum, c) => sum + Number(c.occupiedMt), 0);
    byState[f.state].totalCapacity += Number(f.totalCapacityMt);
    byState[f.state].totalOccupied += occupied;
    byState[f.state].facilityCount++;
  }

  const stateAnalytics = Object.entries(byState).map(([state, data]) => ({
    state,
    totalCapacityMt: Math.round(data.totalCapacity * 100) / 100,
    occupiedMt: Math.round(data.totalOccupied * 100) / 100,
    availableMt: Math.round((data.totalCapacity - data.totalOccupied) * 100) / 100,
    utilizationRate: data.totalCapacity > 0
      ? Math.round((data.totalOccupied / data.totalCapacity) * 10000) / 100
      : 0,
    facilityCount: data.facilityCount,
  }));

  // National totals
  const national = stateAnalytics.reduce(
    (acc, s) => ({
      totalCapacityMt: acc.totalCapacityMt + s.totalCapacityMt,
      occupiedMt: acc.occupiedMt + s.occupiedMt,
      facilityCount: acc.facilityCount + s.facilityCount,
    }),
    { totalCapacityMt: 0, occupiedMt: 0, facilityCount: 0 }
  );

  sendSuccess(res, {
    national: {
      ...national,
      availableMt: Math.round((national.totalCapacityMt - national.occupiedMt) * 100) / 100,
      utilizationRate: national.totalCapacityMt > 0
        ? Math.round((national.occupiedMt / national.totalCapacityMt) * 10000) / 100
        : 0,
    },
    byState: stateAnalytics.sort((a, b) => b.totalCapacityMt - a.totalCapacityMt),
  });
}));

/**
 * GET /analytics/commodities — Commodity distribution across network
 */
router.get('/commodities', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const lots = await prisma.inventoryLot.groupBy({
    by: ['commodityCategory'],
    where: { status: { in: ['STORED', 'PARTIALLY_RELEASED'] } },
    _count: { id: true },
    _sum: { currentWeightKg: true },
  });

  const commodities = lots.map((l) => ({
    category: l.commodityCategory,
    lotCount: l._count.id,
    totalWeightKg: Number(l._sum.currentWeightKg || 0),
    totalWeightMt: Math.round(Number(l._sum.currentWeightKg || 0) / 1000 * 100) / 100,
  }));

  sendSuccess(res, commodities);
}));

/**
 * GET /analytics/compliance — Document expiry alerts, non-compliant facilities
 */
router.get('/compliance', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const [expiringSoon, expired, pendingReview, facilitiesWithoutDocs] = await Promise.all([
    // Documents expiring within 30 days
    prisma.facilityDocument.findMany({
      where: {
        status: 'APPROVED',
        expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
      },
      include: {
        facility: { select: { id: true, name: true, state: true } },
      },
      orderBy: { expiryDate: 'asc' },
    }),

    // Already expired
    prisma.facilityDocument.findMany({
      where: {
        status: 'APPROVED',
        expiryDate: { lt: new Date() },
      },
      include: {
        facility: { select: { id: true, name: true, state: true } },
      },
    }),

    // Pending review
    prisma.facilityDocument.count({ where: { status: 'PENDING_REVIEW' } }),

    // Active facilities with zero documents
    prisma.facility.findMany({
      where: {
        status: 'ACTIVE',
        documents: { none: {} },
      },
      select: { id: true, name: true, state: true, city: true },
    }),
  ]);

  sendSuccess(res, {
    expiringSoon: expiringSoon.length,
    expiredDocuments: expired.length,
    pendingReview,
    facilitiesWithoutDocuments: facilitiesWithoutDocs.length,
    details: {
      expiringSoon,
      expired,
      facilitiesWithoutDocs,
    },
  });
}));

/**
 * GET /analytics/revenue — Platform revenue overview
 */
router.get('/revenue', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const [totalRevenue, overdueInvoices, monthlyRevenue] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { paidAmount: true, totalAmount: true },
    }),

    prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
      },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        dueDate: true,
        facility: { select: { name: true } },
        depositor: { select: { fullName: true } },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    }),

    // Revenue for last 6 months
    prisma.invoice.groupBy({
      by: ['issueDate'],
      where: {
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
        issueDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
      _sum: { paidAmount: true },
      orderBy: { issueDate: 'asc' },
    }),
  ]);

  sendSuccess(res, {
    totalBilled: Number(totalRevenue._sum.totalAmount || 0),
    totalCollected: Number(totalRevenue._sum.paidAmount || 0),
    collectionRate: Number(totalRevenue._sum.totalAmount || 0) > 0
      ? Math.round((Number(totalRevenue._sum.paidAmount || 0) / Number(totalRevenue._sum.totalAmount || 0)) * 10000) / 100
      : 0,
    overdueInvoices,
    monthlyTrend: monthlyRevenue,
  });
}));

/**
 * GET /analytics/intake-trend — Daily intake volumes for the last 30 days
 */
router.get('/intake-trend', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const lots = await prisma.inventoryLot.findMany({
    where: {
      intakeDate: { gte: thirtyDaysAgo },
    },
    select: {
      intakeDate: true,
      intakeWeightKg: true,
      commodityCategory: true,
    },
    orderBy: { intakeDate: 'asc' },
  });

  // Group by date
  const dailyMap = new Map<string, { date: string; totalKg: number; lotCount: number }>();
  for (const lot of lots) {
    const dateKey = new Date(lot.intakeDate).toISOString().split('T')[0];
    const existing = dailyMap.get(dateKey) || { date: dateKey, totalKg: 0, lotCount: 0 };
    existing.totalKg += Number(lot.intakeWeightKg);
    existing.lotCount++;
    dailyMap.set(dateKey, existing);
  }

  // Fill in missing days with zero
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateKey = d.toISOString().split('T')[0];
    result.push(dailyMap.get(dateKey) || { date: dateKey, totalKg: 0, lotCount: 0 });
  }

  sendSuccess(res, result);
}));

/**
 * GET /analytics/facility-comparison — Compare facilities by utilization
 */
router.get('/facility-comparison', asyncHandler(async (_req: AuthenticatedRequest, res) => {
  const facilities = await prisma.facility.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      state: true,
      totalCapacityMt: true,
      chambers: {
        select: { occupiedMt: true },
      },
      _count: { select: { lots: true, chambers: true } },
    },
  });

  const comparison = facilities.map((f) => {
    const occupied = f.chambers.reduce((sum, c) => sum + Number(c.occupiedMt), 0);
    const capacity = Number(f.totalCapacityMt);
    return {
      id: f.id,
      name: f.name,
      state: f.state,
      capacityMt: capacity,
      occupiedMt: Math.round(occupied * 100) / 100,
      utilizationRate: capacity > 0 ? Math.round((occupied / capacity) * 10000) / 100 : 0,
      lotCount: f._count.lots,
      chamberCount: f._count.chambers,
    };
  });

  sendSuccess(res, comparison.sort((a, b) => b.utilizationRate - a.utilizationRate));
}));

export default router;
