import api from './axios';

export interface TemplateRecord {
  id: string;
  accountId: string;
  key: string;
  name: string;
  channelType: string | null;
  htmlContent: string | null;
  contentText: string | null;
  variables: unknown;
  createdBy: string | null;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatePreviewResponse {
  html: string;
  text: string;
}

export const templatesApi = {
  list: async (): Promise<TemplateRecord[]> => {
    const response = await api.get<TemplateRecord[]>('/templates');
    return response.data;
  },

  preview: async (
    id: string,
    vars: Record<string, unknown> = {},
  ): Promise<TemplatePreviewResponse> => {
    const response = await api.post<TemplatePreviewResponse>(`/templates/${id}/preview`, vars);
    return response.data;
  },
};
