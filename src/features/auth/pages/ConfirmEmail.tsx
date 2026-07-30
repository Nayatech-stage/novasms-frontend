import { motion } from 'framer-motion';
import { Bolt, Info, Loader2, PencilLine, Check, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { authApi, extractAuthError } from '@/api/auth.api';
export default function ConfirmEmail() {
  // do not forcibly logout when showing confirmation instructions
  const location = useLocation();
  const [isResending, setIsResending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [draftEmail, setDraftEmail] = useState(() => {
    const emailFromStorage = localStorage.getItem('novasms-pending-confirmation-email') || '';
    const emailFromLocation = (window.history.state?.usr as { email?: string } | undefined)?.email;
    return emailFromLocation || emailFromStorage;
  });

  const emailFromState = (location.state as { email?: string } | null)?.email;
  const email = emailFromState || localStorage.getItem('novasms-pending-confirmation-email') || '';
  const handleResend = async () => {
    const targetEmail = (isEditingEmail ? draftEmail : email).trim();

    if (!targetEmail) {
      setFeedback(
        "Aucune adresse email disponible. Retournez à l'inscription pour en saisir une nouvelle.",
      );
      return;
    }

    setIsResending(true);
    setFeedback(null);

    try {
      const json = await authApi.resendConfirmation(targetEmail);

      if (!json.success) {
        setFeedback(json.message || 'Impossible de renvoyer le lien pour le moment.');
        return;
      }

      localStorage.setItem('novasms-pending-confirmation-email', targetEmail);
      setDraftEmail(targetEmail);
      setIsEditingEmail(false);
      setFeedback(json.message || 'Un nouveau lien de confirmation a été envoyé.');
    } catch (err) {
      setFeedback(extractAuthError(err, 'Erreur de connexion au serveur.'));
    } finally {
      setIsResending(false);
    }
  };

  const handleStartEdit = () => {
    setDraftEmail(email);
    setIsEditingEmail(true);
    setFeedback(null);
  };

  const handleCancelEdit = () => {
    setDraftEmail(email);
    setIsEditingEmail(false);
    setFeedback(null);
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
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
      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
        >
          <div className="p-8 lg:p-12 text-center">
            <h1 className="font-headline text-2xl lg:text-3xl font-extrabold text-secondary mb-3">
              Presque là. L'excellence vous attend.
            </h1>
            <p className="text-on-surface-variant mb-8">
              Vérifiez votre boîte de réception pour activer votre accès.
            </p>
            <div className="bg-surface-variant/50 rounded-xl p-5 border border-outline-variant/20 mb-4">
              <h3 className="font-bold text-secondary mb-2">Vérifiez votre boîte mail</h3>
              <p className="text-sm text-on-surface-variant">
                Un lien de confirmation vient d'être envoyé à votre adresse professionnelle.
              </p>
            </div>
            <div className="flex items-start gap-2 text-left p-3 bg-primary/5 rounded-lg border border-primary/10 mb-8">
              <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-on-surface-variant">
                Vous n'avez rien reçu ? Vérifiez vos spams.
              </p>
            </div>
            {isEditingEmail ? (
              <div className="space-y-3">
                <div className="text-left">
                  <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                    Nouvelle adresse email
                  </label>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
                    placeholder="contact@boutique.ci"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isResending}
                    className="px-5 py-3 bg-primary text-white font-semibold rounded-xl hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  >
                    {isResending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    Enregistrer et renvoyer
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-5 py-3 bg-surface text-secondary font-semibold rounded-xl hover:bg-surface-variant transition-all border border-outline-variant inline-flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isResending}
                  className="px-5 py-3 bg-surface text-secondary font-semibold rounded-xl hover:bg-surface-variant transition-all border border-outline-variant disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Renvoyer le lien
                </button>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="px-5 py-3 bg-surface text-secondary font-semibold rounded-xl hover:bg-surface-variant transition-all border border-outline-variant inline-flex items-center justify-center gap-2"
                >
                  <PencilLine className="w-4 h-4" />
                  Modifier l'email
                </button>
              </div>
            )}
            {feedback && <p className="mt-5 text-sm text-on-surface-variant">{feedback}</p>}
          </div>
        </motion.div>
      </main>
      <footer className="py-6 text-center text-xs text-secondary/40 border-t border-outline-variant/20 bg-white">
        Copyright 2026 NovaSMS —{' '}
        <Link to="/" className="hover:text-primary">
          Retour au site
        </Link>
      </footer>
    </div>
  );
}
