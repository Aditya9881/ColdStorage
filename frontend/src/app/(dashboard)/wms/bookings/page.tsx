'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CalendarCheck, Clock, CheckCircle, XCircle, User, Package,
  Phone, MapPin, Filter, Search, QrCode, Eye,
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApiQuery } from '@/hooks/useApiQuery';
import { api } from '@/lib/api-client';
import { formatDate, formatWeight, getCommodityLabel } from '@/lib/formatters';
import styles from './bookings.module.css';

interface Booking {
  id: string;
  bookingNumber: string;
  status: string;
  commodityCategory: string;
  commodityName: string;
  estimatedWeightKg: number;
  estimatedBags?: number;
  preferredDate: string;
  preferredSlot?: string;
  storageDuration?: number;
  farmerNote?: string;
  ownerNote?: string;
  qrCodeData?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  farmer: { id: string; fullName: string; phone: string; uniqueId?: string };
  facility: { id: string; name: string; city?: string; state?: string };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ARRIVED', label: 'Arrived' },
  { value: 'WEIGHING', label: 'Weighing' },
  { value: 'STORED', label: 'Stored' },
  { value: 'DISPATCH_REQUESTED', label: 'Dispatch Requested' },
  { value: 'DISPATCHED', label: 'Dispatched' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'REJECTED', label: 'Rejected' },
];

const STATUS_VARIANT: Record<string, string> = {
  PENDING: 'warning',
  CONFIRMED: 'info',
  ARRIVED: 'primary',
  WEIGHING: 'primary',
  STORED: 'accent',
  DISPATCH_REQUESTED: 'warning',
  DISPATCHED: 'info',
  COMPLETED: 'accent',
  CANCELLED: 'danger',
  REJECTED: 'danger',
};

export default function BookingsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const queryParams: Record<string, string> = { page: String(page), limit: String(limit) };
  if (statusFilter) queryParams.status = statusFilter;

  const { data, loading, refetch } = useApiQuery<{ bookings: Booking[]; total: number; pages?: number }>(
    '/bookings/facility/mine',
    { params: queryParams }
  );

  const bookings = data?.bookings || [];
  const total = data?.total || 0;
  const totalPages = data?.pages || Math.ceil(total / limit);

  // Client-side search filter (on current page)
  const filtered = searchQuery
    ? bookings.filter(
        (b) =>
          b.bookingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.farmer.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.farmer.phone.includes(searchQuery) ||
          b.commodityName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookings;

  // Reset to page 1 on filter change
  const handleFilterChange = (val: string) => { setStatusFilter(val); setPage(1); };

  const handleAction = async (bookingId: string, status: 'CONFIRMED' | 'REJECTED' | 'ARRIVED' | 'CANCELLED') => {
    setActionLoading(bookingId);
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status });
      showToast(`Booking ${status.toLowerCase()} successfully`, 'success');
      refetch();
      setSelectedBooking(null);
    } catch (err: any) {
      showToast(err.message || 'Action failed', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = bookings.filter((b) => b.status === 'PENDING').length;
  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED').length;
  const arrivedCount = bookings.filter((b) => b.status === 'ARRIVED').length;

  const columns: Column<Booking>[] = [
    {
      key: 'bookingNumber',
      header: 'Booking #',
      render: (row) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
          {row.bookingNumber}
        </span>
      ),
    },
    {
      key: 'farmer',
      header: 'Farmer',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.farmer.fullName}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{row.farmer.phone}</div>
        </div>
      ),
    },
    {
      key: 'commodity',
      header: 'Commodity',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{getCommodityLabel(row.commodityCategory)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{row.commodityName}</div>
        </div>
      ),
    },
    {
      key: 'estimatedWeightKg',
      header: 'Est. Weight',
      render: (row) => (
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontWeight: 600 }}>{formatWeight(row.estimatedWeightKg)}</div>
          {row.estimatedBags && (
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{row.estimatedBags} bags</div>
          )}
        </div>
      ),
    },
    {
      key: 'preferredDate',
      header: 'Preferred Date',
      render: (row) => (
        <span style={{ fontSize: 'var(--text-xs)' }}>{formatDate(row.preferredDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <Badge variant={(STATUS_VARIANT[row.status] || 'default') as any}>
          {row.status.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className={styles.rowActions}>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedBooking(row); }}>
            <Eye size={14} />
          </Button>
          {row.status === 'PENDING' && (
            <>
              <Button
                variant="primary" size="sm"
                loading={actionLoading === row.id}
                onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'CONFIRMED'); }}
              >
                <CheckCircle size={14} />
              </Button>
              <Button
                variant="danger" size="sm"
                disabled={actionLoading === row.id}
                onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'REJECTED'); }}
              >
                <XCircle size={14} />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
    <PageLayout
      title="Bookings"
      subtitle="Manage farmer booking requests for your facility"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Bookings' },
      ]}
    >
        {/* Quick Stats */}
        <div className={styles.quickStats}>
          <div className={`${styles.quickStat} ${styles.statPending}`} onClick={() => handleFilterChange('PENDING')}>
            <Clock size={18} />
            <span className={styles.quickStatValue}>{pendingCount}</span>
            <span className={styles.quickStatLabel}>Pending</span>
          </div>
          <div className={`${styles.quickStat} ${styles.statConfirmed}`} onClick={() => handleFilterChange('CONFIRMED')}>
            <CheckCircle size={18} />
            <span className={styles.quickStatValue}>{confirmedCount}</span>
            <span className={styles.quickStatLabel}>Confirmed</span>
          </div>
          <div className={`${styles.quickStat} ${styles.statArrived}`} onClick={() => handleFilterChange('ARRIVED')}>
            <MapPin size={18} />
            <span className={styles.quickStatValue}>{arrivedCount}</span>
            <span className={styles.quickStatLabel}>Arrived</span>
          </div>
          <div className={`${styles.quickStat} ${styles.statTotal}`} onClick={() => handleFilterChange('')}>
            <CalendarCheck size={18} />
            <span className={styles.quickStatValue}>{total}</span>
            <span className={styles.quickStatLabel}>Total</span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by name, phone, booking #, commodity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select
            className={styles.statusSelect}
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Bookings Table */}
        <Card padding="none">
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            emptyMessage="No bookings found"
            onRowClick={(row) => setSelectedBooking(row)}
            pagination={{
              page,
              limit,
              total,
              totalPages,
              onPageChange: setPage,
              onLimitChange: (newLimit) => { setLimit(newLimit); setPage(1); },
            }}
          />
        </Card>
    </PageLayout>

      {/* ── Booking Detail Modal ── */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title={`Booking ${selectedBooking?.bookingNumber || ''}`}
        size="lg"
        footer={selectedBooking && (
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setSelectedBooking(null)}>Close</Button>
            {selectedBooking.status === 'PENDING' && (
              <>
                <Button variant="danger" icon={<XCircle size={14} />}
                  onClick={() => handleAction(selectedBooking.id, 'REJECTED')}
                  disabled={actionLoading === selectedBooking.id}>
                  Reject
                </Button>
                <Button variant="primary" icon={<CheckCircle size={14} />}
                  onClick={() => handleAction(selectedBooking.id, 'CONFIRMED')}
                  loading={actionLoading === selectedBooking.id}>
                  Confirm Booking
                </Button>
              </>
            )}
            {selectedBooking.status === 'CONFIRMED' && (
              <Button variant="accent" icon={<MapPin size={14} />}
                onClick={() => handleAction(selectedBooking.id, 'ARRIVED')}
                loading={actionLoading === selectedBooking.id}>
                Mark Arrived
              </Button>
            )}
          </div>
        )}
      >
        {selectedBooking && (
          <div className={styles.detailGrid}>
            <div className={styles.detailSection}>
              <h4>Status</h4>
              <Badge variant={(STATUS_VARIANT[selectedBooking.status] || 'default') as any} size="md">
                {selectedBooking.status.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className={styles.detailSection}>
              <h4>Farmer Details</h4>
              <div className={styles.detailField}><User size={14} /> {selectedBooking.farmer.fullName}</div>
              <div className={styles.detailField}><Phone size={14} /> {selectedBooking.farmer.phone}</div>
              {selectedBooking.farmer.uniqueId && (
                <div className={styles.detailField}>ID: {selectedBooking.farmer.uniqueId}</div>
              )}
            </div>

            <div className={styles.detailSection}>
              <h4>Commodity</h4>
              <div className={styles.detailField}><Package size={14} /> {getCommodityLabel(selectedBooking.commodityCategory)}</div>
              <div className={styles.detailField}>Name: {selectedBooking.commodityName}</div>
              <div className={styles.detailField}>Est. Weight: {formatWeight(selectedBooking.estimatedWeightKg)}</div>
              {selectedBooking.estimatedBags && <div className={styles.detailField}>Bags: {selectedBooking.estimatedBags}</div>}
            </div>

            <div className={styles.detailSection}>
              <h4>Schedule</h4>
              <div className={styles.detailField}><CalendarCheck size={14} /> {formatDate(selectedBooking.preferredDate)}</div>
              {selectedBooking.preferredSlot && <div className={styles.detailField}>Slot: {selectedBooking.preferredSlot}</div>}
              {selectedBooking.storageDuration && <div className={styles.detailField}>Duration: {selectedBooking.storageDuration} days</div>}
            </div>

            {selectedBooking.farmerNote && (
              <div className={styles.detailSection}>
                <h4>Farmer Note</h4>
                <p className={styles.noteText}>{selectedBooking.farmerNote}</p>
              </div>
            )}

            <div className={styles.detailSection}>
              <h4>Timeline</h4>
              <div className={styles.detailField}>Created: {formatDate(selectedBooking.createdAt)}</div>
              <div className={styles.detailField}>Updated: {formatDate(selectedBooking.updatedAt)}</div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
