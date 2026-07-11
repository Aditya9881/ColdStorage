/**
 * ColdStorage — Extended View Types
 *
 * These types extend the auto-generated base types with relation fields
 * as they appear in API responses. Unlike the auto-generated index.ts,
 * this file IS manually maintained.
 *
 * Convention:
 *   - Base types (index.ts) = exact DB scalar fields
 *   - View types (views.ts) = what the API actually returns (with relations)
 */

import type {
  User,
  Facility,
  Chamber,
  InventoryLot,
  InventoryTransaction,
  Invoice,
  InvoiceLineItem,
  MarketListing,
  Order,
  TemperatureReading,
  FacilityDocument,
  FacilityPricing,
  Notification,
  FacilityReview,
  AuditLog,
} from './index';

// Re-export everything from auto-generated types
export * from './index';

// ── User Views ─────────────────────────────────

/** User as returned by GET /users/:id or GET /users/me */
export interface UserView extends User {
  facility?: { id: string; name: string; status: string } | null;
  ownedFacilities?: Array<{ id: string; name: string }> | null;
}

// ── Facility Views ─────────────────────────────

/** Facility as returned by GET /facilities/:id */
export interface FacilityView extends Facility {
  owner?: { id: string; fullName: string; phone: string };
  chambers?: ChamberView[];
  pricing?: FacilityPricing[];
  documents?: FacilityDocument[];
  reviews?: FacilityReview[];
  _count?: {
    chambers: number;
    lots: number;
    staff: number;
    reviews: number;
  };
}

/** Facility in discovery/search results */
export interface FacilitySearchResult extends Facility {
  chambers: Array<{
    id: string;
    chamberNumber: string;
    name: string | null;
    capacityMt: number;
    occupiedMt: number;
    commodityCategory: string | null;
  }>;
  pricing: Array<{
    commodityCategory: string;
    pricingModel: string;
    rateAmount: number;
    rateCurrency: string;
  }>;
  totalCapacity: number;
  availableCapacity: number;
  utilizationPercent: number;
  avgRating: number | null;
  reviewCount: number;
  _count: { lots: number; reviews: number };
}

// ── Chamber Views ──────────────────────────────

export interface ChamberView extends Chamber {
  facility?: { id: string; name: string };
  lots?: LotSummary[];
  _count?: { lots: number };
}

export interface LotSummary {
  id: string;
  lotNumber: string;
  commodityName: string;
  currentWeightKg: number;
  status: string;
  intakeDate: string;
  depositor: { id: string; fullName: string; phone: string };
}

// ── Inventory Views ────────────────────────────

/** Lot as returned by GET /inventory/lots/:id */
export interface InventoryLotView extends InventoryLot {
  depositor?: { id: string; fullName: string; phone: string };
  chamber?: { id: string; chamberNumber: string; name: string | null };
  facility?: { id: string; name: string };
  transactions?: InventoryTransactionView[];
}

export interface InventoryTransactionView extends InventoryTransaction {
  performer?: { id: string; fullName: string };
}

// ── Invoice Views ──────────────────────────────

/** Invoice as returned by GET /invoices/:id */
export interface InvoiceView extends Invoice {
  depositor?: { id: string; fullName: string; phone: string };
  facility?: { id: string; name: string };
  lot?: { id: string; lotNumber: string; commodityName: string };
  lineItems?: InvoiceLineItem[];
}

// ── Marketplace Views ──────────────────────────

/** Listing as returned by GET /marketplace/listings/:id */
export interface MarketListingView extends MarketListing {
  lot: {
    id: string;
    lotNumber: string;
    commodityName: string;
    commodityCategory: string;
    currentWeightKg: number;
    intakeWeightKg: number;
    qualityGrade: string | null;
    qualityNotes: string | null;
    moistureContent: number | null;
    bagCount: number | null;
    intakeDate: string;
    status: string;
    facility: { id: string; name: string; city: string; state: string; storageType: string };
    chamber: { chamberNumber: string; name: string | null; targetTempMin: number | null; targetTempMax: number | null };
  };
  seller: { id: string; fullName: string; city: string | null; state: string | null };
  orders?: Array<{ id: string; status: string; quantityKg: number; agreedPricePerKg: number; createdAt: string }>;
}

// ── Temperature Views ──────────────────────────

export interface TemperatureHistory {
  chamber: {
    id: string;
    chamberNumber: string;
    name: string | null;
    targetTempMin: number | null;
    targetTempMax: number | null;
    targetHumidityMin: number | null;
    targetHumidityMax: number | null;
    commodityCategory: string | null;
  };
  period: string;
  readings: Array<TemperatureReading & { temperature: number; humidity: number | null }>;
  stats: {
    avgTemp: number;
    minTemp: number;
    maxTemp: number;
    avgHumidity: number | null;
    totalReadings: number;
    alertCount: number;
    alertRate: number;
  };
}

// ── Analytics Views ────────────────────────────

export interface DashboardOverview {
  facilities: { total: number; active: number; pendingReview: number };
  users: { total: number; farmers: number; owners: number };
  inventory: { totalLots: number; activeLots: number; totalStoredKg: number; totalStoredMt: number };
  financial: { totalInvoices: number; totalRevenue: number };
}

export interface CapacityAnalytics {
  national: {
    totalCapacityMt: number;
    occupiedMt: number;
    availableMt: number;
    utilizationRate: number;
    facilityCount: number;
  };
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
