import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import api from '@/api/axios';
import { toast } from 'sonner';
import i18n from '@/i18n/index';
import { apiKeysApi, type ApiKeyItem, type NewApiKey, type ApiKeyStats } from '@/api/apiKeys';

const SETTINGS_KEY = 'novasms_settings';

const PERMISSION_GROUPS = [
  {
    id: 'messaging',
    label: 'Envoyer des SMS et emails',
    description: "Permet à votre site ou application d'envoyer des messages à vos contacts",
    scopes: ['sms:send', 'email:send'],
  },
  {
    id: 'contacts',
    label: 'Ajouter et gérer des contacts',
    description: 'Permet de créer ou modifier des contacts dans votre liste',
    scopes: ['contacts:read', 'contacts:write'],
  },
  {
    id: 'analytics',
    label: 'Consulter les statistiques',
    description: 'Permet de lire votre solde de crédits et vos statistiques',
    scopes: ['balance:read'],
  },
  {
    id: 'campaigns',
    label: 'Lire les campagnes',
    description: 'Permet de consulter vos campagnes existantes',
    scopes: ['campaigns:read'],
  },
];

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // localStorage corrompu
  }
  return {};
}

function ToggleRow({
  label,
  sub,
  checked,
  onChange,
}: {
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 14px',
        background: 'var(--muted)',
        borderRadius: 8,
      }}
    >
      <div>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div
        className={`toggle ${checked ? 'on' : 'off'}`}
        onClick={() => onChange(!checked)}
        style={{ cursor: 'pointer' }}
      >
        <div className="toggle-knob" />
      </div>
    </div>
  );
}

interface BalanceData {
  creditBalance: number;
  alertThreshold: number | null;
  creditLimit: number | null;
  language: string;
  timezone: string;
}

export default function Settings() {
  const { t } = useTranslation();
  const { logout } = useAuthStore();
  const userRole = (useAuthStore((s) => s.user?.role) ?? 'Admin') as 'Admin' | 'Editor' | 'Analyst';
  const isAdmin = userRole === 'Admin';
  const saved = loadSettings();
  const [activeTab, setActiveTab] = useState<
    'general' | 'notifications' | 'api' | 'data' | 'payments'
  >('general');

  // ── Historique paiements ────────────────────────────────────────────────────
  type PaymentTx = {
    id: string;
    status: 'pending' | 'completed' | 'failed' | 'cancelled';
    operator: string;
    phoneNumber: string;
    amount: string;
    currency: string;
    createdAt: string;
    completedAt: string | null;
  };
  const [payments, setPayments] = useState<PaymentTx[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentPeriod, setPaymentPeriod] = useState<'week' | 'month' | 'year'>('month');

  const [language, setLanguage] = useState<string>((saved.language as string) || 'fr');
  const [timezone, setTimezone] = useState<string>((saved.timezone as string) || 'Africa/Abidjan');
  const [notifCampaigns, setNotifCampaigns] = useState<boolean>(saved.notifCampaigns !== false);
  const [notifCredits, setNotifCredits] = useState<boolean>(saved.notifCredits !== false);
  const [notifReports, setNotifReports] = useState<boolean>(saved.notifReports !== false);
  const [notifAutomations, setNotifAutomations] = useState<boolean>(
    saved.notifAutomations !== false,
  );
  const [alertThreshold, setAlertThreshold] = useState<string>(
    (saved.alertThreshold as string) || '',
  );
  const [creditLimitInput, setCreditLimitInput] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [balance, setBalance] = useState<BalanceData | null>(null);

  // États clés API
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['messaging', 'contacts']);
  const [creatingKey, setCreatingKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<NewApiKey | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [confirmedCopy, setConfirmedCopy] = useState(false);
  const [devEmail, setDevEmail] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [expandedKeyId, setExpandedKeyId] = useState<string | null>(null);
  const [keyStats, setKeyStats] = useState<Record<string, ApiKeyStats>>({});
  const [loadingStatsId, setLoadingStatsId] = useState<string | null>(null);

  const loadApiKeys = useCallback(() => {
    setApiKeysLoading(true);
    apiKeysApi
      .list()
      .then(setApiKeys)
      .catch(() => toast.error('Impossible de charger les clés API'))
      .finally(() => setApiKeysLoading(false));
  }, []);

  useEffect(() => {
    if (isAdmin) loadApiKeys();
  }, [isAdmin, loadApiKeys]);

  const scopesForGroups = (groups: string[]) =>
    PERMISSION_GROUPS.filter((g) => groups.includes(g.id)).flatMap((g) => [...g.scopes]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Donnez un nom à cette clé');
      return;
    }
    if (selectedGroups.length === 0) {
      toast.error('Sélectionnez au moins une permission');
      return;
    }
    setCreatingKey(true);
    try {
      const scopes = scopesForGroups(selectedGroups);
      const created = await apiKeysApi.create(newKeyName.trim(), scopes);
      setGeneratedKey(created);
      setShowCreateModal(false);
      setNewKeyName('');
      setSelectedGroups(['messaging', 'contacts']);
      setConfirmedCopy(false);
      setEmailSent(false);
      setDevEmail('');
      loadApiKeys();
    } catch {
      toast.error('Erreur lors de la création de la clé');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (id: string, name: string) => {
    if (!confirm(`Révoquer la clé "${name}" ? Elle ne fonctionnera plus immédiatement.`)) return;
    setRevokingId(id);
    try {
      await apiKeysApi.revoke(id);
      toast.success('Clé révoquée');
      loadApiKeys();
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setRevokingId(null);
    }
  };

  const toggleKeyStats = async (keyId: string) => {
    if (expandedKeyId === keyId) {
      setExpandedKeyId(null);
      return;
    }
    setExpandedKeyId(keyId);
    if (keyStats[keyId]) return;
    setLoadingStatsId(keyId);
    try {
      const stats = await apiKeysApi.stats(keyId);
      setKeyStats((prev) => ({ ...prev, [keyId]: stats }));
    } catch {
      toast.error('Impossible de charger les statistiques');
    } finally {
      setLoadingStatsId(null);
    }
  };

  const copyKey = () => {
    if (!generatedKey) return;
    void navigator.clipboard.writeText(generatedKey.key).then(() => {
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    });
  };

  const handleSendToDev = async () => {
    if (!generatedKey || !devEmail.includes('@')) {
      toast.error('Adresse email invalide');
      return;
    }
    setSendingEmail(true);
    try {
      await apiKeysApi.sendToDeveloper(devEmail, generatedKey.key, generatedKey.name);
      setEmailSent(true);
      toast.success(`Clé envoyée à ${devEmail}`);
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSendingEmail(false);
    }
  };

  useEffect(() => {
    const fetchBalance = () => {
      api
        .get<{
          success: boolean;
          balance: number;
          alertThreshold: number | null;
          creditLimit: number | null;
          language: string;
          timezone: string;
        }>('/account/balance')
        .then((res) => {
          setBalance({
            creditBalance: res.data.balance,
            alertThreshold: res.data.alertThreshold,
            creditLimit: res.data.creditLimit ?? null,
            language: res.data.language ?? 'fr',
            timezone: res.data.timezone ?? 'Africa/Abidjan',
          });
          // Toujours utiliser les valeurs DB comme source de vérité
          if (res.data.alertThreshold != null) {
            setAlertThreshold(String(res.data.alertThreshold));
          }
          if (res.data.creditLimit != null) {
            setCreditLimitInput(String(res.data.creditLimit));
          }
          if (res.data.language) {
            setLanguage(res.data.language);
          }
          if (res.data.timezone) {
            setTimezone(res.data.timezone);
          }
        })
        .catch(() => {});
    };

    fetchBalance();

    // Charger les préférences de notification depuis le backend
    api
      .get<{
        success: boolean;
        prefs: {
          emailOnCampaignDone: boolean;
          emailOnLowCredits: boolean;
          weeklyReportEmail: boolean;
          automationAlertsEmail: boolean;
        };
      }>('/account/notification-prefs')
      .then((res) => {
        if (res.data?.prefs) {
          setNotifCampaigns(res.data.prefs.emailOnCampaignDone);
          setNotifCredits(res.data.prefs.emailOnLowCredits);
          setNotifReports(res.data.prefs.weeklyReportEmail ?? true);
          setNotifAutomations(res.data.prefs.automationAlertsEmail ?? true);
        }
      })
      .catch(() => {});

    window.addEventListener('novasms:balance-refresh', fetchBalance);
    return () => window.removeEventListener('novasms:balance-refresh', fetchBalance);
  }, []);

  // Charger les transactions quand l'onglet Paiements est actif
  useEffect(() => {
    if (activeTab !== 'payments') return;
    setPaymentsLoading(true);
    api
      .get<{ transactions: PaymentTx[] }>('/mobile-money/transactions?limit=200')
      .then((res) => setPayments(res.data.transactions ?? []))
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, [activeTab]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    // lang est 'fr' ou 'en' (valeurs du select)
    void i18n.changeLanguage(lang === 'fr' ? 'fr' : 'en');
  };

  const handleSave = async () => {
    const parsedCreditLimit = creditLimitInput ? Number(creditLimitInput) : null;

    if (parsedCreditLimit !== null && balance) {
      if (parsedCreditLimit > balance.creditBalance) {
        toast.error(
          `La limite d'utilisation (${parsedCreditLimit.toLocaleString('fr-FR')} FCFA) ne peut pas dépasser le solde actuel (${balance.creditBalance.toLocaleString('fr-FR')} FCFA)`,
        );
        return;
      }
      if (parsedCreditLimit < 0) {
        toast.error("La limite d'utilisation doit être positive");
        return;
      }
    }

    setSaving(true);

    // Persister dans localStorage
    const prefs = {
      language,
      timezone,
      notifCampaigns,
      notifCredits,
      notifReports,
      notifAutomations,
      alertThreshold,
    };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs));

    try {
      const settingsPayload: Record<string, unknown> = {
        language, // déjà 'fr' ou 'en'
        timezone,
      };
      if (alertThreshold) settingsPayload['alertThreshold'] = Number(alertThreshold);
      if (parsedCreditLimit !== null) settingsPayload['creditLimit'] = parsedCreditLimit;

      await Promise.all([
        api.patch('/account/settings', settingsPayload),
        api.patch('/account/notification-prefs', {
          emailOnCampaignDone: notifCampaigns,
          emailOnLowCredits: notifCredits,
          weeklyReportEmail: notifReports,
          automationAlertsEmail: notifAutomations,
        }),
      ]);

      // Rafraîchir la jauge header + sidebar immédiatement
      window.dispatchEvent(new Event('novasms:balance-refresh'));

      toast.success('Préférences enregistrées');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (msg) {
        toast.error(msg);
      } else {
        toast.success('Préférences enregistrées localement');
      }
    } finally {
      setSaving(false);
    }
  };

  const TABS: {
    id: 'general' | 'notifications' | 'api' | 'data' | 'payments';
    label: string;
  }[] = [
    { id: 'general', label: t('settings.tabs.general') },
    { id: 'notifications', label: t('settings.tabs.notifications') },
    { id: 'api', label: t('settings.tabs.api') },
    { id: 'payments', label: t('settings.tabs.payments') },
    { id: 'data', label: t('settings.tabs.data') },
  ];

  return (
    <div className="content">
      {/* En-tête + onglets */}
      <div className="card" style={{ padding: '16px 20px 0', marginBottom: 0 }}>
        <div
          className="settings-header-row"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {t('settings.title')}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {t('settings.subtitle')}
            </div>
          </div>
          {balance && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0f172a',
                background: '#f1f5f9',
                padding: '5px 12px',
                borderRadius: 20,
              }}
            >
              {Number(balance.creditBalance).toLocaleString('fr-FR')} FCFA
            </div>
          )}
        </div>

        {/* Barre d'onglets style underline */}
        <div
          className="settings-tabs-bar"
          style={{ display: 'flex', borderBottom: '2px solid #e2e8f0' }}
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active ? '2px solid #2563eb' : '2px solid transparent',
                  marginBottom: -2,
                  fontSize: 13,
                  fontWeight: active ? 700 : 400,
                  color: active ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
                {tab.id === 'api' && apiKeys.length > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: active ? '#dbeafe' : '#f1f5f9',
                      color: active ? '#1d4ed8' : '#64748b',
                      borderRadius: 10,
                      padding: '1px 7px',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  >
                    {apiKeys.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Onglet Général ─── */}
      {activeTab === 'general' && (
        <div className="card">
          <div className="card-title mb-16">{t('settings.general.title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
              >
                {t('settings.general.languageLabel')}
              </div>
              <select
                className="input"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
              >
                {t('settings.general.timezoneLabel')}
              </div>
              <select
                className="input"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <optgroup label="Afrique">
                  <option value="Africa/Abidjan">Africa/Abidjan (UTC+0)</option>
                  <option value="Africa/Lagos">Africa/Lagos (UTC+1)</option>
                  <option value="Africa/Douala">Africa/Douala (UTC+1)</option>
                  <option value="Africa/Dakar">Africa/Dakar (UTC+0)</option>
                  <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                  <option value="Africa/Johannesburg">Africa/Johannesburg (UTC+2)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/Paris">Europe/Paris (UTC+1)</option>
                  <option value="Europe/London">Europe/London (UTC+0)</option>
                </optgroup>
                <optgroup label="Amérique">
                  <option value="America/New_York">America/New_York (UTC-5)</option>
                  <option value="America/Chicago">America/Chicago (UTC-6)</option>
                </optgroup>
              </select>
            </div>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
              >
                {t('settings.general.alertThresholdLabel')}
              </div>
              <input
                type="number"
                min={0}
                className="input"
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                placeholder={t('settings.general.alertThresholdPlaceholder')}
              />
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                {t('settings.general.alertThresholdHint')}
              </div>
            </div>
            <div>
              <div
                style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)', marginBottom: 6 }}
              >
                {t('settings.general.creditLimitLabel')}
              </div>
              <input
                type="number"
                min={0}
                max={balance?.creditBalance ?? undefined}
                className="input"
                value={creditLimitInput}
                onChange={(e) => setCreditLimitInput(e.target.value)}
                placeholder={t('settings.general.creditLimitPlaceholder')}
              />
              <div
                style={{
                  fontSize: 11,
                  color:
                    creditLimitInput && balance && Number(creditLimitInput) > balance.creditBalance
                      ? 'var(--color-error, #ef4444)'
                      : 'var(--text-3)',
                  marginTop: 4,
                }}
              >
                {t('settings.general.creditLimitHint')}
                {balance ? ` (${balance.creditBalance.toLocaleString('fr-FR')} FCFA)` : ''}
              </div>
            </div>
            <div style={{ paddingTop: 8 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t('settings.general.saving') : t('settings.general.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Notifications ─── */}
      {activeTab === 'notifications' && (
        <div className="card">
          <div className="card-title mb-16">{t('settings.notifications.title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 480 }}>
            <ToggleRow
              label={t('settings.notifications.campaigns')}
              sub={t('settings.notifications.campaignsSub')}
              checked={notifCampaigns}
              onChange={setNotifCampaigns}
            />
            <ToggleRow
              label={t('settings.notifications.credits')}
              sub={
                alertThreshold
                  ? t('settings.notifications.creditsSubWithThreshold', {
                      amount: Number(alertThreshold).toLocaleString('fr-FR'),
                    })
                  : t('settings.notifications.creditsSubNoThreshold')
              }
              checked={notifCredits}
              onChange={setNotifCredits}
            />
            <ToggleRow
              label={t('settings.notifications.reports')}
              sub={t('settings.notifications.reportsSub')}
              checked={notifReports}
              onChange={setNotifReports}
            />
            <ToggleRow
              label={t('settings.notifications.automations')}
              sub={t('settings.notifications.automationsSub')}
              checked={notifAutomations}
              onChange={setNotifAutomations}
            />
            <div style={{ paddingTop: 8 }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? t('settings.notifications.saving') : t('settings.notifications.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Clés API ─── */}
      {activeTab === 'api' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            {/* Titre + bouton créer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                  {t('settings.api.title')}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  {t('settings.api.subtitle')}
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={apiKeys.length >= 10}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 20px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: apiKeys.length >= 10 ? 'not-allowed' : 'pointer',
                  opacity: apiKeys.length >= 10 ? 0.5 : 1,
                }}
              >
                {t('settings.api.generateKey')}
              </button>
            </div>

            {/* Avertissement */}
            <div
              style={{
                padding: '10px 14px',
                background: '#fffbeb',
                border: '1px solid #fcd34d',
                borderRadius: 8,
                marginBottom: 16,
                fontSize: 12,
                color: '#92400e',
              }}
            >
              {t('settings.api.warning')}
            </div>

            {/* Liste des clés */}
            {apiKeysLoading ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 0',
                  color: 'var(--text-2)',
                  fontSize: 13,
                }}
              >
                {t('common.loading')}
              </div>
            ) : apiKeys.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
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
                    fontSize: 22,
                  }}
                >
                  🔑
                </div>
                <div
                  style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 6 }}
                >
                  {t('settings.api.noKeyTitle')}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--text-2)',
                    maxWidth: 280,
                    margin: '0 auto 16px',
                  }}
                >
                  {t('settings.api.noKeySubtitle')}
                </div>
                <button
                  onClick={() => setShowCreateModal(true)}
                  style={{
                    padding: '8px 18px',
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t('settings.api.generateFirst')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4 }}>
                  {t('settings.api.keysUsed', { count: apiKeys.length })}
                </div>
                {apiKeys.map((k) => {
                  const expired = k.expiresAt && new Date(k.expiresAt) < new Date();
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
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: '14px 16px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              marginBottom: 4,
                            }}
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
                                {t('settings.api.expired')}
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
                            {k.keyPrefix}••••••••{k.keySuffix}
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {PERMISSION_GROUPS.filter((g) =>
                              g.scopes.some((s) => k.permissions.includes(s)),
                            ).map((g) => (
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
                        </div>
                        <div
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
                              ? t('settings.api.lastUsed', {
                                  date: new Date(k.lastUsedAt).toLocaleDateString('fr-FR'),
                                })
                              : t('settings.api.neverUsed')}
                          </span>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => void toggleKeyStats(k.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '5px 10px',
                                background: expandedKeyId === k.id ? '#eff6ff' : 'var(--muted)',
                                border: 'none',
                                borderRadius: 6,
                                fontSize: 11,
                                cursor: 'pointer',
                                color: expandedKeyId === k.id ? '#2563eb' : 'var(--text-2)',
                                fontWeight: 500,
                              }}
                            >
                              {loadingStatsId === k.id
                                ? '…'
                                : expandedKeyId === k.id
                                  ? '▲ Usage'
                                  : '▼ Usage'}
                            </button>
                            <button
                              onClick={() => void handleRevokeKey(k.id, k.name)}
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
                              {revokingId === k.id
                                ? t('settings.api.revoking')
                                : t('settings.api.revoke')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {expandedKeyId === k.id && (
                        <div
                          style={{
                            borderTop: '1px solid var(--border)',
                            padding: '14px 16px',
                            background: '#f8fafc',
                          }}
                        >
                          {loadingStatsId === k.id || !keyStats[k.id] ? (
                            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                              {t('common.loading')}
                            </div>
                          ) : (
                            <>
                              <div
                                className="api-key-stats-grid"
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: 'repeat(3, 1fr)',
                                  gap: 10,
                                  marginBottom: 12,
                                }}
                              >
                                {[
                                  { v: keyStats[k.id].callsToday, l: t('settings.api.usageToday') },
                                  {
                                    v: keyStats[k.id].callsThisMonth,
                                    l: t('settings.api.usageMonth'),
                                  },
                                  {
                                    v:
                                      keyStats[k.id].creditsThisMonth > 0
                                        ? `${keyStats[k.id].creditsThisMonth.toLocaleString('fr-FR')} F`
                                        : '—',
                                    l: t('settings.api.creditsMonth'),
                                  },
                                ].map(({ v, l }) => (
                                  <div
                                    key={l}
                                    style={{
                                      textAlign: 'center',
                                      padding: 10,
                                      background: '#fff',
                                      borderRadius: 8,
                                      border: '1px solid var(--border)',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 18,
                                        fontWeight: 800,
                                        color: 'var(--text-1)',
                                      }}
                                    >
                                      {v}
                                    </div>
                                    <div
                                      style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 3 }}
                                    >
                                      {l}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {keyStats[k.id].recentLogs.length > 0 && (
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
                                    {t('settings.api.recentCalls')}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    {keyStats[k.id].recentLogs.map((log, i) => (
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
                                            background:
                                              log.statusCode < 300 ? '#d1fae5' : '#fee2e2',
                                            color: log.statusCode < 300 ? '#065f46' : '#991b1b',
                                            padding: '1px 5px',
                                            borderRadius: 4,
                                            fontWeight: 700,
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

          {/* Intégrations sans code */}
          <div className="card">
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
                {t('settings.api.integrations.title')}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {t('settings.api.integrations.subtitle')}
              </div>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  name: 'Zapier',
                  desc: 'Reliez NovaSMS à plus de 6 000 applications',
                  color: '#FF4A00',
                  soon: true,
                },
                {
                  name: 'Make',
                  desc: "Créez des scénarios d'automatisation visuels",
                  color: '#6D00CC',
                  soon: true,
                },
                {
                  name: 'WordPress',
                  desc: 'Plugin NovaSMS pour votre site WordPress',
                  color: '#21759B',
                  soon: true,
                },
                {
                  name: 'n8n',
                  desc: 'Automatisez vos workflows open-source',
                  color: '#EA4B71',
                  soon: true,
                },
              ].map((intg) => (
                <div
                  key={intg.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      background: intg.color,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ color: '#fff', fontSize: 11, fontWeight: 800 }}>
                      {intg.name.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}
                    >
                      {intg.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.4 }}>
                      {intg.desc}
                    </div>
                  </div>
                  <span
                    style={{
                      flexShrink: 0,
                      fontSize: 10,
                      background: '#f1f5f9',
                      color: '#64748b',
                      padding: '3px 8px',
                      borderRadius: 20,
                      fontWeight: 600,
                    }}
                  >
                    {t('settings.api.integrations.soon')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Onglet Paiements ─── */}
      {activeTab === 'payments' &&
        (() => {
          const now = new Date();
          const filtered = payments.filter((tx) => {
            const d = new Date(tx.createdAt);
            if (paymentPeriod === 'week') {
              const weekAgo = new Date(now);
              weekAgo.setDate(now.getDate() - 7);
              return d >= weekAgo;
            }
            if (paymentPeriod === 'month') {
              return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }
            // year
            return d.getFullYear() === now.getFullYear();
          });

          const completed = filtered.filter((t) => t.status === 'completed');
          const failed = filtered.filter((t) => t.status === 'failed');
          const totalAmount = completed.reduce((s, t) => s + parseFloat(String(t.amount)), 0);

          const STATUS_LABEL: Record<string, string> = {
            completed: t('settings.payments.statusCompleted'),
            pending: t('settings.payments.statusPending'),
            failed: t('settings.payments.statusFailed'),
            cancelled: t('settings.payments.statusCancelled'),
          };
          const STATUS_COLOR: Record<string, string> = {
            completed: '#16a34a',
            pending: '#d97706',
            failed: '#dc2626',
            cancelled: '#6b7280',
          };
          const STATUS_BG: Record<string, string> = {
            completed: '#f0fdf4',
            pending: '#fffbeb',
            failed: '#fef2f2',
            cancelled: '#f8fafc',
          };
          const OP_COLOR: Record<string, string> = {
            WAVE: '#3b82f6',
            ORANGE: '#f97316',
            MOMO: '#eab308',
            MOOV: '#0c5460',
            NOVASEND: '#2ec80a',
          };

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Filtres période */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
                    {t('settings.payments.title')}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {(['week', 'month', 'year'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPaymentPeriod(p)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1.5px solid ${paymentPeriod === p ? '#0c5460' : 'var(--border)'}`,
                          background: paymentPeriod === p ? '#0c5460' : 'var(--surface)',
                          color: paymentPeriod === p ? 'white' : 'var(--text-2)',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {p === 'week'
                          ? t('settings.payments.periodWeek')
                          : p === 'month'
                            ? t('settings.payments.periodMonth')
                            : t('settings.payments.periodYear')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cartes résumé */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
                  gap: 12,
                }}
              >
                {[
                  {
                    label: t('settings.payments.totalRecharged'),
                    value: `${totalAmount.toLocaleString('fr-FR')} FCFA`,
                    color: '#0c5460',
                    bg: '#f0fdff',
                    border: '#bae6fd',
                  },
                  {
                    label: t('settings.payments.transactions'),
                    value: filtered.length,
                    color: '#0c5460',
                    bg: 'var(--muted)',
                    border: 'var(--border)',
                  },
                  {
                    label: t('settings.payments.successful'),
                    value: completed.length,
                    color: '#16a34a',
                    bg: '#f0fdf4',
                    border: '#bbf7d0',
                  },
                  {
                    label: t('settings.payments.failed'),
                    value: failed.length,
                    color: '#dc2626',
                    bg: '#fef2f2',
                    border: '#fecaca',
                  },
                ].map((s) => (
                  <div
                    key={s.label}
                    className="card"
                    style={{
                      padding: '16px 18px',
                      border: `1.5px solid ${s.border}`,
                      background: s.bg,
                    }}
                  >
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>
                      {String(s.value)}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-2)',
                        marginTop: 4,
                        fontWeight: 600,
                      }}
                    >
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Table transactions */}
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {paymentsLoading ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--text-2)',
                      fontSize: 13,
                    }}
                  >
                    {t('common.loading')}
                  </div>
                ) : filtered.length === 0 ? (
                  <div
                    style={{
                      padding: 40,
                      textAlign: 'center',
                      color: 'var(--text-2)',
                      fontSize: 13,
                    }}
                  >
                    {t('settings.payments.noPayments')}
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr
                          style={{
                            background: 'var(--muted)',
                            borderBottom: '1px solid var(--border)',
                          }}
                        >
                          {[
                            t('settings.payments.colDate'),
                            t('settings.payments.colOperator'),
                            t('settings.payments.colPhone'),
                            t('settings.payments.colAmount'),
                            t('settings.payments.colStatus'),
                            t('settings.payments.colRef'),
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: '10px 16px',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: 'var(--text-2)',
                                fontSize: 11,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((tx, i) => (
                          <tr
                            key={tx.id}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              background: i % 2 === 0 ? 'var(--surface)' : 'var(--muted)',
                            }}
                          >
                            <td
                              style={{
                                padding: '11px 16px',
                                color: 'var(--text-1)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })}
                              <span
                                style={{ display: 'block', fontSize: 11, color: 'var(--text-3)' }}
                              >
                                {new Date(tx.createdAt).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 6,
                                  padding: '3px 10px',
                                  borderRadius: 20,
                                  background: `${OP_COLOR[tx.operator] ?? '#6b7280'}18`,
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: OP_COLOR[tx.operator] ?? '#6b7280',
                                }}
                              >
                                {tx.operator}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '11px 16px',
                                color: 'var(--text-2)',
                                fontFamily: 'monospace',
                                fontSize: 12,
                              }}
                            >
                              {tx.phoneNumber}
                            </td>
                            <td
                              style={{
                                padding: '11px 16px',
                                fontWeight: 700,
                                color: 'var(--text-1)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {parseFloat(String(tx.amount)).toLocaleString('fr-FR')} {tx.currency}
                            </td>
                            <td style={{ padding: '11px 16px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '3px 10px',
                                  borderRadius: 20,
                                  fontSize: 11,
                                  fontWeight: 600,
                                  background: STATUS_BG[tx.status] ?? '#f8fafc',
                                  color: STATUS_COLOR[tx.status] ?? '#6b7280',
                                }}
                              >
                                {STATUS_LABEL[tx.status] ?? tx.status}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '11px 16px',
                                color: 'var(--text-3)',
                                fontFamily: 'monospace',
                                fontSize: 11,
                                maxWidth: 140,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {tx.id}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      {/* ─── Onglet Données ─── */}
      {activeTab === 'data' && (
        <div className="card">
          <div className="card-title mb-16">{t('settings.data.title')}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 480 }}>
            <div style={{ padding: '14px 16px', background: 'var(--muted)', borderRadius: 10 }}>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}
              >
                {t('settings.data.exportTitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                {t('settings.data.exportSubtitle')}
              </div>
              <button
                className="btn-sm"
                onClick={() => {
                  toast.info("Préparation de l'export…");
                  api
                    .get('/account/export', { responseType: 'blob' })
                    .then((res) => {
                      const url = URL.createObjectURL(res.data as Blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `novasms-export-${new Date().toISOString().split('T')[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success('Export téléchargé');
                    })
                    .catch(() => toast.error("Erreur lors de l'export"));
                }}
              >
                {t('settings.data.exportButton')}
              </button>
            </div>

            <div style={{ padding: '14px 16px', background: 'var(--muted)', borderRadius: 10 }}>
              <div
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}
              >
                {t('settings.data.rgpdTitle')}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 10 }}>
                {t('settings.data.rgpdSubtitle')}
              </div>
              <span className="tag green">{t('settings.data.rgpdBadge')}</span>
            </div>

            <button
              onClick={() => {
                logout();
                window.location.href = '/login';
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#feecec',
                color: '#7f1d1d',
                border: '1px solid #f5c2c2',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 13,
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
              {t('settings.data.logout')}
            </button>
          </div>
        </div>
      )}

      {/* ══ MODAL : Créer une clé ══ */}
      {showCreateModal && (
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
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {t('settings.api.modal.title')}
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: '#64748b' }}>
              {t('settings.api.modal.subtitle')}
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
              {t('settings.api.modal.nameLabel')}
            </label>
            <input
              className="input"
              placeholder={t('settings.api.modal.namePlaceholder')}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              style={{ marginBottom: 20, width: '100%', boxSizing: 'border-box' }}
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
              {t('settings.api.modal.permissionsLabel')}
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

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                  color: '#475569',
                  fontWeight: 500,
                }}
              >
                {t('settings.api.modal.cancel')}
              </button>
              <button
                disabled={creatingKey}
                onClick={() => void handleCreateKey()}
                style={{
                  flex: 2,
                  padding: '10px',
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: creatingKey ? 'not-allowed' : 'pointer',
                }}
              >
                {creatingKey ? t('settings.api.modal.creating') : t('settings.api.modal.create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL : Clé générée ══ */}
      {generatedKey && (
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
                  fontSize: 16,
                }}
              >
                🔑
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {t('settings.api.generatedModal.title')}
              </div>
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
              {t('settings.api.generatedModal.warning')}
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
                {generatedKey.key}
              </code>
              <button
                onClick={copyKey}
                style={{
                  flexShrink: 0,
                  padding: '7px 12px',
                  background: keyCopied ? '#dcfce7' : '#2563eb',
                  color: keyCopied ? '#15803d' : '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {keyCopied
                  ? t('settings.api.generatedModal.copied')
                  : t('settings.api.generatedModal.copy')}
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
                {t('settings.api.generatedModal.confirmedLabel')}
              </span>
            </label>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                {t('settings.api.generatedModal.sendToDev')}
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
                  {t('settings.api.generatedModal.emailSent', { email: devEmail })}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="email"
                    className="input"
                    placeholder={t('settings.api.generatedModal.emailPlaceholder')}
                    value={devEmail}
                    onChange={(e) => setDevEmail(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => void handleSendToDev()}
                    disabled={sendingEmail || !devEmail.includes('@')}
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
                    {sendingEmail
                      ? t('settings.api.generatedModal.sending')
                      : t('settings.api.generatedModal.send')}
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setGeneratedKey(null)}
              disabled={!confirmedCopy}
              style={{
                width: '100%',
                padding: '10px',
                background: confirmedCopy ? '#2563eb' : '#e2e8f0',
                color: confirmedCopy ? '#fff' : '#94a3b8',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: confirmedCopy ? 'pointer' : 'not-allowed',
              }}
            >
              {confirmedCopy
                ? t('settings.api.generatedModal.done')
                : t('settings.api.generatedModal.confirmFirst')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
