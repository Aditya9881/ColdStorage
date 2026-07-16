/**
 * Unique ID Generator — Human-readable IDs for all entities
 *
 * Format patterns:
 *   Farmer:   FR-{state2}-{5digits}      → FR-UP-00142
 *   Buyer:    BY-{state2}-{5digits}      → BY-DL-00031
 *   Owner:    OW-{state2}-{5digits}      → OW-UP-00008
 *   Staff:    ST-{facCode}-{3digits}     → ST-PKCS-012
 *   Facility: FC-{state2}-{city3}-{3d}   → FC-UP-AGR-003
 *   Booking:  BK-{facCode}-{YYMMDD}-{s}  → BK-PKCS-250707-001
 *   Lot:      LOT-{facCode}-{YYYY}-{5d}  → LOT-PKCS-2025-00142
 *   Receipt:  RCT-{facCode}-{YYYY}-{5d}  → RCT-PKCS-2025-00142
 *   Invoice:  INV-{facCode}-{YYYYMM}-{s} → INV-PKCS-202507-042
 *   Gate Pass: GP-{facCode}-{YYYY}-{5d}  → GP-PKCS-2025-00001
 */

import { prisma } from '../../config/database';

// ── State Abbreviations (Indian States + UTs) ──
const STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'AP', 'arunachal pradesh': 'AR', 'assam': 'AS',
  'bihar': 'BR', 'chhattisgarh': 'CG', 'delhi': 'DL', 'goa': 'GA',
  'gujarat': 'GJ', 'haryana': 'HR', 'himachal pradesh': 'HP',
  'jharkhand': 'JH', 'karnataka': 'KA', 'kerala': 'KL',
  'madhya pradesh': 'MP', 'maharashtra': 'MH', 'manipur': 'MN',
  'meghalaya': 'ML', 'mizoram': 'MZ', 'nagaland': 'NL',
  'odisha': 'OD', 'punjab': 'PB', 'rajasthan': 'RJ',
  'sikkim': 'SK', 'tamil nadu': 'TN', 'telangana': 'TG',
  'tripura': 'TR', 'uttar pradesh': 'UP', 'uttarakhand': 'UK',
  'west bengal': 'WB', 'jammu and kashmir': 'JK', 'ladakh': 'LA',
  'chandigarh': 'CH', 'puducherry': 'PY',
};

function getStateCode(state?: string | null): string {
  if (!state) return 'XX';
  return STATE_CODES[state.toLowerCase().trim()] || state.substring(0, 2).toUpperCase();
}

function getCityCode(city?: string | null): string {
  if (!city) return 'XXX';
  return city.substring(0, 3).toUpperCase();
}

function pad(num: number, length: number): string {
  return String(num).padStart(length, '0');
}

function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

function getFacilityCode(value: string): string {
  const code = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  return code.padEnd(6, 'X');
}

const generatedSequences = new Map<string, number>();

function nextSequence(prefix: string, facilityCode: string, max: number): number {
  const key = `${prefix}:${facilityCode}:${getCurrentYear()}`;
  const next = (generatedSequences.get(key) ?? 0) + 1;
  generatedSequences.set(key, next > max ? 1 : next);
  return next > max ? 1 : next;
}

/**
 * Generate a facility code from its name
 * e.g. "PK Cold Storage Pvt. Ltd." → "PKCS"
 */
export function generateFacilityCode(name: string): string {
  const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'XXXX';

  const skipWords = new Set(['pvt', 'ltd', 'private', 'limited', 'the', 'and', 'of']);
  const significant = words.filter(w => !skipWords.has(w.toLowerCase()));

  if (significant.length >= 4) {
    return significant.slice(0, 4).map(w => w[0].toUpperCase()).join('');
  }
  if (significant.length >= 2) {
    return significant.map(w => w[0].toUpperCase()).join('');
  }
  return name.substring(0, 4).toUpperCase().replace(/\s/g, '');
}

/**
 * Generate a unique ID for a user based on their role and state
 */
export async function generateUserUniqueId(
  role: string,
  state?: string | null
): Promise<string> {
  const prefixMap: Record<string, string> = {
    FARMER: 'FR',
    BUYER: 'BY',
    OWNER: 'OW',
    STAFF: 'ST',
    ADMIN: 'AD',
    SUPER_ADMIN: 'SA',
  };

  const prefix = prefixMap[role] || 'US';
  const stateCode = getStateCode(state);
  const searchPrefix = `${prefix}-${stateCode}-`;

  const count = await prisma.user.count({
    where: {
      uniqueId: { startsWith: searchPrefix },
    },
  });

  const sequence = count + 1;
  return `${prefix}-${stateCode}-${pad(sequence, 5)}`;
}

/**
 * Generate a facility unique ID
 */
export async function generateFacilityUniqueId(
  state: string,
  city: string
): Promise<string> {
  const stateCode = getStateCode(state);
  const cityCode = getCityCode(city);
  const searchPrefix = `FC-${stateCode}-${cityCode}-`;

  const count = await prisma.facility.count({
    where: {
      registrationNumber: { startsWith: searchPrefix },
    },
  });

  const sequence = count + 1;
  return `${searchPrefix}${pad(sequence, 3)}`;
}

/**
 * Generate a lot number: LOT-PKCS-2025-00001
 */
export function generateLotNumber(facilityCode: string, sequence?: number): string {
  const year = getCurrentYear();
  const code = getFacilityCode(facilityCode);
  const seq = sequence ?? nextSequence('LOT', code, 99999);
  return `LOT-${code}-${year}-${pad(seq, 5)}`;
}

/**
 * Generate a receipt number: RCT-PKCS-2025-00001
 */
export function generateReceiptNumber(facilityCode: string, sequence?: number): string {
  const year = getCurrentYear();
  const code = getFacilityCode(facilityCode);
  const seq = sequence ?? nextSequence('RCT', code, 99999);
  return `RCT-${code}-${year}-${pad(seq, 5)}`;
}

/**
 * Generate an invoice number: INV-PKCS-202507-042
 */
export function generateInvoiceNumber(facilityCode: string, sequence?: number): string {
  const year = getCurrentYear();
  const code = getFacilityCode(facilityCode);
  const seq = sequence ?? nextSequence('INV', code, 99999);
  return `INV-${code}-${year}-${pad(seq, 5)}`;
}

/**
 * Generate a booking number: BK-PKCS-250707-001
 */
export function generateBookingNumber(facilityCode: string, sequence: number): string {
  const now = new Date();
  const dateStr = `${String(now.getFullYear()).slice(-2)}${pad(now.getMonth() + 1, 2)}${pad(now.getDate(), 2)}`;
  return `BK-${facilityCode}-${dateStr}-${pad(sequence, 3)}`;
}

/**
 * Generate a gate pass number: GP-PKCS-2025-00001
 */
export function generateGatePassNumber(facilityCode: string, sequence?: number): string {
  const year = getCurrentYear();
  const code = getFacilityCode(facilityCode);
  const seq = sequence ?? nextSequence('GP', code, 99999);
  return `GP-${code}-${year}-${pad(seq, 5)}`;
}

export const idGenerator = {
  generateUserUniqueId,
  generateFacilityUniqueId,
  generateFacilityCode,
  generateBookingNumber,
  generateLotNumber,
  generateReceiptNumber,
  generateInvoiceNumber,
  generateGatePassNumber,
};
