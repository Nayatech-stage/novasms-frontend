import type { FC } from 'react';
import { useCampaignStore } from '@/store/campaign.store';

interface CampaignChannelStepProps {
  onNext: () => void;
}

/**
 * Step 1: Select Channel (SMS or EMAIL)
 * Sets campaign.channel and initializes content structure
 */

export const CampaignChannelStep: FC<CampaignChannelStepProps> = ({ onNext }) => {
  const { draft, setDraftChannel, setDraftName } = useCampaignStore();

  const handleSelectChannel = (channel: 'SMS' | 'EMAIL') => {
    setDraftChannel(channel);
  };

  const isValid = draft.channel && draft.name && draft.name.length >= 3;
  const isAutomationMode = draft.mode === 'automation';

  return (
    <div className="max-w-4xl mx-auto px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 text-primary bg-primary/10 px-4 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-sm">flag</span>
            <span className="text-xs font-bold uppercase tracking-widest">Étape 1 sur 4</span>
          </div>
        </div>
        <h2 className="text-4xl font-headline font-bold text-on-surface">
          Sélectionnez votre canal
        </h2>
        <p className="text-on-surface-variant max-w-2xl mx-auto">
          Choisissez un canal classique ou activez le mode automatisé pour créer une campagne sans
          segment.
        </p>
      </div>

      <div className="max-w-2xl mx-auto rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm text-on-surface-variant">
        <p className="font-semibold text-on-surface">Mode de campagne</p>
        <div className="mt-3 inline-flex rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-semibold text-secondary">
          {isAutomationMode ? 'Automatisation sans segment' : 'Campagne classique'}
        </div>
        <p className="mt-3 text-xs">
          {isAutomationMode
            ? 'Le mode a été défini depuis la page d’entrée. L’audience n’est pas obligatoire.'
            : 'Le mode a été défini depuis la page d’entrée. L’audience sera choisie à l’étape suivante.'}
        </p>
      </div>

      {/* Campaign Name Input */}
      <div className="max-w-md mx-auto space-y-3">
        <label className="block text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
          Nom de la campagne
        </label>
        <input
          type="text"
          value={draft.name || ''}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Ex: Soldes d'Hiver 2024"
          className="w-full bg-surface-container-lowest border-none ring-1 ring-outline-variant focus:ring-2 focus:ring-primary rounded-xl px-4 py-3 font-body text-on-surface placeholder:text-on-surface-variant/50 transition-all"
        />
      </div>

      {/* Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
        {/* SMS Card */}
        <button
          onClick={() => handleSelectChannel('SMS')}
          className={`p-8 rounded-2xl border-2 transition-all ${
            draft.channel === 'SMS'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50'
          }`}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-secondary-container">
              <span className="material-symbols-outlined text-4xl text-secondary">sms</span>
            </div>
            <div className="text-left space-y-2">
              <h3 className="font-headline font-bold text-xl text-on-surface">SMS</h3>
              <p className="text-on-surface-variant text-sm">
                Messages texte haute priorité, taux de livraison 99%.
              </p>
              <div className="flex gap-2 flex-wrap pt-2">
                <span className="text-[10px] font-bold bg-secondary-container/30 text-secondary px-2 py-1 rounded-lg">
                  160 chars
                </span>
                <span className="text-[10px] font-bold bg-secondary-container/30 text-secondary px-2 py-1 rounded-lg">
                  Temps réel
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* EMAIL Card */}
        <button
          onClick={() => handleSelectChannel('EMAIL')}
          className={`p-8 rounded-2xl border-2 transition-all ${
            draft.channel === 'EMAIL'
              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
              : 'border-outline-variant/30 bg-surface-container-lowest hover:border-primary/50'
          }`}
        >
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-tertiary-container">
              <span className="material-symbols-outlined text-4xl text-tertiary">mail</span>
            </div>
            <div className="text-left space-y-2">
              <h3 className="font-headline font-bold text-xl text-on-surface">EMAIL</h3>
              <p className="text-on-surface-variant text-sm">
                Campagnes richement formatées avec images & CTA.
              </p>
              <div className="flex gap-2 flex-wrap pt-2">
                <span className="text-[10px] font-bold bg-tertiary-container/30 text-tertiary px-2 py-1 rounded-lg">
                  HTML
                </span>
                <span className="text-[10px] font-bold bg-tertiary-container/30 text-tertiary px-2 py-1 rounded-lg">
                  Templates
                </span>
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 pt-12">
        <button
          disabled={!isValid}
          onClick={onNext}
          className="px-12 py-4 bg-primary text-on-primary font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
        >
          Continuer
          <span className="material-symbols-outlined text-sm ml-2 align-middle">arrow_forward</span>
        </button>
      </div>

      {!isValid && (
        <p className="text-center text-error text-sm font-medium">
          Veuillez sélectionner un canal et entrer un nom de campagne
        </p>
      )}
    </div>
  );
};
