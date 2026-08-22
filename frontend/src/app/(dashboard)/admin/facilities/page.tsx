'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Factory, CheckCircle, Clock, Package, Pencil, Search, Plus, ShieldCheck } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/lib/formatters';
import type { Facility } from '@/types/models';
import styles from './facilities.module.css';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa',
  'Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala',
  'Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland',
  'Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal',
];

const emptyForm = {
  name: '', registrationNumber: '', addressLine1: '', city: '', district: '',
  state: '', pincode: '', totalCapacityMt: '', storageType: 'BAG',
  contactPhone: '', contactEmail: '', operatingSince: '',
};

export default function FacilitiesPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [verifyNotes, setVerifyNotes] = useState('');

  const filterParams: Record<string, string> = {};
  if (search) filterParams.search = search;
  if (statusFilter) filterParams.status = statusFilter;

  const { data: facilitiesData, loading, refetch } = useApiQuery<Facility[]>('/facilities', { params: filterParams });
  const facilities = facilitiesData || [];

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreate = async () => {
    if (!form.name || !form.city || !form.state || !form.totalCapacityMt) {
      showToast('Please fill in all required fields', 'error'); return;
    }
    setSubmitting(true);
    try {
      await api.post('/facilities', { ...form, totalCapacityMt: Number(form.totalCapacityMt) });
      showToast(`Facility "${form.name}" created successfully`, 'success');
      setShowAddModal(false); setForm(emptyForm); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to create facility', 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (f: Facility) => {
    setSelectedFacility(f);
    setForm({
      name: f.name, registrationNumber: f.registrationNumber || '',
      addressLine1: f.addressLine1 || '', city: f.city, district: f.district || '',
      state: f.state, pincode: f.pincode || '', totalCapacityMt: String(f.totalCapacityMt),
      storageType: f.storageType, contactPhone: f.contactPhone || '',
      contactEmail: f.contactEmail || '', operatingSince: f.operatingSince?.split('T')[0] || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedFacility) return;
    setSubmitting(true);
    try {
      await api.patch(`/facilities/${selectedFacility.id}`, {
        name: form.name, addressLine1: form.addressLine1, city: form.city,
        district: form.district, state: form.state, pincode: form.pincode,
        totalCapacityMt: Number(form.totalCapacityMt), storageType: form.storageType,
        contactPhone: form.contactPhone, contactEmail: form.contactEmail,
      });
      showToast(`Facility "${form.name}" updated`, 'success');
      setShowEditModal(false); setSelectedFacility(null); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to update facility', 'error'); }
    finally { setSubmitting(false); }
  };

  const openVerify = (f: Facility) => {
    setSelectedFacility(f); setVerifyAction('ACTIVE'); setVerifyNotes(''); setShowVerifyModal(true);
  };

  const handleVerify = async () => {
    if (!selectedFacility) return;
    setSubmitting(true);
    try {
      await api.patch(`/facilities/${selectedFacility.id}/verify`, { status: verifyAction, verificationNotes: verifyNotes });
      showToast(`Facility "${selectedFacility.name}" ${verifyAction === 'ACTIVE' ? 'approved' : 'suspended'}`, verifyAction === 'ACTIVE' ? 'success' : 'warning');
      setShowVerifyModal(false); setSelectedFacility(null); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to verify facility', 'error'); }
    finally { setSubmitting(false); }
  };

  const columns: Column<Facility>[] = [
    {
      key: 'name', header: 'Facility',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.name}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
            {row.city}, {row.state} &middot; {row.registrationNumber || 'No Reg.'}
          </div>
        </div>
      ),
    },
    {
      key: 'owner', header: 'Owner',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.owner?.fullName || '—'}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.owner?.phone}</div>
        </div>
      ),
    },
    {
      key: 'totalCapacityMt', header: 'Capacity',
      render: (row) => <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{Number(row.totalCapacityMt).toLocaleString()} MT</span>,
    },
    { key: 'storageType', header: 'Type', render: (row) => <Badge variant="muted">{row.storageType}</Badge> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    {
      key: 'chambers', header: 'Chambers',
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row._count?.chambers ?? 0}</span>,
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
            <Pencil size={13} />
          </Button>
          {row.status === 'PENDING_REVIEW' && (
            <Button variant="accent" size="sm" onClick={(e) => { e.stopPropagation(); openVerify(row); }}>
              Review
            </Button>
          )}
        </div>
      ),
    },
  ];

  const totalCapacity = facilities.reduce((sum, f) => sum + Number(f.totalCapacityMt), 0);
  const activeFacilities = facilities.filter((f) => f.status === 'ACTIVE').length;
  const pendingFacilities = facilities.filter((f) => f.status === 'PENDING_REVIEW').length;

  const renderFormFields = () => (
    <div className={styles.formGrid}>
      <Input label="Facility Name *" placeholder="e.g. PK Cold Storage Pvt. Ltd." value={form.name} onChange={(e) => handleChange('name', e.target.value)} required />
      <Input label="Registration Number" placeholder="e.g. UP-AGR-CS-2020-001" value={form.registrationNumber} onChange={(e) => handleChange('registrationNumber', e.target.value)} />
      <div className={styles.fullWidth}>
        <Input label="Address *" placeholder="Full address line" value={form.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} required />
      </div>
      <Input label="City *" placeholder="e.g. Agra" value={form.city} onChange={(e) => handleChange('city', e.target.value)} required />
      <Input label="District" placeholder="e.g. Agra" value={form.district} onChange={(e) => handleChange('district', e.target.value)} />
      <Select label="State *" value={form.state} onChange={(e) => handleChange('state', e.target.value)}
        options={[{ value: '', label: 'Select State...' }, ...INDIAN_STATES.map(s => ({ value: s, label: s }))]} />
      <Input label="PIN Code" placeholder="e.g. 282006" value={form.pincode} onChange={(e) => handleChange('pincode', e.target.value)} />
      <Input label="Total Capacity (MT) *" type="number" placeholder="e.g. 5000" value={form.totalCapacityMt} onChange={(e) => handleChange('totalCapacityMt', e.target.value)} required />
      <Select label="Storage Type *" value={form.storageType} onChange={(e) => handleChange('storageType', e.target.value)}
        options={[{ value: 'BAG', label: 'Bag Storage' }, { value: 'BULK', label: 'Bulk Storage' }, { value: 'HYBRID', label: 'Hybrid' }]} />
      <Input label="Contact Phone" placeholder="e.g. 9876543210" value={form.contactPhone} onChange={(e) => handleChange('contactPhone', e.target.value)} />
      <Input label="Contact Email" type="email" placeholder="e.g. info@coldstorage.in" value={form.contactEmail} onChange={(e) => handleChange('contactEmail', e.target.value)} />
      <Input label="Operating Since" type="date" value={form.operatingSince} onChange={(e) => handleChange('operatingSince', e.target.value)} />
    </div>
  );

  return (
    <>
    <PageLayout
      title="Facilities Management"
      subtitle="Manage cold storage facilities across the network"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Facilities' },
      ]}
    >
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Facilities" value={facilities.length} icon={<Factory size={18} />} variant="primary" />
          <StatsCard title="Active" value={activeFacilities} icon={<CheckCircle size={18} />} variant="accent" />
          <StatsCard title="Pending Review" value={pendingFacilities} icon={<Clock size={18} />} variant="warning" />
          <StatsCard title="Total Capacity" value={`${totalCapacity.toLocaleString()} MT`} icon={<Package size={18} />} variant="info" />
        </div>

        <Card padding="none">
          <div className={styles.tableHeader}>
            <div className={styles.filters}>
              <Input placeholder="Search facilities..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} />
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={[
                { value: '', label: 'All Statuses' }, { value: 'ACTIVE', label: 'Active' },
                { value: 'PENDING_REVIEW', label: 'Pending Review' }, { value: 'SUSPENDED', label: 'Suspended' },
                { value: 'DECOMMISSIONED', label: 'Decommissioned' },
              ]} />
            </div>
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setForm(emptyForm); setShowAddModal(true); }}>
              Add Facility
            </Button>
          </div>
          <DataTable columns={columns} data={facilities} loading={loading} emptyMessage="No facilities found" onRowClick={(row) => router.push(`/admin/facilities/${row.id}`)} />
        </Card>
    </PageLayout>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Facility" subtitle="Register a new cold storage facility" size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} loading={submitting}>Create Facility</Button></>}>
        {renderFormFields()}
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Facility" subtitle={selectedFacility?.name} size="lg"
        footer={<><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate} loading={submitting}>Save Changes</Button></>}>
        {renderFormFields()}
      </Modal>

      <Modal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} title="Review Facility" subtitle={selectedFacility?.name} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowVerifyModal(false)}>Cancel</Button><Button variant={verifyAction === 'ACTIVE' ? 'accent' : 'danger'} onClick={handleVerify} loading={submitting}>{verifyAction === 'ACTIVE' ? 'Approve' : 'Suspend'}</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Select label="Action" value={verifyAction} onChange={(e) => setVerifyAction(e.target.value as any)} options={[
            { value: 'ACTIVE', label: 'Approve — Mark as Active' }, { value: 'SUSPENDED', label: 'Suspend — Reject facility' },
          ]} />
          <Input label="Notes" placeholder="Verification notes..." value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
