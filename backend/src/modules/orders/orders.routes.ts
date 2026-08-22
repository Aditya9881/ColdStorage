import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { validate } from '../../shared/middleware/validate';
import { createOrderSchema, approveOrderSchema, rejectOrderSchema, uuidParamSchema } from '../../shared/schemas';
import { idempotent } from '../../shared/middleware/idempotency';
import { orderService } from './order.service';

const router = Router();
router.use(authenticate);

// ── POST /orders — Buyer places order ──
router.post('/', authorize(UserRole.BUYER), validate({ body: createOrderSchema }), idempotent, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { listingId, quantityKg } = req.body;
  const result = await orderService.createOrder(req.user!.userId, listingId, quantityKg);
  res.status(201).json({ success: true, data: result });
}));

// ── GET /orders — List orders (role-filtered) ──
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const result = await orderService.listOrders(req.user!.userId, req.user!.role, {
    status: status as string | undefined,
    page: parseInt(page as string),
    limit: parseInt(limit as string),
  });
  res.json({ success: true, data: result });
}));

// ── GET /orders/:id — Detail ──
router.get('/:id', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.getOrderById(
    paramString(req.params.id),
    req.user!.userId,
    req.user!.role,
  );
  res.json({ success: true, data: result });
}));

// ── POST /orders/:id/approve — Farmer approves with OTP ──
router.post('/:id/approve', authorize(UserRole.FARMER), validate({ body: approveOrderSchema, params: uuidParamSchema }), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.approveOrder(
    paramString(req.params.id),
    req.user!.userId,
    req.body.otp,
  );
  res.json({ success: true, data: result });
}));

// ── POST /orders/:id/reject ──
router.post('/:id/reject', authorize(UserRole.FARMER), validate({ body: rejectOrderSchema, params: uuidParamSchema }), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.rejectOrder(
    paramString(req.params.id),
    req.user!.userId,
    req.body.reason,
  );
  res.json({ success: true, data: result });
}));

// ── POST /orders/:id/regenerate-otp ──
router.post('/:id/regenerate-otp', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.regenerateOTP(
    paramString(req.params.id),
    req.user!.userId,
  );
  res.json({ success: true, data: result });
}));

// ── POST /orders/:id/dispatch — Seller dispatches a paid order ──
router.post('/:id/dispatch', authorize(UserRole.FARMER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.dispatchOrder(
    paramString(req.params.id),
    req.user!.userId,
  );
  res.json({ success: true, data: result });
}));

// ── POST /orders/:id/complete — Buyer confirms delivery ──
router.post('/:id/complete', authorize(UserRole.BUYER), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await orderService.completeOrder(
    paramString(req.params.id),
    req.user!.userId,
  );
  res.json({ success: true, data: result });
}));

export default router;
