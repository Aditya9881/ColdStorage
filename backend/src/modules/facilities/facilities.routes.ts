import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { validate } from '../../shared/middleware/validate';
import { facilitiesService } from './facilities.service';
import { queryString, paramString } from '../../shared/utils/query-helpers';
import {
  createFacilitySchema,
  updateFacilitySchema,
  verifyFacilitySchema,
  uploadDocumentSchema,
  reviewDocumentSchema,
} from '../../shared/schemas';

const router = Router();

router.use(authenticate);

/**
 * POST /facilities — Register new facility
 */
router.post(
  '/',
  authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate({ body: createFacilitySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const facility = await facilitiesService.createFacility({
      ...req.body,
      ownerId: req.user!.userId,
    });
    sendSuccess(res, facility, 201);
  })
);

/**
 * GET /facilities — List facilities (role-scoped)
 */
router.get(
  '/',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const role = req.user!.role;
    const input: any = {
      status: queryString(req.query.status),
      state: queryString(req.query.state),
      storageType: queryString(req.query.storageType),
      search: queryString(req.query.search),
      page: queryString(req.query.page),
      limit: queryString(req.query.limit),
      sortBy: queryString(req.query.sortBy),
      sortOrder: queryString(req.query.sortOrder),
    };

    if (role === UserRole.OWNER) input.ownerId = req.user!.userId;
    else if (role === UserRole.STAFF && req.user!.facilityId) input.facilityId = req.user!.facilityId;

    const { facilities, meta } = await facilitiesService.listFacilities(input);
    sendSuccess(res, facilities, 200, meta);
  })
);

/**
 * GET /facilities/:id — Facility detail
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const facility = await facilitiesService.getFacilityById(paramString(req.params.id));
    sendSuccess(res, facility);
  })
);

/**
 * PATCH /facilities/:id — Update facility
 */
router.patch(
  '/:id',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.OWNER),
  validate({ body: updateFacilitySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await facilitiesService.updateFacility(
      paramString(req.params.id),
      req.body,
      req.user!.userId,
      req.user!.role,
    );
    sendSuccess(res, updated);
  })
);

/**
 * PATCH /facilities/:id/verify — Admin approves/rejects facility
 */
router.patch(
  '/:id/verify',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate({ body: verifyFacilitySchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const updated = await facilitiesService.verifyFacility(paramString(req.params.id), {
      ...req.body,
      verifiedBy: req.user!.userId,
    });
    sendSuccess(res, updated);
  })
);

/**
 * GET /facilities/:id/stats — Utilization stats
 */
router.get(
  '/:id/stats',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const stats = await facilitiesService.getFacilityStats(paramString(req.params.id));
    sendSuccess(res, stats);
  })
);

/**
 * POST /facilities/:id/documents — Upload compliance doc
 */
router.post(
  '/:id/documents',
  authorize(UserRole.OWNER, UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate({ body: uploadDocumentSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doc = await facilitiesService.uploadDocument(paramString(req.params.id), {
      ...req.body,
      uploadedById: req.user!.userId,
    });
    sendSuccess(res, doc, 201);
  })
);

/**
 * GET /facilities/:id/documents — List compliance docs
 */
router.get(
  '/:id/documents',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const docs = await facilitiesService.listDocuments(paramString(req.params.id));
    sendSuccess(res, docs);
  })
);

/**
 * PATCH /facilities/:fid/documents/:did — Review document
 */
router.patch(
  '/:fid/documents/:did',
  authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  validate({ body: reviewDocumentSchema }),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doc = await facilitiesService.reviewDocument(paramString(req.params.did), {
      ...req.body,
      reviewedById: req.user!.userId,
    });
    sendSuccess(res, doc);
  })
);

export default router;
