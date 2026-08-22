'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, User, Lock, Bell } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import styles from './settings.module.css';

type Tab = 'profile' | 'security' | 'notifications';

interface NotificationPrefs {
  bookingUpdates: boolean;
  inventoryAlerts: boolean;
  invoiceReminders: boolean;
  temperatureAlerts: boolean;
  systemAnnouncements: boolean;
  channelWhatsApp: boolean;
  channelSMS: boolean;
  channelPush: boolean;
  channelEmail: boolean;
}

const defaultPrefs: NotificationPrefs = {
  bookingUpdates: true,
  inventoryAlerts: true,
  invoiceReminders: true,
  temperatureAlerts: true,
  systemAnnouncements: true,
  channelWhatsApp: true,
  channelSMS: false,
  channelPush: true,
  channelEmail: false,
};

function loadPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return defaultPrefs;
  try {
    const saved = localStorage.getItem('notification_prefs');
    return saved ? { ...defaultPrefs, ...JSON.parse(saved) } : defaultPrefs;
  } catch { return defaultPrefs; }
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profile, setProfile] = useState({
    fullName: '', email: '', phone: '',
    addressLine1: '', city: '', state: '', pincode: '', role: '',
  });

  // Password form
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  // Notification prefs
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs);

  useEffect(() => {
    loadProfile();
    setPrefs(loadPrefs());
  }, []);

  const loadProfile = async () => {
    try {
      const res = await api.get<any>('/users/me');
      if (res.success && res.data) {
        setProfile({
          fullName: res.data.fullName || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          addressLine1: res.data.addressLine1 || '',
          city: res.data.city || '',
          state: res.data.state || '',
          pincode: res.data.pincode || '',
          role: res.data.role || '',
        });
      }
    } catch {
      // silent
    }
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      const res = await api.patch<any>('/users/me', {
        fullName: profile.fullName,
        email: profile.email,
        addressLine1: profile.addressLine1,
        city: profile.city,
        state: profile.state,
        pincode: profile.pincode,
      });
      if (res.success) {
        setSuccess('Profile updated successfully');
        // Notify Header component to refresh the displayed name
        window.dispatchEvent(new Event('profile-updated'));
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);

    if (pw.newPassword !== pw.confirmPassword) {
      setError('New passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await api.patch<any>('/users/me/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      if (res.success) {
        setSuccess('Password changed successfully');
        setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const togglePref = (key: keyof NotificationPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('notification_prefs', JSON.stringify(next));
      return next;
    });
    setSuccess('Notification preferences saved');
    setTimeout(() => setSuccess(''), 2000);
  };

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={onChange} />
      <span className={styles.toggleTrack} />
    </label>
  );

  return (
    <PageLayout
      title="Settings"
      subtitle="Manage your profile and security"
      breadcrumbs={[
        { label: 'WMS', href: '/wms' },
        { label: 'Settings' },
      ]}
    >
        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`} onClick={() => { setTab('profile'); setSuccess(''); setError(''); }}>
            <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Profile
          </button>
          <button className={`${styles.tab} ${tab === 'security' ? styles.tabActive : ''}`} onClick={() => { setTab('security'); setSuccess(''); setError(''); }}>
            <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Security
          </button>
          <button className={`${styles.tab} ${tab === 'notifications' ? styles.tabActive : ''}`} onClick={() => { setTab('notifications'); setSuccess(''); setError(''); }}>
            <Bell size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Notifications
          </button>
        </div>

        {success && <div className={styles.successMsg}><CheckCircle size={14} /> {success}</div>}
        {error && <div className={styles.errorMsg}><AlertTriangle size={14} /> {error}</div>}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <Card padding="lg">
            <CardHeader title="Personal Information" subtitle="Update your name, email, and address" />

            <div className={styles.profileHeader}>
              <div className={styles.avatar}>{profile.fullName.charAt(0).toUpperCase()}</div>
              <div className={styles.profileMeta}>
                <div className={styles.profileName}>{profile.fullName}</div>
                <div className={styles.profileRole}>{profile.role.replace(/_/g, ' ').toLowerCase()}</div>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className={styles.form}>
              <div className={styles.formRow}>
                <Input label="Full Name" value={profile.fullName} onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))} required />
                <Input label="Phone" value={profile.phone} disabled />
              </div>
              <Input label="Email" type="email" value={profile.email} onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))} />
              <Input label="Address" value={profile.addressLine1} onChange={(e) => setProfile(p => ({ ...p, addressLine1: e.target.value }))} />
              <div className={styles.formRow}>
                <Input label="City" value={profile.city} onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))} />
                <Input label="State" value={profile.state} onChange={(e) => setProfile(p => ({ ...p, state: e.target.value }))} />
              </div>
              <Input label="Pincode" value={profile.pincode} onChange={(e) => setProfile(p => ({ ...p, pincode: e.target.value }))} />
              <div className={styles.formActions}>
                <Button variant="primary" type="submit" loading={loading}>Save Changes</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <Card padding="lg">
            <CardHeader title="Change Password" subtitle="Enter your current password and choose a new one" />
            <form onSubmit={handlePasswordChange} className={styles.form}>
              <Input label="Current Password" type="password" value={pw.currentPassword} onChange={(e) => setPw(p => ({ ...p, currentPassword: e.target.value }))} required />
              <div className={styles.formRow}>
                <Input label="New Password" type="password" value={pw.newPassword} onChange={(e) => setPw(p => ({ ...p, newPassword: e.target.value }))} required />
                <Input label="Confirm Password" type="password" value={pw.confirmPassword} onChange={(e) => setPw(p => ({ ...p, confirmPassword: e.target.value }))} required />
              </div>
              <div className={styles.formActions}>
                <Button variant="primary" type="submit" loading={loading}>Change Password</Button>
              </div>
            </form>
          </Card>
        )}

        {/* Notifications Tab */}
        {tab === 'notifications' && (
          <Card padding="lg">
            <CardHeader title="Notification Preferences" subtitle="Choose what you want to be notified about" />

            <div className={styles.prefGroup}>
              <div className={styles.prefGroupTitle}>Events</div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Booking Updates</div>
                  <div className={styles.prefDesc}>New bookings, confirmations, and cancellations</div>
                </div>
                <Toggle checked={prefs.bookingUpdates} onChange={() => togglePref('bookingUpdates')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Inventory Alerts</div>
                  <div className={styles.prefDesc}>Intake confirmations, release requests, stock movements</div>
                </div>
                <Toggle checked={prefs.inventoryAlerts} onChange={() => togglePref('inventoryAlerts')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Invoice Reminders</div>
                  <div className={styles.prefDesc}>Payment reminders, overdue invoices, receipt confirmations</div>
                </div>
                <Toggle checked={prefs.invoiceReminders} onChange={() => togglePref('invoiceReminders')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Temperature Alerts</div>
                  <div className={styles.prefDesc}>Chamber temperature out of range warnings</div>
                </div>
                <Toggle checked={prefs.temperatureAlerts} onChange={() => togglePref('temperatureAlerts')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>System Announcements</div>
                  <div className={styles.prefDesc}>Platform updates, maintenance notices</div>
                </div>
                <Toggle checked={prefs.systemAnnouncements} onChange={() => togglePref('systemAnnouncements')} />
              </div>
            </div>

            <div className={styles.prefGroup}>
              <div className={styles.prefGroupTitle}>Delivery Channels</div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>WhatsApp</div>
                  <div className={styles.prefDesc}>Receive notifications via WhatsApp messages</div>
                </div>
                <Toggle checked={prefs.channelWhatsApp} onChange={() => togglePref('channelWhatsApp')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>SMS</div>
                  <div className={styles.prefDesc}>Receive SMS notifications on your registered phone</div>
                </div>
                <Toggle checked={prefs.channelSMS} onChange={() => togglePref('channelSMS')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Push Notifications</div>
                  <div className={styles.prefDesc}>Browser and mobile push notifications</div>
                </div>
                <Toggle checked={prefs.channelPush} onChange={() => togglePref('channelPush')} />
              </div>
              <div className={styles.prefRow}>
                <div>
                  <div className={styles.prefLabel}>Email</div>
                  <div className={styles.prefDesc}>Email notifications (requires email on profile)</div>
                </div>
                <Toggle checked={prefs.channelEmail} onChange={() => togglePref('channelEmail')} />
              </div>
            </div>
          </Card>
        )}
    </PageLayout>
  );
}
