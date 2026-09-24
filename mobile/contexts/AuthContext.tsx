import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, setTokens, clearTokens, API_BASE } from '@/lib/api-client';
import { storage } from '@/lib/storage';
import { Platform } from 'react-native';

interface User {
  id: string;
  uniqueId?: string | null;
  fullName: string;
  phone: string;
  role: string;
  status: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  avatarUrl?: string;
  kycRejectionReason?: string | null;
  kycVerified?: boolean;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export interface ProfileUpdateData {
  fullName?: string;
  email?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  avatarUrl?: string | null;
}

interface AuthContextType extends AuthState {
  login: (phone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileUpdateData) => Promise<void>;
  sendOtp: (phone: string, purpose?: 'LOGIN' | 'REGISTER') => Promise<{ expiresInSeconds: number; devOtp?: string }>;
  verifyOtp: (phone: string, otp: string, purpose?: 'LOGIN' | 'REGISTER') => Promise<any>;
}


// API_BASE is now imported from '@/lib/api-client'

interface RegisterData {
  fullName: string;
  phone: string;
  password: string;
  role: 'FARMER' | 'BUYER' | 'OWNER';
  email?: string;
  // Address
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  district?: string;
  // KYC
  aadhaarNumber?: string;
  panNumber?: string;
  // Farmer-specific
  villageName?: string;
  landHolding?: string;
  khasraNumber?: string;
  // Buyer-specific
  gstNumber?: string;
  businessName?: string;
  businessType?: string;
  // Owner-specific
  csRegistrationNumber?: string;
  fssaiNumber?: string;
  // Documents to upload
  kycDocs?: {
    asset: any;
    type: string;
    number?: string;
  }[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await storage.getItem('auth_access_token');
      if (token) {
        const res = await api.get<any>('/users/me');
        if (res.success && res.data) {
          setState({
            user: res.data,
            isLoading: false,
            isAuthenticated: true,
          });
          return;
        }
      }
    } catch {
      // Token expired or invalid
    }
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }

  /**
   * Standard phone + password login (kept for backward compat + dev creds)
   */
  async function login(phone: string, password: string) {
    const res = await api.post<any>('/auth/login', { phone, password });
    if (res.success && res.data) {
      await setTokens(res.data.accessToken, res.data.refreshToken);
      setState({
        user: res.data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } else {
      throw new Error(res.error?.message || 'Invalid phone number or password');
    }
  }

  /**
   * Send OTP to phone number
   */
  async function sendOtp(
    phone: string,
    purpose: 'LOGIN' | 'REGISTER' = 'LOGIN'
  ): Promise<{ expiresInSeconds: number; devOtp?: string }> {
    const res = await api.post<any>('/auth/send-otp', { phone, purpose });
    if (res.success && res.data) {
      return {
        expiresInSeconds: res.data.expiresInSeconds || 300,
        ...(res.data.devOtp ? { devOtp: res.data.devOtp } : {}),
      };
    }
    throw new Error(res.error?.message || 'Failed to send OTP');
  }

  /**
   * Verify OTP — for LOGIN purpose, this returns tokens and logs in.
   * For REGISTER purpose, returns { phoneVerified: true }.
   */
  async function verifyOtp(
    phone: string,
    otp: string,
    purpose: 'LOGIN' | 'REGISTER' = 'LOGIN'
  ): Promise<any> {
    const res = await api.post<any>('/auth/verify-otp', { phone, otp, purpose });
    if (res.success && res.data) {
      if (purpose === 'LOGIN' && res.data.accessToken) {
        await setTokens(res.data.accessToken, res.data.refreshToken);
        setState({
          user: res.data.user,
          isLoading: false,
          isAuthenticated: true,
        });
      }
      return res.data;
    }
    throw new Error(res.error?.message || 'OTP verification failed');
  }

  async function register(data: RegisterData) {
    const { kycDocs, ...registerPayload } = data;
    const res = await api.post<any>('/auth/register', registerPayload);
    if (res.success && res.data) {
      await setTokens(res.data.accessToken, res.data.refreshToken);

      // Upload KYC documents if any
      if (kycDocs && kycDocs.length > 0) {
        for (const doc of kycDocs) {
          try {
            const formData = new FormData();
            const uri = doc.asset.uri;
            const filename = uri.split('/').pop() || `kyc_${Date.now()}.jpg`;
            const mimeType = doc.asset.mimeType || 'image/jpeg';

            formData.append('document', {
              uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
              name: filename,
              type: mimeType,
            } as any);

            formData.append('documentType', doc.type);
            if (doc.number) {
              formData.append('documentNumber', doc.number);
            }

            const uploadRes = await fetch(`${API_BASE}/kyc/upload`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${res.data.accessToken}`,
              },
              body: formData,
            });
            if (!uploadRes.ok) {
              console.warn('[KYC Upload] Failed for', doc.type, await uploadRes.text());
            }
          } catch (uploadErr) {
            console.error('[KYC Upload] Error for', doc.type, uploadErr);
          }
        }
      }

      setState({
        user: res.data.user,
        isLoading: false,
        isAuthenticated: true,
      });
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    }
    await clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }

  async function refreshProfile() {
    try {
      const res = await api.get<any>('/users/me');
      if (res.success && res.data) {
        setState(prev => ({ ...prev, user: res.data }));
      }
    } catch {
      // Silent
    }
  }

  async function updateProfile(data: ProfileUpdateData) {
    const res = await api.patch<any>('/users/me', data);
    if (res.success && res.data) {
      setState(prev => ({ ...prev, user: { ...prev.user!, ...res.data } }));
    } else {
      throw new Error(res.error?.message || 'Failed to update profile');
    }
  }

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshProfile, updateProfile, sendOtp, verifyOtp }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
