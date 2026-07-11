'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CreditCard, FileDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, formatDate } from '@/lib/formatters';
import styles from './invoice-detail.module.css';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: invoice, loading, refetch } = useApiQuery<any>(
    id ? `/invoices/${id}` : null
  );
  const [showPayForm, setShowPayForm] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [paySuccess, setPaySuccess] = useState('');
  const [payForm, setPayForm] = useState({ amount: '', paymentMethod: 'UPI', referenceNumber: '', notes: '' });

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError(''); setPaySuccess(''); setPayLoading(true);
    try {
      const res = await api.post<any>(`/invoices/${id}/payments`, {
        amount: Number(payForm.amount),
        paymentMethod: payForm.paymentMethod,
        referenceNumber: payForm.referenceNumber,
        notes: payForm.notes,
      });
      if (res.success) {
        setPaySuccess('Payment recorded successfully');
        setPayForm({ amount: '', paymentMethod: 'UPI', referenceNumber: '', notes: '' });
        setShowPayForm(false);
        refetch();
      }
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : 'Failed to record payment');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading) return <><Header title="Invoice Details" /><main className={styles.content}><p>Loading...</p></main></>;
  if (!invoice) return <><Header title="Invoice Details" /><main className={styles.content}><p>Invoice not found</p></main></>;

  const total = Number(invoice.totalAmount);
  const paid = Number(invoice.paidAmount);
  const balance = total - paid;
  const paidPercent = total > 0 ? (paid / total) * 100 : 0;

  const statusVariant = invoice.status === 'PAID' ? 'accent' : invoice.status === 'PARTIALLY_PAID' ? 'warning' : invoice.status === 'OVERDUE' ? 'danger' : 'info';

  return (
    <>
      <Header title="Invoice Details" subtitle={invoice.invoiceNumber} />

      <main className={styles.content}>
        <span className={styles.backLink} onClick={() => router.push('/wms/invoices')}>
          <ArrowLeft size={14} /> Back to Invoices
        </span>

        {paySuccess && <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid var(--color-accent-500)', borderRadius: 'var(--radius-lg)', color: 'var(--color-accent-500)', fontSize: 'var(--text-sm)', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={14} /> {paySuccess}</div>}

        {/* Invoice Summary */}
        <Card padding="lg">
          <div className={styles.invoiceHeader}>
            <div>
              <div className={styles.invoiceTitle}>{invoice.invoiceNumber}</div>
              <Badge variant={statusVariant as any} size="sm">{invoice.status.replace(/_/g, ' ')}</Badge>
            </div>
            <div className={styles.actions}>
              <Button variant="secondary" size="sm" icon={<FileDown size={14} />} onClick={() => {
                const token = localStorage.getItem('accessToken');
                window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/invoices/${id}/pdf?token=${token}`, '_blank');
              }}>
                Download PDF
              </Button>
              {invoice.status !== 'PAID' && (
                <Button variant="accent" size="sm" icon={<CreditCard size={14} />} onClick={() => setShowPayForm(!showPayForm)}>
                  Record Payment
                </Button>
              )}
            </div>
          </div>

          <div className={styles.invoiceMeta}>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Depositor</span><span className={styles.metaValue}>{invoice.depositor?.fullName}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Facility</span><span className={styles.metaValue}>{invoice.facility?.name}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Lot</span><span className={styles.metaValue}>{invoice.lot?.lotNumber || '—'}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Issue Date</span><span className={styles.metaValue}>{formatDate(invoice.issueDate)}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Due Date</span><span className={styles.metaValue}>{formatDate(invoice.dueDate)}</span></div>
            <div className={styles.metaItem}><span className={styles.metaLabel}>Billing Period</span><span className={styles.metaValue}>{invoice.billingPeriodStart ? `${formatDate(invoice.billingPeriodStart)} – ${formatDate(invoice.billingPeriodEnd)}` : '—'}</span></div>
          </div>

          {/* Payment Progress */}
          <div className={styles.progressWrap}>
            <div className={styles.progressLabel}>
              <span>Paid: {formatCurrency(paid)}</span>
              <span>Balance: {formatCurrency(balance)}</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{
                width: `${paidPercent}%`,
                background: paidPercent >= 100 ? 'var(--color-accent-500)' : paidPercent > 0 ? 'var(--color-warning-500)' : 'var(--color-danger-500)',
              }} />
            </div>
          </div>
        </Card>

        {/* Record Payment Form */}
        {showPayForm && (
          <Card padding="lg">
            <CardHeader title="Record Payment" subtitle={`Outstanding balance: ${formatCurrency(balance)}`} />
            {payError && <div style={{ padding: '8px 12px', background: 'rgba(244,62,92,0.1)', border: '1px solid var(--color-danger-500)', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger-500)', fontSize: 'var(--text-sm)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><AlertTriangle size={14} /> {payError}</div>}
            <form onSubmit={handlePayment} className={styles.paymentForm}>
              <div className={styles.paymentFormRow}>
                <Input label="Amount (₹)" type="number" step="0.01" max={balance} value={payForm.amount} onChange={(e) => setPayForm(p => ({ ...p, amount: e.target.value }))} required />
                <Select label="Payment Method" value={payForm.paymentMethod} onChange={(e) => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))} options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'UPI', label: 'UPI' },
                  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
                  { value: 'CHEQUE', label: 'Cheque' },
                ]} />
              </div>
              <Input label="Reference / Transaction ID" value={payForm.referenceNumber} onChange={(e) => setPayForm(p => ({ ...p, referenceNumber: e.target.value }))} placeholder="e.g. UPI txn ID, cheque number..." />
              <Input label="Notes (optional)" value={payForm.notes} onChange={(e) => setPayForm(p => ({ ...p, notes: e.target.value }))} />
              <div className={styles.paymentFormActions}>
                <Button variant="secondary" type="button" onClick={() => setShowPayForm(false)}>Cancel</Button>
                <Button variant="accent" type="submit" loading={payLoading}>Record Payment</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Line Items */}
        <Card padding="md">
          <CardHeader title="Line Items" />
          <table className={styles.lineItemsTable}>
            <thead>
              <tr><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              {invoice.lineItems?.map((item: any) => (
                <tr key={item.id}>
                  <td>{item.description}</td>
                  <td>{Number(item.quantity)}</td>
                  <td className={styles.amount}>{formatCurrency(Number(item.unitPrice))}</td>
                  <td className={styles.amount}>{formatCurrency(Number(item.totalPrice))}</td>
                </tr>
              ))}
              <tr><td colSpan={3} style={{ textAlign: 'right' }}>Subtotal</td><td className={styles.amount}>{formatCurrency(Number(invoice.subtotal))}</td></tr>
              <tr><td colSpan={3} style={{ textAlign: 'right' }}>Tax (GST)</td><td className={styles.amount}>{formatCurrency(Number(invoice.taxAmount))}</td></tr>
              <tr className={styles.totalRow}><td colSpan={3} style={{ textAlign: 'right' }}>Total</td><td className={styles.amount}>{formatCurrency(total)}</td></tr>
            </tbody>
          </table>
        </Card>

        {/* Payment History */}
        <Card padding="md">
          <CardHeader title="Payment History" subtitle={`${invoice.payments?.length || 0} payments recorded`} />
          {invoice.payments?.length > 0 ? (
            <div className={styles.paymentsList}>
              {invoice.payments.map((p: any) => (
                <div key={p.id} className={styles.paymentItem}>
                  <div className={styles.paymentInfo}>
                    <span className={styles.paymentAmount}>{formatCurrency(Number(p.amount))}</span>
                    <span className={styles.paymentMeta}>{p.recordedBy?.fullName} • {formatDate(p.paidAt)}{p.referenceNumber ? ` • Ref: ${p.referenceNumber}` : ''}</span>
                  </div>
                  <span className={styles.paymentMethod}>{p.paymentMethod.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyPayments}>No payments recorded yet</div>
          )}
        </Card>
      </main>
    </>
  );
}
