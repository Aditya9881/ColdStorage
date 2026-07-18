import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { validate } from '../../shared/middleware/validate';
import { inventoryService } from './inventory.service';
import { queryString, paramString } from '../../shared/utils/query-helpers';
import {
  intakeLotSchema,
  releaseLotSchema,
  updateQualitySchema,
  transferLotSchema,
} from '../../shared/schemas';
import { idempotent } from '../../shared/middleware/idempotency';

const router = Router();

router.use(authenticate);

/**
 * POST /inventory/intake — Log new commodity intake
 */
router.post(
  '/intake',
  authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate({ body: intakeLotSchema }),
  idempotent,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lot = await inventoryService.intakeLot({
      ...req.body,
      performedById: req.user!.userId,
      performedByRole: req.user!.role,
    });
    sendSuccess(res, lot, 201);
  })
);

/**
 * GET /inventory/lots — List inventory lots (role-scoped)
 */
router.get(
  '/lots',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const role = req.user!.role;
    const input: any = {
      facilityId: queryString(req.query.facilityId),
      chamberId: queryString(req.query.chamberId),
      status: queryString(req.query.status),
      commodityCategory: queryString(req.query.commodityCategory),
      depositorId: queryString(req.query.depositorId),
      search: queryString(req.query.search),
      page: queryString(req.query.page),
      limit: queryString(req.query.limit),
      sortBy: queryString(req.query.sortBy),
      sortOrder: queryString(req.query.sortOrder),
    };

    if (role === UserRole.STAFF && req.user!.facilityId) input.scopeFacilityId = req.user!.facilityId;
    else if (role === UserRole.OWNER) input.scopeOwnerUserId = req.user!.userId;

    const { lots, meta } = await inventoryService.listLots(input);
    sendSuccess(res, lots, 200, meta);
  })
);

/**
 * GET /inventory/my-lots — Farmer's own lots with rent calculation
 */
router.get(
  '/my-lots',
  authorize(UserRole.FARMER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.getFarmerLots(
      req.user!.userId,
      queryString(req.query.status),
      queryString(req.query.page),
      queryString(req.query.limit),
    );
    sendSuccess(res, result);
  })
);

/**
 * GET /inventory/lots/:id — Lot details with transaction history
 */
router.get(
  '/lots/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const lot = await inventoryService.getLotById(paramString(req.params.id));
    sendSuccess(res, lot);
  })
);

/**
 * GET /inventory/lots/:id/transactions — Transaction history
 */
router.get(
  '/lots/:id/transactions',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const transactions = await inventoryService.getLotTransactions(paramString(req.params.id));
    sendSuccess(res, transactions);
  })
);

/**
 * POST /inventory/lots/:id/release — Partial or full release
 */
router.post(
  '/lots/:id/release',
  authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validate({ body: releaseLotSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.releaseLot({
      lotId: paramString(req.params.id),
      ...req.body,
      performedById: req.user!.userId,
      performedByRole: req.user!.role,
    });
    sendSuccess(res, result);
  })
);

/**
 * PATCH /inventory/lots/:id/quality — Update quality assessment
 */
router.patch(
  '/lots/:id/quality',
  authorize(UserRole.STAFF, UserRole.OWNER),
  validate({ body: updateQualitySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await inventoryService.updateQuality({
      lotId: paramString(req.params.id),
      ...req.body,
      performedById: req.user!.userId,
    });
    sendSuccess(res, updated);
  })
);

/**
 * POST /inventory/lots/:id/transfer — Transfer to different chamber
 */
router.post(
  '/lots/:id/transfer',
  authorize(UserRole.STAFF, UserRole.OWNER, UserRole.SUPER_ADMIN),
  validate({ body: transferLotSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const result = await inventoryService.transferLot({
      lotId: paramString(req.params.id),
      ...req.body,
      performedById: req.user!.userId,
    });
    sendSuccess(res, result);
  })
);

/**
 * GET /inventory/lots/:id/receipt — Download intake receipt PDF
 */
router.get(
  '/lots/:id/receipt',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { buffer, receiptNumber } = await inventoryService.getReceiptPdf(paramString(req.params.id));
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${receiptNumber}.pdf"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  })
);

/**
 * GET /inventory/lots/:id/gate-pass/:txnId — Download gate pass PDF
 */
router.get(
  '/lots/:id/gate-pass/:txnId',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { buffer, gatePassNumber } = await inventoryService.getGatePassPdf(
      paramString(req.params.id),
      paramString(req.params.txnId),
    );
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="gate-pass-${gatePassNumber}.pdf"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  })
);

/**
 * GET /inventory/my-lots/:id/health — IoT health for a farmer's lot
 */
router.get(
  '/my-lots/:id/health',
  authorize(UserRole.FARMER),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const health = await inventoryService.getFarmerLotHealth(paramString(req.params.id), req.user!.userId);
    sendSuccess(res, health);
  })
);

export default router;
