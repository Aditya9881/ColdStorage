// ============================================
// Shared TypeScript Types for Frontend
// ============================================

// ── User Types ─────────────────────────────────
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OWNER' | 'STAFF' | 'FARMER' | 'BUYER';
export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface User {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  phoneVerified: boolean;
  role: UserRole;
  status: UserStatus;
  facilityId: string | null;
  avatarUrl: string | null;
  preferredLang: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  facility?: { id: string; name: string; status: string } | null;
}

// ── Facility Types ─────────────────────────────
export type FacilityStatus = 'PENDING_REVIEW' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';
export type StorageType = 'BAG' | 'BULK' | 'HYBRID';

export interface Facility {
  id: string;
  name: string;
  registrationNumber: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  totalCapacityMt: number;
  storageType: StorageType;
  status: FacilityStatus;
  operatingSince: string | null;
  ownerId: string;
  contactPhone: string | null;
  contactEmail: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; fullName: string; phone: string };
  _count?: { chambers: number; lots: number; staff: number };
}

// ── Chamber Types ──────────────────────────────
export type ChamberStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'OFFLINE';
export type CommodityCategory =
  | 'POTATO' | 'ONION' | 'VEGETABLES' | 'FRUITS'
  | 'DAIRY' | 'FROZEN_SEAFOOD' | 'FROZEN_MEAT'
  | 'PROCESSED_FOOD' | 'SEEDS' | 'OTHER';

export interface Chamber {
  id: string;
  facilityId: string;
  chamberNumber: string;
  name: string | null;
  capacityMt: number;
  occupiedMt: number;
  targetTempMin: number | null;
  targetTempMax: number | null;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  targetHumidityMin: number | null;
  targetHumidityMax: number | null;
  commodityCategory: CommodityCategory | null;
  status: ChamberStatus;
  storageType: StorageType;
  createdAt: string;
  updatedAt: string;
}

// ── Inventory Types ────────────────────────────
export type LotStatus = 'INTAKE_PENDING' | 'STORED' | 'PARTIALLY_RELEASED' | 'FULLY_RELEASED' | 'EXPIRED' | 'DISPOSED';
export type QualityGrade = 'A' | 'B' | 'C' | 'REJECTED';
export type TransactionType = 'INTAKE' | 'PARTIAL_RELEASE' | 'FULL_RELEASE' | 'QUALITY_UPDATE' | 'WEIGHT_ADJUSTMENT' | 'TRANSFER';

export interface InventoryLot {
  id: string;
  lotNumber: string;
  receiptNumber: string;
  facilityId: string;
  chamberId: string;
  depositorId: string;
  commodityCategory: CommodityCategory;
  commodityName: string;
  intakeWeightKg: number;
  currentWeightKg: number;
  bagCount: number | null;
  qualityGrade: QualityGrade | null;
  qualityNotes: string | null;
  moistureContent: number | null;
  intakeDate: string;
  expectedRelease: string | null;
  actualReleaseDate: string | null;
  status: LotStatus;
  appliedRate: number | null;
  pricingModel: string | null;
  totalRentAccrued: number;
  totalRentPaid: number;
  createdAt: string;
  depositor?: { id: string; fullName: string; phone: string };
  chamber?: { id: string; chamberNumber: string; name: string | null };
  facility?: { id: string; name: string };
  transactions?: InventoryTransaction[];
}

export interface InventoryTransaction {
  id: string;
  lotId: string;
  transactionType: TransactionType;
  weightKg: number;
  bagCount: number | null;
  notes: string | null;
  gatePassNumber: string | null;
  depositorApproved: boolean;
  performedAt: string;
  performer?: { id: string; fullName: string };
}

// ── Invoice Types ──────────────────────────────
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  facilityId: string;
  depositorId: string;
  lotId: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  billingPeriodStart: string | null;
  billingPeriodEnd: string | null;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  createdAt: string;
  depositor?: { id: string; fullName: string; phone: string };
  facility?: { id: string; name: string };
  lot?: { id: string; lotNumber: string; commodityName: string };
  lineItems?: InvoiceLineItem[];
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

// ── API Response Types ─────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta?: PaginationMeta;
  error?: { code: string; message: string; details?: Record<string, unknown> };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ── Analytics Types ────────────────────────────
export interface DashboardOverview {
  facilities: { total: number; active: number; pendingReview: number };
  users: { total: number; farmers: number; owners: number };
  inventory: { totalLots: number; activeLots: number; totalStoredKg: number; totalStoredMt: number };
  financial: { totalInvoices: number; totalRevenue: number };
}

export interface CapacityAnalytics {
  national: { totalCapacityMt: number; occupiedMt: number; availableMt: number; utilizationRate: number; facilityCount: number };
  byState: Array<{
    state: string;
    totalCapacityMt: number;
    occupiedMt: number;
    availableMt: number;
    utilizationRate: number;
    facilityCount: number;
  }>;
}

export interface FacilityStats {
  totalCapacityMt: number;
  occupiedMt: number;
  availableMt: number;
  utilizationRate: number;
  totalChambers: number;
  operationalChambers: number;
  activeLots: number;
  totalLots: number;
  recentTransactions: number;
}
