import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useCampaignStore } from '@/store/campaign.store';
import { contactsApi } from '@/api/contacts';
import { getSegmentContactCount } from '@/services/campaignService';
import type { DynamicSegment } from '@/features/contacts/types/contact';
import { SMS_COST_CONFIG, calculateSMSSegments } from '@/types/campaign.types';

// Tarifs — alignés avec backend/src/common/billing.util.ts DEFAULT_COSTS
const PRICE_PER_EMAIL = 2; // FCFA
const PRICE_PER_WHATSAPP = 35; // FCFA

function computeCampaignCost(channel: string, count: number, smsText: string): number {
  const ch = (channel || '').toUpperCase();
  if (ch === 'SMS') {
    const parts = calculateSMSSegments(smsText);
    return count * parts * SMS_COST_CONFIG.pricePerSms;
  }
  if (ch === 'EMAIL') return count * PRICE_PER_EMAIL;
  if (ch === 'WHATSAPP') return count * PRICE_PER_WHATSAPP;
  return count * PRICE_PER_EMAIL; // fallback
}

interface CampaignAudienceStepProps {
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Step 3: Audience Selection
 * Select segment and preview recipients
 * Calculate estimated cost based on recipient count
 */

export const CampaignAudienceStep: FC<CampaignAudienceStepProps> = ({ onNext, onPrev }) => {
  const { draft, setDraftSegment, updateEstimates } = useCampaignStore();
  const [segments, setSegments] = useState<DynamicSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactCounts, setContactCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<Set<string>>(new Set());

  const loadSegments = async () => {
    try {
      const data = await contactsApi.listSegments();
      setSegments(Array.isArray(data) ? (data as DynamicSegment[]) : []);
    } catch {
      setSegments([]);
    } finally {
      setLoading(false);
    }
  };

  // Load segments from API using proper API client
  useEffect(() => {
    loadSegments();
  }, []);

  // Load contact counts for segments
  useEffect(() => {
    const loadContactCounts = async () => {
      const counts: Record<string, number> = {};
      const loading = new Set<string>();

      for (const segment of segments) {
        if (!contactCounts[segment.id]) {
          loading.add(segment.id);
        }
      }

      if (loading.size === 0) return;
      setLoadingCounts(loading);

      for (const segmentId of loading) {
        try {
          const count = await getSegmentContactCount(segmentId);
          counts[segmentId] = count;
        } catch {
          counts[segmentId] = 0;
        }
      }

      setContactCounts((prev) => ({ ...prev, ...counts }));
      setLoadingCounts(new Set());
    };

    loadContactCounts();
  }, [segments, contactCounts]);

  const selectedSegment = segments.find((s) => s.id === draft.segmentId);
  const selectedContactCount = selectedSegment
    ? (contactCounts[selectedSegment.id] ?? selectedSegment.contactCount ?? 0)
    : 0;

  useEffect(() => {
    if (selectedSegment) {
      const count = contactCounts[selectedSegment.id] ?? selectedSegment.contactCount ?? 0;
      const cost = computeCampaignCost(
        draft.channel || 'EMAIL',
        count,
        draft.smsContent?.message || '',
      );
      updateEstimates(count, cost);
    }
  }, [selectedSegment, contactCounts, updateEstimates]);

  if (draft.mode === 'automation') {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
        <div className="flex justify-center overflow-x-auto">
          <div className="campaign-step-bar-inner flex items-center gap-2 sm:gap-4 w-full min-w-0">
            <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
              <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
                ✓
              </span>
              <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
                Canal
              </span>
            </div>
            <div className="w-20 h-[2px] bg-primary/40" />
            <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
              <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
                ✓
              </span>
              <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
                Contenu
              </span>
            </div>
            <div className="w-20 h-[2px] bg-primary/40" />
            <div className="flex flex-col items-center gap-2 flex-1 text-primary">
              <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-on-primary shadow-lg shadow-primary/20">
                3
              </span>
              <span className="text-xs font-bold uppercase hidden sm:inline">Audience</span>
            </div>
            <div className="w-20 h-[2px] bg-outline-variant/30" />
            <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
              <span className="w-10 h-10 rounded-full border-2 border-outline-variant flex items-center justify-center font-bold text-sm">
                4
              </span>
              <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
                Planif.
              </span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-4xl font-headline font-bold text-on-surface">Audience facultative</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto">
            Cette campagne est en mode automatisé. Vous pouvez personnaliser le contenu, mais aucun
            segment n'est requis.
          </p>
        </div>

        <div className="max-w-3xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 p-8 text-left space-y-4">
          <p className="font-bold text-on-surface">Ce que cela change</p>
          <ul className="space-y-2 text-on-surface-variant">
            <li>• La campagne peut être enregistrée sans segment.</li>
            <li>• La personnalisation reste disponible dans l’étape Contenu.</li>
            <li>• Le module Campagnes reste cohérent avec les automatisations.</li>
          </ul>
        </div>

        <div className="flex justify-between gap-4">
          <button
            onClick={onPrev}
            className="px-8 py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors"
          >
            ← Précédent
          </button>
          <button
            onClick={onNext}
            className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-all active:scale-95"
          >
            Continuer →
          </button>
        </div>
      </div>
    );
  }

  const handleSelectSegment = (segmentId: string, segmentName: string | null) => {
    setDraftSegment(segmentId, segmentName || 'Sans nom');
  };

  const formatCost = (amount: number) => `${amount.toFixed(2)} FCFA`;
  const getContactCount = (segment: DynamicSegment) => {
    return contactCounts[segment.id] ?? segment.contactCount ?? 0;
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 text-center">
        <div className="animate-spin inline-block">
          <span className="material-symbols-outlined text-primary text-4xl">refresh</span>
        </div>
        <p className="mt-4 text-on-surface-variant">Chargement des segments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12">
      {/* Step Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4 w-full">
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
              Canal
            </span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
              Contenu
            </span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 text-primary">
            <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-on-primary shadow-lg shadow-primary/20">
              3
            </span>
            <span className="text-xs font-bold uppercase hidden sm:inline">Audience</span>
          </div>
          <div className="w-20 h-[2px] bg-outline-variant/30" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full border-2 border-outline-variant flex items-center justify-center font-bold text-sm">
              4
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase hidden sm:inline">
              Planif.
            </span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-headline font-bold text-on-surface">
          Sélectionnez votre audience
        </h2>
        <p className="text-on-surface-variant max-w-2xl mx-auto">
          Choisissez un segment de contacts pour cibler votre campagne. Le nombre de destinataires
          est calculé en temps réel depuis votre base de données.
        </p>
      </div>

      {/* Segments Grid */}
      {segments.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center p-12 bg-gradient-to-br from-surface-container-lowest to-surface-container-low rounded-2xl border border-warning/30">
            <span className="text-5xl mb-4 block">🎯</span>
            <h3 className="font-headline font-bold text-lg text-on-surface mb-2">
              Aucun segment disponible
            </h3>
            <p className="text-on-surface-variant mb-6">
              Vous devez créer un segment avant de pouvoir envoyer une campagne.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contacts"
                className="px-6 py-3 bg-primary text-on-primary font-bold rounded-xl hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">add_circle</span>
                Créer un segment
              </a>
              <button
                onClick={() => {
                  window.location.reload();
                }}
                className="px-6 py-3 bg-surface-container-high text-on-surface font-semibold rounded-xl hover:bg-surface-container-highest transition-colors"
              >
                Rafraîchir
              </button>
            </div>
            <div className="mt-6 text-left">
              <details className="p-4 bg-surface-container-lowest rounded border border-outline-variant/30">
                <summary className="cursor-pointer font-semibold text-on-surface-variant hover:text-on-surface">
                  🔧 Diagnostic technique
                </summary>
                <pre className="mt-4 text-xs overflow-auto max-h-40 bg-surface-container p-2 rounded font-mono text-on-surface-variant">
                  {`
Ouvrez la console (F12) et cherchez:
1. "📡 Fetching segments from API..." 
2. "✅ Raw API response:" → vérifiez le contenu
3. "✅ Segments loaded successfully: X items"

Si X = 0, cela signifie:
- Aucun segment n'a été créé
- OU l'API n'est pas configurée correctement
- OU l'authentification a échoué

Créez un segment depuis la page Contacts
puis revenez ici avec "Rafraîchir".
                `.trim()}
                </pre>
              </details>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/30">
            <h4 className="font-headline font-bold text-on-surface mb-4">
              Comment créer un segment ?
            </h4>
            <ol className="space-y-3 text-on-surface-variant">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  1
                </span>
                <span>
                  Allez dans <strong>Contacts</strong> et sélectionnez <strong>Segments</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  2
                </span>
                <span>
                  Cliquez sur <strong>Créer un segment</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  3
                </span>
                <span>
                  Définissez les critères (tags, localisation, comportement) ou sélectionnez les
                  contacts manuellement
                </span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  4
                </span>
                <span>Revenez ici pour sélectionner votre segment et continuer</span>
              </li>
            </ol>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {segments.map((segment) => {
            const count = getContactCount(segment);
            const isLoading = loadingCounts.has(segment.id);
            return (
              <button
                key={segment.id}
                onClick={() => handleSelectSegment(segment.id, segment.name)}
                className={`p-6 rounded-2xl border-2 transition-all text-left ${
                  draft.segmentId === segment.id
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">
                        {segment.name || 'Sans nom'}
                      </h3>
                      <p className="text-on-surface-variant text-sm mt-1">
                        {segment.type === 'static'
                          ? '📋 Sélection manuelle'
                          : segment.type === 'dynamic'
                            ? '🔍 Filtres dynamiques'
                            : '📊 Segment'}
                      </p>
                    </div>
                    {draft.segmentId === segment.id && (
                      <span className="material-symbols-outlined text-primary text-2xl">
                        check_circle
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between pt-4 border-t border-outline-variant/20">
                    <div>
                      <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                        Contacts
                      </p>
                      {isLoading ? (
                        <div className="animate-pulse h-7 w-20 bg-on-surface/10 rounded" />
                      ) : (
                        <p className="font-headline font-black text-2xl text-on-surface">
                          {count.toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                        Coût estimé
                      </p>
                      {isLoading ? (
                        <div className="animate-pulse h-7 w-24 bg-primary/10 rounded" />
                      ) : (
                        <p className="font-headline font-bold text-primary">
                          {formatCost(count * 0.08)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary Card */}
      {selectedSegment && (
        <div className="bg-primary/5 border-2 border-primary rounded-2xl p-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                Segment sélectionné
              </p>
              <p className="font-headline font-bold text-xl text-on-surface">
                {selectedSegment.name}
              </p>
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                Nombre de destinataires
              </p>
              {loadingCounts.has(selectedSegment.id) ? (
                <div className="animate-pulse h-7 w-24 bg-on-surface/10 rounded" />
              ) : (
                <p className="font-headline font-bold text-xl text-on-surface">
                  {selectedContactCount.toLocaleString('fr-FR')}
                </p>
              )}
            </div>
            <div>
              <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-2">
                Coût total estimé
              </p>
              {loadingCounts.has(selectedSegment.id) ? (
                <div className="animate-pulse h-7 w-24 bg-primary/10 rounded" />
              ) : (
                <p className="font-headline font-bold text-xl text-primary">
                  {formatCost(selectedContactCount * 0.08)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-4">
        <button
          onClick={onPrev}
          className="px-8 py-3 text-on-surface-variant font-bold hover:text-on-surface transition-colors"
        >
          ← Précédent
        </button>
        <button
          disabled={!draft.segmentId}
          onClick={onNext}
          className="px-8 py-3 bg-primary text-on-primary font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
        >
          Continuer →
        </button>
      </div>
    </div>
  );
};
