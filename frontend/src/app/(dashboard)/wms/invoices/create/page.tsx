'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import styles from './create.module.css';

export default function CreateInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lots, setLots] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);

  const [form, setForm] = useState({
    lotId: '',
    pricingRuleId: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    notes: '',
  });

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    try {
      const [lotsRes, pricingRes] = await Promise.allSettled([
        api.get<any>('/inventory/lots', { status: 'STORED' }),
        api.get<any>('/pricing'),
      ]);
      if (lotsRes.status === 'fulfilled' && lotsRes.value.success) {
        setLots(lotsRes.value.data || []);
      }
      if (pricingRes.status === 'fulfilled' && pricingRes.value.success) {
        setPricing(pricingRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const selectedLot = lots.find(l => l.id === form.lotId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (!selectedLot) {
        setError('Please select an inventory lot');
        setLoading(false);
        return;
      }

      // Calculate billing days
      const start = new Date(form.billingPeriodStart);
      const end = new Date(form.billingPeriodEnd);
      const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

      // Find applicable pricing
      const rule = form.pricingRuleId ? pricing.find((p: any) => p.id === form.pricingRuleId) : pricing[0];
      const ratePerMtPerDay = rule ? Number(rule.rateAmount) : 3.5;
      const weightMt = Number(selectedLot.currentWeightKg) / 1000;

      // Validate rate is a valid number
      if (isNaN(ratePerMtPerDay) || ratePerMtPerDay <= 0) {
        setError('Invalid pricing rate. Please select a valid pricing rule or create one first.');
        setLoading(false);
        return;
      }

      // Build line items
      const lineItems = [
        {
          description: `Storage rent for ${selectedLot.commodityName} (${weightMt.toFixed(1)} MT × ${days} days × ₹${ratePerMtPerDay}/MT/day)`,
          quantity: days,
          unitPrice: Math.round(weightMt * ratePerMtPerDay * 100) / 100,
        },
      ];

      const dueDate = new Date(end);
      dueDate.setDate(dueDate.getDate() + 15); // 15-day payment window

      const payload = {
        facilityId: selectedLot.facilityId,
        depositorId: selectedLot.depositorId,
        lotId: form.lotId,
        lineItems,
        taxRate: 0.18, // 18% GST
        billingPeriodStart: form.billingPeriodStart,
        billingPeriodEnd: form.billingPeriodEnd,
        dueDate: dueDate.toISOString(),
      };

      const res = await api.post<any>('/invoices', payload);
      if (res.success) {
        setSuccess(`Invoice ${res.data.invoiceNumber} created successfully!`);
        setTimeout(() => router.push('/wms/invoices'), 2000);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create invoice. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Create Invoice"
      subtitle="Generate a storage rent invoice for a depositor"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Invoices', href: '/wms/invoices' },
        { label: 'Create' },
      ]}
    >
        <Card padding="lg">
          <CardHeader title="Invoice Details" subtitle="Select a lot and billing period to generate an invoice" />

          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={16} /> <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.successBanner}>
              <CheckCircle size={16} /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              {/* Lot Selection */}
              <div className={styles.fullWidth}>
                <Select
                  label="Inventory Lot *"
                  value={form.lotId}
                  onChange={(e) => handleChange('lotId', e.target.value)}
                  options={[
                    { value: '', label: 'Select an inventory lot...' },
                    ...lots.map((l) => ({
                      value: l.id,
                      label: `${l.lotNumber} — ${l.commodityName} (${l.depositor?.fullName || 'Unknown'}) — ${Number(l.currentWeightKg / 1000).toFixed(1)} MT`,
                    })),
                  ]}
                />
              </div>

              {/* Selected Lot Info */}
              {selectedLot && (
                <div className={`${styles.fullWidth} ${styles.lotPreview}`}>
                  <div className={styles.lotPreviewGrid}>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Depositor</span>
                      <span className={styles.previewValue}>{selectedLot.depositor?.fullName}</span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Commodity</span>
                      <span className={styles.previewValue}>{selectedLot.commodityName}</span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Weight</span>
                      <span className={styles.previewValue}>{(Number(selectedLot.currentWeightKg) / 1000).toFixed(1)} MT</span>
                    </div>
                    <div className={styles.previewItem}>
                      <span className={styles.previewLabel}>Bags</span>
                      <span className={styles.previewValue}>{selectedLot.bagCount?.toLocaleString() || '—'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pricing Rule */}
              <Select
                label="Pricing Rule"
                value={form.pricingRuleId}
                onChange={(e) => handleChange('pricingRuleId', e.target.value)}
                options={[
                  { value: '', label: 'Auto-detect pricing...' },
                  ...pricing.map((p) => ({
                    value: p.id,
                    label: `${p.commodityCategory} — ₹${Number(p.rateAmount).toFixed(2)}/MT/day (${p.pricingModel})`,
                  })),
                ]}
              />

              <div /> {/* spacer for grid alignment */}

              {/* Billing Period */}
              <Input
                label="Billing Period Start *"
                type="date"
                value={form.billingPeriodStart}
                onChange={(e) => handleChange('billingPeriodStart', e.target.value)}
                required
              />

              <Input
                label="Billing Period End *"
                type="date"
                value={form.billingPeriodEnd}
                onChange={(e) => handleChange('billingPeriodEnd', e.target.value)}
                required
              />

              <div className={styles.fullWidth}>
                <Input
                  label="Notes (Optional)"
                  placeholder="Any additional notes for this invoice..."
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading} size="lg">
                Generate Invoice
              </Button>
            </div>
          </form>
        </Card>
    </PageLayout>
  );
}
