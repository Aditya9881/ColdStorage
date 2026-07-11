import { Response } from 'express';
import { ApiResponse, PaginationMeta, ApiError } from '../types';

/**
 * Send a standardized success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: PaginationMeta
): void {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta,
  };
  res.status(statusCode).json(response);
}

/**
 * Send a standardized error response
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): void {
  const response: ApiResponse = {
    success: false,
    data: null,
    error: { code, message, details },
  };
  res.status(statusCode).json(response);
}

/**
 * Common error responses
 */
export const errors = {
  badRequest: (res: Response, message: string = 'Bad request', details?: Record<string, unknown>) =>
    sendError(res, 400, 'BAD_REQUEST', message, details),

  unauthorized: (res: Response, message: string = 'Unauthorized') =>
    sendError(res, 401, 'UNAUTHORIZED', message),

  forbidden: (res: Response, message: string = 'Forbidden') =>
    sendError(res, 403, 'FORBIDDEN', message),

  notFound: (res: Response, message: string = 'Resource not found') =>
    sendError(res, 404, 'NOT_FOUND', message),

  conflict: (res: Response, message: string = 'Resource already exists') =>
    sendError(res, 409, 'CONFLICT', message),

  validationError: (res: Response, details: Record<string, unknown>) =>
    sendError(res, 422, 'VALIDATION_ERROR', 'Validation failed', details),

  serverError: (res: Response, message: string = 'Internal server error') =>
    sendError(res, 500, 'INTERNAL_ERROR', message),
};
