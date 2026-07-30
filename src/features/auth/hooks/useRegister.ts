import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { authApi, extractAuthError } from '@/api/auth.api';

export const RegisterSchema = z.object({
  nom: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  nomBoutique: z.string().min(2, 'Nom boutique trop court'),
  pays: z.string().min(1, 'Pays requis'),
  motDePasse: z.string().min(8, 'Mot de passe trop court'),
});

export type RegisterDto = z.infer<typeof RegisterSchema>;

export function useRegister() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const register = async (data: RegisterDto) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await authApi.register({ ...data, acceptCGU: true });
      if (res.success) {
        navigate('/confirm-email', { state: { email: data.email } });
      } else {
        setError(res.message || 'Une erreur est survenue');
      }
    } catch (err) {
      setError(extractAuthError(err, 'Impossible de contacter le serveur'));
    } finally {
      setIsLoading(false);
    }
  };

  return { register, isLoading, error };
}
