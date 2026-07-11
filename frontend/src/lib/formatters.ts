/**
 * Format a number as Indian currency (₹)
 */
export function formatCurrency(amount: number | string): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format weight in kilograms with unit
 */
export function formatWeight(kg: number | string): string {
  const num = Number(kg) || 0;
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} MT`;
  }
  return `${num.toFixed(0)} kg`;
}

/**
 * Format a date string to local date
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Format a percentage
 */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_REVIEW: 'Pending Review',
    PENDING_VERIFICATION: 'Pending Verification',
    ACTIVE: 'Active',
    SUSPENDED: 'Suspended',
    DEACTIVATED: 'Deactivated',
    DECOMMISSIONED: 'Decommissioned',
    OPERATIONAL: 'Operational',
    MAINTENANCE: 'Maintenance',
    OFFLINE: 'Offline',
    INTAKE_PENDING: 'Intake Pending',
    STORED: 'Stored',
    PARTIALLY_RELEASED: 'Partially Released',
    FULLY_RELEASED: 'Fully Released',
    EXPIRED: 'Expired',
    DISPOSED: 'Disposed',
    DRAFT: 'Draft',
    ISSUED: 'Issued',
    PARTIALLY_PAID: 'Partially Paid',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
    PENDING_APPROVAL: 'Pending Approval',
    REJECTED: 'Rejected',
    ARCHIVED: 'Archived',
    APPROVED: 'Approved',
  };
  return labels[status] || status;
}

/**
 * Get CSS class for status badge color
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    ACTIVE: 'accent',
    OPERATIONAL: 'accent',
    STORED: 'accent',
    PAID: 'accent',
    APPROVED: 'accent',
    PENDING_REVIEW: 'warning',
    PENDING_VERIFICATION: 'warning',
    PENDING_APPROVAL: 'warning',
    INTAKE_PENDING: 'warning',
    DRAFT: 'warning',
    MAINTENANCE: 'warning',
    ISSUED: 'info',
    PARTIALLY_RELEASED: 'info',
    PARTIALLY_PAID: 'info',
    SUSPENDED: 'danger',
    DEACTIVATED: 'danger',
    DECOMMISSIONED: 'danger',
    OFFLINE: 'danger',
    FULLY_RELEASED: 'primary',
    EXPIRED: 'danger',
    DISPOSED: 'danger',
    OVERDUE: 'danger',
    CANCELLED: 'danger',
    REJECTED: 'danger',
    ARCHIVED: 'muted',
  };
  return colors[status] || 'muted';
}

/**
 * Get commodity display name
 */
export function getCommodityLabel(category: string): string {
  const labels: Record<string, string> = {
    POTATO: 'Potato',
    ONION: 'Onion',
    VEGETABLES: 'Vegetables',
    FRUITS: 'Fruits',
    DAIRY: 'Dairy',
    FROZEN_SEAFOOD: 'Frozen Seafood',
    FROZEN_MEAT: 'Frozen Meat',
    PROCESSED_FOOD: 'Processed Food',
    SEEDS: 'Seeds',
    OTHER: 'Other',
  };
  return labels[category] || category;
}
