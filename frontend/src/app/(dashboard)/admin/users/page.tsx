'use client';

import React, { useState } from 'react';
import { Users, Sprout, Factory, CheckCircle, Pencil, Ban, UserPlus, Search, Building2, MapPin } from 'lucide-react';
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
import { formatDate } from '@/lib/formatters';
import type { User } from '@/types/models';
import styles from './users.module.css';

type Tab = 'TEAMS' | 'FARMERS' | 'BUYERS' | 'ADMINS';

const emptyUserForm = { fullName: '', phone: '', email: '', password: '', role: 'FARMER' };

export default function UsersPage() {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('TEAMS');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyUserForm);
  const [submitting, setSubmitting] = useState(false);

  const { data: userData, loading, refetch } = useApiQuery<User[]>('/users');
  const users = userData || [];

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.fullName || !form.phone || !form.password) { showToast('Name, phone, and password are required', 'error'); return; }
    setSubmitting(true);
    try {
      await api.register({ fullName: form.fullName, phone: form.phone, email: form.email || undefined, password: form.password, role: form.role });
      showToast(`User "${form.fullName}" created successfully`, 'success');
      setShowAddModal(false); setForm(emptyUserForm); refetch();
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
      setShowEditModal(false); refetch();
    } catch (err: any) { showToast(err.message || 'Failed to update user', 'error'); }
    finally { setSubmitting(false); }
  };

  const toggleStatus = async (u: User) => {
    const newStatus = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.patch(`/users/${u.id}/status`, { status: newStatus });
      showToast(`${u.fullName} ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`, newStatus === 'ACTIVE' ? 'success' : 'warning');
      refetch();
    } catch (err: any) { showToast(err.message || 'Failed to update status', 'error'); }
  };

  // Search filter
  const filtered = React.useMemo(() => {
    return users.filter((u) => {
      return u.fullName.toLowerCase().includes(search.toLowerCase()) || u.phone.includes(search);
    });
  }, [users, search]);

  // Group Owners & Staff by Facility for Warehouse Teams tab
  const facilityGroups = React.useMemo(() => {
    const groups: Record<string, {
      facilityId: string;
      facilityName: string;
      owner: User | null;
      staff: User[];
    }> = {};

    filtered.forEach((u) => {
      if (u.role === 'OWNER') {
        const owned = u.ownedFacilities || [];
        if (owned.length > 0) {
          owned.forEach((fac: any) => {
            if (!groups[fac.id]) {
              groups[fac.id] = { facilityId: fac.id, facilityName: fac.name, owner: null, staff: [] };
            }
            groups[fac.id].owner = u;
          });
        } else {
          const placeholderId = `owner-no-fac-${u.id}`;
          groups[placeholderId] = { facilityId: '', facilityName: 'Unassigned Facility (No Warehouse Created Yet)', owner: u, staff: [] };
        }
      } else if (u.role === 'STAFF') {
        const fac = u.facility;
        if (fac) {
          if (!groups[fac.id]) {
            groups[fac.id] = { facilityId: fac.id, facilityName: fac.name, owner: null, staff: [] };
          }
          groups[fac.id].staff.push(u);
        } else {
          const placeholderId = 'staff-no-fac';
          if (!groups[placeholderId]) {
            groups[placeholderId] = { facilityId: '', facilityName: 'Unallocated Staff (No Facility Assigned)', owner: null, staff: [] };
          }
          groups[placeholderId].staff.push(u);
        }
      }
    });

    return Object.values(groups);
  }, [filtered]);

  // Filters for flat lists
  const farmersList = React.useMemo(() => filtered.filter(u => u.role === 'FARMER'), [filtered]);
  const buyersList = React.useMemo(() => filtered.filter(u => u.role === 'BUYER'), [filtered]);
  const adminsList = React.useMemo(() => filtered.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN'), [filtered]);

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
        {/* KPI Row */}
        <div className={`${styles.statsRow} stagger-in`}>
          <StatsCard title="Total Users" value={users.length} icon={<Users size={18} />} variant="primary" />
          <StatsCard title="Farmers" value={users.filter(u => u.role === 'FARMER').length} icon={<Sprout size={18} />} variant="accent" />
          <StatsCard title="Owners" value={users.filter(u => u.role === 'OWNER').length} icon={<Factory size={18} />} variant="info" />
          <StatsCard title="Active" value={users.filter(u => u.status === 'ACTIVE').length} icon={<CheckCircle size={18} />} variant="warning" />
        </div>

        {/* Search & Actions Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)', paddingBottom: 'var(--space-1)' }}>
          <div className={styles.filters}>
            <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} icon={<Search size={14} />} style={{ width: '260px' }} />
          </div>
          <Button variant="primary" size="sm" icon={<UserPlus size={14} />} onClick={() => { setForm(emptyUserForm); setShowAddModal(true); }}>Add User</Button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabsContainer}>
          <button className={`${styles.tabBtn} ${activeTab === 'TEAMS' ? styles.activeTab : ''}`} onClick={() => setActiveTab('TEAMS')}>Warehouse Teams</button>
          <button className={`${styles.tabBtn} ${activeTab === 'FARMERS' ? styles.activeTab : ''}`} onClick={() => setActiveTab('FARMERS')}>Farmers / Depositors</button>
          <button className={`${styles.tabBtn} ${activeTab === 'BUYERS' ? styles.activeTab : ''}`} onClick={() => setActiveTab('BUYERS')}>Buyers</button>
          <button className={`${styles.tabBtn} ${activeTab === 'ADMINS' ? styles.activeTab : ''}`} onClick={() => setActiveTab('ADMINS')}>Administrators</button>
        </div>

        {/* Main Content Area */}
        {loading ? (
          <div className={styles.facilityGrid}>
            {[1, 2].map((i) => (
              <div key={i} className="skeleton" style={{ height: '240px', borderRadius: 'var(--radius-xl)' }} />
            ))}
          </div>
        ) : activeTab === 'TEAMS' ? (
          facilityGroups.length === 0 ? (
            <Card padding="lg">
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No warehouse teams configured yet</p>
            </Card>
          ) : (
            <div className={styles.facilityGrid}>
              {facilityGroups.map((group) => (
                <div key={group.facilityId || Math.random()} className={styles.facilityCard}>
                  {/* Card Header */}
                  <div className={styles.facilityCardHeader}>
                    <div>
                      <h3 className={styles.facilityName}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <Building2 size={16} style={{ color: 'var(--color-primary-500)' }} />
                          {group.facilityName}
                        </span>
                      </h3>
                    </div>
                    <Badge variant="info">{(group.staff.length + (group.owner ? 1 : 0))} Members</Badge>
                  </div>

                  {/* Owner Section */}
                  {group.owner && (
                    <div className={styles.ownerSection}>
                      <span className={styles.sectionLabel}>Facility Owner</span>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberDetails}>
                          <div className={styles.avatar} style={{ background: roleColors.OWNER }}>
                            {group.owner.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className={styles.memberName}>{group.owner.fullName}</div>
                            <div className={styles.memberMeta}>{group.owner.phone} • {group.owner.email || 'No Email'}</div>
                          </div>
                        </div>
                        <div className={styles.memberActions}>
                          <Button variant="secondary" size="sm" onClick={() => openEdit(group.owner!)}><Pencil size={12} /></Button>
                          <Button variant={group.owner.status === 'ACTIVE' ? 'danger' : 'accent'} size="sm" onClick={() => toggleStatus(group.owner!)}>
                            {group.owner.status === 'ACTIVE' ? <Ban size={12} /> : <CheckCircle size={12} />}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Staff Section */}
                  <div className={styles.staffSection}>
                    <span className={styles.staffLabel}>Warehouse Staff</span>
                    {group.staff.length === 0 ? (
                      <div className={styles.emptyMessage}>No staff assigned to this facility</div>
                    ) : (
                      <div className={styles.staffList}>
                        {group.staff.map((s) => (
                          <div key={s.id} className={styles.staffRow}>
                            <div className={styles.memberDetails}>
                              <div className={styles.avatar} style={{ background: roleColors.STAFF, width: 30, height: 30, fontSize: 'var(--text-xs)' }}>
                                {s.fullName.charAt(0)}
                              </div>
                              <div>
                                <div className={styles.memberName} style={{ fontSize: 'var(--text-xs)' }}>{s.fullName}</div>
                                <div className={styles.memberMeta} style={{ fontSize: 'var(--text-2xs)' }}>{s.phone}</div>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                              {renderStatus(s.status)}
                              <div className={styles.memberActions}>
                                <Button variant="secondary" size="sm" onClick={() => openEdit(s)} style={{ padding: '0 6px', height: 24 }}><Pencil size={11} /></Button>
                                <Button variant={s.status === 'ACTIVE' ? 'danger' : 'accent'} size="sm" onClick={() => toggleStatus(s)} style={{ padding: '0 6px', height: 24 }}>
                                  {s.status === 'ACTIVE' ? <Ban size={11} /> : <CheckCircle size={11} />}
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'FARMERS' ? (
          <Card padding="none">
            <DataTable columns={columns} data={farmersList} loading={loading} emptyMessage="No farmers registered" />
          </Card>
        ) : activeTab === 'BUYERS' ? (
          <Card padding="none">
            <DataTable columns={columns} data={buyersList} loading={loading} emptyMessage="No buyers registered" />
          </Card>
        ) : (
          <Card padding="none">
            <DataTable columns={columns} data={adminsList} loading={loading} emptyMessage="No administrators registered" />
          </Card>
        )}
      </main>

      {/* Add User Modal */}
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

      {/* Edit User Modal */}
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
