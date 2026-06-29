import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import crypto from 'crypto';

const router = Router();
router.use(authenticate);

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// ── POST /orders — Buyer places order ──
router.post('/', authorize(UserRole.BUYER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { listingId, quantityKg } = req.body;
  const buyerId = req.user!.userId;

  if (!listingId || !quantityKg) { res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'listingId and quantityKg are required' } }); return; }

  const listing: any = await prisma.marketListing.findFirst({
    where: { id: listingId, status: 'ACTIVE' },
    include: { lot: { select: { currentWeightKg: true, depositorId: true } } },
  });
  if (!listing) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Listing not found or inactive' } }); return; }

  const qty = parseFloat(quantityKg);
  if (listing.minQuantityKg && qty < Number(listing.minQuantityKg)) { res.status(400).json({ success: false, error: { code: 'MIN_QUANTITY', message: `Min order: ${listing.minQuantityKg} kg` } }); return; }
  if (qty > Number(listing.lot.currentWeightKg)) { res.status(400).json({ success: false, error: { code: 'EXCEEDS_STOCK', message: 'Exceeds available stock' } }); return; }
  if (listing.sellerId === buyerId) { res.status(400).json({ success: false, error: { code: 'SELF_ORDER', message: 'Cannot order your own listing' } }); return; }

  const totalAmount = qty * Number(listing.askingPricePerKg);
  const otpCode = generateOTP();
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
        message: `${newOrder.buyer.fullName} wants to buy ${qty} kg at ₹${Number(listing.askingPricePerKg)}/kg. Review and approve.`,
        actionUrl: `/orders/${newOrder.id}`,
        metadata: { orderId: newOrder.id },
      },
    });
    return newOrder;
  });

  const { otpCode: _, ...orderData } = order as any;
  res.status(201).json({ success: true, data: orderData });
}));

// ── GET /orders — List orders (role-filtered) ──
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const { status, page = '1', limit = '20' } = req.query;

  const where: any = {};
  if (role === UserRole.BUYER) where.buyerId = userId;
  else if (role === UserRole.FARMER) where.listing = { sellerId: userId };
  if (status) where.status = status;

  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        listing: { select: { askingPricePerKg: true, sellerId: true,
          lot: { select: { lotNumber: true, commodityName: true, commodityCategory: true, currentWeightKg: true, qualityGrade: true,
            facility: { select: { name: true, city: true } } } },
          seller: { select: { id: true, fullName: true } } } },
        buyer: { select: { id: true, fullName: true, phone: true, city: true } },
      },
      orderBy: { createdAt: 'desc' }, skip: (pageNum - 1) * pageSize, take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const sanitized = orders.map(({ otpCode, ...o }: any) => o);
  res.json({ success: true, data: { orders: sanitized, pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) } } });
}));

// ── GET /orders/:id — Detail ──
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order: any = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: {
      listing: {
        include: {
          lot: { select: { id: true, lotNumber: true, commodityName: true, commodityCategory: true, currentWeightKg: true, qualityGrade: true, bagCount: true, intakeDate: true, status: true,
            facility: { select: { id: true, name: true, city: true, state: true, contactPhone: true } },
            chamber: { select: { chamberNumber: true, name: true } } } },
          seller: { select: { id: true, fullName: true, phone: true, city: true, state: true } },
        },
      },
      buyer: { select: { id: true, fullName: true, phone: true, city: true, state: true } },
    },
  });
  if (!order) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }); return; }

  const userId = req.user!.userId;
  const role = req.user!.role;
  const isSeller = order.listing.seller.id === userId;
  const isBuyer = order.buyerId === userId;
  const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  if (!isSeller && !isBuyer && !isAdmin) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }); return; }

  const { otpCode, ...orderData } = order;
  const responseData: any = { ...orderData };
  if (isSeller && order.status === 'PENDING_APPROVAL') responseData.otpCode = otpCode;

  res.json({ success: true, data: responseData });
}));

// ── POST /orders/:id/approve — Farmer approves with OTP ──
router.post('/:id/approve', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { otp } = req.body;
  const userId = req.user!.userId;

  const order: any = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { listing: { select: { sellerId: true, lotId: true, lot: { select: { commodityName: true } } } }, buyer: { select: { fullName: true } } },
  });
  if (!order) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }); return; }
  if (order.listing.sellerId !== userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only seller can approve' } }); return; }
  if (order.status !== 'PENDING_APPROVAL') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Already ${order.status}` } }); return; }
  if (!otp || otp !== order.otpCode) { res.status(400).json({ success: false, error: { code: 'INVALID_OTP', message: 'Invalid OTP' } }); return; }
  if (order.otpExpiresAt && new Date() > order.otpExpiresAt) { res.status(400).json({ success: false, error: { code: 'OTP_EXPIRED', message: 'OTP expired' } }); return; }

  const updated = await prisma.$transaction(async (tx: any) => {
    const approved = await tx.order.update({ where: { id: req.params.id }, data: { status: 'APPROVED', approvedAt: new Date(), otpCode: null } });
    await tx.notification.create({
      data: { userId: order.buyerId, type: 'SYSTEM', title: 'Order Approved!',
        message: `Your order for ${order.quantityKg} kg of ${order.listing.lot.commodityName} has been approved.`,
        actionUrl: `/orders/${order.id}` },
    });
    return approved;
  });
  res.json({ success: true, data: updated });
}));

// ── POST /orders/:id/reject ──
router.post('/:id/reject', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { reason } = req.body;
  const order: any = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { listing: { select: { sellerId: true, lot: { select: { commodityName: true } } } } },
  });
  if (!order) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }); return; }
  if (order.listing.sellerId !== req.user!.userId) { res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Only seller can reject' } }); return; }
  if (order.status !== 'PENDING_APPROVAL') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: `Already ${order.status}` } }); return; }

  const updated = await prisma.$transaction(async (tx: any) => {
    const rejected = await tx.order.update({ where: { id: req.params.id }, data: { status: 'REJECTED', rejectedReason: reason || 'Not specified', otpCode: null } });
    await tx.notification.create({
      data: { userId: order.buyerId, type: 'SYSTEM', title: 'Order Rejected',
        message: `Your order for ${order.quantityKg} kg of ${order.listing.lot.commodityName} was rejected. Reason: ${reason || 'Not specified'}`,
        actionUrl: `/orders/${order.id}` },
    });
    return rejected;
  });
  res.json({ success: true, data: updated });
}));

// ── POST /orders/:id/regenerate-otp ──
router.post('/:id/regenerate-otp', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const order: any = await prisma.order.findUnique({ where: { id: req.params.id }, include: { listing: { select: { sellerId: true } } } });
  if (!order || order.listing.sellerId !== req.user!.userId) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Order not found' } }); return; }
  if (order.status !== 'PENDING_APPROVAL') { res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Only for pending orders' } }); return; }

  const newOtp = generateOTP();
  const updated = await prisma.order.update({ where: { id: req.params.id }, data: { otpCode: newOtp, otpExpiresAt: new Date(Date.now() + 30 * 60 * 1000) } });
  res.json({ success: true, data: { otpCode: newOtp, expiresAt: updated.otpExpiresAt } });
}));

export default router;
