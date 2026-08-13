import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PieChart, Pie, Cell, Tooltip as RechartsTip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
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

// ─── Donut Engagement (Recharts) ──────────────────────────────────────────
const DONUT_COLORS = ['#2ec80a', '#0c5460', '#ef4444', '#6b7280'];
const DONUT_LABELS = ['Ouvertures', 'Clics', 'Rebonds', 'Désinscrits'];

function EngagementDonut({ overview }: { overview: OverviewData }) {
  const pieData = [
    overview.openRate,
    overview.clickRate,
    overview.bounceRate,
    overview.unsubscribeRate,
  ]
    .map((v, i) => ({ name: DONUT_LABELS[i], value: Math.max(0, parseFloat(v.toFixed(1))) }))
    .filter((d) => d.value > 0);

  if (!pieData.length)
    return (
      <div
        style={{
          height: 140,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--text-3)',
        }}
      >
        Aucune donnée sur la période
      </div>
    );

  return (
    <div style={{ height: 140, display: 'flex', alignItems: 'center' }}>
      <div style={{ flex: '0 0 120px', height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={56}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={0} />
              ))}
            </Pie>
            <RechartsTip
              formatter={(v, name) => [`${Number(v).toFixed(1)}%`, String(name)]}
              contentStyle={{ fontSize: 11, borderRadius: 6 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 8 }}>
        {pieData.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 2,
                background: DONUT_COLORS[i % DONUT_COLORS.length],
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-2)', flex: 1 }}>{d.name}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)' }}>
              {d.value.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Heatmap 24h ──────────────────────────────────────────────────────────
function HeatmapGrid({
  data,
}: {
  data: { hour: number; openCount: number; clickCount: number }[];
}) {
  const maxVal = Math.max(...data.map((d) => d.openCount + d.clickCount), 1);
  return (
    <div>
      <div
        style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 3, marginBottom: 4 }}
      >
        {Array.from({ length: 24 }, (_, h) => {
          const point = data.find((d) => d.hour === h);
          const count = point ? point.openCount + point.clickCount : 0;
          const intensity = count / maxVal;
          return (
            <div
              key={h}
              title={`${h}h00 — ${count} interaction${count > 1 ? 's' : ''}`}
              style={{
                height: 32,
                borderRadius: 4,
                background:
                  intensity < 0.02
                    ? 'var(--muted)'
                    : `rgba(12,84,96,${(0.1 + intensity * 0.9).toFixed(2)})`,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(24, 1fr)', gap: 3 }}>
        {Array.from({ length: 24 }, (_, h) => (
          <div
            key={h}
            style={{
              fontSize: 8,
              color: 'var(--text-3)',
              textAlign: 'center',
              visibility: h % 6 === 0 ? 'visible' : 'hidden',
            }}
          >
            {h}h
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helper PDF : dessin d'un secteur de camembert ────────────────────────
function drawPieSlice(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
  startRad: number,
  endRad: number,
  hexColor: string,
) {
  const sliceAngle = endRad - startRad;
  const numPts = Math.max(4, Math.ceil(Math.abs(sliceAngle) * r * 1.5));
  const allPts: number[][] = [[cx, cy]];
  for (let j = 0; j <= numPts; j++) {
    const a = startRad + (sliceAngle * j) / numPts;
    allPts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  const moves: number[][] = [];
  for (let k = 1; k < allPts.length; k++) {
    moves.push([allPts[k][0] - allPts[k - 1][0], allPts[k][1] - allPts[k - 1][1]]);
  }
  doc.setFillColor(hexColor);
  doc.lines(moves, cx, cy, [1, 1], 'F', true);
}

export default function Analytics() {
  const { t } = useTranslation();
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

  const handleExportPdf = () => {
    if (!data) return;

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 0;

    // ── En-tête ──────────────────────────────────────────────
    doc.setFillColor('#0c5460');
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text('NovaMessenger', margin, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Rapport Analytics — ${period} derniers jours`, margin + 42, 15);
    doc.text(
      new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      pageW - margin,
      15,
      { align: 'right' },
    );
    y = 32;

    // ── KPI ──────────────────────────────────────────────────
    const kpis = [
      {
        label: 'Messages envoyes',
        value: data.messagesSent.toLocaleString('fr-FR'),
        hex: '#0c5460',
      },
      { label: "Taux d'ouverture", value: `${data.openRate.toFixed(1)}%`, hex: '#2ec80a' },
      { label: 'Taux de clic', value: `${data.clickRate.toFixed(1)}%`, hex: '#aaee22' },
      { label: 'Rebonds', value: `${data.bounceRate.toFixed(1)}%`, hex: '#ef4444' },
      { label: 'Desinscrits', value: `${data.unsubscribeRate.toFixed(1)}%`, hex: '#6b7280' },
    ];
    const cardW = (contentW - 8) / 5;
    kpis.forEach((kpi, i) => {
      const x = margin + i * (cardW + 2);
      doc.setFillColor('#f7f9f7');
      doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
      doc.setFillColor(kpi.hex);
      doc.rect(x, y, 2.5, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(kpi.hex);
      doc.text(kpi.value, x + 5, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, x + 5, y + 17);
    });
    y += 28;

    // ── Diagramme circulaire ──────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#0c5460');
    doc.text("Repartition de l'engagement", margin, y);
    y += 5;

    const pieSegments = [
      { label: 'Ouvertures', value: data.openRate, hex: '#2ec80a' },
      { label: 'Clics', value: data.clickRate, hex: '#0c5460' },
      { label: 'Rebonds', value: data.bounceRate, hex: '#ef4444' },
      { label: 'Desinscrits', value: data.unsubscribeRate, hex: '#6b7280' },
    ].filter((d) => d.value > 0);

    const pieCx = margin + 28;
    const pieCy = y + 26;
    const pieR = 22;
    const donutR = 10;
    const totalPct = pieSegments.reduce((s, d) => s + d.value, 0) || 100;

    if (pieSegments.length > 0) {
      let startAngle = -Math.PI / 2;
      pieSegments.forEach((seg) => {
        const sliceAngle = (seg.value / totalPct) * 2 * Math.PI;
        drawPieSlice(doc, pieCx, pieCy, pieR, startAngle, startAngle + sliceAngle, seg.hex);
        startAngle += sliceAngle;
      });
      doc.setFillColor('#ffffff');
      doc.circle(pieCx, pieCy, donutR, 'F');
    } else {
      doc.setFillColor('#e5e7eb');
      doc.circle(pieCx, pieCy, pieR, 'F');
    }

    // Légende donut
    let legY = y + 8;
    pieSegments.forEach((seg) => {
      doc.setFillColor(seg.hex);
      doc.roundedRect(margin + 58, legY, 3, 3, 0.5, 0.5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(`${seg.label} : ${seg.value.toFixed(1)}%`, margin + 63, legY + 2.5);
      legY += 9;
    });

    // ── Top campagnes (barres) ────────────────────────────────
    const barX = margin + 100;
    const barY = y;
    const barW = contentW - 102;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#0c5460');
    doc.text('Top campagnes', barX, barY);

    if (data.top5?.length) {
      const maxSent = Math.max(...data.top5.map((c) => c.sentCount), 1);
      const barColors = ['#0c5460', '#2ec80a', '#aaee22', '#6b7280', '#ef4444'];
      const slotH = 54 / Math.min(data.top5.length, 5);

      data.top5.slice(0, 5).forEach((c, i) => {
        const rowY = barY + 5 + i * slotH;
        const fillW = (c.sentCount / maxSent) * (barW - 18);
        const shortName = c.name.length > 20 ? c.name.slice(0, 18) + '...' : c.name;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.text(shortName, barX, rowY + slotH * 0.32);

        doc.setFillColor('#ebebeb');
        doc.rect(barX, rowY + slotH * 0.5, barW - 18, 3.5, 'F');
        doc.setFillColor(barColors[i % barColors.length]);
        if (fillW > 0) doc.rect(barX, rowY + slotH * 0.5, fillW, 3.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(barColors[i % barColors.length]);
        doc.text(c.sentCount.toLocaleString('fr-FR'), barX + barW - 17, rowY + slotH * 0.5 + 3, {
          align: 'right',
        });
      });
    }

    y += 62;

    // ── Heatmap 24h ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#0c5460');
    doc.text('Heatmap engagement horaire (24h)', margin, y);
    y += 5;

    if (data.heatmap?.length) {
      const maxH = Math.max(...data.heatmap.map((h) => h.openCount + h.clickCount), 1);
      const cellW = contentW / 24;
      const cellH = 10;
      for (let h = 0; h < 24; h++) {
        const point = data.heatmap.find((d) => d.hour === h);
        const count = point ? point.openCount + point.clickCount : 0;
        const intensity = count / maxH;
        // Light teal → dark teal gradient
        const r = Math.round(220 - intensity * 160);
        const g = Math.round(235 - intensity * 135);
        const b = Math.round(240 - intensity * 192);
        doc.setFillColor(r, g, b);
        doc.rect(margin + h * cellW, y, cellW - 0.5, cellH, 'F');
        if (h % 6 === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(130, 130, 130);
          doc.text(`${h}h`, margin + h * cellW, y + cellH + 3.5);
        }
      }
      y += cellH + 8;
    }

    // ── Tableau Top 5 ────────────────────────────────────────
    if (data.top5?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor('#0c5460');
      doc.text(`Classement des campagnes — ${period} derniers jours`, margin, y);
      y += 5;

      const cols: { label: string; x: number; w: number; align: 'left' | 'right' }[] = [
        { label: 'Campagne', x: margin, w: 65, align: 'left' },
        { label: 'Envois', x: margin + 65, w: 26, align: 'right' },
        { label: 'Ouvertures', x: margin + 91, w: 26, align: 'right' },
        { label: 'Clics', x: margin + 117, w: 22, align: 'right' },
        { label: 'Tx clic', x: margin + 139, w: 23, align: 'right' },
        { label: 'Tx ouv.', x: margin + 162, w: contentW - 147, align: 'right' },
      ];

      doc.setFillColor('#0c5460');
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      cols.forEach((col) => {
        const tx = col.align === 'right' ? col.x + col.w - 1 : col.x + 1.5;
        doc.text(col.label, tx, y + 4.8, { align: col.align });
      });
      y += 7;

      data.top5.forEach((c, i) => {
        doc.setFillColor(i % 2 === 0 ? '#f7f9f7' : '#ffffff');
        doc.rect(margin, y, contentW, 6.5, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        doc.text(c.name.length > 33 ? c.name.slice(0, 31) + '...' : c.name, margin + 1.5, y + 4.3);
        doc.text(c.sentCount.toLocaleString('fr-FR'), margin + 90, y + 4.3, { align: 'right' });
        doc.text(c.openedCount.toLocaleString('fr-FR'), margin + 116, y + 4.3, { align: 'right' });
        doc.text(c.clickedCount.toLocaleString('fr-FR'), margin + 138, y + 4.3, { align: 'right' });
        const cRate =
          c.sentCount > 0 ? `${((c.clickedCount / c.sentCount) * 100).toFixed(1)}%` : '--';
        const oRate =
          c.sentCount > 0 ? `${((c.openedCount / c.sentCount) * 100).toFixed(1)}%` : '--';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#2ec80a');
        doc.text(cRate, margin + 161, y + 4.3, { align: 'right' });
        doc.setTextColor('#0c5460');
        doc.text(oRate, margin + contentW - 0.5, y + 4.3, { align: 'right' });
        y += 6.5;
      });
    }

    // ── Pied de page ─────────────────────────────────────────
    doc.setFillColor('#f0f2f0');
    doc.rect(0, 280, pageW, 17, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text('NovaMessenger — Plateforme de messagerie multi-canal', margin, 289);
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')}`, pageW - margin, 289, {
      align: 'right',
    });

    doc.save(`analytics-novasms-${period}j-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div id="tour-analytics-header" className="content">
      {/* Header card */}
      <div className="card" style={{ padding: '13px 16px' }}>
        <div className="analytics-header-inner flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-12">
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
                {t('analyticsPage.report')}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>
                {t('analyticsPage.aggregated', { period })}
              </div>
            </div>
          </div>
          <div className="analytics-header-actions flex gap-2 sm:gap-8 flex-wrap">
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
            <div className="flex gap-2">
              <button
                className="btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={handleExportCsv}
                disabled={!data?.top5?.length}
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
                {t('analyticsPage.exportCsv')}
              </button>
              <button
                className="btn-sm"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  ...(data
                    ? {
                        background: 'var(--brand-teal)',
                        color: '#fff',
                        borderColor: 'var(--brand-teal)',
                      }
                    : {}),
                }}
                onClick={handleExportPdf}
                disabled={!data}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                >
                  <path d="M9 1H3a1 1 0 00-1 1v8a1 1 0 001 1h6a1 1 0 001-1V2a1 1 0 00-1-1z" />
                  <path d="M4 5h4M4 7h2" />
                </svg>
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats avec deltas période précédente */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-2)', fontSize: 12 }}>
          {t('analyticsPage.loading')}
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
            gap: 10,
          }}
        >
          {(() => {
            const prev = data?.previous;
            const deltaSent =
              prev && prev.messagesSent > 0 && data?.messagesSent != null
                ? ((data.messagesSent - prev.messagesSent) / prev.messagesSent) * 100
                : null;
            const deltaOpen =
              prev != null && data?.openRate != null ? data.openRate - prev.openRate : null;
            const deltaClick =
              prev != null && data?.clickRate != null ? data.clickRate - prev.clickRate : null;

            const items = [
              {
                label: t('analyticsPage.sent'),
                value: data?.messagesSent?.toLocaleString('fr-FR') ?? '—',
                color: '#0c5460',
                pct: 100,
                bg: '#0c5460',
                delta:
                  deltaSent != null ? `${deltaSent >= 0 ? '+' : ''}${deltaSent.toFixed(1)}%` : null,
                deltaUp: deltaSent != null ? deltaSent >= 0 : null,
              },
              {
                label: t('analyticsPage.openRate'),
                value: data?.openRate != null ? `${data.openRate.toFixed(1)}%` : '—',
                color: '#2ec80a',
                pct: data?.openRate ?? 0,
                bg: 'var(--brand-gradient)',
                delta:
                  deltaOpen != null
                    ? `${deltaOpen >= 0 ? '+' : ''}${deltaOpen.toFixed(1)} pt`
                    : null,
                deltaUp: deltaOpen != null ? deltaOpen >= 0 : null,
              },
              {
                label: t('analyticsPage.clickRate'),
                value: data?.clickRate != null ? `${data.clickRate.toFixed(1)}%` : '—',
                color: '#aaee22',
                pct: data?.clickRate ?? 0,
                bg: '#aaee22',
                delta:
                  deltaClick != null
                    ? `${deltaClick >= 0 ? '+' : ''}${deltaClick.toFixed(1)} pt`
                    : null,
                deltaUp: deltaClick != null ? deltaClick >= 0 : null,
              },
              {
                label: t('analyticsPage.bounces'),
                value: data?.bounceRate != null ? `${data.bounceRate.toFixed(1)}%` : '—',
                color: '#ef4444',
                pct: data?.bounceRate ?? 0,
                bg: '#ef4444',
                delta: null,
                deltaUp: null,
              },
              {
                label: t('analyticsPage.unsubscribes'),
                value: data?.unsubscribeRate != null ? `${data.unsubscribeRate.toFixed(1)}%` : '—',
                color: 'var(--text-2)',
                pct: data?.unsubscribeRate ?? 0,
                bg: 'var(--text-3)',
                delta: null,
                deltaUp: null,
              },
            ];

            return items.map(({ label, value, color, pct, bg, delta, deltaUp }) => (
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
                {delta != null && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      marginTop: 4,
                      color: deltaUp ? '#16a34a' : '#ef4444',
                    }}
                  >
                    {deltaUp ? '↑' : '↓'} {delta} vs période préc.
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── Entonnoir de conversion ──────────────────────────────── */}
      {!loading && data && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="card-title">Entonnoir de conversion</div>
              <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 2 }}>
                De l'envoi à l'action — {period} derniers jours
              </div>
            </div>
            {data.previous && (
              <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>vs période précédente</div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              {
                label: 'Envois',
                count: data.messagesSent,
                pct: 100,
                color: '#0c5460',
                bg: '#0c5460',
                prevPct: 100,
              },
              {
                label: 'Ouvertures',
                count: Math.round(data.messagesSent * (data.openRate / 100)),
                pct: data.openRate,
                color: '#2ec80a',
                bg: 'var(--brand-gradient)',
                prevPct: data.previous?.openRate ?? null,
              },
              {
                label: 'Clics',
                count: Math.round(data.messagesSent * (data.clickRate / 100)),
                pct: data.clickRate,
                color: '#aaee22',
                bg: '#aaee22',
                prevPct: data.previous?.clickRate ?? null,
              },
              {
                label: 'Désinscrits',
                count: Math.round(data.messagesSent * (data.unsubscribeRate / 100)),
                pct: data.unsubscribeRate,
                color: '#ef4444',
                bg: '#ef4444',
                prevPct: null,
              },
            ].map(({ label, count, pct, color, bg, prevPct }, i) => (
              <div key={label}>
                <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                  <div className="flex items-center gap-8">
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 5,
                        background:
                          i === 0
                            ? '#0c5460'
                            : i === 1
                              ? '#e6f7e0'
                              : i === 2
                                ? '#f0fce8'
                                : '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 9,
                        fontWeight: 700,
                        color: i === 0 ? '#fff' : color,
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                      {label}
                    </span>
                  </div>
                  <div className="flex items-center gap-8">
                    {prevPct != null && prevPct !== 100 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: pct >= prevPct ? '#16a34a' : '#ef4444',
                          fontWeight: 600,
                        }}
                      >
                        {pct >= prevPct ? '↑' : '↓'} {Math.abs(pct - prevPct).toFixed(1)} pt
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                      {count.toLocaleString('fr-FR')}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color,
                        minWidth: 42,
                        textAlign: 'right',
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 8,
                    background: 'var(--border)',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 4,
                      width: `${Math.min(100, pct)}%`,
                      background: bg,
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row: évolution + donut */}
      <div
        className="charts-row"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)',
          gap: 12,
        }}
      >
        {/* Courbe évolution */}
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">{t('analyticsPage.evolution')}</div>
            <span className="text-xs text-muted">
              {data?.messagesSent != null && data?.openRate != null
                ? `${Math.round(data.messagesSent * (data.openRate / 100)).toLocaleString('fr-FR')} ${t('analyticsPage.uniqueOpens')}`
                : ''}
            </span>
          </div>
          <EvolutionChart data={data?.evolution ?? []} period={period} />
          {data && (
            <div className="flex flex-wrap gap-4 sm:gap-8" style={{ marginTop: 10 }}>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span
                  style={{
                    width: 18,
                    height: 2,
                    background: 'var(--brand-primary)',
                    display: 'inline-block',
                    borderRadius: 1,
                    flexShrink: 0,
                  }}
                />
                {t('analyticsPage.sends')}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span
                  style={{
                    width: 18,
                    borderTop: '2px dashed var(--brand-teal)',
                    display: 'inline-block',
                    flexShrink: 0,
                  }}
                />
                {t('analyticsPage.opens')}
              </div>
              <div
                className="text-xs"
                style={{ color: '#16a34a', fontWeight: 600, marginLeft: 'auto' }}
              >
                {t('analyticsPage.avgRate', { rate: data.openRate.toFixed(1) })}
              </div>
            </div>
          )}
        </div>

        {/* Donut + derniers contacts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className="card-title mb-8">Répartition de l'engagement</div>
            {data ? (
              <EngagementDonut overview={data} />
            ) : (
              <div style={{ height: 140, background: 'var(--muted)', borderRadius: 8 }} />
            )}
          </div>

          <div className="divider" />

          <div>
            <div className="card-title mb-8">{t('analyticsPage.recentOpens')}</div>
            {!data?.recentOpens?.length ? (
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text-3)',
                  textAlign: 'center',
                  padding: '10px 0',
                }}
              >
                {t('analyticsPage.noRecentOpens')}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {(() => {
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
                        ? t('analyticsPage.timeAgoMin', { n: elapsed })
                        : elapsed < 1440
                          ? t('analyticsPage.timeAgoH', { n: Math.round(elapsed / 60) })
                          : t('analyticsPage.timeAgoD', { n: Math.round(elapsed / 1440) });
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
                          {isClick ? t('analyticsPage.clicked') : t('analyticsPage.opened')}
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

      {/* Heatmap 24h */}
      {data?.heatmap && data.heatmap.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Heatmap d'engagement horaire</div>
            <span className="text-xs text-muted">Ouvertures + clics cumulés par heure</span>
          </div>
          <HeatmapGrid data={data.heatmap} />
        </div>
      )}

      {/* Top 5 table */}
      {data?.top5 && data.top5.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">{t('analyticsPage.top5Title', { period })}</div>
            <button onClick={() => navigate('/campaigns')} className="btn-ghost">
              {t('analyticsPage.viewAll')}
            </button>
          </div>
          <div className="analytics-top5-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('analyticsPage.campaign')}</th>
                  <th>{t('analyticsPage.sends2')}</th>
                  <th>{t('analyticsPage.opens2')}</th>
                  <th>{t('analyticsPage.clicks')}</th>
                  <th>{t('analyticsPage.clickRate2')}</th>
                  <th>{t('analyticsPage.openRate2')}</th>
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
                      {c.sentCount > 0
                        ? `${((c.openedCount / c.sentCount) * 100).toFixed(1)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
