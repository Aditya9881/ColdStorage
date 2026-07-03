'use client';

import React, { useState } from 'react';
import { ShieldCheck, Clock, CheckCircle, XCircle, FileText, Phone, MapPin, User as UserIcon, Eye } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { useApiQuery } from '@/hooks/useApiQuery';
import { formatDate } from '@/lib/formatters';
import styles from './kyc.module.css';

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

export default function AdminKycPage() {
  const { showToast } = useToast();
  const [selectedUser, setSelectedUser] = useState<KycUser | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Fetch pending KYC users
  const { data: pendingData, loading, refetch } = useApiQuery<PendingResponse>('/kyc/pending');
  const users = pendingData?.users || [];
  const total = pendingData?.total || 0;

  const handleOpenReview = (user: KycUser) => {
    setSelectedUser(user);
    setShowReviewModal(true);
    setShowRejectInput(false);
    setRejectionReason('');
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

  const getApiBaseUrl = () => {
    // In dev, documents are served from backend static
    return process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:4000';
  };

  return (
    <>
      <Header
        title="KYC Verification"
        subtitle="Review and verify user identity documents"
      />

      <div className={styles.kycPage}>
        {/* Stats */}
        <div className={styles.statsRow}>
          <StatsCard title="Pending Review" value={total} icon={<Clock size={20} />} variant="warning" />
        </div>

        {/* Queue */}
        <Card>
          {loading ? (
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
                <div
                  key={user.id}
                  className={styles.userCard}
                  onClick={() => handleOpenReview(user)}
                >
                  <div className={styles.userInfo}>
                    <div className={styles.avatar}>{getInitials(user.fullName)}</div>
                    <div className={styles.userDetails}>
                      <h4>{user.fullName}</h4>
                      <div className={styles.userMeta}>
                        <span><Phone size={13} /> {user.phone}</span>
                        <span><MapPin size={13} /> {user.city || 'N/A'}, {user.state || 'N/A'}</span>
                        <Badge variant={user.role === 'FARMER' ? 'primary' : 'info'}>{user.role}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className={styles.userActions}>
                    <span className={styles.docCount}>
                      <FileText size={13} /> {user.kycDocuments?.length || 0} docs
                    </span>
                    <span className={styles.submittedAt}>
                      Submitted {user.kycSubmittedAt ? formatDate(user.kycSubmittedAt) : '—'}
                    </span>
                    <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); handleOpenReview(user); }}>
                      <Eye size={14} /> Review
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title={`KYC Review — ${selectedUser?.fullName || ''}`}
        size="lg"
      >
        {selectedUser && (
          <div className={styles.reviewModal}>
            {/* User Profile */}
            <div className={styles.profileSection}>
              <div className={styles.profileField}>
                <label>Full Name</label>
                <span>{selectedUser.fullName}</span>
              </div>
              <div className={styles.profileField}>
                <label>Phone</label>
                <span>{selectedUser.phone}</span>
              </div>
              <div className={styles.profileField}>
                <label>Role</label>
                <Badge variant={selectedUser.role === 'FARMER' ? 'primary' : 'info'}>{selectedUser.role}</Badge>
              </div>
              <div className={styles.profileField}>
                <label>Registered</label>
                <span>{formatDate(selectedUser.createdAt)}</span>
              </div>
              {selectedUser.aadhaarNumber && (
                <div className={styles.profileField}>
                  <label>Aadhaar Number</label>
                  <span>XXXX-XXXX-{selectedUser.aadhaarNumber.slice(-4)}</span>
                </div>
              )}
              {selectedUser.panNumber && (
                <div className={styles.profileField}>
                  <label>PAN Number</label>
                  <span>{selectedUser.panNumber}</span>
                </div>
              )}
              {selectedUser.gstNumber && (
                <div className={styles.profileField}>
                  <label>GST Number</label>
                  <span>{selectedUser.gstNumber}</span>
                </div>
              )}
              {selectedUser.businessName && (
                <div className={styles.profileField}>
                  <label>Business</label>
                  <span>{selectedUser.businessName} ({selectedUser.businessType})</span>
                </div>
              )}
              {selectedUser.villageName && (
                <div className={styles.profileField}>
                  <label>Village</label>
                  <span>{selectedUser.villageName}</span>
                </div>
              )}
              {selectedUser.landHolding && (
                <div className={styles.profileField}>
                  <label>Land Holding</label>
                  <span>{selectedUser.landHolding}</span>
                </div>
              )}
              <div className={styles.profileField}>
                <label>Location</label>
                <span>{[selectedUser.city, selectedUser.district, selectedUser.state].filter(Boolean).join(', ') || 'N/A'}</span>
              </div>
            </div>

            {/* Documents */}
            <div className={styles.documentsSection}>
              <h3>Uploaded Documents ({selectedUser.kycDocuments?.length || 0})</h3>
              {selectedUser.kycDocuments?.length > 0 ? (
                <div className={styles.docGrid}>
                  {selectedUser.kycDocuments.map((doc) => (
                    <div key={doc.id} className={styles.docCard}>
                      <img
                        src={`${getApiBaseUrl()}${doc.fileUrl}`}
                        alt={DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                        className={styles.docImage}
                        onClick={() => window.open(`${getApiBaseUrl()}${doc.fileUrl}`, '_blank')}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" fill="%23e5e7eb"><rect width="200" height="180"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14">No Preview</text></svg>';
                        }}
                      />
                      <div className={styles.docMeta}>
                        <div className={styles.docType}>
                          {DOC_TYPE_LABELS[doc.documentType] || doc.documentType}
                        </div>
                        {doc.documentNumber && (
                          <div className={styles.docNumber}>#{doc.documentNumber}</div>
                        )}
                        <Badge
                          variant={doc.status === 'APPROVED' ? 'accent' : doc.status === 'REJECTED' ? 'danger' : 'warning'}
                        >
                          {doc.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--color-text-secondary)' }}>No documents uploaded yet.</p>
              )}
            </div>

            {/* Actions */}
            <div className={styles.reviewActions}>
              {!showRejectInput ? (
                <>
                  <Button variant="primary" onClick={handleApprove} disabled={submitting} style={{ flex: 1 }}>
                    <CheckCircle size={16} /> Approve KYC
                  </Button>
                  <Button variant="danger" onClick={() => setShowRejectInput(true)} disabled={submitting} style={{ flex: 1 }}>
                    <XCircle size={16} /> Reject
                  </Button>
                </>
              ) : (
                <div style={{ width: '100%' }}>
                  <Input
                    label="Rejection Reason"
                    placeholder="Explain why documents are not acceptable..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                    <Button variant="danger" onClick={handleReject} disabled={submitting || !rejectionReason.trim()} style={{ flex: 1 }}>
                      Confirm Rejection
                    </Button>
                    <Button variant="secondary" onClick={() => setShowRejectInput(false)} style={{ flex: 1 }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
