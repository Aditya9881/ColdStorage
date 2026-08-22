import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatWeight,
  formatDate,
  formatRelativeTime,
  formatPercent,
  getStatusLabel,
  getStatusColor,
  getCommodityLabel,
} from '@/lib/formatters';

// ─── formatCurrency ─────────────────────────────

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0');
  });

  it('formats integers with Indian grouping', () => {
    const result = formatCurrency(125000);
    // Indian format: ₹1,25,000
    expect(result).toContain('1,25,000');
  });

  it('formats decimals up to 2 places', () => {
    const result = formatCurrency(1234.567);
    expect(result).toContain('1,234.57');
  });

  it('handles string input', () => {
    const result = formatCurrency('5000');
    expect(result).toContain('5,000');
  });

  it('handles NaN/undefined gracefully', () => {
    expect(formatCurrency(NaN)).toBe('₹0');
    expect(formatCurrency('')).toBe('₹0');
  });
});

// ─── formatWeight ─────────────────────────────

describe('formatWeight', () => {
  it('formats small weights in kg', () => {
    expect(formatWeight(500)).toBe('500 kg');
  });

  it('formats large weights in MT', () => {
    expect(formatWeight(1500)).toBe('1.5 MT');
  });

  it('formats exactly 1000 kg as MT', () => {
    expect(formatWeight(1000)).toBe('1.0 MT');
  });

  it('handles string input', () => {
    expect(formatWeight('2500')).toBe('2.5 MT');
  });

  it('handles zero', () => {
    expect(formatWeight(0)).toBe('0 kg');
  });
});

// ─── formatDate ─────────────────────────────

describe('formatDate', () => {
  it('formats ISO date string', () => {
    const result = formatDate('2025-03-15T10:00:00Z');
    // Should contain day and year
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2025/);
  });

  it('formats Date object', () => {
    const result = formatDate(new Date('2025-01-01'));
    expect(result).toMatch(/2025/);
  });
});

// ─── formatRelativeTime ─────────────────────────────

describe('formatRelativeTime', () => {
  it('returns "Just now" for recent dates', () => {
    const now = new Date();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns minutes for < 1 hour', () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60000);
    expect(formatRelativeTime(thirtyMinAgo)).toBe('30m ago');
  });

  it('returns hours for < 24 hours', () => {
    const fiveHoursAgo = new Date(Date.now() - 5 * 3600000);
    expect(formatRelativeTime(fiveHoursAgo)).toBe('5h ago');
  });

  it('returns days for < 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns full date for >= 7 days', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86400000);
    const result = formatRelativeTime(tenDaysAgo);
    // Should not contain "ago", should be a formatted date
    expect(result).not.toContain('ago');
  });
});

// ─── formatPercent ─────────────────────────────

describe('formatPercent', () => {
  it('formats to 1 decimal place', () => {
    expect(formatPercent(75.456)).toBe('75.5%');
  });

  it('handles zero', () => {
    expect(formatPercent(0)).toBe('0.0%');
  });

  it('handles 100', () => {
    expect(formatPercent(100)).toBe('100.0%');
  });
});

// ─── getStatusLabel ─────────────────────────────

describe('getStatusLabel', () => {
  it('maps known statuses', () => {
    expect(getStatusLabel('ACTIVE')).toBe('Active');
    expect(getStatusLabel('PENDING_REVIEW')).toBe('Pending Review');
    expect(getStatusLabel('STORED')).toBe('Stored');
    expect(getStatusLabel('OVERDUE')).toBe('Overdue');
  });

  it('returns raw string for unknown statuses', () => {
    expect(getStatusLabel('UNKNOWN_STATUS')).toBe('UNKNOWN_STATUS');
  });
});

// ─── getStatusColor ─────────────────────────────

describe('getStatusColor', () => {
  it('returns accent for positive statuses', () => {
    expect(getStatusColor('ACTIVE')).toBe('accent');
    expect(getStatusColor('OPERATIONAL')).toBe('accent');
    expect(getStatusColor('PAID')).toBe('accent');
  });

  it('returns warning for pending statuses', () => {
    expect(getStatusColor('PENDING_REVIEW')).toBe('warning');
    expect(getStatusColor('DRAFT')).toBe('warning');
  });

  it('returns danger for negative statuses', () => {
    expect(getStatusColor('SUSPENDED')).toBe('danger');
    expect(getStatusColor('OVERDUE')).toBe('danger');
    expect(getStatusColor('EXPIRED')).toBe('danger');
  });

  it('returns muted for unknown statuses', () => {
    expect(getStatusColor('SOMETHING_RANDOM')).toBe('muted');
  });
});

// ─── getCommodityLabel ─────────────────────────────

describe('getCommodityLabel', () => {
  it('maps known commodities', () => {
    expect(getCommodityLabel('POTATO')).toBe('Potato');
    expect(getCommodityLabel('FROZEN_SEAFOOD')).toBe('Frozen Seafood');
    expect(getCommodityLabel('DAIRY')).toBe('Dairy');
  });

  it('returns raw string for unknown categories', () => {
    expect(getCommodityLabel('CUSTOM_COMMODITY')).toBe('CUSTOM_COMMODITY');
  });
});
