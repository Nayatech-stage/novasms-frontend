import { useEffect, useState, useCallback } from 'react';
import api from '@/api/axios';

interface AuditUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuditEntry {
  id: string;
  action: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userId: string | null;
  user: AuditUser | null;
}

interface AuditLogsResponse {
  data: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Connexion',
  register: 'Inscription',
  logout: 'Déconnexion',
  password_change: 'Changement de mot de passe',
  '2fa_enabled': '2FA activé',
  '2fa_disabled': '2FA désactivé',
  campaign_created: 'Campagne créée',
  campaign_sent: 'Campagne envoyée',
  campaign_deleted: 'Campagne supprimée',
  contact_imported: 'Contacts importés',
  team_invite: 'Invitation équipe',
  team_remove: 'Membre retiré',
  settings_updated: 'Paramètres modifiés',
  profile_updated: 'Profil modifié',
  recharge_visa: 'Rechargement Visa',
  recharge_mobile: 'Rechargement Mobile Money',
};

function actionLabel(action: string | null): string {
  if (!action) return '—';
  return ACTION_LABELS[action] ?? action;
}

function actionColor(action: string | null): string {
  if (!action) return 'var(--text-3)';
  if (action.includes('delete') || action.includes('remove')) return '#dc2626';
  if (action.includes('login') || action.includes('register')) return '#2563eb';
  if (action.includes('sent') || action.includes('recharge')) return '#16a34a';
  if (action.includes('2fa')) return '#9333ea';
  return 'var(--text-2)';
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AuditLogs() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        ...(search ? { action: search } : {}),
      });
      const res = await api.get<AuditLogsResponse>(`/audit-logs?${params.toString()}`);
      setEntries(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } catch {
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div className="content">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>
            Journal d'audit
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '4px 0 0' }}>
            {total.toLocaleString('fr-FR')} événements enregistrés
          </p>
        </div>

        {/* Filtre par action */}
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Filtrer par action…"
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              fontSize: 13,
              color: 'var(--text-1)',
              outline: 'none',
              width: 220,
            }}
          />
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand-primary)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Filtrer
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setSearchInput('');
                setPage(1);
              }}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                fontSize: 13,
                cursor: 'pointer',
                color: 'var(--text-2)',
              }}
            >
              ✕
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}
      >
        {isLoading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-2)', fontSize: 14 }}>
            Chargement…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>
              {search ? 'Aucun événement pour ce filtre.' : "Aucun événement d'audit enregistré."}
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                {['Date', 'Action', 'Utilisateur', 'IP', 'Détails'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-2)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <>
                  <tr
                    key={entry.id}
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    style={{
                      borderBottom: i < entries.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      background: expanded === entry.id ? 'var(--muted)' : 'transparent',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--muted)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        expanded === entry.id ? 'var(--muted)' : 'transparent';
                    }}
                  >
                    <td
                      style={{
                        padding: '12px 16px',
                        fontSize: 12.5,
                        color: 'var(--text-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(entry.createdAt)}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          background: `${actionColor(entry.action)}18`,
                          color: actionColor(entry.action),
                        }}
                      >
                        {actionLabel(entry.action)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-1)' }}>
                      {entry.user ? (
                        `${entry.user.firstName ?? ''} ${entry.user.lastName ?? ''}`.trim() ||
                        entry.user.email
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>Compte principal</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: '12px 16px',
                        fontSize: 12.5,
                        color: 'var(--text-2)',
                        fontFamily: 'monospace',
                      }}
                    >
                      {entry.ipAddress ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12.5, color: 'var(--text-3)' }}>
                      {entry.details ? '▼ voir' : '—'}
                    </td>
                  </tr>
                  {expanded === entry.id && (
                    <tr key={`${entry.id}-detail`} style={{ background: 'var(--muted)' }}>
                      <td colSpan={5} style={{ padding: '0 16px 14px 16px' }}>
                        <div
                          style={{
                            background: 'var(--surface)',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            padding: 12,
                          }}
                        >
                          {entry.details && (
                            <div style={{ marginBottom: 8 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 600,
                                  color: 'var(--text-2)',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.06em',
                                }}
                              >
                                Détails
                              </span>
                              <pre
                                style={{
                                  margin: '6px 0 0',
                                  fontSize: 11.5,
                                  color: 'var(--text-1)',
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-all',
                                }}
                              >
                                {JSON.stringify(entry.details, null, 2)}
                              </pre>
                            </div>
                          )}
                          {entry.userAgent && (
                            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-2)' }}>
                              <strong>User-Agent :</strong> {entry.userAgent}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: page === 1 ? 'var(--muted)' : 'var(--surface)',
              color: page === 1 ? 'var(--text-3)' : 'var(--text-1)',
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            ← Précédent
          </button>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: page === totalPages ? 'var(--muted)' : 'var(--surface)',
              color: page === totalPages ? 'var(--text-3)' : 'var(--text-1)',
              cursor: page === totalPages ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
