'use client';

import React, { useEffect, useState } from 'react';
import { Users, Sprout, Factory, CheckCircle, Pencil, Ban, UserPlus, Search, ShieldCheck } from 'lucide-react';
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
import { formatDate } from '@/lib/formatters';
import type { User } from '@/types/models';
import styles from './users.module.css';

const emptyUserForm = { fullName: '', phone: '', email: '', password: '', role: 'FARMER' };

export default function UsersPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadUsers(); }, [roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (roleFilter) params.role = roleFilter;
      const res = await api.get<any>('/users', params);
      if (res.success) setUsers(res.data || []);
    } catch (err) { console.error('Failed to load users:', err); }
    finally { setLoading(false); }
  };

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.fullName || !form.phone || !form.password) { showToast('Name, phone, and password are required', 'error'); return; }
    setSubmitting(true);
    try {
      await api.register({ fullName: form.fullName, phone: form.phone, email: form.email || undefined, password: form.password, role: form.role });
      showToast(`User "${form.fullName}" created successfully`, 'success');
      setShowAddModal(false); setForm(emptyUserForm); loadUsers();
    } catch (err: any) { showToast(err.message || 'Failed to create user', 'error'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (u: User) => {
    setSelectedUser(u);
    setForm({ fullName: u.fullName, phone: u.phone, email: u.email || '', password: '', role: u.role });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.patch(`/users/${selectedUser.id}`, { fullName: form.fullName, email: form.email || undefined, role: form.role });
      showToast(`User "${form.fullName}" updated`, 'success');
      setShowEditModal(false); loadUsers();
    } catch (err: any) { showToast(err.message || 'Failed to update user', 'error'); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (u: User) => {
    const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/users/${u.id}/status`, { status: newStatus });
      showToast(`${u.fullName} ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`, newStatus === 'ACTIVE' ? 'success' : 'warning');
      loadUsers();
    } catch (err: any) { showToast(err.message || 'Failed to update status', 'error'); }
  };

  const filtered = search
    ? users.filter((u) => u.fullName.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search))
    : users;

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'linear-gradient(135deg, var(--color-danger-500), var(--color-danger-600))',
    OWNER: 'linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600))',
    FARMER: 'linear-gradient(135deg, var(--color-accent-500), var(--color-accent-600))',
    STAFF: 'linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))',
    ADMIN: 'linear-gradient(135deg, var(--color-info-500), var(--color-primary-600))',
  };

  const columns: Column<User>[] = [
    {
      key: 'fullName', header: 'User',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: roleColors[row.role] || roleColors.STAFF,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-xs)', fontWeight: 600, flexShrink: 0 }}>
            {row.fullName.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{row.fullName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.email || row.phone}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }}>{row.phone}</span> },
    { key: 'role', header: 'Role', render: (row) => <Badge variant={row.role === 'SUPER_ADMIN' ? 'danger' : row.role === 'OWNER' ? 'primary' : row.role === 'FARMER' ? 'accent' : 'warning'}>{row.role.replace(/_/g, ' ')}</Badge> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    { key: 'createdAt', header: 'Joined', render: (row) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDate(row.createdAt)}</span> },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}><Pencil size={13} /></Button>
          <Button variant={row.status === 'ACTIVE' ? 'danger' : 'accent'} size="sm" onClick={(e) => { e.stopPropagation(); toggleStatus(row); }}>
            {row.status === 'ACTIVE' ? <Ban size={13} /> : <CheckCircle size={13} />}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Header title="User Management" subtitle="Manage platform users and roles" />
      <main className={styles.content}>
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Users" value={users.length} icon={<Users size={18} />} variant="primary" />
          <StatsCard title="Farmers" value={users.filter(u => u.role === 'FARMER').length} icon={<Sprout size={18} />} variant="accent" />
          <StatsCard title="Owners" value={users.filter(u => u.role === 'OWNER').length} icon={<Factory size={18} />} variant="info" />
          <StatsCard title="Active" value={users.filter(u => u.status === 'ACTIVE').length} icon={<CheckCircle size={18} />} variant="warning" />
        </div>

        <Card padding="none">
          <div className={styles.tableHeader}>
            <div className={styles.filters}>
              <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} />
              <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} options={[
                { value: '', label: 'All Roles' }, { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'OWNER', label: 'Owner' }, { value: 'STAFF', label: 'Staff' }, { value: 'FARMER', label: 'Farmer' },
              ]} />
            </div>
            <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => { setForm(emptyUserForm); setShowAddModal(true); }}>Add User</Button>
          </div>
          <DataTable columns={columns} data={filtered} loading={loading} emptyMessage="No users found" />
        </Card>
      </main>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New User" size="md"
        footer={<><Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button><Button variant="primary" onClick={handleCreate} loading={submitting}>Create User</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Full Name *" placeholder="e.g. Ramesh Singh" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
          <Input label="Phone *" placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} />
          <Input label="Email" type="email" placeholder="e.g. ramesh@example.com" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          <Input label="Password *" type="password" placeholder="Min 6 characters" value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
          <Select label="Role *" value={form.role} onChange={(e) => handleChange('role', e.target.value)} options={[
            { value: 'FARMER', label: 'Farmer / Depositor' }, { value: 'OWNER', label: 'Facility Owner' },
            { value: 'STAFF', label: 'Facility Staff' }, { value: 'ADMIN', label: 'Admin' },
          ]} />
        </div>
      </Modal>

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit User" subtitle={selectedUser?.phone} size="md"
        footer={<><Button variant="secondary" onClick={() => setShowEditModal(false)}>Cancel</Button><Button variant="primary" onClick={handleUpdate} loading={submitting}>Save Changes</Button></>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <Input label="Full Name" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
          <Select label="Role" value={form.role} onChange={(e) => handleChange('role', e.target.value)} options={[
            { value: 'FARMER', label: 'Farmer' }, { value: 'OWNER', label: 'Owner' },
            { value: 'STAFF', label: 'Staff' }, { value: 'ADMIN', label: 'Admin' },
          ]} />
        </div>
      </Modal>
    </>
  );
}
