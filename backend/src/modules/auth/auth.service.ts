import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { generateTokens, verifyRefreshToken } from './auth.middleware';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole, UserStatus } from '../../shared/types';
import { createAuditLog } from '../../shared/utils/audit';
import { generateUserUniqueId } from '../../shared/utils/id-generator';
import { isPhoneRecentlyVerified } from '../../shared/services/sms.service';
import { OtpPurpose } from '@prisma/client';
import { getFileUrl } from '../../shared/middleware/upload';

interface RegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  facilityId?: string;
  // Address
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  district?: string;
  // KYC
  aadhaarNumber?: string;
  panNumber?: string;
  // Farmer-specific
  landHolding?: string;
  khasraNumber?: string;
  villageName?: string;
  // Buyer-specific
  gstNumber?: string;
  businessName?: string;
  businessType?: string;
  // Owner-specific
  csRegistrationNumber?: string;
  fssaiNumber?: string;
  companyRegistrationNumber?: string;
  facilityCapacityMt?: number;
  facilityStorageType?: 'BAG' | 'BULK' | 'HYBRID';
  registrationDocuments?: Array<{
    file: Express.Multer.File;
    documentType: 'AADHAAR_FRONT' | 'AADHAAR_BACK' | 'PAN_CARD';
    documentNumber?: string;
  }>;
}

interface LoginInput {
  phone: string;
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    uniqueId: string | null;
    fullName: string;
    email: string | null;
    phone: string;
    role: UserRole;
    status: UserStatus;
    facilityId: string | null;
    kycVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

interface PendingRegistrationResult {
  pending: true;
  message: string;
  userId: string;
}

function formatUserResult(user: any): AuthResult['user'] {
  return {
    id: user.id,
    uniqueId: user.uniqueId,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role as UserRole,
    status: user.status as UserStatus,
    facilityId: user.facilityId,
    kycVerified: user.kycVerified ?? false,
  };
}

export class AuthService {
  /**
   * Register a new user
   *
   * Flow:
   * 1. Check phone uniqueness
   * 2. Verify phone was OTP-verified (check recent verification)
   * 3. Hash password
   * 4. Generate unique ID (FR-UP-00142)
   * 5. Create user with status PENDING_KYC
   * 6. Return tokens
   */
  async register(input: RegisterInput): Promise<AuthResult | PendingRegistrationResult> {
    // Check if phone already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (existingUser) {
      throw new AppError(409, 'CONFLICT', 'A user with this phone number already exists');
    }

    // Check email uniqueness if provided
    if (input.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingEmail) {
        throw new AppError(409, 'CONFLICT', 'A user with this email already exists');
      }
    }

    // Check if phone was recently OTP-verified
    const phoneVerified = await isPhoneRecentlyVerified(input.phone, OtpPurpose.REGISTER);

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    // Generate unique ID
    const uniqueId = await generateUserUniqueId(input.role, input.state);

    // Determine initial status
    // Owners: KYC_SUBMITTED (requires admin approval before login)
    // Farmers/Buyers: PENDING_KYC (need to upload docs after login)
    const isOwner = input.role === UserRole.OWNER;
    const initialStatus = isOwner ? UserStatus.KYC_SUBMITTED : UserStatus.PENDING_KYC;

    // Create user + documents + facility atomically
    const { user, facility } = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          fullName: input.fullName,
          phone: input.phone,
          email: input.email || null,
          passwordHash,
          role: input.role,
          status: initialStatus,
          phoneVerified,
          uniqueId,
          facilityId: input.facilityId || null,
          // Address
          addressLine1: input.addressLine1 || null,
          city: input.city || null,
          state: input.state || null,
          pincode: input.pincode || null,
          district: input.district || null,
          // KYC
          aadhaarNumber: input.aadhaarNumber || null,
          panNumber: input.panNumber || null,
          // Farmer-specific
          landHolding: input.landHolding || null,
          khasraNumber: input.khasraNumber || null,
          villageName: input.villageName || null,
          // Buyer-specific
          gstNumber: input.gstNumber || null,
          businessName: input.businessName || null,
          businessType: input.businessType || null,
          // Owner-specific
          csRegistrationNumber: input.csRegistrationNumber || null,
          fssaiNumber: input.fssaiNumber || null,
          companyRegistrationNumber: input.companyRegistrationNumber || null,
          // Auto-set kycSubmittedAt for owners who submit KYC during registration
          ...(isOwner ? { kycSubmittedAt: new Date() } : {}),
        },
      });

      if (input.registrationDocuments?.length) {
        await tx.userDocument.createMany({
          data: input.registrationDocuments.map(({ file, documentType, documentNumber }) => ({
            userId: user.id,
            documentType,
            documentNumber: documentNumber || null,
            fileUrl: getFileUrl(file.filename),
            mimeType: file.mimetype,
            fileSizeBytes: file.size,
            status: 'PENDING_REVIEW',
          })),
        });
      }

      // An owner registration represents a new cold-storage facility. Create the
      // facility record immediately so it is visible to admins as pending review.
      let facility = null;
      if (isOwner) {
        const registrationInUse = input.csRegistrationNumber
          ? await tx.facility.findUnique({ where: { registrationNumber: input.csRegistrationNumber } })
          : null;

        facility = await tx.facility.create({
          data: {
            name: input.businessName || `${input.fullName} Cold Storage`,
            registrationNumber: registrationInUse ? null : input.csRegistrationNumber || null,
            addressLine1: input.addressLine1 || 'Address pending verification',
            city: input.city || 'Not provided',
            district: input.district || input.city || 'Not provided',
            state: input.state || 'Not provided',
            pincode: input.pincode || '000000',
            totalCapacityMt: input.facilityCapacityMt ?? 0,
            storageType: input.facilityStorageType || 'BAG',
            status: 'PENDING_REVIEW',
            ownerId: user.id,
            contactPhone: input.phone,
            contactEmail: input.email || null,
          },
        });
      }

      return { user, facility };
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      userRole: user.role as UserRole,
      action: 'user.register',
      entityType: 'user',
      entityId: user.id,
      newValues: { fullName: user.fullName, role: user.role, phone: user.phone, uniqueId },
    });

    // For OWNER role: do NOT issue tokens — registration is pending admin approval
    if (isOwner) {
      return {
        pending: true,
        message: 'Registration submitted successfully. Your application is under review by our admin team. You will be notified once approved.',
        userId: user.id,
      };
    }

    // For other roles: issue tokens immediately
    const tokens = generateTokens({
      userId: user.id,
      role: user.role as UserRole,
      facilityId: user.facilityId || undefined,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
      },
    });

    return {
      user: formatUserResult(user),
      ...tokens,
    };
  }

  /**
   * Login with phone + password (standard login, kept for backward compat)
   */
  async login(input: LoginInput, deviceInfo?: Record<string, unknown>): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { phone: input.phone },
    });

    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    // Check status
    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated');
    }
    // Owners are held for manual approval. Farmers and buyers may sign in
    // while their post-registration KYC documents are pending.
    if (user.status === UserStatus.KYC_SUBMITTED) {
      throw new AppError(403, 'KYC_PENDING', 'Your registration is pending admin approval. You will be notified once your account is activated.');
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      throw new AppError(403, 'PENDING_VERIFICATION', 'Your account is pending verification. Please complete your registration.');
    }

    // Verify password
    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid phone number or password');
    }

    return this._createSession(user, deviceInfo);
  }

  /**
   * Login via OTP (passwordless login for existing users)
   * Called after OTP is verified successfully
   */
  async loginViaOTP(
    phone: string,
    deviceInfo?: Record<string, unknown>
  ): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No account found with this phone number. Please register first.');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new AppError(403, 'ACCOUNT_SUSPENDED', 'Your account has been suspended');
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new AppError(403, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated');
    }

    // Mark phone as verified if not already
    if (!user.phoneVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });
    }

    return this._createSession(user, deviceInfo);
  }

  /**
   * Internal: Create session and return auth result
   */
  private async _createSession(
    user: any,
    deviceInfo?: Record<string, unknown>
  ): Promise<AuthResult> {
    await this.ensureOwnerFacility(user);
    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      role: user.role as UserRole,
      facilityId: user.facilityId || undefined,
    });

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        deviceInfo: (deviceInfo as any) ?? undefined,
        expiresAt,
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      userRole: user.role as UserRole,
      action: 'user.login',
      entityType: 'user',
      entityId: user.id,
      metadata: deviceInfo,
    });

    return {
      user: formatUserResult(user),
      ...tokens,
    };
  }

  /**
   * Reconciles owners registered before automatic facility creation was added.
   * It is intentionally run only for ACTIVE owners, so a pending KYC applicant
   * cannot appear as an active facility through a login attempt.
   */
  private async ensureOwnerFacility(user: any): Promise<void> {
    if (user.role !== UserRole.OWNER || user.status !== UserStatus.ACTIVE) return;

    const existing = await prisma.facility.findFirst({
      where: { ownerId: user.id },
      select: { id: true },
    });
    if (existing) return;

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
      },
    });
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }

    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.userSession.delete({ where: { id: session.id } });
      }
      throw new AppError(401, 'SESSION_EXPIRED', 'Session has expired, please login again');
    }

    const newTokens = generateTokens({
      userId: payload.userId,
      role: session.user.role as UserRole,
      facilityId: session.user.facilityId || undefined,
    });

    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    await prisma.userSession.update({
      where: { id: session.id },
      data: {
        refreshToken: newTokens.refreshToken,
        expiresAt: newExpiresAt,
      },
    });

    return newTokens;
  }

  /**
   * Logout — invalidate refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { refreshToken },
    });
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        facility: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError(404, 'NOT_FOUND', 'User not found');
    }

    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Save push notification token for a user
   */
  async savePushToken(userId: string, token: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken: token },
    });
  }

  /**
   * Reset password using OTP verification
   *
   * Flow:
   * 1. Verify phone was recently OTP-verified for RESET_PASSWORD purpose
   * 2. Find user by phone
   * 3. Hash new password
   * 4. Update user password
   * 5. Invalidate all existing sessions (force re-login)
   */
  async resetPassword(phone: string, newPassword: string): Promise<{ message: string }> {
    // Verify OTP was completed for this phone
    const otpVerified = await isPhoneRecentlyVerified(phone, OtpPurpose.RESET_PASSWORD);
    if (!otpVerified) {
      throw new AppError(400, 'OTP_NOT_VERIFIED', 'Please verify your phone number with OTP first');
    }

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'No account found with this phone number');
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, env.BCRYPT_SALT_ROUNDS);

    // Update password and invalidate all sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      // Force logout from all devices
      prisma.userSession.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    // Audit log
    await createAuditLog({
      userId: user.id,
      userRole: user.role as UserRole,
      action: 'user.password_reset',
      entityType: 'user',
      entityId: user.id,
    });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }
}

export const authService = new AuthService();
