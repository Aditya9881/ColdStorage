'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Snowflake, Phone, Lock, KeyRound, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import styles from './forgot-password.module.css';

type Step = 'phone' | 'otp' | 'new-password' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Send OTP to phone
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/send-otp', { phone, purpose: 'RESET_PASSWORD' });
      setStep('otp');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/auth/verify-otp', { phone, otp, purpose: 'RESET_PASSWORD' });
      setStep('new-password');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/reset-password', { phone, otp, newPassword });
      setStep('success');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logoRow}>
          <div className={styles.logoMark}><Snowflake size={22} /></div>
          <span className={styles.logoText}>ColdStorage</span>
        </div>

        {/* Step: Enter Phone */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className={styles.form}>
            <div className={styles.iconCircle}>
              <KeyRound size={28} />
            </div>
            <h2 className={styles.title}>Forgot Password?</h2>
            <p className={styles.subtitle}>
              Enter your registered phone number and we&apos;ll send you an OTP to verify your identity.
            </p>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={<Phone size={14} />}
              required
            />

            <Button type="submit" fullWidth loading={loading} size="lg">
              Send OTP
            </Button>

            <a href="/login" className={styles.backLink}>
              <ArrowLeft size={14} /> Back to Login
            </a>
          </form>
        )}

        {/* Step: Enter OTP */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className={styles.form}>
            <div className={styles.iconCircle}>
              <ShieldCheck size={28} />
            </div>
            <h2 className={styles.title}>Verify OTP</h2>
            <p className={styles.subtitle}>
              Enter the 6-digit code sent to <strong>{phone}</strong>
            </p>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <Input
              label="OTP Code"
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
            />

            <Button type="submit" fullWidth loading={loading} size="lg">
              Verify OTP
            </Button>

            <button
              type="button"
              className={styles.backLink}
              onClick={() => { setStep('phone'); setError(''); setOtp(''); }}
            >
              <ArrowLeft size={14} /> Change phone number
            </button>
          </form>
        )}

        {/* Step: Set New Password */}
        {step === 'new-password' && (
          <form onSubmit={handleResetPassword} className={styles.form}>
            <div className={styles.iconCircle}>
              <Lock size={28} />
            </div>
            <h2 className={styles.title}>Set New Password</h2>
            <p className={styles.subtitle}>
              Create a strong password for your account.
            </p>

            {error && <div className={styles.errorBanner}>{error}</div>}

            <Input
              label="New Password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              icon={<Lock size={14} />}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock size={14} />}
              required
            />

            <Button type="submit" fullWidth loading={loading} size="lg">
              Reset Password
            </Button>
          </form>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div className={styles.form}>
            <div className={styles.successCircle}>
              <CheckCircle2 size={36} />
            </div>
            <h2 className={styles.title}>Password Reset!</h2>
            <p className={styles.subtitle}>
              Your password has been reset successfully. You can now sign in with your new password.
            </p>

            <Button fullWidth size="lg" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </div>
        )}

        {/* Step indicators */}
        <div className={styles.steps}>
          <div className={`${styles.stepDot} ${step === 'phone' ? styles.stepActive : ''} ${['otp', 'new-password', 'success'].includes(step) ? styles.stepDone : ''}`} />
          <div className={`${styles.stepDot} ${step === 'otp' ? styles.stepActive : ''} ${['new-password', 'success'].includes(step) ? styles.stepDone : ''}`} />
          <div className={`${styles.stepDot} ${step === 'new-password' ? styles.stepActive : ''} ${step === 'success' ? styles.stepDone : ''}`} />
          <div className={`${styles.stepDot} ${step === 'success' ? styles.stepActive : ''}`} />
        </div>
      </div>
    </div>
  );
}
