import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';
import { authRateLimiter } from '../../shared/middleware/rate-limiter';
import { validate } from '../../shared/middleware/validate';
import { loginSchema, registerSchema, refreshTokenSchema } from '../../shared/schemas';

const router = Router();

// Public routes (with stricter rate limiting + validation)
router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', authController.logout);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.post('/push-token', authenticate, authController.savePushToken);

export default router;
