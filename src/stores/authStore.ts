import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/api/axios';
import { authApi, extractAuthError } from '@/api/auth.api';

export type User = {
  id: string;
  email: string;
  name: string;
  onboardingCompleted?: boolean; // ✅ Champ ajouté
  role?: string;
  sector?: string | null;
  primaryChannels?: string[];
};

export type AuthState = {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isFirstLogin: boolean; // Calculé depuis le backend
  rememberMe: boolean;
  sessionExpiresAt: number | null;
  requiresTwoFactor: boolean;
  twoFactorToken: string | null;
  twoFactorMessage: string | null;
  pendingRememberMe: boolean;

  // Actions
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  verifyTwoFactor: (twoFactorToken: string, code: string) => Promise<boolean>;
  logout: () => void;
  setTokens: (access: string, refresh: string, user: User) => void;
  clearError: () => void;
  markOnboardingCompleted: () => Promise<void>;
  saveWizardProfile: (profile: {
    companyName: string;
    role: string;
    sector: string;
    primaryChannels: string[];
  }) => Promise<boolean>;
  isHydrated: boolean;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      isFirstLogin: false,
      rememberMe: false,
      sessionExpiresAt: null,
      requiresTwoFactor: false,
      twoFactorToken: null,
      twoFactorMessage: null,
      pendingRememberMe: false,
      isHydrated: false,

      login: async (email: string, password: string, rememberMe = false) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.login(email, password);

          if (data.requiresTwoFactor) {
            set({
              isLoading: false,
              error: null,
              requiresTwoFactor: true,
              twoFactorToken: (data.twoFactorToken as string) ?? null,
              twoFactorMessage: (data.message as string) ?? 'Un code de vérification a été envoyé.',
              pendingRememberMe: rememberMe,
            });
            return false;
          }

          const onboardingCompleted =
            (data.account as Record<string, unknown>)?.onboardingCompleted ?? false;
          const sessionExpiresAt =
            Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000);

          set({
            accessToken: data.accessToken as string,
            refreshToken: data.refreshToken as string,
            user: data.account as User,
            isAuthenticated: true,
            isLoading: false,
            isFirstLogin: !onboardingCompleted,
            rememberMe,
            sessionExpiresAt,
            requiresTwoFactor: false,
            twoFactorToken: null,
            twoFactorMessage: null,
            pendingRememberMe: false,
          });
          return true;
        } catch (err) {
          set({
            error: extractAuthError(err, 'Échec de la connexion'),
            isLoading: false,
            requiresTwoFactor: false,
            twoFactorToken: null,
            twoFactorMessage: null,
            pendingRememberMe: false,
          });
          return false;
        }
      },

      verifyTwoFactor: async (twoFactorToken: string, code: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authApi.verifyTwoFactor(twoFactorToken, code);

          const onboardingCompleted =
            (data.account as Record<string, unknown>)?.onboardingCompleted ?? false;
          const rememberMe = get().pendingRememberMe;
          const sessionExpiresAt =
            Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 8 * 60 * 60 * 1000);

          set({
            accessToken: data.accessToken as string,
            refreshToken: data.refreshToken as string,
            user: data.account as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            requiresTwoFactor: false,
            twoFactorToken: null,
            twoFactorMessage: null,
            isFirstLogin: !onboardingCompleted,
            rememberMe,
            sessionExpiresAt,
            pendingRememberMe: false,
          });
          return true;
        } catch (err) {
          set({
            error: extractAuthError(err, 'Code de vérification invalide'),
            isLoading: false,
            pendingRememberMe: false,
          });
          return false;
        }
      },

      logout: () => {
        // US-015: call backend to revoke JWT token immediately via Redis blacklist
        api.post('/auth/logout').catch(() => {
          /* fail-silent: token expires naturally */
        });
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          isFirstLogin: false,
          rememberMe: false,
          sessionExpiresAt: null,
          requiresTwoFactor: false,
          twoFactorToken: null,
          twoFactorMessage: null,
          pendingRememberMe: false,
        });
      },

      setTokens: (access: string, refresh: string, user: User) => {
        const onboardingCompleted = user.onboardingCompleted ?? false;
        set({
          accessToken: access,
          refreshToken: refresh,
          user,
          isAuthenticated: true,
          requiresTwoFactor: false,
          twoFactorToken: null,
          twoFactorMessage: null,
          isFirstLogin: !onboardingCompleted,
          rememberMe: true,
          sessionExpiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
          pendingRememberMe: false,
        });
      },

      clearError: () => set({ error: null }),

      markOnboardingCompleted: async () => {
        const { user } = get();
        if (!user?.id) return;

        try {
          await authApi.completeOnboarding();
        } catch (err) {
          console.error('Failed to mark onboarding completed', err);
        }

        set((state) => ({
          user: state.user ? { ...state.user, onboardingCompleted: true } : null,
          isFirstLogin: false,
        }));
      },

      saveWizardProfile: async ({ companyName, role, sector, primaryChannels }) => {
        const { user } = get();
        if (!user?.id) return false;

        try {
          const data = await authApi.saveProfile({ companyName, role, sector, primaryChannels });

          set((state) => ({
            user: state.user
              ? {
                  ...state.user,
                  name:
                    ((data.account as Record<string, unknown>)?.companyName as string) ??
                    companyName,
                  role: ((data.account as Record<string, unknown>)?.role as string) ?? role,
                  sector: ((data.account as Record<string, unknown>)?.sector as string) ?? sector,
                  primaryChannels:
                    ((data.account as Record<string, unknown>)?.primaryChannels as string[]) ??
                    primaryChannels,
                }
              : null,
          }));

          return true;
        } catch (err) {
          set({ error: extractAuthError(err, 'Impossible de sauvegarder le profil') });
          return false;
        }
      },
    }),
    {
      name: 'novasms-auth',
      partialize: (state) => ({
        // ✅ Persister uniquement les champs nécessaires
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        isFirstLogin: state.isFirstLogin,
        rememberMe: state.rememberMe,
        sessionExpiresAt: state.sessionExpiresAt,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;

        const hasValidSession =
          typeof state.sessionExpiresAt === 'number' &&
          Number.isFinite(state.sessionExpiresAt) &&
          Date.now() < state.sessionExpiresAt;

        if (!hasValidSession) {
          state.user = null;
          state.accessToken = null;
          state.refreshToken = null;
          state.isAuthenticated = false;
          state.isFirstLogin = false;
          state.rememberMe = false;
          state.sessionExpiresAt = null;
          state.requiresTwoFactor = false;
          state.twoFactorToken = null;
          state.twoFactorMessage = null;
          state.pendingRememberMe = false;
        }

        state.isHydrated = true;
      },
    },
  ),
);
