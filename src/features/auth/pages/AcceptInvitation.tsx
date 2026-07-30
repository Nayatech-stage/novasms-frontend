import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { toast } from 'sonner';

type InvitationInfo = {
  email: string;
  role: 'Admin' | 'Editor' | 'Analyst';
  companyName: string;
};

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Administrateur',
  Editor: 'Éditeur',
  Analyst: 'Analyste',
};

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError('Lien invalide.');
      return;
    }
    api
      .get<InvitationInfo>(`/auth/invitation?token=${token}`)
      .then((r) => setInfo(r.data))
      .catch(() => setLoadError('Ce lien est invalide ou a expiré.'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    try {
      setSubmitting(true);
      await api.post('/auth/invitation/accept', { token, password });
      toast.success('Compte créé ! Vous pouvez maintenant vous connecter.');
      navigate('/login');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || "Impossible d'accepter l'invitation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
        }}
      >
        <div
          className="card"
          style={{ maxWidth: 400, width: '100%', padding: 32, textAlign: 'center' }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)', marginBottom: 8 }}>
            Lien invalide
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>{loadError}</div>
          <button
            className="btn-primary"
            onClick={() => navigate('/login')}
            style={{ width: '100%' }}
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--surface)',
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 420, width: '100%', padding: 32 }}>
        {/* Logo + titre */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 48,
              height: 48,
              background: 'var(--brand-light)',
              borderRadius: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 12,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="8" cy="8" r="4" fill="var(--brand)" />
              <path
                d="M2 20c0-3 2.7-5 6-5s6 2 6 5"
                stroke="var(--brand)"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />
              <circle cx="16" cy="8" r="3" fill="var(--brand-teal)" />
              <path
                d="M13 20c0-2.5 1.5-4 3-4"
                stroke="var(--brand-teal)"
                strokeWidth="1.4"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
            Rejoindre {info.companyName}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
            Vous avez été invité en tant que{' '}
            <span
              style={{
                fontWeight: 600,
                color: 'var(--brand-teal)',
                background: 'var(--brand-light)',
                padding: '1px 7px',
                borderRadius: 20,
              }}
            >
              {ROLE_LABELS[info.role] ?? info.role}
            </span>
          </div>
        </div>

        {/* Email en lecture seule */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>Adresse email</div>
          <div
            style={{
              padding: '9px 12px',
              background: 'var(--muted)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--text-1)',
              border: '1px solid var(--border)',
            }}
          >
            {info.email}
          </div>
        </div>

        {/* Formulaire mot de passe */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
              Choisissez un mot de passe
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8 caractères minimum"
                autoFocus
                required
                style={{ paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-3)',
                  fontSize: 13,
                }}
              >
                {showPwd ? '🙈' : '👁️'}
              </button>
            </div>
            {password.length > 0 && (
              <div
                style={{
                  fontSize: 10.5,
                  marginTop: 4,
                  color: password.length >= 8 ? '#16a34a' : '#dc2626',
                }}
              >
                {password.length >= 8
                  ? '✓ Longueur suffisante'
                  : `${8 - password.length} caractère(s) manquant(s)`}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
              Confirmer le mot de passe
            </div>
            <input
              type={showPwd ? 'text' : 'password'}
              className="input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Répétez le mot de passe"
              required
            />
            {confirm.length > 0 && (
              <div
                style={{
                  fontSize: 10.5,
                  marginTop: 4,
                  color: confirm === password ? '#16a34a' : '#dc2626',
                }}
              >
                {confirm === password
                  ? '✓ Les mots de passe correspondent'
                  : 'Les mots de passe ne correspondent pas'}
              </div>
            )}
          </div>

          <div className="divider" />

          {/* Permissions du rôle */}
          <div
            style={{
              background: 'var(--muted)',
              borderRadius: 8,
              padding: '10px 12px',
              fontSize: 11.5,
              color: 'var(--text-2)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}>
              Votre rôle — {ROLE_LABELS[info.role] ?? info.role}
            </div>
            {info.role === 'Admin' && (
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Accès complet aux campagnes et paramètres</li>
                <li>Gestion de l'équipe et de la facturation</li>
              </ul>
            )}
            {info.role === 'Editor' && (
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Créer et modifier des campagnes</li>
                <li>Gérer les segments et les contacts</li>
              </ul>
            )}
            {info.role === 'Analyst' && (
              <ul style={{ margin: 0, paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Consultation des rapports et analytics</li>
                <li>Export des données (lecture seule)</li>
              </ul>
            )}
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={submitting || password.length < 8 || password !== confirm}
            style={{ width: '100%', marginTop: 4 }}
          >
            {submitting ? 'Création du compte…' : 'Créer mon compte et rejoindre'}
          </button>
        </form>
      </div>
    </div>
  );
}
