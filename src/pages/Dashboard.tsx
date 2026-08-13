import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function Dashboard() {
  const { t } = useTranslation();
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
  const evolution = overview?.evolution ?? [];
  const prev = overview?.previous;

  const deltaSent =
    prev && prev.messagesSent > 0
      ? ((totalSent - prev.messagesSent) / prev.messagesSent) * 100
      : null;
  const deltaOpen = prev != null && overview ? overview.openRate - prev.openRate : null;
  const deltaClick = prev != null && overview ? overview.clickRate - prev.clickRate : null;

  const onboardingSteps = [
    { label: t('dashboard.stepProfileDone'), done: true },
    { label: t('dashboard.stepImportContacts'), done: contactsTotal > 0 },
    { label: t('dashboard.stepCreateCampaign'), done: campaigns.length > 0 },
    { label: t('dashboard.stepLaunchCampaign'), done: campaigns.some((c) => c.status === 'sent') },
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
              <div className="card-title mb-8">{t('dashboard.recentCampaigns')}</div>
              <div className="kpi-value">{recentCampaigns.length}</div>
              <div className="text-xs text-muted">{t('dashboard.last5Campaigns')}</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">{t('dashboard.activeAutomations')}</div>
              <div className="kpi-value">{activeAutomations.length}</div>
              <div className="text-xs text-muted">
                {t('dashboard.automaticSends', {
                  count: automationSendCount.toLocaleString('fr-FR'),
                })}
              </div>
            </div>
            <div className="card">
              <div className="card-title mb-8">{t('dashboard.contactsToday')}</div>
              <div className="kpi-value">{contactsAddedToday.toLocaleString('fr-FR')}</div>
              <div className="text-xs text-muted">{t('dashboard.contactsTodayLabel')}</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">{t('dashboard.recentLogs')}</div>
              <div className="kpi-value">{auditLogs.length}</div>
              <div className="text-xs text-muted">{t('dashboard.lastEvents')}</div>
            </div>
            <div className="card">
              <div className="card-title mb-8">{t('dashboard.creditsBalance')}</div>
              <div className="kpi-value">
                {creditBalance == null ? '—' : creditBalance.toLocaleString('fr-FR')}
              </div>
              <div className="text-xs text-muted">
                {t('dashboard.threshold', {
                  amount: creditThreshold == null ? '—' : creditThreshold.toLocaleString('fr-FR'),
                })}
              </div>
            </div>
          </div>

          <div className="card" style={{ display: 'grid', gap: 10 }}>
            <div className="flex items-center justify-between">
              <div className="card-title">{t('dashboard.creditsAvailable')}</div>
              <Link
                to="/rechargement"
                style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700 }}
              >
                {t('nav.recharge')}
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
                {t('dashboard.alertBelow', { amount: creditThreshold.toLocaleString('fr-FR') })}
              </div>
            )}
          </div>

          <div
            className="charts-row"
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 12 }}
          >
            <div className="card">
              <div className="flex items-center justify-between mb-12">
                <div className="card-title">{t('dashboard.lastCampaigns')}</div>
                <Link
                  to="/campaigns"
                  style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 700 }}
                >
                  {t('campaigns.viewAll')}
                </Link>
              </div>
              {recentCampaigns.length === 0 ? (
                <div className="text-sm text-muted">{t('campaigns.noData')}</div>
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
              <div className="card-title">{t('dashboard.lastAuditEvents')}</div>
              {auditLogs.length === 0 ? (
                <div className="text-sm text-muted">{t('dashboard.noAuditEvents')}</div>
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
              {t('dashboard.quickStart')} —{' '}
              {t('dashboard.stepsRemaining', { count: onboardingSteps.length - stepsCompleted })}
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
          <div className="kpi-label">{t('dashboard.kpiMessagesSent')}</div>
          <div className="kpi-value">
            {loadingOverview ? '—' : totalSent.toLocaleString('fr-FR')}
          </div>
          <div className={`kpi-delta ${deltaSent != null && deltaSent >= 0 ? 'up' : 'down'}`}>
            {deltaSent != null
              ? `${deltaSent >= 0 ? '↑ +' : '↓ '}${deltaSent.toFixed(1)}% ${t('dashboard.vsLastPeriod')}`
              : t('dashboard.noPrevData')}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('dashboard.kpiOpenRate')}</div>
          <div className="kpi-value">{overview ? `${overview.openRate.toFixed(1)}%` : '—'}</div>
          <div className={`kpi-delta ${deltaOpen != null && deltaOpen >= 0 ? 'up' : 'down'}`}>
            {deltaOpen != null
              ? `${deltaOpen >= 0 ? '↑ +' : '↓ '}${Math.abs(deltaOpen).toFixed(1)} pt ${t('dashboard.vsLastPeriod')}`
              : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('dashboard.kpiClickRate')}</div>
          <div className="kpi-value">{overview ? `${overview.clickRate.toFixed(1)}%` : '—'}</div>
          <div className={`kpi-delta ${deltaClick != null && deltaClick >= 0 ? 'up' : 'down'}`}>
            {deltaClick != null
              ? `${deltaClick >= 0 ? '↑ +' : '↓ '}${Math.abs(deltaClick).toFixed(1)} pt ${t('dashboard.vsLastPeriod')}`
              : ''}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-label">{t('dashboard.kpiUnsub')}</div>
          <div className="kpi-value">
            {overview ? `${overview.unsubscribeRate.toFixed(2)}%` : '—'}
          </div>
          <div className="kpi-delta" style={{ color: 'var(--text-3)' }}>
            {t('dashboard.kpiCurrentPeriod')}
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
              <div className="card-title">{t('dashboard.evolutionTitle')}</div>
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
                  {t('dashboard.legendSent')}
                </div>
                <div className="flex items-center gap-8 text-xs text-muted">
                  <span
                    style={{
                      width: 18,
                      borderTop: '2px dashed var(--brand-teal)',
                      display: 'inline-block',
                    }}
                  />
                  {t('dashboard.legendOpen')}
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
          <div className="card-title mb-12">{t('dashboard.donutTitle')}</div>
          <div style={{ marginBottom: 14 }}>
            <DonutChart byChannel={byChannel} total={totalSent} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {byChannel.length === 0 ? (
              <span className="text-xs text-muted" style={{ textAlign: 'center' }}>
                {t('dashboard.noSends')}
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
              <span className="text-muted">{t('dashboard.total')}</span>
              <span>{totalSent.toLocaleString('fr-FR')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Vue opérationnelle du jour ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }}>
        {/* Contacts ajoutés aujourd'hui */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#e6f7e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#2ec80a"
              strokeWidth="1.4"
              strokeLinecap="round"
            >
              <circle cx="5.5" cy="4" r="2.5" />
              <path d="M1 12c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
              <line x1="10.5" y1="4.5" x2="10.5" y2="8.5" />
              <line x1="8.5" y1="6.5" x2="12.5" y2="6.5" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
            {contactsAddedToday.toLocaleString('fr-FR')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Contacts ajoutés aujourd'hui</div>
          <Link
            to="/contacts"
            style={{ fontSize: 10.5, color: 'var(--brand-primary)', fontWeight: 600, marginTop: 4 }}
          >
            Voir les contacts →
          </Link>
        </div>

        {/* Automatisations actives */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#e0f0f4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#0c5460"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="8,1 4,8 7,8 6,13 11,6 7,6" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
            {activeAutomations.length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Automatisations actives</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
            {automationSendCount.toLocaleString('fr-FR')} envois automatiques
          </div>
        </div>

        {/* Campagnes de la période */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: '#fef3e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="#d97706"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="12" height="9" rx="1" />
              <polyline points="1,4 7,9 13,4" />
            </svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>
            {campaigns.filter((c) => c.status === 'scheduled').length}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Campagnes planifiées</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
            {campaigns.filter((c) => c.status === 'sent').length} envoyées au total
          </div>
        </div>

        {/* Crédits disponibles */}
        <div
          className="card"
          style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '14px 16px' }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background:
                creditBalance != null && creditThreshold != null && creditBalance <= creditThreshold
                  ? '#fee2e2'
                  : '#e6f7e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 6,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke={
                creditBalance != null && creditThreshold != null && creditBalance <= creditThreshold
                  ? '#ef4444'
                  : '#2ec80a'
              }
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="1" y="3" width="12" height="9" rx="2" />
              <line x1="1" y1="6.5" x2="13" y2="6.5" />
              <line x1="4" y1="9.5" x2="6" y2="9.5" />
            </svg>
          </div>
          <div
            style={{
              fontSize: 19,
              fontWeight: 700,
              color:
                creditBalance != null && creditThreshold != null && creditBalance <= creditThreshold
                  ? '#ef4444'
                  : 'var(--text-1)',
              lineHeight: 1,
            }}
          >
            {creditBalance == null ? '—' : creditBalance.toLocaleString('fr-FR')}
            <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', marginLeft: 3 }}>
              FCFA
            </span>
          </div>
          <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 4 }}>
            <div
              style={{
                height: '100%',
                borderRadius: 2,
                width: `${creditProgress}%`,
                background:
                  creditProgress < 20
                    ? '#ef4444'
                    : creditProgress < 50
                      ? '#f59e0b'
                      : 'var(--brand-gradient)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
            {creditThreshold != null
              ? `Alerte < ${creditThreshold.toLocaleString('fr-FR')} FCFA`
              : 'Crédits disponibles'}
          </div>
        </div>
      </div>

      {/* ── Campagnes récentes + Activité récente ───────────────── */}
      <div
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12 }}
      >
        {/* Campagnes récentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Campagnes récentes</div>
            <Link
              to="/campaigns"
              style={{ fontSize: 11, color: 'var(--brand-primary)', fontWeight: 600 }}
            >
              {t('campaigns.viewAll')}
            </Link>
          </div>
          {campaignsLoading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '16px 0',
                color: 'var(--text-2)',
                fontSize: 12,
              }}
            >
              {t('common.loading')}
            </div>
          ) : recentCampaigns.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '20px 0',
                color: 'var(--text-2)',
                fontSize: 12,
              }}
            >
              {t('campaigns.noData')}{' '}
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
                {t('campaigns.createNow')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {recentCampaigns.map((c) => {
                const statusColor: Record<string, string> = {
                  sent: '#16a34a',
                  scheduled: '#d97706',
                  draft: 'var(--text-3)',
                  failed: '#ef4444',
                };
                const statusLabel: Record<string, string> = {
                  sent: 'Envoyée',
                  scheduled: 'Planifiée',
                  draft: 'Brouillon',
                  failed: 'Échouée',
                };
                const color = statusColor[c.status] ?? 'var(--text-3)';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => navigate(`/campaigns/${c.id}`)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(0,1fr) auto',
                      gap: 12,
                      alignItems: 'center',
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 13 }}>
                        {c.name}
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        {c.channel} · {Number(c.estimatedRecipients || 0).toLocaleString('fr-FR')}{' '}
                        contacts
                      </div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Activité récente */}
        <div className="card">
          <div className="card-title mb-12">Activité récente</div>
          {auditLogs.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-3)',
                textAlign: 'center',
                padding: '16px 0',
              }}
            >
              Aucune activité récente
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {auditLogs.map((log, i) => {
                const label = log.action.replace(/_/g, ' ');
                const isLast = i === auditLogs.length - 1;
                return (
                  <div
                    key={log.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 10,
                      padding: '8px 0',
                      borderBottom: isLast ? 'none' : '0.5px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: 'var(--brand-primary)',
                        marginTop: 5,
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
                        {label.charAt(0).toUpperCase() + label.slice(1)}
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 1 }}>
                        {new Date(log.createdAt).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
