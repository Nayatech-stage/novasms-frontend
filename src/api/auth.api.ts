import api from './axios';
import { isAxiosError } from 'axios';

export type RegisterPayload = {
  nom: string;
  email: string;
  motDePasse: string;
  nomBoutique: string;
  pays: string;
  acceptCGU: boolean;
};

export type ProfilePayload = {
  companyName: string;
  role: string;
  sector: string;
  primaryChannels: string[];
};

export function extractAuthError(
  err: unknown,
  fallback = 'Erreur de connexion au serveur',
): string {
  if (isAxiosError(err)) {
    const msg = err.response?.data?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
    if (Array.isArray(msg) && msg.length > 0 && typeof msg[0] === 'string') return msg[0];
  }
  return fallback;
}

export const authApi = {
  login: async (email: string, motDePasse: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/login', {
      email,
      motDePasse,
    });
    return data;
  },

  verifyTwoFactor: async (twoFactorToken: string, code: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/verify-2fa', {
      twoFactorToken,
      code,
    });
    return data;
  },

  completeOnboarding: () => api.post('/auth/onboarding/complete'),

  saveProfile: async (profile: ProfilePayload) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/profile', profile);
    return data;
  },

  verifyEmail: async (token: string) => {
    const { data } = await api.get<{ success: boolean; message?: string }>(
      `/auth/verify-email/${token}`,
    );
    return data;
  },

  register: async (payload: RegisterPayload) => {
    const { data } = await api.post<{
      success: boolean;
      message?: string;
      errors?: Array<{ message: string }>;
    }>('/auth/register', payload);
    return data;
  },

  forgotPassword: async (email: string) => {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      '/auth/forgot-password',
      { email },
    );
    return data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      `/auth/reset-password/${token}`,
      { newPassword },
    );
    return data;
  },

  resendConfirmation: async (email: string) => {
    const { data } = await api.post<{ success: boolean; message?: string }>(
      '/auth/resend-confirmation',
      { email },
    );
    return data;
  },

  getMe: async () => {
    const { data } = await api.get<Record<string, unknown>>('/auth/me');
    return data;
  },

  generateTwoFactorSecret: async () => {
    const { data } = await api.post<Record<string, unknown>>('/auth/generate-2fa-secret');
    return data;
  },

  enableTwoFactor: async (code: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/enable-2fa', { code });
    return data;
  },

  sendTwoFactorSms: async (phone: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/send-2fa-sms', { phone });
    return data;
  },

  enableTwoFactorSms: async (phone: string, code: string) => {
    const { data } = await api.post<Record<string, unknown>>('/auth/enable-2fa-sms', {
      phone,
      code,
    });
    return data;
  },

  disableTwoFactor: async () => {
    const { data } = await api.post<Record<string, unknown>>('/auth/disable-2fa');
    return data;
  },
};
