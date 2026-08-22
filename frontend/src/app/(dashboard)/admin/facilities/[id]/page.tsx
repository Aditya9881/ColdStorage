'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Building2, MapPin, CheckCircle, Clock, Package, Users, ShieldAlert,
  ArrowLeft, FileText, Calendar, Plus, ExternalLink, ClipboardCheck,
  Eye, Info, Phone, Mail, FileCheck, Layers
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { DataTable, Column, renderStatus } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { formatDate, formatCurrency, getCommodityLabel } from '@/lib/formatters';
import type { User } from '@/types/models';
import styles from './details.module.css';

interface Chamber {
  id: string;
  chamberNumber: string;
  name: string | null;
  capacityMt: number;
  occupiedMt: number;
  status: string;
  commodityCategory: string | null;
}

interface FacilityDocument {
  id: string;
  documentType: string;
  documentNumber: string;
  status: string;
  fileUrl: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  uploadedAt: string;
  uploader?: { fullName: string };
  reviewer?: { fullName: string };
  reviewNotes?: string;
}

interface FacilityDetail {
  id: string;
  name: string;
  registrationNumber: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  district: string;
  state: string;
  pincode: string;
  totalCapacityMt: number;
  storageType: string;
  status: string;
  operatingSince: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  owner?: { id: string; fullName: string; phone: string; email: string | null };
  chambers: Chamber[];
  _count: { lots: number; staff: number; invoices: number };
}

type Tab = 'OVERVIEW' | 'CHAMBERS' | 'COMPLIANCE' | 'INVENTORY' | 'STAFF';

export default function FacilityDetailPage() {
  const { id: facilityId } = useParams() as { id: string };
  const router = useRouter();
  const { showToast } = useToast();

  const [facility, setFacility] = useState<FacilityDetail | null>(null);
  const [documents, setDocuments] = useState<FacilityDocument[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('OVERVIEW');

  // Verify Facility Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [verifyNotes, setVerifyNotes] = useState('');
  const [submittingVerify, setSubmittingVerify] = useState(false);

  // Review Document Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<FacilityDocument | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [facilityId]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [facRes, docsRes, staffRes, lotsRes] = await Promise.all([
        api.get<any>(`/facilities/${facilityId}`),
        api.get<any>(`/facilities/${facilityId}/documents`),
        api.get<any>('/users', { facilityId }),
        api.get<any>('/inventory/lots', { facilityId }),
      ]);

      if (facRes.success) setFacility(facRes.data);
      if (docsRes.success) setDocuments(docsRes.data || []);
      if (staffRes.success) setStaff(staffRes.data || []);
      if (lotsRes.success) setLots(lotsRes.data || []);
    } catch (err) {
      console.error('Failed to load facility data:', err);
      showToast('Error loading facility details', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyFacility = async () => {
    if (!facility) return;
    setSubmittingVerify(true);
    try {
      await api.patch(`/facilities/${facility.id}/verify`, { status: verifyAction, verificationNotes: verifyNotes });
      showToast(`Facility status updated to ${verifyAction}`, 'success');
      setShowVerifyModal(false);
      setVerifyNotes('');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to update facility status', 'error');
    } finally {
      setSubmittingVerify(false);
    }
  };

  const handleDocumentReview = async () => {
    if (!facility || !selectedDoc) return;
    setSubmittingReview(true);
    try {
      await api.patch(`/facilities/${facility.id}/documents/${selectedDoc.id}`, { status: reviewStatus, reviewNotes });
      showToast(`Document status updated to ${reviewStatus}`, 'success');
      setShowReviewModal(false);
      setSelectedDoc(null);
      setReviewNotes('');
      loadAllData();
    } catch (err: any) {
      showToast(err.message || 'Failed to review document', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="Facility Details" subtitle="Loading..." breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Facilities', href: '/admin/facilities' }, { label: 'Details' }]}>
        <div className="skeleton" style={{ height: '40px', width: '100px' }} />
        <div className="skeleton" style={{ height: '80px', width: '100%', borderRadius: 'var(--radius-lg)' }} />
        <div className={styles.statsRow}>
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: '100px', borderRadius: 'var(--radius-lg)' }} />)}
        </div>
      </PageLayout>
    );
  }

  if (!facility) {
    return (
      <PageLayout title="Facility Details" subtitle="Not found" breadcrumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Facilities', href: '/admin/facilities' }, { label: 'Details' }]}>
        <Card padding="lg">
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Facility not found</p>
        </Card>
      </PageLayout>
    );
  }

  // Stats calculations
  const totalOccupied = facility.chambers.reduce((sum, c) => sum + Number(c.occupiedMt), 0);
  const occupancyRate = facility.totalCapacityMt > 0 ? (totalOccupied / facility.totalCapacityMt) * 100 : 0;

  const docColumns: Column<FacilityDocument>[] = [
    {
      key: 'documentType', header: 'Document Type',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600 }}>{row.documentType.replace(/_/g, ' ')}</div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            #{row.documentNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'dates', header: 'Validity',
      render: (row) => (
        <div style={{ fontSize: 'var(--text-xs)' }}>
          {row.issuedDate ? (
            <div>Issued: {formatDate(row.issuedDate)}</div>
          ) : null}
          {row.expiryDate ? (
            <div style={{ color: new Date(row.expiryDate) < new Date() ? 'var(--color-danger-500)' : 'inherit' }}>
              Expires: {formatDate(row.expiryDate)}
            </div>
          ) : <span style={{ color: 'var(--color-text-muted)' }}>No Expiry</span>}
        </div>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: (row) => {
        const variants: Record<string, 'primary' | 'warning' | 'danger' | 'muted' | 'accent'> = {
          APPROVED: 'accent',
          REJECTED: 'danger',
          PENDING_REVIEW: 'warning',
          EXPIRED: 'muted',
        };
        return <Badge variant={variants[row.status] || 'muted'}>{row.status.replace(/_/g, ' ')}</Badge>;
      }
    },
    {
      key: 'reviewer', header: 'Review Details',
      render: (row) => (
        <div style={{ fontSize: 'var(--text-xs)' }}>
          {row.reviewer ? (
            <div>Reviewed by: {row.reviewer.fullName}</div>
          ) : null}
          {row.reviewNotes ? (
            <div style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              "{row.reviewNotes}"
            </div>
          ) : null}
        </div>
      )
    },
    {
      key: 'actions', header: '',
      render: (row) => (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {row.fileUrl && (
            <Button variant="secondary" size="sm" onClick={() => window.open(row.fileUrl!, '_blank')}>
              <ExternalLink size={12} />
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={() => {
            setSelectedDoc(row);
            setReviewStatus(row.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
            setReviewNotes(row.reviewNotes || '');
            setShowReviewModal(true);
          }}>
            Review
          </Button>
        </div>
      ),
    },
  ];

  const lotColumns: Column<any>[] = [
    {
      key: 'lotNumber', header: 'Lot Number',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{row.lotNumber}</div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)' }}>{row.receiptNumber}</div>
        </div>
      ),
    },
    { key: 'depositor', header: 'Depositor', render: (row) => row.depositor?.fullName || '—' },
    { key: 'commodityName', header: 'Commodity', render: (row) => <Badge variant="primary">{getCommodityLabel(row.commodityCategory)}</Badge> },
    {
      key: 'weight', header: 'Weight / Bags',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{(row.currentWeightKg / 1000).toFixed(2)} MT</div>
          <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)' }}>{row.bagCount} bags</div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    { key: 'intakeDate', header: 'Stored Date', render: (row) => <span style={{ fontSize: 'var(--text-xs)' }}>{formatDate(row.intakeDate)}</span> },
  ];

  const staffColumns: Column<User>[] = [
    {
      key: 'fullName', header: 'Staff Member',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: 'linear-gradient(135deg, var(--color-warning-500), var(--color-warning-600))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 'var(--text-xs)', fontWeight: 600 }}>
            {row.fullName.charAt(0)}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{row.fullName}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{row.email || 'No Email'}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (row) => <span style={{ fontFamily: 'var(--font-mono)' }}>{row.phone}</span> },
    { key: 'status', header: 'Status', render: (row) => renderStatus(row.status) },
    { key: 'createdAt', header: 'Joined', render: (row) => <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>{formatDate(row.createdAt)}</span> },
  ];

  return (
    <>
    <PageLayout
      title={facility.name}
      subtitle={`${facility.city}, ${facility.state}`}
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Facilities', href: '/admin/facilities' },
        { label: facility.name },
      ]}
    >

        {/* Detailed Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {facility.name}
              </h1>
              <Badge variant={facility.status === 'ACTIVE' ? 'accent' : 'warning'}>
                {facility.status}
              </Badge>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 'var(--space-1.5)' }}>
              <MapPin size={14} />
              {facility.addressLine1}, {facility.city}, {facility.state}
            </p>
          </div>
          <Button variant={facility.status === 'ACTIVE' ? 'danger' : 'accent'} size="sm" onClick={() => {
            setVerifyAction(facility.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
            setShowVerifyModal(true);
          }}>
            Update Status
          </Button>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          <StatsCard title="Occupancy Rate" value={`${Math.round(occupancyRate)}%`} icon={<Layers size={18} />} variant="primary" />
          <StatsCard title="Active Lots" value={facility._count.lots} icon={<Package size={18} />} variant="accent" />
          <StatsCard title="Registered Staff" value={facility._count.staff} icon={<Users size={18} />} variant="info" />
          <StatsCard title="Compliance Docs" value={documents.length} icon={<FileText size={18} />} variant="warning" />
        </div>

        {/* Tab Controls */}
        <div className={styles.tabsContainer}>
          <button className={`${styles.tabBtn} ${activeTab === 'OVERVIEW' ? styles.activeTab : ''}`} onClick={() => setActiveTab('OVERVIEW')}>Overview</button>
          <button className={`${styles.tabBtn} ${activeTab === 'CHAMBERS' ? styles.activeTab : ''}`} onClick={() => setActiveTab('CHAMBERS')}>Chambers ({facility.chambers.length})</button>
          <button className={`${styles.tabBtn} ${activeTab === 'COMPLIANCE' ? styles.activeTab : ''}`} onClick={() => setActiveTab('COMPLIANCE')}>Compliance Documents ({documents.length})</button>
          <button className={`${styles.tabBtn} ${activeTab === 'INVENTORY' ? styles.activeTab : ''}`} onClick={() => setActiveTab('INVENTORY')}>Stored Inventory ({lots.length})</button>
          <button className={`${styles.tabBtn} ${activeTab === 'STAFF' ? styles.activeTab : ''}`} onClick={() => setActiveTab('STAFF')}>Staff Directory ({staff.length})</button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'OVERVIEW' ? (
          <div className={styles.grid2Cols}>
            {/* Left Column: Specs */}
            <div className={styles.infoCard}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, borderBottom: '1px solid var(--color-border-secondary)', paddingBottom: 'var(--space-3)' }}>
                Facility Details
              </h3>
              <div className={styles.infoGrid}>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Registration No.</span>
                  <span className={styles.infoValue} style={{ fontFamily: 'var(--font-mono)' }}>{facility.registrationNumber || 'Unregistered'}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Storage Type</span>
                  <span className={styles.infoValue}>{facility.storageType}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Total Capacity</span>
                  <span className={styles.infoValue}>{facility.totalCapacityMt.toLocaleString()} MT</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Current Stored</span>
                  <span className={styles.infoValue}>{totalOccupied.toLocaleString()} MT</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Operating Since</span>
                  <span className={styles.infoValue}>{facility.operatingSince ? formatDate(facility.operatingSince) : '—'}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>District / PIN</span>
                  <span className={styles.infoValue}>{facility.district} - {facility.pincode}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Contact Email</span>
                  <span className={styles.infoValue}>{facility.contactEmail || '—'}</span>
                </div>
                <div className={styles.infoGroup}>
                  <span className={styles.infoLabel}>Contact Phone</span>
                  <span className={styles.infoValue}>{facility.contactPhone || '—'}</span>
                </div>
              </div>
            </div>

            {/* Right Column: Owner profile */}
            <div className={styles.infoCard}>
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, borderBottom: '1px solid var(--color-border-secondary)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-1)' }}>
                Facility Owner
              </h3>
              {facility.owner ? (
                <>
                  <div className={styles.ownerHeader}>
                    <div className={styles.ownerAvatar}>
                      {facility.owner.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className={styles.ownerName}>{facility.owner.fullName}</div>
                      <div style={{ marginTop: '4px' }}><Badge variant="primary">OWNER</Badge></div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                      <Phone size={14} style={{ color: 'var(--color-text-secondary)' }} />
                      <span style={{ fontFamily: 'var(--font-mono)' }}>{facility.owner.phone}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                      <Mail size={14} style={{ color: 'var(--color-text-secondary)' }} />
                      <span>{facility.owner.email || 'No email registered'}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>No owner details associated with this facility.</p>
              )}
            </div>
          </div>
        ) : activeTab === 'CHAMBERS' ? (
          facility.chambers.length === 0 ? (
            <Card padding="lg">
              <p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No chambers configured yet</p>
            </Card>
          ) : (
            <div className={styles.chamberGrid}>
              {facility.chambers.map((chamber) => {
                const percentage = Math.round((chamber.occupiedMt / chamber.capacityMt) * 100);
                let fillCol = 'var(--color-primary-500)';
                if (percentage >= 90) fillCol = 'var(--color-danger-500)';
                else if (percentage >= 70) fillCol = 'var(--color-warning-500)';
                return (
                  <div key={chamber.id} className={styles.chamberCard}>
                    <div className={styles.chamberHeader}>
                      <div>
                        <h3 className={styles.chamberName}>
                          Chamber {chamber.chamberNumber}
                        </h3>
                        <p className={styles.chamberCapacity}>
                          Capacity: {chamber.capacityMt} MT
                        </p>
                      </div>
                      <Badge variant={chamber.status === 'OPERATIONAL' ? 'accent' : 'warning'}>
                        {chamber.status}
                      </Badge>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <Badge variant="primary">
                        {getCommodityLabel(chamber.commodityCategory || 'OTHER')}
                      </Badge>
                      {chamber.name && (
                        <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-secondary)' }}>
                          {chamber.name}
                        </span>
                      )}
                    </div>

                    <div className={styles.progressContainer}>
                      <div className={styles.progressText}>
                        <span style={{ color: 'var(--color-text-muted)' }}>Occupancy</span>
                        <span style={{ fontWeight: 600 }}>{percentage}%</span>
                      </div>
                      <div className={styles.progressBarBg}>
                        <div className={styles.progressBarFill} style={{ width: `${percentage}%`, background: fillCol }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--color-text-tertiary)' }}>
                        {chamber.occupiedMt.toFixed(1)} MT occupied
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : activeTab === 'COMPLIANCE' ? (
          <Card padding="none">
            <DataTable columns={docColumns} data={documents} loading={loading} emptyMessage="No compliance documents uploaded" />
          </Card>
        ) : activeTab === 'INVENTORY' ? (
          <Card padding="none">
            <DataTable columns={lotColumns} data={lots} loading={loading} emptyMessage="No stored commodities inside this warehouse" />
          </Card>
        ) : (
          <Card padding="none">
            <DataTable columns={staffColumns} data={staff} loading={loading} emptyMessage="No staff registered under this facility" />
          </Card>
        )}
    </PageLayout>

      {/* Verify Facility Status Modal */}
      <Modal isOpen={showVerifyModal} onClose={() => setShowVerifyModal(false)} title="Update Facility Status" subtitle={facility.name} size="sm"
        footer={<><Button variant="secondary" onClick={() => setShowVerifyModal(false)}>Cancel</Button><Button variant={verifyAction === 'ACTIVE' ? 'accent' : 'danger'} onClick={handleVerifyFacility} loading={submittingVerify}>{verifyAction === 'ACTIVE' ? 'Approve' : 'Suspend'}</Button></>}>
        <div className={styles.modalForm}>
          <Select label="Status" value={verifyAction} onChange={(e) => setVerifyAction(e.target.value as any)} options={[
            { value: 'ACTIVE', label: 'Active (Approved)' }, { value: 'SUSPENDED', label: 'Suspended (Rejected)' },
          ]} />
          <Input label="Verification Notes" placeholder="Enter reason or audit details..." value={verifyNotes} onChange={(e) => setVerifyNotes(e.target.value)} />
        </div>
      </Modal>

      {/* Document Review Modal */}
      {selectedDoc && (
        <Modal isOpen={showReviewModal} onClose={() => { setShowReviewModal(false); setSelectedDoc(null); }} title="Review Compliance Document" subtitle={`${selectedDoc.documentType.replace(/_/g, ' ')} (${selectedDoc.documentNumber})`} size="sm"
          footer={<><Button variant="secondary" onClick={() => { setShowReviewModal(false); setSelectedDoc(null); }}>Cancel</Button><Button variant="primary" onClick={handleDocumentReview} loading={submittingReview}>Submit Review</Button></>}>
          <div className={styles.modalForm}>
            <Select label="Decision" value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value as any)} options={[
              { value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' },
            ]} />
            <Input label="Review Notes" placeholder="Verification details, errors, or feedback..." value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
          </div>
        </Modal>
      )}
    </>
  );
}
