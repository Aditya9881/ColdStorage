import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { validate } from '../../shared/middleware/validate';
import { createReviewSchema, uuidParamSchema } from '../../shared/schemas';

const router = Router();
router.use(authenticate);

// ── POST /reviews/:facilityId — Create or update a review ──
router.post('/:facilityId', authorize(UserRole.FARMER, UserRole.BUYER), validate({ body: createReviewSchema }), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = paramString(req.params.facilityId);
  const userId = req.user!.userId;
  const { rating, comment } = req.body;

  // Verify facility exists and is active
  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) { errors.notFound(res, 'Facility not found'); return; }
  if (facility.status !== 'ACTIVE') { errors.badRequest(res, 'Can only review active facilities'); return; }

  // Verify the user has actually used this facility (has at least one lot)
  if (req.user!.role === UserRole.FARMER) {
    const hasLots = await prisma.inventoryLot.count({
      where: { depositorId: userId, facilityId },
    });
    if (hasLots === 0) {
      errors.forbidden(res, 'You can only review facilities where you have deposited produce');
      return;
    }
  }

  // Upsert — one review per user per facility
  const review = await prisma.facilityReview.upsert({
    where: { facilityId_userId: { facilityId, userId } },
    create: {
      facilityId,
      userId,
      rating,
      comment: comment || null,
    },
    update: {
      rating,
      comment: comment || null,
    },
    include: {
      user: { select: { id: true, fullName: true } },
    },
  });

  sendSuccess(res, review, 201);
}));

// ── GET /reviews/:facilityId — List reviews for a facility ──
router.get('/:facilityId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = paramString(req.params.facilityId);
  const { page = '1', limit = '20', sortBy = 'newest' } = req.query;

  const facility = await prisma.facility.findUnique({ where: { id: facilityId } });
  if (!facility) { errors.notFound(res, 'Facility not found'); return; }

  const pageNum = Math.max(1, parseInt(page as string));
  const pageSize = Math.min(50, parseInt(limit as string));

  const orderBy: any = sortBy === 'rating_high' ? { rating: 'desc' as const }
    : sortBy === 'rating_low' ? { rating: 'asc' as const }
    : { createdAt: 'desc' as const };

  const [reviews, total, aggregation] = await Promise.all([
    prisma.facilityReview.findMany({
      where: { facilityId },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
      orderBy,
      skip: (pageNum - 1) * pageSize,
      take: pageSize,
    }),
    prisma.facilityReview.count({ where: { facilityId } }),
    prisma.facilityReview.aggregate({
      where: { facilityId },
      _avg: { rating: true },
      _count: { rating: true },
      _min: { rating: true },
      _max: { rating: true },
    }),
  ]);

  // Calculate rating distribution
  const distribution = await prisma.facilityReview.groupBy({
    by: ['rating'],
    where: { facilityId },
    _count: { rating: true },
  });

  const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach(d => {
    ratingDistribution[d.rating] = d._count.rating;
  });

  sendSuccess(res, {
    reviews,
    summary: {
      averageRating: aggregation._avg.rating ? parseFloat(aggregation._avg.rating.toFixed(1)) : null,
      totalReviews: aggregation._count.rating,
      minRating: aggregation._min.rating,
      maxRating: aggregation._max.rating,
      distribution: ratingDistribution,
    },
    pagination: { page: pageNum, limit: pageSize, total, totalPages: Math.ceil(total / pageSize) },
  });
}));

// ── GET /reviews/:facilityId/summary — Quick summary (average + count) ──
router.get('/:facilityId/summary', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = paramString(req.params.facilityId);

  const aggregation = await prisma.facilityReview.aggregate({
    where: { facilityId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  sendSuccess(res, {
    facilityId,
    averageRating: aggregation._avg.rating ? parseFloat(aggregation._avg.rating.toFixed(1)) : null,
    totalReviews: aggregation._count.rating,
  });
}));

// ── GET /reviews/:facilityId/my-review — Current user's review ──
router.get('/:facilityId/my-review', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = paramString(req.params.facilityId);
  const userId = req.user!.userId;

  const review = await prisma.facilityReview.findUnique({
    where: { facilityId_userId: { facilityId, userId } },
  });

  sendSuccess(res, review);
}));

// ── DELETE /reviews/:facilityId — Delete own review ──
router.delete('/:facilityId', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const facilityId = paramString(req.params.facilityId);
  const userId = req.user!.userId;

  const review = await prisma.facilityReview.findUnique({
    where: { facilityId_userId: { facilityId, userId } },
  });
  if (!review) { errors.notFound(res, 'Review not found'); return; }

  // Admins can delete any review, users can only delete their own
  if (req.user!.role !== UserRole.ADMIN && req.user!.role !== UserRole.SUPER_ADMIN && review.userId !== userId) {
    errors.forbidden(res, 'You can only delete your own reviews');
    return;
  }

  await prisma.facilityReview.delete({
    where: { facilityId_userId: { facilityId, userId } },
  });

  sendSuccess(res, { message: 'Review deleted successfully' });
}));

export default router;
