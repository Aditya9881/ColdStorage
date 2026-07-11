import { Router } from 'express';
import { bookingController } from './booking.controller';
import { authenticate, authorize } from '../auth/auth.middleware';
import { validate } from '../../shared/middleware/validate';
import { createBookingSchema, updateBookingStatusSchema } from '../../shared/schemas';
import { UserRole } from '../../shared/types';

const router = Router();

// All booking routes require authentication
router.use(authenticate);

// ── Farmer Routes ──
router.post('/', authorize(UserRole.FARMER), validate({ body: createBookingSchema }), bookingController.create);
router.get('/my', authorize(UserRole.FARMER, UserRole.BUYER), bookingController.listMine);

// ── Shared Routes ──
router.get('/number/:bookingNumber', bookingController.getByNumber);
router.get('/:id', bookingController.getById);

// ── Status Updates (role checked in service) ──
router.patch('/:id/status', validate({ body: updateBookingStatusSchema }), bookingController.updateStatus);

// ── Facility Routes (Owner/Staff) ──
router.get('/facility/:facilityId', authorize(UserRole.OWNER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN), bookingController.listFacility);

// ── QR Verification (Owner/Staff) ──
router.post('/verify-qr', authorize(UserRole.OWNER, UserRole.STAFF), bookingController.verifyQR);

export default router;
