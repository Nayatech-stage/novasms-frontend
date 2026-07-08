import type { FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCampaignStore } from '@/store/campaign.store';
import {
  saveCampaignDraft,
  sendCampaign,
  cancelCampaign,
  validateCampaignSchedule,
  type CampaignScheduleValidationResult,
} from '@/services/campaignService';
import api from '@/api/axios';

interface CampaignScheduleStepProps {
  onSubmit: () => void;
  onPrev: () => void;
}

export const CampaignScheduleStep: FC<CampaignScheduleStepProps> = ({ onPrev }) => {
  const navigate = useNavigate();
  const { draft, setDraftSchedule, setDraftABTest, clearDraft, selectedCampaignId } =
    useCampaignStore();
  const isAutomationMode = draft.mode === 'automation';

  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>(
    draft.schedule?.type === 'scheduled' ? 'scheduled' : 'immediate',
  );
  const [scheduledDate, setScheduledDate] = useState(
    draft.schedule?.scheduledAt
      ? new Date(draft.schedule.scheduledAt).toISOString().split('T')[0]
      : '',
  );
  const [scheduledTime, setScheduledTime] = useState(
    draft.schedule?.scheduledAt
      ? new Date(draft.schedule.scheduledAt).toTimeString().slice(0, 5)
      : '10:00',
  );
  const [timezone, setTimezone] = useState(draft.schedule?.timezone || 'Africa/Abidjan');
  const [abEnabled, setAbEnabled] = useState(draft.abTest?.enabled || false);
  const [splitRatio, setSplitRatio] = useState(draft.abTest?.splitRatio || 20);
  const [winnerCriteria, setWinnerCriteria] = useState(draft.abTest?.winnerCriteria || 'open_rate');
  const [autoEvaluate, setAutoEvaluate] = useState(draft.abTest?.autoEvaluate || false);
  const [variantASubject, setVariantASubject] = useState(
    draft.abTest?.variantA?.emailSubject || draft.emailContent?.subject || '',
  );
  const [variantBSubject, setVariantBSubject] = useState(
    draft.abTest?.variantB?.emailSubject ||
      `${draft.emailContent?.subject || 'Votre message'} - variante B`,
  );
  const [variantAMessage, setVariantAMessage] = useState(
    draft.abTest?.variantA?.smsMessage || draft.smsContent?.message || '',
  );
  const [variantBMessage, setVariantBMessage] = useState(
    draft.abTest?.variantB?.smsMessage ||
      `${draft.smsContent?.message || 'Votre message SMS'}\n\nVariante B`,
  );
  const [variantAHtml, setVariantAHtml] = useState(draft.abTest?.variantA?.emailHtml || '');
  const [variantBHtml, setVariantBHtml] = useState(draft.abTest?.variantB?.emailHtml || '');
  const [promoCode, setPromoCode] = useState(draft.promoCode || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isValidatingSchedule, setIsValidatingSchedule] = useState(false);
  const [scheduleWarnings, setScheduleWarnings] = useState<string[]>([]);
  const [lastValidationLabel, setLastValidationLabel] = useState('');

  const plannedDate =
    scheduleType === 'scheduled' && scheduledDate && scheduledTime
      ? new Date(`${scheduledDate}T${scheduledTime}`)
      : null;

  useEffect(() => {
    setScheduleType(draft.schedule?.type === 'scheduled' ? 'scheduled' : 'immediate');
    setScheduledDate(
      draft.schedule?.scheduledAt
        ? new Date(draft.schedule.scheduledAt).toISOString().split('T')[0]
        : '',
    );
    setScheduledTime(
      draft.schedule?.scheduledAt
        ? new Date(draft.schedule.scheduledAt).toTimeString().slice(0, 5)
        : '10:00',
    );
    setTimezone(draft.schedule?.timezone || 'Africa/Abidjan');
    setAbEnabled(draft.abTest?.enabled || false);
    setSplitRatio(draft.abTest?.splitRatio || 20);
    setWinnerCriteria(draft.abTest?.winnerCriteria || 'open_rate');
    setAutoEvaluate(draft.abTest?.autoEvaluate || false);
    setVariantASubject(draft.abTest?.variantA?.emailSubject || draft.emailContent?.subject || '');
    setVariantBSubject(
      draft.abTest?.variantB?.emailSubject ||
        `${draft.emailContent?.subject || 'Votre message'} - variante B`,
    );
    setVariantAMessage(draft.abTest?.variantA?.smsMessage || draft.smsContent?.message || '');
    setVariantBMessage(
      draft.abTest?.variantB?.smsMessage ||
        `${draft.smsContent?.message || 'Votre message SMS'}\n\nVariante B`,
    );
    setVariantAHtml(draft.abTest?.variantA?.emailHtml || '');
    setVariantBHtml(draft.abTest?.variantB?.emailHtml || '');
    setPromoCode(draft.promoCode || '');
  }, [
    draft.schedule?.scheduledAt,
    draft.schedule?.timezone,
    draft.schedule?.type,
    draft.abTest?.enabled,
    draft.abTest?.splitRatio,
    draft.abTest?.winnerCriteria,
    draft.abTest?.autoEvaluate,
    draft.abTest?.variantA?.emailSubject,
    draft.abTest?.variantA?.emailHtml,
    draft.abTest?.variantA?.smsMessage,
    draft.abTest?.variantB?.emailSubject,
    draft.abTest?.variantB?.emailHtml,
    draft.abTest?.variantB?.smsMessage,
    draft.promoCode,
    draft.emailContent?.subject,
    draft.smsContent?.message,
  ]);

  const buildEmailTextContent = (emailContent = draft.emailContent) => {
    const blocks = emailContent?.blocks || [];
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

  const buildEmailContentPayload = (emailContent = draft.emailContent, channel = draft.channel) => {
    if (channel !== 'EMAIL') return undefined;

    return {
      subject: emailContent?.subject || '',
      preheader: emailContent?.preheader || '',
      blocks: emailContent?.blocks || [],
    };
  };

  const handleScheduleChange = () => {
    if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
      const dt = new Date(`${scheduledDate}T${scheduledTime}`);
      setDraftSchedule({ type: 'scheduled', scheduledAt: dt, timezone });
    } else {
      setDraftSchedule({ type: 'immediate', timezone });
    }
  };

  const handleABTestChange = () => {
    const abTestConfig = draft.abTest || {
      enabled: false,
      splitRatio: 20,
      variantA: { emailSubject: '', smsMessage: '' },
      variantB: { emailSubject: '', smsMessage: '' },
    };
    setDraftABTest({
      ...abTestConfig,
      enabled: abEnabled,
      splitRatio,
      winnerCriteria,
      autoEvaluate,
      variantA: {
        emailSubject: variantASubject,
        smsMessage: variantAMessage,
        emailHtml: variantAHtml,
      },
      variantB: {
        emailSubject: variantBSubject,
        smsMessage: variantBMessage,
        emailHtml: variantBHtml,
      },
    });
  };

  const buildContentJsonWithABTemplates = (
    emailContent = draft.emailContent,
    channel = draft.channel,
  ) => {
    const baseEmail = buildEmailContentPayload(emailContent, channel);
    if (!baseEmail) return undefined;

    if (!abEnabled) {
      return baseEmail;
    }

    return {
      ...baseEmail,
      abTestConfig: {
        enabled: true,
        splitRatio,
        winnerCriteria,
        autoEvaluate,
        variantA: {
          emailSubject: variantASubject,
          smsMessage: variantAMessage,
          emailHtml: variantAHtml,
        },
        variantB: {
          emailSubject: variantBSubject,
          smsMessage: variantBMessage,
          emailHtml: variantBHtml,
        },
      },
    };
  };

  const buildScheduleValidationPayload = () => {
    const payload: {
      immediateOrScheduled: 'immediate' | 'scheduled';
      scheduledAt?: string;
      timezone: string;
    } = {
      immediateOrScheduled: scheduleType,
      timezone,
    };

    if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
      payload.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    return payload;
  };

  const runScheduleValidation = async (
    campaignId: string,
    options?: { silent?: boolean },
  ): Promise<CampaignScheduleValidationResult | null> => {
    setIsValidatingSchedule(true);
    const result = await validateCampaignSchedule(campaignId, buildScheduleValidationPayload());
    setIsValidatingSchedule(false);

    if (!result.success) {
      setScheduleWarnings([]);
      setLastValidationLabel('Validation indisponible');
      if (!options?.silent) {
        toast.error(result.error || 'Impossible de valider la planification');
      }
      return null;
    }

    const validation = result.data as CampaignScheduleValidationResult;
    setScheduleWarnings(validation.warnings || []);
    setLastValidationLabel(
      `Validé à ${new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })}`,
    );
    return validation;
  };

  useEffect(() => {
    if (!selectedCampaignId) {
      setScheduleWarnings([]);
      setLastValidationLabel('');
      return;
    }

    if (scheduleType === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      setScheduleWarnings([]);
      setLastValidationLabel('');
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void runScheduleValidation(selectedCampaignId, { silent: true });
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [selectedCampaignId, scheduleType, scheduledDate, scheduledTime, timezone]);

  // 📌 Enregistrer brouillon (ne requiert PAS de segmentId)
  const handleSaveDraft = async () => {
    if (!draft.channel || !draft.name) {
      toast.error('Veuillez indiquer un nom et un canal pour la campagne');
      return;
    }

    if (!isAutomationMode && !draft.segmentId) {
      toast.error("Veuillez sélectionner un segment d'audience");
      return;
    }

    setIsSaving(true);
    handleScheduleChange();
    handleABTestChange();

    try {
      const latestDraft = useCampaignStore.getState().draft;

      let campaignId = selectedCampaignId;
      if (!campaignId) {
        const createRes = await api.post<{ id: string }>('/campaigns', {
          channelType: latestDraft.channel,
          name: latestDraft.name,
          status: isAutomationMode ? 'AUTOMATION' : 'DRAFT',
          segmentId: isAutomationMode ? undefined : latestDraft.segmentId,
        });
        campaignId = createRes.data.id;
        useCampaignStore.setState({ selectedCampaignId: campaignId });
      }

      const subject =
        latestDraft.channel === 'EMAIL' ? latestDraft.emailContent?.subject : undefined;
      const content =
        latestDraft.channel === 'SMS'
          ? latestDraft.smsContent?.message
          : buildEmailTextContent(latestDraft.emailContent);

      const draftData: Record<string, unknown> = {
        name: latestDraft.name,
        timezone,
      };
      if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
        draftData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }
      if (isAutomationMode) {
        draftData.status = 'AUTOMATION';
      }
      if (subject) draftData.subject = subject;
      if (content) draftData.content = content;
      const emailContentPayload = buildEmailContentPayload(
        latestDraft.emailContent,
        latestDraft.channel,
      );
      if (emailContentPayload) {
        draftData.emailContent = emailContentPayload;
        draftData.contentJson = buildContentJsonWithABTemplates(
          latestDraft.emailContent,
          latestDraft.channel,
        );
      }
      if (abEnabled) {
        draftData.subjectA = variantASubject;
        draftData.subjectB = variantBSubject;
        draftData.abSplitPct = splitRatio;
      }
      if (latestDraft.segmentId && !isAutomationMode) draftData.segmentId = latestDraft.segmentId;
      if (promoCode) draftData.promoCode = promoCode;

      const result = await saveCampaignDraft(campaignId, draftData);
      setIsSaving(false);

      if (result.success) {
        toast.success(isAutomationMode ? '✓ Automatisation enregistrée' : '✓ Brouillon sauvegardé');
        if (isAutomationMode) {
          clearDraft();
          navigate('/campaigns');
        } else {
          await runScheduleValidation(campaignId, { silent: true });
        }
      } else {
        toast.error(result.error || 'Erreur lors de la sauvegarde');
      }
    } catch {
      toast.error('Erreur lors de la sauvegarde du brouillon');
      setIsSaving(false);
    }
  };

  // 📌 Envoyer ou programmer
  const handleSendCampaign = async () => {
    const latestDraft = useCampaignStore.getState().draft;

    if (isAutomationMode) {
      await handleSaveDraft();
      return;
    }

    // Guard: A/B test active but variants are identical → refuse send
    if (isAbIdentical) {
      toast.error(
        "Les variantes A et B sont identiques. Modifiez l'objet ou le contenu avant d'envoyer.",
      );
      return;
    }

    if (!latestDraft.segmentId) {
      toast.error("Veuillez sélectionner un segment d'audience");
      return;
    }

    const subject = latestDraft.channel === 'EMAIL' ? latestDraft.emailContent?.subject : undefined;
    const content =
      latestDraft.channel === 'SMS'
        ? latestDraft.smsContent?.message
        : buildEmailTextContent(latestDraft.emailContent);

    if (!subject && !content) {
      toast.error('Veuillez ajouter du contenu à votre campagne');
      return;
    }

    setIsSaving(true);
    handleScheduleChange();

    if (scheduleType === 'scheduled') {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Choisissez une date et une heure pour la programmation');
        setIsSaving(false);
        return;
      }

      const plannedDate = new Date(`${scheduledDate}T${scheduledTime}`);
      if (Number.isNaN(plannedDate.getTime()) || plannedDate.getTime() <= Date.now()) {
        toast.error('La date planifiée doit être dans le futur');
        setIsSaving(false);
        return;
      }
    }

    // Validation SMS : le contenu doit contenir "STOP" (obligation légale)
    if (latestDraft.channel === 'SMS') {
      const smsText = latestDraft.smsContent?.message || content || '';
      if (smsText.trim().length > 0 && !/\bSTOP\b/i.test(smsText)) {
        toast.error(
          'Le message SMS doit contenir le mot "STOP" pour permettre le désabonnement (obligation légale).',
        );
        setIsSaving(false);
        return;
      }
    }

    try {
      // If no campaignId, first create the campaign
      let campaignId = selectedCampaignId;
      if (!campaignId) {
        const createRes = await api.post<{ id: string }>('/campaigns', {
          channelType: latestDraft.channel,
          name: latestDraft.name,
          segmentId: isAutomationMode ? undefined : latestDraft.segmentId,
          promoCode: promoCode || undefined,
          subject,
          content,
          estimatedRecipients: latestDraft.estimatedRecipients || 0,
          estimatedCost: latestDraft.estimatedCost || 0,
          status: isAutomationMode ? 'AUTOMATION' : 'DRAFT',
        });
        campaignId = createRes.data.id;
        useCampaignStore.setState({ selectedCampaignId: campaignId });
      }

      const draftData: Record<string, unknown> = {
        name: latestDraft.name,
        timezone,
        estimatedRecipients: latestDraft.estimatedRecipients || 0,
        estimatedCost: latestDraft.estimatedCost || 0,
      };
      if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
        draftData.scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }
      if (!isAutomationMode && latestDraft.segmentId) {
        draftData.segmentId = latestDraft.segmentId;
      }
      if (isAutomationMode) {
        draftData.status = 'AUTOMATION';
      }
      if (subject) draftData.subject = subject;
      if (content) draftData.content = content;
      const emailContentPayload = buildEmailContentPayload(
        latestDraft.emailContent,
        latestDraft.channel,
      );
      if (emailContentPayload) {
        draftData.emailContent = emailContentPayload;
        draftData.contentJson = buildContentJsonWithABTemplates(
          latestDraft.emailContent,
          latestDraft.channel,
        );
      }
      if (abEnabled) {
        draftData.subjectA = variantASubject;
        draftData.subjectB = variantBSubject;
        draftData.abSplitPct = splitRatio;
      }
      if (promoCode) draftData.promoCode = promoCode;
      const saveResult = await saveCampaignDraft(campaignId, draftData);
      if (!saveResult.success) {
        toast.error(saveResult.error || 'Erreur lors de la sauvegarde du brouillon');
        setIsSaving(false);
        return;
      }

      const validation = await runScheduleValidation(campaignId);
      if (!validation?.isValid) {
        setIsSaving(false);
        toast.error('Le planning doit être corrigé avant envoi');
        return;
      }

      let scheduledAt = undefined;
      if (scheduleType === 'scheduled' && scheduledDate && scheduledTime) {
        scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
      }

      const result = await sendCampaign(campaignId, {
        immediateOrScheduled: scheduleType,
        scheduledAt,
      });
      setIsSaving(false);

      if (result.success) {
        const message =
          scheduleType === 'scheduled'
            ? '✓ Campagne programmée avec succès'
            : '✓ Campagne envoyée avec succès';
        toast.success(message);

        // Refresh list cache so /campaigns reflects latest status without manual reload.
        await useCampaignStore.getState().fetchCampaigns();

        clearDraft();
        setTimeout(() => navigate('/campaigns'), 1500);
      } else {
        console.error('❌ Send campaign error:', result.error);
        toast.error(result.error || "Erreur lors de l'envoi");
      }
    } catch (err) {
      console.error('❌ Error in handleSendCampaign:', err);
      const apiMsg = (() => {
        if (!err || typeof err !== 'object') return null;
        const e = err as { response?: { data?: { message?: unknown; error?: unknown } } };
        const m = e.response?.data?.message ?? e.response?.data?.error;
        return typeof m === 'string' && m.trim() ? m : null;
      })();
      toast.error(apiMsg || "Erreur lors de l'envoi de la campagne.");
      setIsSaving(false);
    }
  };

  // 📌 Abandonner
  const handleCancel = async () => {
    const confirmed = window.confirm(
      'Êtes-vous sûr de vouloir abandonner cette campagne ?\nLe brouillon sera supprimé.',
    );
    if (!confirmed) return;

    try {
      setIsSaving(true);

      if (selectedCampaignId) {
        const result = await cancelCampaign(selectedCampaignId);
        setIsSaving(false);

        if (result.success) {
          toast.success('✓ Campagne annulée');
          clearDraft();
          navigate('/campaigns');
        } else {
          console.error('❌ Cancel campaign error:', result.error);
          toast.error(result.error || "Erreur lors de l'annulation");
        }
      } else {
        clearDraft();
        setIsSaving(false);
        toast.success('✓ Brouillon supprimé');
        navigate('/campaigns');
      }
    } catch (err) {
      console.error('❌ Error in handleCancel:', err);
      toast.error("Erreur lors de l'annulation");
      setIsSaving(false);
    }
  };

  const formatCost = (amount?: number) => `${(amount || 0).toFixed(2)} FCFA`;

  const formatPlannedAt = (value: Date | null) => {
    if (!value || Number.isNaN(value.getTime())) return 'Envoi immédiat';

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
    }).format(value);
  };

  const estimatedVariantA = Math.round((draft.estimatedRecipients || 0) * (splitRatio / 100));
  const estimatedVariantB = Math.max((draft.estimatedRecipients || 0) - estimatedVariantA, 0);
  const channelLabel = draft.channel === 'SMS' ? 'SMS' : 'Email';

  // ── A/B identity guard ─────────────────────────────────────────────────
  // Block send when A/B is active but both variants carry identical content.
  const isAbIdentical = (() => {
    if (!abEnabled) return false;
    if (draft.channel === 'SMS') {
      return variantAMessage.trim() === variantBMessage.trim();
    }
    const sameSubject = variantASubject.trim() === variantBSubject.trim();
    const sameHtml = variantAHtml.trim() === variantBHtml.trim();
    return sameSubject && sameHtml;
  })();
  const variantAPreview =
    draft.channel === 'SMS'
      ? variantAMessage || 'Votre message de test A'
      : `${variantASubject || draft.emailContent?.subject || 'Objet de test A'}\n${buildEmailTextContent() || 'Aucun contenu'}`;
  const variantBPreview =
    draft.channel === 'SMS'
      ? variantBMessage || 'Votre message de test B'
      : `${variantBSubject || draft.emailContent?.subject || 'Objet de test B'}\n${buildEmailTextContent() || 'Aucun contenu'}`;

  return (
    <div className="max-w-6xl mx-auto px-8 py-12 space-y-10">
      {/* Step Indicator */}
      <div className="flex justify-center">
        <div className="flex items-center gap-4 w-full max-w-4xl">
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 opacity-40">
            <span className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm border-2 border-primary/40">
              ✓
            </span>
          </div>
          <div className="w-20 h-[2px] bg-primary/40" />
          <div className="flex flex-col items-center gap-2 flex-1 text-primary">
            <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-sm text-on-primary shadow-lg shadow-primary/20">
              4
            </span>
            <span className="text-xs font-bold uppercase hidden sm:inline">Planification</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8">
        {/* Left: Form */}
        <div className="space-y-8">
          <div className="rounded-3xl border border-outline-variant/20 bg-surface-container-lowest p-8 shadow-sm space-y-8">
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                Étape 4 • Planification
              </p>
              <h2 className="text-4xl font-headline font-bold text-on-surface leading-tight">
                {isAutomationMode
                  ? 'Enregistrez votre campagne automatisée'
                  : 'Planifiez votre envoi'}
              </h2>
              <p className="text-on-surface-variant">
                {isAutomationMode
                  ? 'Aucun segment n’est requis. La campagne sera sauvegardée comme automatisation.'
                  : "Configurez la date et l'heure d'envoi de votre campagne."}
              </p>
            </div>

            {!isAutomationMode && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label
                    className={`rounded-2xl border p-4 cursor-pointer transition-all ${scheduleType === 'immediate' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="schedule"
                        value="immediate"
                        checked={scheduleType === 'immediate'}
                        onChange={(e) => setScheduleType(e.target.value as 'immediate')}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-on-surface block">Envoyer maintenant</span>
                        <span className="text-sm text-on-surface-variant">
                          L’envoi démarre dès l’enregistrement.
                        </span>
                      </div>
                    </div>
                  </label>

                  <label
                    className={`rounded-2xl border p-4 cursor-pointer transition-all ${scheduleType === 'scheduled' ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-outline-variant/20 bg-surface-container-lowest hover:border-primary/40'}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="schedule"
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={(e) => setScheduleType(e.target.value as 'scheduled')}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div>
                        <span className="font-bold text-on-surface block">
                          Programmer pour plus tard
                        </span>
                        <span className="text-sm text-on-surface-variant">
                          Choisissez une date, une heure et un fuseau horaire.
                        </span>
                      </div>
                    </div>
                  </label>
                </div>

                {scheduleType === 'scheduled' && (
                  <div className="mt-6 p-5 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-bold text-on-surface">Date</label>
                        <input
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          className="w-full mt-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-on-surface">Heure</label>
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full mt-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-bold text-on-surface">Fuseau horaire</label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full mt-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                        >
                          <option value="Africa/Abidjan">Afrique de l'Ouest (GMT)</option>
                          <option value="Europe/Paris">Europe (CET)</option>
                          <option value="America/New_York">Amérique (EST)</option>
                        </select>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4 flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5">
                        schedule
                      </span>
                      <div>
                        <p className="font-bold text-on-surface">Aperçu du planning</p>
                        <p className="text-sm text-on-surface-variant">
                          {formatPlannedAt(plannedDate)}
                        </p>
                        {isValidatingSchedule && (
                          <p className="text-xs text-primary mt-2">
                            Validation du planning en cours...
                          </p>
                        )}
                        {!isValidatingSchedule && lastValidationLabel && (
                          <p className="text-xs text-on-surface-variant mt-2">
                            {lastValidationLabel}
                          </p>
                        )}
                        {scheduleWarnings.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {scheduleWarnings.map((warning) => (
                              <li key={warning} className="text-xs text-amber-700">
                                • {warning}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Promo Code */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-on-surface">Code promo</label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Ex: SUMMER2024"
                className="w-full px-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition"
              />
              <p className="text-xs text-on-surface-variant">
                Variable {'{'}
                {'{'} promoCode {'}'}
                {'}'} sera remplacée par cette valeur dans les messages
              </p>
            </div>

            {/* A/B Test Options */}
            <div className="space-y-4 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={abEnabled}
                  onChange={(e) => setAbEnabled(e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                />
                <span className="font-bold text-on-surface">Activer test A/B</span>
              </label>

              {abEnabled && (
                <div className="mt-4 p-4 bg-primary/5 rounded-2xl border border-primary/20 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm font-bold text-on-surface">
                      Ratio de séparation: {splitRatio}%
                    </label>
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">
                      Test A/B
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={splitRatio}
                    onChange={(e) => setSplitRatio(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/20">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                        Variante A
                      </p>
                      <p className="font-bold text-on-surface">
                        {estimatedVariantA.toLocaleString('fr-FR')} contacts
                      </p>
                    </div>
                    <div className="rounded-xl bg-surface-container-lowest p-3 border border-outline-variant/20">
                      <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1">
                        Variante B
                      </p>
                      <p className="font-bold text-on-surface">
                        {estimatedVariantB.toLocaleString('fr-FR')} contacts
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/20 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">
                          Variante A
                        </p>
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {channelLabel}
                        </span>
                      </div>
                      {draft.channel === 'EMAIL' ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={variantASubject}
                            onChange={(e) => setVariantASubject(e.target.value)}
                            placeholder="Objet de l'email A"
                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                          />
                          <textarea
                            value={variantAHtml}
                            onChange={(e) => setVariantAHtml(e.target.value)}
                            rows={5}
                            placeholder="Template HTML A (indépendant)"
                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface resize-none font-mono text-xs"
                          />
                        </div>
                      ) : (
                        <textarea
                          value={variantAMessage}
                          onChange={(e) => setVariantAMessage(e.target.value)}
                          rows={4}
                          placeholder="Message SMS A"
                          className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface resize-none"
                        />
                      )}
                      <div className="rounded-xl bg-white/80 border border-outline-variant/20 p-3 text-sm text-on-surface-variant whitespace-pre-line">
                        {variantAPreview}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-surface-container-lowest p-4 border border-outline-variant/20 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-widest text-primary">
                          Variante B
                        </p>
                        <span className="text-[11px] font-semibold text-on-surface-variant">
                          {channelLabel}
                        </span>
                      </div>
                      {draft.channel === 'EMAIL' ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={variantBSubject}
                            onChange={(e) => setVariantBSubject(e.target.value)}
                            placeholder="Objet de l'email B"
                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                          />
                          <textarea
                            value={variantBHtml}
                            onChange={(e) => setVariantBHtml(e.target.value)}
                            rows={5}
                            placeholder="Template HTML B (indépendant)"
                            className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface resize-none font-mono text-xs"
                          />
                        </div>
                      ) : (
                        <textarea
                          value={variantBMessage}
                          onChange={(e) => setVariantBMessage(e.target.value)}
                          rows={4}
                          placeholder="Message SMS B"
                          className="w-full px-4 py-2 border border-outline-variant rounded-lg bg-surface resize-none"
                        />
                      )}
                      <div className="rounded-xl bg-white/80 border border-outline-variant/20 p-3 text-sm text-on-surface-variant whitespace-pre-line">
                        {variantBPreview}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-bold text-on-surface">Critère gagnant</label>
                      <select
                        value={winnerCriteria}
                        onChange={(e) => setWinnerCriteria(e.target.value as typeof winnerCriteria)}
                        className="w-full mt-2 px-4 py-2 border border-outline-variant rounded-lg bg-surface"
                      >
                        <option value="open_rate">Taux d’ouverture</option>
                        <option value="click_rate">Taux de clic</option>
                        <option value="conversion">Conversion</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-3 cursor-pointer w-full rounded-2xl border border-outline-variant/20 p-4 bg-surface-container-lowest">
                        <input
                          type="checkbox"
                          checked={autoEvaluate}
                          onChange={(e) => setAutoEvaluate(e.target.checked)}
                          className="w-5 h-5 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-on-surface block">
                            Évaluation automatique
                          </span>
                          <span className="text-sm text-on-surface-variant">
                            Choisit le gagnant automatiquement.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    {splitRatio}% recevront la variante A, {100 - splitRatio}% la variante B.
                  </p>
                </div>
              )}
            </div>

            {/* A/B identity warning */}
            {abEnabled && isAbIdentical && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
                <span className="mt-0.5 shrink-0 text-base">⚠️</span>
                <span>
                  Les variantes A et B sont <strong>identiques</strong>. Modifiez au moins
                  l&apos;objet ou le contenu pour activer l&apos;A/B test. L&apos;envoi est bloqué
                  jusqu&apos;à correction.
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={isAutomationMode ? handleSaveDraft : handleSendCampaign}
                disabled={isSaving || (!isAutomationMode && isAbIdentical)}
                className="w-full px-8 py-3 bg-primary text-on-primary font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all active:scale-95"
              >
                {isSaving
                  ? 'Traitement...'
                  : isAutomationMode
                    ? 'Créer la campagne automatisée'
                    : scheduleType === 'scheduled'
                      ? 'Programmer'
                      : 'Envoyer'}
              </button>
              <button
                onClick={() => void handleSaveDraft()}
                disabled={isSaving}
                className="w-full px-8 py-3 border-2 border-primary text-primary font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/5 transition-all active:scale-95"
              >
                {isAutomationMode ? 'Enregistrer comme automatisation' : 'Enregistrer brouillon'}
              </button>
              <button
                onClick={onPrev}
                disabled={isSaving}
                className="w-full px-8 py-3 text-on-surface-variant font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:text-on-surface transition-colors"
              >
                ← Précédent
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="w-full px-8 py-3 text-red-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:text-red-700 transition-colors"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>

        {/* Right: Summary */}
        <div className="sticky top-20 h-fit space-y-6">
          <div className="bg-surface-container rounded-3xl p-8 space-y-6 border border-outline-variant/20 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-bold text-primary uppercase tracking-widest">
                  Aperçu
                </p>
                <h3 className="font-headline font-bold text-xl text-on-surface mt-1">
                  Récapitulatif
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-widest">
                {scheduleType === 'scheduled' ? 'Programmé' : 'Immédiat'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                  Campagne
                </p>
                <p className="font-bold text-on-surface">{draft.name}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                  Canal
                </p>
                <p className="font-bold text-on-surface">{draft.channel}</p>
              </div>
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                  Destinataires
                </p>
                <p className="font-bold text-on-surface">
                  {draft.estimatedRecipients?.toLocaleString('fr-FR')} contacts
                </p>
              </div>
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                  Coût total
                </p>
                <p className="font-headline font-black text-2xl text-primary">
                  {formatCost(draft.estimatedCost)}
                </p>
              </div>
              {scheduleType === 'scheduled' && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                    Envoi prévu
                  </p>
                  <p className="font-bold text-on-surface leading-relaxed">
                    {formatPlannedAt(plannedDate)}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Fuseau horaire : {timezone}
                  </p>
                </div>
              )}
              {scheduleWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-amber-800 text-xs font-bold uppercase tracking-widest mb-2">
                    Avertissements planning
                  </p>
                  <ul className="space-y-1">
                    {scheduleWarnings.map((warning) => (
                      <li key={`summary-${warning}`} className="text-sm text-amber-900">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                  {lastValidationLabel && (
                    <p className="text-[11px] text-amber-700 mt-2">{lastValidationLabel}</p>
                  )}
                </div>
              )}
              {abEnabled && (
                <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-4">
                  <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mb-1">
                    Test A/B
                  </p>
                  <p className="font-bold text-on-surface">
                    {splitRatio}% / {100 - splitRatio}%
                  </p>
                  <p className="text-xs text-on-surface-variant mt-2">
                    Critère gagnant: {winnerCriteria.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Variante A: {estimatedVariantA.toLocaleString('fr-FR')} • Variante B:{' '}
                    {estimatedVariantB.toLocaleString('fr-FR')}
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {autoEvaluate ? 'Évaluation automatique activée' : 'Évaluation manuelle'}
                  </p>
                </div>
              )}

              {scheduleWarnings.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-amber-800 text-xs font-bold uppercase tracking-widest mb-2">
                    Avertissements de validation
                  </p>
                  {lastValidationLabel && (
                    <p className="text-xs text-amber-700 mb-2">{lastValidationLabel}</p>
                  )}
                  <ul className="space-y-1">
                    {scheduleWarnings.map((warning) => (
                      <li key={`summary-${warning}`} className="text-xs text-amber-800">
                        • {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
