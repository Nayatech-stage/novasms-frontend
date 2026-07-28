import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api/axios';
import { toast } from 'sonner';
import {
  WaveIcon,
  OrangeMoneyIcon,
  MomoIcon,
  MoovIcon,
  NovaSendIcon,
  VisaIcon,
  StripeIcon,
} from '@/components/provider-icons';

type Operator = 'WAVE' | 'ORANGE' | 'MOMO' | 'MOOV' | 'NOVASEND';
type PayTab = 'mobile' | 'visa';
type ReceiptKind = 'mobile' | 'visa';

const OPERATOR_RULES: Record<
  Operator,
  { min: number; max: number; prefixes: string[]; hint: string }
> = {
  WAVE: {
    min: 500,
    max: 500_000,
    prefixes: ['01', '05', '07', '27'],
    hint: 'Numéros Wave CI : 01, 05, 07, 27…',
  },
  ORANGE: {
    min: 500,
    max: 300_000,
    prefixes: ['05', '07', '25', '45', '47', '57', '65', '67', '77', '87', '97'],
    hint: 'Numéros Orange CI : 07, 05, 47, 57…',
  },
  MOMO: {
    min: 500,
    max: 500_000,
    prefixes: ['05', '25', '45', '65'],
    hint: 'Numéros MTN CI : 05, 25, 45, 65…',
  },
  MOOV: {
    min: 500,
    max: 300_000,
    prefixes: ['01', '41', '61'],
    hint: 'Numéros Moov CI : 01, 41, 61…',
  },
  NOVASEND: {
    min: 500,
    max: 1_000_000,
    prefixes: [],
    hint: 'Votre numéro enregistré sur NovaSend',
  },
};

const OPERATORS: {
  id: Operator;
  label: string;
  sub: string;
  Icon: React.FC<{ size?: number }>;
}[] = [
  { id: 'NOVASEND', label: 'NovaSend', sub: 'Wallet universel', Icon: NovaSendIcon },
  { id: 'WAVE', label: 'Wave', sub: 'Sénégal · CI', Icon: WaveIcon },
  { id: 'ORANGE', label: 'Orange Money', sub: 'CI · Mali · Sénégal', Icon: OrangeMoneyIcon },
  { id: 'MOMO', label: 'MTN MoMo', sub: 'CI · Ghana · Cameroun', Icon: MomoIcon },
  { id: 'MOOV', label: 'Moov Money', sub: 'CI · Bénin · Togo', Icon: MoovIcon },
];

const AMOUNTS = [5_000, 10_000, 25_000, 50_000];

export default function Rechargement() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<PayTab>('mobile');
  const [operator, setOperator] = useState<Operator>('NOVASEND');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<number>(10_000);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [cardNum, setCardNum] = useState('');
  const [cardExp, setCardExp] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [receiptKind, setReceiptKind] = useState<ReceiptKind>('mobile');
  const [paidAmount, setPaidAmount] = useState(0);
  const [downloadLoading, setDownloadLoading] = useState(false);

  // ── Polling / waiting payment ───────────────────────────────────────────────
  const [waitingPayment, setWaitingPayment] = useState(false);
  const [, setPendingTxId] = useState<string | null>(null);
  const [pendingAmount, setPendingAmount] = useState(0);
  const [pendingOperator, setPendingOperator] = useState<Operator>('NOVASEND');
  const [wavePaymentUrl, setWavePaymentUrl] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parsedCustomAmount = Number(customAmount.replace(/\s/g, '')) || 0;
  const finalAmount = parsedCustomAmount || amount || 0;

  // ── Inline validation ───────────────────────────────────────────────────────
  const phoneDigits = phone.replace(/\D/g, '');
  const rules = OPERATOR_RULES[operator];

  const phoneError: string | null = (() => {
    if (!phoneDigits) return null;
    if (phoneDigits.length !== 10)
      return `Numéro CI : 10 chiffres requis (${phoneDigits.length} saisi${phoneDigits.length > 1 ? 's' : ''})`;
    if (
      operator !== 'NOVASEND' &&
      rules?.prefixes.length &&
      !rules.prefixes.includes(phoneDigits.slice(0, 2))
    )
      return `Préfixe invalide pour ${operator}. Attendus : ${rules.prefixes.join(', ')}`;
    return null;
  })();

  const amountError: string | null = (() => {
    if (!finalAmount) return null;
    const min = rules?.min ?? 500;
    const max = rules?.max ?? 1_000_000;
    if (finalAmount < min) return `Minimum ${min.toLocaleString('fr-FR')} FCFA pour ${operator}`;
    if (finalAmount > max) return `Maximum ${max.toLocaleString('fr-FR')} FCFA pour ${operator}`;
    return null;
  })();

  const mobileFormInvalid = !phoneDigits || !!phoneError || !!amountError || !finalAmount;

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
  }

  function startPolling(txId: string, paid: number) {
    stopPolling();

    pollingRef.current = setInterval(() => {
      void (async () => {
        try {
          const res = await api.get<{ success: boolean; status: string }>(
            `/mobile-money/${txId}/status`,
          );
          if (res.data.status === 'completed') {
            stopPolling();
            setWaitingPayment(false);
            setPaidAmount(paid);
            setTransactionId(txId);
            setReceiptKind('mobile');
            setSuccess(true);
            toast.success('Paiement confirmé ! Crédits ajoutés.');
            window.dispatchEvent(new CustomEvent('novasms:balance-refresh'));
          } else if (res.data.status === 'failed') {
            stopPolling();
            setWaitingPayment(false);
            toast.error("Paiement refusé par l'opérateur. Veuillez réessayer.");
          }
        } catch {
          /* réseau — on continue de poller */
        }
      })();
    }, 3_000);

    pollingTimeoutRef.current = setTimeout(() => {
      stopPolling();
      setWaitingPayment(false);
      toast.error('Délai de paiement dépassé (2 min). Veuillez réessayer.');
    }, 120_000);
  }

  async function handleConfirm() {
    const paid = finalAmount;

    if (tab === 'mobile') {
      if (mobileFormInvalid) {
        toast.error(phoneError ?? amountError ?? 'Formulaire incomplet');
        return;
      }
    } else if (!cardName.trim() || !cardNum.trim() || !cardExp.trim() || !cardCvv.trim()) {
      toast.error('Complétez toutes les informations de la carte');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'mobile') {
        let txId: string | null = null;
        let pUrl: string | null = null;

        const silentConfig = { _silent: true } as Parameters<typeof api.post>[2];

        if (operator === 'NOVASEND' || operator === 'WAVE' || operator === 'ORANGE') {
          // Session universelle NovaSend — retourne toujours un paymentUrl
          const res = await api.post(
            '/mobile-money/session',
            {
              phoneNumber: `+225${phone.replace(/\D/g, '')}`,
              amount: paid,
              currency: 'XOF',
              country: 'CI',
            },
            silentConfig,
          );
          const d = res.data as { transactionId?: string; paymentUrl?: string };
          txId = d?.transactionId ?? null;
          pUrl = d.paymentUrl ?? null;
        } else {
          // Direct payin pour MOMO et MOOV (push téléphone, pas de redirect)
          const body: Record<string, unknown> = {
            operator,
            phoneNumber: `+225${phone.replace(/\D/g, '')}`,
            amount: paid,
            currency: 'XOF',
            country: 'CI',
          };
          const res = await api.post('/mobile-money/initiate', body, silentConfig);
          const d = res.data as {
            transactionId?: string;
            transaction?: { id?: string };
            paymentUrl?: string;
          };
          txId = d?.transactionId ?? d?.transaction?.id ?? null;
          pUrl = d.paymentUrl ?? null;
        }

        if (!txId) throw new Error('Transaction introuvable — réessayez');

        if (pUrl) {
          window.open(pUrl, '_blank', 'noopener,noreferrer');
        }

        setPendingTxId(txId);
        setPendingAmount(paid);
        setPendingOperator(operator);
        setWavePaymentUrl(pUrl);
        setWaitingPayment(true);
        startPolling(txId, paid);
      } else {
        // Visa — flux direct inchangé
        const [expiryMonth = '', expiryYearRaw = ''] = cardExp.split('/');
        const expiryYear = expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw;
        const visaRes = await api.post('/transactions/visa', {
          amount: paid,
          cardName: cardName.trim(),
          cardNumber: cardNum.replace(/\s/g, ''),
          expiryMonth,
          expiryYear,
          cvv: cardCvv,
        });
        const txId = (visaRes.data as { transactionId?: string })?.transactionId ?? null;
        setPaidAmount(paid);
        setTransactionId(txId);
        setReceiptKind('visa');
        setSuccess(true);
        toast.success('Paiement confirmé ! Crédits ajoutés.');
        window.dispatchEvent(new CustomEvent('novasms:balance-refresh'));
      }
    } catch (error) {
      // Extraire le message serveur depuis la réponse Axios si disponible
      const serverMsg = (error as { response?: { data?: { message?: string } } })?.response?.data
        ?.message;
      const message =
        serverMsg ??
        (error instanceof Error ? error.message : 'Échec du paiement. Vérifiez vos informations.');
      toast.error(
        typeof message === 'string' ? message : 'Échec du paiement. Vérifiez vos informations.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadReceipt() {
    if (!transactionId) return;
    setDownloadLoading(true);
    try {
      const receiptUrl =
        receiptKind === 'mobile'
          ? `/mobile-money/transactions/${transactionId}/receipt`
          : `/transactions/${transactionId}/receipt`;
      const res = await api.get(receiptUrl, { responseType: 'blob' });
      const blob = new Blob([res.data as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu-novasms.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Impossible de télécharger le reçu.');
    } finally {
      setDownloadLoading(false);
    }
  }

  useEffect(() => () => stopPolling(), []); // cleanup on unmount

  const OPERATOR_WAIT: Record<
    Operator,
    { label: string; instruction: string | null; ussd: string | null }
  > = {
    NOVASEND: {
      label: 'NovaSend',
      instruction: 'Ouvrez le lien de paiement et confirmez avec votre application NovaSend.',
      ussd: null,
    },
    WAVE: {
      label: 'Wave',
      instruction: 'Ouvrez le lien de paiement pour confirmer dans votre application Wave.',
      ussd: null,
    },
    ORANGE: {
      label: 'Orange Money',
      instruction:
        'Votre paiement Orange Money est en cours de traitement. Validez la demande sur votre téléphone si vous recevez une notification.',
      ussd: null,
    },
    MOMO: {
      label: 'MTN MoMo',
      instruction:
        "Une demande de paiement a été envoyée sur votre téléphone MTN. Confirmez-la. Si elle n'apparaît pas, composez *133# et suivez le menu.",
      ussd: '*133#',
    },
    MOOV: {
      label: 'Moov Money',
      instruction:
        "Une demande de paiement a été envoyée sur votre téléphone Moov. Confirmez-la. Si elle n'apparaît pas, composez *155# et suivez le menu.",
      ussd: '*155#',
    },
  };
  const waitInfo = OPERATOR_WAIT[pendingOperator] ?? null;

  // ── Écran d'attente paiement ───────────────────────────────────────────────
  if (waitingPayment) {
    return (
      <div
        className="content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: '24px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div className="card" style={{ padding: 40, textAlign: 'center' }}>
            {/* Spinner */}
            <div style={{ margin: '0 auto 24px', width: 64, height: 64, position: 'relative' }}>
              <svg
                viewBox="0 0 64 64"
                style={{ width: 64, height: 64, animation: 'spin 1.1s linear infinite' }}
              >
                <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="5" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#0c5460"
                  strokeWidth="5"
                  strokeDasharray="88 88"
                  strokeDashoffset="22"
                  strokeLinecap="round"
                />
              </svg>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>

            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)', marginBottom: 8 }}>
              Paiement en attente
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
              {waitInfo?.instruction ?? 'Validation en cours…'}
            </div>

            {/* USSD fallback */}
            {waitInfo?.ussd && (
              <div
                style={{
                  margin: '0 auto 20px',
                  maxWidth: 340,
                  padding: '12px 16px',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: 10,
                }}
              >
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  Si le pop-up de validation n'apparaît pas, composez{' '}
                  <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{waitInfo.ussd}</strong>{' '}
                  sur votre téléphone pour valider l'opération en attente.
                </div>
              </div>
            )}

            {/* Bouton paiement si l'opérateur retourne un lien (Wave = pay.wave.com) */}
            {wavePaymentUrl && (
              <div style={{ marginBottom: 20 }}>
                <button
                  className="btn-primary"
                  onClick={() => window.open(wavePaymentUrl, '_blank', 'noopener,noreferrer')}
                  style={{ fontSize: 13 }}
                >
                  Ouvrir {waitInfo?.label ?? 'le lien de paiement'} →
                </button>
              </div>
            )}

            <div
              style={{
                padding: '10px 16px',
                background: 'var(--muted)',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 28,
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Montant :</span>
              <strong style={{ fontSize: 15, color: '#0c5460' }}>
                {pendingAmount.toLocaleString('fr-FR')} FCFA
              </strong>
            </div>

            <div>
              <button
                className="btn-outline"
                onClick={() => {
                  stopPolling();
                  setWaitingPayment(false);
                }}
                style={{ fontSize: 12 }}
              >
                Annuler et revenir
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Écran de succès ────────────────────────────────────────────────────────
  if (success) {
    return (
      <div
        className="content"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
          padding: '24px 20px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#2ec80a,#aaee22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <svg
                width="36"
                height="36"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8 }}>
              Paiement confirmé !
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 28 }}>
              Vos crédits ont été ajoutés instantanément.
            </div>
            <div style={{ fontSize: 42, fontWeight: 900, color: '#0c5460', lineHeight: 1.1 }}>
              {paidAmount.toLocaleString('fr-FR')} FCFA
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4, marginBottom: 36 }}>
              rechargés avec succès
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {transactionId && (
                <button
                  className="btn-primary"
                  onClick={handleDownloadReceipt}
                  disabled={downloadLoading}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {downloadLoading ? 'Génération…' : 'Télécharger le reçu'}
                </button>
              )}
              <button
                className="btn-outline"
                onClick={() => navigate('/dashboard')}
                style={{ fontSize: 13 }}
              >
                Retour au dashboard →
              </button>
            </div>
            {transactionId && (
              <div
                style={{
                  marginTop: 24,
                  padding: '8px 14px',
                  background: 'var(--muted)',
                  borderRadius: 8,
                  fontSize: 11,
                  color: 'var(--text-2)',
                }}
              >
                Référence :{' '}
                <span style={{ fontWeight: 600, color: 'var(--text-1)', fontFamily: 'monospace' }}>
                  {transactionId}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Formulaire de paiement ─────────────────────────────────────────────────
  return (
    <div className="content" style={{ padding: '20px 16px' }}>
      <div
        style={{
          maxWidth: 680,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div className="card" style={{ padding: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-1)' }}>
              Recharger votre compte
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
              Paiement sécurisé · Créditage instantané
            </div>
          </div>

          {/* Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 0,
              borderRadius: 10,
              overflow: 'hidden',
              border: '1px solid var(--border)',
              marginBottom: 24,
            }}
          >
            <button
              onClick={() => setTab('mobile')}
              style={{
                padding: '12px 8px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: tab === 'mobile' ? '#0c5460' : 'var(--surface)',
                color: tab === 'mobile' ? 'white' : 'var(--text-2)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              Mobile Money
            </button>
            <button
              onClick={() => setTab('visa')}
              style={{
                padding: '12px 8px',
                fontSize: 13,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: tab === 'visa' ? '#0c5460' : 'var(--surface)',
                color: tab === 'visa' ? 'white' : 'var(--text-2)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Carte Visa
            </button>
          </div>

          {tab === 'mobile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Opérateurs — grille responsive 5 colonnes */}
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 10,
                  }}
                >
                  Opérateur Mobile Money
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(75px,1fr))',
                    gap: 8,
                  }}
                >
                  {OPERATORS.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => {
                        setOperator(op.id);
                      }}
                      style={{
                        border: `2px solid ${operator === op.id ? '#2ec80a' : 'var(--border)'}`,
                        borderRadius: 10,
                        padding: '10px 4px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: operator === op.id ? '#edfce8' : 'var(--surface)',
                        transition: 'all 0.15s',
                        outline: 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>
                        <op.Icon size={34} />
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: operator === op.id ? '#0c5460' : 'var(--text-1)',
                          lineHeight: 1.2,
                        }}
                      >
                        {op.label}
                      </div>
                      <div
                        style={{
                          fontSize: 8.5,
                          color: 'var(--text-2)',
                          marginTop: 2,
                          lineHeight: 1.2,
                        }}
                      >
                        {op.sub}
                      </div>
                      {operator === op.id && (
                        <div
                          style={{ fontSize: 8, color: '#16a34a', marginTop: 4, fontWeight: 700 }}
                        >
                          ✓ Sélectionné
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                  }}
                >
                  Numéro de téléphone
                </label>
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-2)',
                    }}
                  >
                    +225
                  </div>
                  <input
                    className="form-input"
                    style={{ paddingLeft: 52, borderColor: phoneError ? '#ef4444' : undefined }}
                    placeholder="07 12 34 56 78"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                {phoneError ? (
                  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{phoneError}</div>
                ) : rules ? (
                  <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>
                    {rules.hint}
                  </div>
                ) : null}
              </div>

              {/* Montant */}
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                  }}
                >
                  Montant à recharger
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit,minmax(75px,1fr))',
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => {
                        setAmount(a);
                        setCustomAmount('');
                      }}
                      style={{
                        padding: '9px 4px',
                        fontSize: 12,
                        fontWeight: 600,
                        border: `1.5px solid ${amount === a && !customAmount ? '#2ec80a' : 'var(--border)'}`,
                        borderRadius: 8,
                        background: amount === a && !customAmount ? '#edfce8' : 'var(--surface)',
                        color: amount === a && !customAmount ? '#0c5460' : 'var(--text-1)',
                        cursor: 'pointer',
                      }}
                    >
                      {a.toLocaleString('fr-FR')} FCFA
                    </button>
                  ))}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    value={customAmount || amount.toString()}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setAmount(0);
                    }}
                    style={{ paddingRight: 52 }}
                    placeholder="Autre montant"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-2)',
                      fontWeight: 600,
                    }}
                  >
                    FCFA
                  </div>
                </div>
                {amountError ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      fontSize: 11,
                      color: '#ef4444',
                    }}
                  >
                    {amountError}
                  </div>
                ) : finalAmount > 0 ? (
                  <div
                    style={{
                      marginTop: 8,
                      padding: '10px 12px',
                      background: '#edfce8',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: 11, color: '#0c5460' }}>
                      Crédits reçus après paiement
                    </span>
                    <strong style={{ color: '#0c5460', fontSize: 15 }}>
                      {finalAmount.toLocaleString('fr-FR')} FCFA
                    </strong>
                  </div>
                ) : null}
              </div>

              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loading || mobileFormInvalid}
                style={{
                  width: '100%',
                  padding: 13,
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: '0.02em',
                  opacity: mobileFormInvalid && !loading ? 0.5 : 1,
                  cursor: mobileFormInvalid && !loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading
                  ? 'Traitement…'
                  : `Confirmer le paiement de ${finalAmount.toLocaleString('fr-FR')} FCFA →`}
              </button>
            </div>
          ) : (
            /* ── Visa ───────────────────────────────────────────────────────── */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  background: 'var(--muted)',
                  borderRadius: 10,
                }}
              >
                <VisaIcon size={52} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                    Visa / Mastercard
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                    Paiement sécurisé via Stripe
                  </div>
                </div>
                <StripeIcon size={28} />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                  }}
                >
                  Numéro de carte
                </label>
                <input
                  className="form-input"
                  placeholder="1234 5678 9012 3456"
                  value={cardNum}
                  onChange={(e) => setCardNum(e.target.value)}
                  maxLength={19}
                />
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                  }}
                >
                  Titulaire de la carte
                </label>
                <input
                  className="form-input"
                  placeholder="Nom complet"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                />
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(100px,1fr))',
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      marginBottom: 8,
                    }}
                  >
                    Expiration
                  </label>
                  <input
                    className="form-input"
                    placeholder="MM/AA"
                    value={cardExp}
                    onChange={(e) => setCardExp(e.target.value)}
                    maxLength={5}
                  />
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      marginBottom: 8,
                    }}
                  >
                    CVV
                  </label>
                  <input
                    className="form-input"
                    placeholder="123"
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    maxLength={4}
                    type="password"
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-1)',
                    marginBottom: 8,
                  }}
                >
                  Montant (FCFA)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    placeholder="10 000"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    style={{ paddingRight: 52 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 12,
                      color: 'var(--text-2)',
                      fontWeight: 600,
                    }}
                  >
                    FCFA
                  </span>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handleConfirm}
                disabled={loading}
                style={{ width: '100%', padding: 13, fontSize: 14, fontWeight: 700 }}
              >
                {loading
                  ? 'Traitement…'
                  : `Payer ${(Number(customAmount) || finalAmount).toLocaleString('fr-FR')} FCFA →`}
              </button>
            </div>
          )}
        </div>

        {/* Badges sécurité */}
        <div
          style={{
            display: 'flex',
            gap: 8,
            justifyContent: 'center',
            flexWrap: 'wrap',
            padding: '0 4px',
          }}
        >
          {[
            'Paiement sécurisé TLS 1.3',
            'Créditage instantané',
            'Reçu PDF disponible',
            'Conformité PCI-DSS',
          ].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10.5,
                color: 'var(--text-2)',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#16a34a"
                strokeWidth="1.4"
              >
                <path d="M7 1l5 2v5c0 3-2.5 5-5 6C4.5 13 2 11 2 8V3z" />
                <polyline points="4.5,7 6.5,9 9.5,5" />
              </svg>
              {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
