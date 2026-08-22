'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sprout, CheckCircle, Search, UserPlus, Plus } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/lib/formatters';
import styles from './depositors.module.css';

interface Depositor {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  status: string;
  registrationNumber?: string;
  city?: string;
  state?: string;
  createdAt: string;
}

const emptyForm = {
  fullName: '',
  phone: '',
  email: '',
  password: '',
  city: '',
  state: '',
  pincode: '',
  addressLine1: '',
};

export default function DepositorsPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: depositorData, loading, refetch } = useApiQuery<Depositor[]>('/users/depositors');
  const depositors = depositorData || [];

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAddFarmer = async () => {
    if (!form.fullName || !form.phone || !form.password) {
      showToast('Name, phone, and password are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users/depositors', {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
        city: form.city || undefined,
        state: form.state || undefined,
        pincode: form.pincode || undefined,
        addressLine1: form.addressLine1 || undefined,
      });
      showToast(`Farmer "${form.fullName}" registered successfully`, 'success');
      setShowAddModal(false);
      setForm(emptyForm);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to register farmer', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = search
    ? depositors.filter(
        (d) =>
          d.fullName.toLowerCase().includes(search.toLowerCase()) ||
          d.phone.includes(search) ||
          (d.registrationNumber && d.registrationNumber.toLowerCase().includes(search.toLowerCase()))
      )
    : depositors;

  const columns: Column<Depositor>[] = [
    {
      key: 'fullName',
      header: 'Depositor',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-400))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontSize: 'var(--text-sm)', fontWeight: 600,
          }}>
            {row.fullName.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{row.fullName}</div>
            {row.email && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.email}</div>}
          </div>
        </div>
      ),
    },
    {
      key: 'registrationNumber',
      header: 'Reg. Number',
      render: (row) => row.registrationNumber ? (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{row.registrationNumber}</span>
      ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>,
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{row.phone}</span>,
    },
    {
      key: 'location',
      header: 'Location',
      render: (row) => (
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          {[row.city, row.state].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    {
      key: 'createdAt',
      header: 'Registered',
      render: (row) => (
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
          {formatDate(row.createdAt)}
        </span>
      ),
    },
  ];

  return (
    <>
    <PageLayout
      title="Depositors"
      subtitle="Farmers and clients with stored inventory"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Depositors' },
      ]}
    >
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Depositors" value={depositors.length} icon={<Sprout size={20} />} variant="primary" />
          <StatsCard title="Active" value={depositors.filter(d => d.status === 'ACTIVE').length} icon={<CheckCircle size={20} />} variant="accent" />
        </div>

        <Card padding="none">
          <div className={styles.tableHeader}>
            <Input
              placeholder="Search by name, phone, or reg number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              icon={<Search size={16} />}
            />
            <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={() => { setForm(emptyForm); setShowAddModal(true); }}>
              Add Farmer
            </Button>
          </div>
          <DataTable
            columns={columns}
            data={filtered}
            loading={loading}
            emptyMessage="No depositors found"
            onRowClick={(row) => router.push(`/wms/depositors/${row.id}`)}
          />
        </Card>
    </PageLayout>

      {/* Add Farmer Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register New Farmer"
        subtitle="The farmer will receive a unique registration number"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button variant="primary" loading={submitting} onClick={handleAddFarmer}>Register Farmer</Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <Input label="Full Name *" placeholder="e.g. Ram Prasad Sharma" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} required />
          <Input label="Phone Number *" type="tel" placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} required />
          <Input label="Password *" type="password" placeholder="Set a password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} required />
          <Input label="Email" type="email" placeholder="e.g. ram@example.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          <Input label="Address" placeholder="Village/Street address" value={form.addressLine1} onChange={(e) => handleChange('addressLine1', e.target.value)} />
          <Input label="City" placeholder="e.g. Agra" value={form.city} onChange={(e) => handleChange('city', e.target.value)} />
          <Input label="State" placeholder="e.g. Uttar Pradesh" value={form.state} onChange={(e) => handleChange('state', e.target.value)} />
          <Input label="PIN Code" placeholder="e.g. 282006" value={form.pincode} onChange={(e) => handleChange('pincode', e.target.value)} />
        </div>
      </Modal>
    </>
  );
}
