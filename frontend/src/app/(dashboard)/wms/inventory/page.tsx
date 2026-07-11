'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Plus, Search } from 'lucide-react';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatWeight, formatDate, formatCurrency, getCommodityLabel } from '@/lib/formatters';
import type { InventoryLot } from '@/types/models';
import styles from './inventory.module.css';

export default function InventoryPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const params: Record<string, string> = {};
  if (statusFilter) params.status = statusFilter;

  const { data: lots, loading } = useApiQuery<InventoryLot[]>('/inventory/lots', { params });
  const lotList = lots || [];

  const filteredLots = search
    ? lotList.filter((l) =>
        l.lotNumber.toLowerCase().includes(search.toLowerCase()) ||
        l.commodityName.toLowerCase().includes(search.toLowerCase()) ||
        l.depositor?.fullName?.toLowerCase().includes(search.toLowerCase())
      )
    : lotList;

  const columns: Column<InventoryLot>[] = [
    {
      key: 'lotNumber',
      header: 'Lot Number',
      render: (row) => (
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>
            {row.lotNumber}
          </span>
          <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
            Receipt: {row.receiptNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'commodity',
      header: 'Commodity',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{getCommodityLabel(row.commodityCategory)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.commodityName}</div>
        </div>
      ),
    },
    {
      key: 'depositor',
      header: 'Depositor',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.depositor?.fullName || '—'}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.depositor?.phone}</div>
        </div>
      ),
    },
    {
      key: 'weight',
      header: 'Current / Intake',
      render: (row) => (
        <div style={{ fontFamily: 'var(--font-mono)' }}>
          <div style={{ fontWeight: 600 }}>{formatWeight(row.currentWeightKg)}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            of {formatWeight(row.intakeWeightKg)}
          </div>
        </div>
      ),
    },
    {
      key: 'bags',
      header: 'Bags',
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.bagCount?.toLocaleString() || '—'}</span>,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (row) => {
        if (!row.qualityGrade) return <span style={{ color: 'var(--color-text-muted)' }}>—</span>;
        const v = row.qualityGrade === 'A' ? 'accent' : row.qualityGrade === 'B' ? 'warning' : 'danger';
        return <Badge variant={v as any}>Grade {row.qualityGrade}</Badge>;
      },
    },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    {
      key: 'intakeDate',
      header: 'Intake Date',
      render: (row) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {formatDate(row.intakeDate)}
        </span>
      ),
    },
  ];

  return (
    <>
      <Header
        title="Inventory Management"
        subtitle="Track and manage stored inventory lots"
        actions={
          <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={() => router.push('/wms/inventory/intake')}>
            New Intake
          </Button>
        }
      />

      <main className={styles.content}>
        <Card padding="none">
          <div className={styles.tableHeader}>
            <div className={styles.filters}>
              <Input
                placeholder="Search by lot, commodity, depositor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
              />
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'STORED', label: 'Stored' },
                  { value: 'PARTIALLY_RELEASED', label: 'Partially Released' },
                  { value: 'FULLY_RELEASED', label: 'Fully Released' },
                  { value: 'INTAKE_PENDING', label: 'Intake Pending' },
                ]}
              />
            </div>
            <div className={styles.summary}>
              <Badge variant="accent">{filteredLots.length} lots</Badge>
              <Badge variant="primary">
                {formatWeight(filteredLots.reduce((s, l) => s + l.currentWeightKg, 0))} stored
              </Badge>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={filteredLots}
            loading={loading}
            emptyMessage="No inventory lots found"
            onRowClick={(row) => router.push(`/wms/inventory/${row.id}`)}
          />
        </Card>
      </main>
    </>
  );
}
