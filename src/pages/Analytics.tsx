import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axios';

interface OverviewData {
  messagesSent: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
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
  recentOpens: {
    action: string;
    createdAt: string;
    contact: { email: string; firstName: string | null; lastName: string | null };
    campaignName: string;
  }[];
  previous: { messagesSent: number; openRate: number; clickRate: number };
}

// ─── Evolution Line Chart SVG ─────────────────────────────────────────────
function EvolutionChart({
  data,
  period,
}: {
  data: { date: string; sent: number; opened: number }[];
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
          <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2EC80A" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2EC80A" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,${H} ${sentPts} ${W},${H}`} fill="url(#analyticsGrad)" />
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
            {new Date(d.date).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: period > 7 ? '2-digit' : undefined,
            })}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<OverviewData>(`/analytics/overview?period=${period}`)
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period]);

  const handleExportCsv = () => {
    if (!data?.top5?.length) return;
    const header = 'Campagne,Envois,Ouvertures,Clics,Taux clic\n';
    const rows = data.top5
      .map(
        (c) =>
          `"${c.name}",${c.sentCount},${c.openedCount},${c.clickedCount},${c.sentCount > 0 ? ((c.clickedCount / c.sentCount) * 100).toFixed(1) + '%' : '—'}`,
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}j.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="tour-analytics-header" className="content">
      {/* Header card with period selector */}
      <div className="card" style={{ padding: '13px 16px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div
              style={{
                width: 36,
                height: 36,
                background: '#E0EDEF',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#0c5460"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="7" width="3" height="6" fill="#0c5460" stroke="none" />
                <rect x="5.5" y="4" width="3" height="9" fill="#0c5460" stroke="none" />
                <rect x="10" y="1" width="3" height="12" fill="#0c5460" stroke="none" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                Rapport Analytics
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>
                Données agrégées · {period} derniers jours
              </div>
            </div>
          </div>
          <div className="flex gap-8">
            <div className="flex gap-3">
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
            <button
              className="btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleExportCsv}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.3"
              >
                <path d="M6 1v7M2 5l4 4 4-4" />
                <path d="M1 10v1h10v-1" />
              </svg>
              Exporter CSV
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats — 5 colonnes style analytics-stat */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-2)', fontSize: 12 }}>
          Chargement…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
            gap: 10,
          }}
        >
          {[
            {
              label: 'Envoyés',
              value: data?.messagesSent?.toLocaleString('fr-FR') ?? '—',
              color: '#0c5460',
              pct: 100,
              bg: '#0c5460',
            },
            {
              label: 'Taux ouverture',
              value: data?.openRate != null ? `${data.openRate.toFixed(1)}%` : '—',
              color: '#2ec80a',
              pct: data?.openRate ?? 0,
              bg: 'var(--brand-gradient)',
            },
            {
              label: 'Taux de clic',
              value: data?.clickRate != null ? `${data.clickRate.toFixed(1)}%` : '—',
              color: '#aaee22',
              pct: data?.clickRate ?? 0,
              bg: '#aaee22',
            },
            {
              label: 'Rebonds',
              value: data?.bounceRate != null ? `${data.bounceRate.toFixed(1)}%` : '—',
              color: '#ef4444',
              pct: data?.bounceRate ?? 0,
              bg: '#ef4444',
            },
            {
              label: 'Désabonnements',
              value: data?.unsubscribeRate != null ? `${data.unsubscribeRate.toFixed(1)}%` : '—',
              color: 'var(--text-2)',
              pct: data?.unsubscribeRate ?? 0,
              bg: 'var(--text-3)',
            },
          ].map(({ label, value, color, pct, bg }) => (
            <div key={label} className="analytics-stat">
              <div className="big" style={{ color }}>
                {value}
              </div>
              <div className="lbl">{label}</div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(100, pct)}%`, background: bg }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts row: evolution + top campagnes + heatmap compact */}
      <div
        className="charts-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
          gap: 12,
          flex: 1,
        }}
      >
        {/* Courbe des ouvertures */}
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Évolution des performances</div>
            <span className="text-xs text-muted">
              {data?.messagesSent != null && data?.openRate != null
                ? `${Math.round(data.messagesSent * (data.openRate / 100)).toLocaleString('fr-FR')} ouvertures uniques`
                : ''}
            </span>
          </div>
          <EvolutionChart data={data?.evolution ?? []} period={period} />
          {data && (
            <div className="flex gap-16" style={{ marginTop: 10 }}>
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
                Ouvertures
              </div>
              <div
                className="text-xs"
                style={{ color: '#16a34a', fontWeight: 600, marginLeft: 'auto' }}
              >
                Taux moyen : {data.openRate.toFixed(1)}%
              </div>
            </div>
          )}
        </div>

        {/* Top campagnes + heatmap compact */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Top campagnes */}
          <div>
            <div className="card-title mb-8">Top campagnes</div>
            {!data?.top5 || data.top5.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '12px 0',
                  color: 'var(--text-2)',
                  fontSize: 12,
                }}
              >
                Aucune donnée.{' '}
                <button
                  onClick={() => navigate('/campaigns/new')}
                  style={{
                    color: '#2ec80a',
                    background: 'none',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Créer →
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.top5.slice(0, 3).map((c, i) => {
                  const maxSent = data.top5[0]?.sentCount || 1;
                  const pct = Math.round((c.sentCount / maxSent) * 100);
                  const colors = ['var(--brand-gradient)', '#0c5460', '#aaee22'];
                  return (
                    <div
                      key={c.id}
                      style={{
                        background: 'var(--muted)',
                        borderRadius: 6,
                        padding: '7px 10px',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/campaigns/${c.id}`)}
                    >
                      <div
                        className="flex items-center justify-between text-xs mb-8"
                        style={{ marginBottom: 4 }}
                      >
                        <span
                          className="text-muted"
                          style={{
                            maxWidth: 150,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {c.name}
                        </span>
                        <strong style={{ color: '#2ec80a' }}>
                          {c.sentCount.toLocaleString('fr-FR')}
                        </strong>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-fill"
                          style={{ width: `${pct}%`, background: colors[i] || '#2ec80a' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Derniers contacts ayant ouvert / cliqué */}
          <div>
            <div className="card-title mb-8">Derniers contacts ayant ouvert</div>
            {!data?.recentOpens?.length ? (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                  padding: '10px 0',
                }}
              >
                Aucune ouverture récente
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(() => {
                  // eslint-disable-next-line react-hooks/purity
                  const now = Date.now();
                  return data.recentOpens.map((r, i) => {
                    const initials =
                      [r.contact.firstName, r.contact.lastName]
                        .filter(Boolean)
                        .map((n) => n![0].toUpperCase())
                        .join('') || r.contact.email.slice(0, 2).toUpperCase();
                    const displayName =
                      [r.contact.firstName, r.contact.lastName].filter(Boolean).join(' ') ||
                      r.contact.email;
                    const isClick = r.action === 'Click';
                    const elapsed = Math.round((now - new Date(r.createdAt).getTime()) / 60000);
                    const timeLabel =
                      elapsed < 60
                        ? `Il y a ${elapsed}min`
                        : elapsed < 1440
                          ? `Il y a ${Math.round(elapsed / 60)}h`
                          : `Il y a ${Math.round(elapsed / 1440)}j`;
                    return (
                      <div
                        key={i}
                        className="contact-row"
                        style={{
                          padding: '5px 0',
                          borderBottom:
                            i < data.recentOpens.length - 1 ? '0.5px solid var(--border)' : 'none',
                        }}
                      >
                        <div
                          className="contact-avatar"
                          style={{ width: 24, height: 24, fontSize: 9, flexShrink: 0 }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 500,
                              color: 'var(--text-1)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {displayName}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: 'var(--text-3)',
                              marginTop: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {r.campaignName}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 10,
                            color: 'var(--text-3)',
                            whiteSpace: 'nowrap',
                            marginRight: 6,
                          }}
                        >
                          {timeLabel}
                        </span>
                        <span
                          className="chip"
                          style={{
                            fontSize: 10,
                            padding: '1px 6px',
                            background: isClick ? 'var(--brand-light)' : 'var(--muted)',
                            color: isClick ? 'var(--brand-teal)' : 'var(--text-2)',
                          }}
                        >
                          {isClick ? 'Cliqué' : 'Ouvert'}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top 5 table complète */}
      {data?.top5 && data.top5.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Top 5 campagnes — {period} derniers jours</div>
            <button onClick={() => navigate('/campaigns')} className="btn-ghost">
              Voir tout →
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Envois</th>
                <th>Ouvertures</th>
                <th>Clics</th>
                <th>Taux clic</th>
                <th>Taux ouverture</th>
              </tr>
            </thead>
            <tbody>
              {data.top5.map((c) => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/campaigns/${c.id}`)}
                >
                  <td style={{ fontWeight: 500, color: 'var(--text-1)' }}>{c.name}</td>
                  <td>{c.sentCount.toLocaleString('fr-FR')}</td>
                  <td>{c.openedCount.toLocaleString('fr-FR')}</td>
                  <td>{c.clickedCount.toLocaleString('fr-FR')}</td>
                  <td style={{ color: '#2ec80a', fontWeight: 600 }}>
                    {c.sentCount > 0
                      ? `${((c.clickedCount / c.sentCount) * 100).toFixed(1)}%`
                      : '—'}
                  </td>
                  <td style={{ color: '#0c5460', fontWeight: 600 }}>
                    {c.sentCount > 0 ? `${((c.openedCount / c.sentCount) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
