'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, PackageOpen, Scale, ClipboardCheck,
  FileText, CheckCircle, AlertTriangle, Truck, Download, ArrowRightLeft,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { api, ApiError } from '@/lib/api-client';
import {
  formatWeight, formatDate, formatRelativeTime, formatCurrency,
  getCommodityLabel, getStatusLabel, getStatusColor,
} from '@/lib/formatters';
import type { InventoryLot, InventoryTransaction } from '@/types/models';
import styles from './lot-detail.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function LotDetailPage() {
  const params = useParams();
  const router = useRouter();
  const lotId = params.id as string;

  const [lot, setLot] = useState<InventoryLot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Release modal state
  const [showRelease, setShowRelease] = useState(false);
  const [releaseForm, setReleaseForm] = useState({ weightKg: '', bagCount: '', notes: '' });
  const [releasing, setReleasing] = useState(false);
  const [releaseResult, setReleaseResult] = useState<{ gatePassNumber: string } | null>(null);
  const [releaseError, setReleaseError] = useState('');

  // Quality update state
  const [editingQuality, setEditingQuality] = useState(false);
  const [qualityForm, setQualityForm] = useState({ qualityGrade: '', qualityNotes: '', moistureContent: '' });
  const [savingQuality, setSavingQuality] = useState(false);

  // Transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [chambers, setChambers] = useState<any[]>([]);
  const [transferTarget, setTransferTarget] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');

  const loadLot = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get<any>(`/inventory/lots/${lotId}`);
      if (res.success && res.data) {
        setLot(res.data);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load lot details');
      }
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    if (lotId) loadLot();
  }, [lotId, loadLot]);

  // ── Release Handler ──────────────────────────
  const handleRelease = async () => {
    if (!releaseForm.weightKg) return;
    setReleasing(true);
    setReleaseError('');
    try {
      const res = await api.post<any>(`/inventory/lots/${lotId}/release`, {
        weightKg: parseFloat(releaseForm.weightKg),
        bagCount: releaseForm.bagCount ? parseInt(releaseForm.bagCount) : undefined,
        notes: releaseForm.notes || undefined,
      });
      if (res.success) {
        setReleaseResult({ gatePassNumber: res.data.gatePassNumber });
        loadLot(); // Refresh lot data
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setReleaseError(err.message);
      } else {
        setReleaseError('Failed to process release');
      }
    } finally {
      setReleasing(false);
    }
  };

  const closeReleaseModal = () => {
    setShowRelease(false);
    setReleaseForm({ weightKg: '', bagCount: '', notes: '' });
    setReleaseResult(null);
    setReleaseError('');
  };

  // ── Quality Update Handler ───────────────────
  const startQualityEdit = () => {
    if (!lot) return;
    setQualityForm({
      qualityGrade: lot.qualityGrade || '',
      qualityNotes: lot.qualityNotes || '',
      moistureContent: lot.moistureContent?.toString() || '',
    });
    setEditingQuality(true);
  };

  const handleQualitySave = async () => {
    setSavingQuality(true);
    try {
      await api.patch(`/inventory/lots/${lotId}/quality`, {
        qualityGrade: qualityForm.qualityGrade || undefined,
        qualityNotes: qualityForm.qualityNotes || undefined,
        moistureContent: qualityForm.moistureContent ? parseFloat(qualityForm.moistureContent) : undefined,
      });
      setEditingQuality(false);
      loadLot();
    } catch (err) {
      console.error('Quality update failed:', err);
    } finally {
      setSavingQuality(false);
    }
  };

  // ── Transaction Timeline Helpers ─────────────
  const getTxnLabel = (type: string): string => {
    const labels: Record<string, string> = {
      INTAKE: 'Inventory Intake',
      PARTIAL_RELEASE: 'Partial Release',
      FULL_RELEASE: 'Full Release',
      QUALITY_UPDATE: 'Quality Updated',
      WEIGHT_ADJUSTMENT: 'Weight Adjustment',
      TRANSFER: 'Chamber Transfer',
    };
    return labels[type] || type;
  };

  const getTxnDotClass = (type: string): string => {
    if (type === 'INTAKE') return styles.dotIntake;
    if (type.includes('RELEASE')) return styles.dotRelease;
    if (type === 'QUALITY_UPDATE') return styles.dotQuality;
    return styles.dotDefault;
  };

  // ── Weight Percent ───────────────────────────
  const weightPercent = lot ? Math.min(100, (lot.currentWeightKg / lot.intakeWeightKg) * 100) : 0;
  const canRelease = lot && ['STORED', 'PARTIALLY_RELEASED'].includes(lot.status);

  // Calculate remaining weight for release preview
  const releaseWeightKg = parseFloat(releaseForm.weightKg) || 0;
  const remainingAfterRelease = lot ? lot.currentWeightKg - releaseWeightKg : 0;
  const isFullRelease = lot ? releaseWeightKg >= lot.currentWeightKg : false;

  // ── Render ───────────────────────────────────
  if (loading) {
    return (
      <>
        <Header title="Lot Details" subtitle="Loading..." />
        <main className={styles.content}>
          <div className={styles.loadingState}>
            <div className={styles.loadingSpinner} />
            <p>Loading lot details...</p>
          </div>
        </main>
      </>
    );
  }

  if (error || !lot) {
    return (
      <>
        <Header title="Lot Details" subtitle="Error" />
        <main className={styles.content}>
          <div className={styles.emptyState}>
            <AlertTriangle size={40} />
            <p>{error || 'Lot not found'}</p>
            <Button variant="secondary" onClick={() => router.push('/wms/inventory')}>Back to Inventory</Button>
          </div>
        </main>
      </>
    );
  }

  const daysSinceIntake = Math.floor((Date.now() - new Date(lot.intakeDate).getTime()) / (1000 * 60 * 60 * 24));

  return (
    <>
      <Header
        title="Lot Details"
        subtitle={`${lot.lotNumber} — ${lot.commodityName}`}
      />

      <main className={styles.content}>
        {/* Back Link */}
        <button className={styles.backLink} onClick={() => router.push('/wms/inventory')}>
          <ArrowLeft size={14} /> Back to Inventory
        </button>

        <div className={styles.infoGrid}>
          {/* ── Left Column: Lot Details ─────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Lot Header Card */}
            <Card padding="lg">
              <div className={styles.lotHeader}>
                <div className={styles.lotId}>
                  <span className={styles.lotNumber}>{lot.lotNumber}</span>
                  <span className={styles.receiptNumber}>Receipt: {lot.receiptNumber}</span>
                </div>
                <div className={styles.lotActions}>
                  <Badge variant={getStatusColor(lot.status) as any}>
                    {getStatusLabel(lot.status)}
                  </Badge>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={() => {
                      const token = localStorage.getItem('accessToken');
                      window.open(`${API_BASE}/inventory/lots/${lot.id}/receipt?token=${token}`, '_blank');
                    }}
                  >
                    Receipt
                  </Button>
                  {canRelease && (
                    <Button variant="primary" size="sm" icon={<PackageOpen size={14} />} onClick={() => setShowRelease(true)}>
                      Release Stock
                    </Button>
                  )}
                  {canRelease && (
                    <Button variant="secondary" size="sm" icon={<ArrowRightLeft size={14} />} onClick={async () => {
                      try {
                        const res = await api.get<any>(`/facilities/${lot.facilityId}/chambers`);
                        if (res.success) setChambers((res.data || []).filter((c: any) => c.id !== lot.chamberId && c.status === 'OPERATIONAL'));
                      } catch { /* silent */ }
                      setShowTransfer(true);
                    }}>
                      Transfer
                    </Button>
                  )}
                </div>
              </div>

              {/* Weight Progress */}
              <div className={styles.weightProgress} style={{ marginTop: 'var(--space-5)' }}>
                <div className={styles.weightBar}>
                  <div className={styles.weightFill} style={{ width: `${weightPercent}%` }} />
                </div>
                <div className={styles.weightLabels}>
                  <span>Current: {formatWeight(lot.currentWeightKg)}</span>
                  <span>Intake: {formatWeight(lot.intakeWeightKg)}</span>
                </div>
              </div>

              {/* Commodity & Depositor */}
              <div className={styles.detailSection} style={{ marginTop: 'var(--space-5)' }}>
                <div className={styles.sectionTitle}>Commodity Details</div>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Category</span>
                    <span className={styles.detailValue}>{getCommodityLabel(lot.commodityCategory)}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Variety / Name</span>
                    <span className={styles.detailValue}>{lot.commodityName}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Bag Count</span>
                    <span className={styles.detailValueMono}>{lot.bagCount?.toLocaleString() || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Quality Grade</span>
                    <span className={styles.detailValue}>
                      {lot.qualityGrade ? (
                        <Badge variant={lot.qualityGrade === 'A' ? 'accent' : lot.qualityGrade === 'B' ? 'warning' : 'danger'}>
                          Grade {lot.qualityGrade}
                        </Badge>
                      ) : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className={styles.detailSection} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.sectionTitle}>Storage Location</div>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Facility</span>
                    <span className={styles.detailValue}>{lot.facility?.name || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Chamber</span>
                    <span className={styles.detailValueMono}>
                      {lot.chamber?.chamberNumber} — {lot.chamber?.name || 'Unnamed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Depositor */}
              <div className={styles.detailSection} style={{ marginTop: 'var(--space-4)' }}>
                <div className={styles.sectionTitle}>Depositor</div>
                <div className={styles.detailGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Name</span>
                    <span className={styles.detailValue}>{lot.depositor?.fullName || '—'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Phone</span>
                    <span className={styles.detailValueMono}>{lot.depositor?.phone || '—'}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Quality Assessment Card */}
            <Card padding="lg">
              <CardHeader
                title="Quality Assessment"
                action={
                  canRelease && !editingQuality ? (
                    <Button variant="ghost" size="sm" icon={<ClipboardCheck size={14} />} onClick={startQualityEdit}>
                      Update
                    </Button>
                  ) : undefined
                }
              />

              {editingQuality ? (
                <div className={styles.qualityForm} style={{ marginTop: 'var(--space-4)' }}>
                  <Select
                    label="Quality Grade"
                    value={qualityForm.qualityGrade}
                    onChange={(e) => setQualityForm(prev => ({ ...prev, qualityGrade: e.target.value }))}
                    options={[
                      { value: '', label: 'Not assessed' },
                      { value: 'A', label: 'Grade A — Excellent' },
                      { value: 'B', label: 'Grade B — Good' },
                      { value: 'C', label: 'Grade C — Fair' },
                      { value: 'REJECTED', label: 'Rejected' },
                    ]}
                  />
                  <Input
                    label="Moisture Content (%)"
                    type="number"
                    value={qualityForm.moistureContent}
                    onChange={(e) => setQualityForm(prev => ({ ...prev, moistureContent: e.target.value }))}
                    placeholder="e.g. 12.5"
                  />
                  <div className={`${styles.qualityForm} ${styles.fullWidth}`} style={{ gridColumn: '1 / -1' }}>
                    <Input
                      label="Quality Notes"
                      value={qualityForm.qualityNotes}
                      onChange={(e) => setQualityForm(prev => ({ ...prev, qualityNotes: e.target.value }))}
                      placeholder="Observations about quality..."
                    />
                  </div>
                  <div className={styles.qualityActions}>
                    <Button variant="secondary" size="sm" onClick={() => setEditingQuality(false)}>Cancel</Button>
                    <Button variant="primary" size="sm" loading={savingQuality} onClick={handleQualitySave}>Save</Button>
                  </div>
                </div>
              ) : (
                <div className={styles.detailGrid} style={{ marginTop: 'var(--space-4)' }}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Grade</span>
                    <span className={styles.detailValue}>
                      {lot.qualityGrade ? `Grade ${lot.qualityGrade}` : 'Not assessed'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Moisture</span>
                    <span className={styles.detailValueMono}>
                      {lot.moistureContent ? `${lot.moistureContent}%` : '—'}
                    </span>
                  </div>
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Notes</span>
                    <span className={styles.detailValue}>{lot.qualityNotes || 'No notes'}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Transaction History */}
            <Card padding="lg">
              <CardHeader title="Transaction History" subtitle={`${lot.transactions?.length || 0} events`} />

              {lot.transactions && lot.transactions.length > 0 ? (
                <div className={styles.timeline} style={{ marginTop: 'var(--space-5)' }}>
                  {lot.transactions.map((txn) => (
                    <div key={txn.id} className={styles.timelineItem}>
                      <div className={`${styles.timelineDot} ${getTxnDotClass(txn.transactionType)}`} />
                      <div className={styles.timelineContent}>
                        <span className={styles.timelineTitle}>{getTxnLabel(txn.transactionType)}</span>
                        <span className={styles.timelineDesc}>
                          {formatWeight(txn.weightKg)}
                          {txn.bagCount ? ` · ${txn.bagCount} bags` : ''}
                          {txn.notes ? ` — ${txn.notes}` : ''}
                        </span>
                        <div className={styles.timelineMeta}>
                          <span>{formatRelativeTime(txn.performedAt)}</span>
                          <span>{formatDate(txn.performedAt)}</span>
                          {txn.performer && <span>by {txn.performer.fullName}</span>}
                        </div>
                        {txn.gatePassNumber && (
                          <div className={styles.gatePass}>
                            <Truck size={10} /> Gate Pass: {txn.gatePassNumber}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  <Package size={32} />
                  <p>No transaction history</p>
                </div>
              )}
            </Card>
          </div>

          {/* ── Right Column: Summary Sidebar ────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            {/* Quick Summary */}
            <Card padding="lg">
              <CardHeader title="Summary" />
              <div className={styles.summaryCard} style={{ marginTop: 'var(--space-3)' }}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Days in Storage</span>
                  <span className={styles.summaryValue}>{daysSinceIntake}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Intake Date</span>
                  <span className={styles.summaryValue}>{formatDate(lot.intakeDate)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Expected Release</span>
                  <span className={styles.summaryValue}>
                    {lot.expectedRelease ? formatDate(lot.expectedRelease) : '—'}
                  </span>
                </div>
                {lot.actualReleaseDate && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>Released On</span>
                    <span className={styles.summaryValue}>{formatDate(lot.actualReleaseDate)}</span>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Applied Rate</span>
                  <span className={styles.summaryValue}>
                    {lot.appliedRate ? `₹${lot.appliedRate}/day/MT` : '—'}
                  </span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Rent Accrued</span>
                  <span className={styles.summaryValue}>{formatCurrency(lot.totalRentAccrued)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>Rent Paid</span>
                  <span className={styles.summaryValue}>{formatCurrency(lot.totalRentPaid)}</span>
                </div>
              </div>
            </Card>

            {/* Invoices */}
            <Card padding="lg">
              <CardHeader
                title="Invoices"
                action={
                  <Button variant="ghost" size="sm" icon={<FileText size={14} />} onClick={() => router.push('/wms/invoices/create')}>
                    Create
                  </Button>
                }
              />

              {(lot as any).invoices && (lot as any).invoices.length > 0 ? (
                <div className={styles.invoiceList} style={{ marginTop: 'var(--space-3)' }}>
                  {(lot as any).invoices.map((inv: any) => (
                    <div
                      key={inv.id}
                      className={styles.invoiceRow}
                      onClick={() => router.push(`/wms/invoices/${inv.id}`)}
                    >
                      <div className={styles.invoiceInfo}>
                        <span className={styles.invoiceNumber}>{inv.invoiceNumber}</span>
                        <span className={styles.invoiceDate}>{formatDate(inv.issueDate)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <span className={styles.invoiceAmount}>{formatCurrency(inv.totalAmount)}</span>
                        <Badge variant={getStatusColor(inv.status) as any} size="sm">
                          {getStatusLabel(inv.status)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState} style={{ padding: 'var(--space-4)' }}>
                  <FileText size={24} />
                  <p>No invoices yet</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </main>

      {/* ── Release Modal ─────────────────────────── */}
      <Modal
        isOpen={showRelease}
        onClose={closeReleaseModal}
        title="Release Inventory"
        subtitle={`${lot.lotNumber} — ${lot.commodityName}`}
        size="md"
        footer={
          releaseResult ? (
            <Button variant="primary" onClick={closeReleaseModal}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={closeReleaseModal}>Cancel</Button>
              <Button
                variant="primary"
                onClick={handleRelease}
                loading={releasing}
                disabled={!releaseForm.weightKg || releaseWeightKg <= 0 || releaseWeightKg > lot.currentWeightKg}
              >
                {isFullRelease ? 'Full Release' : 'Partial Release'}
              </Button>
            </>
          )
        }
      >
        {releaseResult ? (
          <div className={styles.releaseSuccess}>
            <CheckCircle size={48} />
            <h3>Release Processed Successfully</h3>
            <p>The inventory has been released and chamber occupancy has been updated.</p>
            <div className={styles.gatePass} style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-4)' }}>
              <Truck size={14} /> Gate Pass: {releaseResult.gatePassNumber}
            </div>
          </div>
        ) : (
          <div className={styles.releaseInfo}>
            {releaseError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'rgba(244,63,94,0.06)', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger-400)', fontSize: 'var(--text-sm)' }}>
                <AlertTriangle size={16} /> {releaseError}
              </div>
            )}

            {/* Current State */}
            <div className={styles.releasePreview}>
              <div className={styles.releasePreviewGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Current Weight</span>
                  <span className={styles.detailValueMono}>{formatWeight(lot.currentWeightKg)}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Bags</span>
                  <span className={styles.detailValueMono}>{lot.bagCount?.toLocaleString() || '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Chamber</span>
                  <span className={styles.detailValue}>{lot.chamber?.chamberNumber}</span>
                </div>
              </div>
            </div>

            {/* Release Form */}
            <Input
              label="Release Weight (kg) *"
              type="number"
              placeholder={`Max: ${lot.currentWeightKg.toLocaleString()} kg`}
              value={releaseForm.weightKg}
              onChange={(e) => setReleaseForm(prev => ({ ...prev, weightKg: e.target.value }))}
              hint={releaseWeightKg > 0 ? `Remaining after release: ${formatWeight(Math.max(0, remainingAfterRelease))}${isFullRelease ? ' (Full Release)' : ''}` : undefined}
            />

            <Input
              label="Bags to Release"
              type="number"
              placeholder="Optional"
              value={releaseForm.bagCount}
              onChange={(e) => setReleaseForm(prev => ({ ...prev, bagCount: e.target.value }))}
            />

            <Input
              label="Notes"
              placeholder="Release notes, vehicle details..."
              value={releaseForm.notes}
              onChange={(e) => setReleaseForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>
        )}
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => { setShowTransfer(false); setTransferError(''); }}
        title="Transfer to Another Chamber"
        footer={
          <Button variant="primary" loading={transferring} onClick={async () => {
            if (!transferTarget) { setTransferError('Select a target chamber'); return; }
            setTransferring(true); setTransferError('');
            try {
              const res = await api.post<any>(`/inventory/lots/${lot.id}/transfer`, { targetChamberId: transferTarget, notes: transferNotes });
              if (res.success) { setShowTransfer(false); loadLot(); }
            } catch (err) {
              setTransferError(err instanceof ApiError ? err.message : 'Transfer failed');
            } finally { setTransferring(false); }
          }}>
            Confirm Transfer
          </Button>
        }
      >
        {transferError && <div style={{ padding: '8px 12px', background: 'rgba(244,62,92,0.1)', border: '1px solid var(--color-danger-500)', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger-500)', fontSize: 'var(--text-sm)', marginBottom: 12 }}><AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{transferError}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Moving lot <strong>{lot.lotNumber}</strong> ({formatWeight(lot.currentWeightKg)}) to a different chamber.
          </p>
          <Select
            label="Target Chamber"
            value={transferTarget}
            onChange={(e) => setTransferTarget(e.target.value)}
            options={[
              { value: '', label: 'Select chamber...' },
              ...chambers.map((c: any) => ({
                value: c.id,
                label: `${c.chamberNumber}${c.name ? ` — ${c.name}` : ''} (${Number(c.occupiedMt || 0).toFixed(1)} / ${Number(c.capacityMt || 0).toFixed(1)} MT)`,
              })),
            ]}
          />
          <Input label="Notes (optional)" value={transferNotes} onChange={(e) => setTransferNotes(e.target.value)} placeholder="Reason for transfer..." />
        </div>
      </Modal>
    </>
  );
}
