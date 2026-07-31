import { motion } from 'framer-motion';
import { Bolt, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import RegisterForm from '../components/RegisterForm';
import { useAuthStore } from '@/stores/authStore';

export default function Register() {
  const { t } = useTranslation();
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    logout();
  }, [logout]);

  return (
    <div className="min-h-screen bg-background text-on-surface font-body antialiased flex flex-col">
      <header className="px-6 lg:px-12 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Bolt className="w-5 h-5 text-white" />
          </div>
          <span className="font-headline font-extrabold text-xl tracking-tight text-secondary">
            NovaSMS
          </span>
        </Link>
        <Link
          to="/login"
          className="text-sm font-bold text-secondary hover:text-primary transition-colors"
        >
          {t('register.hasAccount')}
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 lg:px-12 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-outline-variant/30 overflow-hidden flex flex-col lg:flex-row"
        >
          <div className="lg:w-1/2 bg-secondary p-10 lg:p-14 text-white flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -translate-x-1/2 translate-y-1/2"></div>

            <div className="relative z-10 space-y-6">
              <h1 className="font-headline text-3xl lg:text-4xl font-extrabold tracking-tight">
                {t('register.joinElite')}
              </h1>
              <p className="text-white/80 text-lg leading-relaxed">{t('register.pitch')}</p>
              <ul className="space-y-3 pt-4">
                {[t('register.freeTrial'), t('register.noCard'), t('register.support')].map(
                  (item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm font-semibold">
                      <div className="w-5 h-5 rounded-full bg-primary/30 flex items-center justify-center">
                        ✓
                      </div>
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>

          <div className="lg:w-1/2 p-8 lg:p-12 bg-white">
            <div className="mb-8">
              <h2 className="font-headline text-2xl font-bold text-secondary mb-2">
                {t('register.createExpert')}
              </h2>
              <p className="text-on-surface-variant text-sm">{t('register.fillInfo')}</p>
            </div>
            <RegisterForm />
            <div className="mt-8 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-semibold text-secondary/70 hover:text-primary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" /> {t('register.backToLogin')}
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      <footer className="py-6 text-center text-xs text-secondary/40 border-t border-outline-variant/20 bg-white">
        {t('register.copyright')}
      </footer>
    </div>
  );
}
