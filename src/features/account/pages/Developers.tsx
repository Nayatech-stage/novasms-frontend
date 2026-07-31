import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Key,
  Plus,
  Trash2,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { apiKeysApi, type ApiKeyItem, type NewApiKey, type ApiKeyStats } from '@/api/apiKeys';

// Permissions en langage humain → scopes techniques
const PERMISSION_GROUPS = [
  {
    id: 'messaging',
    label: 'Envoyer des SMS et emails',
    description: "Permet à votre site ou application d'envoyer des messages à vos contacts",
    scopes: ['sms:send', 'email:send'],
    defaultChecked: true,
  },
  {
    id: 'contacts',
    label: 'Ajouter et gérer des contacts',
    description: 'Permet de créer ou modifier des contacts dans votre liste',
    scopes: ['contacts:read', 'contacts:write'],
    defaultChecked: true,
  },
  {
    id: 'analytics',
    label: 'Consulter les statistiques',
    description: 'Permet de lire votre solde de crédits et vos statistiques',
    scopes: ['balance:read'],
    defaultChecked: false,
  },
  {
    id: 'campaigns',
    label: 'Lire les campagnes',
    description: 'Permet de consulter vos campagnes existantes',
    scopes: ['campaigns:read'],
    defaultChecked: false,
  },
] as const;

const INTEGRATIONS = [
  {
    name: 'Zapier',
    description: 'Reliez NovaSMS à plus de 6 000 applications sans écrire de code',
    cta: 'Connecter',
    soon: true,
    bgColor: '#FF4A00',
  },
  {
    name: 'Make',
    description: "Créez des scénarios d'automatisation visuels avec NovaSMS",
    cta: 'Ouvrir Make',
    soon: true,
    bgColor: '#6D00CC',
  },
  {
    name: 'WordPress',
    description: 'Installez le plugin NovaSMS en 2 minutes sur votre site WordPress',
    cta: 'Télécharger',
    soon: true,
    bgColor: '#21759B',
  },
  {
    name: 'n8n',
    description: 'Automatisez vos workflows avec cet outil open-source puissant',
    cta: 'Voir la doc',
    soon: true,
    bgColor: '#EA4B71',
  },
];

function PermissionLabel({ scopes }: { scopes: string[] }) {
  const groups = PERMISSION_GROUPS.filter((g) => g.scopes.some((s) => scopes.includes(s)));
  if (groups.length === 0)
    return <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Aucune permission</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {groups.map((g) => (
        <span
          key={g.id}
          style={{
            fontSize: 10,
            background: '#eff6ff',
            color: '#2563eb',
            padding: '2px 7px',
            borderRadius: 12,
            fontWeight: 500,
          }}
        >
          {g.label}
        </span>
      ))}
    </div>
  );
}

function IntegrationIcon({ name, bgColor }: { name: string; bgColor: string }) {
  return (
    <div
      style={{
        width: 36,
        height: 36,
        background: bgColor,
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <span style={{ color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: -0.5 }}>
        {name.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
}

export default function Developers() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Création
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['messaging', 'contacts']);
  const [creating, setCreating] = useState(false);

  // Affichage clé générée
  const [generated, setGenerated] = useState<NewApiKey | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmedCopy, setConfirmedCopy] = useState(false);

  // Envoi développeur
  const [devEmail, setDevEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  // Stats
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statsMap, setStatsMap] = useState<Record<string, ApiKeyStats>>({});
  const [loadingStats, setLoadingStats] = useState<string | null>(null);

  // Révocation
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const loadKeys = useCallback(() => {
    setLoading(true);
    apiKeysApi
      .list()
      .then(setKeys)
      .catch(() => toast.error('Impossible de charger vos clés'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const scopesForGroups = (groups: string[]) =>
    PERMISSION_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => [...g.scopes]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error('Donnez un nom à cette clé');
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error('Sélectionnez au moins une permission');
      return;
    }
    setCreating(true);
    try {
      const scopes = scopesForGroups(selectedGroups);
      const k = await apiKeysApi.create(newName.trim(), scopes);
      setGenerated(k);
      setShowCreate(false);
      setNewName('');
      setSelectedGroups(['messaging', 'contacts']);
      setConfirmedCopy(false);
      setEmailSent(false);
      setDevEmail('');
      loadKeys();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = () => {
    if (!generated) return;
    void navigator.clipboard.writeText(generated.key).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  };

  const handleSendToDev = async () => {
    if (!generated || !devEmail.includes('@')) {
      toast.error('Adresse email invalide');
      return;
    }
    setSending(true);
    try {
      await apiKeysApi.sendToDeveloper(devEmail, generated.key, generated.name);
      setEmailSent(true);
      toast.success(`Clé envoyée à ${devEmail}`);
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    if (
      !confirm(
        `Révoquer la clé "${name}" ?\n\nToute application qui l'utilise cessera immédiatement de fonctionner.`,
      )
    )
      return;
    setRevokingId(id);
    try {
      await apiKeysApi.revoke(id);
      toast.success('Clé révoquée — elle ne fonctionne plus');
      loadKeys();
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingId(null);
    }
  };

  const toggleStats = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (statsMap[id]) return;
    setLoadingStats(id);
    try {
      const s = await apiKeysApi.stats(id);
      setStatsMap((p) => ({ ...p, [id]: s }));
    } catch {
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoadingStats(null);
    }
  };

  return (
    <div className="content">
      {/* ── En-tête ── */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 14 }}>
        <div
          className="developers-header-row"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                background: '#eff6ff',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Key size={18} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-1)' }}>
                Clés API
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-2)' }}>
                Permettez à votre site web, application ou outil de communiquer avec NovaSMS
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            disabled={keys.length >= 10}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              cursor: keys.length >= 10 ? 'not-allowed' : 'pointer',
              opacity: keys.length >= 10 ? 0.5 : 1,
            }}
          >
            <Plus size={14} /> Générer une clé
          </button>
        </div>
      </div>

      {/* ── Liste des clés ── */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-2)',
            marginBottom: 14,
            paddingBottom: 10,
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-1)' }}>
            Mes clés actives
          </span>
          <span style={{ fontSize: 11 }}>{keys.length}/10 clés utilisées</span>
        </div>

        {loading ? (
          <div
            style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-2)', fontSize: 13 }}
          >
            Chargement…
          </div>
        ) : keys.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div
              style={{
                width: 52,
                height: 52,
                background: '#f1f5f9',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <Key size={22} color="#94a3b8" />
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              Aucune clé créée
            </p>
            <p
              style={{
                margin: '0 0 16px',
                fontSize: 12,
                color: 'var(--text-2)',
                maxWidth: 280,
                marginInline: 'auto',
              }}
            >
              Créez une clé pour permettre à votre site ou application d'utiliser NovaSMS
            </p>
            <button
              onClick={() => setShowCreate(true)}
              style={{
                padding: '8px 18px',
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Générer ma première clé
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {keys.map((k) => {
              const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
              const stats = statsMap[k.id];
              return (
                <div
                  key={k.id}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                          {k.name}
                        </span>
                        {expired && (
                          <span
                            style={{
                              fontSize: 10,
                              background: '#fee2e2',
                              color: '#b91c1c',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            Expirée
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: 'var(--text-3)',
                          marginBottom: 8,
                        }}
                      >
                        {k.keyPrefix}••••••••••{k.keySuffix}
                      </div>
                      <PermissionLabel scopes={k.permissions} />
                    </div>
                    <div
                      className="api-key-row-actions"
                      style={{
                        textAlign: 'right',
                        fontSize: 11,
                        color: 'var(--text-2)',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        gap: 6,
                      }}
                    >
                      <span>
                        {k.lastUsedAt
                          ? `Utilisée le ${new Date(k.lastUsedAt).toLocaleDateString('fr-FR')}`
                          : 'Jamais utilisée'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => void toggleStats(k.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            background: expandedId === k.id ? '#eff6ff' : 'var(--muted)',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            cursor: 'pointer',
                            color: expandedId === k.id ? '#2563eb' : 'var(--text-2)',
                            fontWeight: 500,
                          }}
                        >
                          <BarChart2 size={11} />
                          {loadingStats === k.id ? '…' : 'Usage'}
                          {expandedId === k.id ? (
                            <ChevronUp size={11} />
                          ) : (
                            <ChevronDown size={11} />
                          )}
                        </button>
                        <button
                          onClick={() => void handleRevoke(k.id, k.name)}
                          disabled={revokingId === k.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                            padding: '5px 10px',
                            background: '#fff0f0',
                            border: 'none',
                            borderRadius: 6,
                            fontSize: 11,
                            cursor: 'pointer',
                            color: '#dc2626',
                            fontWeight: 500,
                          }}
                        >
                          <Trash2 size={11} />
                          {revokingId === k.id ? '…' : 'Révoquer'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {expandedId === k.id && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border)',
                        padding: '14px 16px',
                        background: '#f8fafc',
                      }}
                    >
                      {!stats ? (
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Chargement…</div>
                      ) : (
                        <>
                          <div
                            className="api-key-stats-expanded-grid"
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: 10,
                              marginBottom: 12,
                            }}
                          >
                            {[
                              { v: stats.callsToday, l: "Appels aujourd'hui" },
                              { v: stats.callsThisMonth, l: 'Appels ce mois' },
                              {
                                v:
                                  stats.creditsThisMonth > 0
                                    ? `${stats.creditsThisMonth.toLocaleString('fr-FR')} F`
                                    : '—',
                                l: 'Crédits dépensés',
                              },
                            ].map(({ v, l }) => (
                              <div
                                key={l}
                                style={{
                                  textAlign: 'center',
                                  padding: '10px',
                                  background: '#fff',
                                  borderRadius: 8,
                                  border: '1px solid var(--border)',
                                }}
                              >
                                <div
                                  style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}
                                >
                                  {v}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}>
                                  {l}
                                </div>
                              </div>
                            ))}
                          </div>
                          {stats.recentLogs.length > 0 && (
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  color: 'var(--text-3)',
                                  marginBottom: 6,
                                  textTransform: 'uppercase',
                                  letterSpacing: 0.5,
                                }}
                              >
                                10 derniers appels
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                {stats.recentLogs.map((log, i) => (
                                  <div
                                    key={i}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      fontSize: 11,
                                      padding: '4px 8px',
                                      background: '#fff',
                                      borderRadius: 5,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontSize: 10,
                                        background: log.statusCode < 300 ? '#d1fae5' : '#fee2e2',
                                        color: log.statusCode < 300 ? '#065f46' : '#991b1b',
                                        padding: '1px 5px',
                                        borderRadius: 4,
                                        fontWeight: 700,
                                        minWidth: 32,
                                        textAlign: 'center',
                                      }}
                                    >
                                      {log.statusCode}
                                    </span>
                                    <span
                                      style={{
                                        flex: 1,
                                        fontFamily: 'monospace',
                                        fontSize: 10,
                                        color: 'var(--text-2)',
                                      }}
                                    >
                                      {log.endpoint}
                                    </span>
                                    {Number(log.creditsUsed) > 0 && (
                                      <span style={{ fontSize: 10, color: '#d97706' }}>
                                        {Number(log.creditsUsed)} F
                                      </span>
                                    )}
                                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                                      {new Date(log.createdAt).toLocaleTimeString('fr-FR', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Intégrations sans code ── */}
      <div className="card">
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 4 }}>
            Vous n&apos;avez pas de développeur ?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
            Connectez NovaSMS à vos outils existants sans écrire une seule ligne de code.
          </div>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}
        >
          {INTEGRATIONS.map((intg) => (
            <div
              key={intg.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                border: '1px solid var(--border)',
                borderRadius: 10,
              }}
            >
              <IntegrationIcon name={intg.name} bgColor={intg.bgColor} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}
                >
                  {intg.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.4 }}>
                  {intg.description}
                </div>
              </div>
              {intg.soon ? (
                <span
                  style={{
                    fontSize: 10,
                    background: '#f1f5f9',
                    color: '#64748b',
                    padding: '3px 8px',
                    borderRadius: 20,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Bientôt
                </span>
              ) : (
                <a
                  href="#"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    color: '#2563eb',
                    fontWeight: 600,
                    textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  {intg.cta} <ExternalLink size={10} />
                </a>
              )}
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            padding: '10px 14px',
            background: 'var(--muted)',
            borderRadius: 8,
            fontSize: 12,
            color: 'var(--text-2)',
          }}
        >
          Vous avez un développeur ?{' '}
          <a
            href="https://docs.novasms.app/api"
            target="_blank"
            rel="noreferrer"
            style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
          >
            Documentation technique →
          </a>{' '}
          pour cURL, JavaScript, PHP, Python et plus encore.
        </div>
      </div>

      {/* ══ MODAL : Créer une clé ══ */}
      {showCreate && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 460,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Nouvelle clé API
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#64748b' }}>
              Cette clé permettra à votre site ou application de communiquer avec NovaSMS.
            </p>

            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: 6,
              }}
            >
              Donnez un nom à cette clé pour vous y retrouver
            </label>
            <input
              className="input"
              placeholder="Ex : Mon site e-commerce, Application mobile…"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', marginBottom: 20 }}
              autoFocus
            />

            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#475569',
                display: 'block',
                marginBottom: 10,
              }}
            >
              Que pourra faire cette clé ?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
              {PERMISSION_GROUPS.map((g) => (
                <label
                  key={g.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    cursor: 'pointer',
                    padding: '10px 12px',
                    background: selectedGroups.includes(g.id) ? '#f0f7ff' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${selectedGroups.includes(g.id) ? '#bfdbfe' : 'transparent'}`,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedGroups.includes(g.id)}
                    onChange={(e) =>
                      setSelectedGroups((prev) =>
                        e.target.checked ? [...prev, g.id] : prev.filter((x) => x !== g.id),
                      )
                    }
                    style={{ marginTop: 2, flexShrink: 0 }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{g.label}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      {g.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#475569',
                }}
              >
                Annuler
              </button>
              <button
                onClick={() => void handleCreate()}
                disabled={creating}
                style={{
                  padding: '8px 18px',
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {creating ? 'Création…' : 'Créer la clé'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Clé générée ══ */}
      {generated && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 28,
              width: '100%',
              maxWidth: 500,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  background: '#d1fae5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Key size={15} color="#059669" />
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Votre clé a été créée
              </h2>
            </div>

            <div
              style={{
                margin: '14px 0',
                padding: '10px 14px',
                background: '#fef3c7',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                fontSize: 12,
                color: '#78350f',
                fontWeight: 500,
              }}
            >
              ⚠ Copiez cette clé maintenant. Pour des raisons de sécurité, elle ne sera{' '}
              <strong>plus jamais affichée</strong> après fermeture.
            </div>

            <div
              style={{
                display: 'flex',
                gap: 8,
                background: '#f1f5f9',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 16,
                alignItems: 'center',
              }}
            >
              <code
                style={{
                  flex: 1,
                  fontSize: 12,
                  wordBreak: 'break-all',
                  color: '#0f172a',
                  fontFamily: 'monospace',
                  lineHeight: 1.5,
                }}
              >
                {generated.key}
              </code>
              <button
                onClick={handleCopyKey}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 12px',
                  background: keyCopied ? '#dcfce7' : 'var(--primary)',
                  color: keyCopied ? '#15803d' : '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {keyCopied ? (
                  <>
                    <Check size={12} /> Copié
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copier
                  </>
                )}
              </button>
            </div>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                cursor: 'pointer',
                marginBottom: 20,
              }}
            >
              <input
                type="checkbox"
                checked={confirmedCopy}
                onChange={(e) => setConfirmedCopy(e.target.checked)}
              />
              <span style={{ fontSize: 12, color: '#475569' }}>
                J&apos;ai bien copié et sauvegardé cette clé
              </span>
            </label>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 20 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Mail size={13} /> Envoyer cette clé à votre développeur par email
              </div>
              {emailSent ? (
                <div
                  style={{
                    padding: '10px 14px',
                    background: '#d1fae5',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#065f46',
                    fontWeight: 500,
                  }}
                >
                  ✓ Email envoyé à {devEmail} — votre développeur reçoit la clé et un lien vers la
                  documentation.
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    className="input"
                    placeholder="developpeur@agence.com"
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => void handleSendToDev()}
                    disabled={sending || !devEmail.includes('@')}
                    style={{
                      flexShrink: 0,
                      padding: '7px 14px',
                      background: '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #86efac',
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {sending ? 'Envoi…' : 'Envoyer'}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setGenerated(null)}
              disabled={!confirmedCopy}
              style={{
                width: '100%',
                padding: '10px',
                background: confirmedCopy ? 'var(--primary)' : '#e2e8f0',
                color: confirmedCopy ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: confirmedCopy ? 'pointer' : 'not-allowed',
              }}
            >
              {confirmedCopy ? 'Terminé' : 'Confirmez avoir copié la clé avant de fermer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
