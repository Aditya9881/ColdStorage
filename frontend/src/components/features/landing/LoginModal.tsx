'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { X, Phone, Lock, ShieldCheck, Factory, AlertTriangle } from 'lucide-react';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(phone, password);
      const role = user?.role || '';
      onClose();
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'OWNER' || role === 'STAFF') {
        router.push('/wms');
      } else {
        router.push('/admin');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.header}>
            <h2>Welcome back</h2>
            <p>Sign in to manage your cold storage operations</p>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <AlertTriangle size={14} /> {error}
            </div>
          )}

          <Input
            label="Phone Number"
            type="tel"
            placeholder="Enter your phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            icon={<Phone size={14} />}
            required
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock size={14} />}
            required
          />

          <div className={styles.options}>
            <label className={styles.remember}>
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
            <a href="/forgot-password" className={styles.forgot}>Forgot password?</a>
          </div>

          <Button type="submit" fullWidth loading={loading} size="lg">
            Sign In
          </Button>

          <p className={styles.switchLink}>
            Don&apos;t have an account?{' '}
            <button type="button" onClick={onSwitchToRegister}>Register here</button>
          </p>

          {/* Demo credentials */}
          <div className={styles.demoSection}>
            <span className={styles.demoLabel}>Demo Credentials</span>
            <div className={styles.demoCards}>
              <button type="button" className={styles.demoCard} onClick={() => { setPhone('9999999999'); setPassword('test1234'); }}>
                <ShieldCheck size={16} />
                <div>
                  <span className={styles.demoRole}>Admin</span>
                  <span className={styles.demoDesc}>Platform management</span>
                </div>
              </button>
              <button type="button" className={styles.demoCard} onClick={() => { setPhone('9876543210'); setPassword('test1234'); }}>
                <Factory size={16} />
                <div>
                  <span className={styles.demoRole}>Owner</span>
                  <span className={styles.demoDesc}>Facility operations</span>
                </div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
