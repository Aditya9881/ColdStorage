import { Request, Response } from 'express';
import { authService } from './auth.service';
import { smsService } from '../../shared/services/sms.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AuthenticatedRequest } from '../../shared/types';
import { asyncHandler } from '../../shared/middleware/error-handler';
import { OtpPurpose } from '@prisma/client';

export const authController = {
  /**
   * POST /auth/send-otp
   * Body: { phone: string, purpose?: 'LOGIN' | 'REGISTER' }
   */
  sendOtp: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, purpose } = req.body;
    const otpPurpose = (purpose === 'REGISTER' ? OtpPurpose.REGISTER : OtpPurpose.LOGIN);

    const result = await smsService.sendOTP(phone, otpPurpose);
    sendSuccess(res, result);
  }),

  /**
   * POST /auth/verify-otp
   * Body: { phone: string, otp: string, purpose?: 'LOGIN' | 'REGISTER' }
   *
   * For LOGIN: if user exists and phone is verified, returns tokens
   * For REGISTER: marks phone as verified, returns { phoneVerified: true }
   */
  verifyOtp: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, otp, purpose } = req.body;
    const otpPurpose = (purpose === 'REGISTER' ? OtpPurpose.REGISTER : OtpPurpose.LOGIN);

    // Verify the OTP
    await smsService.verifyOTP(phone, otp, otpPurpose);

    if (otpPurpose === OtpPurpose.LOGIN) {
      // Try to login via OTP (passwordless)
      const result = await authService.loginViaOTP(phone, {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      sendSuccess(res, result);
    } else {
      // Registration: just confirm phone is verified
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
      csRegistrationNumber, fssaiNumber,
    } = req.body;

    const result = await authService.register({
      fullName, phone, email, password, role, facilityId,
      addressLine1, city, state, pincode, district,
      aadhaarNumber, panNumber,
      landHolding, khasraNumber, villageName,
      gstNumber, businessName, businessType,
      csRegistrationNumber, fssaiNumber,
    });

    sendSuccess(res, result, 201);
  }),

  /**
   * POST /auth/login
   * Standard phone + password login (kept for backwards compatibility + dev creds)
   */
  login: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { phone, password } = req.body;

    const deviceInfo = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    };

    const result = await authService.login({ phone, password }, deviceInfo);

    sendSuccess(res, result);
  }),

  /**
   * POST /auth/refresh
   */
  refresh: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens);
  }),

  /**
   * POST /auth/logout
   */
  logout: asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
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
};
