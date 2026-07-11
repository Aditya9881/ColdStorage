/**
 * KYC Routes — Document upload, my-documents, admin review
 *
 * Endpoints:
 *   POST   /kyc/upload           — Upload a KYC document (multipart)
 *   GET    /kyc/my-documents     — User views their own documents & status
 *   DELETE /kyc/clear-rejected   — Clear rejected docs before re-upload
 *   GET    /kyc/pending          — Admin: list users with pending KYC
 *   GET    /kyc/review/:userId   — Admin: view user's KYC details
 *   POST   /kyc/review/:userId   — Admin: approve/reject KYC
 */
import { Router } from 'express';
import { authenticate, authorize } from '../auth/auth.middleware';
import { sendSuccess } from '../../shared/utils/api-response';
import { errors } from '../../shared/utils/api-response';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { AuthenticatedRequest, UserRole } from '../../shared/types';
import { paramString } from '../../shared/utils/query-helpers';
import { uploadKycDocument, getFileUrl } from '../../shared/middleware/upload';
import { kycService } from './kyc.service';

const router = Router();

// All KYC routes require authentication
router.use(authenticate);

// ── User Routes ──

/**
 * POST /kyc/upload — Upload a KYC document
 * Body (multipart/form-data):
 *   - document: File (JPEG/PNG/WebP/PDF, max 5MB)
 *   - documentType: UserDocType enum value
 *   - documentNumber: optional (Aadhaar/PAN/GST number)
 */
router.post(
  '/upload',
  (req, res, next) => {
    uploadKycDocument(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          data: null,
          error: { code: 'UPLOAD_ERROR', message: err.message },
        });
      }
      next();
    });
  },
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const file = req.file;
    if (!file) {
      return errors.badRequest(res, 'No file uploaded');
    }

    const { documentType, documentNumber } = req.body;
    if (!documentType) {
      return errors.badRequest(res, 'documentType is required');
    }

    const doc = await kycService.uploadDocument({
      userId: req.user!.userId,
      documentType,
      documentNumber,
      filename: file.filename,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
    });

    sendSuccess(res, doc, 201);
  })
);

/**
 * GET /kyc/my-documents — User views their own KYC documents
 */
router.get(
  '/my-documents',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const docs = await kycService.getMyDocuments(req.user!.userId);
    sendSuccess(res, docs);
  })
);

/**
 * DELETE /kyc/clear-rejected — Clear rejected docs before re-upload
 */
router.delete(
  '/clear-rejected',
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    await kycService.clearRejectedDocuments(req.user!.userId);
    sendSuccess(res, { message: 'Rejected documents cleared' });
  })
);

// ── Admin Routes ──

/**
 * GET /kyc/pending — Admin gets list of users with pending KYC
 */
router.get(
  '/pending',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await kycService.getPendingKycUsers(page, limit);
    sendSuccess(res, result);
  })
);

/**
 * GET /kyc/review/:userId — Admin views a specific user's KYC details
 */
router.get(
  '/review/:userId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const user = await kycService.getUserKycDetails(paramString(req.params.userId));
    sendSuccess(res, user);
  })
);

/**
 * POST /kyc/review/:userId — Admin approves or rejects KYC
 * Body: { approved: boolean, rejectionReason?: string }
 */
router.post(
  '/review/:userId',
  authorize(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { approved, rejectionReason } = req.body;

    if (typeof approved !== 'boolean') {
      return errors.badRequest(res, '"approved" must be a boolean');
    }

    if (!approved && !rejectionReason) {
      return errors.badRequest(res, 'rejectionReason is required when rejecting');
    }

    const result = await kycService.reviewKyc({
      adminId: req.user!.userId,
      userId: paramString(req.params.userId),
      approved,
      rejectionReason,
    });

    sendSuccess(res, result);
  })
);

export default router;
