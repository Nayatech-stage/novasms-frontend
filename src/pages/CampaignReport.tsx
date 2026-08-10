import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Download,
  FileText,
  Mail,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  Users,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import api from '@/api/axios';

interface ABVariantStats {
  sent: number;
  opened: number;
  clicked: number;
  openRate: number;
  clickRate: number;
}

interface ABReportData {
  enabled: boolean;
  winner: 'A' | 'B' | null;
  subjectA: string;
  subjectB: string;
  splitPct: number;
  variantA: ABVariantStats;
  variantB: ABVariantStats;
}

interface ReportData {
  campaign: { id: string; name: string };
  totalSent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
  abReport: ABReportData | null;
  contactsOpened: Array<{
    contact: { email: string; firstName?: string; lastName?: string };
    createdAt: string;
  }>;
  contactsClicked: Array<{
    contact: { email: string; firstName?: string; lastName?: string };
    createdAt: string;
  }>;
  clickHeat: Array<{ zone: string; clickCount: number }>;
}

function StatCard({
  label,
  value,
  total,
  icon,
  color,
}: {
  label: string;
  value: number;
  total: number;
  icon: React.ReactNode;
  color: string;
}) {
  const { t } = useTranslation();
  const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-4 sm:p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-bold ${color}`}>{value.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-on-surface-variant">
            {pct}% {t('campaignReport.percentTotal')}
          </p>
        </div>
        {icon}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-outline-variant/20 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
          style={{ width: `${Math.min(parseFloat(pct), 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function CampaignReport() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api
      .get<ReportData>(`/analytics/campaign/${id}/report`)
      .then((res) => setData(res.data))
      .catch(() => setError('Impossible de charger le rapport'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleExport = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Contact', 'Email', 'Action', 'Date'],
      ...data.contactsOpened.map((c) => [
        `${c.contact.firstName ?? ''} ${c.contact.lastName ?? ''}`.trim() || '-',
        c.contact.email,
        'Ouverture',
        new Date(c.createdAt).toLocaleString('fr-FR'),
      ]),
      ...data.contactsClicked.map((c) => [
        `${c.contact.firstName ?? ''} ${c.contact.lastName ?? ''}`.trim() || '-',
        c.contact.email,
        'Clic',
        new Date(c.createdAt).toLocaleString('fr-FR'),
      ]),
    ];
    const csv = rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rapport-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  const handleExportPdf = () => {
    if (!data) return;
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const margin = 15;
    const contentW = pageW - margin * 2;
    let y = 0;

    // En-tête
    doc.setFillColor('#0c5460');
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text('NovaSMS', margin, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const campaignTitle =
      data.campaign.name.length > 40 ? data.campaign.name.slice(0, 38) + '...' : data.campaign.name;
    doc.text(`Rapport de campagne — ${campaignTitle}`, margin + 42, 15);
    doc.text(
      new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }),
      pageW - margin,
      15,
      { align: 'right' },
    );
    y = 32;

    // KPI blocks
    const kpiBlocks = [
      { label: 'Envoyes', value: data.totalSent.toLocaleString('fr-FR'), hex: '#0c5460' },
      {
        label: 'Ouvertures',
        value: `${data.opened.toLocaleString('fr-FR')} (${data.totalSent > 0 ? ((data.opened / data.totalSent) * 100).toFixed(1) : '0'}%)`,
        hex: '#2ec80a',
      },
      {
        label: 'Clics',
        value: `${data.clicked.toLocaleString('fr-FR')} (${data.totalSent > 0 ? ((data.clicked / data.totalSent) * 100).toFixed(1) : '0'}%)`,
        hex: '#0c5460',
      },
      {
        label: 'Rebonds',
        value: `${data.bounced.toLocaleString('fr-FR')} (${data.totalSent > 0 ? ((data.bounced / data.totalSent) * 100).toFixed(1) : '0'}%)`,
        hex: '#ef4444',
      },
      {
        label: 'Desinscrits',
        value: `${data.unsubscribed.toLocaleString('fr-FR')} (${data.totalSent > 0 ? ((data.unsubscribed / data.totalSent) * 100).toFixed(1) : '0'}%)`,
        hex: '#6b7280',
      },
    ];
    const cardW = (contentW - 8) / 5;
    kpiBlocks.forEach((kpi, i) => {
      const x = margin + i * (cardW + 2);
      doc.setFillColor('#f7f9f7');
      doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
      doc.setFillColor(kpi.hex);
      doc.rect(x, y, 2.5, 22, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(kpi.value.length > 12 ? 8 : 11);
      doc.setTextColor(kpi.hex);
      doc.text(kpi.value, x + 5, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 100, 100);
      doc.text(kpi.label, x + 5, y + 17);
    });
    y += 28;

    // Barres de répartition visuelle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#0c5460');
    doc.text('Repartition des interactions', margin, y);
    y += 5;

    const total = data.totalSent || 1;
    const bars = [
      { label: 'Ouvertures', count: data.opened, hex: '#2ec80a' },
      { label: 'Clics', count: data.clicked, hex: '#0c5460' },
      { label: 'Rebonds', count: data.bounced, hex: '#ef4444' },
      { label: 'Desinscrits', count: data.unsubscribed, hex: '#6b7280' },
    ];
    bars.forEach((bar) => {
      const pct = (bar.count / total) * 100;
      const fillW = (pct / 100) * (contentW - 40);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(bar.label, margin, y + 3.5);
      doc.setFillColor('#ebebeb');
      doc.rect(margin + 28, y, contentW - 55, 5, 'F');
      if (fillW > 0) {
        doc.setFillColor(bar.hex);
        doc.rect(margin + 28, y, (fillW * (contentW - 55)) / (contentW - 40), 5, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(bar.hex);
      doc.text(`${pct.toFixed(1)}%`, margin + contentW - 26, y + 3.5, { align: 'right' });
      y += 10;
    });
    y += 4;

    // Zones de clic (click heat)
    if (data.clickHeat?.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor('#0c5460');
      doc.text('Zones de clic', margin, y);
      y += 5;

      const maxClicks = Math.max(...data.clickHeat.map((z) => z.clickCount), 1);
      data.clickHeat.slice(0, 6).forEach((zone, i) => {
        const fillW = (zone.clickCount / maxClicks) * (contentW - 50);
        doc.setFillColor(i % 2 === 0 ? '#f7f9f7' : '#ffffff');
        doc.rect(margin, y, contentW, 7, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(60, 60, 60);
        const zoneName = zone.zone.length > 30 ? zone.zone.slice(0, 28) + '...' : zone.zone;
        doc.text(zoneName, margin + 1.5, y + 4.8);
        doc.setFillColor('#0c5460');
        if (fillW > 0) doc.rect(margin + contentW - 48, y + 1.5, fillW * 0.26, 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor('#0c5460');
        doc.text(String(zone.clickCount), margin + contentW - 1, y + 4.8, { align: 'right' });
        y += 7;
      });
      y += 4;
    }

    // Tableau contacts ayant ouvert
    const printContactTable = (
      title: string,
      contacts: ReportData['contactsOpened'],
      accentHex: string,
    ) => {
      if (!contacts.length) return;
      if (y > 240) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(accentHex);
      doc.text(title, margin, y);
      y += 5;

      doc.setFillColor(accentHex);
      doc.rect(margin, y, contentW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('Contact', margin + 1.5, y + 4.8);
      doc.text('Email', margin + 55, y + 4.8);
      doc.text('Date', margin + contentW - 1, y + 4.8, { align: 'right' });
      y += 7;

      contacts.slice(0, 20).forEach((c, i) => {
        if (y > 270) {
          doc.addPage();
          y = 15;
        }
        doc.setFillColor(i % 2 === 0 ? '#f7f9f7' : '#ffffff');
        doc.rect(margin, y, contentW, 6.5, 'F');
        const name =
          `${c.contact.firstName ?? ''} ${c.contact.lastName ?? ''}`.trim() ||
          c.contact.email.split('@')[0];
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(40, 40, 40);
        doc.text(name.length > 22 ? name.slice(0, 20) + '...' : name, margin + 1.5, y + 4.3);
        doc.text(
          c.contact.email.length > 32 ? c.contact.email.slice(0, 30) + '...' : c.contact.email,
          margin + 55,
          y + 4.3,
        );
        doc.text(
          new Date(c.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
          margin + contentW - 1,
          y + 4.3,
          { align: 'right' },
        );
        y += 6.5;
      });
      y += 6;
    };

    printContactTable('Contacts ayant ouvert', data.contactsOpened, '#2ec80a');
    printContactTable('Contacts ayant clique', data.contactsClicked, '#0c5460');

    // Pied de page
    const lastPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
    for (let p = 1; p <= lastPage; p++) {
      doc.setPage(p);
      doc.setFillColor('#f0f2f0');
      doc.rect(0, 280, pageW, 17, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(150, 150, 150);
      doc.text('NovaSMS — Plateforme de messagerie multi-canal', margin, 289);
      doc.text(
        `Rapport — ${new Date().toLocaleDateString('fr-FR')} — Page ${p}/${lastPage}`,
        pageW - margin,
        289,
        { align: 'right' },
      );
    }

    doc.save(`rapport-campagne-${id}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f7f9f7] p-3 sm:p-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/campaigns"
              className="inline-flex items-center justify-center h-9 w-9 rounded-xl border border-outline-variant/30 bg-white hover:border-primary/40 transition"
            >
              <ArrowLeft className="h-4 w-4 text-on-surface" />
            </Link>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-on-surface-variant">
                {t('campaignReport.analysisLabel')}
              </p>
              <h1 className="text-2xl font-bold text-secondary">
                {loading
                  ? t('campaignReport.loading')
                  : (data?.campaign.name ?? t('campaignReport.report'))}
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-white px-4 py-2 text-sm font-semibold text-secondary hover:border-primary/40 hover:text-primary transition"
            >
              <Download className="h-4 w-4" /> {t('campaignReport.exportCsv')}
            </button>
            <button
              onClick={handleExportPdf}
              disabled={!data}
              className="inline-flex items-center gap-2 rounded-xl border border-secondary/30 bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary/90 transition disabled:opacity-50"
            >
              <FileText className="h-4 w-4" /> PDF
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* KPI Cards */}
            <div className="campaign-report-kpi-grid grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-5 sm:p-6 shadow-sm col-span-2 sm:col-span-1 flex flex-col items-start justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  {t('campaignReport.totalSent')}
                </p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-bold text-on-surface">
                    {data.totalSent.toLocaleString('fr-FR')}
                  </span>
                  <Users className="h-6 w-6 text-on-surface-variant opacity-30 mb-1" />
                </div>
              </div>
              <StatCard
                label={t('campaignReport.opened')}
                value={data.opened}
                total={data.totalSent}
                icon={<Mail className="h-7 w-7 text-success opacity-20" />}
                color="text-success"
              />
              <StatCard
                label={t('campaignReport.clicks')}
                value={data.clicked}
                total={data.totalSent}
                icon={<MousePointerClick className="h-7 w-7 text-secondary opacity-20" />}
                color="text-secondary"
              />
              <StatCard
                label={t('campaignReport.bounces')}
                value={data.bounced}
                total={data.totalSent}
                icon={<AlertTriangle className="h-7 w-7 text-amber-500 opacity-20" />}
                color="text-amber-600"
              />
              <StatCard
                label={t('campaignReport.unsubscribed')}
                value={data.unsubscribed}
                total={data.totalSent}
                icon={<UserMinus className="h-7 w-7 text-error opacity-20" />}
                color="text-error"
              />
            </div>

            {/* Section A/B Test */}
            {data.abReport && (
              <div className="rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm space-y-6">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">
                    Test A/B
                  </p>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-on-surface">Résultats du test A/B</h2>
                    {data.abReport.winner ? (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                        Variante {data.abReport.winner} gagnante
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                        En cours…
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(['A', 'B'] as const).map((variant) => {
                    const stats =
                      variant === 'A' ? data.abReport!.variantA : data.abReport!.variantB;
                    const subject =
                      variant === 'A' ? data.abReport!.subjectA : data.abReport!.subjectB;
                    const isWinner = data.abReport!.winner === variant;
                    return (
                      <div
                        key={variant}
                        className={`rounded-2xl p-5 border-2 transition-all ${
                          isWinner
                            ? 'border-green-400 bg-green-50'
                            : 'border-outline-variant/20 bg-surface-container-low'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${variant === 'A' ? 'bg-primary' : 'bg-secondary'}`}
                            >
                              {variant}
                            </span>
                            <p className="font-bold text-on-surface text-sm">Variante {variant}</p>
                          </div>
                          {isWinner && <span className="text-green-600 text-lg">✓</span>}
                        </div>
                        <p
                          className="text-xs text-on-surface-variant italic mb-3 truncate"
                          title={subject}
                        >
                          {subject || "(pas d'objet)"}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Envoyés</span>
                            <strong>{stats.sent.toLocaleString('fr-FR')}</strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Ouvertures</span>
                            <strong>
                              {stats.opened}{' '}
                              <span className="text-xs font-normal text-on-surface-variant">
                                ({stats.openRate.toFixed(1)}%)
                              </span>
                            </strong>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-on-surface-variant">Clics</span>
                            <strong>
                              {stats.clicked}{' '}
                              <span className="text-xs font-normal text-on-surface-variant">
                                ({stats.clickRate.toFixed(1)}%)
                              </span>
                            </strong>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          <div>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-on-surface-variant">Taux d'ouverture</span>
                              <span className="font-bold text-primary">
                                {stats.openRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-outline-variant/20">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${Math.min(100, stats.openRate * 2)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-on-surface-variant">Taux de clic</span>
                              <span className="font-bold text-secondary">
                                {stats.clickRate.toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-outline-variant/20">
                              <div
                                className="h-full rounded-full bg-secondary transition-all"
                                style={{ width: `${Math.min(100, stats.clickRate * 5)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!data.abReport.winner && (
                  <p className="text-xs text-on-surface-variant">
                    Le gagnant sera désigné automatiquement une fois la période de test terminée.
                  </p>
                )}
              </div>
            )}

            {/* Contacts ayant ouvert / cliqué */}
            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
              <ContactTable
                title={t('campaignReport.contactsOpened')}
                items={data.contactsOpened}
                color="text-success"
              />
              <ContactTable
                title={t('campaignReport.contactsClicked')}
                items={data.contactsClicked}
                color="text-secondary"
              />
            </div>

            {data.clickHeat.length > 0 && (
              <div className="rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">
                  {t('campaignReport.engagement')}
                </p>
                <h2 className="text-xl font-bold text-on-surface mb-4">
                  {t('campaignReport.clickHeatmap')}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {data.clickHeat.map((z) => {
                    const maxClicks = Math.max(...data.clickHeat.map((x) => x.clickCount), 1);
                    const pct = ((z.clickCount / maxClicks) * 100).toFixed(0);
                    return (
                      <div
                        key={z.zone}
                        className="rounded-2xl border border-outline-variant/20 p-4"
                      >
                        <p className="text-sm font-semibold text-on-surface">{z.zone}</p>
                        <p className="text-2xl font-bold text-secondary mt-1">{z.clickCount}</p>
                        <div className="mt-2 h-1.5 rounded-full bg-outline-variant/20 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-secondary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="flex h-64 items-center justify-center text-on-surface-variant">
            {t('campaignReport.loadingReport')}
          </div>
        )}
      </div>
    </div>
  );
}

function ContactTable({
  title,
  items,
  color,
}: {
  title: string;
  items: ReportData['contactsOpened'];
  color: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
      <h2 className={`text-xl font-bold ${color} mb-4`}>{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">
          {t('campaignReport.noContact')}
        </p>
      ) : (
        <div className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-3 gap-3">
              <div>
                <p className="text-sm font-semibold text-on-surface">
                  {`${item.contact.firstName ?? ''} ${item.contact.lastName ?? ''}`.trim() ||
                    item.contact.email}
                </p>
                <p className="text-xs text-on-surface-variant">{item.contact.email}</p>
              </div>
              <p className="text-xs text-on-surface-variant whitespace-nowrap">
                {new Date(item.createdAt).toLocaleString('fr-FR')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
