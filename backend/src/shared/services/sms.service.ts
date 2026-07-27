/**
 * SMS Service — MSG91 OTP Integration
 *
 * Handles OTP sending and verification via MSG91.
 * In development mode, OTPs are logged to console instead of sent.
 *
 * MSG91 Flow:
 *   1. Send OTP → MSG91 sends SMS to phone
 *   2. Verify OTP → validate against stored hash
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { isDev } from '../../config/env';
import { AppError } from '../../shared/middleware/error-handler';
import { OtpPurpose } from '@prisma/client';

// ── Configuration ──
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY || '';
const MSG91_TEMPLATE_ID = process.env.MSG91_TEMPLATE_ID || '';
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID || 'SHTKSH';
const MSG91_APPROVAL_TEMPLATE_ID = process.env.MSG91_APPROVAL_TEMPLATE_ID || '';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const MAX_OTPS_PER_HOUR = 5;
const OTP_COOLDOWN_SECONDS = 30;

/**
 * Generate a random numeric OTP
 */
function generateOTP(): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < OTP_LENGTH; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}

/**
 * Send OTP via MSG91 HTTP API
 */
async function sendViaMSG91(phone: string, otp: string): Promise<boolean> {
  try {
    const payload = {
      template_id: MSG91_TEMPLATE_ID,
      short_url: '0',
      realTimeResponse: '1',
      recipients: [
        {
          mobiles: `91${phone}`,
          otp,
        },
      ],
    };

    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json() as { type?: string };
    console.log(`[SMS] MSG91 response for ${phone}:`, data);

    return data.type === 'success' || response.ok;
  } catch (error) {
    console.error('[SMS] MSG91 send error:', error);
    return false;
  }
}

/**
 * Notify an approved cold-storage owner. This deliberately does not include a
 * password: owners sign in with the credentials they selected at registration.
 * Configure MSG91_APPROVAL_TEMPLATE_ID with a DLT-approved Flow template in
 * production; development logs the delivery instead.
 */
export async function sendOwnerApprovalNotification(phone: string, fullName: string): Promise<void> {
  if (isDev) {
    console.log(`[SMS] Owner approval notification for ${phone}: ${fullName}, your cold-storage application is approved. Sign in with your registered credentials.`);
    return;
  }

  if (!MSG91_AUTH_KEY || !MSG91_APPROVAL_TEMPLATE_ID) {
    console.warn('[SMS] Owner approval SMS not sent: configure MSG91_AUTH_KEY and MSG91_APPROVAL_TEMPLATE_ID.');
    return;
  }

  try {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', authkey: MSG91_AUTH_KEY },
      body: JSON.stringify({
        template_id: MSG91_APPROVAL_TEMPLATE_ID,
        short_url: '0',
        recipients: [{ mobiles: `91${phone}`, name: fullName }],
      }),
    });
    if (!response.ok) console.error(`[SMS] Owner approval SMS failed for ${phone}: ${response.status}`);
  } catch (error) {
    console.error(`[SMS] Owner approval SMS failed for ${phone}:`, error);
  }
}

/**
 * Send an OTP to a phone number
 *
 * Flow:
 * 1. Check rate limits (max 5 per hour, 30s cooldown)
 * 2. Generate 6-digit OTP
 * 3. Hash and store in DB
 * 4. Send via MSG91 (or log in dev)
 */
export async function sendOTP(
  phone: string,
  purpose: OtpPurpose
): Promise<{ message: string; expiresInSeconds: number }> {
  // ── Rate Limiting ──
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOTPs = await prisma.phoneOTP.count({
    where: {
      phone,
      purpose,
      createdAt: { gte: oneHourAgo },
    },
  });

  if (recentOTPs >= MAX_OTPS_PER_HOUR) {
    throw new AppError(429, 'TOO_MANY_OTPS', 'Too many OTP requests. Please try again after an hour.');
  }

  // ── Cooldown Check ──
  const cooldownAgo = new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000);
  const recentOTP = await prisma.phoneOTP.findFirst({
    where: {
      phone,
      purpose,
      createdAt: { gte: cooldownAgo },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (recentOTP) {
    const waitSeconds = Math.ceil(
      (recentOTP.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000
    );
    throw new AppError(429, 'OTP_COOLDOWN', `Please wait ${waitSeconds} seconds before requesting another OTP.`);
  }

  // ── Generate OTP ──
  const otp = generateOTP();
  const otpHash = await bcrypt.hash(otp, 10);

  // ── Store in DB ──
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Invalidate any existing unused OTPs for this phone + purpose
  await prisma.phoneOTP.updateMany({
    where: {
      phone,
      purpose,
      verified: false,
    },
    data: {
      expiresAt: new Date(0), // Expire immediately
    },
  });

  await prisma.phoneOTP.create({
    data: {
      phone,
      otp: otpHash,
      purpose,
      expiresAt,
    },
  });

  // ── Send OTP ──
  // Always log OTP for debugging (visible in Render Logs dashboard)
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`📱 OTP for ${phone} [${purpose}]: ${otp}`);
  console.log(`   Expires in ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`${'═'.repeat(50)}\n`);

  if (!isDev) {
    // Production: also send via MSG91 SMS
    if (MSG91_AUTH_KEY && MSG91_TEMPLATE_ID) {
      const sent = await sendViaMSG91(phone, otp);
      if (!sent) {
        console.warn(`[SMS] MSG91 delivery failed for ${phone}, OTP was logged above`);
      }
    } else {
      console.warn(`[SMS] MSG91 not configured — OTP only available in logs`);
    }
  }

  return {
    message: isDev
      ? `OTP sent (dev mode): ${otp}`
      : `OTP sent to ${phone.slice(0, 3)}****${phone.slice(-3)}`,
    expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
    // Always include OTP in response for demo/testing (remove in real production)
    devOtp: otp,
  };
}

/**
 * Verify an OTP
 *
 * Flow:
 * 1. Find latest unexpired, unverified OTP for phone + purpose
 * 2. Check attempt limit
 * 3. Compare OTP hash
 * 4. Mark as verified on success
 */
export async function verifyOTP(
  phone: string,
  otpInput: string,
  purpose: OtpPurpose
): Promise<boolean> {
  const record = await prisma.phoneOTP.findFirst({
    where: {
      phone,
      purpose,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!record) {
    throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired or was not found. Please request a new one.');
  }

  // ── Attempt Limiting ──
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    throw new AppError(429, 'MAX_ATTEMPTS', 'Too many incorrect attempts. Please request a new OTP.');
  }

  // ── Increment Attempts ──
  await prisma.phoneOTP.update({
    where: { id: record.id },
    data: { attempts: { increment: 1 } },
  });

  // ── Compare ──
  const isValid = await bcrypt.compare(otpInput, record.otp);

  if (!isValid) {
    const remaining = MAX_OTP_ATTEMPTS - record.attempts - 1;
    throw new AppError(400, 'INVALID_OTP', `Invalid OTP. ${remaining} attempt(s) remaining.`);
  }

  // ── Mark Verified ──
  await prisma.phoneOTP.update({
    where: { id: record.id },
    data: { verified: true },
  });

  return true;
}

/**
 * Check if a phone was recently verified for a specific purpose
 * (within the last 15 minutes)
 */
export async function isPhoneRecentlyVerified(
  phone: string,
  purpose: OtpPurpose
): Promise<boolean> {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const record = await prisma.phoneOTP.findFirst({
    where: {
      phone,
      purpose,
      verified: true,
      createdAt: { gte: fifteenMinutesAgo },
    },
  });
  return !!record;
}

/**
 * Clean up expired OTPs (run periodically)
 */
export async function cleanupExpiredOTPs(): Promise<number> {
  const result = await prisma.phoneOTP.deleteMany({
    where: {
      expiresAt: { lt: new Date() },
    },
  });
  return result.count;
}

export const smsService = {
  sendOTP,
  verifyOTP,
  isPhoneRecentlyVerified,
  cleanupExpiredOTPs,
};
