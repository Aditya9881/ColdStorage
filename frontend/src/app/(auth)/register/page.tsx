'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  Snowflake, User, Building2, MapPin, FileCheck, ClipboardCheck,
  Phone, Lock, Mail, Hash, AlertTriangle, ArrowRight, ArrowLeft,
  Check, Shield, Eye, EyeOff, CheckCircle2, Send
} from 'lucide-react';
import styles from './register.module.css';

let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
if (API_BASE && !API_BASE.endsWith('/api/v1')) {
  API_BASE = API_BASE.replace(/\/+$/, '') + '/api/v1';
}


/* ── Indian States ── */
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

/* ── Validation Helpers ── */
const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v);
const isValidAadhaar = (v: string) => /^\d{12}$/.test(v);
const isValidPAN = (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase());
const isValidGST = (v: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2}$/.test(v.toUpperCase());
const isValidPincode = (v: string) => /^\d{6}$/.test(v);
const isStrongPassword = (v: string) => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);

/* ── Steps ── */
const STEPS = [
  { key: 'otp', label: 'Phone Verify', icon: Phone },
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'business', label: 'Business', icon: Building2 },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'kyc', label: 'KYC Documents', icon: FileCheck },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

/* ── Types ── */
interface FormData {
  // OTP
  phone: string;
  otpCode: string;
  phoneVerified: boolean;
  // Personal
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  // Business
  businessName: string;
  facilityCapacityMt: string;
  facilityStorageType: 'BAG' | 'BULK' | 'HYBRID';
  gstNumber: string;
  csRegistrationNumber: string;
  companyRegistrationNumber: string;
  fssaiNumber: string;
  // Address
  addressLine1: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  // KYC
  aadhaarNumber: string;
  panNumber: string;
  aadhaarFront: File | null;
  aadhaarBack: File | null;
  panCard: File | null;
}

const initialFormData: FormData = {
  phone: '', otpCode: '', phoneVerified: false,
  fullName: '', email: '', password: '', confirmPassword: '',
  businessName: '', facilityCapacityMt: '', facilityStorageType: 'BAG', gstNumber: '', csRegistrationNumber: '', companyRegistrationNumber: '', fssaiNumber: '',
  addressLine1: '', city: '', district: '', state: '', pincode: '',
  aadhaarNumber: '', panNumber: '',
  aadhaarFront: null, aadhaarBack: null, panCard: null,
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'form', string>>>({});
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const set = useCallback((key: keyof FormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const n = { ...prev };
      delete n[key];
      delete n.form;
      return n;
    });
  }, []);

  /* ── OTP ── */
  const handleSendOtp = async () => {
    if (!isValidPhone(form.phone)) {
      setErrors({ phone: 'Enter a valid 10-digit mobile number' });
      return;
    }
    setOtpLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, purpose: 'REGISTER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP');
      setOtpSent(true);
    } catch (err: unknown) {
      setErrors({ phone: err instanceof Error ? err.message : 'Failed to send OTP' });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!form.otpCode || form.otpCode.length < 4) {
      setErrors({ otpCode: 'Enter the OTP code' });
      return;
    }
    setOtpLoading(true);
    setErrors({});
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: form.phone, otp: form.otpCode, purpose: 'REGISTER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid OTP');
      set('phoneVerified', true);
      setStep(1);
    } catch (err: unknown) {
      setErrors({ otpCode: err instanceof Error ? err.message : 'OTP verification failed' });
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── Validation per Step ── */
  const validateStep = (s: number): boolean => {
    const e: Partial<Record<keyof FormData | 'form', string>> = {};

    switch (s) {
      case 0: // OTP
        if (!form.phoneVerified) e.phone = 'Please verify your phone number first';
        break;
      case 1: // Personal
        if (!form.fullName.trim()) e.fullName = 'Full name is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
        if (!isStrongPassword(form.password)) e.password = 'Min 8 chars, 1 uppercase, 1 number';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        break;
      case 2: // Business
        if (!form.businessName.trim()) e.businessName = 'Business name is required';
        if (!form.facilityCapacityMt || Number(form.facilityCapacityMt) <= 0) e.facilityCapacityMt = 'Enter the total storage capacity in MT';
        if (form.gstNumber && !isValidGST(form.gstNumber)) e.gstNumber = 'Invalid GST format';
        break;
      case 3: // Address
        if (!form.addressLine1.trim()) e.addressLine1 = 'Address is required';
        if (!form.city.trim()) e.city = 'City is required';
        if (!form.district.trim()) e.district = 'District is required';
        if (!form.state) e.state = 'State is required';
        if (!isValidPincode(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode';
        break;
      case 4: // KYC
        if (!isValidAadhaar(form.aadhaarNumber)) e.aadhaarNumber = 'Enter a valid 12-digit Aadhaar number';
        if (!form.aadhaarFront) e.aadhaarFront = 'Aadhaar front image is required';
        if (!form.aadhaarBack) e.aadhaarBack = 'Aadhaar back image is required';
        if (form.panNumber && !isValidPAN(form.panNumber)) e.panNumber = 'Invalid PAN format (e.g. ABCDE1234F)';
        if (form.panNumber && !form.panCard) e.panCard = 'Upload PAN card image';
        break;
      case 5: // Review
        if (!termsAccepted) e.form = 'Please accept the terms and conditions';
        break;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    setLoading(true);
    setErrors({});

    try {
      const fd = new window.FormData();
      fd.append('fullName', form.fullName);
      fd.append('phone', form.phone);
      fd.append('password', form.password);
      fd.append('role', 'OWNER');
      if (form.email) fd.append('email', form.email);
      // Business
      fd.append('businessName', form.businessName);
      fd.append('facilityCapacityMt', form.facilityCapacityMt);
      fd.append('facilityStorageType', form.facilityStorageType);
      if (form.gstNumber) fd.append('gstNumber', form.gstNumber.toUpperCase());
      if (form.csRegistrationNumber) fd.append('csRegistrationNumber', form.csRegistrationNumber);
      if (form.companyRegistrationNumber) fd.append('companyRegistrationNumber', form.companyRegistrationNumber);
      if (form.fssaiNumber) fd.append('fssaiNumber', form.fssaiNumber);
      // Address
      fd.append('addressLine1', form.addressLine1);
      fd.append('city', form.city);
      fd.append('district', form.district);
      fd.append('state', form.state);
      fd.append('pincode', form.pincode);
      // KYC
      fd.append('aadhaarNumber', form.aadhaarNumber);
      if (form.panNumber) fd.append('panNumber', form.panNumber.toUpperCase());
      // Files
      if (form.aadhaarFront) fd.append('aadhaarFront', form.aadhaarFront);
      if (form.aadhaarBack) fd.append('aadhaarBack', form.aadhaarBack);
      if (form.panCard) fd.append('panCard', form.panCard);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');
      setSubmitted(true);
    } catch (err: unknown) {
      setErrors({ form: err instanceof Error ? err.message : 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ── Success Screen ── */
  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.bgGrid} />
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
        <div className={styles.successCard}>
          <div className={styles.successIcon}>
            <CheckCircle2 size={48} />
          </div>
          <h2 className={styles.successTitle}>Registration Submitted!</h2>
          <p className={styles.successDesc}>
            Your registration is under review by our admin team. You will receive a notification
            once your account is approved. This typically takes 1–2 business days.
          </p>
          <div className={styles.successInfo}>
            <div className={styles.successInfoItem}>
              <Shield size={16} />
              <span>Your KYC documents are encrypted & secure</span>
            </div>
            <div className={styles.successInfoItem}>
              <Phone size={16} />
              <span>We&apos;ll notify you at {form.phone}</span>
            </div>
          </div>
          <Button onClick={() => router.push('/login')} size="lg" fullWidth>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} />
      <div className={styles.bgGlow1} />
      <div className={styles.bgGlow2} />

      <div className={styles.container}>
        {/* Left branding */}
        <div className={styles.branding}>
          <div className={styles.brandContent}>
            <div className={styles.logoMark}><Snowflake size={28} /></div>
            <h1 className={styles.brandTitle}>ColdStorage</h1>
            <p className={styles.brandSubtitle}>
              Register as a cold storage facility owner. Complete your KYC verification to get started on India&apos;s smart cold storage network.
            </p>

            {/* Step Progress */}
            <div className={styles.stepProgress}>
              {STEPS.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div key={s.key} className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}>
                    <div className={styles.stepCircle}>
                      {isDone ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <span className={styles.stepLabel}>{s.label}</span>
                    {i < STEPS.length - 1 && <div className={styles.stepLine} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right form */}
        <div className={styles.formSide}>
          <div className={styles.form}>
            {/* Step Header */}
            <div className={styles.formHeader}>
              <span className={styles.stepBadge}>Step {step + 1} of {STEPS.length}</span>
              <h2 className={styles.formTitle}>
                {STEPS[step].label}
              </h2>
              <p className={styles.formSubtitle}>
                {step === 0 && 'Verify your phone number to get started'}
                {step === 1 && 'Enter your personal details'}
                {step === 2 && 'Provide your business information'}
                {step === 3 && 'Where is your cold storage facility located?'}
                {step === 4 && 'Upload your identity documents for verification'}
                {step === 5 && 'Review your details before submitting'}
              </p>
            </div>

            {errors.form && (
              <div className={styles.errorBanner}>
                <AlertTriangle size={14} /> {errors.form}
              </div>
            )}

            {/* ──────── Step 0: OTP ──────── */}
            {step === 0 && (
              <div className={styles.stepContent}>
                <Input
                  label="Mobile Number"
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  icon={<Phone size={14} />}
                  error={errors.phone}
                  disabled={form.phoneVerified}
                  required
                />
                {!otpSent && !form.phoneVerified && (
                  <Button
                    type="button"
                    onClick={handleSendOtp}
                    loading={otpLoading}
                    fullWidth
                    size="lg"
                  >
                    <Send size={16} /> Send OTP
                  </Button>
                )}
                {otpSent && !form.phoneVerified && (
                  <>
                    <Input
                      label="Enter OTP"
                      type="text"
                      placeholder="Enter the OTP sent to your phone"
                      value={form.otpCode}
                      onChange={(e) => set('otpCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      icon={<Hash size={14} />}
                      error={errors.otpCode}
                      required
                    />
                    <div className={styles.otpActions}>
                      <Button type="button" onClick={handleVerifyOtp} loading={otpLoading} fullWidth size="lg">
                        Verify OTP
                      </Button>
                      <button type="button" className={styles.resendBtn} onClick={handleSendOtp} disabled={otpLoading}>
                        Resend OTP
                      </button>
                    </div>
                  </>
                )}
                {form.phoneVerified && (
                  <div className={styles.verifiedBadge}>
                    <CheckCircle2 size={16} />
                    <span>Phone verified successfully!</span>
                  </div>
                )}
              </div>
            )}

            {/* ──────── Step 1: Personal Details ──────── */}
            {step === 1 && (
              <div className={styles.stepContent}>
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={form.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  icon={<User size={14} />}
                  error={errors.fullName}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="email@example.com (optional)"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  icon={<Mail size={14} />}
                  error={errors.email}
                  hint="Optional — used for notifications"
                />
                <div className={styles.passwordField}>
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    icon={<Lock size={14} />}
                    error={errors.password}
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className={styles.passwordField}>
                  <Input
                    label="Confirm Password"
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={(e) => set('confirmPassword', e.target.value)}
                    icon={<Lock size={14} />}
                    error={errors.confirmPassword}
                    required
                  />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* ──────── Step 2: Business Details ──────── */}
            {step === 2 && (
              <div className={styles.stepContent}>
                <Input
                  label="Business / Company Name"
                  placeholder="Your cold storage company name"
                  value={form.businessName}
                  onChange={(e) => set('businessName', e.target.value)}
                  icon={<Building2 size={14} />}
                  error={errors.businessName}
                  required
                />
                <div className={styles.row}>
                  <Input
                    label="Total Storage Capacity (MT)"
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={form.facilityCapacityMt}
                    onChange={(e) => set('facilityCapacityMt', e.target.value)}
                    error={errors.facilityCapacityMt}
                    required
                  />
                  <label className={styles.selectField}>
                    <span>Storage Type</span>
                    <select value={form.facilityStorageType} onChange={(e) => set('facilityStorageType', e.target.value as FormData['facilityStorageType'])}>
                      <option value="BAG">Bag Storage</option>
                      <option value="BULK">Bulk Storage</option>
                      <option value="HYBRID">Hybrid Storage</option>
                    </select>
                  </label>
                </div>
                <Input
                  label="GST Number"
                  placeholder="e.g. 09AAACH7409R1ZZ"
                  value={form.gstNumber}
                  onChange={(e) => set('gstNumber', e.target.value.toUpperCase().slice(0, 15))}
                  error={errors.gstNumber}
                  hint="Optional but recommended for billing"
                />
                <Input
                  label="Cold Storage Registration Number"
                  placeholder="State CS registration number"
                  value={form.csRegistrationNumber}
                  onChange={(e) => set('csRegistrationNumber', e.target.value)}
                  hint="Issued by State Horticulture/Agriculture Dept"
                />
                <Input
                  label="Company Registration (CIN / LLPIN)"
                  placeholder="e.g. U74110DL2019PTC349519"
                  value={form.companyRegistrationNumber}
                  onChange={(e) => set('companyRegistrationNumber', e.target.value.toUpperCase())}
                  hint="Optional — MCA CIN or LLPIN number"
                />
                <Input
                  label="FSSAI License Number"
                  placeholder="14-digit FSSAI number"
                  value={form.fssaiNumber}
                  onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))}
                  hint="Optional — required for food-grade storage"
                />
              </div>
            )}

            {/* ──────── Step 3: Address ──────── */}
            {step === 3 && (
              <div className={styles.stepContent}>
                <Input
                  label="Address"
                  placeholder="Street address, building name, etc."
                  value={form.addressLine1}
                  onChange={(e) => set('addressLine1', e.target.value)}
                  icon={<MapPin size={14} />}
                  error={errors.addressLine1}
                  required
                />
                <div className={styles.row}>
                  <Input
                    label="City"
                    placeholder="e.g. Agra"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    error={errors.city}
                    required
                  />
                  <Input
                    label="District"
                    placeholder="e.g. Agra"
                    value={form.district}
                    onChange={(e) => set('district', e.target.value)}
                    error={errors.district}
                    required
                  />
                </div>
                <div className={styles.row}>
                  <div className={styles.selectWrapper}>
                    <label className={styles.selectLabel}>State <span className={styles.reqStar}>*</span></label>
                    <select
                      className={`${styles.selectInput} ${errors.state ? styles.selectError : ''}`}
                      value={form.state}
                      onChange={(e) => set('state', e.target.value)}
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {errors.state && <p className={styles.fieldError}>{errors.state}</p>}
                  </div>
                  <Input
                    label="Pincode"
                    placeholder="6-digit pincode"
                    value={form.pincode}
                    onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                    error={errors.pincode}
                    required
                  />
                </div>
              </div>
            )}

            {/* ──────── Step 4: KYC Documents ──────── */}
            {step === 4 && (
              <div className={styles.stepContent}>
                <Input
                  label="Aadhaar Number"
                  placeholder="12-digit Aadhaar number"
                  value={form.aadhaarNumber}
                  onChange={(e) => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
                  error={errors.aadhaarNumber}
                  required
                />
                <div className={styles.row}>
                  <FileUpload
                    label="Aadhaar Front"
                    required
                    file={form.aadhaarFront}
                    onChange={(f) => set('aadhaarFront', f)}
                    error={errors.aadhaarFront}
                    compact
                  />
                  <FileUpload
                    label="Aadhaar Back"
                    required
                    file={form.aadhaarBack}
                    onChange={(f) => set('aadhaarBack', f)}
                    error={errors.aadhaarBack}
                    compact
                  />
                </div>

                <div className={styles.divider} />

                <Input
                  label="PAN Number"
                  placeholder="e.g. ABCDE1234F (optional)"
                  value={form.panNumber}
                  onChange={(e) => set('panNumber', e.target.value.toUpperCase().slice(0, 10))}
                  error={errors.panNumber}
                />
                {form.panNumber && (
                  <FileUpload
                    label="PAN Card Image"
                    file={form.panCard}
                    onChange={(f) => set('panCard', f)}
                    error={errors.panCard}
                    compact
                  />
                )}
              </div>
            )}

            {/* ──────── Step 5: Review ──────── */}
            {step === 5 && (
              <div className={styles.stepContent}>
                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeader}>
                    <h3>Personal Details</h3>
                    <button type="button" className={styles.editBtn} onClick={() => setStep(1)}>Edit</button>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div><span>Name</span><strong>{form.fullName}</strong></div>
                    <div><span>Phone</span><strong>{form.phone}</strong></div>
                    {form.email && <div><span>Email</span><strong>{form.email}</strong></div>}
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeader}>
                    <h3>Business Details</h3>
                    <button type="button" className={styles.editBtn} onClick={() => setStep(2)}>Edit</button>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div><span>Business Name</span><strong>{form.businessName}</strong></div>
                    {form.gstNumber && <div><span>GST</span><strong>{form.gstNumber}</strong></div>}
                    {form.csRegistrationNumber && <div><span>CS Reg. No.</span><strong>{form.csRegistrationNumber}</strong></div>}
                    {form.companyRegistrationNumber && <div><span>CIN/LLPIN</span><strong>{form.companyRegistrationNumber}</strong></div>}
                    {form.fssaiNumber && <div><span>FSSAI</span><strong>{form.fssaiNumber}</strong></div>}
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeader}>
                    <h3>Address</h3>
                    <button type="button" className={styles.editBtn} onClick={() => setStep(3)}>Edit</button>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div><span>Address</span><strong>{form.addressLine1}</strong></div>
                    <div><span>City</span><strong>{form.city}</strong></div>
                    <div><span>District</span><strong>{form.district}</strong></div>
                    <div><span>State</span><strong>{form.state}</strong></div>
                    <div><span>Pincode</span><strong>{form.pincode}</strong></div>
                  </div>
                </div>

                <div className={styles.reviewSection}>
                  <div className={styles.reviewHeader}>
                    <h3>KYC Documents</h3>
                    <button type="button" className={styles.editBtn} onClick={() => setStep(4)}>Edit</button>
                  </div>
                  <div className={styles.reviewGrid}>
                    <div><span>Aadhaar</span><strong>XXXX XXXX {form.aadhaarNumber.slice(-4)}</strong></div>
                    <div><span>Aadhaar Front</span><strong>{form.aadhaarFront?.name || '—'}</strong></div>
                    <div><span>Aadhaar Back</span><strong>{form.aadhaarBack?.name || '—'}</strong></div>
                    {form.panNumber && <div><span>PAN</span><strong>{form.panNumber}</strong></div>}
                    {form.panCard && <div><span>PAN Card</span><strong>{form.panCard.name}</strong></div>}
                  </div>
                </div>

                <label className={styles.termsCheck}>
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => { setTermsAccepted(e.target.checked); setErrors((prev) => { const n = { ...prev }; delete n.form; return n; }); }}
                  />
                  <span>
                    I accept the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a>. I confirm that all information provided is accurate and the documents are genuine.
                  </span>
                </label>
              </div>
            )}

            {/* ── Navigation Buttons ── */}
            <div className={styles.navButtons}>
              {step > 0 && (
                <Button type="button" onClick={prevStep} size="lg" variant="secondary">
                  <ArrowLeft size={16} /> Back
                </Button>
              )}
              {step > 0 && step < STEPS.length - 1 && (
                <Button type="button" onClick={nextStep} size="lg" fullWidth>
                  Next <ArrowRight size={16} />
                </Button>
              )}
              {step === STEPS.length - 1 && (
                <Button type="button" onClick={handleSubmit} size="lg" fullWidth loading={loading}>
                  Submit Registration
                </Button>
              )}
            </div>

            {step === 0 && (
              <p className={styles.loginLink}>
                Already have an account?{' '}
                <a href="/login">Sign in here</a>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
