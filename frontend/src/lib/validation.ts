/**
 * Frontend Validation Schemas
 *
 * Mirrors the backend Zod schemas to provide instant client-side feedback
 * before requests hit the server. Keeps error messages user-friendly.
 *
 * Usage:
 *   import { loginSchema, validateForm } from '@/lib/validation';
 *   const { success, errors } = validateForm(loginSchema, formData);
 */

import { z } from 'zod';

// ── Shared Field Schemas ─────────────────────────────

const indianPhone = z
  .string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number too long')
  .regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number');

const password = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password is too long');

const pincode = z
  .string()
  .length(6, 'Pincode must be exactly 6 digits')
  .regex(/^[0-9]{6}$/, 'Invalid pincode');

const commodityCategories = [
  'POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY',
  'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER',
] as const;

// ── Auth Schemas ─────────────────────────────────────

export const loginSchema = z.object({
  phone: indianPhone,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: indianPhone,
  password: password,
  role: z.enum(['FARMER', 'BUYER', 'OWNER', 'STAFF']),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  addressLine1: z.string().min(2, 'Address is required').max(255),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  pincode: pincode,
  aadhaarNumber: z
    .string()
    .length(12, 'Aadhaar must be exactly 12 digits')
    .regex(/^[0-9]{12}$/, 'Invalid Aadhaar')
    .optional()
    .or(z.literal('')),
});

// ── Inventory Intake Schema ──────────────────────────

export const intakeSchema = z.object({
  chamberId: z.string().min(1, 'Please select a chamber'),
  depositorId: z.string().min(1, 'Please select a depositor'),
  commodityCategory: z.enum(commodityCategories, {
    message: 'Please select a commodity category',
  }),
  commodityName: z.string().min(2, 'Commodity name is required').max(100),
  intakeWeightKg: z.coerce
    .number({ message: 'Weight must be a number' })
    .positive('Weight must be positive')
    .max(100000, 'Weight cannot exceed 100,000 kg'),
  bagCount: z.coerce
    .number()
    .int('Must be a whole number')
    .positive('Bag count must be positive')
    .optional()
    .or(z.literal('')),
  qualityGrade: z.string().optional(),
  qualityNotes: z.string().max(500).optional(),
  moistureContent: z.coerce.number().min(0).max(100).optional().or(z.literal('')),
  expectedRelease: z.string().optional(),
});

// ── Invoice Schema ───────────────────────────────────

export const invoiceSchema = z.object({
  depositorId: z.string().min(1, 'Please select a depositor'),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().max(500).optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().min(1, 'Description is required'),
        quantity: z.coerce.number().positive('Quantity must be positive'),
        rate: z.coerce.number().positive('Rate must be positive'),
        unit: z.string().optional(),
      }),
    )
    .min(1, 'At least one line item is required'),
});

// ── Booking Schema ───────────────────────────────────

export const bookingSchema = z.object({
  facilityId: z.string().min(1, 'Please select a facility'),
  commodityCategory: z.enum(commodityCategories, {
    message: 'Please select a commodity category',
  }),
  commodityName: z.string().min(2, 'Commodity name is required').max(100),
  estimatedWeightKg: z.coerce
    .number({ message: 'Weight must be a number' })
    .positive('Weight must be positive')
    .max(100000, 'Weight cannot exceed 100,000 kg'),
  estimatedBags: z.coerce.number().int().positive().optional().or(z.literal('')),
  preferredDate: z.string().min(1, 'Preferred date is required'),
  preferredSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  storageDuration: z.coerce.number().int().positive().max(365).optional().or(z.literal('')),
  farmerNote: z.string().max(500).optional(),
});

// ── Settings Schema ──────────────────────────────────

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: password,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: pincode.optional().or(z.literal('')),
});

// ── Validation Utility ───────────────────────────────

export type ValidationErrors = Record<string, string>;

/**
 * Validate a form data object against a Zod schema.
 * Returns `{ success: true }` or `{ success: false, errors }`.
 *
 * @example
 *   const result = validateForm(loginSchema, { phone: '9876543210', password: 'x' });
 *   if (!result.success) {
 *     setFieldErrors(result.errors);
 *   }
 */
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: ValidationErrors } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: ValidationErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) {
      errors[key] = issue.message;
    }
  }

  return { success: false, errors };
}

/**
 * Get the error message for a specific field.
 * Returns empty string if no error (safe for conditional rendering).
 */
export function getFieldError(errors: ValidationErrors | null, field: string): string {
  return errors?.[field] ?? '';
}
