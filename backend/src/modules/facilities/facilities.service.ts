import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole } from '../../shared/types';
import { createAuditLog } from '../../shared/utils/audit';
import { generateFacilityRegNumber } from '../../shared/utils/reg-number-generator';
import type { PaginationQuery } from '../../shared/types';
import { buildPaginationMeta, parsePagination } from '../../shared/utils/pagination';
import { cacheGet, cacheInvalidate } from '../../config/redis';

// ── Input Interfaces ───────────────────────────────────────

export interface CreateFacilityInput {
  name: string;
  registrationNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  totalCapacityMt: number;
  storageType?: string;
  operatingSince?: string;
  contactPhone?: string;
  contactEmail?: string;
  ownerId: string;
}

export interface UpdateFacilityInput {
  name?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  totalCapacityMt?: number;
  storageType?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export interface ListFacilitiesInput extends PaginationQuery {
  status?: string;
  state?: string;
  storageType?: string;
  search?: string;
  ownerId?: string;      // auto-set for OWNER role
  facilityId?: string;  // auto-set for STAFF role
}

export interface VerifyFacilityInput {
  status: string;
  verificationNotes?: string;
  verifiedBy: string;
}

export interface UploadDocumentInput {
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  issuedDate?: string;
  expiryDate?: string;
  uploadedById: string;
}

export interface ReviewDocumentInput {
  status: string;
  reviewNotes?: string;
  reviewedById: string;
}

// ── Service Class ──────────────────────────────────────────

export class FacilitiesService {
  /**
   * Register a new cold storage facility
   */
  async createFacility(input: CreateFacilityInput) {
    let regNumber = input.registrationNumber;
    if (!regNumber && input.state) {
      regNumber = await generateFacilityRegNumber(input.state);
    }

    const facility = await prisma.facility.create({
      data: {
        name: input.name,
        registrationNumber: regNumber,
        addressLine1: input.addressLine1,
        addressLine2: input.addressLine2 || null,
        city: input.city,
        district: input.district,
        state: input.state,
        pincode: input.pincode,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        totalCapacityMt: input.totalCapacityMt,
        storageType: (input.storageType as any) || 'BAG',
        operatingSince: input.operatingSince ? new Date(input.operatingSince) : null,
        ownerId: input.ownerId,
        contactPhone: input.contactPhone ?? null,
        contactEmail: input.contactEmail ?? null,
      },
    });

    await createAuditLog({
      userId: input.ownerId,
      userRole: UserRole.OWNER,
      action: 'facility.create',
      entityType: 'facility',
      entityId: facility.id,
      newValues: { name: facility.name, state: facility.state },
    });

    return facility;
  }

  /**
   * List facilities with role-based scoping and pagination
   */
  async listFacilities(input: ListFacilitiesInput) {
    const { page, limit, skip, take, sortBy, sortOrder } = parsePagination(input as any);

    const where: any = {};

    if (input.ownerId) where.ownerId = input.ownerId;
    if (input.facilityId) where.id = input.facilityId;
    if (input.status) where.status = input.status;
    if (input.state) where.state = { equals: input.state, mode: 'insensitive' };
    if (input.storageType) where.storageType = input.storageType;
    if (input.search) {
      where.OR = [
        { name: { contains: input.search, mode: 'insensitive' } },
        { city: { contains: input.search, mode: 'insensitive' } },
        { district: { contains: input.search, mode: 'insensitive' } },
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

    return { facilities, meta: buildPaginationMeta(page, limit, total) };
  }

  /**
   * Get full facility detail
   */
  async getFacilityById(id: string) {
    const facility = await prisma.facility.findUnique({
      where: { id },
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
      throw new AppError(404, 'NOT_FOUND', 'Facility not found');
    }

    return facility;
  }

  /**
   * Update facility details (owners can only update their own)
   */
  async updateFacility(id: string, input: UpdateFacilityInput, requestingUserId: string, requestingRole: UserRole) {
    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Facility not found');
    }

    if (requestingRole === UserRole.OWNER && existing.ownerId !== requestingUserId) {
      throw new AppError(403, 'FORBIDDEN', 'You can only update your own facilities');
    }

    const updated = await prisma.facility.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.addressLine1 && { addressLine1: input.addressLine1 }),
        ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
        ...(input.city && { city: input.city }),
        ...(input.district && { district: input.district }),
        ...(input.state && { state: input.state }),
        ...(input.pincode && { pincode: input.pincode }),
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.totalCapacityMt && { totalCapacityMt: input.totalCapacityMt }),
        ...(input.storageType && { storageType: input.storageType as any }),
        ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
        ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      },
    });

    await createAuditLog({
      userId: requestingUserId,
      userRole: requestingRole,
      action: 'facility.update',
      entityType: 'facility',
      entityId: id,
      oldValues: { name: existing.name },
      newValues: { name: updated.name },
    });

    await cacheInvalidate(`facility:${id}:*`);
    return updated;
  }

  /**
   * Admin approves or rejects a facility
   */
  async verifyFacility(id: string, input: VerifyFacilityInput) {
    const existing = await prisma.facility.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, 'NOT_FOUND', 'Facility not found');
    }

    const updated = await prisma.facility.update({
      where: { id },
      data: {
        status: input.status as any,
        verifiedAt: new Date(),
        verifiedBy: input.verifiedBy,
        verificationNotes: input.verificationNotes,
      },
    });

    await createAuditLog({
      userId: input.verifiedBy,
      userRole: UserRole.ADMIN,
      action: 'facility.verify',
      entityType: 'facility',
      entityId: id,
      oldValues: { status: existing.status },
      newValues: { status: updated.status, verificationNotes: input.verificationNotes },
    });

    return updated;
  }

  /**
   * Get facility utilization statistics (cached 60s)
   */
  async getFacilityStats(facilityId: string) {
    return cacheGet(
      `facility:${facilityId}:stats`,
      60,
      async () => {
        const facility = await prisma.facility.findUnique({
          where: { id: facilityId },
          select: { totalCapacityMt: true },
        });

        if (!facility) {
          throw new AppError(404, 'NOT_FOUND', 'Facility not found');
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

        return {
          totalCapacityMt: totalCapacity,
          occupiedMt: totalOccupied,
          availableMt: totalCapacity - totalOccupied,
          utilizationRate: Math.round(utilizationRate * 100) / 100,
          totalChambers: chambers.length,
          operationalChambers: chambers.filter(c => c.status === 'OPERATIONAL').length,
          activeLots,
          totalLots,
          recentTransactions,
        };
      }
    );
  }

  /**
   * Upload a compliance document
   */
  async uploadDocument(facilityId: string, input: UploadDocumentInput) {
    const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
    if (!facility) {
      throw new AppError(404, 'NOT_FOUND', 'Facility not found');
    }

    return prisma.facilityDocument.create({
      data: {
        facilityId,
        documentType: input.documentType as any,
        documentNumber: input.documentNumber ?? null,
        fileUrl: input.fileUrl,
        issuedDate: input.issuedDate ? new Date(input.issuedDate) : null,
        expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
        uploadedById: input.uploadedById,
      },
    });
  }

  /**
   * List compliance documents for a facility
   */
  async listDocuments(facilityId: string) {
    return prisma.facilityDocument.findMany({
      where: { facilityId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        uploader: { select: { id: true, fullName: true } },
        reviewer: { select: { id: true, fullName: true } },
      },
    });
  }

  /**
   * Admin reviews a compliance document
   */
  async reviewDocument(documentId: string, input: ReviewDocumentInput) {
    return prisma.facilityDocument.update({
      where: { id: documentId },
      data: {
        status: input.status as any,
        reviewedById: input.reviewedById,
        reviewedAt: new Date(),
        reviewNotes: input.reviewNotes ?? null,
      },
    });
  }
}

export const facilitiesService = new FacilitiesService();
