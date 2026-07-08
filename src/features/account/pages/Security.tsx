import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api/auth.api';

interface TwoFactorState {
  totpEnabled: boolean;
  smsEnabled: boolean;
  smsPhone: string | null;
  method: 'totp' | 'sms' | null;
  secret?: string;
  otpauthUrl?: string;
  backupCodes?: string[];
}

export default function Security() {
  const { user } = useAuthStore();
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorState>({
    totpEnabled: false,
    smsEnabled: false,
    smsPhone: null,
    method: null,
  });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // TOTP
  const [totpInputs, setTotpInputs] = useState(['', '', '', '', '', '']);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  // SMS
  const [smsPhone, setSmsPhone] = useState('');
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [smsCode, setSmsCode] = useState('');
  const [smsLoading, setSmsLoading] = useState(false);

  useEffect(() => {
    const renderQrCode = async () => {
      if (twoFactorState.method !== 'totp' || !twoFactorState.otpauthUrl) return;
      const canvas = qrCanvasRef.current;
      if (!canvas) return;
      try {
        await QRCode.toCanvas(canvas, twoFactorState.otpauthUrl, {
          width: 200,
          margin: 1,
          color: { dark: '#0C5460', light: '#FFFFFF' },
        });
      } catch {
        setMessage({
          type: 'error',
          text: "Impossible d'afficher le QR code. Utilisez la clé manuelle.",
        });
      }
    };
    renderQrCode();
  }, [twoFactorState.method, twoFactorState.otpauthUrl]);

  useEffect(() => {
    const loadAccount = async () => {
      if (!user?.id) return;
      try {
        const res = await authApi.getMe();
        if (res?.success && res.account) {
          setTwoFactorState((prev) => ({
            ...prev,
            totpEnabled: !!res.account.totpEnabled,
            smsEnabled: !!res.account.smsEnabled,
            smsPhone: res.account.twoFactorPhone ?? null,
            backupCodes: res.account.backupCodes?.length ? res.account.backupCodes : undefined,
          }));
        }
      } catch {
        setMessage({ type: 'error', text: "Impossible de récupérer l'état du compte." });
      }
    };
    loadAccount();
  }, [user?.id]);

  const isEnabled = twoFactorState.totpEnabled || twoFactorState.smsEnabled;
  const activeMethod = twoFactorState.totpEnabled
    ? 'totp'
    : twoFactorState.smsEnabled
      ? 'sms'
      : null;

  // ── TOTP handlers ──────────────────────────────────────────────────────────
  const handleGenerateTOTP = async () => {
    if (twoFactorState.smsEnabled) {
      setMessage({
        type: 'error',
        text: "Désactivez d'abord la 2FA SMS avant de configurer l'application.",
      });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await authApi.generateTwoFactorSecret();
      if (res.success && res.otpauth_url) {
        setTwoFactorState((prev) => ({
          ...prev,
          method: 'totp',
          secret: res.secret as string,
          otpauthUrl: res.otpauth_url as string,
        }));
      } else {
        setMessage({
          type: 'error',
          text: (res.message as string) || 'Erreur lors de la génération.',
        });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur.' });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnableTOTP = async () => {
    const code = totpInputs.join('');
    if (code.length !== 6) {
      setMessage({ type: 'error', text: 'Veuillez entrer les 6 chiffres.' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res = await authApi.enableTwoFactor(code);
      if (res.success) {
        setTwoFactorState((prev) => ({
          ...prev,
          totpEnabled: true,
          method: null,
          backupCodes: res.backup_codes as string[],
        }));
        setTotpInputs(['', '', '', '', '', '']);
        setMessage({
          type: 'success',
          text: '2FA Authenticator activée. Conservez vos codes de secours.',
        });
      } else {
        setMessage({ type: 'error', text: (res.message as string) || 'Code invalide.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la vérification.' });
    } finally {
      setLoading(false);
    }
  };

  const handleTotpInputChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newInputs = [...totpInputs];
    newInputs[index] = value.slice(-1);
    setTotpInputs(newInputs);
    if (value && index < 5) {
      const inputs = document.querySelectorAll('.totp-input');
      if (inputs[index + 1]) (inputs[index + 1] as HTMLInputElement).focus();
    }
  };

  // ── SMS OTP handlers ────────────────────────────────────────────────────────
  const handleSendSmsCode = async () => {
    if (!smsPhone.trim()) {
      setMessage({ type: 'error', text: 'Entrez votre numéro de téléphone.' });
      return;
    }
    setSmsLoading(true);
    setMessage(null);
    try {
      const res = await authApi.sendTwoFactorSms(smsPhone.trim());
      if (res.success) {
        setSmsCodeSent(true);
        setMessage({ type: 'success', text: 'Code OTP envoyé par SMS. Valable 10 minutes.' });
      } else {
        setMessage({ type: 'error', text: (res.message as string) || "Erreur lors de l'envoi." });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setSmsLoading(false);
    }
  };

  const handleEnableSms = async () => {
    if (!smsCode.trim() || smsCode.length < 6) {
      setMessage({ type: 'error', text: 'Entrez le code à 6 chiffres reçu par SMS.' });
      return;
    }
    setSmsLoading(true);
    setMessage(null);
    try {
      const res = await authApi.enableTwoFactorSms(smsPhone.trim(), smsCode.trim());
      if (res.success) {
        setTwoFactorState((prev) => ({
          ...prev,
          smsEnabled: true,
          smsPhone: smsPhone.replace(/(\d{2})\d+(\d{2})$/, '$1****$2'),
          method: null,
          backupCodes: res.backup_codes as string[],
        }));
        setSmsPhone('');
        setSmsCode('');
        setSmsCodeSent(false);
        setMessage({ type: 'success', text: '2FA SMS activée. Conservez vos codes de secours.' });
      } else {
        setMessage({ type: 'error', text: (res.message as string) || 'Code incorrect.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur lors de la vérification.' });
    } finally {
      setSmsLoading(false);
    }
  };

  // ── Disable 2FA ─────────────────────────────────────────────────────────────
  const handleDisable2FA = async () => {
    if (!window.confirm('Désactiver la double authentification ?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await authApi.disableTwoFactor();
      if (res.success) {
        setTwoFactorState({ totpEnabled: false, smsEnabled: false, smsPhone: null, method: null });
        setTotpInputs(['', '', '', '', '', '']);
        setSmsPhone('');
        setSmsCode('');
        setSmsCodeSent(false);
        setMessage({ type: 'success', text: '2FA désactivée.' });
      } else {
        setMessage({ type: 'error', text: (res.message as string) || 'Erreur.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Erreur de connexion.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyBackupCodes = () => {
    if (twoFactorState.backupCodes) {
      void navigator.clipboard.writeText(twoFactorState.backupCodes.join('\n'));
      setMessage({ type: 'success', text: 'Codes de secours copiés !' });
    }
  };

  const handleDownloadBackupCodes = () => {
    if (twoFactorState.backupCodes) {
      const text = twoFactorState.backupCodes.join('\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'novasms-backup-codes.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="content">
      <div className="max-w-6xl mx-auto px-8 py-10 space-y-8">
        {/* Header */}
        <div className="rounded-[28px] border border-outline-variant/20 bg-gradient-to-br from-white via-surface to-brand-light/40 p-8 shadow-[0_18px_50px_rgba(12,84,96,0.08)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                Sécurité du compte
              </p>
              <h1 className="text-4xl font-black text-on-surface">Double authentification</h1>
              <p className="text-base text-on-surface-variant leading-7">
                Renforcez la protection de votre compte avec une validation par application
                d'authentification ou par SMS.
              </p>
            </div>
            {isEnabled ? (
              <button
                onClick={handleDisable2FA}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-secondary px-5 py-3 text-sm font-bold text-white transition hover:bg-secondary/90 disabled:opacity-60"
              >
                Désactiver la 2FA
              </button>
            ) : (
              <div className="rounded-2xl border border-primary/15 bg-white px-4 py-3 text-sm text-on-surface-variant shadow-sm">
                Protection actuellement inactive
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="space-y-8">
            {/* Status Card */}
            <section className="rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/10 text-secondary text-xl font-bold">
                    2FA
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">État de la protection</h3>
                    <p className="text-sm text-on-surface-variant">
                      {twoFactorState.totpEnabled
                        ? 'Application Authenticator active.'
                        : twoFactorState.smsEnabled
                          ? `SMS OTP actif${twoFactorState.smsPhone ? ` — ${twoFactorState.smsPhone}` : ''}.`
                          : 'La double authentification est désactivée.'}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${isEnabled ? 'bg-primary/10 text-primary' : 'bg-surface-container text-on-surface-variant'}`}
                >
                  {isEnabled ? (activeMethod === 'totp' ? 'Authenticator' : 'SMS OTP') : 'Inactive'}
                </span>
              </div>
            </section>

            {/* Method Selection — only when nothing is active */}
            {!isEnabled && (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* TOTP card */}
                <div className="rounded-[24px] border border-primary/20 bg-gradient-to-br from-white to-brand-light/40 p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-on-surface">
                        Application Authenticator
                      </h4>
                      <p className="text-sm text-on-surface-variant mt-1">
                        Codes temporaires via Google Authenticator, Authy, etc.
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Recommandé
                    </span>
                  </div>
                  <button
                    onClick={handleGenerateTOTP}
                    disabled={loading || twoFactorState.method === 'totp'}
                    className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition hover:brightness-110 disabled:opacity-60"
                  >
                    {loading && twoFactorState.method === 'totp'
                      ? 'Génération...'
                      : 'Configurer maintenant'}
                  </button>
                </div>

                {/* SMS OTP card */}
                <div className="rounded-[24px] border border-outline-variant/20 bg-white p-6 shadow-sm">
                  <h4 className="text-lg font-bold text-on-surface mb-1">SMS OTP</h4>
                  <p className="text-sm text-on-surface-variant mb-4">
                    Recevez un code à usage unique par SMS à chaque connexion.
                  </p>
                  <button
                    onClick={() =>
                      setTwoFactorState((prev) => ({
                        ...prev,
                        method: prev.method === 'sms' ? null : 'sms',
                      }))
                    }
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary/10"
                  >
                    {twoFactorState.method === 'sms' ? 'Annuler' : 'Configurer par SMS'}
                  </button>
                </div>
              </div>
            )}

            {/* TOTP Setup Wizard */}
            {twoFactorState.method === 'totp' && !twoFactorState.totpEnabled && (
              <section className="rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-sm">
                <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold text-on-surface">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white font-bold">
                    1
                  </span>
                  Configuration de l'application
                </h3>
                <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
                  <div className="space-y-6">
                    <div>
                      <h5 className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Étape 1 · Scanner le code
                      </h5>
                      <div className="inline-block rounded-2xl border border-outline-variant/20 bg-surface p-4">
                        <canvas ref={qrCanvasRef} width={200} height={200} className="block" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4">
                      <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                        Clé manuelle
                      </p>
                      <div className="flex flex-col gap-2 font-mono font-bold text-secondary sm:flex-row sm:items-center sm:justify-between">
                        <span className="break-all text-xs sm:text-sm tracking-[0.18em]">
                          {twoFactorState.secret || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            void navigator.clipboard.writeText(twoFactorState.secret ?? '')
                          }
                          className="rounded-xl border border-outline-variant/30 px-3 py-2 text-xs font-semibold text-secondary hover:border-primary/40 hover:text-primary"
                        >
                          Copier
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center space-y-6">
                    <div>
                      <h5 className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                        Étape 2 · Vérifier le code
                      </h5>
                      <p className="mb-6 text-sm text-on-surface-variant">
                        Entrez les 6 chiffres affichés dans votre appli d'authentification.
                      </p>
                      <div className="flex flex-wrap gap-2 mb-6">
                        {totpInputs.map((val, idx) => (
                          <input
                            key={idx}
                            type="text"
                            maxLength={1}
                            value={val}
                            onChange={(e) => handleTotpInputChange(idx, e.target.value)}
                            className="totp-input h-14 w-12 rounded-xl border border-outline-variant/30 bg-surface text-center text-2xl font-bold text-on-surface transition focus:border-primary focus:bg-white focus:outline-none"
                            inputMode="numeric"
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleVerifyAndEnableTOTP}
                        disabled={loading || totpInputs.join('').length !== 6}
                        className="inline-flex w-full items-center justify-center rounded-2xl bg-secondary px-4 py-3 font-bold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                      >
                        {loading ? 'Vérification...' : 'Activer la 2FA Authenticator'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* SMS OTP Setup Wizard */}
            {twoFactorState.method === 'sms' && !twoFactorState.smsEnabled && (
              <section className="rounded-[28px] border border-outline-variant/20 bg-white p-6 shadow-sm">
                <h3 className="mb-6 flex items-center gap-3 text-2xl font-bold text-on-surface">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white font-bold">
                    1
                  </span>
                  Configuration SMS OTP
                </h3>

                {!smsCodeSent ? (
                  <div className="max-w-sm space-y-4">
                    <p className="text-sm text-on-surface-variant">
                      Entrez votre numéro de téléphone. Un code de vérification sera envoyé par SMS.
                    </p>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant mb-2">
                        Numéro de téléphone
                      </label>
                      <input
                        type="tel"
                        value={smsPhone}
                        onChange={(e) => setSmsPhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 text-sm text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSendSmsCode}
                      disabled={smsLoading || !smsPhone.trim()}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-bold text-on-primary transition hover:brightness-110 disabled:opacity-60"
                    >
                      {smsLoading ? 'Envoi...' : 'Envoyer le code OTP'}
                    </button>
                  </div>
                ) : (
                  <div className="max-w-sm space-y-4">
                    <p className="text-sm text-on-surface-variant">
                      Code envoyé au <strong>{smsPhone}</strong>. Entrez-le ci-dessous.
                    </p>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant mb-2">
                        Code OTP reçu par SMS
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={smsCode}
                        onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="123456"
                        className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-on-surface focus:border-primary focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleEnableSms}
                      disabled={smsLoading || smsCode.length < 6}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-secondary px-4 py-3 font-bold text-white transition hover:bg-secondary/90 disabled:opacity-60"
                    >
                      {smsLoading ? 'Vérification...' : 'Activer la 2FA SMS'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSmsCodeSent(false);
                        setSmsCode('');
                      }}
                      className="text-xs text-on-surface-variant hover:text-primary"
                    >
                      Changer de numéro
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* Message Display */}
            {message && (
              <div
                className={`rounded-2xl border px-4 py-3 text-sm ${message.type === 'success' ? 'border-primary/20 bg-primary/10 text-secondary' : 'border-red-200 bg-red-50 text-red-700'}`}
              >
                {message.text}
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="space-y-6">
            {/* Backup Codes */}
            {isEnabled && twoFactorState.backupCodes && (
              <section className="rounded-[24px] border border-outline-variant/20 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-xl font-bold text-on-surface">Codes de secours</h3>
                <p className="mb-4 text-sm text-on-surface-variant">
                  Conservez ces codes en lieu sûr. Ils permettent d'accéder à votre compte si vous
                  n'avez pas accès à votre 2FA.
                </p>
                <div className="mb-4 max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-4 font-mono text-sm">
                  {twoFactorState.backupCodes.map((code, idx) => (
                    <div key={idx} className="text-text-2">
                      {code}
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleDownloadBackupCodes}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/40 px-4 py-3 text-sm font-semibold text-secondary transition hover:border-primary/40 hover:text-primary"
                  >
                    Télécharger
                  </button>
                  <button
                    onClick={handleCopyBackupCodes}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-outline-variant/40 px-4 py-3 text-sm font-semibold text-secondary transition hover:border-primary/40 hover:text-primary"
                  >
                    Copier
                  </button>
                </div>
              </section>
            )}

            {/* Security Tips */}
            <section className="rounded-[24px] border border-outline-variant/20 bg-brand-light/60 p-6 shadow-sm">
              <h4 className="mb-3 text-sm font-bold text-secondary">Conseils utiles</h4>
              <ul className="space-y-2 text-xs text-on-surface-variant">
                <li>• Activez les notifications pour les connexions suspectes</li>
                <li>• Utilisez un gestionnaire de mots de passe sécurisé</li>
                <li>• Conservez vos codes de secours dans un endroit sûr</li>
                <li>• Ne partagez jamais vos codes avec quiconque</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
