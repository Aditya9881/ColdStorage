import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Zod Validation Middleware Factory
 *
 * Validates request body, query, and/or params against Zod schemas.
 * Returns 400 with structured error details on validation failure.
 *
 * Usage:
 *   router.post('/orders', validate({ body: createOrderSchema }), controller.create);
 */
export function validate(schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: Array<{ field: string; message: string; path: string }> = [];

    if (schemas.body) {
      const result = schemas.body.safeParse(req.body);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            path: 'body',
          });
        }
      } else {
        // Replace req.body with parsed (coerced/transformed) data
        req.body = result.data;
      }
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(req.query);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            path: 'query',
          });
        }
      } else {
        (req as any).query = result.data;
      }
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join('.'),
            message: issue.message,
            path: 'params',
          });
        }
      } else {
        (req as any).params = result.data;
      }
    }

    if (errors.length > 0) {
      res.status(400).json({
        success: false,
        data: null,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: { errors },
        },
      });
      return;
    }

    next();
  };
}
