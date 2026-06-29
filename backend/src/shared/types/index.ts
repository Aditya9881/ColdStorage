// ============================================
// Shared TypeScript Types & Enums
// ============================================

// ---- User Enums ----
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  FARMER = 'FARMER',
  BUYER = 'BUYER',
}

export enum UserStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

// ---- Facility Enums ----
export enum FacilityStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DECOMMISSIONED = 'DECOMMISSIONED',
}

export enum StorageType {
  BAG = 'BAG',
  BULK = 'BULK',
  HYBRID = 'HYBRID',
}

export enum ChamberStatus {
  OPERATIONAL = 'OPERATIONAL',
  MAINTENANCE = 'MAINTENANCE',
  OFFLINE = 'OFFLINE',
}

export enum CommodityCategory {
  POTATO = 'POTATO',
  ONION = 'ONION',
  VEGETABLES = 'VEGETABLES',
  FRUITS = 'FRUITS',
  DAIRY = 'DAIRY',
  FROZEN_SEAFOOD = 'FROZEN_SEAFOOD',
  FROZEN_MEAT = 'FROZEN_MEAT',
  PROCESSED_FOOD = 'PROCESSED_FOOD',
  SEEDS = 'SEEDS',
  OTHER = 'OTHER',
}

// ---- Document Enums ----
export enum DocumentType {
  FSSAI_REGISTRATION = 'FSSAI_REGISTRATION',
  STATE_HORTICULTURE_LICENSE = 'STATE_HORTICULTURE_LICENSE',
  POLLUTION_CONSENT = 'POLLUTION_CONSENT',
  FIRE_SAFETY_CERTIFICATE = 'FIRE_SAFETY_CERTIFICATE',
  WDRA_REGISTRATION = 'WDRA_REGISTRATION',
  GST_CERTIFICATE = 'GST_CERTIFICATE',
  BUSINESS_REGISTRATION = 'BUSINESS_REGISTRATION',
  OTHER = 'OTHER',
}

export enum DocumentStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

// ---- Pricing Enums ----
export enum PricingModel {
  PER_DAY_PER_MT = 'PER_DAY_PER_MT',
  PER_MONTH_PER_MT = 'PER_MONTH_PER_MT',
  PER_SEASON = 'PER_SEASON',
  FLAT_RATE = 'FLAT_RATE',
}

export enum PricingStatus {
  ACTIVE = 'ACTIVE',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

// ---- Inventory Enums ----
export enum LotStatus {
  INTAKE_PENDING = 'INTAKE_PENDING',
  STORED = 'STORED',
  PARTIALLY_RELEASED = 'PARTIALLY_RELEASED',
  FULLY_RELEASED = 'FULLY_RELEASED',
  EXPIRED = 'EXPIRED',
  DISPOSED = 'DISPOSED',
}

export enum QualityGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  REJECTED = 'REJECTED',
}

export enum TransactionType {
  INTAKE = 'INTAKE',
  PARTIAL_RELEASE = 'PARTIAL_RELEASE',
  FULL_RELEASE = 'FULL_RELEASE',
  QUALITY_UPDATE = 'QUALITY_UPDATE',
  WEIGHT_ADJUSTMENT = 'WEIGHT_ADJUSTMENT',
  TRANSFER = 'TRANSFER',
}

// ---- Invoice Enums ----
export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

// ---- API Response Types ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  meta?: PaginationMeta;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

// ---- JWT Payload ----
export interface JwtPayload {
  userId: string;
  role: UserRole;
  facilityId?: string;
}

// ---- Request with Auth ----
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}
