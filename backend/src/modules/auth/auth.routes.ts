import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from './auth.middleware';
import { authRateLimiter } from '../../shared/middleware/rate-limiter';
import { validate } from '../../shared/middleware/validate';
import { loginSchema, registerSchema, refreshTokenSchema, sendOtpSchema, verifyOtpSchema } from '../../shared/schemas';

const router = Router();

// ── OTP Routes (new) ──
router.post('/send-otp', authRateLimiter, validate({ body: sendOtpSchema }), authController.sendOtp);
router.post('/verify-otp', authRateLimiter, validate({ body: verifyOtpSchema }), authController.verifyOtp);

// ── Standard Auth Routes ──
router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', authController.logout);

// ── Protected Routes ──
router.get('/me', authenticate, authController.getProfile);
router.post('/push-token', authenticate, authController.savePushToken);

export default router;
