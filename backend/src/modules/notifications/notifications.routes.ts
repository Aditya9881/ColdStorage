import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate } from '../auth/auth.middleware';
import { sendSuccess, errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';

const router = Router();

router.use(authenticate);

/**
 * GET /notifications — List notifications for the current user
 */
router.get('/', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const unreadOnly = req.query.unread === 'true';

  const where: any = { userId: req.user!.userId };
  if (unreadOnly) where.read = false;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
  ]);

  sendSuccess(res, notifications, 200, buildPaginationMeta(page, limit, total));
}));

/**
 * GET /notifications/unread-count — Quick unread count for badge
 */
router.get('/unread-count', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user!.userId, read: false },
  });

  sendSuccess(res, { count });
}));

/**
 * PATCH /notifications/:id/read — Mark a single notification as read
 */
router.patch('/:id/read', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notification = await prisma.notification.findFirst({
    where: { id: paramString(req.params.id), userId: req.user!.userId },
  });

  if (!notification) {
    errors.notFound(res, 'Notification not found');
    return;
  }

  const updated = await prisma.notification.update({
    where: { id: paramString(req.params.id) },
    data: { read: true },
  });

  sendSuccess(res, updated);
}));

/**
 * PATCH /notifications/read-all — Mark all notifications as read
 */
router.patch('/read-all', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const result = await prisma.notification.updateMany({
    where: { userId: req.user!.userId, read: false },
    data: { read: true },
  });

  sendSuccess(res, { updated: result.count });
}));

export default router;
