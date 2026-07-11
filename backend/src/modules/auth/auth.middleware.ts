import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AuthenticatedRequest, JwtPayload, UserRole } from '../../shared/types';
import { errors } from '../../shared/utils/api-response';

/**
 * Verify JWT access token and attach user payload to request
 */
export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    errors.unauthorized(res, 'Access token is required');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    req.user = payload;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      errors.unauthorized(res, 'Access token has expired');
      return;
    }
    errors.unauthorized(res, 'Invalid access token');
  }
}

/**
 * Role-based authorization guard
 * Usage: authorize(UserRole.ADMIN, UserRole.OWNER)
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      errors.unauthorized(res, 'Authentication required');
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      errors.forbidden(res, 'You do not have permission to perform this action');
      return;
    }

    next();
  };
}

/**
 * Generate access and refresh tokens
 */
export function generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
  });

  return { accessToken, refreshToken };
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
