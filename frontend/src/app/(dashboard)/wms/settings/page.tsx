'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, User, Lock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api, ApiError } from '@/lib/api-client';
import styles from './settings.module.css';

type Tab = 'profile' | 'security';

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

  useEffect(() => {
    loadProfile();
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

  return (
    <>
      <Header title="Settings" subtitle="Manage your profile and security" />

      <main className={styles.content}>
        {/* Tabs */}
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`} onClick={() => { setTab('profile'); setSuccess(''); setError(''); }}>
            <User size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Profile
          </button>
          <button className={`${styles.tab} ${tab === 'security' ? styles.tabActive : ''}`} onClick={() => { setTab('security'); setSuccess(''); setError(''); }}>
            <Lock size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Security
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
      </main>
    </>
  );
}
