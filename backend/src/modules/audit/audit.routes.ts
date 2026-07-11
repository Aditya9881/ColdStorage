import { Router } from 'express';
import { prisma } from '../../config/database';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { parsePagination, buildPaginationMeta } from '../../shared/utils/pagination';

const router = Router();

router.use(authenticate);
router.use(authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN));

/**
 * GET /audit/logs — Paginated audit logs with filters
 */
router.get('/logs', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { page, limit, skip, take } = parsePagination(req.query);
  const action = req.query.action as string | undefined;
  const entityType = req.query.entityType as string | undefined;
  const userId = req.query.userId as string | undefined;

  const where: any = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (userId) where.userId = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, fullName: true, role: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  sendSuccess(res, logs, 200, buildPaginationMeta(page, limit, total));
}));

export default router;
