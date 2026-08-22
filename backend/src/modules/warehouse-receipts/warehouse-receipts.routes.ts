import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { createAuditLog } from '../../shared/utils/audit';
import { generateReceiptNumber } from '../../shared/utils/id-generator';
import { validate } from '../../shared/middleware/validate';
import { createWarehouseReceiptSchema, pledgeReceiptSchema } from '../../shared/schemas';

const router = Router();
router.use(authenticate);

// ── POST /warehouse-receipts — Generate eNWR for a lot ──
router.post('/', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: createWarehouseReceiptSchema }), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { lotId, isNegotiable } = req.body;

  // Verify lot exists and is stored
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: lotId },
    include: {
      facility: { select: { id: true, name: true, ownerId: true, status: true } },
      warehouseReceipt: true,
    },
  });
  if (!lot) { errors.notFound(res, 'Lot not found'); return; }
  if (lot.status !== 'STORED' && lot.status !== 'PARTIALLY_RELEASED') {
    errors.badRequest(res, 'Warehouse receipt can only be generated for stored lots');
    return;
  }

  // Verify facility is active
  if (lot.facility.status !== 'ACTIVE') {
    errors.badRequest(res, 'Facility must be active to issue warehouse receipts');
    return;
  }

  // Check if receipt already exists
  if (lot.warehouseReceipt) {
    errors.conflict(res, 'A warehouse receipt already exists for this lot');
    return;
  }

  // Authorization: owner/staff can only generate for their facility
  if (req.user!.role === UserRole.OWNER && lot.facility.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only generate receipts for your own facilities');
    return;
  }
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId !== lot.facilityId) {
    errors.forbidden(res, 'You can only generate receipts for your assigned facility');
    return;
  }

  // Generate receipt number using facility-scoped ID generator
  const receiptNumber = `ENWR-${generateReceiptNumber(lot.facilityId).slice(4)}`;

  // Set expiry to 1 year from now
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const receipt = await prisma.warehouseReceipt.create({
    data: {
      lotId,
      receiptNumber,
      isNegotiable: isNegotiable !== false, // default true
      expiresAt,
    },
    include: {
      lot: {
        select: {
          lotNumber: true, commodityName: true, commodityCategory: true,
          currentWeightKg: true, qualityGrade: true, intakeDate: true,
          depositor: { select: { id: true, fullName: true, phone: true } },
          facility: { select: { id: true, name: true, city: true, state: true } },
        },
      },
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'WAREHOUSE_RECEIPT_GENERATED',
    entityType: 'WarehouseReceipt',
    entityId: receipt.id,
    newValues: { receiptNumber, lotId, isNegotiable: receipt.isNegotiable },
  });

  sendSuccess(res, receipt, 201);
}));

// ── GET /warehouse-receipts — List receipts ──
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { facilityId, status, pledged, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (status) where.status = status as string;
  if (pledged !== undefined) where.isPledged = pledged === 'true';

  // Scope access by role
  if (req.user!.role === UserRole.FARMER) {
    where.lot = { depositorId: req.user!.userId };
  } else if (req.user!.role === UserRole.OWNER) {
    const facilities = await prisma.facility.findMany({
      where: { ownerId: req.user!.userId }, select: { id: true },
    });
    where.lot = { facilityId: { in: facilities.map(f => f.id) } };
  } else if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.lot = { facilityId: req.user!.facilityId };
  }

  if (facilityId) {
    where.lot = { ...where.lot, facilityId: facilityId as string };
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const [receipts, total] = await Promise.all([
    prisma.warehouseReceipt.findMany({
      where,
      include: {
        lot: {
          select: {
            lotNumber: true, commodityName: true, commodityCategory: true,
            currentWeightKg: true, qualityGrade: true, status: true,
            depositor: { select: { id: true, fullName: true } },
            facility: { select: { id: true, name: true, city: true, state: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.warehouseReceipt.count({ where }),
  ]);

  sendSuccess(res, {
    receipts,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}));

// ── GET /warehouse-receipts/:id — Receipt detail ──
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const receipt = await prisma.warehouseReceipt.findUnique({
    where: { id: paramString(req.params.id) },
    include: {
      lot: {
        select: {
          id: true, lotNumber: true, receiptNumber: true,
          commodityName: true, commodityCategory: true,
          intakeWeightKg: true, currentWeightKg: true,
          qualityGrade: true, qualityNotes: true, moistureContent: true,
          bagCount: true, intakeDate: true, status: true,
          depositor: { select: { id: true, fullName: true, phone: true, city: true, state: true } },
          facility: { select: { id: true, name: true, city: true, state: true, registrationNumber: true } },
          chamber: { select: { chamberNumber: true, name: true } },
        },
      },
    },
  });
  if (!receipt) { errors.notFound(res, 'Warehouse receipt not found'); return; }

  sendSuccess(res, receipt);
}));

// ── PATCH /warehouse-receipts/:id/pledge — Pledge receipt to a bank/NBFC ──
router.patch('/:id/pledge', authorize(UserRole.FARMER, UserRole.ADMIN, UserRole.SUPER_ADMIN), validate({ body: pledgeReceiptSchema }), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const { pledgedTo, pledgeAmount } = req.body;

  const receipt = await prisma.warehouseReceipt.findUnique({
    where: { id },
    include: { lot: { select: { depositorId: true } } },
  });
  if (!receipt) { errors.notFound(res, 'Warehouse receipt not found'); return; }

  // Only the depositor (farmer) or admin can pledge
  if (req.user!.role === UserRole.FARMER && receipt.lot.depositorId !== req.user!.userId) {
    errors.forbidden(res, 'You can only pledge your own warehouse receipts');
    return;
  }

  if (receipt.isPledged) {
    errors.conflict(res, 'Receipt is already pledged');
    return;
  }
  if (receipt.status !== 'ACTIVE') {
    errors.badRequest(res, 'Only active receipts can be pledged');
    return;
  }

  const updated = await prisma.warehouseReceipt.update({
    where: { id },
    data: {
      isPledged: true,
      pledgedTo,
      pledgeAmount: parseFloat(pledgeAmount),
      pledgeDate: new Date(),
      status: 'PLEDGED',
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'WAREHOUSE_RECEIPT_PLEDGED',
    entityType: 'WarehouseReceipt',
    entityId: id,
    newValues: { pledgedTo, pledgeAmount, status: 'PLEDGED' },
  });

  sendSuccess(res, updated);
}));

// ── PATCH /warehouse-receipts/:id/redeem — Redeem (unpledge) receipt ──
router.patch('/:id/redeem', authorize(UserRole.FARMER, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);

  const receipt = await prisma.warehouseReceipt.findUnique({
    where: { id },
    include: { lot: { select: { depositorId: true } } },
  });
  if (!receipt) { errors.notFound(res, 'Warehouse receipt not found'); return; }

  if (req.user!.role === UserRole.FARMER && receipt.lot.depositorId !== req.user!.userId) {
    errors.forbidden(res, 'You can only redeem your own warehouse receipts');
    return;
  }
  if (!receipt.isPledged) {
    errors.badRequest(res, 'Receipt is not currently pledged');
    return;
  }

  const updated = await prisma.warehouseReceipt.update({
    where: { id },
    data: {
      isPledged: false,
      status: 'ACTIVE',
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'WAREHOUSE_RECEIPT_REDEEMED',
    entityType: 'WarehouseReceipt',
    entityId: id,
    newValues: { status: 'ACTIVE', isPledged: false },
  });

  sendSuccess(res, updated);
}));

export default router;
