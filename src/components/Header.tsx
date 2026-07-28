import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCampaignActions } from '@/hooks/useCampaign';
import { useUiStore } from '@/stores/uiStore';
import api from '@/api/axios';
import {
  Bell,
  ChevronDown,
  CircleUserRound,
  FileClock,
  LogOut,
  Settings2,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

const ROLE_LABEL: Record<string, string> = {
  Admin: 'Admin',
  Editor: 'Éditeur',
  Analyst: 'Analyste',
};
const ROLE_CLASS: Record<string, string> = {
  Admin: 'bg-green-100 text-green-800',
  Editor: 'bg-blue-100 text-blue-800',
  Analyst: 'bg-gray-100 text-gray-600',
};

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Tableau de bord',
  '/contacts': 'Contacts',
  '/campaigns': 'Campagnes',
  '/campaigns/new': 'Nouvelle campagne',
  '/automations': 'Automatisations',
  '/analytics': 'Analytics',
  '/rechargement': 'Rechargement',
  '/account/profile': 'Profil',
  '/account/team': 'Équipe',
  '/account/settings': 'Paramètres',
  '/account/security': 'Sécurité',
  '/account/audit-logs': 'Journal d’audit',
};

interface Balance {
  balance: number;
  alertThreshold: number | null;
  creditLimit: number | null;
}

interface AuditLogItem {
  id: string;
  action: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  href: string;
  tone: 'primary' | 'success' | 'warning' | 'info';
  icon: 'profile' | 'security' | 'campaign' | 'team' | 'credits' | 'audit';
}

function formatRelativeTime(value: string): string {
  const date = new Date(value);
  const delta = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));

  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.round(hours / 24);
  return `Il y a ${days} j`;
}

function buildNotification(item: AuditLogItem): HeaderNotification {
  const action = item.action ?? 'audit';
  const details = item.details ?? {};

  switch (action) {
    case 'profile_updated':
      return {
        id: item.id,
        title: 'Profil mis à jour',
        message: 'Les informations du compte ont été enregistrées.',
        time: formatRelativeTime(item.createdAt),
        href: '/account/profile',
        tone: 'primary',
        icon: 'profile',
      };
    case 'settings_updated':
      return {
        id: item.id,
        title: 'Paramètres enregistrés',
        message: 'Vos préférences de compte ont été appliquées.',
        time: formatRelativeTime(item.createdAt),
        href: '/account/settings',
        tone: 'info',
        icon: 'audit',
      };
    case '2fa_enabled':
    case '2fa_disabled':
      return {
        id: item.id,
        title:
          action === '2fa_enabled'
            ? 'Double authentification activée'
            : 'Double authentification désactivée',
        message: 'La sécurité du compte a été modifiée.',
        time: formatRelativeTime(item.createdAt),
        href: '/account/security',
        tone: 'warning',
        icon: 'security',
      };
    case 'team_invite':
    case 'team_remove':
      return {
        id: item.id,
        title: action === 'team_invite' ? 'Invitation équipe envoyée' : 'Membre retiré de l’équipe',
        message: 'La gestion des accès a été mise à jour.',
        time: formatRelativeTime(item.createdAt),
        href: '/account/team',
        tone: 'info',
        icon: 'team',
      };
    case 'campaign_sent':
    case 'campaign_created':
    case 'campaign_deleted':
      return {
        id: item.id,
        title:
          action === 'campaign_sent'
            ? 'Campagne envoyée'
            : action === 'campaign_created'
              ? 'Nouvelle campagne créée'
              : 'Campagne supprimée',
        message:
          typeof details?.campaignName === 'string'
            ? details.campaignName
            : 'Le suivi de campagne a été mis à jour.',
        time: formatRelativeTime(item.createdAt),
        href: '/campaigns',
        tone: action === 'campaign_deleted' ? 'warning' : 'success',
        icon: 'campaign',
      };
    case 'recharge_visa':
    case 'recharge_mobile':
      return {
        id: item.id,
        title: 'Rechargement enregistré',
        message: 'Un crédit a été ajouté au compte.',
        time: formatRelativeTime(item.createdAt),
        href: '/rechargement',
        tone: 'success',
        icon: 'credits',
      };
    default:
      return {
        id: item.id,
        title: 'Activité du compte',
        message: action.replace(/_/g, ' '),
        time: formatRelativeTime(item.createdAt),
        href: '/account/audit-logs',
        tone: 'info',
        icon: 'audit',
      };
  }
}

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { createNewCampaign } = useCampaignActions();
  const { t, i18n } = useTranslation();
  const { toggleMobileSidebar } = useUiStore();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [recentLogs, setRecentLogs] = useState<AuditLogItem[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchBalance = () => {
    api
      .get<Balance>('/account/balance')
      .then((r) => setBalance(r.data))
      .catch(() => setBalance(null));
  };

  useEffect(() => {
    fetchBalance();
    const timer = window.setInterval(fetchBalance, 30_000);
    window.addEventListener('novasms:balance-refresh', fetchBalance);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('novasms:balance-refresh', fetchBalance);
    };
  }, []);

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await api.get<{ data: AuditLogItem[] }>('/audit-logs?page=1&limit=5');
      setRecentLogs(response.data.data ?? []);
    } catch {
      setRecentLogs([]);
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => {
      void loadNotifications();
    }, 45000);

    return () => window.clearInterval(timer);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? 'KM');

  const roleLabel = user?.role ? (ROLE_LABEL[user.role] ?? user.role) : '';
  const roleClass = user?.role ? (ROLE_CLASS[user.role] ?? 'bg-gray-100 text-gray-600') : '';

  // Page title dynamique
  const exactPath = location.pathname;
  const pageTitle =
    PAGE_TITLES[exactPath] ??
    Object.entries(PAGE_TITLES).find(([k]) => exactPath.startsWith(k))?.[1] ??
    'NovaSMS';

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const firstName = user?.name ? user.name.split(' ')[0] : (user?.email?.split('@')[0] ?? 'vous');

  const credits = balance?.balance ?? null;
  const alertThreshold = balance?.alertThreshold ?? null;
  const creditLimit = balance?.creditLimit ?? null;
  // Jauge : base = creditLimit si défini, sinon alertThreshold, sinon 100% si solde > 0
  const gaugeMax =
    creditLimit && creditLimit > 0
      ? creditLimit
      : alertThreshold && alertThreshold > 0
        ? alertThreshold
        : null;
  const creditsPct =
    credits != null && gaugeMax != null && gaugeMax > 0
      ? Math.min(100, Math.round((credits / gaugeMax) * 100))
      : credits != null && credits > 0
        ? 100
        : 0;

  const notifications = useMemo(() => {
    const items = recentLogs.map(buildNotification);

    if (credits != null && alertThreshold != null && credits <= alertThreshold) {
      items.unshift({
        id: 'credit-alert',
        title: 'Crédits faibles',
        message: `Solde sous ${alertThreshold.toLocaleString('fr-FR')} FCFA.`,
        time: 'Maintenant',
        href: '/rechargement',
        tone: 'warning',
        icon: 'credits',
      });
    }

    return items.slice(0, 6);
  }, [alertThreshold, credits, recentLogs]);

  const unreadCount = notifications.length;

  const notificationIcon = (icon: HeaderNotification['icon']) => {
    const iconClass = 'h-4 w-4';
    switch (icon) {
      case 'profile':
        return <CircleUserRound className={iconClass} />;
      case 'security':
        return <ShieldCheck className={iconClass} />;
      case 'team':
        return <Users className={iconClass} />;
      case 'credits':
        return <Wallet className={iconClass} />;
      case 'campaign':
        return <FileClock className={iconClass} />;
      default:
        return <FileClock className={iconClass} />;
    }
  };

  const toneClasses: Record<HeaderNotification['tone'], string> = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-sky-100 text-sky-700',
  };

  return (
    <header className="header">
      {/* Hamburger — visible on mobile only via CSS */}
      <button
        type="button"
        className="mobile-menu-btn"
        onClick={toggleMobileSidebar}
        aria-label="Menu"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <rect y="3" width="18" height="2" rx="1" fill="currentColor" />
          <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
          <rect y="13" width="18" height="2" rx="1" fill="currentColor" />
        </svg>
      </button>

      <div className="hdr-title">
        <h1 style={{ textTransform: 'capitalize' }}>{pageTitle}</h1>
        <p style={{ textTransform: 'capitalize' }}>
          {today} · Bonjour, {firstName}
        </p>
      </div>

      {/* Credits pill — visible sur le dashboard principalement */}
      <div className="credits-pill">
        <div className="credits-pill-top">
          <span className="credits-label">Crédits disponibles</span>
          <button className="credits-recharge" onClick={() => navigate('/rechargement')}>
            Recharger ↗
          </button>
        </div>
        <div className="flex items-center gap-8">
          <span className="credits-amount">
            {credits != null ? credits.toLocaleString('fr-FR') : '—'} FCFA
          </span>
          <div style={{ flex: 1 }}>
            <div className="credits-bar">
              <div className="credits-bar-fill" style={{ width: `${creditsPct}%` }} />
            </div>
            <div className="credits-hint">
              {gaugeMax != null
                ? `${creditsPct}% restant · Alerte < ${alertThreshold?.toLocaleString('fr-FR') ?? '—'} FCFA`
                : credits != null && credits > 0
                  ? `${credits.toLocaleString('fr-FR')} FCFA disponible`
                  : 'Aucun crédit'}
            </div>
          </div>
        </div>
      </div>

      <div className="hdr-actions">
        {/* Switcher langue FR / EN */}
        <button
          type="button"
          aria-label={t('lang.switch')}
          title={t('lang.switch')}
          onClick={() => i18n.changeLanguage(i18n.language === 'fr' ? 'en' : 'fr')}
          className="notif-btn text-xs font-bold tracking-wide"
        >
          {i18n.language === 'fr' ? 'EN' : 'FR'}
        </button>

        {/* Notification */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            className="notif-btn"
            aria-label={t('header.notifications')}
            aria-haspopup="dialog"
            aria-expanded={showNotifications}
            onClick={() => {
              setShowNotifications((v) => !v);
              setShowMenu(false);
            }}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && <span className="notif-dot" />}
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setShowNotifications(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label={t('header.notifications')}
                className="absolute right-0 top-full z-20 mt-2 w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[24px] border border-outline-variant/20 bg-white shadow-[0_20px_60px_rgba(12,84,96,0.16)]"
              >
                <div className="flex items-start justify-between gap-3 border-b border-outline-variant/15 px-5 py-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-on-surface-variant">
                      Centre d’alerte
                    </p>
                    <h3 className="mt-1 text-base font-black text-on-surface">Notifications</h3>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-outline-variant/20 px-3 py-1 text-xs font-semibold text-on-surface-variant hover:bg-surface-container"
                    onClick={() => void loadNotifications()}
                  >
                    Actualiser
                  </button>
                </div>

                <div
                  className="max-h-[22rem] overflow-auto p-2"
                  aria-live="polite"
                  aria-atomic="false"
                >
                  {notificationsLoading ? (
                    <div className="rounded-2xl px-4 py-10 text-center text-sm text-on-surface-variant">
                      Chargement…
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="rounded-2xl px-4 py-10 text-center text-sm text-on-surface-variant">
                      Aucune notification récente.
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <button
                        key={notification.id}
                        type="button"
                        className="flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-surface-container"
                        onClick={() => {
                          setShowNotifications(false);
                          navigate(notification.href);
                        }}
                      >
                        <span
                          className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${toneClasses[notification.tone]}`}
                        >
                          {notificationIcon(notification.icon)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-semibold text-on-surface">
                              {notification.title}
                            </p>
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-surface-variant">
                              {notification.time}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs leading-5 text-on-surface-variant">
                            {notification.message}
                          </p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-outline-variant/15 bg-surface-container/40 px-4 py-3">
                  <button
                    type="button"
                    className="rounded-2xl border border-outline-variant/20 px-3 py-2 text-xs font-bold text-on-surface transition hover:bg-surface-container"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/account/audit-logs');
                    }}
                  >
                    Voir le journal
                  </button>
                  <button
                    type="button"
                    className="rounded-2xl bg-secondary px-3 py-2 text-xs font-bold text-white transition hover:bg-secondary/90"
                    onClick={() => {
                      setShowNotifications(false);
                      navigate('/account/settings');
                    }}
                  >
                    Réglages
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Nouvelle campagne */}
        <button
          type="button"
          className="btn-primary new-campaign-btn"
          onClick={async () => {
            await createNewCampaign();
            navigate('/campaigns/new?fresh=1');
          }}
        >
          <span className="long-label">+ Nouvelle campagne</span>
          <span className="short-label">+</span>
        </button>

        {/* Avatar + menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            className="avatar focus:outline-none"
            aria-label={user?.name || user?.email || 'Menu utilisateur'}
            aria-haspopup="dialog"
            aria-expanded={showMenu}
            onClick={() => {
              setShowMenu((v) => !v);
              setShowNotifications(false);
            }}
          >
            {initials}
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden="true"
                onClick={() => setShowMenu(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Menu utilisateur"
                className="absolute right-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[24px] border border-outline-variant/20 bg-white shadow-[0_20px_60px_rgba(12,84,96,0.16)]"
              >
                <div className="border-b border-outline-variant/15 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="avatar h-12 w-12 shrink-0 text-sm">{initials}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-on-surface">
                        {user?.name || user?.email}
                      </p>
                      {user?.email && user.name && (
                        <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                      )}
                      {roleLabel && (
                        <span
                          className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${roleClass}`}
                        >
                          {roleLabel}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mt-4 flex w-full items-center justify-between rounded-2xl bg-surface-container px-4 py-3 text-left transition hover:bg-surface-container-high"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/account/profile');
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CircleUserRound className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-on-surface">Profil</p>
                        <p className="text-xs text-on-surface-variant">Modifier vos informations</p>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 -rotate-90 text-on-surface-variant" />
                  </button>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-on-surface transition hover:bg-surface-container"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/account/settings');
                    }}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
                      <Settings2 className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-on-surface">Paramètres</p>
                      <p className="text-xs text-on-surface-variant">
                        Préférences et notifications
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-on-surface transition hover:bg-surface-container"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/account/security');
                    }}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
                      <ShieldCheck className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-on-surface">Sécurité</p>
                      <p className="text-xs text-on-surface-variant">2FA et protection du compte</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-on-surface transition hover:bg-surface-container"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/account/team');
                    }}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-on-surface">Équipe</p>
                      <p className="text-xs text-on-surface-variant">Gestion des accès</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm text-on-surface transition hover:bg-surface-container"
                    onClick={() => {
                      setShowMenu(false);
                      navigate('/account/audit-logs');
                    }}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-surface-container text-on-surface-variant">
                      <FileClock className="h-4 w-4" />
                    </span>
                    <div className="text-left">
                      <p className="font-semibold text-on-surface">Journal d’audit</p>
                      <p className="text-xs text-on-surface-variant">Historique des actions</p>
                    </div>
                  </button>
                </div>

                <div className="border-t border-outline-variant/15 p-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Se déconnecter
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
