import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Bolt, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../../stores/authStore';

// Schema de validation Zod
const loginSchema = z.object({
  email: z.string().email('Email invalide').min(1, 'Email requis'),
  motDePasse: z.string().min(6, 'Mot de passe trop court'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // ✅ Ajouter isFirstLogin dans le destructuring
  const { login, error, clearError, isLoading } = useAuthStore();

  const [formData, setFormData] = useState<LoginFormData>({ email: '', motDePasse: '' });
  const [errors, setErrors] = useState<Partial<LoginFormData>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    try {
      loginSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Partial<LoginFormData> = {};
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as keyof LoginFormData] = issue.message;
          }
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validate()) return;

    const success = await login(formData.email, formData.motDePasse);

    if (success) {
      navigate('/dashboard');
    }
  };

  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-primary/10 px-8 py-6 border-b border-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Bolt className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-headline text-xl font-bold text-secondary">NovaSMS</h1>
              <p className="text-sm text-on-surface-variant">{t('login.merchantLogin')}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              {t('login.professionalEmail')}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full pl-12 pr-4 py-3 rounded-xl border ${
                  errors.email ? 'border-error bg-red-50' : 'border-outline-variant'
                } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                placeholder="contact@boutique.ci"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">
              {t('login.passwordLabel')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.motDePasse}
                onChange={(e) => handleChange('motDePasse', e.target.value)}
                className={`w-full pl-12 pr-12 py-3 rounded-xl border ${
                  errors.motDePasse ? 'border-error bg-red-50' : 'border-outline-variant'
                } focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all`}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.motDePasse && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> {errors.motDePasse}
              </p>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> {t('login.connecting')}
              </>
            ) : (
              t('login.signIn')
            )}
          </button>

          {/* Links */}
          <div className="text-center space-y-3">
            <Link to="/forgot-password" className="text-sm text-primary hover:underline">
              {t('auth.forgotPassword')}
            </Link>
            <p className="text-sm text-on-surface-variant">
              {t('login.noAccount')}{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                {t('login.createMerchant')}
              </Link>
            </p>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 bg-surface/50 border-t border-outline-variant/20 text-center">
          <p className="text-xs text-on-surface-variant">
            © 2026 NovaSMS — The Precision Architect
          </p>
        </div>
      </motion.div>
    </div>
  );
}
