'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import { intakeSchema, validateForm, ValidationErrors, getFieldError } from '@/lib/validation';
import styles from './intake.module.css';

export default function IntakePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [chambers, setChambers] = useState<any[]>([]);
  const [depositors, setDepositors] = useState<any[]>([]);
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors | null>(null);

  const [form, setForm] = useState({
    chamberId: '',
    depositorId: '',
    commodityCategory: 'POTATO',
    commodityName: '',
    intakeWeightKg: '',
    bagCount: '',
    qualityGrade: 'A',
    qualityNotes: '',
    moistureContent: '',
    expectedRelease: '',
  });

  useEffect(() => {
    loadDependencies();
  }, []);

  const loadDependencies = async () => {
    try {
      const [chambersRes, usersRes] = await Promise.allSettled([
        api.get<any>('/chambers'),
        api.get<any>('/users/depositors'),
      ]);

      if (chambersRes.status === 'fulfilled' && chambersRes.value.success) {
        setChambers(chambersRes.value.data || []);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value.success) {
        setDepositors(usersRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load form data:', err);
    }
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear field error on change
    if (fieldErrors?.[field]) {
      setFieldErrors((prev) => {
        if (!prev) return null;
        const next = { ...prev };
        delete next[field];
        return Object.keys(next).length ? next : null;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate with Zod
    const result = validateForm(intakeSchema, form);
    if (!result.success) {
      setFieldErrors(result.errors);
      setError('Please fix the highlighted fields');
      return;
    }
    setFieldErrors(null);
    setLoading(true);

    try {
      // Get facilityId from the selected chamber
      const selectedChamber = chambers.find((c: any) => c.id === form.chamberId);
      const facilityId = selectedChamber?.facilityId;

      if (!facilityId) {
        setError('Please select a valid chamber');
        setLoading(false);
        return;
      }

      const payload = {
        facilityId,
        chamberId: form.chamberId,
        depositorId: form.depositorId,
        commodityCategory: form.commodityCategory,
        commodityName: form.commodityName,
        intakeWeightKg: parseFloat(form.intakeWeightKg),
        bagCount: form.bagCount ? parseInt(form.bagCount) : undefined,
        qualityGrade: form.qualityGrade || undefined,
        qualityNotes: form.qualityNotes || undefined,
        moistureContent: form.moistureContent ? parseFloat(form.moistureContent) : undefined,
        expectedRelease: form.expectedRelease || undefined,
      };

      const res = await api.post<any>('/inventory/intake', payload);
      if (res.success) {
        setSuccess(`Lot ${res.data.lotNumber} created successfully! Receipt: ${res.data.receiptNumber}`);
        setTimeout(() => router.push('/wms/inventory'), 2000);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to create intake. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageLayout
      title="New Inventory Intake"
      subtitle="Register incoming stock into the facility"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Inventory', href: '/wms/inventory' },
        { label: 'New Intake' },
      ]}
    >
        <Card padding="lg">
          <CardHeader title="Intake Details" subtitle="Fill in the details for the new inventory lot" />

          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={16} /> <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles.successBanner}>
              <CheckCircle size={16} /> <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              {/* Chamber Selection */}
              <Select
                label="Storage Chamber *"
                value={form.chamberId}
                onChange={(e) => handleChange('chamberId', e.target.value)}
                options={[
                  { value: '', label: 'Select a chamber...' },
                  ...chambers
                    .filter((c) => c.status === 'OPERATIONAL')
                    .map((c) => ({
                      value: c.id,
                      label: `${c.chamberNumber} — ${c.name || 'Unnamed'} (${c.occupiedMt}/${c.capacityMt} MT)`,
                    })),
                ]}
              />

              {/* Depositor */}
              <Select
                label="Depositor (Farmer) *"
                value={form.depositorId}
                onChange={(e) => handleChange('depositorId', e.target.value)}
                options={[
                  { value: '', label: 'Select depositor...' },
                  ...depositors.map((d) => ({
                    value: d.id,
                    label: `${d.fullName} (${d.phone})`,
                  })),
                ]}
              />

              {/* Commodity */}
              <Select
                label="Commodity Category *"
                value={form.commodityCategory}
                onChange={(e) => handleChange('commodityCategory', e.target.value)}
                options={[
                  { value: 'POTATO', label: 'Potato' },
                  { value: 'ONION', label: 'Onion' },
                  { value: 'VEGETABLES', label: 'Vegetables' },
                  { value: 'FRUITS', label: 'Fruits' },
                  { value: 'DAIRY', label: 'Dairy' },
                  { value: 'FROZEN_SEAFOOD', label: 'Frozen Seafood' },
                  { value: 'FROZEN_MEAT', label: 'Frozen Meat' },
                  { value: 'PROCESSED_FOOD', label: 'Processed Food' },
                  { value: 'SEEDS', label: 'Seeds' },
                  { value: 'OTHER', label: 'Other' },
                ]}
              />

              <Input
                label="Commodity Name / Variety *"
                placeholder="e.g. Kufri Jyoti, Nasik Red"
                value={form.commodityName}
                onChange={(e) => handleChange('commodityName', e.target.value)}
                required
              />

              <Input
                label="Intake Weight (kg) *"
                type="number"
                placeholder="e.g. 50000"
                value={form.intakeWeightKg}
                onChange={(e) => handleChange('intakeWeightKg', e.target.value)}
                hint="Total weight at intake in kilograms"
                required
              />

              <Input
                label="Number of Bags"
                type="number"
                placeholder="e.g. 500"
                value={form.bagCount}
                onChange={(e) => handleChange('bagCount', e.target.value)}
                hint="Optional — for bag-type storage"
              />

              <Select
                label="Quality Grade"
                value={form.qualityGrade}
                onChange={(e) => handleChange('qualityGrade', e.target.value)}
                options={[
                  { value: 'A', label: 'Grade A — Excellent' },
                  { value: 'B', label: 'Grade B — Good' },
                  { value: 'C', label: 'Grade C — Fair' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
              />

              <Input
                label="Moisture Content (%)"
                type="number"
                placeholder="e.g. 12.5"
                value={form.moistureContent}
                onChange={(e) => handleChange('moistureContent', e.target.value)}
              />

              <Input
                label="Expected Release Date"
                type="date"
                value={form.expectedRelease}
                onChange={(e) => handleChange('expectedRelease', e.target.value)}
              />

              <Input
                label="Quality Notes"
                placeholder="Any quality observations..."
                value={form.qualityNotes}
                onChange={(e) => handleChange('qualityNotes', e.target.value)}
              />
            </div>

            <div className={styles.formActions}>
              <Button variant="secondary" type="button" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={loading} size="lg">
                Register Intake
              </Button>
            </div>
          </form>
        </Card>
    </PageLayout>
  );
}
