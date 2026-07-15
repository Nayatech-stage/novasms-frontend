import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useCampaignStore } from '@/store/campaign.store';
import { CampaignChannelStep } from './steps/CampaignChannelStep';
import { CampaignContentStep } from './steps/CampaignContentStep';
import { CampaignAudienceStep } from './steps/CampaignAudienceStep';
import { CampaignScheduleStep } from './steps/CampaignScheduleStep';
import api from '@/api/axios';
import { saveCampaignDraft } from '@/services/campaignService';
import { getCampaignDetails } from '@/services/campaignService';

/**
 * CampaignWizard — Orchestrate 4-step workflow
 * Synchronizes: Channel → Content (Email/SMS) → Audience → Schedule/A/B/Review
 * Persists to Zustand store automatically
 */

export const CampaignWizard: FC = () => {
  const { id: campaignId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { draft, setDraftStep, saveDraft, clearDraft, selectedCampaignId, error, isLoading } =
    useCampaignStore();

  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [isSavingAndLeaving, setIsSavingAndLeaving] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const buildEmailTextContent = () => {
    const blocks = draft.emailContent?.blocks || [];
    return blocks
      .map((block) => {
        if (block.type === 'text' && typeof block.content.text === 'string') {
          return block.content.text;
        }
        if (block.type === 'button' && typeof block.content.text === 'string') {
          return block.content.text;
        }
        return '';
      })
      .filter(Boolean)
      .join('\n\n')
      .trim();
  };

  const buildRemoteDraftPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      name: draft.name,
    };

    if (draft.mode === 'automation') {
      payload.status = 'AUTOMATION';
    } else if (draft.segmentId) {
      payload.segmentId = draft.segmentId;
    }

    if (draft.channel === 'EMAIL') {
      const emailContentPayload = {
        subject: draft.emailContent?.subject || '',
        preheader: draft.emailContent?.preheader || '',
        blocks: draft.emailContent?.blocks || [],
      };
      payload.emailContent = emailContentPayload;
      payload.contentJson = emailContentPayload;
      if (emailContentPayload.subject) payload.subject = emailContentPayload.subject;

      const textContent = buildEmailTextContent();
      if (textContent) payload.content = textContent;
    }

    if (draft.channel === 'SMS') {
      const smsMessage = draft.smsContent?.message || '';
      if (smsMessage) {
        // RG-22 : le bloc STOP est obligatoire — on l'ajoute automatiquement si absent
        const stopCode = draft.stopCode || 'NOVA_PRECISION';
        const stopSuffix = `\nSTOP au ${stopCode}`;
        const fullMessage = /\bSTOP\b/i.test(smsMessage) ? smsMessage : smsMessage + stopSuffix;
        payload.content = fullMessage;
      }
    }

    if (draft.schedule?.timezone) {
      payload.timezone = draft.schedule.timezone;
    }

    if (draft.promoCode) {
      payload.promoCode = draft.promoCode;
    }

    return payload;
  };

  const persistDraftToBackend = async (): Promise<boolean> => {
    if (!draft.channel || !draft.name) return false;

    let campaignIdToUse = selectedCampaignId;
    if (!campaignIdToUse) {
      const createRes = await api.post<{ id: string }>('/campaigns', {
        channelType: draft.channel,
        name: draft.name,
        status: draft.mode === 'automation' ? 'AUTOMATION' : 'DRAFT',
        segmentId: draft.mode === 'automation' ? undefined : draft.segmentId,
      });
      campaignIdToUse = createRes.data.id;
      useCampaignStore.setState({ selectedCampaignId: campaignIdToUse });
    }

    const result = await saveCampaignDraft(campaignIdToUse, buildRemoteDraftPayload());
    return result.success;
  };

  const formatRelativeLastUpdate = (value: Date | null): string => {
    if (!value) return '';
    return `Dernière modification : ${new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)}`;
  };

  useEffect(() => {
    const isNewCampaign = !campaignId;
    const shouldReset = searchParams.get('fresh') === '1' || isNewCampaign;
    if (shouldReset) {
      clearDraft();
      setDraftStep(1);
      if (searchParams.get('mode') === 'automation') {
        useCampaignStore.setState((state) => ({
          draft: {
            ...state.draft,
            mode: 'automation',
          },
        }));
      }
      searchParams.delete('fresh');
      setSearchParams(searchParams, { replace: true });
    }
  }, [campaignId, clearDraft, searchParams, setDraftStep, setSearchParams]);

  useEffect(() => {
    const automationMode = searchParams.get('mode') === 'automation';
    if (!automationMode) return;

    useCampaignStore.setState((state) => ({
      draft: {
        ...state.draft,
        mode: 'automation',
        segmentId: undefined,
        segmentName: undefined,
      },
    }));
  }, [searchParams]);

  useEffect(() => {
    if (!campaignId) return;

    const hydrateCampaign = async () => {
      try {
        const result = await getCampaignDetails(campaignId);
        if (!result.success || !result.data) return;
        const campaign = result.data as Record<string, unknown>;
        const contentJson =
          campaign.contentJson &&
          typeof campaign.contentJson === 'object' &&
          !Array.isArray(campaign.contentJson)
            ? (campaign.contentJson as Record<string, unknown>)
            : undefined;
        useCampaignStore.setState({
          selectedCampaignId: campaignId,
          draft: {
            step: 1,
            mode:
              typeof campaign.status === 'string' && campaign.status === 'AUTOMATION'
                ? 'automation'
                : 'standard',
            channel:
              typeof campaign.channelType === 'string' && campaign.channelType === 'SMS'
                ? 'SMS'
                : 'EMAIL',
            name: typeof campaign.name === 'string' ? campaign.name : undefined,
            description:
              typeof campaign.description === 'string' ? campaign.description : undefined,
            segmentId: typeof campaign.segmentId === 'string' ? campaign.segmentId : undefined,
            segmentName:
              typeof (campaign.segment as Record<string, unknown> | undefined)?.name === 'string'
                ? String((campaign.segment as Record<string, unknown>).name)
                : undefined,
            emailContent:
              typeof campaign.channelType === 'string' && campaign.channelType === 'EMAIL'
                ? {
                    subject:
                      typeof campaign.subject === 'string'
                        ? campaign.subject
                        : typeof contentJson?.subject === 'string'
                          ? String(contentJson.subject)
                          : '',
                    preheader:
                      typeof contentJson?.preheader === 'string'
                        ? String(contentJson.preheader)
                        : '',
                    blocks: Array.isArray(contentJson?.blocks)
                      ? (contentJson.blocks as never[])
                      : [],
                  }
                : undefined,
            smsContent:
              typeof campaign.channelType === 'string' && campaign.channelType === 'SMS'
                ? {
                    message: typeof campaign.content === 'string' ? campaign.content : '',
                    senderName: '',
                    variables: [],
                  }
                : undefined,
            abTest: campaign.abTest as never,
            schedule: campaign.schedule as never,
            estimatedRecipients:
              typeof campaign.estimatedRecipients === 'number' ? campaign.estimatedRecipients : 0,
            estimatedCost: typeof campaign.estimatedCost === 'number' ? campaign.estimatedCost : 0,
            promoCode: typeof campaign.promoCode === 'string' ? campaign.promoCode : '',
          },
        });
        const updatedAtRaw = typeof campaign.updatedAt === 'string' ? campaign.updatedAt : null;
        if (updatedAtRaw) {
          const updatedAtDate = new Date(updatedAtRaw);
          if (!Number.isNaN(updatedAtDate.getTime())) {
            setLastUpdatedAt(updatedAtDate);
          }
        }
      } catch (error) {
        console.error('Failed to hydrate campaign for editing', error);
      }
    };

    void hydrateCampaign();
  }, [campaignId]);

  useEffect(() => {
    if (draftSaved) {
      const timer = setTimeout(() => setDraftSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [draftSaved]);

  const handleSaveDraft = async () => {
    saveDraft();

    try {
      const persisted = await persistDraftToBackend();
      if (persisted) {
        clearDraft();
        navigate('/campaigns');
      }
    } catch (error) {
      console.error('❌ Error while saving draft to backend:', error);
    }
  };

  const handleNext = async () => {
    saveDraft();
    if (draft.step < 4) {
      const nextStep = (draft.step + 1) as 1 | 2 | 3 | 4;
      setDraftStep(nextStep);
    }
  };

  const handlePrev = () => {
    if (draft.step > 1) {
      const prevStep = (draft.step - 1) as 1 | 2 | 3 | 4;
      setDraftStep(prevStep);
    }
  };

  const handleSubmit = () => {
    // La soumission finale est gérée directement dans CampaignScheduleStep
  };

  const handleDiscard = () => {
    clearDraft();
    setConfirmDiscard(false);
    window.location.href = '/campaigns';
  };

  const handleSaveAndLeave = async () => {
    if (!draft.channel || !draft.name) {
      handleDiscard();
      return;
    }
    setIsSavingAndLeaving(true);
    try {
      const persisted = await persistDraftToBackend();
      if (!persisted) {
        throw new Error('Erreur lors de la sauvegarde du brouillon');
      }
      clearDraft();
      window.location.href = '/campaigns';
    } catch {
      setIsSavingAndLeaving(false);
      return;
    }
  };

  const renderStep = () => {
    switch (draft.step) {
      case 1:
        return <CampaignChannelStep onNext={handleNext} />;
      case 2:
        return <CampaignContentStep onNext={handleNext} onPrev={handlePrev} />;
      case 3:
        return <CampaignAudienceStep onNext={handleNext} onPrev={handlePrev} />;
      case 4:
        return <CampaignScheduleStep onSubmit={handleSubmit} onPrev={handlePrev} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="flex justify-between items-center w-full px-8 h-16 bg-surface border-b border-outline-variant/10 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <h1 className="font-headline text-2xl font-bold text-primary">NovaSMS</h1>
          <div className="h-6 w-[1px] bg-outline-variant/30" />
          <span className="text-sm text-on-surface-variant">
            {draft.name ? `Brouillon: ${draft.name}` : 'Nouvelle campagne'}
          </span>
          {campaignId && lastUpdatedAt && (
            <span className="text-xs text-on-surface-variant">
              {formatRelativeLastUpdate(lastUpdatedAt)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
          {draftSaved && (
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <span className="material-symbols-outlined text-lg">check_circle</span>
              Brouillon sauvegardé
            </div>
          )}
          <button
            onClick={handleSaveDraft}
            disabled={isLoading}
            className="px-4 py-2 bg-surface-container text-on-surface font-semibold hover:bg-surface-container-high transition-colors disabled:opacity-50 rounded-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {campaignId ? 'Enregistrer les modifications' : 'Enregistrer'}
          </button>
          <button
            onClick={() => setConfirmDiscard(true)}
            disabled={isLoading}
            className="px-4 py-2 text-on-surface-variant hover:text-red-600 transition-colors disabled:opacity-50"
          >
            Abandonner
          </button>
        </div>
      </header>

      {/* Wizard Content */}
      <main className="flex-1 py-8">{renderStep()}</main>

      {/* Discard Confirmation Modal */}
      {confirmDiscard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface-container-lowest rounded-xl p-8 max-w-sm w-full mx-4 space-y-6">
            <div className="flex items-center gap-4 text-red-600">
              <span className="material-symbols-outlined text-4xl">warning</span>
              <h3 className="font-headline font-bold text-lg">Abandonner la campagne ?</h3>
            </div>
            <p className="text-on-surface-variant text-sm">
              Que souhaitez-vous faire avec votre campagne en cours ?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setConfirmDiscard(false)}
                className="w-full py-3 bg-surface-container-high text-on-surface font-bold rounded-lg hover:bg-surface-container-highest transition-colors"
              >
                Continuer l'édition
              </button>
              <button
                onClick={handleSaveAndLeave}
                disabled={isSavingAndLeaving}
                className="w-full py-3 bg-primary text-on-primary font-bold rounded-lg hover:brightness-110 transition-colors disabled:opacity-50"
              >
                {isSavingAndLeaving ? 'Sauvegarde...' : 'Enregistrer brouillon et quitter'}
              </button>
              <button
                onClick={handleDiscard}
                className="w-full py-3 text-red-600 font-semibold hover:bg-error-container/20 rounded-lg transition-colors"
              >
                Quitter sans sauvegarder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
