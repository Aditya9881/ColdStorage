/**
 * Generates structured IDs for lots, invoices, receipts, and gate passes.
 * Format: PREFIX-FACILITYCODE-YEAR-SEQUENCE
 */

const counters: Map<string, number> = new Map();

function getNextSequence(prefix: string): string {
  const current = counters.get(prefix) || 0;
  const next = current + 1;
  counters.set(prefix, next);
  return next.toString().padStart(5, '0');
}

function getCurrentYear(): string {
  return new Date().getFullYear().toString();
}

function generateFacilityCode(facilityId: string): string {
  // Use first 6 chars of UUID as facility code
  return facilityId.substring(0, 6).toUpperCase();
}

/**
 * Generate a lot number: LOT-A1B2C3-2024-00001
 */
export function generateLotNumber(facilityId: string): string {
  const code = generateFacilityCode(facilityId);
  const year = getCurrentYear();
  const seq = getNextSequence(`LOT-${code}-${year}`);
  return `LOT-${code}-${year}-${seq}`;
}

/**
 * Generate a receipt number: RCT-A1B2C3-2024-00001
 */
export function generateReceiptNumber(facilityId: string): string {
  const code = generateFacilityCode(facilityId);
  const year = getCurrentYear();
  const seq = getNextSequence(`RCT-${code}-${year}`);
  return `RCT-${code}-${year}-${seq}`;
}

/**
 * Generate an invoice number: INV-A1B2C3-2024-00001
 */
export function generateInvoiceNumber(facilityId: string): string {
  const code = generateFacilityCode(facilityId);
  const year = getCurrentYear();
  const seq = getNextSequence(`INV-${code}-${year}`);
  return `INV-${code}-${year}-${seq}`;
}

/**
 * Generate a gate pass number: GP-A1B2C3-2024-00001
 */
export function generateGatePassNumber(facilityId: string): string {
  const code = generateFacilityCode(facilityId);
  const year = getCurrentYear();
  const seq = getNextSequence(`GP-${code}-${year}`);
  return `GP-${code}-${year}-${seq}`;
}
