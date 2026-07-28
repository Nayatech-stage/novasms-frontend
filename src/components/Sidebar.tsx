import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAppMetrics } from '@/hooks/useAppMetrics';
import { useUiStore } from '@/stores/uiStore';

function DashboardIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="5" height="5" rx="1" />
      <rect x="8" y="1" width="5" height="5" rx="1" />
      <rect x="1" y="8" width="5" height="5" rx="1" />
      <rect x="8" y="8" width="5" height="5" rx="1" />
    </svg>
  );
}

function ContactsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="4.5" r="2.5" />
      <path d="M1.5 12.5c0-3 2.5-5 5.5-5s5.5 2 5.5 5" />
    </svg>
  );
}

function CampaignsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="12" height="9" rx="1" />
      <polyline points="1,4 7,9 13,4" />
    </svg>
  );
}

function AutomationsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="8,1 4,8 7,8 6,13 11,6 7,6" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <rect x="1" y="7" width="3" height="6" />
      <rect x="5.5" y="4" width="3" height="9" />
      <rect x="10" y="1" width="3" height="12" />
    </svg>
  );
}

function TeamIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="4" r="2.5" />
      <path d="M1 12c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <line x1="10.5" y1="4.5" x2="10.5" y2="8.5" />
      <line x1="8.5" y1="6.5" x2="12.5" y2="6.5" />
    </svg>
  );
}

function CreditsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="1" y="3" width="12" height="9" rx="2" />
      <line x1="1" y1="6.5" x2="13" y2="6.5" />
      <line x1="4" y1="9.5" x2="6" y2="9.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="2.5" />
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13" />
    </svg>
  );
}

function SecurityIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="4" r="2.5" />
      <path d="M1 12c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
      <path d="M10.5 4.5h2M11.5 3.5v2" />
    </svg>
  );
}

function ApiKeyIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="5" cy="8" r="2.5" />
      <path d="M7.5 6.5l5-5" />
      <path d="M10.5 1.5l1 1" />
      <path d="M12 3.5l1 1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 1.5h-2A1.5 1.5 0 0 0 1.5 3v8A1.5 1.5 0 0 0 3 12.5h2" />
      <path d="M8 4l3 3-3 3" />
      <path d="M11 7H4" />
    </svg>
  );
}

function Item({
  to,
  icon,
  label,
  badge,
  collapsed,
  id,
  onNavigate,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  collapsed: boolean;
  id?: string;
  onNavigate?: () => void;
}) {
  return (
    <NavLink
      to={to}
      id={id}
      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      onClick={onNavigate}
    >
      <span className="nav-icon" aria-hidden="true">
        {icon}
      </span>
      {!collapsed && <span className="nav-text">{label}</span>}
      {!collapsed && badge && <span className="nav-badge">{badge}</span>}
    </NavLink>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = useAuthStore((state) => state.logout);
  const userRole = (useAuthStore((state) => state.user?.role) ?? 'Admin') as
    | 'Admin'
    | 'Editor'
    | 'Analyst';
  const isAdmin = userRole === 'Admin';
  const isAdminOrEditor = userRole === 'Admin' || userRole === 'Editor';
  const { contactsTotal, credits, alertThreshold, creditLimit, loading, refresh } = useAppMetrics();
  const { activeDashboard, toggleDashboard, mobileSidebarOpen, setMobileSidebarOpen } =
    useUiStore();

  const closeMobile = () => setMobileSidebarOpen(false);
  const dashboardClickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDashboardClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (location.pathname === '/dashboard') {
      return;
    }

    if (dashboardClickTimer.current) {
      clearTimeout(dashboardClickTimer.current);
    }

    dashboardClickTimer.current = setTimeout(() => {
      dashboardClickTimer.current = null;
      navigate('/dashboard');
    }, 180);
  };

  const handleDashboardDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (dashboardClickTimer.current) {
      clearTimeout(dashboardClickTimer.current);
      dashboardClickTimer.current = null;
    }
    toggleDashboard();
    navigate('/dashboard');
  };

  useEffect(() => {
    return () => {
      if (dashboardClickTimer.current) {
        clearTimeout(dashboardClickTimer.current);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'mobile-open' : ''}`}
    >
      <div className="sb-logo">
        <div className="sb-logomark">N</div>
        {!collapsed && (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>NovaSMS</span>
        )}
        <button
          type="button"
          className="sb-collapse"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={collapsed ? 'Ouvrir la navigation' : 'Réduire la navigation'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      <div className="sb-nav">
        {!collapsed && (
          <div id="tour-sidebar-credits" className="sidebar-credits">
            <div className="credits-pill-top">
              <span className="credits-label">Crédits disponibles</span>
              <button className="credits-recharge" onClick={() => void refresh()}>
                Recharger ↗
              </button>
            </div>
            {(() => {
              const gaugeMax =
                creditLimit && creditLimit > 0
                  ? creditLimit
                  : alertThreshold && alertThreshold > 0
                    ? alertThreshold
                    : null;
              const pct =
                credits != null && gaugeMax != null && gaugeMax > 0
                  ? Math.min(100, Math.round((credits / gaugeMax) * 100))
                  : credits != null && credits > 0
                    ? 100
                    : 0;
              const barColor =
                pct < 20
                  ? 'var(--color-error, #ef4444)'
                  : pct < 50
                    ? '#f59e0b'
                    : 'var(--brand-gradient)';
              const hint = loading
                ? 'Chargement…'
                : gaugeMax != null
                  ? `${pct}% · Alerte < ${alertThreshold ? alertThreshold.toLocaleString('fr-FR') : '—'} FCFA`
                  : credits != null && credits > 0
                    ? `${credits.toLocaleString('fr-FR')} FCFA disponible`
                    : 'Aucun crédit';
              return (
                <div className="flex items-center gap-3">
                  <span className="credits-amount">
                    {credits == null ? '--' : credits.toLocaleString('fr-FR')}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="credits-bar">
                      <div
                        className="credits-bar-fill"
                        style={{
                          width: `${pct}%`,
                          background: barColor,
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                    <div className="credits-hint">{hint}</div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {!collapsed && <div className="sb-section-label">Principal</div>}
        <a
          href="/dashboard"
          onClick={(e) => {
            closeMobile();
            handleDashboardClick(e);
          }}
          onDoubleClick={handleDashboardDoubleClick}
          className={`nav-item ${location.pathname === '/dashboard' ? 'active' : ''}`}
          title={`Double-clic pour basculer vers le tableau ${activeDashboard === 1 ? 'opérationnel' : 'analytique'}`}
        >
          <span className="nav-icon">
            <DashboardIcon />
          </span>
          {!collapsed && <span className="nav-text">Tableau de bord</span>}
        </a>
        {isAdminOrEditor && (
          <Item
            to="/contacts"
            id="tour-nav-contacts"
            icon={<ContactsIcon />}
            label="Contacts"
            badge={contactsTotal > 0 ? contactsTotal.toLocaleString('fr-FR') : undefined}
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        {isAdminOrEditor && (
          <Item
            to="/campaigns"
            id="tour-nav-campaigns"
            icon={<CampaignsIcon />}
            label="Campagnes"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        {isAdminOrEditor && (
          <Item
            to="/automations"
            id="tour-nav-automations"
            icon={<AutomationsIcon />}
            label="Automatisations"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        <Item
          to="/analytics"
          id="tour-nav-analytics"
          icon={<AnalyticsIcon />}
          label="Analytics"
          collapsed={collapsed}
          onNavigate={closeMobile}
        />

        <div className="sb-divider" />
        {!collapsed && <div className="sb-section-label">Compte</div>}
        {isAdmin && (
          <Item
            to="/rechargement"
            id="tour-nav-rechargement"
            icon={<CreditsIcon />}
            label="Crédits"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        <Item
          to="/account/security"
          icon={<SecurityIcon />}
          label="Sécurité"
          collapsed={collapsed}
          onNavigate={closeMobile}
        />
        {isAdmin && (
          <Item
            to="/account/team"
            icon={<TeamIcon />}
            label="Équipe"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        {isAdmin && (
          <Item
            to="/account/developers"
            icon={<ApiKeyIcon />}
            label="Clés API"
            collapsed={collapsed}
            onNavigate={closeMobile}
          />
        )}
        <Item
          to="/account/settings"
          icon={<SettingsIcon />}
          label="Paramètres"
          collapsed={collapsed}
          onNavigate={closeMobile}
        />
      </div>
      <div className="sb-footer">
        <button type="button" className="nav-item logout-item" onClick={handleLogout}>
          <span className="nav-icon" aria-hidden="true">
            <LogoutIcon />
          </span>
          {!collapsed && <span className="nav-text">Déconnexion</span>}
        </button>
      </div>
    </aside>
  );
}
