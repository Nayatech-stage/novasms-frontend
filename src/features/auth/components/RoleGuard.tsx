import { useAuthStore } from '@/stores/authStore';
import type { AppRole } from '@/config/roles';
import ForbiddenPage from '@/components/ForbiddenPage';

type Props = {
  roles: AppRole[];
  children: React.ReactNode;
};

export default function RoleGuard({ roles, children }: Props) {
  const user = useAuthStore((s) => s.user);
  const role = (user?.role ?? 'Admin') as AppRole;

  // Admin a accès à tout le site sans restriction
  if (role === 'Admin' || roles.includes(role)) {
    return <>{children}</>;
  }

  return <ForbiddenPage />;
}
