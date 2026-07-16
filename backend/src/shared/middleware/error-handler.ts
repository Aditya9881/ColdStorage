import { Request, Response, NextFunction } from 'express';
import { logger } from '../../config/logger';
import { errors } from '../utils/api-response';
import { isDev } from '../../config/env';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Record<string, unknown>;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.name = 'AppError';

    // Preserve proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global error handling middleware.
 * Catches all unhandled errors and returns standardized responses.
 */
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Unhandled error', {
    name: err.name,
    message: err.message,
    stack: isDev ? err.stack : undefined,
  });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      data: null,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Prisma-specific errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaErr = err as any;
    if (prismaErr.code === 'P2002') {
      errors.conflict(res, `A record with that ${prismaErr.meta?.target?.[0] || 'value'} already exists`);
      return;
    }
    if (prismaErr.code === 'P2025') {
      errors.notFound(res, 'Record not found');
      return;
    }
    if (prismaErr.code === 'P2003') {
      errors.badRequest(res, `Invalid reference: the related ${prismaErr.meta?.field_name || 'record'} does not exist`);
      return;
    }
    if (prismaErr.code === 'P2000') {
      errors.badRequest(res, `Value too long for field: ${prismaErr.meta?.column_name || 'unknown'}`);
      return;
    }
    if (prismaErr.code === 'P2012') {
      errors.badRequest(res, `Missing required field: ${prismaErr.meta?.column || 'unknown'}`);
      return;
    }
  }

  // Prisma validation errors (wrong data types, etc.)
  if (err.name === 'PrismaClientValidationError') {
    errors.badRequest(res, 'Invalid data provided');
    return;
  }

  // Fallback
  errors.serverError(res, isDev ? err.message : 'An unexpected error occurred');
}

/**
 * Catch async errors in route handlers.
 * Generic so it works with both plain `Request` and `AuthenticatedRequest`.
 */
export function asyncHandler<
  TReq extends Request = Request,
  TRes extends Response = Response,
>(
  fn: (req: TReq, res: TRes, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as TReq, res as TRes, next)).catch(next);
  };
}

