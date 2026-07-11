/**
 * Booking Service — Core storage booking workflow
 *
 * Lifecycle:
 *   PENDING → CONFIRMED → ARRIVED → WEIGHING → STORED →
 *   DISPATCH_REQUESTED → DISPATCHING → DISPATCHED → COMPLETED
 *
 * Or: PENDING → CANCELLED / REJECTED at any point
 */
import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { createAuditLog } from '../../shared/utils/audit';
import { generateBookingNumber, generateFacilityCode } from '../../shared/utils/id-generator';
import { BookingStatus, CommodityCategory } from '@prisma/client';
import { UserRole } from '../../shared/types';
import crypto from 'crypto';

// ── Types ──
interface CreateBookingInput {
  farmerId: string;
  facilityId: string;
  commodityCategory: CommodityCategory;
  commodityName: string;
  estimatedWeightKg: number;
  estimatedBags?: number;
  preferredDate: string; // ISO date
  preferredSlot?: string;
  storageDuration?: number;
  farmerNote?: string;
}

interface UpdateBookingStatusInput {
  bookingId: string;
  status: BookingStatus;
  userId: string;
  userRole: string;
  // Optional fields for specific transitions
  chamberId?: string;
  actualWeightKg?: number;
  actualBags?: number;
  ratePerUnit?: number;
  totalAmount?: number;
  advancePaid?: number;
  ownerNote?: string;
  cancelReason?: string;
  dispatchWeightKg?: number;
  dispatchNote?: string;
}

/**
 * Generate a QR code payload for a booking
 */
function generateQRPayload(bookingId: string, bookingNumber: string): string {
  const token = crypto.randomBytes(16).toString('hex');
  return JSON.stringify({
    id: bookingId,
    bn: bookingNumber,
    tk: token,
    ts: Date.now(),
  });
}

export class BookingService {
  /**
   * Create a new storage booking
   */
  async createBooking(input: CreateBookingInput) {
    // Verify farmer exists
    const farmer = await prisma.user.findUnique({ where: { id: input.farmerId } });
    if (!farmer || farmer.role !== 'FARMER') {
      throw new AppError(400, 'INVALID_FARMER', 'Only farmers can create bookings');
    }

    // Verify facility exists and is active
    const facility = await prisma.facility.findUnique({ where: { id: input.facilityId } });
    if (!facility) {
      throw new AppError(404, 'FACILITY_NOT_FOUND', 'Facility not found');
    }
    if (facility.status !== 'ACTIVE') {
      throw new AppError(400, 'FACILITY_INACTIVE', 'This facility is not currently accepting bookings');
    }

    // Generate booking number
    const facilityCode = generateFacilityCode(facility.name);
    const todayBookings = await prisma.booking.count({
      where: {
        facilityId: input.facilityId,
        createdAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });
    const bookingNumber = generateBookingNumber(facilityCode, todayBookings + 1);

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        bookingNumber,
        farmerId: input.farmerId,
        facilityId: input.facilityId,
        commodityCategory: input.commodityCategory,
        commodityName: input.commodityName,
        estimatedWeightKg: input.estimatedWeightKg,
        estimatedBags: input.estimatedBags,
        preferredDate: new Date(input.preferredDate),
        preferredSlot: input.preferredSlot,
        storageDuration: input.storageDuration,
        farmerNote: input.farmerNote,
        status: 'PENDING',
      },
      include: {
        facility: {
          select: { id: true, name: true, city: true, state: true, contactPhone: true },
        },
        farmer: {
          select: { id: true, fullName: true, phone: true, uniqueId: true },
        },
      },
    });

    // Generate QR code data
    const qrCodeData = generateQRPayload(booking.id, bookingNumber);
    await prisma.booking.update({
      where: { id: booking.id },
      data: { qrCodeData },
    });

    // Audit log
    await createAuditLog({
      userId: input.farmerId,
      userRole: UserRole.FARMER,
      action: 'booking.create',
      entityType: 'booking',
      entityId: booking.id,
      newValues: { bookingNumber, facilityId: input.facilityId, commodity: input.commodityName },
    });

    return { ...booking, qrCodeData };
  }

  /**
   * Get booking by ID (with relations)
   */
  async getBookingById(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        facility: {
          select: {
            id: true, name: true, city: true, state: true, district: true,
            contactPhone: true, addressLine1: true, pincode: true,
            latitude: true, longitude: true,
          },
        },
        farmer: {
          select: { id: true, fullName: true, phone: true, uniqueId: true },
        },
        chamber: {
          select: { id: true, chamberNumber: true, name: true },
        },
        lot: {
          select: { id: true, lotNumber: true, receiptNumber: true, status: true, currentWeightKg: true },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found');
    }

    return booking;
  }

  /**
   * Get booking by booking number
   */
  async getBookingByNumber(bookingNumber: string) {
    const booking = await prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        facility: {
          select: { id: true, name: true, city: true, state: true, contactPhone: true },
        },
        farmer: {
          select: { id: true, fullName: true, phone: true, uniqueId: true },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found');
    }

    return booking;
  }

  /**
   * List farmer's bookings
   */
  async listFarmerBookings(farmerId: string, status?: BookingStatus, page = 1, limit = 20) {
    const where: any = { farmerId };
    if (status) where.status = status;

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          facility: {
            select: { id: true, name: true, city: true, state: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * List facility bookings (for owner/staff)
   */
  async listFacilityBookings(facilityId: string, status?: BookingStatus, date?: string, page = 1, limit = 20) {
    const where: any = { facilityId };
    if (status) where.status = status;
    if (date) {
      const d = new Date(date);
      where.preferredDate = {
        gte: new Date(d.setHours(0, 0, 0, 0)),
        lt: new Date(d.setHours(23, 59, 59, 999)),
      };
    }

    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: {
          farmer: {
            select: { id: true, fullName: true, phone: true, uniqueId: true },
          },
        },
        orderBy: { preferredDate: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    return { bookings, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /**
   * Update booking status (state machine transitions)
   */
  async updateBookingStatus(input: UpdateBookingStatusInput) {
    const booking = await prisma.booking.findUnique({ where: { id: input.bookingId } });
    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found');
    }

    // Validate state transition
    this._validateTransition(booking.status, input.status, input.userRole);

    // Build update data
    const updateData: any = { status: input.status };

    switch (input.status) {
      case 'CONFIRMED':
        if (input.chamberId) updateData.chamberId = input.chamberId;
        if (input.ownerNote) updateData.ownerNote = input.ownerNote;
        break;

      case 'ARRIVED':
        updateData.arrivedAt = new Date();
        updateData.scannedById = input.userId;
        break;

      case 'WEIGHING':
        // Just status change — weighing in progress
        break;

      case 'STORED':
        if (input.actualWeightKg) updateData.actualWeightKg = input.actualWeightKg;
        if (input.actualBags) updateData.actualBags = input.actualBags;
        if (input.ratePerUnit) updateData.ratePerUnit = input.ratePerUnit;
        if (input.totalAmount) updateData.totalAmount = input.totalAmount;
        if (input.advancePaid) updateData.advancePaid = input.advancePaid;
        updateData.weighedAt = new Date();
        break;

      case 'DISPATCH_REQUESTED':
        updateData.dispatchRequestedAt = new Date();
        break;

      case 'DISPATCHED':
        updateData.dispatchedAt = new Date();
        if (input.dispatchWeightKg) updateData.dispatchWeightKg = input.dispatchWeightKg;
        if (input.dispatchNote) updateData.dispatchNote = input.dispatchNote;
        break;

      case 'CANCELLED':
        updateData.cancelReason = input.cancelReason || 'Cancelled';
        break;

      case 'REJECTED':
        updateData.cancelReason = input.cancelReason || 'Rejected by facility';
        if (input.ownerNote) updateData.ownerNote = input.ownerNote;
        break;
    }

    const updated = await prisma.booking.update({
      where: { id: input.bookingId },
      data: updateData,
      include: {
        facility: {
          select: { id: true, name: true, city: true },
        },
        farmer: {
          select: { id: true, fullName: true, phone: true },
        },
      },
    });

    // Audit log
    await createAuditLog({
      userId: input.userId,
      userRole: input.userRole as UserRole,
      action: `booking.${input.status.toLowerCase()}`,
      entityType: 'booking',
      entityId: input.bookingId,
      oldValues: { status: booking.status },
      newValues: { status: input.status },
    });

    return updated;
  }

  /**
   * Verify QR code scan — called when owner/staff scans the farmer's QR
   */
  async verifyQRScan(qrPayload: string, scannerId: string) {
    let parsed: any;
    try {
      parsed = JSON.parse(qrPayload);
    } catch {
      throw new AppError(400, 'INVALID_QR', 'Invalid QR code format');
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parsed.id },
      include: {
        farmer: {
          select: { id: true, fullName: true, phone: true, uniqueId: true },
        },
        facility: {
          select: { id: true, name: true },
        },
      },
    });

    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found for this QR code');
    }

    if (booking.bookingNumber !== parsed.bn) {
      throw new AppError(400, 'QR_MISMATCH', 'QR code does not match booking');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new AppError(400, 'INVALID_STATUS', `Cannot scan booking with status: ${booking.status}`);
    }

    // Transition to ARRIVED
    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'ARRIVED',
        arrivedAt: new Date(),
        scannedById: scannerId,
      },
      include: {
        farmer: {
          select: { id: true, fullName: true, phone: true, uniqueId: true },
        },
        facility: {
          select: { id: true, name: true },
        },
      },
    });

    await createAuditLog({
      userId: scannerId,
      userRole: UserRole.STAFF,
      action: 'booking.qr_scan',
      entityType: 'booking',
      entityId: booking.id,
      newValues: { status: 'ARRIVED', scannerId },
    });

    return updated;
  }

  /**
   * Validate allowed state transitions
   */
  private _validateTransition(current: BookingStatus, next: BookingStatus, userRole: string) {
    const allowed: Record<string, BookingStatus[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
      CONFIRMED: ['ARRIVED', 'CANCELLED', 'REJECTED'],
      ARRIVED: ['WEIGHING', 'CANCELLED'],
      WEIGHING: ['STORED', 'CANCELLED'],
      STORED: ['DISPATCH_REQUESTED', 'COMPLETED'],
      DISPATCH_REQUESTED: ['DISPATCHING', 'CANCELLED'],
      DISPATCHING: ['DISPATCHED'],
      DISPATCHED: ['COMPLETED'],
    };

    const transitions = allowed[current];
    if (!transitions || !transitions.includes(next)) {
      throw new AppError(400, 'INVALID_TRANSITION', `Cannot transition from ${current} to ${next}`);
    }

    // Role-based permission checks
    const farmerOnly: BookingStatus[] = ['DISPATCH_REQUESTED'];
    const ownerStaffOnly: BookingStatus[] = ['CONFIRMED', 'ARRIVED', 'WEIGHING', 'STORED', 'DISPATCHING', 'DISPATCHED', 'REJECTED'];

    if (farmerOnly.includes(next) && userRole !== 'FARMER') {
      throw new AppError(403, 'FORBIDDEN', 'Only farmers can perform this action');
    }
    if (ownerStaffOnly.includes(next) && !['OWNER', 'STAFF', 'ADMIN', 'SUPER_ADMIN'].includes(userRole)) {
      throw new AppError(403, 'FORBIDDEN', 'Only facility staff can perform this action');
    }
  }
}

export const bookingService = new BookingService();
