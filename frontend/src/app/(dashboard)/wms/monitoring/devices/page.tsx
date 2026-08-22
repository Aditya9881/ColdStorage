'use client';

import React, { useState } from 'react';
import { Cpu, Plus, Wifi, WifiOff, Trash2, Edit, AlertTriangle, CheckCircle } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatsCard } from '@/components/ui/StatsCard';
import { Input, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useApiQuery, useApiMutation } from '@/hooks/useApiQuery';
import { formatRelativeTime } from '@/lib/formatters';
import { api, ApiError } from '@/lib/api-client';
import styles from './devices.module.css';

interface IoTDevice {
  id: string;
  deviceId: string;
  deviceType: string;
  description?: string | null;
  mqttTopic?: string | null;
  firmwareVersion?: string | null;
  isActive: boolean;
  lastHeartbeat?: string | null;
  createdAt: string;
  facility?: { id: string; name: string } | null;
  chamber?: { id: string; chamberNumber: string; name: string } | null;
}

function isOnline(lastHeartbeat?: string | null): boolean {
  if (!lastHeartbeat) return false;
  const diff = Date.now() - new Date(lastHeartbeat).getTime();
  return diff < 5 * 60 * 1000; // 5 minutes threshold
}

export default function IoTDevicesPage() {
  const { data: devicesData, loading, refetch } = useApiQuery<any>('/iot-devices');
  const [showRegister, setShowRegister] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<IoTDevice | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [form, setForm] = useState({
    deviceId: '',
    deviceType: 'TEMPERATURE_SENSOR',
    chamberId: '',
    description: '',
    firmwareVersion: '',
  });

  // Load chambers for the register form
  const { data: chambers } = useApiQuery<any>('/chambers');

  const devices: IoTDevice[] = devicesData?.devices || [];

  const totalDevices = devices.length;
  const activeDevices = devices.filter((d) => d.isActive).length;
  const onlineDevices = devices.filter((d) => d.isActive && isOnline(d.lastHeartbeat)).length;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');
    setRegisterLoading(true);

    try {
      // Get facilityId from chambers
      const chambersArr = Array.isArray(chambers) ? chambers : (chambers?.data || []);
      const selectedChamber = chambersArr.find((c: any) => c.id === form.chamberId);
      const facilityId = selectedChamber?.facilityId;

      if (!facilityId && !form.chamberId) {
        // Try to get first facility from any chamber
        const firstFacility = chambersArr[0]?.facilityId;
        if (!firstFacility) {
          setRegisterError('No facility found. Please create a facility first.');
          setRegisterLoading(false);
          return;
        }
      }

      const payload = {
        facilityId: selectedChamber?.facilityId || chambersArr[0]?.facilityId,
        deviceId: form.deviceId,
        deviceType: form.deviceType,
        chamberId: form.chamberId || undefined,
        description: form.description || undefined,
        firmwareVersion: form.firmwareVersion || undefined,
      };

      const res = await api.post<any>('/iot-devices', payload);
      if (res.success) {
        setRegisterSuccess(`Device ${form.deviceId} registered successfully!`);
        setForm({ deviceId: '', deviceType: 'TEMPERATURE_SENSOR', chamberId: '', description: '', firmwareVersion: '' });
        refetch();
        setTimeout(() => { setShowRegister(false); setRegisterSuccess(''); }, 1500);
      }
    } catch (err) {
      setRegisterError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/iot-devices/${deleteTarget.id}`);
      refetch();
      setDeleteTarget(null);
    } catch (err) {
      // Silent — will show in next refetch
    } finally {
      setDeleteLoading(false);
    }
  };

  const chambersArr = Array.isArray(chambers) ? chambers : (chambers?.data || []);

  return (
    <PageLayout
      title="IoT Devices"
      subtitle="Manage temperature and humidity sensors"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Monitoring', href: '/wms/monitoring' },
        { label: 'Devices' },
      ]}
      actions={
        <Button variant="primary" onClick={() => setShowRegister(true)}>
          <Plus size={16} /> Register Device
        </Button>
      }
    >
      {/* Stats */}
      <div className={styles.statsRow}>
        <StatsCard title="Total Devices" value={totalDevices} icon={<Cpu size={18} />} />
        <StatsCard title="Active" value={activeDevices} icon={<Wifi size={18} />} variant="success" />
        <StatsCard title="Online Now" value={onlineDevices} icon={<Wifi size={18} />} variant="info" />
        <StatsCard
          title="Offline"
          value={activeDevices - onlineDevices}
          icon={<WifiOff size={18} />}
          variant={activeDevices - onlineDevices > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Device Grid */}
      {loading ? (
        <div className={styles.emptyState}><p>Loading devices…</p></div>
      ) : devices.length === 0 ? (
        <div className={styles.emptyState}>
          <Cpu size={40} />
          <p>No IoT devices registered yet</p>
          <Button variant="secondary" onClick={() => setShowRegister(true)}>
            <Plus size={14} /> Register Your First Device
          </Button>
        </div>
      ) : (
        <div className={styles.deviceGrid}>
          {devices.map((device) => {
            const online = isOnline(device.lastHeartbeat);
            return (
              <Card key={device.id} padding="md">
                <div className={styles.deviceHeader}>
                  <div>
                    <div className={styles.deviceId}>{device.deviceId}</div>
                    <div className={styles.deviceType}>{device.deviceType.replace(/_/g, ' ')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <div className={styles.heartbeat}>
                      <span className={`${styles.heartbeatDot} ${device.isActive && online ? styles.online : styles.offline}`} />
                      {device.isActive ? (online ? 'Online' : 'Offline') : 'Inactive'}
                    </div>
                    <Badge variant={device.isActive ? 'success' : 'neutral'} size="sm">
                      {device.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                </div>

                <div className={styles.deviceMeta}>
                  {device.chamber && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Chamber</span>
                      <span className={styles.metaValue}>{device.chamber.chamberNumber} — {device.chamber.name}</span>
                    </div>
                  )}
                  {device.description && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Description</span>
                      <span className={styles.metaValue}>{device.description}</span>
                    </div>
                  )}
                  {device.mqttTopic && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>MQTT Topic</span>
                      <span className={styles.metaValue}>{device.mqttTopic}</span>
                    </div>
                  )}
                  {device.firmwareVersion && (
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>Firmware</span>
                      <span className={styles.metaValue}>v{device.firmwareVersion}</span>
                    </div>
                  )}
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>Last Heartbeat</span>
                    <span className={styles.metaValue}>
                      {device.lastHeartbeat ? formatRelativeTime(device.lastHeartbeat) : 'Never'}
                    </span>
                  </div>
                </div>

                <div className={styles.actions}>
                  {device.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(device)}
                    >
                      <Trash2 size={14} /> Deactivate
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={showRegister}
        onClose={() => { setShowRegister(false); setRegisterError(''); setRegisterSuccess(''); }}
        title="Register IoT Device"
        subtitle="Add a new sensor or controller"
        footer={
          <Button variant="primary" loading={registerLoading} onClick={handleRegister}>
            Register Device
          </Button>
        }
      >
        {registerError && (
          <div style={{ padding: '8px 12px', background: 'rgba(244,62,92,0.1)', border: '1px solid var(--color-danger-500)', borderRadius: 'var(--radius-lg)', color: 'var(--color-danger-500)', fontSize: 'var(--text-sm)', marginBottom: 12 }}>
            <AlertTriangle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{registerError}
          </div>
        )}
        {registerSuccess && (
          <div style={{ padding: '8px 12px', background: 'rgba(46,204,113,0.1)', border: '1px solid var(--color-success-500)', borderRadius: 'var(--radius-lg)', color: 'var(--color-success-500)', fontSize: 'var(--text-sm)', marginBottom: 12 }}>
            <CheckCircle size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{registerSuccess}
          </div>
        )}
        <form className={styles.registerForm} onSubmit={handleRegister}>
          <Input
            label="Device ID"
            value={form.deviceId}
            onChange={(e) => setForm(prev => ({ ...prev, deviceId: e.target.value }))}
            placeholder="e.g., SENSOR-CH1-001"
            required
          />
          <Select
            label="Device Type"
            value={form.deviceType}
            onChange={(e) => setForm(prev => ({ ...prev, deviceType: e.target.value }))}
            options={[
              { value: 'TEMPERATURE_SENSOR', label: 'Temperature Sensor' },
              { value: 'HUMIDITY_SENSOR', label: 'Humidity Sensor' },
              { value: 'TEMP_HUMIDITY_COMBO', label: 'Temp + Humidity Combo' },
              { value: 'DOOR_SENSOR', label: 'Door Sensor' },
              { value: 'POWER_METER', label: 'Power Meter' },
              { value: 'CONTROLLER', label: 'Controller' },
            ]}
          />
          <Select
            label="Assigned Chamber (optional)"
            value={form.chamberId}
            onChange={(e) => setForm(prev => ({ ...prev, chamberId: e.target.value }))}
            options={[
              { value: '', label: 'Unassigned' },
              ...chambersArr.map((c: any) => ({
                value: c.id,
                label: `${c.chamberNumber}${c.name ? ` — ${c.name}` : ''}`,
              })),
            ]}
          />
          <Input
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="e.g., Main chamber temperature sensor"
          />
          <Input
            label="Firmware Version (optional)"
            value={form.firmwareVersion}
            onChange={(e) => setForm(prev => ({ ...prev, firmwareVersion: e.target.value }))}
            placeholder="e.g., 1.2.3"
          />
        </form>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeactivate}
        title="Deactivate Device"
        message={`Are you sure you want to deactivate device "${deleteTarget?.deviceId}"? It will stop receiving data.`}
        confirmLabel="Deactivate"
        variant="danger"
        loading={deleteLoading}
      />
    </PageLayout>
  );
}
