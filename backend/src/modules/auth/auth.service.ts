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
  async register(input: RegisterInput): Promise<AuthResult> {
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
    // Owners require admin approval, so they start with PENDING_KYC
    // Farmers/Buyers start with PENDING_KYC (need to upload docs)
    const initialStatus = UserStatus.PENDING_KYC;

    // Create user
    const user = await prisma.user.create({
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
      },
    });

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
        expiresAt,
      },
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
}

export const authService = new AuthService();
