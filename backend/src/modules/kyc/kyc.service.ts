/**
 * KYC Service — Document upload, verification, and admin review
 */
import { prisma } from '../../config/database';
import type { UserDocType } from '@prisma/client';
import { getFileUrl } from '../../shared/middleware/upload';
import { sendOwnerApprovalNotification } from '../../shared/services/sms.service';

// ── Types ──

interface UploadDocInput {
  userId: string;
  documentType: UserDocType;
  documentNumber?: string;
  filename: string;
  mimeType: string;
  fileSizeBytes: number;
}

interface ReviewInput {
  reviewerId: string;
  approved: boolean;
  rejectionReason?: string;
}

interface KycReviewInput {
  adminId: string;
  userId: string;
  approved: boolean;
  rejectionReason?: string;
}

// ── Service ──

class KycService {
  /**
   * Upload a KYC document for a user
   */
  async uploadDocument(input: UploadDocInput) {
    const fileUrl = getFileUrl(input.filename);

    const doc = await prisma.userDocument.create({
      data: {
        userId: input.userId,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        fileUrl,
        mimeType: input.mimeType,
        fileSizeBytes: input.fileSizeBytes,
        status: 'PENDING_REVIEW',
      },
    });

    // Update user's kycSubmittedAt
    await prisma.user.update({
      where: { id: input.userId },
      data: { kycSubmittedAt: new Date() },
    });

    return doc;
  }

  /**
   * Get all KYC documents for a user (farmer/buyer sees their own)
   */
  async getMyDocuments(userId: string) {
    return prisma.userDocument.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  /**
   * Get list of users with pending KYC verification (admin view)
   */
  async getPendingKycUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          status: { in: ['PENDING_KYC', 'PENDING_VERIFICATION', 'KYC_SUBMITTED'] },
          kycSubmittedAt: { not: null },
        },
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          aadhaarNumber: true,
          aadhaarVerified: true,
          panNumber: true,
          gstNumber: true,
          kycVerified: true,
          kycSubmittedAt: true,
          kycRejectionReason: true,
          city: true,
          state: true,
          createdAt: true,
          kycDocuments: {
            orderBy: { uploadedAt: 'desc' },
            select: {
              id: true,
              documentType: true,
              documentNumber: true,
              fileUrl: true,
              status: true,
              uploadedAt: true,
            },
          },
        },
        orderBy: { kycSubmittedAt: 'asc' }, // Oldest first
        skip,
        take: limit,
      }),
      prisma.user.count({
        where: {
          status: { in: ['PENDING_KYC', 'PENDING_VERIFICATION', 'KYC_SUBMITTED'] },
          kycSubmittedAt: { not: null },
        },
      }),
    ]);

    return { users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get detailed KYC review info for a specific user (admin view)
   */
  async getUserKycDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        avatarUrl: true,
        addressLine1: true,
        city: true,
        state: true,
        district: true,
        pincode: true,
        aadhaarNumber: true,
        aadhaarVerified: true,
        panNumber: true,
        gstNumber: true,
        businessName: true,
        businessType: true,
        landHolding: true,
        khasraNumber: true,
        villageName: true,
        kycVerified: true,
        kycSubmittedAt: true,
        kycVerifiedAt: true,
        kycRejectionReason: true,
        createdAt: true,
        kycDocuments: {
          orderBy: { uploadedAt: 'desc' },
        },
      },
    });

    if (!user) throw new Error('User not found');
    return user;
  }

  /**
   * Admin approves or rejects KYC for a user
   */
  async reviewKyc(input: KycReviewInput) {
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      include: { kycDocuments: true },
    });

    if (!user) throw new Error('User not found');

    if (input.approved) {
      // Approve all pending documents
      await prisma.userDocument.updateMany({
        where: { userId: input.userId, status: 'PENDING_REVIEW' },
        data: {
          status: 'APPROVED',
          reviewedById: input.adminId,
          reviewedAt: new Date(),
        },
      });

      // Activate user
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          kycVerified: true,
          kycVerifiedAt: new Date(),
          kycVerifiedById: input.adminId,
          kycRejectionReason: null,
          status: 'ACTIVE',
        },
      });

      // Owner registrations create a pending facility during signup. Older
      // registrations did not, so create one when necessary and activate it
      // together with the approved owner account.
      if (user.role === 'OWNER') {
        const ownerFacility = await prisma.facility.findFirst({
          where: { ownerId: user.id },
          select: { id: true },
        });

        if (ownerFacility) {
          await prisma.facility.updateMany({
            where: { ownerId: user.id, status: 'PENDING_REVIEW' },
            data: {
              status: 'ACTIVE',
              verifiedAt: new Date(),
              verifiedBy: input.adminId,
              verificationNotes: 'Activated with owner KYC approval',
            },
          });
        } else {
          const registrationInUse = user.csRegistrationNumber
            ? await prisma.facility.findUnique({ where: { registrationNumber: user.csRegistrationNumber } })
            : null;

          await prisma.facility.create({
            data: {
              name: user.businessName || `${user.fullName} Cold Storage`,
              registrationNumber: registrationInUse ? null : user.csRegistrationNumber || null,
              addressLine1: user.addressLine1 || 'Address pending verification',
              city: user.city || 'Not provided',
              district: user.district || user.city || 'Not provided',
              state: user.state || 'Not provided',
              pincode: user.pincode || '000000',
              totalCapacityMt: 0,
              storageType: 'BAG',
              status: 'ACTIVE',
              ownerId: user.id,
              contactPhone: user.phone,
              contactEmail: user.email || null,
              verifiedAt: new Date(),
              verifiedBy: input.adminId,
              verificationNotes: 'Created from approved owner KYC registration',
            },
          });
        }
      }

      // Send notification
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: 'SYSTEM',
          title: 'KYC Approved ✅',
          message: 'Your identity verification has been approved. You can now use all features.',
        },
      });

      if (user.role === 'OWNER') {
        await sendOwnerApprovalNotification(user.phone, user.fullName);
      }
    } else {
      // Reject all pending documents
      await prisma.userDocument.updateMany({
        where: { userId: input.userId, status: 'PENDING_REVIEW' },
        data: {
          status: 'REJECTED',
          rejectionReason: input.rejectionReason || 'Documents not satisfactory',
          reviewedById: input.adminId,
          reviewedAt: new Date(),
        },
      });

      // Update user with rejection reason (keep PENDING so they can re-submit)
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          kycRejectionReason: input.rejectionReason || 'Documents not satisfactory',
          kycVerified: false,
          kycSubmittedAt: null, // Reset so it doesn't show in pending queue
        },
      });

      // Send notification
      await prisma.notification.create({
        data: {
          userId: input.userId,
          type: 'SYSTEM',
          title: 'KYC Rejected ❌',
          message: `Your identity verification was not approved. Reason: ${input.rejectionReason || 'Documents not satisfactory'}. Please re-upload your documents.`,
        },
      });
    }

    return { success: true };
  }

  /**
   * User re-submits documents after rejection — deletes old rejected docs
   */
  async clearRejectedDocuments(userId: string) {
    await prisma.userDocument.deleteMany({
      where: { userId, status: 'REJECTED' },
    });

    await prisma.user.update({
      where: { id: userId },
      data: { kycRejectionReason: null },
    });
  }

  /**
   * Review a single document (approve/reject individually)
   */
  async reviewDocument(docId: string, input: ReviewInput) {
    return prisma.userDocument.update({
      where: { id: docId },
      data: {
        status: input.approved ? 'APPROVED' : 'REJECTED',
        rejectionReason: input.approved ? null : input.rejectionReason,
        reviewedById: input.reviewerId,
        reviewedAt: new Date(),
      },
    });
  }
}

export const kycService = new KycService();
