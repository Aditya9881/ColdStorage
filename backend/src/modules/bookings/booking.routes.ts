import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../shared/middleware/validate';
import { createBookingSchema, updateBookingStatusSchema } from '../../shared/schemas';
import { UserRole, AuthenticatedRequest } from '../../shared/types';
import { prisma } from '../../config/database';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { BookingStatus } from '@prisma/client';
import { idempotent } from '../../shared/middleware/idempotency';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// ── Farmer Routes ──
router.post('/', authorize(UserRole.FARMER), validate({ body: createBookingSchema }), idempotent, bookingController.create);
router.get('/my', authorize(UserRole.FARMER, UserRole.BUYER), bookingController.listMine);

// ── Shared Routes ──
router.get('/number/:bookingNumber', bookingController.getByNumber);

// ── Status Updates (role checked in service) ──
router.patch('/:id/status', validate({ body: updateBookingStatusSchema }), bookingController.updateStatus);

// ── Facility Routes: /facility/mine auto-resolves owner's facility ──
router.get('/facility/mine', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), asyncHandler(async (req: AuthenticatedRequest, res) => {
  let facilityId = req.user!.facilityId;
  if (!facilityId && req.user!.role === 'OWNER') {
    const facility = await prisma.facility.findFirst({ where: { ownerId: req.user!.userId }, select: { id: true } });
    facilityId = facility?.id || undefined;
  }
  if (!facilityId) {
    sendSuccess(res, { bookings: [], total: 0, page: 1, limit: 20, totalPages: 0 });
    return;
  }

  const { bookingService } = await import('./booking.service');
  const status = req.query.status as string | undefined;
  const date = req.query.date as string | undefined;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const result = await bookingService.listFacilityBookings(
    facilityId,
    req.user!.userId,
    req.user!.role,
    req.user!.facilityId,
    status as BookingStatus | undefined,
    date,
    page,
    limit,
  );
  sendSuccess(res, result);
}));

// ── Facility Routes (with explicit facilityId) ──
router.get('/facility/:facilityId', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), bookingController.listFacility);

// ── QR Verification (Owner/Staff) ──
router.post('/verify-qr', authorize(UserRole.OWNER, UserRole.STAFF), bookingController.verifyQR);

// ── Get by ID (must be after all /facility/ and /my routes to avoid catching them) ──
router.get('/:id', bookingController.getById);

export default router;
