import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { createAuditLog } from '../../shared/utils/audit';

const router = Router();
router.use(authenticate);

// ── GET /escrow — List escrow transactions ──
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const where: any = {};

  if (status) where.status = status as string;

  // Scope by role
  if (req.user!.role === UserRole.BUYER) {
    where.order = { buyerId: req.user!.userId };
  } else if (req.user!.role === UserRole.FARMER) {
    where.order = { listing: { sellerId: req.user!.userId } };
  } else if (req.user!.role === UserRole.OWNER) {
    const facilities = await prisma.facility.findMany({
      where: { ownerId: req.user!.userId }, select: { id: true },
    });
    where.order = { listing: { lot: { facilityId: { in: facilities.map(f => f.id) } } } };
  }

  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const [transactions, total] = await Promise.all([
    prisma.escrowTransaction.findMany({
      where,
      include: {
        order: {
          select: {
            id: true, quantityKg: true, agreedPricePerKg: true, totalAmount: true, status: true,
            buyer: { select: { id: true, fullName: true } },
            listing: {
              select: {
                id: true,
                lot: {
                  select: {
                    lotNumber: true, commodityName: true,
                    depositor: { select: { id: true, fullName: true } },
                    facility: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.escrowTransaction.count({ where }),
  ]);

  sendSuccess(res, {
    transactions,
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}));

// ── GET /escrow/:id — Escrow detail ──
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id: paramString(req.params.id) },
    include: {
      order: {
        select: {
          id: true, quantityKg: true, agreedPricePerKg: true, totalAmount: true,
          status: true, createdAt: true,
          buyer: { select: { id: true, fullName: true, phone: true, businessName: true } },
          listing: {
            select: {
              id: true, askingPricePerKg: true,
              seller: { select: { id: true, fullName: true, phone: true } },
              lot: {
                select: {
                  lotNumber: true, commodityName: true, commodityCategory: true,
                  currentWeightKg: true, qualityGrade: true,
                  facility: { select: { id: true, name: true, city: true, state: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!escrow) { errors.notFound(res, 'Escrow transaction not found'); return; }

  sendSuccess(res, escrow);
}));

// ── POST /escrow/:orderId/pay — Buyer initiates payment (marks as HELD) ──
router.post('/:orderId/pay', authorize(UserRole.BUYER, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const orderId = paramString(req.params.orderId);
  const { pgReferenceId, pgProvider } = req.body;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { escrow: true },
  });
  if (!order) { errors.notFound(res, 'Order not found'); return; }

  if (req.user!.role === UserRole.BUYER && order.buyerId !== req.user!.userId) {
    errors.forbidden(res, 'You can only pay for your own orders');
    return;
  }
  if (order.status !== 'APPROVED') {
    errors.badRequest(res, 'Order must be approved before payment');
    return;
  }

  // Create or update escrow
  let escrow;
  if (order.escrow) {
    if (order.escrow.status !== 'PENDING') {
      errors.badRequest(res, `Escrow is already in ${order.escrow.status} state`);
      return;
    }
    escrow = await prisma.escrowTransaction.update({
      where: { id: order.escrow.id },
      data: {
        buyerPaidAt: new Date(),
        pgReferenceId: pgReferenceId || null,
        pgProvider: pgProvider || null,
        status: 'HELD',
      },
    });
  } else {
    escrow = await prisma.escrowTransaction.create({
      data: {
        orderId,
        amount: order.totalAmount,
        buyerPaidAt: new Date(),
        pgReferenceId: pgReferenceId || null,
        pgProvider: pgProvider || null,
        status: 'HELD',
      },
    });
  }

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'ESCROW_PAYMENT_RECEIVED',
    entityType: 'EscrowTransaction',
    entityId: escrow.id,
    newValues: { amount: escrow.amount, pgReferenceId, status: 'HELD' },
  });

  sendSuccess(res, escrow);
}));

// ── POST /escrow/:id/release — Release funds to seller (after OTP approval + dispatch) ──
router.post('/:id/release', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.OWNER, UserRole.STAFF), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const { loanDeduction } = req.body;

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          status: true,
          listing: {
            select: {
              lot: {
                select: {
                  warehouseReceipt: { select: { isPledged: true, pledgeAmount: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!escrow) { errors.notFound(res, 'Escrow transaction not found'); return; }

  if (escrow.status !== 'HELD') {
    errors.badRequest(res, 'Escrow must be in HELD state to release');
    return;
  }
  if (escrow.order.status !== 'DISPATCHED' && escrow.order.status !== 'COMPLETED') {
    errors.badRequest(res, 'Order must be dispatched or completed before releasing escrow');
    return;
  }

  // Calculate loan deduction if warehouse receipt is pledged
  let deduction = loanDeduction ? parseFloat(loanDeduction) : 0;
  const receipt = escrow.order.listing?.lot?.warehouseReceipt;
  if (receipt?.isPledged && receipt.pledgeAmount && !loanDeduction) {
    deduction = parseFloat(receipt.pledgeAmount.toString());
  }

  const netToSeller = parseFloat(escrow.amount.toString()) - deduction;
  if (netToSeller < 0) {
    errors.badRequest(res, 'Loan deduction exceeds escrow amount');
    return;
  }

  const updated = await prisma.escrowTransaction.update({
    where: { id },
    data: {
      sellerReleasedAt: new Date(),
      loanDeduction: deduction,
      netToSeller,
      status: 'RELEASED',
    },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'ESCROW_RELEASED',
    entityType: 'EscrowTransaction',
    entityId: id,
    newValues: { netToSeller, loanDeduction: deduction, status: 'RELEASED' },
  });

  sendSuccess(res, updated);
}));

// ── POST /escrow/:id/refund — Refund buyer (order cancelled/disputed) ──
router.post('/:id/refund', authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const { reason } = req.body;

  const escrow = await prisma.escrowTransaction.findUnique({ where: { id } });
  if (!escrow) { errors.notFound(res, 'Escrow transaction not found'); return; }

  if (escrow.status !== 'HELD') {
    errors.badRequest(res, 'Only held escrow transactions can be refunded');
    return;
  }

  const updated = await prisma.escrowTransaction.update({
    where: { id },
    data: { status: 'REFUNDED' },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'ESCROW_REFUNDED',
    entityType: 'EscrowTransaction',
    entityId: id,
    newValues: { status: 'REFUNDED', reason },
  });

  sendSuccess(res, updated);
}));

// ── POST /escrow/:id/dispute — Flag escrow for dispute ──
router.post('/:id/dispute', authorize(UserRole.BUYER, UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const id = paramString(req.params.id);
  const { reason } = req.body;

  if (!reason) { errors.badRequest(res, 'Dispute reason is required'); return; }

  const escrow = await prisma.escrowTransaction.findUnique({
    where: { id },
    include: {
      order: {
        select: {
          buyerId: true,
          listing: { select: { sellerId: true } },
        },
      },
    },
  });
  if (!escrow) { errors.notFound(res, 'Escrow transaction not found'); return; }

  // Only buyer or seller can dispute
  const isBuyer = req.user!.userId === escrow.order.buyerId;
  const isSeller = req.user!.userId === escrow.order.listing.sellerId;
  if (!isBuyer && !isSeller) {
    errors.forbidden(res, 'Only the buyer or seller can dispute this transaction');
    return;
  }

  if (escrow.status !== 'HELD') {
    errors.badRequest(res, 'Only held escrow transactions can be disputed');
    return;
  }

  const updated = await prisma.escrowTransaction.update({
    where: { id },
    data: { status: 'DISPUTED' },
  });

  await createAuditLog({
    userId: req.user!.userId,
    userRole: req.user!.role as UserRole,
    action: 'ESCROW_DISPUTED',
    entityType: 'EscrowTransaction',
    entityId: id,
    newValues: { status: 'DISPUTED', reason, disputedBy: isBuyer ? 'BUYER' : 'SELLER' },
  });

  sendSuccess(res, updated);
}));

export default router;
