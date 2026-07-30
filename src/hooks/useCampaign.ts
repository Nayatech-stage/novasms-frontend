import { useCallback } from 'react';
import { useCampaignStore } from '@/store/campaign.store';
import type { Campaign } from '@/store/campaign.store';

/**
 * Custom hooks for campaign management
 * Simplifies store access and provides convenience methods
 */

export const useCampaignActions = () => {
  const store = useCampaignStore();

  const createNewCampaign = useCallback(async () => {
    store.clearDraft();
    store.setDraftStep(1);
  }, [store]);

  const editCampaign = useCallback(
    (campaignId: string) => {
      store.loadDraft(campaignId);
      store.setDraftStep(1);
    },
    [store],
  );

  const duplicateCampaign = useCallback(
    async (campaign: Campaign) => {
      return store.duplicateCampaign(campaign.id);
    },
    [store],
  );

  const saveCampaignDraft = useCallback(async () => {
    store.saveDraft();
  }, [store]);

  const publishCampaign = useCallback(async () => {
    return await store.submitCampaign();
  }, [store]);

  return {
    ...store,
    createNewCampaign,
    editCampaign,
    duplicateCampaign,
    saveCampaignDraft,
    publishCampaign,
  };
};

export const useCampaignDraft = () => {
  const {
    draft,
    setDraftStep,
    setDraftChannel,
    setDraftName,
    setDraftSegment,
    setDraftEmailContent,
    setDraftSMSContent,
    setDraftABTest,
    setDraftSchedule,
    updateEstimates,
    saveDraft,
    clearDraft,
  } = useCampaignStore();

  return {
    draft,
    setDraftStep,
    setDraftChannel,
    setDraftName,
    setDraftSegment,
    setDraftEmailContent,
    setDraftSMSContent,
    setDraftABTest,
    setDraftSchedule,
    updateEstimates,
    saveDraft,
    clearDraft,
  };
};

export const useCampaignList = () => {
  const { campaigns, listCampaigns, getCampaign, deleteCampaign, updateCampaign } =
    useCampaignStore();

  const filterByStatus = (status: string) => campaigns.filter((c) => c.status === status);

  const filterByChannel = (channel: string) => campaigns.filter((c) => c.channel === channel);

  const sortByDate = (desc = true) =>
    [...campaigns].sort((a, b) =>
      desc
        ? new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        : new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
    );

  return {
    campaigns,
    listCampaigns,
    getCampaign,
    deleteCampaign,
    updateCampaign,
    filterByStatus,
    filterByChannel,
    sortByDate,
  };
};
