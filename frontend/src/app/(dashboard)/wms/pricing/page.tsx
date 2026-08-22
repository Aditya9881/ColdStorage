'use client';

import React, { useState } from 'react';
import { ClipboardList, CheckCircle, Package, Plus, Pencil } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatCurrency, getCommodityLabel } from '@/lib/formatters';
import type { Facility } from '@/types/models';
import styles from './pricing.module.css';

const emptyPricingForm = {
  commodityCategory: 'POTATO', ratePerMtPerDay: '', ratePerBagPerDay: '',
  minimumCharge: '', handlingChargePerMt: '', insuranceRatePercent: '',
  effectiveFrom: new Date().toISOString().split('T')[0], effectiveTo: '',
};

export default function WmsPricingPage() {
  const { showToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [form, setForm] = useState(emptyPricingForm);
  const [submitting, setSubmitting] = useState(false);

  // Detect facility
  const { data: facilities } = useApiQuery<Facility[]>('/facilities');
  const facilityId = facilities?.[0]?.id || '';

  // Load pricing rules for facility
  const { data: rulesData, loading, refetch } = useApiQuery<any[]>(
    facilityId ? '/pricing' : null,
    { params: facilityId ? { facilityId } : undefined }
  );
  const rules = rulesData || [];

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.ratePerMtPerDay) { showToast('Rate per MT per day is required', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/pricing', {
        facilityId, commodityCategory: form.commodityCategory,
        ratePerMtPerDay: Number(form.ratePerMtPerDay),
        ratePerBagPerDay: form.ratePerBagPerDay ? Number(form.ratePerBagPerDay) : undefined,
        minimumCharge: form.minimumCharge ? Number(form.minimumCharge) : undefined,
        handlingChargePerMt: form.handlingChargePerMt ? Number(form.handlingChargePerMt) : undefined,
        insuranceRatePercent: form.insuranceRatePercent ? Number(form.insuranceRatePercent) : undefined,
        effectiveFrom: form.effectiveFrom, effectiveUntil: form.effectiveTo || undefined,
      });
      showToast('Pricing rule created', 'success');
      setShowAddModal(false); setForm(emptyPricingForm); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to create pricing rule', 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (rule: any) => {
    setSelectedRule(rule);
    setForm({
      commodityCategory: rule.commodityCategory, ratePerMtPerDay: String(rule.ratePerMtPerDay),
      ratePerBagPerDay: rule.ratePerBagPerDay ? String(rule.ratePerBagPerDay) : '',
      minimumCharge: rule.minimumCharge ? String(rule.minimumCharge) : '',
      handlingChargePerMt: rule.handlingChargePerMt ? String(rule.handlingChargePerMt) : '',
      insuranceRatePercent: rule.insuranceRatePercent ? String(rule.insuranceRatePercent) : '',
      effectiveFrom: rule.effectiveFrom?.split('T')[0] || '', effectiveTo: rule.effectiveUntil?.split('T')[0] || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedRule) return;
    setSubmitting(true);
    try {
      await api.patch(`/pricing/${selectedRule.id}`, {
        ratePerMtPerDay: Number(form.ratePerMtPerDay),
        ratePerBagPerDay: form.ratePerBagPerDay ? Number(form.ratePerBagPerDay) : null,
        handlingChargePerMt: form.handlingChargePerMt ? Number(form.handlingChargePerMt) : null,
        insuranceRatePercent: form.insuranceRatePercent ? Number(form.insuranceRatePercent) : null,
      });
      showToast('Pricing rule updated', 'success');
      setShowEditModal(false); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to update', 'error'); }
    finally { setSubmitting(false); }
  };

  const columns: Column<any>[] = [
    { key: 'commodity', header: 'Commodity', render: (row) => <Badge variant="primary">{getCommodityLabel(row.commodityCategory)}</Badge> },
    { key: 'ratePerMtPerDay', header: 'Rate/MT/Day', render: (row) => <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--color-text-primary)' }}>{formatCurrency(row.ratePerMtPerDay)}</span> },
    { key: 'ratePerBagPerDay', header: 'Rate/Bag/Day', render: (row) => row.ratePerBagPerDay ? <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.ratePerBagPerDay)}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'handling', header: 'Handling/MT', render: (row) => row.handlingChargePerMt ? <span style={{ fontFamily: 'var(--font-mono)' }}>{formatCurrency(row.handlingChargePerMt)}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'insurance', header: 'Insurance', render: (row) => row.insuranceRatePercent ? <Badge variant="info">{Number(row.insuranceRatePercent).toFixed(2)}%</Badge> : <span style={{ color: 'var(--color-text-muted)' }}>—</span> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    { key: 'actions', header: '', render: (row) => <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Pencil size={13} /></Button> },
  ];

  const renderForm = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      <Select label="Commodity *" value={form.commodityCategory} onChange={(e) => handleChange('commodityCategory', e.target.value)} options={[
        { value: 'POTATO', label: 'Potato' }, { value: 'ONION', label: 'Onion' },
        { value: 'VEGETABLES', label: 'Vegetables' }, { value: 'FRUITS', label: 'Fruits' },
        { value: 'DAIRY', label: 'Dairy' }, { value: 'FROZEN_SEAFOOD', label: 'Frozen Seafood' },
        { value: 'SEEDS', label: 'Seeds' }, { value: 'OTHER', label: 'Other' },
      ]} />
      <Input label="Rate per MT per Day" type="number" placeholder="e.g. 3.50" value={form.ratePerMtPerDay} onChange={(e) => handleChange('ratePerMtPerDay', e.target.value)} />
      <Input label="Rate per Bag per Day" type="number" placeholder="e.g. 0.15" value={form.ratePerBagPerDay} onChange={(e) => handleChange('ratePerBagPerDay', e.target.value)} />
      <Input label="Handling Charge per MT" type="number" placeholder="e.g. 50" value={form.handlingChargePerMt} onChange={(e) => handleChange('handlingChargePerMt', e.target.value)} />
      <Input label="Insurance Rate (%)" type="number" placeholder="e.g. 0.5" value={form.insuranceRatePercent} onChange={(e) => handleChange('insuranceRatePercent', e.target.value)} />
      <Input label="Minimum Charge" type="number" placeholder="e.g. 500" value={form.minimumCharge} onChange={(e) => handleChange('minimumCharge', e.target.value)} />
      <Input label="Effective From *" type="date" value={form.effectiveFrom} onChange={(e) => handleChange('effectiveFrom', e.target.value)} />
      <Input label="Effective Until" type="date" value={form.effectiveTo} onChange={(e) => handleChange('effectiveTo', e.target.value)} />
    </div>
  );

  return (
    <>
    <PageLayout
      title="Pricing Configuration"
      subtitle="Manage storage rates for your facility"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Pricing' },
      ]}
      actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setForm(emptyPricingForm); setShowAddModal(true); }}>Add Rate</Button>}
    >
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Rules" value={rules.length} icon={<ClipboardList size={18} />} variant="primary" />
          <StatsCard title="Active" value={rules.filter(r => r.status === 'ACTIVE').length} icon={<CheckCircle size={18} />} variant="accent" />
          <StatsCard title="Commodities" value={new Set(rules.map(r => r.commodityCategory)).size} icon={<Package size={18} />} variant="info" />
        </div>

        <Card padding="none">
          <div style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-border-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontWeight: 600, fontSize: 'var(--text-base)', color: 'var(--color-text-primary)' }}>Pricing Rules</h3>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 2 }}>Storage rates configured for your facility</p>
            </div>
          </div>
          <DataTable columns={columns} data={rules} loading={loading} emptyMessage="No pricing rules configured" />
        </Card>
    </PageLayout>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Pricing Rule" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} loading={submitting}>Create Rule</Button></>}>
        {renderForm()}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Pricing Rule" subtitle={selectedRule ? getCommodityLabel(selectedRule.commodityCategory) : ''} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate} loading={submitting}>Save Changes</Button></>}>
        {renderForm()}
      </Modal>
    </>
  );
}
