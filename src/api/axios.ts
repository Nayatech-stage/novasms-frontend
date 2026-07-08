import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// ── Intercepteur de requête : injecter le Bearer token ─────────────────────
api.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ── Intercepteur de réponse ────────────────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError<{ message?: string | string[]; error?: string }>) => {
    const originalRequest = error.config as typeof error.config & {
      _retry?: boolean;
      _silent?: boolean;
    };
    const status = error.response?.status;
    const url: string = originalRequest?.url ?? '';

    // Endpoints auth publics : pas de refresh-loop ni de toast global
    const isAuthCall =
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout') ||
      url.includes('/auth/login') ||
      url.includes('/auth/verify-2fa') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/verify-email') ||
      url.includes('/auth/resend-confirmation');

    // ── Refresh token sur 401 ──────────────────────────────────────────────
    if (status === 401 && !isAuthCall && !originalRequest._retry) {
      originalRequest._retry = true;
      const { refreshToken, setTokens, logout } = useAuthStore.getState();

      if (refreshToken) {
        try {
          const res = await axios.post(
            `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api'}/auth/refresh`,
            { refreshToken },
          );
          if (res.data.success) {
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
              setTokens(res.data.accessToken, res.data.refreshToken, currentUser);
            } else {
              logout();
              window.location.href = '/login';
              return Promise.reject(error);
            }
            originalRequest.headers = originalRequest.headers ?? {};
            originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return api(originalRequest);
          }
        } catch {
          logout();
          window.location.href = '/login';
          return Promise.reject(error);
        }
      } else {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    // ── Toast global pour les erreurs non silencieuses ─────────────────────
    // Les appels peuvent passer _silent: true dans la config pour désactiver le toast
    if (!originalRequest?._silent && !isAuthCall) {
      showErrorToast(error);
    }

    return Promise.reject(error);
  },
);

function showErrorToast(error: AxiosError<{ message?: string | string[]; error?: string }>) {
  const status = error.response?.status;

  // Erreur réseau (pas de réponse du serveur)
  if (!error.response) {
    toast.error('Connexion impossible. Vérifiez votre connexion internet.');
    return;
  }

  // 401 → géré par le flux refresh, pas de toast
  if (status === 401) return;

  // 400 → erreur de validation : message depuis le serveur si disponible
  if (status === 400) {
    const serverMsg = extractMessage(error);
    if (serverMsg) {
      toast.error(serverMsg);
    }
    // Si pas de message serveur, la page gère elle-même l'erreur 400
    return;
  }

  // 403 → accès interdit
  if (status === 403) {
    toast.error("Vous n'avez pas les droits pour effectuer cette action.");
    return;
  }

  // 404 → ressource introuvable (souvent géré en page, pas de toast par défaut)
  if (status === 404) return;

  // 409 → conflit
  if (status === 409) {
    const serverMsg = extractMessage(error);
    toast.error(serverMsg ?? 'Un conflit a été détecté. Vérifiez les données saisies.');
    return;
  }

  // 429 → rate limit
  if (status === 429) {
    toast.error('Trop de requêtes. Veuillez patienter quelques instants.');
    return;
  }

  // 5xx → erreur serveur
  if (status && status >= 500) {
    toast.error('Le serveur a rencontré un problème. Réessayez dans quelques instants.');
    return;
  }

  // Autres cas inattendus
  const serverMsg = extractMessage(error);
  if (serverMsg) {
    toast.error(serverMsg);
  }
}

function extractMessage(
  error: AxiosError<{ message?: string | string[]; error?: string }>,
): string | null {
  const data = error.response?.data;
  if (!data) return null;

  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  if (Array.isArray(data.message) && data.message.length > 0) {
    const first = data.message.find((m) => typeof m === 'string');
    if (first) return first;
  }
  if (typeof data.error === 'string' && data.error.trim()) return data.error;
  return null;
}

export default api;
