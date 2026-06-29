'use client';

import React, { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle, Package } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { StatsCard } from '@/components/ui/StatsCard';
import { api } from '@/lib/api-client';
import { formatCurrency, getCommodityLabel, formatDate } from '@/lib/formatters';
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
  facility?: { name: string };
}

export default function AdminPricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPricing();
  }, []);

  const loadPricing = async () => {
    try {
      const res = await api.get<any>('/pricing');
      if (res.success) setRules(res.data || []);
    } catch (err) {
      console.error('Failed to load pricing:', err);
    } finally {
      setLoading(false);
    }
  };

  const columns: Column<PricingRule>[] = [
    {
      key: 'facility',
      header: 'Facility',
      render: (row) => (
        <span style={{ fontWeight: 500 }}>{row.facility?.name || 'All Facilities'}</span>
      ),
    },
    {
      key: 'commodity',
      header: 'Commodity',
      render: (row) => <span>{getCommodityLabel(row.commodityCategory)}</span>,
    },
    {
      key: 'ratePerMtPerDay',
      header: 'Rate / MT / Day',
      render: (row) => (
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>
          {formatCurrency(row.ratePerMtPerDay)}
        </span>
      ),
    },
    {
      key: 'ratePerBagPerDay',
      header: 'Rate / Bag / Day',
      render: (row) => row.ratePerBagPerDay
        ? <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.ratePerBagPerDay)}</span>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      key: 'handling',
      header: 'Handling / MT',
      render: (row) => row.handlingChargePerMt
        ? <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.handlingChargePerMt)}</span>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      key: 'insurance',
      header: 'Insurance %',
      render: (row) => row.insuranceRatePercent
        ? <Badge variant="info">{Number(row.insuranceRatePercent).toFixed(2)}%</Badge>
        : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      render: (row) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDate(row.effectiveFrom)}</span>,
    },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
  ];

  const activeRules = rules.filter(r => r.status === 'ACTIVE').length;

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

        <Card padding="none">
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Pricing Rules</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>
                Storage rates configured by facility owners
              </p>
            </div>
            <Badge variant="primary">{rules.length} rules</Badge>
          </div>
          <DataTable
            columns={columns}
            data={rules}
            loading={loading}
            emptyMessage="No pricing rules configured yet"
          />
        </Card>
      </main>
    </>
  );
}
