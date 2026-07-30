import { useEffect, useState } from 'react';
import api from '@/api/axios';

interface HealthCheck {
  status: 'ok' | 'error';
}

interface StatusResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
  uptime: number;
  checks: {
    database: HealthCheck;
    redis: HealthCheck;
  };
  providers: {
    email?: { configured: boolean };
    sms?: { configured: boolean };
  };
}

function StatusBadge({ status }: { status: 'ok' | 'error' | 'degraded' | 'loading' }) {
  const colors: Record<string, string> = {
    ok: 'bg-emerald-100 text-emerald-700',
    degraded: 'bg-amber-100 text-amber-700',
    error: 'bg-red-100 text-red-700',
    loading: 'bg-gray-100 text-gray-500',
  };
  const labels: Record<string, string> = {
    ok: 'Opérationnel',
    degraded: 'Dégradé',
    error: 'Erreur',
    loading: 'Vérification…',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          status === 'ok'
            ? 'bg-emerald-500'
            : status === 'degraded'
              ? 'bg-amber-500'
              : status === 'error'
                ? 'bg-red-500'
                : 'bg-gray-400'
        }`}
      />
      {labels[status]}
    </span>
  );
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d > 0) parts.push(`${d}j`);
  if (h > 0) parts.push(`${h}h`);
  parts.push(`${m}min`);
  return parts.join(' ');
}

export default function StatusPage() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get<StatusResponse>('/status');
      setData(res.data);
      setLastCheck(new Date());
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
    const timer = setInterval(() => void fetchStatus(), 30000);
    return () => clearInterval(timer);
  }, []);

  const overallStatus = error ? 'error' : loading ? 'loading' : (data?.status ?? 'error');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black text-gray-900">État de la plateforme</h1>
          <p className="mt-2 text-sm text-gray-500">
            NovaSMS — vérification en temps réel des services
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
              Statut global
            </p>
            <p className="mt-1 text-xl font-black text-gray-900">NovaSMS API</p>
            {data?.uptime !== undefined && (
              <p className="mt-0.5 text-xs text-gray-400">Uptime : {formatUptime(data.uptime)}</p>
            )}
          </div>
          <StatusBadge status={overallStatus as 'ok' | 'error' | 'degraded' | 'loading'} />
        </div>

        {!loading && !error && data && (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Services</p>

            {[
              { label: 'Base de données', key: 'database' },
              { label: 'Cache Redis', key: 'redis' },
            ].map(({ label, key }) => {
              const check = data.checks[key as keyof typeof data.checks];
              return (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
                >
                  <span className="text-sm font-semibold text-gray-700">{label}</span>
                  <StatusBadge status={check?.status ?? 'error'} />
                </div>
              );
            })}

            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <span className="text-sm font-semibold text-gray-700">Provider Email</span>
              <StatusBadge status={data.providers?.email?.configured ? 'ok' : 'degraded'} />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
              <span className="text-sm font-semibold text-gray-700">Provider SMS</span>
              <StatusBadge status={data.providers?.sms?.configured ? 'ok' : 'degraded'} />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-6 text-center text-sm text-red-700">
            Impossible de joindre l'API. Vérifiez votre connexion ou réessayez.
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => void fetchStatus()}
            className="rounded-full border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
          >
            Actualiser
          </button>
          {lastCheck && (
            <p className="mt-2 text-xs text-gray-400">
              Dernière vérification : {lastCheck.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>

        <div className="mt-10 text-center">
          <a href="/login" className="text-xs text-gray-400 hover:text-gray-600 underline">
            Retour à l'application
          </a>
        </div>
      </div>
    </div>
  );
}
