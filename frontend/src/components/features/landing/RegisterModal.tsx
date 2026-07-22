'use client';

import React, { useState, useCallback } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { FileUpload } from '@/components/ui/FileUpload';
import {
  X, User, Building2, MapPin, FileCheck, ClipboardCheck,
  Phone, Lock, Mail, Hash, AlertTriangle, ArrowRight, ArrowLeft,
  Check, Shield, Eye, EyeOff, CheckCircle2, Send
} from 'lucide-react';
import styles from './RegisterModal.module.css';

let API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
if (API_BASE && !API_BASE.endsWith('/api/v1')) {
  API_BASE = API_BASE.replace(/\/+$/, '') + '/api/v1';
}


const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim',
  'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const isValidPhone = (v: string) => /^[6-9]\d{9}$/.test(v);
const isValidAadhaar = (v: string) => /^\d{12}$/.test(v);
const isValidPAN = (v: string) => /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase());
const isValidGST = (v: string) => /^\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2}$/.test(v.toUpperCase());
const isValidPincode = (v: string) => /^\d{6}$/.test(v);
const isStrongPassword = (v: string) => v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);

const STEPS = [
  { key: 'otp', label: 'Phone Verify', icon: Phone },
  { key: 'personal', label: 'Personal', icon: User },
  { key: 'business', label: 'Business', icon: Building2 },
  { key: 'address', label: 'Address', icon: MapPin },
  { key: 'kyc', label: 'KYC Documents', icon: FileCheck },
  { key: 'review', label: 'Review', icon: ClipboardCheck },
];

interface FormData {
  phone: string; otpCode: string; phoneVerified: boolean;
  fullName: string; email: string; password: string; confirmPassword: string;
  businessName: string; facilityCapacityMt: string; facilityStorageType: 'BAG' | 'BULK' | 'HYBRID'; gstNumber: string; csRegistrationNumber: string; companyRegistrationNumber: string; fssaiNumber: string;
  facilityImage: File | null;
  addressLine1: string; city: string; district: string; state: string; pincode: string;
  aadhaarNumber: string; panNumber: string;
  aadhaarFront: File | null; aadhaarBack: File | null; panCard: File | null;
}

const initialFormData: FormData = {
  phone: '', otpCode: '', phoneVerified: false,
  fullName: '', email: '', password: '', confirmPassword: '',
  businessName: '', facilityCapacityMt: '', facilityStorageType: 'BAG', gstNumber: '', csRegistrationNumber: '', companyRegistrationNumber: '', fssaiNumber: '',
  facilityImage: null,
  addressLine1: '', city: '', district: '', state: '', pincode: '',
  aadhaarNumber: '', panNumber: '',
  aadhaarFront: null, aadhaarBack: null, panCard: null,
};

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
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
    setErrors((prev) => { const n = { ...prev }; delete n[key]; delete n.form; return n; });
  }, []);

  if (!isOpen) return null;

  const handleSendOtp = async () => {
    if (!isValidPhone(form.phone)) { setErrors({ phone: 'Enter a valid 10-digit mobile number' }); return; }
    setOtpLoading(true); setErrors({});
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.phone, purpose: 'REGISTER' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send OTP');
      setOtpSent(true);
    } catch (err: unknown) { setErrors({ phone: err instanceof Error ? err.message : 'Failed to send OTP' }); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!form.otpCode || form.otpCode.length < 4) { setErrors({ otpCode: 'Enter the OTP code' }); return; }
    setOtpLoading(true); setErrors({});
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: form.phone, otp: form.otpCode, purpose: 'REGISTER' }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid OTP');
      set('phoneVerified', true); setStep(1);
    } catch (err: unknown) { setErrors({ otpCode: err instanceof Error ? err.message : 'OTP verification failed' }); }
    finally { setOtpLoading(false); }
  };

  const validateStep = (s: number): boolean => {
    const e: Partial<Record<keyof FormData | 'form', string>> = {};
    switch (s) {
      case 0: if (!form.phoneVerified) e.phone = 'Please verify your phone number first'; break;
      case 1:
        if (!form.fullName.trim()) e.fullName = 'Full name is required';
        if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
        if (!isStrongPassword(form.password)) e.password = 'Min 8 chars, 1 uppercase, 1 number';
        if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
        break;
      case 2: if (!form.businessName.trim()) e.businessName = 'Business name is required';
        if (!form.facilityCapacityMt || Number(form.facilityCapacityMt) <= 0) e.facilityCapacityMt = 'Enter total storage capacity in MT';
        if (form.gstNumber && !isValidGST(form.gstNumber)) e.gstNumber = 'Invalid GST format';
        if (!form.facilityImage) (e as any).facilityImage = 'Facility photo is required'; break;
      case 3:
        if (!form.addressLine1.trim()) e.addressLine1 = 'Address is required';
        if (!form.city.trim()) e.city = 'City is required';
        if (!form.district.trim()) e.district = 'District is required';
        if (!form.state) e.state = 'State is required';
        if (!isValidPincode(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode'; break;
      case 4:
        if (!isValidAadhaar(form.aadhaarNumber)) e.aadhaarNumber = 'Enter valid 12-digit Aadhaar';
        if (!form.aadhaarFront) e.aadhaarFront = 'Aadhaar front required';
        if (!form.aadhaarBack) e.aadhaarBack = 'Aadhaar back required';
        if (form.panNumber && !isValidPAN(form.panNumber)) e.panNumber = 'Invalid PAN format';
        if (form.panNumber && !form.panCard) e.panCard = 'Upload PAN card image'; break;
      case 5: if (!termsAccepted) e.form = 'Please accept terms and conditions'; break;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1)); };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!validateStep(5)) return;
    setLoading(true); setErrors({});
    try {
      const fd = new window.FormData();
      fd.append('fullName', form.fullName); fd.append('phone', form.phone); fd.append('password', form.password); fd.append('role', 'OWNER');
      if (form.email) fd.append('email', form.email);
      fd.append('businessName', form.businessName);
      fd.append('facilityCapacityMt', form.facilityCapacityMt);
      fd.append('facilityStorageType', form.facilityStorageType);
      if (form.gstNumber) fd.append('gstNumber', form.gstNumber.toUpperCase());
      if (form.csRegistrationNumber) fd.append('csRegistrationNumber', form.csRegistrationNumber);
      if (form.companyRegistrationNumber) fd.append('companyRegistrationNumber', form.companyRegistrationNumber);
      if (form.fssaiNumber) fd.append('fssaiNumber', form.fssaiNumber);
      fd.append('addressLine1', form.addressLine1); fd.append('city', form.city);
      fd.append('district', form.district); fd.append('state', form.state); fd.append('pincode', form.pincode);
      fd.append('aadhaarNumber', form.aadhaarNumber);
      if (form.panNumber) fd.append('panNumber', form.panNumber.toUpperCase());
      if (form.aadhaarFront) fd.append('aadhaarFront', form.aadhaarFront);
      if (form.aadhaarBack) fd.append('aadhaarBack', form.aadhaarBack);
      if (form.panCard) fd.append('panCard', form.panCard);
      if (form.facilityImage) fd.append('facilityImage', form.facilityImage);
      const res = await fetch(`${API_BASE}/auth/register`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');
      setSubmitted(true);
    } catch (err: unknown) { setErrors({ form: err instanceof Error ? err.message : 'Registration failed.' }); }
    finally { setLoading(false); }
  };

  if (submitted) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.successModal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.successIcon}><CheckCircle2 size={48} /></div>
          <h2>Registration Submitted!</h2>
          <p>Your registration is under review. You&apos;ll be notified at <strong>{form.phone}</strong> once approved (1–2 business days).</p>
          <div className={styles.successBadges}>
            <span><Shield size={14} /> Documents encrypted & secure</span>
          </div>
          <Button onClick={onClose} size="lg" fullWidth>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>

        {/* Step sidebar */}
        <div className={styles.sidebar}>
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.key} className={`${styles.stepItem} ${isActive ? styles.stepActive : ''} ${isDone ? styles.stepDone : ''}`}>
                <div className={styles.stepCircle}>{isDone ? <Check size={13} /> : <Icon size={13} />}</div>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Form area */}
        <div className={styles.formArea}>
          <div className={styles.formHeader}>
            <span className={styles.stepBadge}>Step {step + 1} / {STEPS.length}</span>
            <h2>{STEPS[step].label}</h2>
          </div>

          {errors.form && <div className={styles.errorBanner}><AlertTriangle size={14} /> {errors.form}</div>}

          <div className={styles.fields}>
            {/* Step 0 — OTP */}
            {step === 0 && <>
              <Input label="Mobile Number" type="tel" placeholder="10-digit mobile" value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} icon={<Phone size={14} />} error={errors.phone} disabled={form.phoneVerified} required />
              {!otpSent && !form.phoneVerified && <Button type="button" onClick={handleSendOtp} loading={otpLoading} fullWidth size="lg"><Send size={16} /> Send OTP</Button>}
              {otpSent && !form.phoneVerified && <>
                <Input label="Enter OTP" type="text" placeholder="OTP from your phone" value={form.otpCode} onChange={(e) => set('otpCode', e.target.value.replace(/\D/g, '').slice(0, 6))} icon={<Hash size={14} />} error={errors.otpCode} required />
                <Button type="button" onClick={handleVerifyOtp} loading={otpLoading} fullWidth size="lg">Verify OTP</Button>
                <button type="button" className={styles.resendBtn} onClick={handleSendOtp} disabled={otpLoading}>Resend OTP</button>
              </>}
              {form.phoneVerified && <div className={styles.verifiedBadge}><CheckCircle2 size={16} /> Phone verified!</div>}
              <p className={styles.switchLink}>Already have an account? <button type="button" onClick={onSwitchToLogin}>Sign in</button></p>
            </>}

            {/* Step 1 — Personal */}
            {step === 1 && <>
              <Input label="Full Name" placeholder="Your full name" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} icon={<User size={14} />} error={errors.fullName} required />
              <Input label="Email" type="email" placeholder="Optional" value={form.email} onChange={(e) => set('email', e.target.value)} icon={<Mail size={14} />} error={errors.email} />
              <div className={styles.passWrap}>
                <Input label="Password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 chars" value={form.password} onChange={(e) => set('password', e.target.value)} icon={<Lock size={14} />} error={errors.password} required />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              <div className={styles.passWrap}>
                <Input label="Confirm Password" type={showConfirm ? 'text' : 'password'} placeholder="Re-enter" value={form.confirmPassword} onChange={(e) => set('confirmPassword', e.target.value)} icon={<Lock size={14} />} error={errors.confirmPassword} required />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(!showConfirm)}>{showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
            </>}

            {/* Step 2 — Business */}
            {step === 2 && <>
              <Input label="Business / Company Name" placeholder="Company name" value={form.businessName} onChange={(e) => set('businessName', e.target.value)} icon={<Building2 size={14} />} error={errors.businessName} required />
              <div className={styles.row}>
                <Input label="Total Capacity (MT)" type="number" min="1" placeholder="e.g. 5000" value={form.facilityCapacityMt} onChange={(e) => set('facilityCapacityMt', e.target.value)} error={errors.facilityCapacityMt} required />
                <div className={styles.selectWrap}>
                  <label className={styles.selLabel}>Storage Type <span>*</span></label>
                  <select className={styles.selInput} value={form.facilityStorageType} onChange={(e) => set('facilityStorageType', e.target.value as FormData['facilityStorageType'])}>
                    <option value="BAG">Bag Storage</option>
                    <option value="BULK">Bulk Storage</option>
                    <option value="HYBRID">Hybrid Storage</option>
                  </select>
                </div>
              </div>
              <Input label="GST Number" placeholder="e.g. 09AAACH7409R1ZZ" value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value.toUpperCase().slice(0, 15))} error={errors.gstNumber} hint="Optional" />
              <Input label="CS Registration Number" placeholder="State CS reg. number" value={form.csRegistrationNumber} onChange={(e) => set('csRegistrationNumber', e.target.value)} />
              <Input label="Company Reg. (CIN/LLPIN)" placeholder="e.g. U74110DL2019PTC349519" value={form.companyRegistrationNumber} onChange={(e) => set('companyRegistrationNumber', e.target.value.toUpperCase())} />
              <Input label="FSSAI License" placeholder="14-digit" value={form.fssaiNumber} onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))} />
              <div style={{ marginTop: 8 }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 650, color: '#2a3b33', marginBottom: 6 }}>Facility Photo <span style={{ color: '#D94A4A' }}>*</span></label>
                <p style={{ fontSize: '0.72rem', color: '#718079', margin: '0 0 8px' }}>Upload a clear exterior photo of your facility. Min 800×450px, 16:9 recommended.</p>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  style={{ fontSize: '0.82rem' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    set('facilityImage', file);
                  }}
                />
                {form.facilityImage && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img
                      src={URL.createObjectURL(form.facilityImage)}
                      alt="Preview"
                      style={{ width: 80, height: 45, objectFit: 'cover', borderRadius: 8, border: '1px solid #E2E9E3' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#0D7A62', fontWeight: 600 }}>✓ {form.facilityImage.name}</span>
                  </div>
                )}
                {(errors as any).facilityImage && <p style={{ fontSize: '0.72rem', color: '#D94A4A', marginTop: 4 }}>{(errors as any).facilityImage}</p>}
              </div>
            </>}

            {/* Step 3 — Address */}
            {step === 3 && <>
              <Input label="Address" placeholder="Street, building" value={form.addressLine1} onChange={(e) => set('addressLine1', e.target.value)} icon={<MapPin size={14} />} error={errors.addressLine1} required />
              <div className={styles.row}>
                <Input label="City" placeholder="City" value={form.city} onChange={(e) => set('city', e.target.value)} error={errors.city} required />
                <Input label="District" placeholder="District" value={form.district} onChange={(e) => set('district', e.target.value)} error={errors.district} required />
              </div>
              <div className={styles.row}>
                <div className={styles.selectWrap}>
                  <label className={styles.selLabel}>State <span>*</span></label>
                  <select className={styles.selInput} value={form.state} onChange={(e) => set('state', e.target.value)}>
                    <option value="">Select</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && <p className={styles.fieldErr}>{errors.state}</p>}
                </div>
                <Input label="Pincode" placeholder="6-digit" value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} error={errors.pincode} required />
              </div>
            </>}

            {/* Step 4 — KYC */}
            {step === 4 && <>
              <Input label="Aadhaar Number" placeholder="12-digit" value={form.aadhaarNumber} onChange={(e) => set('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))} error={errors.aadhaarNumber} required />
              <div className={styles.row}>
                <FileUpload label="Aadhaar Front" required file={form.aadhaarFront} onChange={(f) => set('aadhaarFront', f)} error={errors.aadhaarFront} compact />
                <FileUpload label="Aadhaar Back" required file={form.aadhaarBack} onChange={(f) => set('aadhaarBack', f)} error={errors.aadhaarBack} compact />
              </div>
              <div className={styles.divider} />
              <Input label="PAN Number" placeholder="e.g. ABCDE1234F (optional)" value={form.panNumber} onChange={(e) => set('panNumber', e.target.value.toUpperCase().slice(0, 10))} error={errors.panNumber} />
              {form.panNumber && <FileUpload label="PAN Card" file={form.panCard} onChange={(f) => set('panCard', f)} error={errors.panCard} compact />}
            </>}

            {/* Step 5 — Review */}
            {step === 5 && <>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}><h4>Personal</h4><button type="button" onClick={() => setStep(1)}>Edit</button></div>
                <div className={styles.reviewGrid}>
                  <div><span>Name</span><strong>{form.fullName}</strong></div>
                  <div><span>Phone</span><strong>{form.phone}</strong></div>
                  {form.email && <div><span>Email</span><strong>{form.email}</strong></div>}
                </div>
              </div>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}><h4>Business</h4><button type="button" onClick={() => setStep(2)}>Edit</button></div>
                <div className={styles.reviewGrid}>
                  <div><span>Company</span><strong>{form.businessName}</strong></div>
                  {form.gstNumber && <div><span>GST</span><strong>{form.gstNumber}</strong></div>}
                  {form.csRegistrationNumber && <div><span>CS Reg.</span><strong>{form.csRegistrationNumber}</strong></div>}
                </div>
              </div>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}><h4>Address</h4><button type="button" onClick={() => setStep(3)}>Edit</button></div>
                <div className={styles.reviewGrid}>
                  <div><span>Address</span><strong>{form.addressLine1}, {form.city}</strong></div>
                  <div><span>State</span><strong>{form.state} — {form.pincode}</strong></div>
                </div>
              </div>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}><h4>KYC</h4><button type="button" onClick={() => setStep(4)}>Edit</button></div>
                <div className={styles.reviewGrid}>
                  <div><span>Aadhaar</span><strong>XXXX XXXX {form.aadhaarNumber.slice(-4)}</strong></div>
                  {form.panNumber && <div><span>PAN</span><strong>{form.panNumber}</strong></div>}
                </div>
              </div>
              <label className={styles.termsCheck}>
                <input type="checkbox" checked={termsAccepted} onChange={(e) => { setTermsAccepted(e.target.checked); setErrors((prev) => { const n = { ...prev }; delete n.form; return n; }); }} />
                <span>I accept the <a href="/terms" target="_blank">Terms</a> and <a href="/privacy" target="_blank">Privacy Policy</a>. All information is accurate.</span>
              </label>
            </>}
          </div>

          {/* Nav buttons */}
          <div className={styles.navBtns}>
            {step > 0 && <Button type="button" onClick={prevStep} size="lg" variant="secondary"><ArrowLeft size={16} /> Back</Button>}
            {step > 0 && step < 5 && <Button type="button" onClick={nextStep} size="lg" fullWidth>Next <ArrowRight size={16} /></Button>}
            {step === 5 && <Button type="button" onClick={handleSubmit} size="lg" fullWidth loading={loading}>Submit Registration</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}
