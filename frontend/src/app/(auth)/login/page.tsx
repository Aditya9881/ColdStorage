'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Snowflake, Thermometer, BarChart3, Shield, Phone, Lock, ShieldCheck, Factory, AlertTriangle } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(phone, password);
      const role = user?.role || '';
      if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'OWNER' || role === 'STAFF') {
        router.push('/wms');
      } else {
        router.push('/admin');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background decoration */}
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.container}>
        {/* Left: Branding */}
        <div className={styles.branding}>
          <div className={styles.brandContent}>
            <div className={styles.logoMark}><Snowflake size={28} /></div>
            <h1 className={styles.brandTitle}>ColdStorage</h1>
            <p className={styles.brandSubtitle}>
              India&apos;s smart cold storage management platform — empowering farmers, facility owners, and supply chain stakeholders.
            </p>

            <div className={styles.features}>
              <div className={styles.feature}>
                <span className={styles.featureIcon}><Thermometer size={18} /></span>
                <div>
                  <strong>Temperature Monitoring</strong>
                  <p>Real-time chamber temperature tracking to keep produce fresh and safe across all storage facilities</p>
                </div>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}><BarChart3 size={18} /></span>
                <div>
                  <strong>Inventory & Billing</strong>
                  <p>End-to-end lot management, automated invoicing, and transparent pricing for farmers and owners</p>
                </div>
              </div>
              <div className={styles.feature}>
                <span className={styles.featureIcon}><Shield size={18} /></span>
                <div>
                  <strong>Compliance & Reporting</strong>
                  <p>FSSAI & WDRA document management, audit trails, and government-ready reports</p>
                </div>
              </div>
            </div>

            {/* Trust indicators */}
            <div className={styles.trustBar}>
              <div className={styles.trustItem}>
                <span className={styles.trustValue}>500+</span>
                <span className={styles.trustLabel}>Farmers Served</span>
              </div>
              <div className={styles.trustDivider} />
              <div className={styles.trustItem}>
                <span className={styles.trustValue}>50+</span>
                <span className={styles.trustLabel}>Facilities</span>
              </div>
              <div className={styles.trustDivider} />
              <div className={styles.trustItem}>
                <span className={styles.trustValue}>10K MT</span>
                <span className={styles.trustLabel}>Stored</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Login Form */}
        <div className={styles.formSide}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Welcome back</h2>
              <p className={styles.formSubtitle}>Sign in to manage your cold storage operations</p>
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

            <div className={styles.formOptions}>
              <label className={styles.remember}>
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className={styles.forgot}>
                Forgot password?
              </a>
            </div>

            <Button type="submit" fullWidth loading={loading} size="lg">
              Sign In
            </Button>

            <p className={styles.registerLink}>
              Don&apos;t have an account?{' '}
              <a href="/register">Register here</a>
            </p>

            {/* Demo credentials — only Admin and Owner */}
            <div className={styles.demoSection}>
              <span className={styles.demoLabel}>Demo Credentials</span>
              <div className={styles.demoCards}>
                <button type="button" className={styles.demoCard} onClick={() => { setPhone('9999999999'); setPassword('admin123'); }}>
                  <span className={styles.demoIcon}><ShieldCheck size={16} /></span>
                  <div>
                    <span className={styles.demoRole}>Admin</span>
                    <span className={styles.demoDesc}>Platform management</span>
                  </div>
                </button>
                <button type="button" className={styles.demoCard} onClick={() => { setPhone('9876543210'); setPassword('owner123'); }}>
                  <span className={styles.demoIcon}><Factory size={16} /></span>
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
    </div>
  );
}
