import { Request, Response } from 'express';
import { authService } from './auth.service';
import { smsService } from '../../shared/services/sms.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AuthenticatedRequest } from '../../shared/types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { OtpPurpose } from '@prisma/client';
import { setAuthCookies, clearAuthCookies, REFRESH_TOKEN_COOKIE } from './auth.cookies';
import { env } from '../../config/env';

/**
 * Helper: send auth result with tokens as httpOnly cookies AND in body.
 * 
 * Web clients use the cookies (httpOnly, secure).
 * Mobile clients use the tokens from the response body (Bearer header).
 * Both are set so the same endpoint works for both platforms.
 */
function sendAuthResult(res: Response, result: { user: any; accessToken: string; refreshToken: string }): void {
  setAuthCookies(res, result.accessToken, result.refreshToken, env.JWT_ACCESS_EXPIRY, env.JWT_REFRESH_EXPIRY);
  // Return tokens in body too for mobile backward compatibility
  sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}

export const authController = {
  /**
   * POST /auth/send-otp
   * Body: { phone: string, purpose?: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' }
   */
  sendOtp: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, purpose } = req.body;
    const purposeMap: Record<string, OtpPurpose> = {
      LOGIN: OtpPurpose.LOGIN,
      REGISTER: OtpPurpose.REGISTER,
      RESET_PASSWORD: OtpPurpose.RESET_PASSWORD,
    };
    const otpPurpose = purposeMap[purpose] || OtpPurpose.LOGIN;

    const result = await smsService.sendOTP(phone, otpPurpose);
    sendSuccess(res, result);
  }),

  /**
   * POST /auth/verify-otp
   * Body: { phone: string, otp: string, purpose?: 'LOGIN' | 'REGISTER' | 'RESET_PASSWORD' }
   *
   * For LOGIN: if user exists and phone is verified, returns tokens (in cookies)
   * For REGISTER: marks phone as verified, returns { phoneVerified: true }
   * For RESET_PASSWORD: marks phone as verified, returns { phoneVerified: true }
   */
  verifyOtp: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, otp, purpose } = req.body;
    const purposeMap: Record<string, OtpPurpose> = {
      LOGIN: OtpPurpose.LOGIN,
      REGISTER: OtpPurpose.REGISTER,
      RESET_PASSWORD: OtpPurpose.RESET_PASSWORD,
    };
    const otpPurpose = purposeMap[purpose] || OtpPurpose.LOGIN;

    // Verify the OTP
    await smsService.verifyOTP(phone, otp, otpPurpose);

    if (otpPurpose === OtpPurpose.LOGIN) {
      // Try to login via OTP (passwordless)
      const result = await authService.loginViaOTP(phone, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      sendAuthResult(res, result as any);
    } else {
      // Registration or Reset: just confirm phone is verified
      sendSuccess(res, { phoneVerified: true, phone });
    }
  }),

  /**
   * POST /auth/register
   */
  register: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      fullName, phone, email, password, role, facilityId,
      addressLine1, city, state, pincode, district,
      aadhaarNumber, panNumber,
      landHolding, khasraNumber, villageName,
      gstNumber, businessName, businessType,
      csRegistrationNumber, fssaiNumber, companyRegistrationNumber,
      facilityCapacityMt, facilityStorageType,
    } = req.body;

    const files = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const registrationDocuments = [
      ['aadhaarFront', 'AADHAAR_FRONT', aadhaarNumber],
      ['aadhaarBack', 'AADHAAR_BACK', aadhaarNumber],
      ['panCard', 'PAN_CARD', panNumber],
    ].flatMap(([field, documentType, documentNumber]) => {
      const file = files[field]?.[0];
      return file ? [{ file, documentType: documentType as 'AADHAAR_FRONT' | 'AADHAAR_BACK' | 'PAN_CARD', documentNumber: documentNumber || undefined }] : [];
    });

    const result = await authService.register({
      fullName, phone, email, password, role, facilityId,
      addressLine1, city, state, pincode, district,
      aadhaarNumber, panNumber,
      landHolding, khasraNumber, villageName,
      gstNumber, businessName, businessType,
      csRegistrationNumber, fssaiNumber, companyRegistrationNumber,
      facilityCapacityMt: facilityCapacityMt ? Number(facilityCapacityMt) : undefined,
      facilityStorageType,
      registrationDocuments,
    });

    // Owner registration returns { pending: true } with no tokens
    if ('pending' in result) {
      sendSuccess(res, result, 201);
    } else {
      // Non-owner gets tokens immediately — set cookies AND return in body for mobile
      const authResult = result as any;
      setAuthCookies(res, authResult.accessToken, authResult.refreshToken, env.JWT_ACCESS_EXPIRY, env.JWT_REFRESH_EXPIRY);
      sendSuccess(res, {
        user: authResult.user,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      }, 201);
    }
  }),

  /**
   * POST /auth/login
   * Standard phone + password login
   */
  login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, password } = req.body;

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await authService.login({ phone, password }, deviceInfo);

    sendAuthResult(res, result);
  }),

  /**
   * POST /auth/refresh
   * Reads refresh token from cookie (or body for mobile backward compat)
   */
  refresh: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Prefer cookie, fallback to body (for mobile app)
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body.refreshToken;
    if (!refreshToken) {
      sendSuccess(res, { error: 'No refresh token provided' });
      return;
    }
    const tokens = await authService.refresh(refreshToken);
    setAuthCookies(res, tokens.accessToken, tokens.refreshToken, env.JWT_ACCESS_EXPIRY, env.JWT_REFRESH_EXPIRY);
    // Return tokens in body too for mobile backward compatibility
    sendSuccess(res, tokens);
  }),

  /**
   * POST /auth/logout
   */
  logout: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] || req.body.refreshToken;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearAuthCookies(res);
    sendSuccess(res, { message: 'Logged out successfully' });
  }),

  /**
   * GET /auth/me
   */
  getProfile: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const profile = await authService.getProfile(userId);
    sendSuccess(res, profile);
  }),

  /**
   * POST /auth/push-token
   */
  savePushToken: asyncHandler(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const userId = req.user!.userId;
    const { token } = req.body;
    await authService.savePushToken(userId, token);
    sendSuccess(res, { message: 'Push token saved' });
  }),

  /**
   * POST /auth/reset-password
   * Body: { phone: string, otp: string, newPassword: string }
   */
  resetPassword: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, newPassword } = req.body;
    const result = await authService.resetPassword(phone, newPassword);
    sendSuccess(res, result);
  }),
};
