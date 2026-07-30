/**
 * Service pour les appels API des campagnes
 * Inclut gestion des erreurs utilisateur-friendly
 */

import api from '../api/axios';

export interface CampaignResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  message?: string;
}

export interface CampaignScheduleValidationResult {
  success: boolean;
  isValid: boolean;
  warnings: string[];
  immediateOrScheduled: 'immediate' | 'scheduled';
  timezone: string;
  scheduledAt: string | null;
}

const extractApiErrorMessage = (error: unknown, fallback: string): string => {
  if (!error || typeof error !== 'object') return fallback;

  const err = error as {
    response?: {
      data?: {
        error?: unknown;
        message?: unknown;
      };
    };
    message?: unknown;
  };

  const apiError = err.response?.data?.error;
  if (typeof apiError === 'string' && apiError.trim().length > 0) {
    return apiError;
  }

  const apiMessage = err.response?.data?.message;
  if (typeof apiMessage === 'string' && apiMessage.trim().length > 0) {
    return apiMessage;
  }

  if (Array.isArray(apiMessage) && apiMessage.length > 0) {
    const first = apiMessage.find((item) => typeof item === 'string');
    if (typeof first === 'string' && first.trim().length > 0) {
      return first;
    }
  }

  if (typeof err.message === 'string' && err.message.trim().length > 0) {
    return err.message;
  }

  return fallback;
};

/**
 * Récupérer le nombre de contacts actifs dans un segment
 */
export async function getSegmentContactCount(segmentId: string): Promise<number> {
  try {
    const response = await api.get<{ segmentId: string; count: number }>(
      `/contacts/segments/${segmentId}/count`,
    );

    return response.data.count || 0;
  } catch (error) {
    console.error('❌ Error fetching contact count:', error);
    return 0;
  }
}

/**
 * Sauvegarder la campagne comme brouillon
 */
export async function saveCampaignDraft(
  campaignId: string,
  draftData: Record<string, unknown>,
): Promise<CampaignResponse> {
  try {
    const response = await api.post(`/campaigns/${campaignId}/save-draft`, draftData);

    if (!response.data?.success) {
      return {
        success: false,
        error: response.data?.error || 'Erreur lors de la sauvegarde du brouillon',
      };
    }

    return {
      success: true,
      data: response.data.data,
      message: 'Brouillon sauvegardé',
    };
  } catch (error) {
    console.error('❌ Error saving draft:', error);
    return {
      success: false,
      error: extractApiErrorMessage(error, "Une erreur s'est produite. Veuillez réessayer."),
    };
  }
}

/**
 * Envoyer ou programmer la campagne
 */
export async function sendCampaign(
  campaignId: string,
  options?: {
    immediateOrScheduled?: 'immediate' | 'scheduled';
    scheduledAt?: string;
  },
): Promise<CampaignResponse> {
  try {
    const response = await api.post(`/campaigns/${campaignId}/send`, options || {});

    if (!response.data.success) {
      return {
        success: false,
        error: response.data.error || "Une erreur s'est produite. Veuillez réessayer.",
      };
    }

    return {
      success: true,
      data: response.data,
      message: response.data.message || 'Campagne envoyée',
    };
  } catch (error) {
    console.error('❌ Error sending campaign:', error);
    return {
      success: false,
      error: extractApiErrorMessage(error, "Une erreur s'est produite. Veuillez réessayer."),
    };
  }
}

/**
 * Valider la planification d'une campagne
 */
export async function validateCampaignSchedule(
  campaignId: string,
  data: {
    immediateOrScheduled?: 'immediate' | 'scheduled';
    scheduledAt?: string;
    timezone?: string;
  },
): Promise<CampaignResponse> {
  try {
    const response = await api.post<CampaignScheduleValidationResult>(
      `/campaigns/${campaignId}/validate-schedule`,
      data,
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    return {
      success: false,
      error: extractApiErrorMessage(error, 'Erreur lors de la validation du planning'),
    };
  }
}

/**
 * Annuler la campagne
 */
export async function cancelCampaign(campaignId: string): Promise<CampaignResponse> {
  try {
    const response = await api.post(`/campaigns/${campaignId}/cancel`, {});

    if (!response.data.success) {
      return {
        success: false,
        error: response.data.error || "Une erreur s'est produite. Veuillez réessayer.",
      };
    }

    return {
      success: true,
      data: response.data,
      message: 'Campagne annulée',
    };
  } catch (error) {
    console.error('❌ Error cancelling campaign:', error);
    return {
      success: false,
      error: extractApiErrorMessage(error, "Une erreur s'est produite. Veuillez réessayer."),
    };
  }
}

/**
 * Récupérer les détails de la campagne
 */
export async function getCampaignDetails(campaignId: string): Promise<CampaignResponse> {
  try {
    const response = await api.get(`/campaigns/${campaignId}`);

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('❌ Error fetching campaign:', error);
    return {
      success: false,
      error: extractApiErrorMessage(error, "Une erreur s'est produite. Veuillez réessayer."),
    };
  }
}
