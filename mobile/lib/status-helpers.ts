/**
 * Booking / Order status color helpers.
 * Shared across home dashboard, bookings list, and order detail screens.
 */

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#92400E',
    CONFIRMED: '#1E40AF',
    ARRIVED: '#5B21B6',
    WEIGHING: '#4338CA',
    STORED: '#065F46',
    DISPATCH_REQUESTED: '#9A3412',
    DISPATCHING: '#9D174D',
    DISPATCHED: '#155E75',
    COMPLETED: '#065F46',
    CANCELLED: '#991B1B',
    REJECTED: '#991B1B',
    // Order statuses
    PENDING_APPROVAL: '#92400E',
    APPROVED: '#1E40AF',
    PAYMENT_PENDING: '#B45309',
    PAID: '#065F46',
  };
  return map[status] || '#4B5563';
}

export function getStatusBg(status: string): string {
  const map: Record<string, string> = {
    PENDING: '#FEF3C7',
    CONFIRMED: '#DBEAFE',
    ARRIVED: '#EDE9FE',
    WEIGHING: '#E0E7FF',
    STORED: '#D1FAE5',
    DISPATCH_REQUESTED: '#FFEDD5',
    DISPATCHING: '#FCE7F3',
    DISPATCHED: '#CFFAFE',
    COMPLETED: '#D1FAE5',
    CANCELLED: '#FECACA',
    REJECTED: '#FECACA',
    // Order statuses
    PENDING_APPROVAL: '#FEF3C7',
    APPROVED: '#DBEAFE',
    PAYMENT_PENDING: '#FEF3C7',
    PAID: '#D1FAE5',
  };
  return map[status] || '#F3F4F6';
}

export function getStatusLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function formatTimeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}
