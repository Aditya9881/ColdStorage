import { z } from 'zod';

// ── Phone validation (Indian mobile numbers) ──
const indianPhone = z.string()
  .min(10, 'Phone number must be at least 10 digits')
  .max(15, 'Phone number must be at most 15 characters')
  .regex(/^[+]?[0-9]{10,15}$/, 'Invalid phone number format');

// ── Auth Schemas ──

export const loginSchema = z.object({
  phone: indianPhone,
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const sendOtpSchema = z.object({
  phone: indianPhone,
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']).optional().default('LOGIN'),
});

export const verifyOtpSchema = z.object({
  phone: indianPhone,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^[0-9]{6}$/, 'OTP must be numeric'),
  purpose: z.enum(['LOGIN', 'REGISTER', 'RESET_PASSWORD']).optional().default('LOGIN'),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(255),
  phone: indianPhone,
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  role: z.enum(['FARMER', 'BUYER', 'OWNER', 'STAFF']),
  email: z.string().email('Invalid email address').optional().nullable(),

  // Mandatory address fields
  addressLine1: z.string().min(2, 'Address is required').max(255),
  city: z.string().min(2, 'City is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  pincode: z.string().length(6, 'Pincode must be exactly 6 digits').regex(/^[0-9]{6}$/, 'Invalid pincode'),
  district: z.string().max(100).optional().nullable(),

  // KYC — Identity (optional at registration, mandatory via document upload)
  aadhaarNumber: z.string().length(12, 'Aadhaar must be exactly 12 digits').regex(/^[0-9]{12}$/, 'Invalid Aadhaar number').optional().nullable(),
  panNumber: z.string().length(10, 'PAN must be exactly 10 characters').regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format (e.g. ABCDE1234F)').optional().nullable(),

  // Farmer-specific
  landHolding: z.string().max(100).optional().nullable(),
  khasraNumber: z.string().max(50).optional().nullable(),
  villageName: z.string().max(100).optional().nullable(),

  // Buyer-specific
  gstNumber: z.string().length(15, 'GST must be 15 characters').regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format').optional().nullable(),
  businessName: z.string().max(255).optional().nullable(),
  businessType: z.string().max(100).optional().nullable(),

  // Owner-specific
  csRegistrationNumber: z.string().max(50).optional().nullable(), // Cold Storage registration number
  fssaiNumber: z.string().max(20).optional().nullable(),          // FSSAI license number
  facilityCapacityMt: z.coerce.number().positive('Facility capacity must be positive').max(1_000_000).optional(),
  facilityStorageType: z.enum(['BAG', 'BULK', 'HYBRID']).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ── Password Reset Schemas ──

export const forgotPasswordSchema = z.object({
  phone: indianPhone,
});

export const resetPasswordSchema = z.object({
  phone: indianPhone,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^[0-9]{6}$/, 'OTP must be numeric'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters').max(128),
});

// ── Facility Schemas ──

export const createFacilitySchema = z.object({
  name: z.string().min(2, 'Facility name is required').max(255),
  registrationNumber: z.string().max(100).optional().nullable(),
  addressLine1: z.string().min(2, 'Address is required').max(255),
  addressLine2: z.string().max(255).optional().nullable(),
  city: z.string().min(2, 'City is required').max(100),
  district: z.string().min(2, 'District is required').max(100),
  state: z.string().min(2, 'State is required').max(100),
  pincode: z.string().length(6, 'Pincode must be exactly 6 digits').regex(/^[0-9]{6}$/),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  totalCapacityMt: z.number().positive('Capacity must be positive').max(1_000_000),
  storageType: z.enum(['BAG', 'BULK', 'HYBRID']).optional(),
  operatingSince: z.string().datetime({ offset: true }).optional().nullable(),
  contactPhone: z.string().max(15).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
});

export const updateFacilitySchema = createFacilitySchema.partial().omit({ totalCapacityMt: true }).extend({
  totalCapacityMt: z.number().positive().max(1_000_000).optional(),
});

export const verifyFacilitySchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DECOMMISSIONED']),
  verificationNotes: z.string().max(1000).optional().nullable(),
});

export const uploadDocumentSchema = z.object({
  documentType: z.enum([
    'FSSAI_REGISTRATION', 'STATE_HORTICULTURE_LICENSE', 'POLLUTION_CONSENT',
    'FIRE_SAFETY_CERTIFICATE', 'WDRA_REGISTRATION', 'GST_CERTIFICATE',
    'BUSINESS_REGISTRATION', 'OTHER',
  ]),
  documentNumber: z.string().max(100).optional().nullable(),
  fileUrl: z.string().url('File URL must be a valid URL').max(512),
  issuedDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
});

export const reviewDocumentSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED']),
  reviewNotes: z.string().max(1000).optional().nullable(),
});

// ── Chamber Schemas ──

export const createChamberSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  chamberNumber: z.string().min(1).max(20),
  name: z.string().max(100).optional().nullable(),
  capacityMt: z.number().positive('Capacity must be positive').max(100_000),
  targetTempMin: z.number().min(-50).max(50).optional().nullable(),
  targetTempMax: z.number().min(-50).max(50).optional().nullable(),
  targetHumidityMin: z.number().min(0).max(100).optional().nullable(),
  targetHumidityMax: z.number().min(0).max(100).optional().nullable(),
  commodityCategory: z.enum([
    'POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY',
    'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER',
  ]).optional().nullable(),
  storageType: z.enum(['BAG', 'BULK', 'HYBRID']).optional(),
});

export const updateChamberSchema = createChamberSchema.partial().omit({ facilityId: true });

// ── Inventory Schemas ──

export const intakeLotSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  chamberId: z.string().uuid('Invalid chamber ID'),
  depositorId: z.string().uuid('Invalid depositor ID'),
  commodityCategory: z.enum([
    'POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY',
    'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER',
  ]),
  commodityName: z.string().min(1, 'Commodity name is required').max(100),
  intakeWeightKg: z.number().positive('Weight must be positive').max(10_000_000),
  bagCount: z.number().int().positive().optional().nullable(),
  qualityGrade: z.enum(['A', 'B', 'C', 'REJECTED']).optional().nullable(),
  qualityNotes: z.string().max(2000).optional().nullable(),
  moistureContent: z.number().min(0).max(100).optional().nullable(),
  expectedRelease: z.string().datetime({ offset: true }).optional().nullable(),
});

export const releaseLotSchema = z.object({
  weightKg: z.number().positive('Release weight must be positive'),
  bagCount: z.number().int().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const updateQualitySchema = z.object({
  qualityGrade: z.enum(['A', 'B', 'C', 'REJECTED']).optional(),
  qualityNotes: z.string().max(2000).optional().nullable(),
  moistureContent: z.number().min(0).max(100).optional().nullable(),
}).refine(data => data.qualityGrade || data.qualityNotes !== undefined || data.moistureContent !== undefined, {
  message: 'At least one quality field must be provided',
});

export const transferLotSchema = z.object({
  targetChamberId: z.string().uuid('Invalid target chamber ID'),
  notes: z.string().max(1000).optional().nullable(),
});

// ── Invoice Schemas ──

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
});

export const createInvoiceSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  depositorId: z.string().uuid('Invalid depositor ID'),
  lotId: z.string().uuid('Invalid lot ID').optional().nullable(),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  taxRate: z.number().min(0).max(1).optional().default(0),
  billingPeriodStart: z.string().optional().nullable(),
  billingPeriodEnd: z.string().optional().nullable(),
  dueDate: z.string().min(1, 'Due date is required'),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']),
  paidAmount: z.number().nonnegative().optional(),
});

// ── Pricing Schemas ──

export const createPricingSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  commodityCategory: z.enum([
    'POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY',
    'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER',
  ]),
  pricingModel: z.enum(['PER_DAY_PER_MT', 'PER_MONTH_PER_MT', 'PER_SEASON', 'FLAT_RATE']),
  rateAmount: z.number().positive('Rate must be positive'),
  effectiveFrom: z.string().min(1, 'Effective from date is required'),
  effectiveUntil: z.string().optional().nullable(),
  maxAllowedRate: z.number().positive().optional().nullable(),
});

export const updatePricingSchema = z.object({
  rateAmount: z.number().positive().optional(),
  effectiveUntil: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'PENDING_APPROVAL', 'REJECTED', 'ARCHIVED']).optional(),
  adminApproved: z.boolean().optional(),
  maxAllowedRate: z.number().positive().optional().nullable(),
});

// ── Temperature / IoT Schemas ──

const singleReadingSchema = z.object({
  chamberId: z.string().uuid('Invalid chamber ID'),
  temperature: z.number().min(-50, 'Temperature too low').max(60, 'Temperature too high'),
  humidity: z.number().min(0).max(100).optional().nullable(),
  sensorId: z.string().max(50).optional().nullable(),
  recordedAt: z.string().optional(),
});

export const temperatureReadingSchema = z.union([
  z.object({
    readings: z.array(singleReadingSchema).min(1).max(500, 'Max 500 readings per batch'),
  }),
  singleReadingSchema,
]);

// ── Order Schemas ──

export const createOrderSchema = z.object({
  listingId: z.string().uuid('Invalid listing ID'),
  quantityKg: z.number().positive('Quantity must be positive').max(1000000, 'Quantity too large'),
});

export const approveOrderSchema = z.object({
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^[0-9]{6}$/, 'OTP must contain only digits'),
});

export const rejectOrderSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required').max(500),
});

// ── Marketplace Listing Schemas ──

export const createListingSchema = z.object({
  lotId: z.string().uuid('Invalid lot ID'),
  askingPricePerKg: z.union([
    z.number().positive('Price must be positive'),
    z.string().transform((val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num <= 0) throw new Error('Price must be a positive number');
      return num;
    }),
  ]),
  minQuantityKg: z.union([
    z.number().positive().optional(),
    z.string().transform((val) => {
      const num = parseFloat(val);
      return isNaN(num) ? undefined : num;
    }).optional(),
  ]).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  expiresAt: z.string().datetime({ offset: true }).optional().nullable(),
});

// ── Facility Discovery Schemas ──

export const discoveryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  state: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  pincode: z.string().length(6).regex(/^[0-9]{6}$/).optional(),
  commodity: z.string().max(50).optional(),
});

// ── Review Schema ──

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating must be at most 5'),
  comment: z.string().max(1000).optional().nullable(),
});

// ── Pagination Schema ──

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.string().max(50).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().max(200).optional(),
});

// ── UUID Param Schema ──

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

// ── Booking Schemas ──

const commodityCategories = ['POTATO', 'ONION', 'VEGETABLES', 'FRUITS', 'DAIRY', 'FROZEN_SEAFOOD', 'FROZEN_MEAT', 'PROCESSED_FOOD', 'SEEDS', 'OTHER'] as const;

export const createBookingSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  commodityCategory: z.enum(commodityCategories),
  commodityName: z.string().min(2, 'Commodity name required').max(100),
  estimatedWeightKg: z.number().positive('Weight must be positive').max(100000),
  estimatedBags: z.number().int().positive().optional(),
  preferredDate: z.string().min(1, 'Date is required'), // ISO date string
  preferredSlot: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
  storageDuration: z.number().int().positive().max(365).optional(),
  farmerNote: z.string().max(500).optional(),
});

const bookingStatuses = [
  'PENDING', 'CONFIRMED', 'ARRIVED', 'WEIGHING', 'STORED',
  'DISPATCH_REQUESTED', 'DISPATCHING', 'DISPATCHED', 'COMPLETED',
  'CANCELLED', 'REJECTED',
] as const;

export const updateBookingStatusSchema = z.object({
  status: z.enum(bookingStatuses),
  chamberId: z.string().uuid().optional(),
  actualWeightKg: z.number().positive().optional(),
  actualBags: z.number().int().positive().optional(),
  ratePerUnit: z.number().positive().optional(),
  totalAmount: z.number().positive().optional(),
  advancePaid: z.number().min(0).optional(),
  ownerNote: z.string().max(500).optional(),
  cancelReason: z.string().max(500).optional(),
  dispatchWeightKg: z.number().positive().optional(),
  dispatchNote: z.string().max(500).optional(),
});

// ── IoT Device Schemas ──

export const createIoTDeviceSchema = z.object({
  facilityId: z.string().uuid('Invalid facility ID'),
  chamberId: z.string().uuid('Invalid chamber ID').optional().nullable(),
  deviceId: z.string().min(1, 'Device ID is required').max(100),
  deviceType: z.string().min(1, 'Device type is required').max(50),
  mqttTopic: z.string().max(255).optional().nullable(),
  firmwareVersion: z.string().max(20).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
});

export const updateIoTDeviceSchema = z.object({
  chamberId: z.string().uuid().optional().nullable(),
  mqttTopic: z.string().max(255).optional(),
  firmwareVersion: z.string().max(20).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

// ── Warehouse Receipt Schemas ──

export const createWarehouseReceiptSchema = z.object({
  lotId: z.string().uuid('Invalid lot ID'),
  isNegotiable: z.boolean().optional().default(true),
});

export const pledgeReceiptSchema = z.object({
  pledgedTo: z.string().min(1, 'Bank/NBFC name is required').max(255),
  pledgeAmount: z.coerce.number().positive('Pledge amount must be positive'),
});

// ── Escrow Schemas ──

export const escrowPaySchema = z.object({
  pgReferenceId: z.string().max(100).optional().nullable(),
  pgProvider: z.string().max(50).optional().nullable(),
});

export const escrowReleaseSchema = z.object({
  loanDeduction: z.coerce.number().min(0).optional(),
});

export const escrowDisputeSchema = z.object({
  reason: z.string().min(1, 'Dispute reason is required').max(1000),
});

export const escrowRefundSchema = z.object({
  reason: z.string().max(1000).optional(),
});

