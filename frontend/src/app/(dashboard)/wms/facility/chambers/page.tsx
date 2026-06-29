'use client';

import React, { useEffect, useState } from 'react';
import { Boxes, CheckCircle, Package, BarChart, Wrench, Pencil, Plus, XCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { formatPercent, getCommodityLabel } from '@/lib/formatters';
import type { Chamber } from '@/types/models';
import styles from './chambers.module.css';

const emptyChamberForm = {
  chamberNumber: '', name: '', capacityMt: '', targetTempMin: '', targetTempMax: '',
  targetHumidityMin: '', targetHumidityMax: '', commodityCategory: '', storageType: 'BAG', status: 'OPERATIONAL',
};

export default function ChambersPage() {
  const { showToast } = useToast();
  const [chambers, setChambers] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState(true);
  const [facilityId, setFacilityId] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);
  const [form, setForm] = useState(emptyChamberForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { detectFacility(); }, []);

  const detectFacility = async () => {
    try {
      const res = await api.get<any>('/facilities');
      if (res.success && res.data?.length > 0) { setFacilityId(res.data[0].id); loadChambers(res.data[0].id); }
      else { setLoading(false); }
    } catch { setLoading(false); }
  };

  const loadChambers = async (fId?: string) => {
    try {
      const id = fId || facilityId;
      if (!id) return;
      const res = await api.get<any>('/chambers', { facilityId: id });
      if (res.success) setChambers(res.data || []);
    } catch (err) { console.error('Failed to load chambers:', err); }
    finally { setLoading(false); }
  };

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.chamberNumber || !form.capacityMt) { showToast('Chamber number and capacity are required', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/chambers', {
        facilityId, chamberNumber: form.chamberNumber, name: form.name || undefined,
        capacityMt: Number(form.capacityMt),
        targetTempMin: form.targetTempMin ? Number(form.targetTempMin) : undefined,
        targetTempMax: form.targetTempMax ? Number(form.targetTempMax) : undefined,
        commodityCategory: form.commodityCategory || undefined, storageType: form.storageType,
      });
      showToast(`Chamber ${form.chamberNumber} created`, 'success');
      setShowAddModal(false); setForm(emptyChamberForm); loadChambers();
    } catch (err: any) { showToast(err.message || 'Failed to create chamber', 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (ch: Chamber) => {
    setSelectedChamber(ch);
    setForm({
      chamberNumber: ch.chamberNumber, name: ch.name || '', capacityMt: String(ch.capacityMt),
      targetTempMin: ch.targetTempMin != null ? String(ch.targetTempMin) : '',
      targetTempMax: ch.targetTempMax != null ? String(ch.targetTempMax) : '',
      targetHumidityMin: ch.targetHumidityMin != null ? String(ch.targetHumidityMin) : '',
      targetHumidityMax: ch.targetHumidityMax != null ? String(ch.targetHumidityMax) : '',
      commodityCategory: ch.commodityCategory || '', storageType: ch.storageType, status: ch.status,
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedChamber) return;
    setSubmitting(true);
    try {
      await api.patch(`/chambers/${selectedChamber.id}`, {
        name: form.name || null, capacityMt: Number(form.capacityMt),
        targetTempMin: form.targetTempMin ? Number(form.targetTempMin) : null,
        targetTempMax: form.targetTempMax ? Number(form.targetTempMax) : null,
        commodityCategory: form.commodityCategory || null, status: form.status,
      });
      showToast(`Chamber ${form.chamberNumber} updated`, 'success');
      setShowEditModal(false); loadChambers();
    } catch (err: any) { showToast(err.message || 'Failed to update chamber', 'error'); }
    finally { setSubmitting(false); }
  };

  const totalCap = chambers.reduce((s, c) => s + Number(c.capacityMt || 0), 0);
  const totalOcc = chambers.reduce((s, c) => s + Number(c.occupiedMt || 0), 0);
  const utilization = totalCap > 0 ? (totalOcc / totalCap) * 100 : 0;

  const renderForm = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
      <Input label="Chamber Number *" placeholder="e.g. CH-01" value={form.chamberNumber} onChange={(e) => handleChange('chamberNumber', e.target.value)} />
      <Input label="Name" placeholder="e.g. Main Cold Room" value={form.name} onChange={(e) => handleChange('name', e.target.value)} />
      <Input label="Capacity (MT) *" type="number" placeholder="e.g. 2500" value={form.capacityMt} onChange={(e) => handleChange('capacityMt', e.target.value)} />
      <Select label="Storage Type" value={form.storageType} onChange={(e) => handleChange('storageType', e.target.value)} options={[
        { value: 'BAG', label: 'Bag' }, { value: 'BULK', label: 'Bulk' }, { value: 'HYBRID', label: 'Hybrid' },
      ]} />
      <Input label="Min Temp (°C)" type="number" placeholder="e.g. -2" value={form.targetTempMin} onChange={(e) => handleChange('targetTempMin', e.target.value)} />
      <Input label="Max Temp (°C)" type="number" placeholder="e.g. 4" value={form.targetTempMax} onChange={(e) => handleChange('targetTempMax', e.target.value)} />
      <Select label="Commodity" value={form.commodityCategory} onChange={(e) => handleChange('commodityCategory', e.target.value)} options={[
        { value: '', label: 'Any / Multi-commodity' }, { value: 'POTATO', label: 'Potato' },
        { value: 'ONION', label: 'Onion' }, { value: 'VEGETABLES', label: 'Vegetables' },
        { value: 'FRUITS', label: 'Fruits' }, { value: 'DAIRY', label: 'Dairy' },
        { value: 'FROZEN_SEAFOOD', label: 'Frozen Seafood' }, { value: 'SEEDS', label: 'Seeds' },
        { value: 'OTHER', label: 'Other' },
      ]} />
      {showEditModal && (
        <Select label="Status" value={form.status} onChange={(e) => handleChange('status', e.target.value)} options={[
          { value: 'OPERATIONAL', label: 'Operational' }, { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'OFFLINE', label: 'Offline' },
        ]} />
      )}
    </div>
  );

  return (
    <>
      <Header title="Chamber Management" subtitle="Configure and monitor storage chambers"
        actions={<Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setForm(emptyChamberForm); setShowAddModal(true); }}>Add Chamber</Button>} />

      <main className={styles.content}>
        <div className={`${styles.statsGrid} stagger-in`}>
          <StatsCard title="Total Chambers" value={chambers.length} icon={<Boxes size={18} />} variant="primary" />
          <StatsCard title="Operational" value={chambers.filter(c => c.status === 'OPERATIONAL').length} icon={<CheckCircle size={18} />} variant="accent" />
          <StatsCard title="Total Capacity" value={`${totalCap.toLocaleString()} MT`} icon={<Package size={18} />} variant="info" />
          <StatsCard title="Utilization" value={formatPercent(utilization)} icon={<BarChart size={18} />} variant={utilization > 80 ? 'danger' : 'accent'} />
        </div>

        <div className={styles.chamberGrid}>
          {chambers.map((ch) => {
            const cap = Number(ch.capacityMt || 0);
            const occ = Number(ch.occupiedMt || 0);
            const pct = cap > 0 ? (occ / cap) * 100 : 0;
            return (
              <Card key={ch.id} padding="none" className={styles.chamberCard}>
                <div className={styles.chamberHeader}>
                  <div>
                    <h3 className={styles.chamberTitle}>{ch.chamberNumber}</h3>
                    {ch.name && <p className={styles.chamberName}>{ch.name}</p>}
                  </div>
                  <Badge variant={ch.status === 'OPERATIONAL' ? 'accent' : ch.status === 'MAINTENANCE' ? 'warning' : 'danger'} dot>
                    {ch.status.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className={styles.gaugeSection}>
                  <div className={styles.gaugeCircle}>
                    <svg viewBox="0 0 100 100" className={styles.gaugeSvg}>
                      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-bg-tertiary)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="42" fill="none"
                        stroke={pct > 80 ? 'var(--color-danger-500)' : pct > 50 ? 'var(--color-warning-500)' : 'var(--color-accent-500)'}
                        strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 264} 264`}
                        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
                    </svg>
                    <div className={styles.gaugeLabel}>
                      <span className={styles.gaugePct}>{formatPercent(pct)}</span>
                      <span className={styles.gaugeText}>utilized</span>
                    </div>
                  </div>
                </div>
                <div className={styles.chamberDetails}>
                  <div className={styles.detailRow}><span>Capacity</span><span className={styles.detailValue}>{cap.toLocaleString()} MT</span></div>
                  <div className={styles.detailRow}><span>Occupied</span><span className={styles.detailValue}>{occ.toLocaleString()} MT</span></div>
                  <div className={styles.detailRow}><span>Available</span><span className={styles.detailValue} style={{ color: 'var(--color-accent-500)' }}>{(cap - occ).toLocaleString()} MT</span></div>
                  {ch.commodityCategory && <div className={styles.detailRow}><span>Commodity</span><Badge variant="muted" size="sm">{getCommodityLabel(ch.commodityCategory)}</Badge></div>}
                </div>
                <div className={styles.chamberActions}>
                  <Button variant="secondary" size="sm" fullWidth onClick={() => openEdit(ch)} icon={<Pencil size={13} />}>Edit</Button>
                </div>
              </Card>
            );
          })}
          {chambers.length === 0 && !loading && (
            <Card padding="lg" className={styles.emptyCard}>
              <div className={styles.emptyState}>
                <Boxes size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.5 }} />
                <h3>No Chambers Configured</h3>
                <p>Add your first storage chamber to start managing inventory.</p>
                <Button variant="accent" onClick={() => { setForm(emptyChamberForm); setShowAddModal(true); }} icon={<Plus size={14} />}>Add Chamber</Button>
              </div>
            </Card>
          )}
        </div>
      </main>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Chamber" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} loading={submitting}>Create Chamber</Button></>}>
        {renderForm()}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Chamber" subtitle={selectedChamber?.chamberNumber} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate} loading={submitting}>Save Changes</Button></>}>
        {renderForm()}
      </Modal>
    </>
  );
}
