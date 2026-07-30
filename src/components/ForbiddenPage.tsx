import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import type { AppRole } from '@/config/roles';
import { FALLBACK_REDIRECT } from '@/config/roles';

export default function ForbiddenPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? 'Admin') as AppRole;

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <span className="material-symbols-outlined text-red-600" style={{ fontSize: 36 }}>
          lock
        </span>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-on-surface mb-2">Accès refusé</h1>
        <p className="text-on-surface-variant max-w-md">
          Désolé, vous n'avez pas accès à cette page. Contactez votre administrateur si vous pensez
          qu'il s'agit d'une erreur.
        </p>
      </div>
      <button
        onClick={() => navigate(FALLBACK_REDIRECT[role])}
        className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:brightness-110 transition"
      >
        Retour au tableau de bord
      </button>
    </div>
  );
}
