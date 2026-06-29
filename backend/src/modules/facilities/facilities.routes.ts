import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { createAuditLog } from '../../shared/utils/audit';
import { generateFacilityRegNumber } from '../../shared/utils/reg-number-generator';

const router = Router();

router.use(authenticate);

/**
 * POST /facilities — Register new facility (Owner only)
 */
router.post('/', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    name, registrationNumber, addressLine1, addressLine2,
    city, district, state, pincode, latitude, longitude,
    totalCapacityMt, storageType, operatingSince,
    contactPhone, contactEmail,
  } = req.body;

  // Auto-generate registration number if not provided
  let finalRegNumber = registrationNumber;
  if (!finalRegNumber && state) {
    finalRegNumber = await generateFacilityRegNumber(state);
  }

  const facility = await prisma.facility.create({
    data: {
      name,
      registrationNumber: finalRegNumber,
      addressLine1,
      addressLine2,
      city,
      district,
      state,
      pincode,
      latitude,
      longitude,
      totalCapacityMt,
      storageType: storageType || 'BAG',
      operatingSince: operatingSince ? new Date(operatingSince) : null,
      ownerId: req.user!.userId,
      contactPhone,
      contactEmail,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'facility.create',
    entityType: 'facility',
    entityId: facility.id,
    newValues: { name: facility.name, state: facility.state },
  });

  sendSuccess(res, facility, 201);
}));

/**
 * GET /facilities — List facilities
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(req.query);
  const { status, state: stateFilter, search, storageType } = req.query;

  const where: any = {};

  // Owners/staff see only their facilities
  if (req.user!.role === UserRole.OWNER) {
    where.ownerId = req.user!.userId;
  } else if (req.user!.role === UserRole.STAFF) {
    where.id = req.user!.facilityId;
  }
  // Admins see all

  if (status) where.status = status;
  if (stateFilter) where.state = { equals: stateFilter, mode: 'insensitive' };
  if (storageType) where.storageType = storageType;
  if (search) {
    where.OR = [
      { name: { contains: search as string, mode: 'insensitive' } },
      { city: { contains: search as string, mode: 'insensitive' } },
      { district: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [facilities, total] = await Promise.all([
    prisma.facility.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        owner: { select: { id: true, fullName: true, phone: true } },
        _count: { select: { chambers: true, lots: true, staff: true } },
      },
    }),
    prisma.facility.count({ where }),
  ]);

  sendSuccess(res, facilities, 200, buildPaginationMeta(page, limit, total));
}));

/**
 * GET /facilities/:id — Facility details
 */
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facility = await prisma.facility.findUnique({
    where: { id: req.params.id },
    include: {
      owner: { select: { id: true, fullName: true, phone: true, email: true } },
      chambers: {
        orderBy: { chamberNumber: 'asc' },
        select: {
          id: true,
          chamberNumber: true,
          name: true,
          capacityMt: true,
          occupiedMt: true,
          status: true,
          commodityCategory: true,
        },
      },
      documents: {
        orderBy: { uploadedAt: 'desc' },
        select: {
          id: true,
          documentType: true,
          documentNumber: true,
          status: true,
          expiryDate: true,
          uploadedAt: true,
        },
      },
      _count: { select: { lots: true, staff: true, invoices: true } },
    },
  });

  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  sendSuccess(res, facility);
}));

/**
 * PATCH /facilities/:id — Update facility
 */
router.patch('/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OWNER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const existing = await prisma.facility.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  // Owners can only update their own facilities
  if (req.user!.role === UserRole.OWNER && existing.ownerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only update your own facilities');
    return;
  }

  const {
    name, addressLine1, addressLine2, city, district, state, pincode,
    latitude, longitude, totalCapacityMt, storageType, contactPhone, contactEmail,
  } = req.body;

  const updated = await prisma.facility.update({
    where: { id: req.params.id },
    data: {
      ...(name && { name }),
      ...(addressLine1 && { addressLine1 }),
      ...(addressLine2 !== undefined && { addressLine2 }),
      ...(city && { city }),
      ...(district && { district }),
      ...(state && { state }),
      ...(pincode && { pincode }),
      ...(latitude !== undefined && { latitude }),
      ...(longitude !== undefined && { longitude }),
      ...(totalCapacityMt && { totalCapacityMt }),
      ...(storageType && { storageType }),
      ...(contactPhone !== undefined && { contactPhone }),
      ...(contactEmail !== undefined && { contactEmail }),
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'facility.update',
    entityType: 'facility',
    entityId: req.params.id,
    oldValues: { name: existing.name },
    newValues: { name: updated.name },
  });

  sendSuccess(res, updated);
}));

/**
 * PATCH /facilities/:id/verify — Admin approves/rejects facility
 */
router.patch('/:id/verify', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, verificationNotes } = req.body;

  const existing = await prisma.facility.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  const updated = await prisma.facility.update({
    where: { id: req.params.id },
    data: {
      status,
      verifiedAt: new Date(),
      verifiedBy: req.user!.userId,
      verificationNotes,
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'facility.verify',
    entityType: 'facility',
    entityId: req.params.id,
    oldValues: { status: existing.status },
    newValues: { status: updated.status, verificationNotes },
  });

  sendSuccess(res, updated);
}));

/**
 * GET /facilities/:id/stats — Facility utilization stats
 */
router.get('/:id/stats', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = req.params.id;

  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { totalCapacityMt: true },
  });

  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  const [chambers, activeLots, totalLots, recentTransactions] = await Promise.all([
    prisma.chamber.findMany({
      where: { facilityId },
      select: { capacityMt: true, occupiedMt: true, status: true },
    }),
    prisma.inventoryLot.count({
      where: { facilityId, status: { in: ['STORED', 'INTAKE_PENDING', 'PARTIALLY_RELEASED'] } },
    }),
    prisma.inventoryLot.count({ where: { facilityId } }),
    prisma.inventoryTransaction.count({
      where: {
        lot: { facilityId },
        performedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),
  ]);

  const totalOccupied = chambers.reduce((sum, c) => sum + Number(c.occupiedMt), 0);
  const totalCapacity = Number(facility.totalCapacityMt);
  const utilizationRate = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

  sendSuccess(res, {
    totalCapacityMt: totalCapacity,
    occupiedMt: totalOccupied,
    availableMt: totalCapacity - totalOccupied,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    totalChambers: chambers.length,
    operationalChambers: chambers.filter(c => c.status === 'OPERATIONAL').length,
    activeLots,
    totalLots,
    recentTransactions,
  });
}));

// ── Facility Documents Sub-routes ──────────────

/**
 * POST /facilities/:id/documents — Upload compliance document
 */
router.post('/:id/documents', authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = req.params.id;
  const { documentType, documentNumber, fileUrl, issuedDate, expiryDate } = req.body;

  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) {
    errors.notFound(res, 'Facility not found');
    return;
  }

  const doc = await prisma.facilityDocument.create({
    data: {
      facilityId,
      documentType,
      documentNumber,
      fileUrl,
      issuedDate: issuedDate ? new Date(issuedDate) : null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      uploadedById: req.user!.userId,
    },
  });

  sendSuccess(res, doc, 201);
}));

/**
 * GET /facilities/:id/documents — List facility documents
 */
router.get('/:id/documents', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const docs = await prisma.facilityDocument.findMany({
    where: { facilityId: req.params.id },
    orderBy: { uploadedAt: 'desc' },
    include: {
      uploader: { select: { id: true, fullName: true } },
      reviewer: { select: { id: true, fullName: true } },
    },
  });

  sendSuccess(res, docs);
}));

/**
 * PATCH /facilities/:fid/documents/:did — Review document
 */
router.patch('/:fid/documents/:did', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, reviewNotes } = req.body;

  const doc = await prisma.facilityDocument.update({
    where: { id: req.params.did },
    data: {
      status,
      reviewedById: req.user!.userId,
      reviewedAt: new Date(),
      reviewNotes,
    },
  });

  sendSuccess(res, doc);
}));

export default router;
