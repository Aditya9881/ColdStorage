import { Request, Response } from 'express';
import { bookingService } from './booking.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AuthenticatedRequest } from '../../shared/types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { BookingStatus } from '@prisma/client';

export const bookingController = {
  /**
   * POST /bookings — Create a new booking
   */
  create: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const farmerId = req.user!.userId;
    const {
      facilityId, commodityCategory, commodityName,
      estimatedWeightKg, estimatedBags,
      preferredDate, preferredSlot, storageDuration,
      farmerNote,
    } = req.body;

    const booking = await bookingService.createBooking({
      farmerId,
      facilityId,
      commodityCategory,
      commodityName,
      estimatedWeightKg,
      estimatedBags,
      preferredDate,
      preferredSlot,
      storageDuration,
      farmerNote,
    });

    sendSuccess(res, booking, 201);
  }),

  /**
   * GET /bookings/:id — Get booking detail
   */
  getById: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const booking = await bookingService.getBookingById(req.params.id as string, req.user!.userId);
    sendSuccess(res, booking);
  }),

  /**
   * GET /bookings/number/:bookingNumber — Get by booking number
   */
  getByNumber: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const booking = await bookingService.getBookingByNumber(req.params.bookingNumber as string);
    sendSuccess(res, booking);
  }),

  /**
   * GET /bookings/my — List farmer's bookings
   */
  listMine: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const farmerId = req.user!.userId;
    const status = req.query.status as string | undefined;
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const result = await bookingService.listFarmerBookings(
      farmerId,
      status as BookingStatus | undefined,
      Number(page) || 1,
      Number(limit) || 20,
    );
    sendSuccess(res, result);
  }),

  /**
   * GET /bookings/facility/:facilityId — List facility bookings (owner/staff)
   */
  listFacility: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const status = req.query.status as string | undefined;
    const date = req.query.date as string | undefined;
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;
    const result = await bookingService.listFacilityBookings(
      req.params.facilityId as string,
      status as BookingStatus | undefined,
      date,
      Number(page) || 1,
      Number(limit) || 20,
    );
    sendSuccess(res, result);
  }),

  /**
   * PATCH /bookings/:id/status — Update booking status
   */
  updateStatus: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { status, chamberId, actualWeightKg, actualBags, ratePerUnit, totalAmount, advancePaid, ownerNote, cancelReason, dispatchWeightKg, dispatchNote } = req.body;

    const updated = await bookingService.updateBookingStatus({
      bookingId: req.params.id as string,
      status,
      userId: req.user!.userId,
      userRole: req.user!.role,
      chamberId,
      actualWeightKg,
      actualBags,
      ratePerUnit,
      totalAmount,
      advancePaid,
      ownerNote,
      cancelReason,
      dispatchWeightKg,
      dispatchNote,
    });

    sendSuccess(res, updated);
  }),

  /**
   * POST /bookings/verify-qr — Scan QR code at facility
   */
  verifyQR: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { qrPayload } = req.body;
    const scannerId = req.user!.userId;

    const result = await bookingService.verifyQRScan(qrPayload, scannerId);
    sendSuccess(res, result);
  }),
};
