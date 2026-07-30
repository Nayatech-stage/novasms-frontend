import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import api from '@/api/axios';
import { toast } from 'sonner';

interface ProfileData {
  email: string;
  role: string;
  lastLogin: string | null;
  account: {
    id: string;
    companyName: string;
    adminEmail: string;
    country: string;
    creditBalance: number;
    alertThreshold: number | null;
    twoFactorEnabled: boolean;
    onboardingCompleted: boolean;
  };
}

const COUNTRY_MAP: Record<string, string> = {
  CIV: "Côte d'Ivoire",
  SEN: 'Sénégal',
  CMR: 'Cameroun',
  BFA: 'Burkina Faso',
  MLI: 'Mali',
  GIN: 'Guinée',
  TGO: 'Togo',
  BEN: 'Bénin',
  NER: 'Niger',
  GHA: 'Ghana',
  FRA: 'France',
  USA: 'États-Unis',
};

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Administrateur',
  Editor: 'Éditeur',
  Analyst: 'Analyste',
};

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--brand-gradient)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: 'white',
        flexShrink: 0,
      }}
    >
      {initials || '?'}
    </div>
  );
}

export default function Profile() {
  const { user: authUser, logout } = useAuthStore();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit profile form
  const [companyName, setCompanyName] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);

  // Change password form
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await api.get<{ success: boolean; user: ProfileData }>('/account/me');
      setProfile(res.data.user);
      setCompanyName(res.data.user.account.companyName || '');
      setCountry(res.data.user.account.country || '');
    } catch {
      toast.error('Impossible de charger le profil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!companyName.trim()) {
      toast.error('Le nom de la boutique est requis');
      return;
    }
    setSaving(true);
    try {
      await api.patch('/account/profile', { companyName: companyName.trim(), country });
      toast.success('Profil mis à jour');
      await loadProfile();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) {
      toast.error('Tous les champs sont requis');
      return;
    }
    if (newPwd !== confirmPwd) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    if (newPwd.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    setChangingPwd(true);
    try {
      await api.patch('/account/password', { currentPassword: currentPwd, newPassword: newPwd });
      toast.success('Mot de passe modifié avec succès');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setShowPwdForm(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Erreur lors du changement de mot de passe');
    } finally {
      setChangingPwd(false);
    }
  };

  const displayName =
    profile?.account.companyName || authUser?.email?.split('@')[0] || 'Utilisateur';

  return (
    <div className="content">
      {/* Hero profil */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div className="flex items-center gap-16">
          <Avatar name={displayName} size={64} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-1)' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 3 }}>
              {profile?.email || authUser?.email}
            </div>
            <div className="flex items-center gap-8" style={{ marginTop: 8 }}>
              <span className="tag teal">
                {ROLE_LABELS[profile?.role ?? ''] || profile?.role || '—'}
              </span>
              {profile?.account.country && (
                <span className="tag gray">
                  {COUNTRY_MAP[profile.account.country] || profile.account.country}
                </span>
              )}
              {profile?.account.twoFactorEnabled && <span className="tag green">2FA activé</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)' }}>Dernière connexion</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {profile?.lastLogin
                ? new Date(profile.lastLogin).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Jamais'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 8 }}>
              Solde crédits
            </div>
            <div
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--brand-primary)', marginTop: 2 }}
            >
              {profile?.account.creditBalance != null
                ? `${Number(profile.account.creditBalance).toLocaleString('fr-FR')} FCFA`
                : '—'}
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-2)', fontSize: 13 }}>
          Chargement…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 12,
          }}
        >
          {/* Infos boutique */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="card-title">Informations de la boutique</div>
            <div className="divider" />

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
                Nom de la boutique
              </div>
              <input
                className="input"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Nom de votre entreprise"
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>
                Email administrateur
              </div>
              <input
                className="input"
                value={profile?.account.adminEmail || ''}
                disabled
                style={{
                  background: 'var(--muted)',
                  cursor: 'not-allowed',
                  color: 'var(--text-2)',
                }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 6 }}>Pays</div>
              <select
                className="input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                style={{ cursor: 'pointer' }}
              >
                <option value="">Sélectionner un pays</option>
                {Object.entries(COUNTRY_MAP).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="btn-primary"
              onClick={handleSaveProfile}
              disabled={saving}
              style={{
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                justifyContent: 'center',
              }}
            >
              {saving ? 'Enregistrement…' : 'Enregistrer les modifications'}
            </button>
          </div>

          {/* Sécurité */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Changer mot de passe */}
            <div className="card">
              <div className="flex items-center justify-between mb-12">
                <div className="card-title">Sécurité du compte</div>
                <button
                  className="btn-sm"
                  onClick={() => setShowPwdForm((v) => !v)}
                  style={{ color: 'var(--brand-teal)' }}
                >
                  {showPwdForm ? 'Annuler' : 'Changer le mot de passe'}
                </button>
              </div>

              {!showPwdForm ? (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--muted)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>
                          Mot de passe
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                          Dernière modification inconnue
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          background: '#e0edef',
                          color: '#0c5460',
                          borderRadius: 20,
                          padding: '2px 10px',
                          fontWeight: 500,
                        }}
                      >
                        Actif
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--muted)',
                        borderRadius: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>
                          Double authentification (2FA)
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                          {profile?.account.twoFactorEnabled
                            ? 'Activé via application TOTP'
                            : 'Non activé'}
                        </div>
                      </div>
                      <span
                        className={profile?.account.twoFactorEnabled ? 'tag green' : 'tag gray'}
                      >
                        {profile?.account.twoFactorEnabled ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      Mot de passe actuel
                    </div>
                    <input
                      type="password"
                      className="input"
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      Nouveau mot de passe
                    </div>
                    <input
                      type="password"
                      className="input"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="8 caractères minimum"
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)', marginBottom: 5 }}>
                      Confirmer le nouveau mot de passe
                    </div>
                    <input
                      type="password"
                      className="input"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                  {newPwd && confirmPwd && newPwd !== confirmPwd && (
                    <div style={{ fontSize: 11, color: '#dc2626' }}>
                      Les mots de passe ne correspondent pas
                    </div>
                  )}
                  <button
                    className="btn-primary"
                    onClick={handleChangePassword}
                    disabled={changingPwd}
                  >
                    {changingPwd ? 'Modification…' : 'Confirmer le changement'}
                  </button>
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div className="card" style={{ border: '0.5px solid rgba(220,38,38,0.25)' }}>
              <div className="card-title mb-8" style={{ color: '#dc2626' }}>
                Zone de danger
              </div>
              <div className="card-subtitle mb-12">
                Ces actions sont irréversibles. Procédez avec précaution.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  onClick={() => {
                    logout();
                    window.location.href = '/login';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 12px',
                    background: '#feecec',
                    color: '#7f1d1d',
                    border: '1px solid #f5c2c2',
                    borderRadius: 8,
                    cursor: 'pointer',
                    fontSize: 12.5,
                    fontWeight: 500,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  >
                    <path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M5 7h8" />
                  </svg>
                  Se déconnecter de tous les appareils
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
