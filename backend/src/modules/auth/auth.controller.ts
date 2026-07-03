import { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../shared/utils/api-response';
import { AuthenticatedRequest } from '../../shared/types';
import { asyncHandler } from '../../shared/middleware/error-handler';

export const authController = {
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
    } = req.body;

    const result = await authService.register({
      fullName, phone, email, password, role, facilityId,
      addressLine1, city, state, pincode, district,
      aadhaarNumber, panNumber,
      landHolding, khasraNumber, villageName,
      gstNumber, businessName, businessType,
    });

    sendSuccess(res, result, 201);
  }),

  /**
   * POST /auth/login
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
