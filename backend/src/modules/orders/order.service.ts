/**
 * Order Service
 * Extracted from inline route handlers to enable unit-testable,
 * reusable business logic for order lifecycle operations.
 */

import { prisma } from '../../config/database';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole } from '../../shared/types';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const OTP_HASH_ROUNDS = 6;

// ── OTP Helpers ──

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, OTP_HASH_ROUNDS);
}

async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}

// ── Order Operations ──

export const orderService = {
  /**
   * Create a new purchase order from a buyer on a marketplace listing.
   */
  async createOrder(buyerId: string, listingId: string, quantityKg: number) {
    const listing: any = await prisma.marketListing.findFirst({
      where: { id: listingId, status: 'ACTIVE' },
      include: { lot: { select: { currentWeightKg: true, depositorId: true } } },
    });
    if (!listing) throw new AppError(404, 'NOT_FOUND', 'Listing not found or inactive');

    const qty = parseFloat(String(quantityKg));
    if (listing.minQuantityKg && qty < Number(listing.minQuantityKg)) {
      throw new AppError(400, 'MIN_QUANTITY', `Min order: ${listing.minQuantityKg} kg`);
    }
    if (qty > Number(listing.lot.currentWeightKg)) {
      throw new AppError(400, 'EXCEEDS_STOCK', 'Exceeds available stock');
    }
    if (listing.sellerId === buyerId) {
      throw new AppError(400, 'SELF_ORDER', 'Cannot order your own listing');
    }

    const totalAmount = qty * Number(listing.askingPricePerKg);
    const rawOtp = generateOTP();
    const otpCode = await hashOTP(rawOtp);
    const otpExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const order = await prisma.$transaction(async (tx: any) => {
      const newOrder = await tx.order.create({
        data: { listingId, buyerId, quantityKg: qty, agreedPricePerKg: Number(listing.askingPricePerKg), totalAmount, otpCode, otpExpiresAt },
        include: {
          listing: { select: { askingPricePerKg: true, lot: { select: { lotNumber: true, commodityName: true, facility: { select: { name: true } } } } } },
          buyer: { select: { id: true, fullName: true, phone: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: listing.lot.depositorId, type: 'SYSTEM',
          title: 'New Purchase Order',
          message: `${newOrder.buyer.fullName} wants to buy ${qty} kg at ₹${Number(listing.askingPricePerKg)}/kg. Approval code: ${rawOtp}`,
          actionUrl: `/orders/${newOrder.id}`,
          metadata: { orderId: newOrder.id },
        },
      });
      return newOrder;
    });

    // Strip OTP from response
    const { otpCode: _, ...orderData } = order as any;
    return orderData;
  },

  /**
   * List orders filtered by the caller's role.
   */
  async listOrders(userId: string, role: string, filters: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (role === UserRole.BUYER) where.buyerId = userId;
    else if (role === UserRole.FARMER) where.listing = { sellerId: userId };
    if (status) where.status = status;

    const pageNum = Math.max(1, page);
    const pageSize = Math.min(50, limit);

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          listing: {
            select: {
              askingPricePerKg: true, sellerId: true,
              lot: {
                select: {
                  lotNumber: true, commodityName: true, commodityCategory: true,
                  currentWeightKg: true, qualityGrade: true,
                  facility: { select: { name: true, city: true } },
                },
              },
              seller: { select: { id: true, fullName: true } },
            },
          },
          buyer: { select: { id: true, fullName: true, phone: true, city: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);

    const sanitized = orders.map(({ otpCode, ...o }: any) => o);
    return {
      orders: sanitized,
      pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
    };
  },

  /**
   * Get order detail with role-based access control.
   */
  async getOrderById(orderId: string, userId: string, role: string) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: {
          include: {
            lot: {
              select: {
                id: true, lotNumber: true, commodityName: true, commodityCategory: true,
                currentWeightKg: true, qualityGrade: true, bagCount: true, intakeDate: true, status: true,
                facility: { select: { id: true, name: true, city: true, state: true, contactPhone: true } },
                chamber: { select: { chamberNumber: true, name: true } },
              },
            },
            seller: { select: { id: true, fullName: true, phone: true, city: true, state: true } },
          },
        },
        buyer: { select: { id: true, fullName: true, phone: true, city: true, state: true } },
      },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');

    const isSeller = order.listing.seller.id === userId;
    const isBuyer = order.buyerId === userId;
    const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
    if (!isSeller && !isBuyer && !isAdmin) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }

    const { otpCode, ...orderData } = order;
    const responseData: any = { ...orderData };
    // Only show OTP to the seller while the order is pending approval
    if (isSeller && order.status === 'PENDING_APPROVAL') responseData.otpCode = otpCode;

    return responseData;
  },

  /**
   * Seller approves the order with OTP verification.
   */
  async approveOrder(orderId: string, sellerId: string, otp: string) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        listing: { select: { sellerId: true, lotId: true, lot: { select: { commodityName: true } } } },
        buyer: { select: { fullName: true } },
      },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (order.listing.sellerId !== sellerId) throw new AppError(403, 'FORBIDDEN', 'Only seller can approve');
    if (order.status !== 'PENDING_APPROVAL') throw new AppError(400, 'INVALID_STATUS', `Already ${order.status}`);
    if (order.otpExpiresAt && new Date() > order.otpExpiresAt) throw new AppError(400, 'OTP_EXPIRED', 'OTP expired');

    const isOtpValid = order.otpCode ? await verifyOTP(otp, order.otpCode) : false;
    if (!isOtpValid) throw new AppError(400, 'INVALID_OTP', 'Invalid OTP');

    return prisma.$transaction(async (tx: any) => {
      const approved = await tx.order.update({
        where: { id: orderId },
        data: { status: 'APPROVED', approvedAt: new Date(), otpCode: null },
      });
      await tx.notification.create({
        data: {
          userId: order.buyerId, type: 'SYSTEM', title: 'Order Approved!',
          message: `Your order for ${order.quantityKg} kg of ${order.listing.lot.commodityName} has been approved.`,
          actionUrl: `/orders/${order.id}`,
        },
      });
      return approved;
    });
  },

  /**
   * Seller rejects the order with an optional reason.
   */
  async rejectOrder(orderId: string, sellerId: string, reason?: string) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: { select: { sellerId: true, lot: { select: { commodityName: true } } } } },
    });
    if (!order) throw new AppError(404, 'NOT_FOUND', 'Order not found');
    if (order.listing.sellerId !== sellerId) throw new AppError(403, 'FORBIDDEN', 'Only seller can reject');
    if (order.status !== 'PENDING_APPROVAL') throw new AppError(400, 'INVALID_STATUS', `Already ${order.status}`);

    return prisma.$transaction(async (tx: any) => {
      const rejected = await tx.order.update({
        where: { id: orderId },
        data: { status: 'REJECTED', rejectedReason: reason || 'Not specified', otpCode: null },
      });
      await tx.notification.create({
        data: {
          userId: order.buyerId, type: 'SYSTEM', title: 'Order Rejected',
          message: `Your order for ${order.quantityKg} kg of ${order.listing.lot.commodityName} was rejected. Reason: ${reason || 'Not specified'}`,
          actionUrl: `/orders/${order.id}`,
        },
      });
      return rejected;
    });
  },

  /**
   * Regenerate OTP for a pending order.
   */
  async regenerateOTP(orderId: string, sellerId: string) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: { listing: { select: { sellerId: true } } },
    });
    if (!order || order.listing.sellerId !== sellerId) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }
    if (order.status !== 'PENDING_APPROVAL') {
      throw new AppError(400, 'INVALID_STATUS', 'Only for pending orders');
    }

    const newOtp = generateOTP();
    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { otpCode: await hashOTP(newOtp), otpExpiresAt: new Date(Date.now() + 30 * 60 * 1000) },
    });

    await prisma.notification.create({
      data: {
        userId: order.listing.sellerId,
        type: 'SYSTEM',
        title: 'New Approval Code',
        message: `Approval code for order ${order.id}: ${newOtp}`,
        actionUrl: `/orders/${order.id}`,
        metadata: { orderId: order.id },
      },
    });

    return { expiresAt: updated.otpExpiresAt };
  },

  /**
   * Seller dispatches an approved+paid order. Updates inventory, lot, chamber, listing.
   */
  async dispatchOrder(orderId: string, sellerId: string) {
    const order: any = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        escrow: true,
        listing: {
          include: {
            lot: { select: { id: true, currentWeightKg: true, status: true, chamberId: true } },
          },
        },
      },
    });

    if (!order || order.listing.sellerId !== sellerId) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }
    if (order.status !== 'APPROVED') {
      throw new AppError(400, 'INVALID_STATUS', 'Only approved orders can be dispatched');
    }
    if (!order.escrow || order.escrow.status !== 'HELD') {
      throw new AppError(400, 'PAYMENT_REQUIRED', 'Confirmed escrow payment is required before dispatch');
    }

    const dispatchWeightKg = Number(order.quantityKg);
    const currentWeightKg = Number(order.listing.lot.currentWeightKg);
    if (dispatchWeightKg > currentWeightKg) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', 'The listed lot no longer has sufficient stock');
    }
    if (!['STORED', 'PARTIALLY_RELEASED'].includes(order.listing.lot.status)) {
      throw new AppError(400, 'LOT_UNAVAILABLE', 'The listed lot is not available for dispatch');
    }

    const isFullRelease = dispatchWeightKg >= currentWeightKg;

    return prisma.$transaction(async (tx: any) => {
      await tx.inventoryTransaction.create({
        data: {
          lotId: order.listing.lot.id,
          transactionType: isFullRelease ? 'FULL_RELEASE' : 'PARTIAL_RELEASE',
          weightKg: dispatchWeightKg,
          notes: `Marketplace order dispatch: ${orderId}`,
          authorizedById: sellerId,
          depositorApproved: true,
          performedById: sellerId,
        },
      });

      await tx.inventoryLot.update({
        where: { id: order.listing.lot.id },
        data: {
          currentWeightKg: { decrement: dispatchWeightKg },
          status: isFullRelease ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED',
          ...(isFullRelease ? { actualReleaseDate: new Date() } : {}),
        },
      });

      await tx.chamber.update({
        where: { id: order.listing.lot.chamberId },
        data: { occupiedMt: { decrement: dispatchWeightKg / 1000 } },
      });

      await tx.marketListing.update({
        where: { id: order.listingId },
        data: { status: isFullRelease ? 'SOLD' : 'ACTIVE' },
      });

      const dispatched = await tx.order.update({
        where: { id: orderId },
        data: { status: 'DISPATCHED' },
      });

      await tx.notification.create({
        data: {
          userId: order.buyerId,
          type: 'SYSTEM',
          title: 'Order Dispatched',
          message: 'Your paid order has been dispatched by the seller.',
          actionUrl: `/orders/${orderId}`,
          metadata: { orderId },
        },
      });

      return dispatched;
    });
  },

  /**
   * Buyer confirms delivery, completing the order.
   */
  async completeOrder(orderId: string, buyerId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.buyerId !== buyerId) {
      throw new AppError(404, 'NOT_FOUND', 'Order not found');
    }
    if (order.status !== 'DISPATCHED') {
      throw new AppError(400, 'INVALID_STATUS', 'Only dispatched orders can be completed');
    }

    return prisma.order.update({
      where: { id: orderId },
      data: { status: 'COMPLETED' },
    });
  },
};
