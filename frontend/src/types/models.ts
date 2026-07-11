// ============================================
// Frontend Types — Re-exported from Shared
// ============================================
//
// Base types and enums come from the shared package (auto-generated
// from the Prisma schema). View types with relation fields come
// from the shared views module.
//
// Import in components: import type { User, Facility } from '@/types/models';
//   or: import { UserRole } from '@/types/models';  (runtime const)

// Re-export all enums (both type and const) and base models
export {
  // Enum types + const objects
  UserRole,
  UserStatus,
  FacilityStatus,
  StorageType,
  ChamberStatus,
  CommodityCategory,
  PaymentMethod,
  DocumentType,
  DocumentStatus,
  PricingModel,
  PricingStatus,
  LotStatus,
  QualityGrade,
  TransactionType,
  InvoiceStatus,
  ListingStatus,
  OrderStatus,
  NotificationType,
  UserDocType,
} from '@shared/types/index';

// Re-export view types (what API responses look like)
// Aliased to match existing frontend import names
export type {
  UserView as User,
  FacilityView as Facility,
  FacilitySearchResult,
  ChamberView as Chamber,
  LotSummary,
  InventoryLotView as InventoryLot,
  InventoryTransactionView as InventoryTransaction,
  InvoiceView as Invoice,
  MarketListingView as MarketListing,
  TemperatureHistory,
  DashboardOverview,
  CapacityAnalytics,
  FacilityStats,
  ApiResponse,
  PaginationMeta,
  ApiListResponse,
} from '@shared/types/views';

// Re-export base model types under explicit names (for cases where
// you need the raw DB shape without relations)
export type {
  User as UserBase,
  Facility as FacilityBase,
  Chamber as ChamberBase,
  InventoryLot as InventoryLotBase,
  Invoice as InvoiceBase,
  InvoiceLineItem,
  TemperatureReading,
  FacilityDocument,
  FacilityPricing,
  Notification,
  FacilityReview,
  MarketListing as MarketListingBase,
  Order,
  AuditLog,
  WarehouseReceipt,
  EscrowTransaction,
  IoTDevice,
  Payment,
  UserDocument,
} from '@shared/types/index';
