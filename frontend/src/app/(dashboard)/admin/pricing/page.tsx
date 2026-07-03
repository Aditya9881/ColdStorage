'use client';

import React from 'react';
import { ClipboardList, CheckCircle, Package, Building2, MapPin } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, getCommodityLabel } from '@/lib/formatters';
import styles from './pricing.module.css';

interface PricingRule {
  id: string;
  facilityId: string;
  commodityCategory: string;
  ratePerMtPerDay: number | string;
  ratePerBagPerDay?: number | string;
  minimumCharge?: number | string;
  insuranceRatePercent?: number | string;
  handlingChargePerMt?: number | string;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
  facility?: { id: string; name: string; city?: string; state?: string };
}

export default function AdminPricingPage() {
  const { data: rulesData, loading } = useApiQuery<PricingRule[]>('/pricing');
  const rules = rulesData || [];

  const activeRules = rules.filter(r => r.status === 'ACTIVE').length;

  // Group rules by facility
  const groupedRules = React.useMemo(() => {
    const groups: Record<string, {
      facilityId: string;
      facilityName: string;
      city: string;
      state: string;
      rules: PricingRule[];
    }> = {};

    rules.forEach((rule) => {
      const facility = rule.facility || { id: 'all', name: 'All Facilities', city: '—', state: '—' };
      const fId = facility.id || 'all';
      const fName = facility.name || 'All Facilities';
      const fCity = facility.city || '—';
      const fState = facility.state || '—';

      if (!groups[fId]) {
        groups[fId] = {
          facilityId: fId,
          facilityName: fName,
          city: fCity,
          state: fState,
          rules: [],
        };
      }
      groups[fId].rules.push(rule);
    });

    return Object.values(groups);
  }, [rules]);

  return (
    <>
      <Header
        title="Pricing Management"
        subtitle="Review and manage storage rates across all facilities"
      />
      <main className={styles.content}>
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Rules" value={rules.length} icon={<ClipboardList size={18} />} variant="primary" />
          <StatsCard title="Active" value={activeRules} icon={<CheckCircle size={18} />} variant="accent" />
          <StatsCard title="Commodities" value={new Set(rules.map(r => r.commodityCategory)).size} icon={<Package size={18} />} variant="info" />
        </div>

        <div className={styles.sectionHeader}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, color: 'var(--color-text-primary)' }}>Grouped by Cold Storage Facility</h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
            Overview of configured commodity storage rates and handling charges per warehouse
          </p>
        </div>

        {loading ? (
          <div className={styles.facilityGrid}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : groupedRules.length === 0 ? (
          <Card padding="lg">
            <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No pricing rules configured yet</p>
          </Card>
        ) : (
          <div className={styles.facilityGrid}>
            {groupedRules.map((group) => (
              <div key={group.facilityId} className={styles.facilityCard}>
                <div className={styles.facilityCardHeader}>
                  <div>
                    <h3 className={styles.facilityName}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Building2 size={16} style={{ color: 'var(--color-primary-500)' }} />
                        {group.facilityName}
                      </span>
                    </h3>
                    <span className={styles.facilityLocation}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', verticalAlign: 'middle' }}>
                        <MapPin size={12} />
                        {group.city}, {group.state}
                      </span>
                    </span>
                  </div>
                  <Badge variant="accent">{group.rules.length} Rates</Badge>
                </div>

                <div className={styles.ratesContainer}>
                  {group.rules.map((rule) => (
                    <div key={rule.id} className={styles.rateRow}>
                      <div className={styles.commodityInfo}>
                        <Badge variant="primary">{getCommodityLabel(rule.commodityCategory)}</Badge>
                        {rule.status !== 'ACTIVE' && (
                          <Badge variant="muted" size="sm">{rule.status.toLowerCase()}</Badge>
                        )}
                      </div>
                      <div className={styles.rateDetails}>
                        <span className={styles.rateValue}>{formatCurrency(rule.ratePerMtPerDay)}</span>
                        <span className={styles.rateUnit}>/MT/day</span>
                        
                        {rule.ratePerBagPerDay && (
                          <span className={styles.rateSub}>({formatCurrency(rule.ratePerBagPerDay)}/bag/day)</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
