import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole } from '../../shared/types';
import { createAuditLog } from '../../shared/utils/audit';
import { generateLotNumber, generateReceiptNumber, generateGatePassNumber } from '../../shared/utils/id-generator';
import { generateReceiptPdf, generateGatePassPdf } from '../../shared/utils/pdf-generator';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';

// ── Input Interfaces ───────────────────────────────────────

export interface IntakeLotInput {
  facilityId: string;
  chamberId: string;
  depositorId: string;
  commodityCategory: string;
  commodityName: string;
  intakeWeightKg: number;
  bagCount?: number;
  qualityGrade?: string;
  qualityNotes?: string;
  moistureContent?: number;
  expectedRelease?: string;
  performedById: string;
  performedByRole: UserRole;
}

export interface ListLotsInput {
  facilityId?: string;
  chamberId?: string;
  status?: string;
  commodityCategory?: string;
  depositorId?: string;
  search?: string;
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: string;
  // Role-based scope
  scopeFacilityId?: string;     // STAFF
  scopeOwnerUserId?: string;    // OWNER
}

export interface ReleaseLotInput {
  lotId: string;
  weightKg: number;
  bagCount?: number;
  notes?: string;
  performedById: string;
  performedByRole: UserRole;
}

export interface UpdateQualityInput {
  lotId: string;
  qualityGrade?: string;
  qualityNotes?: string;
  moistureContent?: number;
  performedById: string;
}

export interface TransferLotInput {
  lotId: string;
  targetChamberId: string;
  notes?: string;
  performedById: string;
}

// ── Service Class ──────────────────────────────────────────

export class InventoryService {
  /**
   * Log new commodity intake and create an inventory lot
   */
  async intakeLot(input: IntakeLotInput) {
    // Verify chamber exists in facility
    const chamber = await prisma.chamber.findUnique({
      where: { id: input.chamberId },
      include: { facility: true },
    });

    if (!chamber || chamber.facilityId !== input.facilityId) {
      throw new AppError(404, 'NOT_FOUND', 'Chamber not found in specified facility');
    }

    if (chamber.status !== 'OPERATIONAL') {
      throw new AppError(400, 'CHAMBER_OFFLINE', `Chamber ${chamber.chamberNumber} is ${chamber.status.toLowerCase()}, not accepting intake`);
    }

    // Check capacity
    const availableCapacity = Number(chamber.capacityMt) - Number(chamber.occupiedMt);
    const intakeWeightMt = input.intakeWeightKg / 1000;

    if (intakeWeightMt > availableCapacity) {
      throw new AppError(400, 'INSUFFICIENT_CAPACITY',
        `Insufficient chamber capacity. Available: ${availableCapacity.toFixed(2)} MT, Required: ${intakeWeightMt.toFixed(2)} MT`);
    }

    // Get active pricing for this commodity
    const pricing = await prisma.facilityPricing.findFirst({
      where: {
        facilityId: input.facilityId,
        commodityCategory: input.commodityCategory as any,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const lotNumber = generateLotNumber(input.facilityId);
    const receiptNumber = generateReceiptNumber(input.facilityId);

    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.create({
        data: {
          lotNumber,
          receiptNumber,
          facilityId: input.facilityId,
          chamberId: input.chamberId,
          depositorId: input.depositorId,
          commodityCategory: input.commodityCategory as any,
          commodityName: input.commodityName,
          intakeWeightKg: input.intakeWeightKg,
          currentWeightKg: input.intakeWeightKg,
          bagCount: input.bagCount ?? null,
          qualityGrade: (input.qualityGrade as any) ?? null,
          qualityNotes: input.qualityNotes ?? null,
          moistureContent: input.moistureContent ?? null,
          expectedRelease: input.expectedRelease ? new Date(input.expectedRelease) : null,
          status: 'STORED',
          appliedRate: pricing ? pricing.rateAmount : null,
          pricingModel: pricing ? pricing.pricingModel : null,
          createdById: input.performedById,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          transactionType: 'INTAKE',
          weightKg: input.intakeWeightKg,
          bagCount: input.bagCount ?? null,
          notes: `Initial intake of ${input.commodityName}`,
          performedById: input.performedById,
        },
      });

      await tx.chamber.update({
        where: { id: input.chamberId },
        data: { occupiedMt: { increment: intakeWeightMt } },
      });

      return lot;
    });

    await createAuditLog({
      userId: input.performedById,
      userRole: input.performedByRole,
      action: 'inventory.intake',
      entityType: 'inventory_lot',
      entityId: result.id,
      newValues: {
        lotNumber: result.lotNumber,
        commodityName: input.commodityName,
        intakeWeightKg: input.intakeWeightKg,
        depositorId: input.depositorId,
      },
    });

    return result;
  }

  /**
   * List inventory lots with role-based scoping and filters
   */
  async listLots(input: ListLotsInput) {
    const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(input as any);

    const where: any = {};

    if (input.scopeFacilityId) where.facilityId = input.scopeFacilityId;
    if (input.scopeOwnerUserId) where.facility = { ownerId: input.scopeOwnerUserId };

    if (input.facilityId) where.facilityId = input.facilityId;
    if (input.chamberId) where.chamberId = input.chamberId;
    if (input.status) where.status = input.status;
    if (input.commodityCategory) where.commodityCategory = input.commodityCategory;
    if (input.depositorId) where.depositorId = input.depositorId;

    if (input.search) {
      where.OR = [
        { lotNumber: { contains: input.search, mode: 'insensitive' } },
        { receiptNumber: { contains: input.search, mode: 'insensitive' } },
        { commodityName: { contains: input.search, mode: 'insensitive' } },
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

    return { lots, meta: buildPaginationMeta(page, limit, total) };
  }

  /**
   * Get full lot detail with transaction history
   */
  async getLotById(id: string) {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id },
      include: {
        depositor: { select: { id: true, fullName: true, phone: true, email: true } },
        chamber: { select: { id: true, chamberNumber: true, name: true, capacityMt: true } },
        facility: { select: { id: true, name: true, city: true, state: true } },
        transactions: {
          orderBy: { performedAt: 'desc' },
          include: { performer: { select: { id: true, fullName: true } } },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, invoiceNumber: true, totalAmount: true, status: true, issueDate: true },
        },
      },
    });

    if (!lot) {
      throw new AppError(404, 'NOT_FOUND', 'Inventory lot not found');
    }

    return lot;
  }

  /**
   * Initiate partial or full release of a lot
   */
  async releaseLot(input: ReleaseLotInput) {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: input.lotId },
      include: { chamber: true },
    });

    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Inventory lot not found');

    if (!['STORED', 'PARTIALLY_RELEASED'].includes(lot.status)) {
      throw new AppError(400, 'INVALID_STATUS', `Cannot release lot with status: ${lot.status}`);
    }

    if (input.weightKg > Number(lot.currentWeightKg)) {
      throw new AppError(400, 'EXCEEDS_WEIGHT',
        `Release weight (${input.weightKg} kg) exceeds current weight (${lot.currentWeightKg} kg)`);
    }

    const isFullRelease = input.weightKg >= Number(lot.currentWeightKg);
    const gatePassNumber = generateGatePassNumber(lot.facilityId);
    const releasedWeightMt = input.weightKg / 1000;

    const result = await prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          transactionType: isFullRelease ? 'FULL_RELEASE' : 'PARTIAL_RELEASE',
          weightKg: input.weightKg,
          bagCount: input.bagCount ?? null,
          notes: input.notes ?? null,
          gatePassNumber,
          authorizedById: input.performedById,
          performedById: input.performedById,
        },
      });

      const updatedLot = await tx.inventoryLot.update({
        where: { id: lot.id },
        data: {
          currentWeightKg: { decrement: input.weightKg },
          status: isFullRelease ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED',
          ...(isFullRelease && { actualReleaseDate: new Date() }),
        },
      });

      await tx.chamber.update({
        where: { id: lot.chamberId },
        data: { occupiedMt: { decrement: releasedWeightMt } },
      });

      return updatedLot;
    });

    await createAuditLog({
      userId: input.performedById,
      userRole: input.performedByRole,
      action: isFullRelease ? 'inventory.full_release' : 'inventory.partial_release',
      entityType: 'inventory_lot',
      entityId: lot.id,
      oldValues: { currentWeightKg: Number(lot.currentWeightKg), status: lot.status },
      newValues: { currentWeightKg: Number(result.currentWeightKg), status: result.status, gatePassNumber },
    });

    return { ...result, gatePassNumber };
  }

  /**
   * Update quality assessment for a lot
   */
  async updateQuality(input: UpdateQualityInput) {
    const lot = await prisma.inventoryLot.findUnique({ where: { id: input.lotId } });
    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Inventory lot not found');

    const updated = await prisma.inventoryLot.update({
      where: { id: input.lotId },
      data: {
        ...(input.qualityGrade && { qualityGrade: input.qualityGrade as any }),
        ...(input.qualityNotes !== undefined && { qualityNotes: input.qualityNotes }),
        ...(input.moistureContent !== undefined && { moistureContent: input.moistureContent }),
      },
    });

    await prisma.inventoryTransaction.create({
      data: {
        lotId: lot.id,
        transactionType: 'QUALITY_UPDATE',
        weightKg: Number(lot.currentWeightKg),
        notes: `Quality updated: ${input.qualityGrade || 'N/A'}. ${input.qualityNotes || ''}`.trim(),
        performedById: input.performedById,
      },
    });

    return updated;
  }

  /**
   * Transfer a lot to a different chamber within the same facility
   */
  async transferLot(input: TransferLotInput) {
    if (!input.targetChamberId) {
      throw new AppError(400, 'MISSING_FIELD', 'Target chamber ID is required');
    }

    const lot = await prisma.inventoryLot.findUnique({
      where: { id: input.lotId },
      include: { chamber: true },
    });

    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Lot not found');

    if (!['STORED', 'PARTIALLY_RELEASED'].includes(lot.status)) {
      throw new AppError(400, 'INVALID_STATUS', 'Only stored or partially released lots can be transferred');
    }

    if (lot.chamberId === input.targetChamberId) {
      throw new AppError(400, 'SAME_CHAMBER', 'Lot is already in this chamber');
    }

    const targetChamber = await prisma.chamber.findUnique({ where: { id: input.targetChamberId } });
    if (!targetChamber) throw new AppError(404, 'NOT_FOUND', 'Target chamber not found');

    if (targetChamber.facilityId !== lot.facilityId) {
      throw new AppError(400, 'CROSS_FACILITY', 'Cannot transfer to a chamber in a different facility');
    }

    if (targetChamber.status !== 'OPERATIONAL') {
      throw new AppError(400, 'CHAMBER_OFFLINE', 'Target chamber is not operational');
    }

    const weightMt = Number(lot.currentWeightKg) / 1000;
    const targetAvailable = Number(targetChamber.capacityMt) - Number(targetChamber.occupiedMt);

    if (weightMt > targetAvailable) {
      throw new AppError(400, 'INSUFFICIENT_CAPACITY',
        `Target chamber has only ${targetAvailable.toFixed(1)} MT available, need ${weightMt.toFixed(1)} MT`);
    }

    const sourceChamberOcc = Math.max(0, Number(lot.chamber.occupiedMt) - weightMt);

    await prisma.$transaction([
      prisma.inventoryLot.update({ where: { id: lot.id }, data: { chamberId: input.targetChamberId } }),
      prisma.chamber.update({ where: { id: lot.chamberId }, data: { occupiedMt: sourceChamberOcc } }),
      prisma.chamber.update({ where: { id: input.targetChamberId }, data: { occupiedMt: { increment: weightMt } } }),
      prisma.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          transactionType: 'TRANSFER',
          weightKg: lot.currentWeightKg,
          bagCount: lot.bagCount,
          performedById: input.performedById,
          notes: input.notes || `Transferred from ${lot.chamber.chamberNumber} to ${targetChamber.chamberNumber}`,
        },
      }),
    ]);

    return { message: `Lot ${lot.lotNumber} transferred to chamber ${targetChamber.chamberNumber}` };
  }

  /**
   * Get transaction history for a lot
   */
  async getLotTransactions(lotId: string) {
    return prisma.inventoryTransaction.findMany({
      where: { lotId },
      orderBy: { performedAt: 'desc' },
      include: {
        performer: { select: { id: true, fullName: true } },
        authorizer: { select: { id: true, fullName: true } },
      },
    });
  }

  /**
   * Generate intake receipt PDF buffer
   */
  async getReceiptPdf(lotId: string): Promise<{ buffer: Buffer; receiptNumber: string }> {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: lotId },
      include: {
        depositor: { select: { fullName: true, phone: true } },
        chamber: { select: { chamberNumber: true, name: true } },
        facility: { select: { name: true, addressLine1: true, city: true, state: true } },
      },
    });

    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Inventory lot not found');

    const buffer = await generateReceiptPdf({
      lotNumber: lot.lotNumber,
      receiptNumber: lot.receiptNumber,
      facilityName: lot.facility?.name || 'ColdStorage Facility',
      facilityAddress: lot.facility
        ? `${lot.facility.addressLine1}, ${lot.facility.city}, ${lot.facility.state}`
        : '',
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

    return { buffer, receiptNumber: lot.receiptNumber };
  }

  /**
   * Generate gate pass PDF buffer for a release transaction
   */
  async getGatePassPdf(lotId: string, txnId: string): Promise<{ buffer: Buffer; gatePassNumber: string }> {
    const lot = await prisma.inventoryLot.findUnique({
      where: { id: lotId },
      include: {
        depositor: { select: { fullName: true, phone: true } },
        facility: { select: { name: true, addressLine1: true, city: true, state: true } },
      },
    });

    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Inventory lot not found');

    const txn = await prisma.inventoryTransaction.findUnique({
      where: { id: txnId },
      include: { performer: { select: { fullName: true } } },
    });

    if (!txn || txn.lotId !== lot.id || !txn.gatePassNumber) {
      throw new AppError(404, 'NOT_FOUND', 'Gate pass transaction not found');
    }

    const buffer = await generateGatePassPdf({
      gatePassNumber: txn.gatePassNumber,
      lotNumber: lot.lotNumber,
      facilityName: lot.facility?.name || 'ColdStorage Facility',
      facilityAddress: lot.facility
        ? `${lot.facility.addressLine1}, ${lot.facility.city}, ${lot.facility.state}`
        : '',
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

    return { buffer, gatePassNumber: txn.gatePassNumber };
  }

  /**
   * Farmer: list own lots with rent calculation
   */
  async getFarmerLots(farmerId: string, status?: string, page = '1', limit = '20') {
    const { skip, take } = parsePagination({ page: parseInt(page as string), limit: parseInt(limit as string) });

    const where: any = { depositorId: farmerId };
    if (status) where.status = status;

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

    const enriched = lots.map(lot => {
      const daysSinceIntake = Math.floor(
        (Date.now() - new Date(lot.intakeDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const dailyRate = lot.appliedRate ? Number(lot.appliedRate) : 0;
      const estimatedRent = dailyRate * daysSinceIntake * (Number(lot.currentWeightKg) / 1000);

      return {
        ...lot,
        daysSinceIntake,
        estimatedRent: Math.round(estimatedRent * 100) / 100,
        outstandingRent: Math.round((Number(lot.totalRentAccrued) - Number(lot.totalRentPaid)) * 100) / 100,
      };
    });

    return {
      lots: enriched,
      pagination: buildPaginationMeta(parseInt(page as string), take, total),
    };
  }

  /**
   * Farmer: get IoT health summary for their lot's chamber
   */
  async getFarmerLotHealth(lotId: string, farmerId: string) {
    const lot = await prisma.inventoryLot.findFirst({
      where: { id: lotId, depositorId: farmerId },
      select: { chamberId: true, commodityName: true, lotNumber: true },
    });

    if (!lot) throw new AppError(404, 'NOT_FOUND', 'Lot not found');

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const readings = await prisma.temperatureReading.findMany({
      where: { chamberId: lot.chamberId, recordedAt: { gte: oneDayAgo } },
      select: { temperature: true, humidity: true, isAlert: true, recordedAt: true },
      orderBy: { recordedAt: 'asc' },
    });

    const latest = readings.length > 0 ? readings[readings.length - 1] : null;
    const avgTemp = readings.length > 0
      ? readings.reduce((sum, r) => sum + Number(r.temperature), 0) / readings.length
      : null;
    const avgHumidity = readings.length > 0
      ? readings.reduce((sum, r) => sum + Number(r.humidity || 0), 0) / readings.length
      : null;

    return {
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
        alertCount: readings.filter(r => r.isAlert).length,
        readingCount: readings.length,
      },
      readings: readings.map(r => ({
        temperature: Number(r.temperature),
        humidity: r.humidity ? Number(r.humidity) : null,
        isAlert: r.isAlert,
        recordedAt: r.recordedAt,
      })),
    };
  }
}

export const inventoryService = new InventoryService();
