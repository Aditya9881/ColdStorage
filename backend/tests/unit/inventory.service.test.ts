/**
 * Inventory Service — Unit Tests
 *
 * Tests utility functions and business logic in isolation:
 * - Lot number generation
 * - Receipt number generation
 * - Invoice number generation
 * - Weight validation rules
 * - Status transition validation
 */

import {
  generateLotNumber,
  generateReceiptNumber,
  generateInvoiceNumber,
  generateGatePassNumber,
} from '../../src/shared/utils/id-generator';

// ─────────────────────────────────────────────
// ID Generation
// ─────────────────────────────────────────────

describe('ID Generator — Lot Numbers', () => {
  it('should generate lot number with correct format', () => {
    const facilityId = 'abcdef12-3456-7890-abcd-ef1234567890';
    const lotNumber = generateLotNumber(facilityId);

    expect(lotNumber).toMatch(/^LOT-[A-Z0-9]{6}-\d{4}-\d{5}$/);
    expect(lotNumber).toContain('LOT-ABCDEF');
  });

  it('should generate unique sequential lot numbers', () => {
    const facilityId = 'unique1-1234-5678-abcd-ef1234567890';
    const lot1 = generateLotNumber(facilityId);
    const lot2 = generateLotNumber(facilityId);

    expect(lot1).not.toBe(lot2);
    // The sequence should increment
    const seq1 = parseInt(lot1.split('-').pop()!);
    const seq2 = parseInt(lot2.split('-').pop()!);
    expect(seq2).toBe(seq1 + 1);
  });

  it('should use first 6 chars of facility ID as code', () => {
    const facilityId = 'ff99aa-anything-else';
    const lotNumber = generateLotNumber(facilityId);
    expect(lotNumber).toContain('FF99AA');
  });
});

describe('ID Generator — Receipt Numbers', () => {
  it('should generate receipt number with RCT prefix', () => {
    const facilityId = 'rctfac-1234-5678-abcd-000000000000';
    const receiptNumber = generateReceiptNumber(facilityId);

    expect(receiptNumber).toMatch(/^RCT-[A-Z0-9]{6}-\d{4}-\d{5}$/);
  });
});

describe('ID Generator — Invoice Numbers', () => {
  it('should generate invoice number with INV prefix', () => {
    const facilityId = 'invfac-1234-5678-abcd-000000000000';
    const invoiceNumber = generateInvoiceNumber(facilityId);

    expect(invoiceNumber).toMatch(/^INV-[A-Z0-9]{6}-\d{4}-\d{5}$/);
  });

  it('should generate unique invoice numbers', () => {
    const facilityId = 'invsqf-1234-5678-abcd-000000000000';
    const inv1 = generateInvoiceNumber(facilityId);
    const inv2 = generateInvoiceNumber(facilityId);
    expect(inv1).not.toBe(inv2);
  });
});

describe('ID Generator — Gate Pass Numbers', () => {
  it('should generate gate pass number with GP prefix', () => {
    const facilityId = 'gpfaci-1234-5678-abcd-000000000000';
    const gpNumber = generateGatePassNumber(facilityId);

    expect(gpNumber).toMatch(/^GP-[A-Z0-9]{6}-\d{4}-\d{5}$/);
  });
});

// ─────────────────────────────────────────────
// Weight Validation Rules
// ─────────────────────────────────────────────

describe('Weight Validation', () => {
  function validateRelease(currentWeightKg: number, releaseWeightKg: number): {
    valid: boolean;
    newWeight: number;
    status: 'PARTIALLY_RELEASED' | 'FULLY_RELEASED';
    error?: string;
  } {
    if (releaseWeightKg <= 0) {
      return { valid: false, newWeight: currentWeightKg, status: 'PARTIALLY_RELEASED', error: 'Release weight must be positive' };
    }
    if (releaseWeightKg > currentWeightKg) {
      return { valid: false, newWeight: currentWeightKg, status: 'PARTIALLY_RELEASED', error: 'Release weight exceeds current weight' };
    }
    const newWeight = currentWeightKg - releaseWeightKg;
    const status = newWeight === 0 ? 'FULLY_RELEASED' : 'PARTIALLY_RELEASED';
    return { valid: true, newWeight, status };
  }

  it('should allow partial release', () => {
    const result = validateRelease(5000, 2000);
    expect(result.valid).toBe(true);
    expect(result.newWeight).toBe(3000);
    expect(result.status).toBe('PARTIALLY_RELEASED');
  });

  it('should allow full release', () => {
    const result = validateRelease(5000, 5000);
    expect(result.valid).toBe(true);
    expect(result.newWeight).toBe(0);
    expect(result.status).toBe('FULLY_RELEASED');
  });

  it('should reject release exceeding current weight', () => {
    const result = validateRelease(1000, 5000);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('exceeds');
  });

  it('should reject zero release weight', () => {
    const result = validateRelease(1000, 0);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive');
  });

  it('should reject negative release weight', () => {
    const result = validateRelease(1000, -500);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('positive');
  });
});

// ─────────────────────────────────────────────
// Status Transition Validation
// ─────────────────────────────────────────────

describe('Inventory Status Transitions', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    'STORED': ['PARTIALLY_RELEASED', 'FULLY_RELEASED', 'DAMAGED', 'DISPUTED'],
    'PARTIALLY_RELEASED': ['STORED', 'FULLY_RELEASED', 'DAMAGED', 'DISPUTED'],
    'FULLY_RELEASED': [], // terminal state
    'DAMAGED': ['STORED', 'FULLY_RELEASED'], // can be restored or released
    'DISPUTED': ['STORED', 'FULLY_RELEASED'],
  };

  function isValidTransition(from: string, to: string): boolean {
    return (VALID_TRANSITIONS[from] || []).includes(to);
  }

  it('should allow STORED → PARTIALLY_RELEASED', () => {
    expect(isValidTransition('STORED', 'PARTIALLY_RELEASED')).toBe(true);
  });

  it('should allow STORED → FULLY_RELEASED', () => {
    expect(isValidTransition('STORED', 'FULLY_RELEASED')).toBe(true);
  });

  it('should reject FULLY_RELEASED → anything', () => {
    expect(isValidTransition('FULLY_RELEASED', 'STORED')).toBe(false);
    expect(isValidTransition('FULLY_RELEASED', 'DAMAGED')).toBe(false);
  });

  it('should allow PARTIALLY_RELEASED → FULLY_RELEASED', () => {
    expect(isValidTransition('PARTIALLY_RELEASED', 'FULLY_RELEASED')).toBe(true);
  });

  it('should allow DAMAGED → STORED (restoration)', () => {
    expect(isValidTransition('DAMAGED', 'STORED')).toBe(true);
  });
});

// ─────────────────────────────────────────────
// Invoice Calculation
// ─────────────────────────────────────────────

describe('Invoice Calculations', () => {
  function calculateInvoice(lineItems: { quantity: number; unitPrice: number }[], taxRate = 0) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  }

  it('should calculate subtotal correctly', () => {
    const result = calculateInvoice([
      { quantity: 100, unitPrice: 5 },  // 500
      { quantity: 1, unitPrice: 200 },  // 200
    ]);
    expect(result.subtotal).toBe(700);
    expect(result.taxAmount).toBe(0);
    expect(result.totalAmount).toBe(700);
  });

  it('should apply tax rate correctly', () => {
    const result = calculateInvoice(
      [{ quantity: 100, unitPrice: 10 }],  // 1000
      0.18,  // 18% GST
    );
    expect(result.subtotal).toBe(1000);
    expect(result.taxAmount).toBe(180);
    expect(result.totalAmount).toBe(1180);
  });

  it('should handle single line item', () => {
    const result = calculateInvoice([{ quantity: 50, unitPrice: 3 }]);
    expect(result.totalAmount).toBe(150);
  });

  it('should handle zero quantity gracefully', () => {
    const result = calculateInvoice([{ quantity: 0, unitPrice: 100 }]);
    expect(result.totalAmount).toBe(0);
  });
});
