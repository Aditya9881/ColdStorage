'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle, XCircle, FileText, Phone, MapPin, Eye,
  Building2, Mail, CalendarDays, ExternalLink, Image as ImageIcon,
  AlertOctagon, AlertTriangle, ClipboardList, Factory, ShieldCheck,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/lib/formatters';
import styles from './verification.module.css';

type Tab = 'kyc' | 'compliance';

// ── KYC Types ──
const DOC_TYPE_LABELS: Record<string, string> = {
  AADHAAR_FRONT: 'Aadhaar (Front)',
  AADHAAR_BACK: 'Aadhaar (Back)',
  PAN_CARD: 'PAN Card',
  GST_CERTIFICATE: 'GST Certificate',
  BUSINESS_LICENSE: 'Business License',
  PHOTO_ID: 'Photo ID',
  OTHER: 'Other Document',
};

interface KycUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
  status: string;
  aadhaarNumber?: string;
  aadhaarVerified: boolean;
  panNumber?: string;
  gstNumber?: string;
  businessName?: string;
  businessType?: string;
  landHolding?: string;
  villageName?: string;
  city?: string;
  state?: string;
  district?: string;
  pincode?: string;
  kycVerified: boolean;
  kycSubmittedAt?: string;
  kycRejectionReason?: string;
  createdAt: string;
  kycDocuments: KycDocument[];
}

interface KycDocument {
  id: string;
  documentType: string;
  documentNumber?: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
}

interface PendingResponse {
  users: KycUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Compliance Types ──
interface ComplianceData {
  expiringSoon: number;
  expiredDocuments: number;
  pendingReview: number;
  facilitiesWithoutDocuments: number;
  details: {
    expiringSoon: any[];
    expired: any[];
    facilitiesWithoutDocs: any[];
  };
}

export default function VerificationPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('kyc');

  // ── KYC State ──
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [failedDocumentIds, setFailedDocumentIds] = useState<string[]>([]);

  const { data: pendingData, loading: kycLoading, refetch } = useApiQuery<PendingResponse>('/kyc/pending');
  const users = pendingData?.users || [];
  const kycTotal = pendingData?.total || 0;

  // ── Compliance State ──
  const [complianceData, setComplianceData] = useState<ComplianceData | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(true);

  useEffect(() => {
    loadCompliance();
  }, []);

  const loadCompliance = async () => {
    try {
      const res = await api.get<any>('/analytics/compliance');
      if (res.success) setComplianceData(res.data);
    } catch (err) {
      console.error('Failed to load compliance:', err);
    } finally {
      setComplianceLoading(false);
    }
  };

  // ── KYC Handlers ──
  const handleOpenReview = (user: KycUser) => {
    setSelectedUser(user);
    setShowReviewModal(true);
    setShowRejectInput(false);
    setRejectionReason('');
    setFailedDocumentIds([]);
  };

  const handleApprove = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await api.post(`/kyc/review/${selectedUser.id}`, { approved: true });
      showToast(`${selectedUser.fullName} KYC approved`, 'success');
      setShowReviewModal(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedUser || !rejectionReason.trim()) {
      showToast('Please provide a rejection reason', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/kyc/review/${selectedUser.id}`, {
        approved: false,
        rejectionReason: rejectionReason.trim(),
      });
      showToast(`${selectedUser.fullName} KYC rejected`, 'success');
      setShowReviewModal(false);
      refetch();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDocumentUrl = (fileUrl: string) => {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    if (apiUrl && !apiUrl.endsWith('/api/v1')) {
      apiUrl = apiUrl.replace(/\/+$/, '') + '/api/v1';
    }
    const backendOrigin = apiUrl.replace(/\/api\/v1\/?$/, '');
    return `${backendOrigin}${fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`}`;
  };

  return (
    <>
      <Header
        title="Verification"
        subtitle="KYC reviews and document compliance in one place"
      />

      <main className={styles.content}>
        {/* Tab Switcher */}
        <div className={styles.tabBar}>
          <button
            className={`${styles.tab} ${activeTab === 'kyc' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('kyc')}
          >
            <ShieldCheck size={16} />
            KYC Queue
            {kycTotal > 0 && <span className={styles.tabBadge}>{kycTotal}</span>}
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'compliance' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('compliance')}
          >
            <ClipboardList size={16} />
            Document Compliance
            {(complianceData?.expiredDocuments ?? 0) > 0 && (
              <span className={`${styles.tabBadge} ${styles.tabBadgeDanger}`}>
                {complianceData!.expiredDocuments}
              </span>
            )}
          </button>
        </div>

        {/* ═══════════════════ KYC TAB ═══════════════════ */}
        {activeTab === 'kyc' && (
          <>
            <div className={styles.statsRow}>
              <StatsCard title="Pending Review" value={kycTotal} icon={<Clock size={20} />} variant="warning" />
              <StatsCard title="Documents to Verify" value={users.reduce((c, u) => c + u.kycDocuments.length, 0)} icon={<FileText size={20} />} variant="primary" />
            </div>

            <Card>
              <div className={styles.queueHeader}>
                <div><span className={styles.eyebrow}>Verification queue</span><h3>Applications requiring a decision</h3></div>
                <span className={styles.queueCount}>{kycTotal} open {kycTotal === 1 ? 'application' : 'applications'}</span>
              </div>
              {kycLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                  Loading pending verifications...
                </div>
              ) : users.length === 0 ? (
                <div className={styles.emptyState}>
                  <CheckCircle size={64} />
                  <h3>All Clear!</h3>
                  <p>No pending KYC verifications. All users are verified.</p>
                </div>
              ) : (
                <div className={styles.queueGrid}>
                  {users.map((user) => (
                    <div key={user.id} className={styles.userCard} onClick={() => handleOpenReview(user)}>
                      <div className={styles.userInfo}>
                        <div className={styles.avatar}>{getInitials(user.fullName)}</div>
                        <div className={styles.userDetails}>
                          <h4>{user.fullName}</h4>
                          <div className={styles.userMeta}>
                            <span><Phone size={13} /> {user.phone}</span>
                            {user.email && <span><Mail size={13} /> {user.email}</span>}
                            <span><MapPin size={13} /> {user.city || 'N/A'}, {user.state || 'N/A'}</span>
                            <Badge variant={user.role === 'FARMER' ? 'primary' : 'info'}>{user.role === 'OWNER' ? 'COLD STORAGE OWNER' : user.role}</Badge>
                          </div>
                        </div>
                      </div>
                      <div className={styles.userActions}>
                        <button
                          type="button"
                          className={styles.documentAction}
                          onClick={(e) => { e.stopPropagation(); handleOpenReview(user); }}
                          aria-label={`Review ${user.kycDocuments?.length || 0} uploaded documents`}
                        >
                          <FileText size={15} />
                          <span>{user.kycDocuments?.length || 0} documents</span>
                        </button>
                        <span className={styles.submittedAt}>
                          <CalendarDays size={13} /> Submitted {user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : '—'}
                        </span>
                        <Button className={styles.reviewButton} variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenReview(user); }}>
                          <Eye size={14} /> Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}

        {/* ═══════════════════ COMPLIANCE TAB ═══════════════════ */}
        {activeTab === 'compliance' && (
          <>
            <div className={styles.statsRow}>
              <StatsCard title="Expiring Soon" value={complianceData?.expiringSoon ?? '—'} subtitle="Within 30 days" icon={<Clock size={18} />} variant="warning" />
              <StatsCard title="Expired" value={complianceData?.expiredDocuments ?? '—'} subtitle="Requires renewal" icon={<AlertOctagon size={18} />} variant="danger" />
              <StatsCard title="Pending Review" value={complianceData?.pendingReview ?? '—'} subtitle="Awaiting approval" icon={<ClipboardList size={18} />} variant="info" />
              <StatsCard title="No Documents" value={complianceData?.facilitiesWithoutDocuments ?? '—'} subtitle="Missing compliance docs" icon={<AlertTriangle size={18} />} variant="danger" />
            </div>

            {/* Expiring Soon */}
            <Card padding="md">
              <CardHeader
                title="Documents Expiring Soon"
                subtitle="Licenses and permits expiring within 30 days"
                action={<Badge variant="warning">{complianceData?.details?.expiringSoon?.length ?? 0} documents</Badge>}
              />
              {complianceData?.details?.expiringSoon?.length ? (
                <div className={styles.docList}>
                  {complianceData.details.expiringSoon.map((doc: any, i: number) => (
                    <div key={doc.id || i} className={styles.docItem}>
                      <div className={styles.docIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}><FileText size={16} /></div>
                      <div className={styles.docInfo}>
                        <span className={styles.docName}>{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>
                        <span className={styles.docMetaText}>{doc.facility?.name} · {doc.facility?.state}</span>
                      </div>
                      <div className={styles.docExpiry}>
                        <span className={styles.expiryLabel}>Expires</span>
                        <span className={styles.expiryDate}>{formatDate(doc.expiryDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <CheckCircle size={32} style={{ color: 'var(--color-accent-500)' }} />
                  <p>No documents expiring soon — all clear!</p>
                </div>
              )}
            </Card>

            {/* Expired Documents */}
            <Card padding="md">
              <CardHeader
                title="Expired Documents"
                subtitle="Documents that need immediate renewal"
                action={<Badge variant="danger">{complianceData?.details?.expired?.length ?? 0} expired</Badge>}
              />
              {complianceData?.details?.expired?.length ? (
                <div className={styles.docList}>
                  {complianceData.details.expired.map((doc: any, i: number) => (
                    <div key={doc.id || i} className={`${styles.docItem} ${styles.docExpired}`}>
                      <div className={styles.docIcon} style={{ background: 'rgba(244, 63, 94, 0.1)' }}><AlertOctagon size={16} /></div>
                      <div className={styles.docInfo}>
                        <span className={styles.docName}>{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>
                        <span className={styles.docMetaText}>{doc.facility?.name} · {doc.facility?.state}</span>
                      </div>
                      <div className={styles.docExpiry}>
                        <span className={styles.expiryLabel}>Expired</span>
                        <span className={styles.expiryDate} style={{ color: 'var(--color-danger-400)' }}>{formatDate(doc.expiryDate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <CheckCircle size={32} style={{ color: 'var(--color-accent-500)' }} />
                  <p>No expired documents — all compliant!</p>
                </div>
              )}
            </Card>

            {/* Facilities Without Documents */}
            <Card padding="md">
              <CardHeader
                title="Facilities Without Documents"
                subtitle="Active facilities missing compliance documentation"
                action={<Badge variant="danger">{complianceData?.details?.facilitiesWithoutDocs?.length ?? 0} facilities</Badge>}
              />
              {complianceData?.details?.facilitiesWithoutDocs?.length ? (
                <div className={styles.docList}>
                  {complianceData.details.facilitiesWithoutDocs.map((f: any, i: number) => (
                    <div key={f.id || i} className={styles.docItem}>
                      <div className={styles.docIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}><Factory size={16} /></div>
                      <div className={styles.docInfo}>
                        <span className={styles.docName}>{f.name}</span>
                        <span className={styles.docMetaText}>{f.city}, {f.state}</span>
                      </div>
                      <Badge variant="danger">No docs</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <ClipboardList size={32} style={{ color: 'var(--color-text-muted)' }} />
                  <p>All facilities have documentation on file</p>
                </div>
              )}
            </Card>
          </>
        )}
      </main>

      {/* ── KYC Review Modal ── */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`KYC Review — ${selectedUser?.fullName || ''}`}
        size="xl"
        footer={selectedUser && (
          <div className={styles.modalFooterActions}>
            {showRejectInput ? (
              <>
                <Button variant="secondary" onClick={() => setShowRejectInput(false)} disabled={submitting}>
                  Back to review
                </Button>
                <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectionReason.trim()}>
                  <XCircle size={16} /> Confirm rejection
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setShowReviewModal(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setShowRejectInput(true)} disabled={submitting}>
                  <XCircle size={16} /> Reject
                </Button>
                <Button variant="primary" onClick={handleApprove} loading={submitting}>
                  <CheckCircle size={16} /> Approve KYC
                </Button>
              </>
            )}
          </div>
        )}
      >
        {selectedUser && (
          <div className={styles.reviewModal}>
            {/* User Profile */}
            <section className={styles.profileSection}>
              <div className={styles.profileField}><label>Full Name</label><span>{selectedUser.fullName}</span></div>
              <div className={styles.profileField}><label>Phone</label><span>{selectedUser.phone}</span></div>
              <div className={styles.profileField}>
                <label>Role</label>
                <Badge variant={selectedUser.role === 'FARMER' ? 'primary' : 'info'}>{selectedUser.role}</Badge>
              </div>
              <div className={styles.profileField}><label>Registered</label><span>{formatDate(selectedUser.createdAt)}</span></div>
              {selectedUser.aadhaarNumber && (
                <div className={styles.profileField}><label>Aadhaar Number</label><span>XXXX-XXXX-{selectedUser.aadhaarNumber.slice(-4)}</span></div>
              )}
              {selectedUser.panNumber && (
                <div className={styles.profileField}><label>PAN Number</label><span>{selectedUser.panNumber}</span></div>
              )}
              {selectedUser.gstNumber && (
                <div className={styles.profileField}><label>GST Number</label><span>{selectedUser.gstNumber}</span></div>
              )}
              {selectedUser.businessName && (
                <div className={styles.profileField}><label><Building2 size={13} /> Business</label><span>{selectedUser.businessName} ({selectedUser.businessType})</span></div>
              )}
              {selectedUser.villageName && (
                <div className={styles.profileField}><label>Village</label><span>{selectedUser.villageName}</span></div>
              )}
              {selectedUser.landHolding && (
                <div className={styles.profileField}><label>Land Holding</label><span>{selectedUser.landHolding}</span></div>
              )}
              <div className={styles.profileField}>
                <label>Location</label>
                <span>{[selectedUser.city, selectedUser.district, selectedUser.state].filter(Boolean).join(', ') || 'N/A'}</span>
              </div>
            </section>

            {/* Documents */}
            <section className={styles.documentsSection}>
              <div className={styles.documentsHeader}>
                <div>
                  <span className={styles.sectionEyebrow}>Identity documents</span>
                  <h3>Uploaded documents</h3>
                </div>
                <span className={styles.documentsCount}>{selectedUser.kycDocuments?.length || 0} files</span>
              </div>
              {selectedUser.kycDocuments?.length > 0 ? (
                <div className={styles.docGrid}>
                  {selectedUser.kycDocuments.map((doc) => (
                    <div key={doc.id} className={styles.docCard}>
                      <div className={styles.docPreview}>
                        {failedDocumentIds.includes(doc.id) ? (
                          <div className={styles.previewUnavailable}>
                            <ImageIcon size={28} />
                            <span>Preview unavailable</span>
                          </div>
                        ) : (
                          <img
                            src={getDocumentUrl(doc.fileUrl)}
                            alt={DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                            className={styles.docImage}
                            onError={() => setFailedDocumentIds((ids) => ids.includes(doc.id) ? ids : [...ids, doc.id])}
                          />
                        )}
                        <button
                          type="button"
                          className={styles.openDocument}
                          onClick={() => window.open(getDocumentUrl(doc.fileUrl), '_blank', 'noopener,noreferrer')}
                        >
                          <ExternalLink size={14} /> Open full document
                        </button>
                      </div>
                      <div className={styles.docCardMeta}>
                        <div className={styles.docMetaTop}>
                          <div>
                            <div className={styles.docType}>{DOC_TYPE_LABELS[doc.documentType] || doc.documentType}</div>
                            {doc.documentNumber && <div className={styles.docNumber}>#{doc.documentNumber}</div>}
                          </div>
                          <Badge variant={doc.status === 'APPROVED' ? 'accent' : doc.status === 'REJECTED' ? 'danger' : 'warning'}>
                            {doc.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-secondary)' }}>No documents uploaded yet.</p>
              )}
            </section>

            {showRejectInput && (
              <div className={styles.rejectionPanel}>
                <Input
                  label="Rejection reason"
                  placeholder="Explain why these documents cannot be approved..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
