'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Receipt, CheckCircle, Clock, AlertTriangle, Coins, X, FilePlus } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Invoice } from '@/types/models';
import styles from './invoices.module.css';

export default function InvoicesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filterParams: Record<string, string> = {};
  if (statusFilter) filterParams.status = statusFilter;

  const { data: invoiceData, loading, refetch } = useApiQuery<Invoice[]>('/invoices', { params: filterParams });
  const invoices = invoiceData || [];

  const openPay = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(String(Number(inv.totalAmount) - Number(inv.paidAmount)));
    setShowPayModal(true);
  };

  const handlePayment = async () => {
    if (!selectedInvoice || !payAmount) return;
    setSubmitting(true);
    try {
      const newPaid = Number(selectedInvoice.paidAmount) + Number(payAmount);
      const newStatus = newPaid >= Number(selectedInvoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
      await api.patch(`/invoices/${selectedInvoice.id}/status`, { paidAmount: newPaid, status: newStatus });
      showToast(`Payment of ${formatCurrency(payAmount)} recorded for ${selectedInvoice.invoiceNumber}`, 'success');
      setShowPayModal(false); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to record payment', 'error'); }
    finally { setSubmitting(false); }
  };

  const cancelInvoice = async (inv: Invoice) => {
    try {
      await api.patch(`/invoices/${inv.id}/status`, { status: 'CANCELLED' });
      showToast(`Invoice ${inv.invoiceNumber} cancelled`, 'warning'); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to cancel', 'error'); }
  };

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice #', render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 'var(--text-xs)' }}>{row.invoiceNumber}</span> },
    { key: 'depositor', header: 'Depositor', render: (row) => (<div><div style={{ fontWeight: 500 }}>{row.depositor?.fullName || '—'}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.depositor?.phone}</div></div>) },
    { key: 'lot', header: 'Lot', render: (row) => row.lot ? (<div><div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>{row.lot.lotNumber}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.lot.commodityName}</div></div>) : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'totalAmount', header: 'Amount', render: (row) => <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(row.totalAmount)}</span> },
    { key: 'paidAmount', header: 'Paid', render: (row) => <span style={{ fontFamily: 'var(--font-mono)', color: Number(row.paidAmount) >= Number(row.totalAmount) ? 'var(--color-accent-500)' : 'var(--color-text-secondary)' }}>{formatCurrency(row.paidAmount)}</span> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    { key: 'dueDate', header: 'Due', render: (row) => { const od = new Date(row.dueDate) < new Date() && row.status !== 'PAID' && row.status !== 'CANCELLED'; return <span style={{ fontSize: 'var(--text-xs)', color: od ? 'var(--color-danger-500)' : 'var(--color-text-tertiary)', fontWeight: od ? 600 : 400 }}>{formatDate(row.dueDate)}</span>; } },
    { key: 'actions', header: '', render: (row) => (
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        {row.status !== 'PAID' && row.status !== 'CANCELLED' && <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); openPay(row); }}><Coins size={13} /></Button>}
        {row.status !== 'CANCELLED' && row.status !== 'PAID' && <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); cancelInvoice(row); }}><X size={13} /></Button>}
      </div>
    )},
  ];

  const totalRevenue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPaid = invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
  const overdue = invoices.filter((i) => i.status === 'OVERDUE').length;
  const pending = invoices.filter((i) => i.status === 'ISSUED' || i.status === 'DRAFT').length;

  return (
    <>
      <Header title="Invoices" subtitle="Manage billing and payments"
        actions={<Button variant="primary" size="sm" icon={<FilePlus size={14} />} onClick={() => router.push('/wms/invoices/create')}>Create Invoice</Button>} />

      <main className={styles.content}>
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Billed" value={formatCurrency(totalRevenue)} icon={<Coins size={18} />} variant="primary" />
          <StatsCard title="Collected" value={formatCurrency(totalPaid)} icon={<CheckCircle size={18} />} variant="accent" />
          <StatsCard title="Pending" value={pending} icon={<Clock size={18} />} variant="warning" />
          <StatsCard title="Overdue" value={overdue} icon={<AlertTriangle size={18} />} variant="danger" />
        </div>

        <Card padding="none">
          <div className={styles.tableHeader}>
            <div className={styles.filters}>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
                { value: '', label: 'All Statuses' }, { value: 'DRAFT', label: 'Draft' },
                { value: 'ISSUED', label: 'Issued' }, { value: 'PAID', label: 'Paid' },
                { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
                { value: 'OVERDUE', label: 'Overdue' }, { value: 'CANCELLED', label: 'Cancelled' },
              ]} />
            </div>
            <Badge variant="muted">{invoices.length} invoices</Badge>
          </div>
          <DataTable columns={columns} data={invoices} loading={loading} emptyMessage="No invoices yet — create your first invoice" onRowClick={(row) => router.push(`/wms/invoices/${row.id}`)} />
        </Card>
      </main>

      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" subtitle={selectedInvoice?.invoiceNumber} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowPayModal(false)}>Cancel</Button><Button variant="accent" onClick={handlePayment} loading={submitting}>Record Payment</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ padding: 'var(--space-3)', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>Total</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{formatCurrency(selectedInvoice?.totalAmount || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-sm)' }}>Paid</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent-500)' }}>{formatCurrency(selectedInvoice?.paidAmount || 0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border-secondary)', paddingTop: 'var(--space-2)' }}>
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Balance</span>
              <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-danger-500)' }}>
                {formatCurrency(Number(selectedInvoice?.totalAmount || 0) - Number(selectedInvoice?.paidAmount || 0))}
              </span>
            </div>
          </div>
          <Input label="Payment Amount" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
