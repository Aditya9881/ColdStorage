'use client';

import React, { useEffect, useState } from 'react';
import { Clock, AlertOctagon, ClipboardList, AlertTriangle, FileText, CheckCircle, PartyPopper, Factory } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/formatters';
import styles from './compliance.module.css';

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

export default function CompliancePage() {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompliance();
  }, []);

  const loadCompliance = async () => {
    try {
      const res = await api.get<any>('/analytics/compliance');
      if (res.success) setData(res.data);
    } catch (err) {
      console.error('Failed to load compliance:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="Compliance Monitor"
      subtitle="Track document validity and facility compliance status"
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Compliance' },
      ]}
    >
        {/* Compliance KPIs */}
        <div className={`${styles.statsGrid} stagger-in`}>
          <StatsCard
            title="Expiring Soon"
            value={data?.expiringSoon ?? '—'}
            subtitle="Within 30 days"
            icon={<Clock size={18} />}
            variant="warning"
          />
          <StatsCard
            title="Expired"
            value={data?.expiredDocuments ?? '—'}
            subtitle="Requires renewal"
            icon={<AlertOctagon size={18} />}
            variant="danger"
          />
          <StatsCard
            title="Pending Review"
            value={data?.pendingReview ?? '—'}
            subtitle="Awaiting approval"
            icon={<ClipboardList size={18} />}
            variant="info"
          />
          <StatsCard
            title="No Documents"
            value={data?.facilitiesWithoutDocuments ?? '—'}
            subtitle="Missing compliance docs"
            icon={<AlertTriangle size={18} />}
            variant="danger"
          />
        </div>

        {/* Expiring Soon */}
        <Card padding="md">
          <CardHeader
            title="Documents Expiring Soon"
            subtitle="Licenses and permits expiring within 30 days"
            action={<Badge variant="warning">{data?.details?.expiringSoon?.length ?? 0} documents</Badge>}
          />
          {data?.details?.expiringSoon?.length ? (
            <div className={styles.docList}>
              {data.details.expiringSoon.map((doc: any, i: number) => (
                <div key={doc.id || i} className={styles.docItem}>
                  <div className={styles.docIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}><FileText size={16} /></div>
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>
                    <span className={styles.docMeta}>
                      {doc.facility?.name} · {doc.facility?.state}
                    </span>
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
            action={<Badge variant="danger">{data?.details?.expired?.length ?? 0} expired</Badge>}
          />
          {data?.details?.expired?.length ? (
            <div className={styles.docList}>
              {data.details.expired.map((doc: any, i: number) => (
                <div key={doc.id || i} className={`${styles.docItem} ${styles.docExpired}`}>
                  <div className={styles.docIcon} style={{ background: 'rgba(244, 63, 94, 0.1)' }}><AlertOctagon size={16} /></div>
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{doc.documentType?.replace(/_/g, ' ') || 'Document'}</span>
                    <span className={styles.docMeta}>
                      {doc.facility?.name} · {doc.facility?.state}
                    </span>
                  </div>
                  <div className={styles.docExpiry}>
                    <span className={styles.expiryLabel}>Expired</span>
                    <span className={styles.expiryDate} style={{ color: 'var(--color-danger-400)' }}>
                      {formatDate(doc.expiryDate)}
                    </span>
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
            action={<Badge variant="danger">{data?.details?.facilitiesWithoutDocs?.length ?? 0} facilities</Badge>}
          />
          {data?.details?.facilitiesWithoutDocs?.length ? (
            <div className={styles.docList}>
              {data.details.facilitiesWithoutDocs.map((f: any, i: number) => (
                <div key={f.id || i} className={styles.docItem}>
                  <div className={styles.docIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}><Factory size={16} /></div>
                  <div className={styles.docInfo}>
                    <span className={styles.docName}>{f.name}</span>
                    <span className={styles.docMeta}>{f.city}, {f.state}</span>
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
    </PageLayout>
  );
}
