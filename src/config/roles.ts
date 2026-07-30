export type AppRole = 'Admin' | 'Editor' | 'Analyst';

// Routes accessibles par rôle — Admin a tout, pas listé = tout le monde
export const ROUTE_ROLES: Record<string, AppRole[]> = {
  '/contacts': ['Admin', 'Editor'],
  '/campaigns': ['Admin', 'Editor'],
  '/automations': ['Admin', 'Editor'],
  '/rechargement': ['Admin'],
  '/account/team': ['Admin'],
  '/account/developers': ['Admin'],
  '/account/audit-logs': ['Admin', 'Analyst'],
};

// Rôle par défaut si non défini (sécurité)
export const FALLBACK_REDIRECT: Record<AppRole, string> = {
  Admin: '/dashboard',
  Editor: '/dashboard',
  Analyst: '/analytics',
};

export function canAccess(role: AppRole, path: string): boolean {
  const allowed = ROUTE_ROLES[path];
  if (!allowed) return true; // pas de restriction → tout le monde
  return allowed.includes(role);
}
