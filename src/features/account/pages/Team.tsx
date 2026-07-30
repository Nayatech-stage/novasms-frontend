import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/api/axios';
import { toast } from 'sonner';

type TeamRole = 'Admin' | 'Editor' | 'Analyst';

type TeamMember = {
  id: string;
  email: string;
  role: TeamRole;
  lastLogin: string | null;
};

type Invitation = {
  id: string;
  email: string;
  role: TeamRole;
  status: string;
  expiresAt: string;
};

type ChannelStat = {
  channel: string;
  totalCost: number;
  totalContacts: number;
  operationCount: number;
};
type SourceStat = { source: string; totalCost: number; operationCount: number };
type MemberStat = {
  userId: string | null;
  user: { id: string; email: string; firstName: string | null; lastName: string | null } | null;
  totalCost: number;
  operationCount: number;
};
type SpendingSummary = {
  monthTotal: number;
  byChannel: ChannelStat[];
  bySource: SourceStat[];
  byMember: MemberStat[];
};

const ROLE_LABELS: Record<TeamRole, string> = {
  Admin: 'Admin',
  Editor: 'Éditeur',
  Analyst: 'Analyste',
};

const ROLE_COLORS: Record<TeamRole, { bg: string; color: string }> = {
  Admin: { bg: 'var(--brand-light)', color: 'var(--brand-text)' },
  Editor: { bg: '#e0edef', color: '#0c5460' },
  Analyst: { bg: '#f0f0ff', color: '#4338ca' },
};

const ROLE_COPY: Record<TeamRole, { description: string; permissions: string[] }> = {
  Admin: {
    description: 'Accès complet aux campagnes, facturation et paramètres.',
    permissions: [
      'Créer / supprimer campagnes',
      'Inviter des membres',
      'Modifier les rôles',
      'Accès facturation',
    ],
  },
  Editor: {
    description: 'Conçoit et publie les campagnes, segments et contenus.',
    permissions: [
      'Créer des campagnes',
      'Modifier les contenus',
      'Gérer les segments',
      'Lancer des tests A/B',
    ],
  },
  Analyst: {
    description: 'Lecture seule sur les performances et les analytics.',
    permissions: [
      'Voir les rapports',
      'Consulter les analytics',
      'Exporter les données',
      'Aucune modification',
    ],
  },
};

function Avatar({ email, size = 32 }: { email: string; size?: number }) {
  const initials = email.substring(0, 2).toUpperCase();
  const colors = ['#2ec80a', '#0c5460', '#aaee22', '#d97706', '#6366f1'];
  const bg = colors[email.charCodeAt(0) % colors.length];
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color: 'white',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

export default function Team() {
  const currentUser = useAuthStore((state) => state.user);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('Editor');
  const [inviting, setInviting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [spending, setSpending] = useState<SpendingSummary | null>(null);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await api.get<{
        success: boolean;
        users: TeamMember[];
        invitations: Invitation[];
      }>('/account/team');
      setMembers(res.data.users || []);
      setInvitations(res.data.invitations || []);
    } catch {
      toast.error("Impossible de charger l'équipe");
    } finally {
      setLoading(false);
    }
  };

  const loadSpending = async () => {
    if (currentUser?.role !== 'Admin') return;
    try {
      const res = await api.get<SpendingSummary>('/account/credit-usage/summary');
      setSpending(res.data);
    } catch {
      // non-bloquant si l'utilisateur n'est pas admin
    }
  };

  useEffect(() => {
    void loadTeam();
    void loadSpending();
  }, []);

  const pendingInvites = useMemo(
    () => invitations.filter((inv) => inv.status === 'Sent'),
    [invitations],
  );

  const roleCounts = useMemo(
    () =>
      (['Admin', 'Editor', 'Analyst'] as TeamRole[]).map((role) => ({
        role,
        count: members.filter((m) => m.role === role).length,
      })),
    [members],
  );

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      toast.error('Email invalide');
      return;
    }
    try {
      setInviting(true);
      await api.post('/account/team/invite', { email: inviteEmail.trim(), role: inviteRole });
      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('Editor');
      setShowModal(false);
      await loadTeam();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Impossible d'envoyer l'invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Révoquer l'accès de ce membre ?")) return;
    setRevoking(userId);
    try {
      await api.delete(`/account/team/${userId}`);
      toast.success('Accès révoqué');
      await loadTeam();
    } catch {
      toast.error("Impossible de révoquer l'accès");
    } finally {
      setRevoking(null);
    }
  };

  const handleCancelInvite = async (invId: string) => {
    setCancelling(invId);
    try {
      await api.delete(`/account/team/invitations/${invId}`);
      toast.success('Invitation annulée');
      await loadTeam();
    } catch {
      toast.error("Impossible d'annuler l'invitation");
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="content">
      {/* Header */}
      <div className="card" style={{ padding: '13px 16px' }}>
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
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="#0c5460"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="5" cy="5" r="2.5" />
                <path d="M1 14c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" />
                <circle cx="11.5" cy="5" r="2" />
                <path d="M14.5 14c0-1.7-1.3-3-3-3" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                Gestion de l'équipe
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>
                {members.length} membre{members.length > 1 ? 's' : ''} · {pendingInvites.length}{' '}
                invitation{pendingInvites.length > 1 ? 's' : ''} en attente
              </div>
            </div>
          </div>
          <button
            className="btn-primary"
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 13 13"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M6.5 1v11M1 6.5h11" />
            </svg>
            Inviter un membre
          </button>
        </div>
      </div>

      {/* Compteurs par rôle */}
      <div className="kpi-grid">
        {roleCounts.map(({ role, count }) => (
          <div key={role} className="kpi">
            <div className="kpi-label">{ROLE_LABELS[role as TeamRole]}s</div>
            <div className="kpi-value">{count}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
              {ROLE_COPY[role as TeamRole].description.slice(0, 42)}…
            </div>
          </div>
        ))}
        <div className="kpi">
          <div className="kpi-label">Invitations en attente</div>
          <div className="kpi-value">{pendingInvites.length}</div>
          <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
            Expire après 7 jours
          </div>
        </div>
      </div>

      {/* Membres actifs */}
      <div className="card">
        <div className="flex items-center justify-between mb-12">
          <div className="card-title">Membres actifs</div>
          <span className="chip">
            {members.length} membre{members.length > 1 ? 's' : ''}
          </span>
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-2)', fontSize: 12 }}>
            Chargement…
          </div>
        ) : members.length === 0 ? (
          <div
            style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-2)', fontSize: 12 }}
          >
            Aucun membre dans l'équipe.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Membre</th>
                <th>Rôle</th>
                <th>Dernière connexion</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>
                    <div className="flex items-center gap-8">
                      <Avatar email={m.email} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>
                          {m.email}
                        </div>
                        {m.id === currentUser?.id && (
                          <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>
                            Vous
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 500,
                        ...ROLE_COLORS[m.role],
                      }}
                    >
                      {ROLE_LABELS[m.role]}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-2)', fontSize: 12 }}>
                    {m.lastLogin ? (
                      new Date(m.lastLogin).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    ) : (
                      <span style={{ color: 'var(--text-3)' }}>Jamais connecté</span>
                    )}
                  </td>
                  <td>
                    {m.id !== currentUser?.id ? (
                      <button
                        onClick={() => handleRevoke(m.id)}
                        disabled={revoking === m.id}
                        className="btn-sm btn-danger"
                        style={{ fontSize: 11 }}
                      >
                        {revoking === m.id ? '…' : 'Révoquer'}
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Invitations en attente */}
      {pendingInvites.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Invitations en attente</div>
            <span className="chip">{pendingInvites.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingInvites.map((inv) => (
              <div
                key={inv.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--muted)',
                  borderRadius: 8,
                }}
              >
                <div className="flex items-center gap-12">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: '#e0edef',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                    >
                      <rect x="1" y="3" width="12" height="9" rx="1" />
                      <path d="M1 5l6 4 6-4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>
                      {inv.email}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                      {ROLE_LABELS[inv.role]} · Expire le{' '}
                      {new Date(inv.expiresAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'long',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-8">
                  <span
                    style={{
                      fontSize: 10,
                      background: '#fffbeb',
                      color: '#92400e',
                      border: '0.5px solid #fcd34d',
                      borderRadius: 20,
                      padding: '2px 8px',
                    }}
                  >
                    En attente
                  </span>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancelling === inv.id}
                    className="btn-sm"
                    style={{ color: '#dc2626' }}
                  >
                    {cancelling === inv.id ? '…' : 'Annuler'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dépenses du mois — admin seulement */}
      {currentUser?.role === 'Admin' && spending && (
        <div className="card">
          <div className="flex items-center justify-between mb-12">
            <div className="card-title">Dépenses ce mois</div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--brand)' }}>
              {spending.monthTotal.toLocaleString('fr-FR')} FCFA
            </span>
          </div>

          {/* Par canal */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Par canal
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {spending.byChannel.map((c) => (
                <div
                  key={c.channel}
                  style={{
                    flex: '1 1 120px',
                    background: 'var(--muted)',
                    borderRadius: 10,
                    padding: '10px 14px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-3)',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {c.channel}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                    {c.totalCost.toLocaleString('fr-FR')} FCFA
                  </div>
                  <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>
                    {c.operationCount} envoi{c.operationCount > 1 ? 's' : ''} ·{' '}
                    {c.totalContacts.toLocaleString('fr-FR')} contacts
                  </div>
                </div>
              ))}
              {spending.byChannel.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
                  Aucune dépense enregistrée
                </span>
              )}
            </div>
          </div>

          {/* Par source */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: 'var(--text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 8,
              }}
            >
              Par source
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {spending.bySource.map((s) => {
                const srcLabel: Record<string, string> = {
                  CAMPAIGN: 'Campagnes',
                  AUTOMATION: 'Automatisations',
                  API: 'API publique',
                };
                return (
                  <div
                    key={s.source}
                    style={{
                      flex: '1 1 120px',
                      background: 'var(--muted)',
                      borderRadius: 10,
                      padding: '10px 14px',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text-3)',
                        textTransform: 'uppercase',
                        marginBottom: 4,
                      }}
                    >
                      {srcLabel[s.source] ?? s.source}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
                      {s.totalCost.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-2)', marginTop: 2 }}>
                      {s.operationCount} opération{s.operationCount > 1 ? 's' : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Par membre */}
          {spending.byMember.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: 'var(--text-3)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                }}
              >
                Par membre
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {spending.byMember.map((m) => {
                  const name = m.user
                    ? [m.user.firstName, m.user.lastName].filter(Boolean).join(' ') || m.user.email
                    : 'Membre inconnu';
                  return (
                    <div
                      key={m.userId ?? 'anon'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'var(--muted)',
                        borderRadius: 8,
                      }}
                    >
                      <div className="flex items-center gap-8">
                        {m.user && <Avatar email={m.user.email} size={28} />}
                        <div>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>
                            {name}
                          </div>
                          <div style={{ fontSize: 10.5, color: 'var(--text-2)' }}>
                            {m.operationCount} envoi{m.operationCount > 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>
                        {m.totalCost.toLocaleString('fr-FR')} FCFA
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Carte rôles & permissions */}
      <div className="card">
        <div className="card-title mb-12">Rôles et permissions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 10 }}>
          {(['Admin', 'Editor', 'Analyst'] as TeamRole[]).map((role) => (
            <div
              key={role}
              style={{ padding: '14px', background: 'var(--muted)', borderRadius: 10 }}
            >
              <div className="flex items-center gap-8 mb-8">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 20,
                    fontSize: 11,
                    fontWeight: 600,
                    ...ROLE_COLORS[role],
                  }}
                >
                  {ROLE_LABELS[role]}
                </span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 10 }}>
                {ROLE_COPY[role].description}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {ROLE_COPY[role].permissions.map((perm) => (
                  <div
                    key={perm}
                    className="flex items-center gap-8"
                    style={{ fontSize: 11, color: 'var(--text-1)' }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="4.5" fill={ROLE_COLORS[role].bg} />
                      <polyline
                        points="2.5,5 4.2,6.5 7.5,3.5"
                        fill="none"
                        stroke={ROLE_COLORS[role].color}
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {perm}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal invitation */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div className="card" style={{ width: 400, padding: 24 }}>
            <div className="flex items-center justify-between mb-12">
              <div className="card-title">Inviter un membre</div>
              <button
                onClick={() => setShowModal(false)}
                className="btn-ghost"
                style={{ fontSize: 18, color: 'var(--text-3)' }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
                  Adresse email
                </div>
                <input
                  type="email"
                  className="input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@exemple.com"
                  onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                  autoFocus
                />
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
                  Rôle attribué
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['Admin', 'Editor', 'Analyst'] as TeamRole[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => setInviteRole(r)}
                      style={{
                        flex: 1,
                        padding: '7px 0',
                        border: `1.5px solid ${inviteRole === r ? ROLE_COLORS[r].color : 'var(--border-md)'}`,
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: inviteRole === r ? 600 : 400,
                        background: inviteRole === r ? ROLE_COLORS[r].bg : 'transparent',
                        color: inviteRole === r ? ROLE_COLORS[r].color : 'var(--text-2)',
                        cursor: 'pointer',
                      }}
                    >
                      {ROLE_LABELS[r]}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 6 }}>
                  {ROLE_COPY[inviteRole].description}
                </div>
              </div>
              <div className="divider" />
              <div className="flex gap-8">
                <button
                  className="btn-outline"
                  onClick={() => setShowModal(false)}
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
                <button
                  className="btn-primary"
                  onClick={handleInvite}
                  disabled={inviting}
                  style={{ flex: 1 }}
                >
                  {inviting ? 'Envoi…' : "Envoyer l'invitation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
