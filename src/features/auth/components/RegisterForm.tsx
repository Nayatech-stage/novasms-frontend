import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { CountrySelect } from './CountrySelect';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authApi, extractAuthError } from '@/api/auth.api';

const RegisterSchema = z.object({
  nom: z.string().min(2, 'Le nom complet doit contenir au moins 2 caractères'),
  email: z.string().email('Adresse email professionnelle invalide'),
  motDePasse: z
    .string()
    .min(8, 'Minimum 8 caractères requis')
    .regex(/[A-Z]/, 'Au moins 1 majuscule requise')
    .regex(/[0-9]/, 'Au moins 1 chiffre requis')
    .regex(/[^A-Za-z0-9]/, 'Au moins 1 caractère spécial requis'),
  nomBoutique: z.string().min(2, 'Le nom de la boutique est requis'),
  pays: z.string().min(2, 'Le pays est requis'),
  acceptCGU: z.boolean().refine((v) => v === true, {
    message: "Vous devez accepter les conditions d'utilisation",
  }),
});
type RegisterDto = z.infer<typeof RegisterSchema>;

export default function RegisterForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const initialEmail =
    (location.state as { email?: string } | null)?.email ??
    localStorage.getItem('novasms-pending-confirmation-email') ??
    '';

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
  } = useForm<RegisterDto>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { pays: 'CI', email: initialEmail, acceptCGU: false },
  });

  const password = useWatch({ control, name: 'motDePasse' });
  const selectedCountry = useWatch({ control, name: 'pays' });

  const onSubmit = async (data: RegisterDto) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const json = await authApi.register(data);

      if (json.success) {
        localStorage.setItem('novasms-pending-confirmation-email', data.email);
        navigate('/confirm-email', { state: { email: data.email } });
      } else {
        setServerError(json.errors?.[0]?.message ?? json.message ?? 'Une erreur est survenue.');
      }
    } catch (err) {
      const msg = extractAuthError(err, '');
      if (msg.toLowerCase().includes('exist') || msg.toLowerCase().includes('409')) {
        setServerError('EMAIL DÉJÀ EXISTANT');
      } else {
        setServerError(msg || 'Impossible de contacter le serveur.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {serverError && (
        <div
          className={`p-4 border rounded-xl text-center ${
            serverError === 'EMAIL DÉJÀ EXISTANT'
              ? 'bg-orange-50 border-orange-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <p
            className={`text-sm font-semibold ${
              serverError === 'EMAIL DÉJÀ EXISTANT' ? 'text-orange-700' : 'text-red-700'
            }`}
          >
            {serverError}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1">Nom complet</label>
          <input
            {...register('nom')}
            className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Ex: Konan Romuald"
          />
          {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-semibold text-on-surface mb-1">Pays</label>
          <CountrySelect
            value={selectedCountry}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setValue('pays', e.target.value)}
            error={errors.pays?.message}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-on-surface mb-1">
          Email professionnel
        </label>
        <input
          {...register('email')}
          type="email"
          className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="contact@boutique.ci"
        />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-on-surface mb-1">
          Nom de la boutique
        </label>
        <input
          {...register('nomBoutique')}
          className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Ex: NovaShop CI"
        />
        {errors.nomBoutique && (
          <p className="mt-1 text-xs text-red-600">{errors.nomBoutique.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-on-surface mb-1">Mot de passe</label>
        <div className="relative">
          <input
            {...register('motDePasse')}
            type={showPassword ? 'text' : 'password'}
            className="w-full px-4 py-3 rounded-xl border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50 pr-10"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        <PasswordStrengthIndicator password={password || ''} />
        {errors.motDePasse && (
          <p className="mt-1 text-xs text-red-600">{errors.motDePasse.message}</p>
        )}
      </div>

      <div className="flex items-start gap-3 pt-2">
        <input
          {...register('acceptCGU')}
          type="checkbox"
          id="cgu"
          className="mt-1 w-4 h-4 accent-primary"
        />
        <div>
          <label htmlFor="cgu" className="text-sm text-on-surface-variant">
            J'accepte les{' '}
            <a href="#" className="text-primary">
              Conditions
            </a>{' '}
            et la{' '}
            <a href="#" className="text-primary">
              Politique de confidentialité
            </a>
          </label>
          {errors.acceptCGU && (
            <p className="mt-1 text-xs text-red-600">{errors.acceptCGU.message}</p>
          )}
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary text-white font-bold py-4 rounded-xl hover:brightness-110 flex items-center justify-center gap-2 disabled:opacity-70"
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Créer mon compte marchand'}
      </button>
    </form>
  );
}
