import { useEffect, useState, useCallback } from 'react';
import api from '@/api/axios';
import { toast } from 'sonner';

interface ProviderHealth {
  providerType: string;
  primary: string;
  secondary?: string;
  config: Record<string, boolean | string>;
}

interface ProvidersHealthResponse {
  status: string;
  timestamp: string;
  providers: {
    email: ProviderHealth;
    sms: ProviderHealth;
  };
}

function Badge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 10px',
        borderRadius: 999,
        fontSize: 11.5,
        fontWeight: 600,
        background: ok ? '#d1fae5' : '#fee2e2',
        color: ok ? '#065f46' : '#991b1b',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: ok ? '#10b981' : '#ef4444',
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

function ProviderCard({
  title,
  icon,
  health,
}: {
  title: string;
  icon: string;
  health: ProviderHealth | undefined;
}) {
  if (!health) {
    return (
      <div className="card" style={{ padding: '20px 22px' }}>
        <div style={{ color: 'var(--text-2)', fontSize: 13 }}>Chargement…</div>
      </div>
    );
  }

  const configEntries = Object.entries(health.config);

  return (
    <div
      className="card"
      style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-2)', marginTop: 2 }}>
              Fournisseur principal : <strong>{health.primary}</strong>
              {health.secondary && health.secondary !== 'mock' && (
                <>
                  {' '}
                  · Fallback : <strong>{health.secondary}</strong>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge
          ok={health.primary !== 'mock'}
          label={health.primary !== 'mock' ? 'Configuré' : 'Mode test'}
        />
      </div>

      {/* Config details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {configEntries.map(([key, value]) => {
          const isFlag = typeof value === 'boolean';
          const label = key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s) => s.toUpperCase())
            .replace('Api Key', 'Clé API')
            .replace('Configured', '');
          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'var(--muted)',
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: 12.5, color: 'var(--text-1)' }}>{label}</span>
              {isFlag ? (
                <Badge ok={value as boolean} label={value ? 'OK' : 'Manquant'} />
              ) : (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
                  {String(value)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Integrations() {
  const [data, setData] = useState<ProvidersHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get<ProvidersHealthResponse>('/providers/health');
      setData(res.data);
      setLastChecked(new Date());
    } catch {
      if (!silent) toast.error("Impossible de contacter l'API providers/health");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
  }, [fetchHealth]);

  const handleTest = async () => {
    setTesting(true);
    await fetchHealth();
    setTesting(false);
    toast.success('Statut des intégrations mis à jour');
  };

  const overallOk =
    data?.providers.email.primary !== 'mock' && data?.providers.sms.primary !== 'mock';

  return (
    <div className="content">
      {/* Header */}
      <div className="card" style={{ padding: '13px 16px', marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-12">
            <div
              style={{
                width: 36,
                height: 36,
                background: '#e0edef',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🔌
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                Intégrations & Fournisseurs
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-2)' }}>
                Statut en temps réel de vos fournisseurs d'envoi Email et SMS
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastChecked && (
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>
                Vérifié à{' '}
                {lastChecked.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {data && (
              <Badge ok={overallOk} label={overallOk ? 'Tous opérationnels' : 'Action requise'} />
            )}
            <button
              onClick={() => void handleTest()}
              disabled={testing || loading}
              style={{
                padding: '7px 14px',
                background: 'var(--primary)',
                color: '#fff',
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                cursor: testing || loading ? 'not-allowed' : 'pointer',
                opacity: testing || loading ? 0.6 : 1,
                border: 'none',
              }}
            >
              {testing ? 'Test en cours…' : '↻ Tester les connexions'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)', fontSize: 13 }}>
          Chargement du statut des intégrations…
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <ProviderCard title="Fournisseur Email" icon="✉️" health={data?.providers.email} />
          <ProviderCard title="Fournisseur SMS" icon="📱" health={data?.providers.sms} />
        </div>
      )}
    </div>
  );
}
