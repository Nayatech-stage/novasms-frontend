import { motion } from 'framer-motion';
import { Bolt, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';

export default function Login() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const navigate = useNavigate();
  const {
    login,
    verifyTwoFactor,
    isLoading,
    error,
    requiresTwoFactor,
    twoFactorToken,
    twoFactorMessage,
  } = useAuthStore();

  // Effacer l'état local au montage de Login (sans appel API, pour éviter une boucle)
  useEffect(() => {
    // On utilise getState() directement pour ne pas déclencher l'intercepteur axios
    const store = useAuthStore.getState();
    store.user === null || store.accessToken === null
      ? undefined // déjà déconnecté
      : useAuthStore.setState({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          requiresTwoFactor: false,
          twoFactorToken: null,
          twoFactorMessage: null,
          pendingRememberMe: false,
          isFirstLogin: false,
          rememberMe: false,
          sessionExpiresAt: null,
        });
  }, []);

  const redirectAfterAuth = () => {
    navigate('/dashboard');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (requiresTwoFactor && twoFactorToken) {
      const verified = await verifyTwoFactor(twoFactorToken, twoFactorCode);

      if (verified) {
        redirectAfterAuth();
      }

      return;
    }

    const success = await login(email, password, rememberMe);

    if (success) {
      redirectAfterAuth();
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
      {/* Header */}
      <header className="px-6 lg:px-12 py-6 flex justify-center border-b border-outline-variant/20 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Bolt className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-extrabold text-xl tracking-tight text-secondary">
            NovaSMS
          </span>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-outline-variant/30 p-8 lg:p-10"
        >
          <div className="text-center mb-8">
            <h1 className="font-headline text-2xl font-bold text-secondary">
              {t('login.welcomeBack')}
            </h1>
            <p className="text-on-surface-variant mt-2">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" aria-label="Formulaire de connexion">
            <div>
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-on-surface mb-1"
              >
                {t('login.professionalEmail')}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                placeholder="contact@boutique.ci"
                autoComplete="email"
                aria-required="true"
                required
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-sm font-semibold text-on-surface mb-1"
              >
                {t('login.passwordLabel')}
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all pr-10"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-required="true"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-primary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {requiresTwoFactor && (
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">
                  {t('login.twoFactorCode')}
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all tracking-[0.25em] text-center"
                  placeholder="123456 ou 1234-5678"
                  maxLength={9}
                  required
                />
                <p className="mt-2 text-xs text-on-surface-variant">
                  {twoFactorMessage || t('login.twoFactorHint')}
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-error-container text-error-container rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-on-surface-variant">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded border-outline-variant"
                />
                {t('login.rememberMe')}
              </label>
              <Link to="/reset-password" className="text-primary font-semibold hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {isLoading
                ? t('login.signingIn')
                : requiresTwoFactor
                  ? t('login.verifyCode')
                  : t('login.signIn')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-on-surface-variant">
            {t('login.noAccount')}{' '}
            <Link to="/register" className="text-primary font-semibold hover:underline">
              {t('login.createMerchant')}
            </Link>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-secondary/40 border-t border-outline-variant/20 bg-white">
        Copyright 2026 NovaSMS —{' '}
        <Link to="/" className="hover:text-primary">
          {t('login.backToSite')}
        </Link>
      </footer>
    </div>
  );
}
