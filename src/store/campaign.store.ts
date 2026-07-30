import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { campaignApi } from '@/api/campaignApi';
import type {
  CampaignAPIUpdateRequest,
  Campaign as CampaignModel,
  CampaignBlock as CampaignBlockModel,
  EmailContent as EmailContentModel,
  SMSContent as SMSContentModel,
  ABTestConfig as ABTestConfigModel,
  ScheduleConfig as ScheduleConfigModel,
} from '@/types/campaign.types';

/**
 * Campaign Store — Persistance complète avec localStorage + Intégration API
 * Synchronise Email, SMS, Schedule, A/B testing et récap final
 * Utilise RG-08 (performance), RG-12 (rapport), RG-13 (multi-tenant)
 */

export type Campaign = CampaignModel;
export type CampaignBlock = CampaignBlockModel;
export type EmailContent = EmailContentModel;
export type SMSContent = SMSContentModel;
export type ABTestConfig = ABTestConfigModel;
export type ScheduleConfig = ScheduleConfigModel;
export type CampaignChannel = Campaign['channel'];
export type CampaignStatus = Campaign['status'];

export interface CampaignDraft {
  step: 1 | 2 | 3 | 4; // 1=Channel, 2=Content, 3=Audience, 4=Schedule
  mode?: 'standard' | 'automation';
  stopCode?: string; // RG-22: SMS STOP code (generated once per draft)
  channel?: CampaignChannel;
  name?: string;
  description?: string;
  segmentId?: string;
  segmentName?: string; // Track segment name for display
  promoCode?: string; // EN-1688: Personalization variable
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  abTest?: ABTestConfig;
  schedule?: ScheduleConfig;
  estimatedRecipients?: number;
  estimatedCost?: number;
}

interface CampaignStore {
  // State
  campaigns: Campaign[];
  draft: CampaignDraft;
  selectedCampaignId?: string;
  isLoading: boolean;
  error?: string;

  // Actions: Draft Management
  setDraftStep: (step: CampaignDraft['step']) => void;
  setDraftMode: (mode: 'standard' | 'automation') => void;
  setDraftChannel: (channel: CampaignChannel) => void;
  setDraftName: (name: string) => void;
  setDraftSegment: (segmentId: string, segmentName: string) => void;
  setDraftEmailContent: (content: EmailContent) => void;
  setDraftSMSContent: (content: SMSContent) => void;
  setDraftABTest: (config: ABTestConfig) => void;
  setDraftSchedule: (config: ScheduleConfig) => void;
  updateEstimates: (recipients: number, cost: number) => void;

  // Actions: Campaign CRUD
  createCampaign: (
    campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt' | 'segmentId'> & {
      segmentId?: string;
    },
  ) => Promise<Campaign>;
  updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<Campaign>;
  deleteCampaign: (id: string) => Promise<void>;
  duplicateCampaign: (id: string) => Promise<Campaign>;
  getCampaign: (id: string) => Campaign | undefined;
  listCampaigns: () => Campaign[];
  fetchCampaigns: () => Promise<void>;

  // Actions: Workflow
  saveDraft: () => void;
  loadDraft: (campaignId?: string) => void;
  clearDraft: () => void;
  submitCampaign: () => Promise<{ success: boolean; campaignId: string }>;

  // Actions: State Management
  setError: (error?: string) => void;
  setLoading: (loading: boolean) => void;
}

const generateStopCode = (): string => {
  return crypto.randomUUID().replace(/-/g, '').substring(0, 5).toUpperCase();
};

const INITIAL_DRAFT: CampaignDraft = {
  step: 1,
  mode: 'standard',
  stopCode: generateStopCode(),
  channel: undefined,
  emailContent: {
    subject: '',
    preheader: '',
    blocks: [],
  },
  smsContent: {
    message: '',
    senderName: '',
    variables: [],
  },
  abTest: {
    enabled: false,
    splitRatio: 20,
    variantA: {},
    variantB: {},
    winnerCriteria: 'open_rate',
    autoEvaluate: false,
  },
  schedule: {
    type: 'immediate',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
  promoCode: '',
};

const normalizeStatus = (status: string | undefined): Campaign['status'] => {
  const value = (status || '').toUpperCase();
  if (value === 'DRAFT') return 'draft';
  if (value === 'SCHEDULED') return 'scheduled';
  if (value === 'SENT') return 'sent';
  if (value === 'FAILED') return 'failed';
  if (value === 'SENDING') return 'scheduled';
  if (value === 'CANCELLED') return 'cancelled';
  if (value === 'AUTOMATION') return 'automation';
  if (value === 'PAUSED') return 'paused';
  return 'draft';
};

const normalizeChannel = (value: unknown): Campaign['channel'] => {
  const channel = typeof value === 'string' ? value.toUpperCase() : '';
  return channel === 'SMS' ? 'SMS' : 'EMAIL';
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
};

const normalizeEmailContent = (response: Record<string, unknown>): EmailContent | undefined => {
  const emailContent = response.emailContent;
  if (emailContent && typeof emailContent === 'object' && !Array.isArray(emailContent)) {
    return emailContent as EmailContent;
  }

  const channel = normalizeChannel(response.channel || response.channelType);
  if (channel !== 'EMAIL') return undefined;

  const contentJson = asRecord(response.contentJson);
  if (!contentJson) return undefined;

  return {
    subject:
      typeof contentJson.subject === 'string'
        ? contentJson.subject
        : typeof response.subject === 'string'
          ? response.subject
          : '',
    preheader: typeof contentJson.preheader === 'string' ? contentJson.preheader : '',
    blocks: Array.isArray(contentJson.blocks) ? (contentJson.blocks as CampaignBlock[]) : [],
  };
};

const normalizeSmsContent = (response: Record<string, unknown>): SMSContent | undefined => {
  const smsContent = response.smsContent;
  if (smsContent && typeof smsContent === 'object' && !Array.isArray(smsContent)) {
    return smsContent as SMSContent;
  }

  const channel = normalizeChannel(response.channel || response.channelType);
  if (channel !== 'SMS') return undefined;

  const message = typeof response.content === 'string' ? response.content : '';
  if (!message) return undefined;

  return {
    message,
    senderName: '',
    variables: [],
  };
};

const normalizeABTest = (response: Record<string, unknown>): ABTestConfig | undefined => {
  if (response.abTest && typeof response.abTest === 'object' && !Array.isArray(response.abTest)) {
    return response.abTest as ABTestConfig;
  }

  const contentJson = asRecord(response.contentJson);
  const abTestConfig = asRecord(contentJson?.abTestConfig);
  if (!abTestConfig) return undefined;

  const variantA = asRecord(abTestConfig.variantA);
  const variantB = asRecord(abTestConfig.variantB);

  return {
    enabled: Boolean(abTestConfig.enabled),
    splitRatio: typeof abTestConfig.splitRatio === 'number' ? abTestConfig.splitRatio : 20,
    variantA: {
      emailSubject: typeof variantA?.emailSubject === 'string' ? variantA.emailSubject : undefined,
      smsMessage: typeof variantA?.smsMessage === 'string' ? variantA.smsMessage : undefined,
      emailHtml: typeof variantA?.emailHtml === 'string' ? variantA.emailHtml : undefined,
      templateId: typeof variantA?.templateId === 'string' ? variantA.templateId : undefined,
    },
    variantB: {
      emailSubject: typeof variantB?.emailSubject === 'string' ? variantB.emailSubject : undefined,
      smsMessage: typeof variantB?.smsMessage === 'string' ? variantB.smsMessage : undefined,
      emailHtml: typeof variantB?.emailHtml === 'string' ? variantB.emailHtml : undefined,
      templateId: typeof variantB?.templateId === 'string' ? variantB.templateId : undefined,
    },
    winnerCriteria:
      abTestConfig.winnerCriteria === 'click_rate' ||
      abTestConfig.winnerCriteria === 'conversion' ||
      abTestConfig.winnerCriteria === 'open_rate'
        ? abTestConfig.winnerCriteria
        : 'open_rate',
    autoEvaluate: Boolean(abTestConfig.autoEvaluate),
  };
};

const mapApiCampaignToModel = (raw: unknown): Campaign => {
  const response = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};

  const scheduleRaw =
    response.schedule && typeof response.schedule === 'object'
      ? (response.schedule as Record<string, unknown>)
      : null;
  const scheduleType =
    scheduleRaw?.type === 'immediate' ||
    scheduleRaw?.type === 'scheduled' ||
    scheduleRaw?.type === 'recurring'
      ? scheduleRaw.type
      : undefined;
  const segment =
    response.segment && typeof response.segment === 'object'
      ? (response.segment as Record<string, unknown>)
      : undefined;

  return {
    id: typeof response.id === 'string' ? response.id : '',
    accountId: typeof response.accountId === 'string' ? response.accountId : '',
    name: typeof response.name === 'string' ? response.name : 'Campagne',
    description: typeof response.description === 'string' ? response.description : undefined,
    channel: normalizeChannel(response.channel || response.channelType),
    status: typeof response.status === 'string' ? normalizeStatus(response.status) : 'draft',
    segmentId: typeof response.segmentId === 'string' ? response.segmentId : '',
    segmentName:
      typeof segment?.name === 'string'
        ? segment.name
        : typeof response.segmentName === 'string'
          ? response.segmentName
          : undefined,
    emailContent: normalizeEmailContent(response),
    smsContent: normalizeSmsContent(response),
    abTest: normalizeABTest(response),
    schedule:
      scheduleRaw && scheduleType
        ? {
            type: scheduleType,
            timezone: typeof scheduleRaw.timezone === 'string' ? scheduleRaw.timezone : undefined,
            scheduledAt:
              typeof scheduleRaw.scheduledAt === 'string'
                ? new Date(scheduleRaw.scheduledAt)
                : undefined,
          }
        : undefined,
    estimatedRecipients:
      typeof response.estimatedRecipients === 'number'
        ? response.estimatedRecipients
        : typeof response.estimatedRecipients === 'string'
          ? parseInt(response.estimatedRecipients, 10) || 0
          : 0,
    estimatedCost:
      typeof response.estimatedCost === 'number'
        ? response.estimatedCost
        : typeof response.estimatedCost === 'string'
          ? parseFloat(response.estimatedCost) || 0
          : 0,
    createdAt: typeof response.createdAt === 'string' ? new Date(response.createdAt) : new Date(),
    updatedAt: typeof response.updatedAt === 'string' ? new Date(response.updatedAt) : new Date(),
    sentAt: typeof response.sentAt === 'string' ? new Date(response.sentAt) : undefined,
    analytics: response.analytics as Campaign['analytics'],
  };
};

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      // State
      campaigns: [],
      draft: INITIAL_DRAFT,
      isLoading: false,

      // Draft Management
      setDraftStep: (step) =>
        set((state) => ({
          draft: { ...state.draft, step },
        })),

      setDraftMode: (mode) =>
        set((state) => ({
          draft: {
            ...state.draft,
            mode,
            segmentId: mode === 'automation' ? undefined : state.draft.segmentId,
            segmentName: mode === 'automation' ? undefined : state.draft.segmentName,
          },
        })),

      setDraftChannel: (channel) =>
        set((state) => ({
          draft: { ...state.draft, channel },
        })),

      setDraftName: (name) =>
        set((state) => ({
          draft: { ...state.draft, name },
        })),

      setDraftSegment: (segmentId, segmentName) =>
        set((state) => ({
          draft: { ...state.draft, segmentId, segmentName },
        })),

      setDraftEmailContent: (emailContent) =>
        set((state) => ({
          draft: { ...state.draft, emailContent },
        })),

      setDraftSMSContent: (smsContent) =>
        set((state) => ({
          draft: { ...state.draft, smsContent },
        })),

      setDraftABTest: (abTest) =>
        set((state) => ({
          draft: { ...state.draft, abTest },
        })),

      setDraftSchedule: (schedule) =>
        set((state) => ({
          draft: { ...state.draft, schedule },
        })),

      updateEstimates: (recipients, cost) =>
        set((state) => ({
          draft: {
            ...state.draft,
            estimatedRecipients: recipients,
            estimatedCost: cost,
          },
        })),

      // Campaign CRUD
      createCampaign: async (campaign) => {
        set({ isLoading: true, error: undefined });
        try {
          const payload = {
            channelType: campaign.channel,
            name: campaign.name,
            description: campaign.description,
            segmentId: campaign.segmentId,
            emailContent: campaign.emailContent,
            smsContent: campaign.smsContent,
            abTest: campaign.abTest,
            schedule: campaign.schedule,
            estimatedRecipients: campaign.estimatedRecipients,
            estimatedCost: campaign.estimatedCost,
            status: (campaign.status || 'DRAFT').toUpperCase(),
          };

          const response = await campaignApi.create(payload);
          const newCampaign: Campaign = mapApiCampaignToModel(response);

          set((state) => ({
            campaigns: [...state.campaigns, newCampaign],
            isLoading: false,
          }));

          return newCampaign;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Creation failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      updateCampaign: async (id, updates) => {
        set({ isLoading: true, error: undefined });
        try {
          const campaign = get().getCampaign(id);
          if (!campaign) throw new Error('Campaign not found');

          const payload: CampaignAPIUpdateRequest = {
            name: updates.name || campaign.name,
            description: updates.description || campaign.description,
            channelType: (updates.channel || campaign.channel) as 'SMS' | 'EMAIL',
            segmentId: updates.segmentId || campaign.segmentId,
            emailContent: updates.emailContent || campaign.emailContent,
            smsContent: updates.smsContent || campaign.smsContent,
            abTest: updates.abTest || campaign.abTest,
            schedule: updates.schedule || campaign.schedule,
            estimatedRecipients: updates.estimatedRecipients || campaign.estimatedRecipients,
            estimatedCost: updates.estimatedCost || campaign.estimatedCost,
            status: updates.status || campaign.status,
          };

          const response = await campaignApi.update(id, payload);
          const updated: Campaign = mapApiCampaignToModel(response);

          set((state) => ({
            campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)),
            isLoading: false,
          }));

          return updated;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Update failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      deleteCampaign: async (id) => {
        set({ isLoading: true, error: undefined });
        try {
          await campaignApi.delete(id);
          set((state) => ({
            campaigns: state.campaigns.filter((c) => c.id !== id),
            isLoading: false,
          }));
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Delete failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      duplicateCampaign: async (id) => {
        set({ isLoading: true, error: undefined });
        try {
          const response = await campaignApi.duplicate(id);
          const duplicated = mapApiCampaignToModel(response);
          set((state) => ({
            campaigns: [duplicated, ...state.campaigns],
            isLoading: false,
          }));
          return duplicated;
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Duplicate failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      getCampaign: (id) => {
        return get().campaigns.find((c) => c.id === id);
      },

      listCampaigns: () => {
        return get().campaigns;
      },

      fetchCampaigns: async () => {
        set({ isLoading: true, error: undefined });
        try {
          const response = await campaignApi.list();
          const responseObject = response as unknown as Record<string, unknown>;
          const responseData = responseObject.data;
          const list = Array.isArray(responseData)
            ? responseData
            : Array.isArray(response)
              ? response
              : [];

          const campaigns = list.map((item) =>
            mapApiCampaignToModel(item as Record<string, unknown>),
          );
          set({ campaigns, isLoading: false });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Chargement impossible';
          set({ isLoading: false, error: message });
        }
      },

      // Workflow
      saveDraft: () => {
        // Automatically persisted by Zustand localStorage middleware
        set({ error: undefined });
      },

      loadDraft: (campaignId) => {
        if (campaignId) {
          const campaign = get().getCampaign(campaignId);
          if (campaign) {
            set({
              draft: {
                step: 1,
                mode: campaign.status === 'automation' ? 'automation' : 'standard',
                channel: campaign.channel,
                name: campaign.name,
                description: campaign.description,
                segmentId: campaign.segmentId,
                emailContent: campaign.emailContent,
                smsContent: campaign.smsContent,
                abTest: campaign.abTest,
                schedule: campaign.schedule,
                estimatedRecipients: campaign.estimatedRecipients,
                estimatedCost: campaign.estimatedCost,
                promoCode: (campaign as unknown as { promoCode?: string }).promoCode,
              },
              selectedCampaignId: campaignId,
            });
          }
        }
      },

      clearDraft: () => {
        set({
          draft: INITIAL_DRAFT,
          selectedCampaignId: undefined,
          error: undefined,
        });
      },

      submitCampaign: async () => {
        const { draft, selectedCampaignId } = get();

        if (!draft.channel || !draft.name || (draft.mode !== 'automation' && !draft.segmentId)) {
          set({ error: 'Missing required fields' });
          throw new Error('Missing required fields');
        }

        set({ isLoading: true, error: undefined });
        try {
          if (selectedCampaignId) {
            // Update existing
            await get().updateCampaign(selectedCampaignId, {
              name: draft.name,
              description: draft.description,
              channel: draft.channel,
              segmentId: draft.mode === 'automation' ? undefined : draft.segmentId,
              emailContent: draft.emailContent,
              smsContent: draft.smsContent,
              abTest: draft.abTest,
              schedule: draft.schedule,
              estimatedRecipients: draft.estimatedRecipients ?? 0,
              estimatedCost: draft.estimatedCost ?? 0,
              status: draft.mode === 'automation' ? 'automation' : 'scheduled',
            });
          } else {
            // Create new
            const campaign = await get().createCampaign({
              accountId: '', // Will be set by backend from JWT
              name: draft.name,
              description: draft.description,
              channel: draft.channel,
              segmentId: draft.mode === 'automation' ? undefined : draft.segmentId,
              emailContent: draft.emailContent,
              smsContent: draft.smsContent,
              abTest: draft.abTest,
              schedule: draft.schedule,
              estimatedRecipients: draft.estimatedRecipients ?? 0,
              estimatedCost: draft.estimatedCost ?? 0,
              status: draft.mode === 'automation' ? 'automation' : 'scheduled',
            });
            set({ selectedCampaignId: campaign.id });
          }

          const finalCampaignId = selectedCampaignId || get().selectedCampaignId || '';
          get().clearDraft();
          set({ isLoading: false });
          return { success: true, campaignId: finalCampaignId };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Submit failed';
          set({ isLoading: false, error: message });
          throw error;
        }
      },

      // State Management
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),

    {
      name: 'campaign-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        draft: state.draft,
        campaigns: state.campaigns,
      }),
    },
  ),
);
