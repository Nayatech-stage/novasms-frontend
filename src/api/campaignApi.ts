/**
 * Campaign API Service
 * Centralized API calls for campaign management
 * Base URL: /api/campaigns
 * Uses axios client with JWT interceptors for proper authentication
 */

import api from './axios';
import type {
  CampaignAPICreateRequest,
  CampaignAPIUpdateRequest,
  CampaignAPIResponse,
  CampaignAPIListResponse,
} from '@/types/campaign.types';

/**
 * Campaign API Endpoints
 */
export const campaignApi = {
  /**
   * Create a new campaign
   * POST /api/campaigns
   */
  create: async (payload: CampaignAPICreateRequest): Promise<CampaignAPIResponse> => {
    try {
      const response = await api.post<CampaignAPIResponse>('/campaigns', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error creating campaign:', error);
      throw error;
    }
  },

  /**
   * Get all campaigns for current account
   * GET /api/campaigns
   */
  list: async (options?: {
    status?: string;
    channel?: string;
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
  }): Promise<CampaignAPIListResponse> => {
    try {
      const params = new URLSearchParams();
      if (options?.status) params.append('status', options.status);
      if (options?.channel) params.append('channel', options.channel);
      if (options?.search) params.append('search', options.search);
      if (options?.page) params.append('page', options.page.toString());
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<CampaignAPIListResponse>(`/campaigns${queryString}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching campaigns:', error);
      throw error;
    }
  },

  /**
   * Get single campaign by ID
   * GET /api/campaigns/:id
   */
  get: async (id: string): Promise<CampaignAPIResponse> => {
    try {
      const response = await api.get<CampaignAPIResponse>(`/campaigns/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching campaign:', error);
      throw error;
    }
  },

  /**
   * Update campaign
   * PATCH /api/campaigns/:id
   */
  update: async (id: string, payload: CampaignAPIUpdateRequest): Promise<CampaignAPIResponse> => {
    try {
      const response = await api.patch<CampaignAPIResponse>(`/campaigns/${id}`, payload);
      return response.data;
    } catch (error) {
      console.error('❌ Error updating campaign:', error);
      throw error;
    }
  },

  /**
   * Delete campaign
   * DELETE /api/campaigns/:id
   */
  delete: async (id: string): Promise<{ success: boolean }> => {
    try {
      const response = await api.delete<{ success: boolean }>(`/campaigns/${id}`);
      return response.data;
    } catch (error) {
      console.error('❌ Error deleting campaign:', error);
      throw error;
    }
  },

  /**
   * Duplicate campaign
   * POST /api/campaigns/:id/duplicate
   */
  duplicate: async (id: string): Promise<CampaignAPIResponse> => {
    try {
      const response = await api.post<CampaignAPIResponse>(`/campaigns/${id}/duplicate`, {});
      return response.data;
    } catch (error) {
      console.error('❌ Error duplicating campaign:', error);
      throw error;
    }
  },

  /**
   * Send campaign (mark as sent)
   * POST /api/campaigns/:id/send
   */
  send: async (id: string): Promise<CampaignAPIResponse> => {
    try {
      const response = await api.post<CampaignAPIResponse>(`/campaigns/${id}/send`, {});
      return response.data;
    } catch (error) {
      console.error('❌ Error sending campaign:', error);
      throw error;
    }
  },

  /**
   * Get campaign analytics
   * GET /api/campaigns/:id/analytics
   */
  analytics: async (
    id: string,
  ): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
    bounced: number;
  }> => {
    try {
      const response = await api.get<{
        sent: number;
        delivered: number;
        opened: number;
        clicked: number;
        converted: number;
        bounced: number;
      }>(`/campaigns/${id}/analytics`);
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching analytics:', error);
      throw error;
    }
  },
};
