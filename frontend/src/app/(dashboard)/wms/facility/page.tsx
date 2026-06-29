'use client';

import React, { useEffect, useState } from 'react';
import { Factory, Snowflake, Package, LayoutGrid, CheckCircle, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';
import { formatPercent, formatDate, getCommodityLabel } from '@/lib/formatters';
import styles from './facility.module.css';

export default function FacilityPage() {
  const [facility, setFacility] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacility();
  }, []);

  const loadFacility = async () => {
    try {
      // Get the user's facility — for owners, get their assigned facility
      const facilitiesRes = await api.get<any>('/facilities');
      if (facilitiesRes.success && facilitiesRes.data?.length > 0) {
        const f = facilitiesRes.data[0]; // First facility for the owner
        setFacility(f);
      }
    } catch (err) {
      console.error('Failed to load facility:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Facility Overview" subtitle="Loading..." />
        <main className={styles.content}>
          <div className={styles.loadingGrid}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        </main>
      </>
    );
  }

  if (!facility) {
    return (
      <>
        <Header title="Facility Overview" subtitle="No facility assigned" />
        <main className={styles.content}>
          <Card padding="lg">
            <div className={styles.emptyState}>
              <Factory size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: 'var(--space-4)' }} />
              <h3>No Facility Found</h3>
              <p>You don&apos;t have a facility assigned to your account yet. Contact the platform administrator.</p>
            </div>
          </Card>
        </main>
      </>
    );
  }

  const totalCap = Number(facility.totalCapacityMt || 0);
  const chamberCount = facility._count?.chambers ?? facility.chambers?.length ?? 0;

  return (
    <>
      <Header
        title={facility.name}
        subtitle={`${facility.city}, ${facility.state} — ${facility.registrationNumber || 'Unregistered'}`}
      />

      <main className={styles.content}>
        {/* Facility Stats */}
        <div className={`${styles.statsGrid} stagger-in`}>
          <StatsCard title="Storage Type" value={facility.storageType || '—'} icon={<Snowflake size={20} />} variant="primary" />
          <StatsCard title="Total Capacity" value={`${totalCap.toLocaleString()} MT`} icon={<Package size={20} />} variant="accent" />
          <StatsCard title="Chambers" value={chamberCount} icon={<LayoutGrid size={20} />} variant="info" />
          <StatsCard title="Status" value={facility.status?.replace(/_/g, ' ') || '—'} icon={facility.status === 'ACTIVE' ? <CheckCircle size={20} /> : <Clock size={20} />} variant={facility.status === 'ACTIVE' ? 'accent' : 'warning'} />
        </div>

        {/* Facility Details Cards */}
        <div className={styles.detailGrid}>
          {/* Location & Contact */}
          <Card padding="md">
            <CardHeader title="Location & Address" />
            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Address</span>
                <span className={styles.detailValue}>
                  {[facility.addressLine1, facility.addressLine2].filter(Boolean).join(', ') || '—'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>City</span>
                <span className={styles.detailValue}>{facility.city}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>District</span>
                <span className={styles.detailValue}>{facility.district || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>State</span>
                <span className={styles.detailValue}>{facility.state}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>PIN Code</span>
                <span className={styles.detailValue}>{facility.pincode || '—'}</span>
              </div>
            </div>
          </Card>

          {/* Registration & Compliance */}
          <Card padding="md">
            <CardHeader title="Registration & Compliance" />
            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Registration #</span>
                <span className={styles.detailValue} style={{ fontFamily: 'var(--font-mono)' }}>
                  {facility.registrationNumber || '—'}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Facility Type</span>
                <Badge variant="muted">{facility.storageType}</Badge>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Registered</span>
                <span className={styles.detailValue}>{formatDate(facility.createdAt)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Last Updated</span>
                <span className={styles.detailValue}>{formatDate(facility.updatedAt)}</span>
              </div>
            </div>
          </Card>

          {/* Commodity Support */}
          <Card padding="md">
            <CardHeader title="Supported Commodities" />
            <div className={styles.commodityTags}>
              {facility.supportedCommodities?.length > 0 ? (
                facility.supportedCommodities.map((c: string) => (
                  <Badge key={c} variant="primary">{getCommodityLabel(c)}</Badge>
                ))
              ) : (
                <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
                  All commodities accepted
                </span>
              )}
            </div>
          </Card>

          {/* Owner Info */}
          <Card padding="md">
            <CardHeader title="Owner Information" />
            <div className={styles.detailList}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Name</span>
                <span className={styles.detailValue}>{facility.owner?.fullName || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Phone</span>
                <span className={styles.detailValue}>{facility.owner?.phone || '—'}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Email</span>
                <span className={styles.detailValue}>{facility.owner?.email || '—'}</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
