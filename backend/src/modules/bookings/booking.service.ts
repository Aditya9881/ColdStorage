/**
 * Booking Service — Core storage booking workflow
 *
 * Lifecycle:
 *   PENDING → CONFIRMED → ARRIVED → WEIGHING → STORED →
 *   DISPATCH_REQUESTED → DISPATCHING → DISPATCHED → COMPLETED
 *
 * Or: PENDING → CANCELLED / REJECTED at any point
 *
 * NOTE: QR code and booking confirmation details are only generated
 * when the cold storage owner confirms the booking (PENDING → CONFIRMED).
 * The farmer is notified via WhatsApp and push notification upon approval.
 */
import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { createAuditLog } from '../../shared/utils/audit';
import {
  generateBookingNumber,
  generateFacilityCode,
  generateLotNumber,
  generateReceiptNumber,
} from '../../shared/utils/id-generator';
import { BookingStatus, CommodityCategory } from '@prisma/client';
import { UserRole } from '../../shared/types';
import crypto from 'crypto';
import { whatsappService } from '../whatsapp/whatsapp.service';
import { pushNotificationService } from '../notifications/push.service';

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

    // Create booking — QR code is NOT generated here.
    // QR + notification are deferred until the owner confirms the booking.
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

    // Audit log
    await createAuditLog({
      userId: input.farmerId,
      userRole: UserRole.FARMER,
      action: 'booking.create',
      entityType: 'booking',
      entityId: booking.id,
      newValues: { bookingNumber, facilityId: input.facilityId, commodity: input.commodityName },
    });

    return booking;
  }

  /**
   * Get booking by ID (with relations)
   */
  async getBookingById(bookingId: string, userId: string, userRole: string, facilityId?: string) {
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

    await this.assertBookingAccess(booking, userId, userRole, facilityId);

    return booking;
  }

  /**
   * Get booking by booking number
   */
  async getBookingByNumber(bookingNumber: string, userId: string, userRole: string, facilityId?: string) {
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

    await this.assertBookingAccess(booking, userId, userRole, facilityId);

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
  async listFacilityBookings(
    facilityId: string,
    userId: string,
    userRole: string,
    assignedFacilityId?: string,
    status?: BookingStatus,
    date?: string,
    page = 1,
    limit = 20,
  ) {
    await this.assertFacilityAccess(facilityId, userId, userRole, assignedFacilityId);

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
    const booking = await prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { facility: { select: { id: true, name: true, ownerId: true } } },
    });
    if (!booking) {
      throw new AppError(404, 'NOT_FOUND', 'Booking not found');
    }

    await this.assertBookingAccess(booking, input.userId, input.userRole);

    // Validate state transition
    this._validateTransition(booking.status, input.status, input.userRole);

    // Build update data
    const updateData: any = { status: input.status };

    switch (input.status) {
      case 'CONFIRMED': {
        if (input.chamberId) updateData.chamberId = input.chamberId;
        if (input.ownerNote) updateData.ownerNote = input.ownerNote;
        // Generate QR code on confirmation — this is when the farmer gets their scannable QR
        const qrCodeData = generateQRPayload(booking.id, booking.bookingNumber);
        updateData.qrCodeData = qrCodeData;
        break;
      }

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

    let updated;
    if (input.status === 'STORED') {
      updated = await this.storeBooking(booking, input, updateData);
    } else {
      updated = await prisma.booking.update({
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
    }

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

    // When booking is confirmed by owner, notify the farmer via WhatsApp + Push
    if (input.status === 'CONFIRMED') {
      await this.notifyFarmerApproval(updated);
    }

    return updated;
  }

  /**
   * Verify QR code scan — called when owner/staff scans the farmer's QR
   */
  async verifyQRScan(qrPayload: string, scannerId: string, scannerRole?: string, assignedFacilityId?: string) {
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

    await this.assertFacilityAccess(booking.facilityId, scannerId, scannerRole || UserRole.STAFF, assignedFacilityId);

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

  /** Ensure a caller can only see or act on bookings in their own scope. */
  private async assertBookingAccess(
    booking: { farmerId: string; facilityId: string; facility?: { ownerId?: string; [key: string]: unknown } | null },
    userId: string,
    userRole: string,
    assignedFacilityId?: string,
  ) {
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole as UserRole)) return;
    if (userRole === UserRole.FARMER && booking.farmerId === userId) return;

    await this.assertFacilityAccess(booking.facilityId, userId, userRole, assignedFacilityId, booking.facility?.ownerId);
  }

  private async assertFacilityAccess(
    bookingFacilityId: string,
    userId: string,
    userRole: string,
    assignedFacilityId?: string,
    knownOwnerId?: string,
  ) {
    if ([UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(userRole as UserRole)) return;
    if (userRole === UserRole.STAFF && assignedFacilityId === bookingFacilityId) return;

    if (userRole === UserRole.OWNER) {
      const ownerId = knownOwnerId ?? (await prisma.facility.findUnique({
        where: { id: bookingFacilityId },
        select: { ownerId: true },
      }))?.ownerId;
      if (ownerId === userId) return;
    }

    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this booking');
  }

  /**
   * Notify the farmer when their booking is approved by the cold storage owner.
   * Sends both a WhatsApp message and a push notification.
   */
  private async notifyFarmerApproval(booking: any) {
    try {
      const farmer = booking.farmer || await prisma.user.findUnique({
        where: { id: booking.farmerId },
        select: { id: true, fullName: true, phone: true },
      });
      const facility = booking.facility || await prisma.facility.findUnique({
        where: { id: booking.facilityId },
        select: { id: true, name: true, city: true },
      });

      if (!farmer) return;

      const facilityName = facility?.name || 'Cold Storage';
      const facilityCity = facility?.city || '';
      const dateStr = booking.preferredDate
        ? new Date(booking.preferredDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';

      // ── WhatsApp Notification ──
      if (farmer.phone) {
        // Normalize phone to WhatsApp format (country code + number, no +)
        let waPhone = farmer.phone.replace(/[^\d]/g, '');
        if (waPhone.length === 10) waPhone = `91${waPhone}`; // Indian number

        const waMessage = [
          `✅ *Booking Approved!*`,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          ``,
          `Your booking has been confirmed by *${facilityName}*!`,
          ``,
          `📋 Booking No.   *#${booking.bookingNumber}*`,
          `🏭 Facility        ${facilityName}${facilityCity ? `, ${facilityCity}` : ''}`,
          `📦 Commodity     ${booking.commodityName || ''}`,
          `📅 Date             ${dateStr}`,
          ``,
          `✅ Status           *CONFIRMED*`,
          ``,
          `🔲 Your QR code is ready! Open the app to view your booking QR.`,
          `Show it at the facility gate when you arrive.`,
          ``,
          `━━━━━━━━━━━━━━━━━━━━━━`,
          `_Send *bookings* to view all bookings_`,
          `_Send *menu* for main menu_`,
        ].join('\n');

        await whatsappService.sendText(waPhone, waMessage);
        console.log(`[Booking] WhatsApp approval notification sent to ${waPhone}`);
      }

      // ── Push Notification ──
      await pushNotificationService.sendToUser(farmer.id, {
        title: '✅ Booking Approved!',
        body: `Your booking #${booking.bookingNumber} at ${facilityName} has been confirmed. Open the app to view your QR code.`,
        type: 'BOOKING_CONFIRMED',
        data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
      });
      console.log(`[Booking] Push approval notification sent to farmer ${farmer.id}`);
    } catch (err) {
      // Notification failure should not break the booking confirmation
      console.error('[Booking] Failed to send farmer approval notification:', err);
    }
  }

  /**
   * Finalise weighing and create the physical inventory record in one database
   * transaction. A booking without a linked lot is not considered stored.
   */
  private async storeBooking(
    booking: any,
    input: UpdateBookingStatusInput,
    updateData: Record<string, unknown>,
  ) {
    const chamberId = booking.chamberId ?? input.chamberId;
    const actualWeightKg = input.actualWeightKg;

    if (!chamberId) {
      throw new AppError(400, 'CHAMBER_REQUIRED', 'Assign a chamber before confirming storage');
    }
    if (!actualWeightKg || actualWeightKg <= 0) {
      throw new AppError(400, 'WEIGHT_REQUIRED', 'Actual weight is required before confirming storage');
    }

    const chamber = await prisma.chamber.findUnique({ where: { id: chamberId } });
    if (!chamber || chamber.facilityId !== booking.facilityId) {
      throw new AppError(400, 'INVALID_CHAMBER', 'The selected chamber does not belong to this facility');
    }
    if (chamber.status !== 'OPERATIONAL') {
      throw new AppError(400, 'CHAMBER_OFFLINE', 'The selected chamber is not accepting storage');
    }

    const intakeWeightMt = actualWeightKg / 1000;
    if (intakeWeightMt > Number(chamber.capacityMt) - Number(chamber.occupiedMt)) {
      throw new AppError(400, 'INSUFFICIENT_CAPACITY', 'The selected chamber does not have sufficient capacity');
    }

    const pricing = await prisma.facilityPricing.findFirst({
      where: {
        facilityId: booking.facilityId,
        commodityCategory: booking.commodityCategory,
        status: 'ACTIVE',
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const facilityCode = generateFacilityCode(booking.facility.name);
    const lotSequence = await prisma.inventoryLot.count({ where: { facilityId: booking.facilityId } }) + 1;
    const expectedRelease = booking.storageDuration
      ? new Date(Date.now() + booking.storageDuration * 24 * 60 * 60 * 1000)
      : null;

    return prisma.$transaction(async (tx) => {
      const lot = await tx.inventoryLot.create({
        data: {
          lotNumber: generateLotNumber(facilityCode, lotSequence),
          receiptNumber: generateReceiptNumber(facilityCode, lotSequence),
          facilityId: booking.facilityId,
          chamberId,
          depositorId: booking.farmerId,
          commodityCategory: booking.commodityCategory,
          commodityName: booking.commodityName,
          intakeWeightKg: actualWeightKg,
          currentWeightKg: actualWeightKg,
          bagCount: input.actualBags ?? null,
          status: 'STORED',
          appliedRate: input.ratePerUnit ?? pricing?.rateAmount ?? null,
          pricingModel: pricing?.pricingModel ?? null,
          expectedRelease,
          createdById: input.userId,
        },
      });

      await tx.inventoryTransaction.create({
        data: {
          lotId: lot.id,
          transactionType: 'INTAKE',
          weightKg: actualWeightKg,
          bagCount: input.actualBags ?? null,
          notes: `Created from booking ${booking.bookingNumber}`,
          performedById: input.userId,
        },
      });

      await tx.chamber.update({
        where: { id: chamberId },
        data: { occupiedMt: { increment: intakeWeightMt } },
      });

      return tx.booking.update({
        where: { id: booking.id },
        data: { ...updateData, chamberId, lotId: lot.id },
        include: {
          facility: { select: { id: true, name: true, city: true } },
          farmer: { select: { id: true, fullName: true, phone: true } },
          lot: { select: { id: true, lotNumber: true, receiptNumber: true, status: true } },
        },
      });
    });
  }
}

export const bookingService = new BookingService();
