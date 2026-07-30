import { Bolt } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { PasswordStrengthIndicator } from '../components/PasswordStrengthIndicator';
import { authApi, extractAuthError } from '@/api/auth.api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const hasToken = Boolean(token);

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submitRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError('Email requis.');
      return;
    }

    setLoading(true);
    try {
      const json = await authApi.forgotPassword(email.trim());
      if (!json.success) {
        setError(json.message || "Impossible d'envoyer le lien de réinitialisation.");
        return;
      }
      setSuccess(json.message || 'Si le compte existe, un email sera envoyé.');
    } catch (err) {
      setError(extractAuthError(err, 'Erreur de connexion au serveur.'));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Token manquant.');
      return;
    }

    const checks = [
      newPassword.length >= 8,
      /[A-Z]/.test(newPassword),
      /[0-9]/.test(newPassword),
      /[^A-Za-z0-9]/.test(newPassword),
    ];
    if (checks.some((c) => !c)) {
      setError(
        'Mot de passe faible. Requis: 8+ caractères, 1 majuscule, 1 chiffre, 1 caractère spécial.',
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const json = await authApi.resetPassword(token, newPassword);
      if (!json.success) {
        setError(json.message || 'Impossible de réinitialiser le mot de passe.');
        return;
      }
      setSuccess('Mot de passe réinitialisé avec succès. Redirection...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(extractAuthError(err, 'Erreur de connexion au serveur.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6 w-full">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Bolt className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-bold text-secondary">NovaSMS</span>
        </div>

        <h1 className="text-2xl font-bold text-secondary mb-2">Réinitialiser le mot de passe</h1>
        <p className="text-on-surface-variant mb-6 text-sm">
          {hasToken
            ? 'Choisissez un nouveau mot de passe pour votre compte.'
            : 'Entrez votre email pour recevoir un lien de réinitialisation.'}
        </p>

        <form
          onSubmit={hasToken ? submitReset : submitRequestReset}
          className="space-y-4 text-left"
        >
          {hasToken ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">
                  Nouveau mot de passe
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                  required
                />
                <PasswordStrengthIndicator password={newPassword} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-on-surface mb-1">
                Email professionnel
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="contact@boutique.ci"
                required
              />
            </div>
          )}

          {error && (
            <div className="p-3 bg-error-container text-error-container rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-primary/10 text-primary rounded-lg text-sm">{success}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading
              ? hasToken
                ? 'Réinitialisation...'
                : 'Envoi...'
              : hasToken
                ? 'Réinitialiser'
                : 'Envoyer le lien'}
          </button>

          <div className="pt-2 text-center">
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Retour à la connexion
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
