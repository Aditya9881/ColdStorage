import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { generateTokens, verifyRefreshToken } from './auth.middleware';
import { AppError } from '../../shared/middleware/error-handler';
import { UserRole, UserStatus } from '../../shared/types';
import { createAuditLog } from '../../shared/utils/audit';

interface RegisterInput {
  fullName: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
  facilityId?: string;
}

interface LoginInput {
  phone: string;
  password: string;
}

interface AuthResult {
  user: {
    id: string;
    fullName: string;
    email: string | null;
    phone: string;
    role: UserRole;
    status: UserStatus;
    facilityId: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  /**
   * Register a new user
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

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        phone: input.phone,
        email: input.email || null,
        passwordHash,
        role: input.role,
        status: UserStatus.ACTIVE, // For Phase 1; add OTP verification later
        facilityId: input.facilityId || null,
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
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

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
      newValues: { fullName: user.fullName, role: user.role, phone: user.phone },
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        facilityId: user.facilityId,
      },
      ...tokens,
    };
  }

  /**
   * Login with phone + password
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
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        status: user.status as UserStatus,
        facilityId: user.facilityId,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    // Verify the refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired refresh token');
    }

    // Check if session exists in DB
    const session = await prisma.userSession.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.userSession.delete({ where: { id: session.id } });
      }
      throw new AppError(401, 'SESSION_EXPIRED', 'Session has expired, please login again');
    }

    // Generate new token pair (rotate refresh token)
    const newTokens = generateTokens({
      userId: payload.userId,
      role: session.user.role as UserRole,
      facilityId: session.user.facilityId || undefined,
    });

    // Update session with new refresh token
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

    // Omit password hash
    const { passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

export const authService = new AuthService();
