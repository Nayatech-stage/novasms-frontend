import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Mail,
  MousePointerClick,
  AlertTriangle,
  UserMinus,
  Users,
} from 'lucide-react';
import api from '@/api/axios';

interface ReportData {
  campaign: { id: string; name: string };
  totalSent: number;
  opened: number;
  clicked: number;
  bounced: number;
  unsubscribed: number;
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
  const pct = total ? ((value / total) * 100).toFixed(1) : '0.0';
  return (
    <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
            {label}
          </p>
          <p className={`mt-2 text-3xl font-bold ${color}`}>{value.toLocaleString('fr-FR')}</p>
          <p className="text-xs text-on-surface-variant">{pct}% du total</p>
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

  return (
    <div className="min-h-screen bg-[#f7f9f7] p-4 sm:p-6">
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
                Analyse de campagne
              </p>
              <h1 className="text-2xl font-bold text-secondary">
                {loading ? 'Chargement…' : (data?.campaign.name ?? 'Rapport')}
              </h1>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-xl border border-outline-variant/30 bg-white px-4 py-2 text-sm font-semibold text-secondary hover:border-primary/40 hover:text-primary transition"
          >
            <Download className="h-4 w-4" /> Exporter CSV
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-semibold text-amber-700">
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-sm col-span-1 flex flex-col items-start justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">
                  Total envoyé
                </p>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-bold text-on-surface">
                    {data.totalSent.toLocaleString('fr-FR')}
                  </span>
                  <Users className="h-6 w-6 text-on-surface-variant opacity-30 mb-1" />
                </div>
              </div>
              <StatCard
                label="Ouverts"
                value={data.opened}
                total={data.totalSent}
                icon={<Mail className="h-7 w-7 text-success opacity-20" />}
                color="text-success"
              />
              <StatCard
                label="Clics"
                value={data.clicked}
                total={data.totalSent}
                icon={<MousePointerClick className="h-7 w-7 text-secondary opacity-20" />}
                color="text-secondary"
              />
              <StatCard
                label="Bounces"
                value={data.bounced}
                total={data.totalSent}
                icon={<AlertTriangle className="h-7 w-7 text-amber-500 opacity-20" />}
                color="text-amber-600"
              />
              <StatCard
                label="Désinscrits"
                value={data.unsubscribed}
                total={data.totalSent}
                icon={<UserMinus className="h-7 w-7 text-error opacity-20" />}
                color="text-error"
              />
            </div>

            {/* Contacts ayant ouvert / cliqué */}
            <div className="grid gap-6 lg:grid-cols-2">
              <ContactTable
                title="Contacts ayant ouvert"
                items={data.contactsOpened}
                color="text-success"
              />
              <ContactTable
                title="Contacts ayant cliqué"
                items={data.contactsClicked}
                color="text-secondary"
              />
            </div>

            {data.clickHeat.length > 0 && (
              <div className="rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant mb-1">
                  Engagement
                </p>
                <h2 className="text-xl font-bold text-on-surface mb-4">
                  Heatmap des zones de clic
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
            Chargement du rapport…
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
  return (
    <div className="rounded-3xl border border-outline-variant/20 bg-white p-6 shadow-sm">
      <h2 className={`text-xl font-bold ${color} mb-4`}>{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant py-4 text-center">Aucun contact</p>
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
