import { motion } from 'framer-motion';
import { Bolt, CheckCircle, ArrowRight, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function ConfirmationSuccess() {
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex justify-center border-b border-outline-variant/20 bg-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Bolt className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-extrabold text-xl tracking-tight text-secondary">
            NovaMessenger
          </span>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="p-8 lg:p-16 text-center">
              <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mx-auto mb-8">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="font-headline text-3xl lg:text-4xl font-extrabold text-secondary mb-6">
                Félicitations ! Votre compte est prêt.
              </h1>
              <p className="text-on-surface-variant text-lg mb-10 max-w-xl mx-auto">
                Votre adresse e-mail a été confirmée avec succès.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-3 px-8 py-5 bg-primary text-white font-bold rounded-2xl hover:brightness-110 transition-all"
              >
                Accéder au tableau de bord
                <ArrowRight className="w-6 h-6" />
              </Link>
              <div className="mt-8 pt-8 border-t border-outline-variant/20">
                <a
                  href="/support"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-secondary/70 hover:text-primary"
                >
                  <HelpCircle className="w-4 h-4" /> Besoin d'aide ?
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
      <footer className="py-6 text-center text-xs text-secondary/40 border-t border-outline-variant/20 bg-white">
        <p>Copyright 2026 NovaSend</p>
      </footer>
    </div>
  );
}
