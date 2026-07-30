import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useCampaignStore } from '@/store/campaign.store';
import { EmailEditor } from '../editors/EmailEditor';
import { SMSEditor } from '../editors/SMSEditor';
import { TemplatePreviewLibrary } from '../TemplatePreviewLibrary';
import type { EmailTemplate } from '@/types/email-templates';

interface CampaignContentStepProps {
  onNext: () => void;
  onPrev: () => void;
}

/**
 * Step 2: Content Editor
 * Routes to Email or SMS editor based on selected channel
 * Persists content changes to store
 */

export const CampaignContentStep: FC<CampaignContentStepProps> = ({ onNext, onPrev }) => {
  const { draft, setDraftEmailContent } = useCampaignStore();
  const [showTemplates, setShowTemplates] = useState(!draft.emailContent?.subject); // Show templates si pas de contenu

  useEffect(() => {
    setShowTemplates(draft.channel === 'EMAIL' && !draft.emailContent?.subject);
  }, [draft.channel, draft.emailContent?.subject]);

  const handleTemplateSelect = (template: EmailTemplate) => {
    setDraftEmailContent({
      subject: template.content.subject,
      preheader: template.content.preheader ?? '',
      blocks: template.content.blocks,
    });
    setShowTemplates(false);
  };

  if (!draft.channel) {
    return (
      <div className="text-center py-12">
        <p className="text-error">Veuillez sélectionner un canal d'abord</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Step Indicator */}
      <div className="flex justify-center px-8">
        <div className="flex items-center gap-4 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase">Canal</span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 text-primary">
            <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-on-primary shadow-lg shadow-primary/20">
              2
            </span>
            <span className="text-xs font-bold uppercase">Contenu</span>
          </div>
          <div className="w-20 h-[2px] bg-outline-variant/30" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full border-2 border-outline-variant flex items-center justify-center font-bold text-sm">
              3
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase">Audience</span>
          </div>
          <div className="w-20 h-[2px] bg-outline-variant/30" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full border-2 border-outline-variant flex items-center justify-center font-bold text-sm">
              4
            </span>
            <span className="text-xs font-bold text-on-surface-variant uppercase">Planif.</span>
          </div>
        </div>
      </div>

      {/* Content Editor or Template Library */}
      {draft.channel === 'SMS' ? (
        <SMSEditor />
      ) : showTemplates ? (
        <div className="space-y-8">
          <div className="text-center space-y-2 px-8">
            <h2 className="font-headline font-black text-2xl text-on-surface">
              Choisir un modèle d'email
            </h2>
            <p className="text-on-surface-variant">
              Ou{' '}
              <button
                onClick={() => setShowTemplates(false)}
                className="text-primary font-bold hover:underline"
              >
                créer un email vierge
              </button>
            </p>
          </div>
          <TemplatePreviewLibrary onUseTemplate={handleTemplateSelect} />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="flex justify-end px-8">
            <button
              onClick={() => setShowTemplates(true)}
              className="text-sm text-primary hover:text-primary/80 flex items-center gap-2"
            >
              <span className="material-symbols-outlined">library_books</span>
              Voir les modèles
            </button>
          </div>
          <EmailEditor />
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between px-8 py-8 border-t border-outline-variant/10">
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
};
