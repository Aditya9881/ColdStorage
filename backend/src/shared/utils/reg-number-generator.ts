/**
 * Generates human-readable, hierarchical registration numbers.
 *
 * Facility:  {STATE_CODE}-CS-{YEAR}-{SEQ}       e.g. UP-CS-2026-001
 * Farmer:    {STATE_CODE}-{FAC_SEQ}-FRM-{SEQ}    e.g. UP-001-FRM-042
 *
 * All sequences are DB-backed (survive restarts).
 */

import { prisma } from '../../config/database';

// ── Indian state/UT → 2-letter code ────────────────────────────────

const STATE_CODES: Record<string, string> = {
  'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR',
  'assam': 'AS',
  'bihar': 'BR',
  'chhattisgarh': 'CG',
  'goa': 'GA',
  'gujarat': 'GJ',
  'haryana': 'HR',
  'himachal pradesh': 'HP',
  'jharkhand': 'JH',
  'karnataka': 'KA',
  'kerala': 'KL',
  'madhya pradesh': 'MP',
  'maharashtra': 'MH',
  'manipur': 'MN',
  'meghalaya': 'ML',
  'mizoram': 'MZ',
  'nagaland': 'NL',
  'odisha': 'OD',
  'punjab': 'PB',
  'rajasthan': 'RJ',
  'sikkim': 'SK',
  'tamil nadu': 'TN',
  'telangana': 'TG',
  'tripura': 'TR',
  'uttar pradesh': 'UP',
  'uttarakhand': 'UK',
  'west bengal': 'WB',
  // Union territories
  'andaman and nicobar islands': 'AN',
  'chandigarh': 'CH',
  'dadra and nagar haveli and daman and diu': 'DD',
  'delhi': 'DL',
  'jammu and kashmir': 'JK',
  'ladakh': 'LA',
  'lakshadweep': 'LD',
  'puducherry': 'PY',
};

/**
 * Get the 2-letter state code from the full state name.
 * Falls back to first 2 characters uppercased if not found.
 */
export function getStateCode(stateName: string): string {
  const key = stateName.trim().toLowerCase();
  return STATE_CODES[key] || stateName.substring(0, 2).toUpperCase();
}

/**
 * Generate a facility registration number.
 * Format: {STATE_CODE}-CS-{YEAR}-{SEQ}
 * e.g. UP-CS-2026-001
 *
 * Sequence is the count of existing facilities in that state + 1.
 */
export async function generateFacilityRegNumber(state: string): Promise<string> {
  const stateCode = getStateCode(state);
  const year = new Date().getFullYear().toString();

  // Count existing facilities in this state to determine sequence
  const existingCount = await prisma.facility.count({
    where: {
      registrationNumber: {
        startsWith: `${stateCode}-CS-`,
      },
    },
  });

  const seq = (existingCount + 1).toString().padStart(3, '0');
  return `${stateCode}-CS-${year}-${seq}`;
}

/**
 * Extract the facility sequence portion from a facility registration number.
 * e.g. "UP-CS-2026-001" → "001"
 */
function extractFacilitySeq(regNumber: string): string {
  const parts = regNumber.split('-');
  // Format: STATE-CS-YEAR-SEQ → last part is the sequence
  return parts[parts.length - 1] || '001';
}

/**
 * Generate a farmer registration number.
 * Format: {STATE_CODE}-{FAC_SEQ}-FRM-{SEQ}
 * e.g. UP-001-FRM-042
 *
 * FAC_SEQ comes from the facility's own registration number.
 * Farmer SEQ is the count of existing farmers linked to this facility + 1.
 */
export async function generateFarmerRegNumber(facilityId: string): Promise<string> {
  // Look up the facility to get state + reg number
  const facility = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { state: true, registrationNumber: true },
  });

  if (!facility) {
    throw new Error('Facility not found');
  }

  const stateCode = getStateCode(facility.state);
  const facSeq = facility.registrationNumber
    ? extractFacilitySeq(facility.registrationNumber)
    : '001';

  const prefix = `${stateCode}-${facSeq}-FRM-`;

  // Count existing farmers with this prefix
  const existingCount = await prisma.user.count({
    where: {
      registrationNumber: {
        startsWith: prefix,
      },
    },
  });

  const seq = (existingCount + 1).toString().padStart(3, '0');
  return `${prefix}${seq}`;
}
