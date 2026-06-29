import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';
import { createAuditLog } from '../../shared/utils/audit';
import { generateLotNumber, generateReceiptNumber, generateGatePassNumber } from '../../shared/utils/id-generator';
import { generateReceiptPdf, generateGatePassPdf } from '../../shared/utils/pdf-generator';

const router = Router();

router.use(authenticate);

/**
 * POST /inventory/intake — Log new commodity intake (creates lot)
 */
router.post('/intake', authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const {
    facilityId, chamberId, depositorId,
    commodityCategory, commodityName,
    intakeWeightKg, bagCount,
    qualityGrade, qualityNotes, moistureContent,
    expectedRelease,
  } = req.body;

  // Verify facility and chamber exist
  const chamber = await prisma.chamber.findUnique({
    where: { id: chamberId },
    include: { facility: true },
  });

  if (!chamber || chamber.facilityId !== facilityId) {
    errors.notFound(res, 'Chamber not found in specified facility');
    return;
  }

  // Check chamber capacity
  const availableCapacity = Number(chamber.capacityMt) - Number(chamber.occupiedMt);
  const intakeWeightMt = intakeWeightKg / 1000;

  if (intakeWeightMt > availableCapacity) {
    errors.badRequest(res, `Insufficient chamber capacity. Available: ${availableCapacity} MT, Required: ${intakeWeightMt} MT`);
    return;
  }

  // Get applicable pricing
  const pricing = await prisma.facilityPricing.findFirst({
    where: {
      facilityId,
      commodityCategory,
      status: 'ACTIVE',
      effectiveFrom: { lte: new Date() },
      OR: [
        { effectiveUntil: null },
        { effectiveUntil: { gte: new Date() } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
  });

  // Generate identifiers
  const lotNumber = generateLotNumber(facilityId);
  const receiptNumber = generateReceiptNumber(facilityId);

  // Create lot + transaction in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the inventory lot
    const lot = await tx.inventoryLot.create({
      data: {
        lotNumber,
        receiptNumber,
        facilityId,
        chamberId,
        depositorId,
        commodityCategory,
        commodityName,
        intakeWeightKg,
        currentWeightKg: intakeWeightKg,
        bagCount,
        qualityGrade,
        qualityNotes,
        moistureContent,
        expectedRelease: expectedRelease ? new Date(expectedRelease) : null,
        status: 'STORED',
        appliedRate: pricing ? pricing.rateAmount : null,
        pricingModel: pricing ? pricing.pricingModel : null,
        createdById: req.user!.userId,
      },
    });

    // Create intake transaction
    await tx.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        transactionType: 'INTAKE',
        weightKg: intakeWeightKg,
        bagCount,
        notes: `Initial intake of ${commodityName}`,
        performedById: req.user!.userId,
      },
    });

    // Update chamber occupancy
    await tx.chamber.update({
      where: { id: chamberId },
      data: {
        occupiedMt: { increment: intakeWeightMt },
      },
    });

    return lot;
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: 'inventory.intake',
    entityType: 'inventory_lot',
    entityId: result.id,
    newValues: {
      lotNumber: result.lotNumber,
      commodityName,
      intakeWeightKg,
      depositorId,
    },
  });

  sendSuccess(res, result, 201);
}));

/**
 * GET /inventory/lots — List inventory lots
 */
router.get('/lots', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(req.query);
  const { facilityId, chamberId, status, commodityCategory, depositorId, search } = req.query;

  const where: any = {};

  // Role-based scoping
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    where.facilityId = req.user!.facilityId;
  } else if (req.user!.role === UserRole.OWNER) {
    where.facility = { ownerId: req.user!.userId };
  }

  if (facilityId) where.facilityId = facilityId;
  if (chamberId) where.chamberId = chamberId;
  if (status) where.status = status;
  if (commodityCategory) where.commodityCategory = commodityCategory;
  if (depositorId) where.depositorId = depositorId;
  if (search) {
    where.OR = [
      { lotNumber: { contains: search as string, mode: 'insensitive' } },
      { receiptNumber: { contains: search as string, mode: 'insensitive' } },
      { commodityName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [lots, total] = await Promise.all([
    prisma.inventoryLot.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy]: sortOrder },
      include: {
        depositor: { select: { id: true, fullName: true, phone: true } },
        chamber: { select: { id: true, chamberNumber: true, name: true } },
        facility: { select: { id: true, name: true } },
      },
    }),
    prisma.inventoryLot.count({ where }),
  ]);

  sendSuccess(res, lots, 200, buildPaginationMeta(page, limit, total));
}));

/**
 * GET /inventory/lots/:id — Lot details with transaction history
 */
router.get('/lots/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: req.params.id },
    include: {
      depositor: { select: { id: true, fullName: true, phone: true, email: true } },
      chamber: { select: { id: true, chamberNumber: true, name: true, capacityMt: true } },
      facility: { select: { id: true, name: true, city: true, state: true } },
      transactions: {
        orderBy: { performedAt: 'desc' },
        include: {
          performer: { select: { id: true, fullName: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, invoiceNumber: true, totalAmount: true, status: true, issueDate: true },
      },
    },
  });

  if (!lot) {
    errors.notFound(res, 'Inventory lot not found');
    return;
  }

  sendSuccess(res, lot);
}));

/**
 * POST /inventory/lots/:id/release — Initiate partial or full release
 */
router.post('/lots/:id/release', authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { weightKg, bagCount, notes } = req.body;

  const lot = await prisma.inventoryLot.findUnique({
    where: { id: req.params.id },
    include: { chamber: true },
  });

  if (!lot) {
    errors.notFound(res, 'Inventory lot not found');
    return;
  }

  if (!['STORED', 'PARTIALLY_RELEASED'].includes(lot.status)) {
    errors.badRequest(res, `Cannot release lot with status: ${lot.status}`);
    return;
  }

  if (weightKg > Number(lot.currentWeightKg)) {
    errors.badRequest(res, `Release weight (${weightKg} kg) exceeds current weight (${lot.currentWeightKg} kg)`);
    return;
  }

  const isFullRelease = weightKg >= Number(lot.currentWeightKg);
  const gatePassNumber = generateGatePassNumber(lot.facilityId);
  const releasedWeightMt = weightKg / 1000;

  const result = await prisma.$transaction(async (tx) => {
    // Create release transaction
    await tx.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        transactionType: isFullRelease ? 'FULL_RELEASE' : 'PARTIAL_RELEASE',
        weightKg,
        bagCount,
        notes,
        gatePassNumber,
        authorizedById: req.user!.userId,
        performedById: req.user!.userId,
      },
    });

    // Update lot
    const updatedLot = await tx.inventoryLot.update({
      where: { id: lot.id },
      data: {
        currentWeightKg: { decrement: weightKg },
        status: isFullRelease ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED',
        ...(isFullRelease && { actualReleaseDate: new Date() }),
      },
    });

    // Update chamber occupancy
    await tx.chamber.update({
      where: { id: lot.chamberId },
      data: {
        occupiedMt: { decrement: releasedWeightMt },
      },
    });

    return updatedLot;
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role,
    action: isFullRelease ? 'inventory.full_release' : 'inventory.partial_release',
    entityType: 'inventory_lot',
    entityId: lot.id,
    oldValues: { currentWeightKg: Number(lot.currentWeightKg), status: lot.status },
    newValues: { currentWeightKg: Number(result.currentWeightKg), status: result.status, gatePassNumber },
  });

  sendSuccess(res, { ...result, gatePassNumber });
}));

/**
 * PATCH /inventory/lots/:id/quality — Update quality assessment
 */
router.patch('/lots/:id/quality', authorize(UserRole.STAFF, UserRole.OWNER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { qualityGrade, qualityNotes, moistureContent } = req.body;

  const lot = await prisma.inventoryLot.findUnique({ where: { id: req.params.id } });
  if (!lot) {
    errors.notFound(res, 'Inventory lot not found');
    return;
  }

  const updated = await prisma.inventoryLot.update({
    where: { id: req.params.id },
    data: {
      ...(qualityGrade && { qualityGrade }),
      ...(qualityNotes !== undefined && { qualityNotes }),
      ...(moistureContent !== undefined && { moistureContent }),
    },
  });

  // Log quality update transaction
  await prisma.inventoryTransaction.create({
    data: {
      lotId: lot.id,
      transactionType: 'QUALITY_UPDATE',
      weightKg: Number(lot.currentWeightKg),
      notes: `Quality updated: ${qualityGrade || 'N/A'}. ${qualityNotes || ''}`.trim(),
      performedById: req.user!.userId,
    },
  });

  sendSuccess(res, updated);
}));

/**
 * GET /inventory/lots/:id/transactions — Transaction history for a lot
 */
router.get('/lots/:id/transactions', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const transactions = await prisma.inventoryTransaction.findMany({
    where: { lotId: req.params.id },
    orderBy: { performedAt: 'desc' },
    include: {
      performer: { select: { id: true, fullName: true } },
      authorizer: { select: { id: true, fullName: true } },
    },
  });

  sendSuccess(res, transactions);
}));

/**
 * GET /inventory/lots/:id/receipt — Download intake receipt PDF
 */
router.get('/lots/:id/receipt', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: req.params.id },
    include: {
      depositor: { select: { fullName: true, phone: true } },
      chamber: { select: { chamberNumber: true, name: true } },
      facility: { select: { name: true, addressLine1: true, city: true, state: true } },
    },
  });

  if (!lot) {
    errors.notFound(res, 'Inventory lot not found');
    return;
  }

  const pdfBuffer = await generateReceiptPdf({
    lotNumber: lot.lotNumber,
    receiptNumber: lot.receiptNumber,
    facilityName: lot.facility?.name || 'ColdStorage Facility',
    facilityAddress: lot.facility ? `${lot.facility.addressLine1}, ${lot.facility.city}, ${lot.facility.state}` : '',
    chamberNumber: lot.chamber?.chamberNumber || '',
    chamberName: lot.chamber?.name || null,
    depositorName: lot.depositor?.fullName || 'Unknown',
    depositorPhone: lot.depositor?.phone || '',
    commodityCategory: lot.commodityCategory,
    commodityName: lot.commodityName,
    intakeWeightKg: Number(lot.intakeWeightKg),
    bagCount: lot.bagCount,
    qualityGrade: lot.qualityGrade,
    moistureContent: lot.moistureContent ? Number(lot.moistureContent) : null,
    intakeDate: lot.intakeDate,
    expectedRelease: lot.expectedRelease,
    appliedRate: lot.appliedRate ? Number(lot.appliedRate) : null,
    pricingModel: lot.pricingModel,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="receipt-${lot.receiptNumber}.pdf"`,
    'Content-Length': pdfBuffer.length.toString(),
  });
  res.send(pdfBuffer);
}));

/**
 * GET /inventory/lots/:id/gate-pass/:txnId — Download gate pass PDF
 */
router.get('/lots/:id/gate-pass/:txnId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const lot = await prisma.inventoryLot.findUnique({
    where: { id: req.params.id },
    include: {
      depositor: { select: { fullName: true, phone: true } },
      facility: { select: { name: true, addressLine1: true, city: true, state: true } },
    },
  });

  if (!lot) {
    errors.notFound(res, 'Inventory lot not found');
    return;
  }

  const txn = await prisma.inventoryTransaction.findUnique({
    where: { id: req.params.txnId },
    include: {
      performer: { select: { fullName: true } },
    },
  });

  if (!txn || txn.lotId !== lot.id || !txn.gatePassNumber) {
    errors.notFound(res, 'Gate pass transaction not found');
    return;
  }

  const pdfBuffer = await generateGatePassPdf({
    gatePassNumber: txn.gatePassNumber,
    lotNumber: lot.lotNumber,
    facilityName: lot.facility?.name || 'ColdStorage Facility',
    facilityAddress: lot.facility ? `${lot.facility.addressLine1}, ${lot.facility.city}, ${lot.facility.state}` : '',
    depositorName: lot.depositor?.fullName || 'Unknown',
    depositorPhone: lot.depositor?.phone || '',
    commodityName: lot.commodityName,
    releaseWeightKg: Number(txn.weightKg),
    bagCount: txn.bagCount,
    remainingWeightKg: Number(lot.currentWeightKg),
    releaseType: txn.transactionType,
    releasedBy: txn.performer?.fullName || 'System',
    releaseDate: txn.performedAt,
    notes: txn.notes,
  });

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="gate-pass-${txn.gatePassNumber}.pdf"`,
    'Content-Length': pdfBuffer.length.toString(),
  });
  res.send(pdfBuffer);
}));

/**
 * POST /inventory/lots/:id/transfer — Transfer lot to a different chamber
 */
router.post('/lots/:id/transfer', authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { targetChamberId, notes } = req.body;

  if (!targetChamberId) {
    errors.badRequest(res, 'Target chamber ID is required');
    return;
  }

  const lot = await prisma.inventoryLot.findUnique({
    where: { id: req.params.id },
    include: { chamber: true },
  });

  if (!lot) {
    errors.notFound(res, 'Lot not found');
    return;
  }

  if (lot.status !== 'STORED' && lot.status !== 'PARTIALLY_RELEASED') {
    errors.badRequest(res, 'Only stored or partially released lots can be transferred');
    return;
  }

  if (lot.chamberId === targetChamberId) {
    errors.badRequest(res, 'Lot is already in this chamber');
    return;
  }

  const targetChamber = await prisma.chamber.findUnique({ where: { id: targetChamberId } });
  if (!targetChamber) {
    errors.notFound(res, 'Target chamber not found');
    return;
  }

  if (targetChamber.facilityId !== lot.facilityId) {
    errors.badRequest(res, 'Cannot transfer to a chamber in a different facility');
    return;
  }

  if (targetChamber.status !== 'OPERATIONAL') {
    errors.badRequest(res, 'Target chamber is not operational');
    return;
  }

  // Check capacity
  const weightMt = Number(lot.currentWeightKg) / 1000;
  const targetOccupied = Number(targetChamber.occupiedMt || 0);
  const targetCapacity = Number(targetChamber.capacityMt || 0);

  if (targetOccupied + weightMt > targetCapacity) {
    errors.badRequest(res, `Target chamber does not have enough capacity (${(targetCapacity - targetOccupied).toFixed(1)} MT available, ${weightMt.toFixed(1)} MT needed)`);
    return;
  }

  // Execute transfer in a transaction
  const sourceChamberOcc = Math.max(0, Number(lot.chamber.occupiedMt || 0) - weightMt);

  await prisma.$transaction([
    // Update lot's chamber
    prisma.inventoryLot.update({
      where: { id: lot.id },
      data: { chamberId: targetChamberId },
    }),
    // Decrease source chamber occupancy
    prisma.chamber.update({
      where: { id: lot.chamberId },
      data: { occupiedMt: sourceChamberOcc },
    }),
    // Increase target chamber occupancy
    prisma.chamber.update({
      where: { id: targetChamberId },
      data: { occupiedMt: targetOccupied + weightMt },
    }),
    // Record transaction
    prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        transactionType: 'TRANSFER',
        weightKg: lot.currentWeightKg,
        bagCount: lot.bagCount,
        performedById: req.user!.userId,
        notes: notes || `Transferred from ${lot.chamber.chamberNumber} to ${targetChamber.chamberNumber}`,
      },
    }),
  ]);

  sendSuccess(res, { message: `Lot ${lot.lotNumber} transferred to chamber ${targetChamber.chamberNumber}` });
}));

// ── FARMER-SPECIFIC ENDPOINTS ────────────────────────

/**
 * GET /inventory/my-lots — Farmer's own deposited lots with rent accrual
 */
router.get('/my-lots', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const farmerId = req.user!.userId;
  const { status, page = '1', limit = '20' } = req.query;

  const where: any = { depositorId: farmerId };
  if (status) where.status = status as string;

  const { skip, take } = parsePagination({ page: parseInt(page as string), limit: parseInt(limit as string) });

  const [lots, total] = await Promise.all([
    prisma.inventoryLot.findMany({
      where,
      include: {
        facility: { select: { id: true, name: true, city: true, state: true } },
        chamber: { select: { chamberNumber: true, name: true, targetTempMin: true, targetTempMax: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { intakeDate: 'desc' },
      skip,
      take,
    }),
    prisma.inventoryLot.count({ where }),
  ]);

  // Enrich with computed rent info
  const enriched = lots.map(lot => {
    const daysSinceIntake = Math.floor((Date.now() - new Date(lot.intakeDate).getTime()) / (1000 * 60 * 60 * 24));
    const dailyRate = lot.appliedRate ? Number(lot.appliedRate) : 0;
    const estimatedRent = dailyRate * daysSinceIntake * (Number(lot.currentWeightKg) / 1000); // rate per MT per day

    return {
      ...lot,
      daysSinceIntake,
      estimatedRent: Math.round(estimatedRent * 100) / 100,
      outstandingRent: Math.round((Number(lot.totalRentAccrued) - Number(lot.totalRentPaid)) * 100) / 100,
    };
  });

  sendSuccess(res, {
    lots: enriched,
    pagination: buildPaginationMeta(parseInt(page as string), take, total),
  });
}));

/**
 * GET /inventory/my-lots/:id/health — IoT health data for a farmer's lot
 */
router.get('/my-lots/:id/health', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const lot = await prisma.inventoryLot.findFirst({
    where: { id: req.params.id, depositorId: req.user!.userId },
    select: { chamberId: true, commodityName: true, lotNumber: true },
  });

  if (!lot) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Lot not found' } });
  }

  // Get last 24 hours of temperature readings
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const readings = await prisma.temperatureReading.findMany({
    where: {
      chamberId: lot.chamberId,
      recordedAt: { gte: oneDayAgo },
    },
    select: {
      temperature: true,
      humidity: true,
      isAlert: true,
      recordedAt: true,
    },
    orderBy: { recordedAt: 'asc' },
  });

  // Get latest reading
  const latest = readings.length > 0 ? readings[readings.length - 1] : null;

  // Calculate averages
  const avgTemp = readings.length > 0
    ? readings.reduce((sum, r) => sum + Number(r.temperature), 0) / readings.length
    : null;
  const avgHumidity = readings.length > 0
    ? readings.reduce((sum, r) => sum + Number(r.humidity || 0), 0) / readings.length
    : null;
  const alertCount = readings.filter(r => r.isAlert).length;

  sendSuccess(res, {
    lotNumber: lot.lotNumber,
    commodityName: lot.commodityName,
    current: latest ? {
      temperature: Number(latest.temperature),
      humidity: latest.humidity ? Number(latest.humidity) : null,
      isAlert: latest.isAlert,
      recordedAt: latest.recordedAt,
    } : null,
    summary: {
      avgTemperature: avgTemp ? Math.round(avgTemp * 10) / 10 : null,
      avgHumidity: avgHumidity ? Math.round(avgHumidity * 10) / 10 : null,
      alertCount,
      readingCount: readings.length,
    },
    readings: readings.map(r => ({
      temperature: Number(r.temperature),
      humidity: r.humidity ? Number(r.humidity) : null,
      isAlert: r.isAlert,
      recordedAt: r.recordedAt,
    })),
  });
}));

export default router;
