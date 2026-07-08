import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bolt, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { authApi, extractAuthError } from '@/api/auth.api';

const verificationRequests = new Map<string, Promise<{ success: boolean; message: string }>>();

function getVerificationRequest(token: string) {
  const existing = verificationRequests.get(token);
  if (existing) return existing;

  const request = authApi
    .verifyEmail(token)
    .then((data) => {
      if (!data.success) throw new Error(data.message || 'Lien invalide ou expiré.');
      return {
        success: true,
        message: data.message || 'Votre email est confirmé. Redirection...',
      };
    })
    .catch((err) => {
      throw new Error(extractAuthError(err, 'Lien invalide ou expiré.'));
    })
    .finally(() => {
      verificationRequests.delete(token);
    });

  verificationRequests.set(token, request);
  return request;
}

export default function VerifyEmail() {
  // keep auth intact while verifying via email link
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // no-op: do not clear auth on mount

  useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      try {
        const result = await getVerificationRequest(token || '');

        if (cancelled) return;

        if (result.success) {
          setStatus('success');
          setMessage(result.message);
          setTimeout(() => navigate('/confirmation-success'), 1500);
        }
      } catch (error) {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Erreur de connexion au serveur.');
      }
    };

    if (token) {
      verify();
    }

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

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

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-outline-variant/30 p-8 lg:p-12 text-center"
        >
          {/* Loading State */}
          {status === 'loading' && (
            <>
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-secondary mb-4">
                Vérification en cours...
              </h1>
              <p className="text-on-surface-variant">
                Nous confirmons votre adresse e-mail. Veuillez patienter.
              </p>
            </>
          )}

          {/* Success State */}
          {status === 'success' && (
            <>
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-secondary mb-4">
                Email vérifié avec succès !
              </h1>
              <p className="text-on-surface-variant mb-6">{message}</p>
              <p className="text-sm text-primary font-semibold">
                Redirection vers la page de confirmation...
              </p>
            </>
          )}

          {/* Error State */}
          {status === 'error' && (
            <>
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="font-headline text-2xl font-bold text-secondary mb-4">
                Vérification échouée
              </h1>
              <p className="text-on-surface-variant mb-6">{message}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:brightness-110 transition-all"
                >
                  Réessayer l'inscription
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-surface text-secondary font-semibold rounded-xl hover:bg-surface-variant transition-all border border-outline-variant"
                >
                  Se connecter
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-secondary/40 border-t border-outline-variant/20 bg-white">
        <p>
          Copyright 2026 NovaSMS —{' '}
          <Link to="/" className="hover:text-primary">
            Retour au site
          </Link>
        </p>
      </footer>
    </div>
  );
}
