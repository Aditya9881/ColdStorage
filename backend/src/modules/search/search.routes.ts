import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';

const router = Router();

router.use(authenticate);

/**
 * GET /search?q=<query> — Cross-module search
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const q = (req.query.q as string || '').trim();

  if (q.length < 2) {
    sendSuccess(res, { lots: [], depositors: [], invoices: [] });
    return;
  }

  const contains = q;

  // Scope based on role
  const facilityWhere: any = {};
  if (req.user!.role === UserRole.STAFF && req.user!.facilityId) {
    facilityWhere.facilityId = req.user!.facilityId;
  } else if (req.user!.role === UserRole.OWNER) {
    facilityWhere.facility = { ownerId: req.user!.userId };
  }

  const [lots, depositors, invoices] = await Promise.all([
    // Search lots
    prisma.inventoryLot.findMany({
      where: {
        ...facilityWhere,
        OR: [
          { lotNumber: { contains, mode: 'insensitive' } },
          { commodityName: { contains, mode: 'insensitive' } },
          { receiptNumber: { contains, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, lotNumber: true, commodityName: true,
        status: true, currentWeightKg: true,
        depositor: { select: { fullName: true } },
      },
      take: 5,
    }),

    // Search depositors
    prisma.user.findMany({
      where: {
        role: 'FARMER',
        OR: [
          { fullName: { contains, mode: 'insensitive' } },
          { phone: { contains } },
          { registrationNumber: { contains, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, fullName: true, phone: true, status: true,
      },
      take: 5,
    }),

    // Search invoices
    prisma.invoice.findMany({
      where: {
        ...facilityWhere,
        OR: [
          { invoiceNumber: { contains, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true, invoiceNumber: true, totalAmount: true,
        status: true,
        depositor: { select: { fullName: true } },
      },
      take: 5,
    }),
  ]);

  sendSuccess(res, { lots, depositors, invoices });
}));

export default router;
