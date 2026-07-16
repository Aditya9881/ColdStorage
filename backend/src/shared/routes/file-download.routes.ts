/**
 * Secure File Download — ColdStorage Backend
 *
 * Serves uploaded KYC documents behind authentication + authorization.
 * Replaces public static file serving to protect sensitive PII (Aadhaar, PAN).
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../../modules/auth/auth.middleware';
import { asyncHandler } from '../middleware/error-handler';
import { errors } from '../utils/api-response';
import { AuthenticatedRequest, UserRole } from '../types';
import { prisma } from '../../config/database';
import { UPLOAD_DIR } from '../middleware/upload';

const router = Router();

/**
 * GET /files/kyc/:filename
 *
 * Authorization rules:
 * - Admin/SuperAdmin: can access any document
 * - User: can only access their own documents
 */
router.get(
  '/kyc/:filename',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const filename = req.params.filename as string;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Prevent path traversal
    const safeFilename = path.basename(filename);
    if (safeFilename !== filename || filename.includes('..')) {
      return errors.badRequest(res, 'Invalid filename');
    }

    const filePath = path.join(UPLOAD_DIR, 'kyc', safeFilename);

    // Check file exists on disk
    if (!fs.existsSync(filePath)) {
      return errors.notFound(res, 'File not found');
    }

    // Admins can access any document
    const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

    if (!isAdmin) {
      // Non-admin: verify the file belongs to this user
      const fileUrl = `/uploads/kyc/${safeFilename}`;
      const doc = await prisma.userDocument.findFirst({
        where: {
          fileUrl,
          userId,
        },
        select: { id: true },
      });

      if (!doc) {
        return errors.forbidden(res, 'You do not have access to this file');
      }
    }

    // Determine content type from extension
    const ext = path.extname(safeFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300'); // 5 min private cache
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(filePath);
  })
);

export default router;
