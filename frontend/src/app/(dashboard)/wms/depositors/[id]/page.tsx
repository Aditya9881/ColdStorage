'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Package, Receipt, Phone, Mail, MapPin, Calendar } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { StatsCard } from '@/components/ui/StatsCard';
import { api } from '@/lib/api-client';
import { formatCurrency, formatWeight, formatDate } from '@/lib/formatters';

export default function DepositorDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [depositor, setDepositor] = useState<any>(null);
  const [lots, setLots] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [userRes, lotsRes, invoicesRes] = await Promise.allSettled([
        api.get<any>(`/users/${id}`),
        api.get<any>('/inventory/lots'),
        api.get<any>('/invoices'),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value.success) {
        setDepositor(userRes.value.data);
      }
      if (lotsRes.status === 'fulfilled' && lotsRes.value.success) {
        setLots((lotsRes.value.data || []).filter((l: any) => l.depositorId === id));
      }
      if (invoicesRes.status === 'fulfilled' && invoicesRes.value.success) {
        setInvoices((invoicesRes.value.data || []).filter((i: any) => i.depositorId === id));
      }
    } catch {
      // handle error
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) return <><Header title="Depositor Details" /><main style={{ padding: 'var(--space-6)' }}><p>Loading...</p></main></>;
  if (!depositor) return <><Header title="Depositor Details" /><main style={{ padding: 'var(--space-6)' }}><p>Depositor not found</p></main></>;

  const activeLots = lots.filter(l => l.status === 'STORED' || l.status === 'PARTIALLY_RELEASED');
  const totalStored = activeLots.reduce((s, l) => s + Number(l.currentWeightKg || 0), 0);
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount || 0), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount || 0), 0);

  const lotColumns: Column<any>[] = [
    { key: 'lotNumber', header: 'Lot #', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.lotNumber}</span> },
    { key: 'commodityName', header: 'Commodity' },
    { key: 'currentWeightKg', header: 'Weight', render: (r) => formatWeight(r.currentWeightKg) },
    { key: 'status', header: 'Status', render: (r) => renderStatus(r.status) },
    { key: 'intakeDate', header: 'Intake', render: (r) => <span style={{ fontSize: 'var(--text-xs)' }}>{formatDate(r.intakeDate)}</span> },
  ];

  const invColumns: Column<any>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (r) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{r.invoiceNumber}</span> },
    { key: 'totalAmount', header: 'Amount', render: (r) => formatCurrency(Number(r.totalAmount)) },
    { key: 'paidAmount', header: 'Paid', render: (r) => formatCurrency(Number(r.paidAmount)) },
    { key: 'status', header: 'Status', render: (r) => renderStatus(r.status) },
    { key: 'dueDate', header: 'Due', render: (r) => <span style={{ fontSize: 'var(--text-xs)' }}>{formatDate(r.dueDate)}</span> },
  ];

  return (
    <>
      <Header title="Depositor Details" subtitle={depositor.fullName} />

      <main style={{ padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-5)', maxWidth: 'var(--content-max-width)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', cursor: 'pointer' }} onClick={() => router.push('/wms/depositors')}>
          <ArrowLeft size={14} /> Back to Depositors
        </span>

        {/* Profile Card */}
        <Card padding="lg">
          <div style={{ display: 'flex', gap: 'var(--space-5)', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ width: 72, height: 72, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-primary-500), var(--color-accent-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-2xl)', fontWeight: 700, flexShrink: 0 }}>
              {depositor.fullName.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>{depositor.fullName}</h2>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                <Badge variant="info" size="sm">Farmer</Badge>
                {depositor.registrationNumber && <Badge variant="muted" size="sm">{depositor.registrationNumber}</Badge>}
                <Badge variant={depositor.status === 'ACTIVE' ? 'accent' : 'warning'} size="sm">{depositor.status}</Badge>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={14} /> {depositor.phone}</div>
                {depositor.email && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={14} /> {depositor.email}</div>}
                {depositor.city && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {depositor.city}{depositor.state ? `, ${depositor.state}` : ''}</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={14} /> Joined {formatDate(depositor.createdAt)}</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
          <StatsCard title="Active Lots" value={activeLots.length} icon={<Package size={20} />} variant="primary" />
          <StatsCard title="Stored Weight" value={formatWeight(totalStored)} icon={<Package size={20} />} variant="accent" />
          <StatsCard title="Total Billed" value={formatCurrency(totalRevenue)} icon={<Receipt size={20} />} variant="info" />
          <StatsCard title="Outstanding" value={formatCurrency(totalRevenue - totalPaid)} icon={<Receipt size={20} />} variant={totalRevenue - totalPaid > 0 ? 'danger' : 'accent'} />
        </div>

        {/* Active Lots */}
        <Card padding="none">
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <CardHeader title="Inventory Lots" subtitle={`${lots.length} total lots`} />
          </div>
          <DataTable columns={lotColumns} data={lots} loading={loading} emptyMessage="No lots for this depositor" onRowClick={(r) => router.push(`/wms/inventory/${r.id}`)} />
        </Card>

        {/* Invoice History */}
        <Card padding="none">
          <div style={{ padding: 'var(--space-5) var(--space-5) 0' }}>
            <CardHeader title="Invoice History" subtitle={`${invoices.length} invoices`} />
          </div>
          <DataTable columns={invColumns} data={invoices} loading={loading} emptyMessage="No invoices for this depositor" onRowClick={(r) => router.push(`/wms/invoices/${r.id}`)} />
        </Card>
      </main>
    </>
  );
}
