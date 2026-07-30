import { useEffect, useState } from 'react';
import { useAppMetrics } from '@/hooks/useAppMetrics';
import { useCampaignStore } from '@/store/campaign.store';
import { Link, useNavigate } from 'react-router-dom';
import { useCampaignActions } from '@/hooks/useCampaign';
import api from '@/api/axios';
import { useUiStore } from '@/stores/uiStore';

// ─── Types ────────────────────────────────────────────────────────────────
interface OverviewData {
  messagesSent: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  top5: {
    id: string;
    name: string;
    sentCount: number;
    openedCount: number;
    clickedCount: number;
  }[];
  byChannel: { channel: string; count: number }[];
  evolution: { date: string; sent: number; opened: number }[];
  heatmap: { hour: number; openCount: number; clickCount: number }[];
  previous: { messagesSent: number; openRate: number; clickRate: number };
}

interface AutomationItem {
  id: string;
  name: string;
  status: string;
  sendCount?: number;
}

interface AuditLogItem {
  id: string;
  action: string;
  createdAt: string;
}

// ─── SVG Line Chart ───────────────────────────────────────────────────────
function EvolutionChart({
  data,
  period,
}: {
  data: { date?: string; sent: number; opened: number }[];
  period: number;
}) {
  if (!data.length)
    return (
      <div
        style={{
          height: 160,
          background: 'var(--muted)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Aucune donnée sur la période</span>
      </div>
    );
  const maxSent = Math.max(...data.map((d) => d.sent), 1);
  const maxOpen = Math.max(...data.map((d) => d.opened), 1);
  const W = 400;
  const H = 130;
  const step = Math.ceil(data.length / 6);
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  const sentPts = data
    .map((d, i) => `${(i / Math.max(data.length - 1, 1)) * W},${H - (d.sent / maxSent) * H * 0.88}`)
    .join(' ');
  const openPts = data
    .map(
      (d, i) => `${(i / Math.max(data.length - 1, 1)) * W},${H - (d.opened / maxOpen) * H * 0.88}`,
    )
    .join(' ');

  return (
    <div
      style={{
        height: 160,
        background: 'var(--muted)',
        borderRadius: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <svg
        style={{
          position: 'absolute',
          inset: '8px 12px 28px',
          width: 'calc(100% - 24px)',
          height: 'calc(100% - 36px)',
          overflow: 'visible',
        }}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sentFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EC80A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2EC80A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${sentPts} ${W},${H}`} fill="url(#sentFill)" />
        <polyline
          points={sentPts}
          fill="none"
          stroke="#2EC80A"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <polyline
          points={openPts}
          fill="none"
          stroke="#0C5460"
          strokeWidth="1.5"
          strokeDasharray="6,3"
          strokeLinejoin="round"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          bottom: 5,
          left: 12,
          right: 12,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        {xLabels.map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text-3)' }}>
            {new Date(d.date ?? '').toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: period > 7 ? '2-digit' : undefined,
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Canal ──────────────────────────────────────────────────────────
const CHANNEL_COLORS: Record<string, string> = {
  SMS: '#2ec80a',
  Email: '#0c5460',
  WhatsApp: '#aaee22',
  Push: '#d97706',
};

function DonutChart({
  byChannel,
  total,
}: {
  byChannel: { channel: string; count: number }[];
  total: number;
}) {
  if (!byChannel.length || total === 0)
    return (
      <div
        style={{
          width: 90,
          height: 90,
          borderRadius: '50%',
          background: 'var(--border)',
          margin: '0 auto',
        }}
      />
    );
  const parts = byChannel
    .reduce<{ cursor: number; segments: string[] }>(
      (acc, { channel, count }) => {
        const pct = count / total;
        acc.segments.push(
          `${CHANNEL_COLORS[channel] || '#9ca3af'} ${Math.round(acc.cursor * 100)}% ${Math.round((acc.cursor + pct) * 100)}%`,
        );
        return { cursor: acc.cursor + pct, segments: acc.segments };
      },
      { cursor: 0, segments: [] },
    )
    .segments.join(', ');
  return (
    <div
      style={{
        width: 90,
        height: 90,
        borderRadius: '50%',
        background: `conic-gradient(${parts})`,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
      }}
    >
      <div style={{ width: 56, height: 56, background: 'white', borderRadius: '50%' }} />
    </div>
  );
}

// ─── Heatmap 7×24 ────────────────────────────────────────────────────────
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
const HEAT_COLORS = ['#f0f7f0', '#c8f0b0', '#8ee060', '#52cc22', '#2ec80a'];
function heatColor(v: number, max: number) {
  if (max === 0) return HEAT_COLORS[0];
  return HEAT_COLORS[Math.min(4, Math.floor((v / max) * 5))];
}

export default function Dashboard() {
  const navigate = useNavigate();
  const activeDashboard = useUiStore((state) => state.activeDashboard);
  const { contactsTotal } = useAppMetrics();
  const { campaigns, fetchCampaigns, isLoading: campaignsLoading } = useCampaignStore();
  const { createNewCampaign } = useCampaignActions();

  const [period, setPeriod] = useState<7 | 30 | 90>(7);
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [automations, setAutomations] = useState<AutomationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [contactsAddedToday, setContactsAddedToday] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditThreshold, setCreditThreshold] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);

  useEffect(() => {
    void fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    setLoadingOverview(true);
    api
      .get<OverviewData>(`/analytics/overview?period=${period}`)
      .then((r) => setOverview(r.data))
      .catch(() => setOverview(null))
      .finally(() => setLoadingOverview(false));
  }, [period]);

  useEffect(() => {
    const loadOperationalData = async () => {
      try {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(start);
        end.setDate(end.getDate() + 1);

        const [automationsRes, auditRes, contactsRes, balanceRes] = await Promise.all([
          api.get<{ data: AutomationItem[] }>('/automations'),
          api.get<{ data: AuditLogItem[] }>('/audit-logs?limit=5'),
          api.get<{ total: number }>(
            `/contacts?limit=1&dateAddedFrom=${encodeURIComponent(start.toISOString())}&dateAddedTo=${encodeURIComponent(end.toISOString())}`,
          ),
          api.get<{ balance: number; alertThreshold: number | null; creditLimit: number | null }>(
            '/account/balance',
          ),
        ]);

        setAutomations(Array.isArray(automationsRes.data?.data) ? automationsRes.data.data : []);
        setAuditLogs(Array.isArray(auditRes.data?.data) ? auditRes.data.data : []);
        setContactsAddedToday(Number(contactsRes.data?.total || 0));
        setCreditBalance(
          typeof balanceRes.data?.balance === 'number' ? balanceRes.data.balance : null,
        );
        setCreditThreshold(
          typeof balanceRes.data?.alertThreshold === 'number'
            ? balanceRes.data.alertThreshold
            : null,
        );
        setCreditLimit(
          typeof balanceRes.data?.creditLimit === 'number' ? balanceRes.data.creditLimit : null,
        );
      } catch {
        setAutomations([]);
        setAuditLogs([]);
        setContactsAddedToday(0);
        setCreditBalance(null);
        setCreditThreshold(null);
        setCreditLimit(null);
      }
    };

    void loadOperationalData();

    const refreshBalance = () => {
      api
        .get<{ balance: number; alertThreshold: number | null; creditLimit: number | null }>(
          '/account/balance',
        )
        .then((r) => {
          if (typeof r.data?.balance === 'number') setCreditBalance(r.data.balance);
          if (typeof r.data?.alertThreshold === 'number') setCreditThreshold(r.data.alertThreshold);
          if (typeof r.data?.creditLimit === 'number') setCreditLimit(r.data.creditLimit);
        })
        .catch(() => {});
    };

    window.addEventListener('novasms:balance-refresh', refreshBalance);
    return () => window.removeEventListener('novasms:balance-refresh', refreshBalance);
  }, []);

  const totalSent = overview?.messagesSent ?? 0;
  const byChannel = overview?.byChannel ?? [];
  const top5 = overview?.top5 ?? [];
  const evolution = overview?.evolution ?? [];
  const heatmap = overview?.heatmap ?? [];
  const prev = overview?.previous;

  const deltaSent =
    prev && prev.messagesSent > 0
      ? ((totalSent - prev.messagesSent) / prev.messagesSent) * 100
      : null;
  const deltaOpen = prev != null && overview ? overview.openRate - prev.openRate : null;
  const deltaClick = prev != null && overview ? overview.clickRate - prev.clickRate : null;

  const heatMax = Math.max(...heatmap.map((h) => h.openCount), 1);

  const onboardingSteps = [
    { label: 'Profil complété', done: true },
    { label: 'Importer des contacts', done: contactsTotal > 0 },
    { label: 'Créer une campagne', done: campaigns.length > 0 },
    { label: 'Lancer votre 1ère campagne', done: campaigns.some((c) => c.status === 'sent') },
  ];
  const stepsCompleted = onboardingSteps.filter((s) => s.done).length;
  const allDone = stepsCompleted === onboardingSteps.length;

  const recentCampaigns = [...campaigns]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const activeAutomations = automations.filter((item) => item.status === 'Active');
  const automationSendCount = activeAutomations.reduce(
    (acc, item) => acc + Number(item.sendCount || 0),
    0,
  );
  const gaugeMax =
    creditLimit && creditLimit > 0
      ? creditLimit
      : creditThreshold && creditThreshold > 0
        ? creditThreshold * 3
        : null;
  const creditProgress =
    creditBalance != null && gaugeMax != null ? Math.min((creditBalance / gaugeMax) * 100, 100) : 0;

  if (activeDashboard === 2) {
    return (
      <div className="content">
        <div style={{ display: 'grid', gap: 12 }}>
          <div
            id="tour-kpi-grid-alt"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}
          >
            <div className="card">
              <div className="card-title mb-8">Campagnes récentes</div>
              <div className="kpi-value">{recentCampaigns.length}</div>
              <div className="text-xs text-muted">5 dernières campagnes</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">Automations actives</div>
              <div className="kpi-value">{activeAutomations.length}</div>
              <div className="text-xs text-muted">
                {automationSendCount.toLocaleString('fr-FR')} envois automatiques
              </div>
            </div>
            <div className="card">
              <div className="card-title mb-8">Contacts ajoutés aujourd'hui</div>
              <div className="kpi-value">{contactsAddedToday.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-muted">Nouveaux contacts du jour</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">Logs récents</div>
              <div className="kpi-value">{auditLogs.length}</div>
              <div className="text-xs text-muted">5 derniers événements</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">Solde crédits</div>
              <div className="kpi-value">
                {creditBalance == null ? '—' : creditBalance.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-muted">
                Seuil: {creditThreshold == null ? '—' : creditThreshold.toLocaleString('fr-FR')}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <div className="flex items-center justify-between">
              <div className="card-title">Crédits disponibles</div>
              <Link
                to="/rechargement"
                style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700 }}
              >
                Recharger
              </Link>
            </div>
            <div className="flex items-center gap-8">
              <span style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                {creditBalance == null ? '—' : creditBalance.toLocaleString('fr-FR')} FCFA
              </span>
              {gaugeMax != null && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  / {gaugeMax.toLocaleString('fr-FR')}
                </span>
              )}
            </div>
            <div
              style={{ width: '100%', height: 8, borderRadius: 999, background: 'var(--border)' }}
            >
              <div
                style={{
                  width: `${creditProgress}%`,
                  height: '100%',
                  borderRadius: 999,
                  background:
                    creditProgress < 20
                      ? 'var(--color-error, #ef4444)'
                      : creditProgress < 50
                        ? '#f59e0b'
                        : 'var(--brand-gradient)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            {creditThreshold != null && (
              <div className="text-xs text-muted">
                Alerte sous {creditThreshold.toLocaleString('fr-FR')} FCFA
              </div>
            )}
          </div>

          <div
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}
          >
            <div className="card">
              <div className="flex items-center justify-between mb-12">
                <div className="card-title">Dernières campagnes</div>
                <Link
                  to="/campaigns"
                  style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700 }}
                >
                  Toutes
                </Link>
              </div>
              {recentCampaigns.length === 0 ? (
                <div className="text-sm text-muted">Aucune campagne pour le moment.</div>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentCampaigns.map((campaign) => (
                    <button
                      key={campaign.id}
                      type="button"
                      onClick={() => navigate(`/campaigns/${campaign.id}`)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(0,1fr) auto',
                        gap: 12,
                        alignItems: 'center',
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 14,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>
                          {campaign.name}
                        </div>
                        <div className="text-xs text-muted">
                          {campaign.channel} • {campaign.status}
                        </div>
                      </div>
                      <div className="text-xs text-muted">
                        {Number(campaign.estimatedRecipients || 0).toLocaleString('fr-FR')} contacts
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card" style={{ display: 'grid', gap: 12 }}>
              <div className="card-title">Derniers événements d'audit</div>
              {auditLogs.length === 0 ? (
                <div className="text-sm text-muted">Aucun événement journalisé.</div>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between text-sm"
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>{log.action}</span>
                      <span className="text-muted">
                        {new Date(log.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Onboarding */}
      {!allDone && (
        <div className="card" style={{ padding: '12px 16px' }}>
          <div className="flex items-center justify-between mb-8">
            <span className="card-title">
              Démarrage rapide — {onboardingSteps.length - stepsCompleted} étape
              {onboardingSteps.length - stepsCompleted > 1 ? 's' : ''} restante
              {onboardingSteps.length - stepsCompleted > 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex gap-16 items-center">
            {onboardingSteps.map((step, i) => (
              <div
                key={i}
                className="flex items-center gap-8 text-sm"
                style={{ color: step.done ? 'var(--success)' : 'var(--text-2)' }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: step.done ? 'var(--brand-light)' : 'transparent',
                    border: step.done ? 'none' : '0.5px solid var(--border-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {step.done ? (
                    <svg width="9" height="9" viewBox="0 0 9 9">
                      <polyline
                        points="1.5,4.5 3.5,6.5 7.5,2.5"
                        fill="none"
                        stroke="#16A34A"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                {step.label}
              </div>
            ))}
            <div className="flex items-center gap-8" style={{ marginLeft: 'auto' }}>
              <div
                style={{
                  width: 70,
                  height: 3,
                  background: 'var(--border-md)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(stepsCompleted / onboardingSteps.length) * 100}%`,
                    height: '100%',
                    background: 'var(--brand-gradient)',
                  }}
                />
              </div>
              <span className="text-xs text-muted">
                {stepsCompleted}/{onboardingSteps.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div id="tour-kpi-grid" className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Messages envoyés</div>
          <div className="kpi-value">
            {loadingOverview ? '—' : totalSent.toLocaleString('fr-FR')}
          </div>
          <div className={`kpi-delta ${deltaSent != null && deltaSent >= 0 ? 'up' : 'down'}`}>
            {deltaSent != null
              ? `${deltaSent >= 0 ? '↑ +' : '↓ '}${deltaSent.toFixed(1)}% vs période préc.`
              : 'Aucune donnée préc.'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Taux d'ouverture</div>
          <div className="kpi-value">{overview ? `${overview.openRate.toFixed(1)}%` : '—'}</div>
          <div className={`kpi-delta ${deltaOpen != null && deltaOpen >= 0 ? 'up' : 'down'}`}>
            {deltaOpen != null
              ? `${deltaOpen >= 0 ? '↑ +' : '↓ '}${Math.abs(deltaOpen).toFixed(1)} pt vs période préc.`
              : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Taux de clic</div>
          <div className="kpi-value">{overview ? `${overview.clickRate.toFixed(1)}%` : '—'}</div>
          <div className={`kpi-delta ${deltaClick != null && deltaClick >= 0 ? 'up' : 'down'}`}>
            {deltaClick != null
              ? `${deltaClick >= 0 ? '↑ +' : '↓ '}${Math.abs(deltaClick).toFixed(1)} pt vs période préc.`
              : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">Désabonnements</div>
          <div className="kpi-value">
            {overview ? `${overview.unsubscribeRate.toFixed(2)}%` : '—'}
          </div>
          <div className="kpi-delta" style={{ color: 'var(--text-3)' }}>
            Période courante
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div
        className="charts-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.65fr) minmax(0,1fr)',
          gap: 12,
          flex: 1,
        }}
      >
        {/* Évolution */}
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="card-title">Évolution des performances</div>
              <div className="flex gap-12" style={{ marginTop: 5 }}>
                <div className="flex items-center gap-8 text-xs text-muted">
                  <span
                    style={{
                      width: 18,
                      height: 2,
                      background: 'var(--brand-primary)',
                      display: 'inline-block',
                      borderRadius: 1,
                    }}
                  />
                  Envois
                </div>
                <div className="flex items-center gap-8 text-xs text-muted">
                  <span
                    style={{
                      width: 18,
                      borderTop: '2px dashed var(--brand-teal)',
                      display: 'inline-block',
                    }}
                  />
                  Ouverture %
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              {([7, 30, 90] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className="btn-sm"
                  style={
                    period === p
                      ? {
                          background: 'var(--muted)',
                          borderColor: 'var(--border-md)',
                          color: 'var(--brand-teal)',
                          fontWeight: 600,
                        }
                      : {}
                  }
                >
                  {p}j
                </button>
              ))}
            </div>
          </div>
          <EvolutionChart data={evolution} period={period} />
        </div>

        {/* Donut canal */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-title mb-12">Répartition par canal</div>
          <div style={{ marginBottom: 14 }}>
            <DonutChart byChannel={byChannel} total={totalSent} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {byChannel.length === 0 ? (
              <span className="text-xs text-muted" style={{ textAlign: 'center' }}>
                Aucun envoi
              </span>
            ) : (
              byChannel.map(({ channel, count }) => (
                <div key={channel} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-8 text-muted">
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: CHANNEL_COLORS[channel] || '#9ca3af',
                        display: 'inline-block',
                      }}
                    />
                    {channel}
                  </span>
                  <div>
                    <strong>
                      {totalSent > 0 ? `${Math.round((count / totalSent) * 100)}%` : '0%'}
                    </strong>
                    <span className="text-xs text-muted" style={{ marginLeft: 4 }}>
                      {count.toLocaleString('fr-FR')}
                    </span>
                  </div>
                </div>
              ))
            )}
            <div className="divider" />
            <div className="flex items-center justify-between text-sm font-medium">
              <span className="text-muted">Total</span>
              <span>{totalSent.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 campagnes */}
      <div className="card">
        <div className="flex items-center justify-between mb-12">
          <div className="card-title">Top 5 campagnes — {period} derniers jours</div>
          <Link
            to="/campaigns"
            style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 600 }}
          >
            Voir tout →
          </Link>
        </div>
        {campaignsLoading ? (
          <div
            style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-2)', fontSize: 12 }}
          >
            Chargement…
          </div>
        ) : top5.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '20px 0', color: 'var(--text-2)', fontSize: 12 }}
          >
            Aucune campagne.{' '}
            <button
              onClick={async () => {
                await createNewCampaign();
                navigate('/campaigns/new?fresh=1');
              }}
              style={{
                color: 'var(--brand-primary)',
                background: 'none',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Créer maintenant →
            </button>
          </div>
        ) : (
          <div className="data-table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Envois</th>
                  <th>Ouvertures</th>
                  <th>Clics</th>
                  <th>Taux clic</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((c) => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                  >
                    <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</td>
                    <td>{c.sentCount.toLocaleString('fr-FR')}</td>
                    <td>{c.openedCount.toLocaleString('fr-FR')}</td>
                    <td>{c.clickedCount.toLocaleString('fr-FR')}</td>
                    <td style={{ color: '#16A34A', fontWeight: 600 }}>
                      {c.sentCount > 0
                        ? `${((c.clickedCount / c.sentCount) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                    <td>
                      <span className="tag green">Actif</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heatmap engagement 7×24 */}
      <div className="card">
        <div className="card-title mb-12">
          Carte de chaleur d'engagement — {period} derniers jours
        </div>
        <div className="heatmap-wrapper">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '28px repeat(24, 1fr)',
              gap: 2,
              alignItems: 'center',
            }}
          >
            <div />
            {Array.from({ length: 24 }, (_, h) => (
              <div key={h} style={{ fontSize: 8, color: 'var(--text-3)', textAlign: 'center' }}>
                {h}h
              </div>
            ))}
            {DAYS_FR.map((day, di) => (
              <>
                <div key={`d${di}`} style={{ fontSize: 9, color: 'var(--text-2)' }}>
                  {day}
                </div>
                {Array.from({ length: 24 }, (_, h) => {
                  const row = heatmap.find((r) => r.hour === h);
                  const v = row ? Math.round(row.openCount * (0.7 + di * 0.05)) : 0;
                  return (
                    <div
                      key={`${di}-${h}`}
                      className="hm-cell"
                      style={{ background: heatColor(v, heatMax) }}
                    />
                  );
                })}
              </>
            ))}
          </div>
        </div>
        <div
          className="flex items-center gap-8"
          style={{ marginTop: 10, justifyContent: 'flex-end' }}
        >
          <span className="text-xs text-muted">Faible</span>
          {HEAT_COLORS.map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: 2, background: c }} />
          ))}
          <span className="text-xs text-muted">Élevé</span>
        </div>
      </div>
    </div>
  );
}
