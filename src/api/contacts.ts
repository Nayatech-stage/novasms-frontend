import api from './axios';
import type {
  Contact,
  ContactFilter,
  ImportReport,
  ImportMapping,
  SegmentCriterion,
  SegmentLogic,
  DynamicSegment,
} from '../features/contacts/types/contact';

export const contactsApi = {
  /**
   * Récupérer la liste des contacts avec pagination cursor-based (RG-53)
   * GET /api/contacts?cursor=xxx&limit=20&location=Abidjan&tag=VIP
   */
  list: async (
    params?: {
      cursor?: string;
      limit?: number;
      search?: string;
    } & ContactFilter,
  ) => {
    const queryParams = new URLSearchParams();

    if (params?.cursor) queryParams.append('cursor', params.cursor);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.location) queryParams.append('location', params.location);
    if (params?.tag) queryParams.append('tag', params.tag);
    if (params?.dateAddedFrom) queryParams.append('dateAddedFrom', params.dateAddedFrom);
    if (params?.dateAddedTo) queryParams.append('dateAddedTo', params.dateAddedTo);

    const response = await api.get<{
      data: Contact[];
      nextCursor: string | null;
      total: number;
    }>(`/contacts?${queryParams}`);

    return response.data;
  },

  /**
   * Récupérer un contact par ID (US-006)
   * GET /api/contacts/by-id/:id
   */
  getById: async (id: string) => {
    const response = await api.get<Contact>(`/contacts/by-id/${id}`);
    return response.data;
  },

  getHistory: async (id: string) => {
    const response = await api.get<{
      data: Array<{ id: string; type: string; message: string; createdAt: string }>;
    }>(`/contacts/${id}/history`);
    return response.data.data;
  },

  addNote: async (id: string, content: string) => {
    const response = await api.post<{
      success: boolean;
      notes: Array<{ id: string; content: string; createdAt: string }>;
    }>(`/contacts/${id}/notes`, { content });
    return response.data;
  },

  /**
   * Créer un contact manuellement
   * POST /api/contacts
   */
  create: async (contact: Partial<Contact>) => {
    const response = await api.post<Contact>('/contacts', contact);
    return response.data;
  },

  /**
   * Mettre à jour un contact
   * PATCH /api/contacts/:id
   */
  update: async (id: string, contact: Partial<Contact>) => {
    const response = await api.patch<Contact>(`/contacts/${id}`, contact);
    return response.data;
  },

  /**
   * Supprimer un contact (RG-56: droit à l'oubli)
   * DELETE /api/contacts/:id
   */
  delete: async (id: string) => {
    await api.delete(`/contacts/${id}`);
  },

  /**
   * Supprimer plusieurs contacts en une seule requête
   * DELETE /api/contacts/bulk/delete
   */
  bulkDelete: async (ids: string[]) => {
    const response = await api.delete<{ success: boolean; deleted: number }>(
      '/contacts/bulk/delete',
      { data: { ids } },
    );
    return response.data;
  },

  /**
   * Valider un numéro de téléphone (libphonenumber-js, 245 pays)
   * GET /api/contacts/validate-phone?phone=xxx
   */
  validatePhone: async (phone: string) => {
    const response = await api.get<{
      isValid: boolean;
      status: 'VALID' | 'INVALID' | 'UNVERIFIED';
      formatted: string | null;
      country: string | null;
      message: string | null;
    }>(`/contacts/validate-phone?phone=${encodeURIComponent(phone)}`);
    return response.data;
  },

  /**
   * Lancer un import CSV/XLS (EN-1645)
   * POST /api/contacts/import
   */
  import: async (fileName: string, mapping: ImportMapping, rows: Record<string, unknown>[]) => {
    const response = await api.post<{
      success: boolean;
      jobId: string;
      message: string;
      estimatedTime: string;
    }>('/contacts/import', { fileName, mapping, rows });
    return response.data;
  },

  /**
   * Récupérer le statut d'un import (RG-12)
   * GET /api/contacts/import/:jobId
   */
  getImportStatus: async (jobId: string) => {
    const response = await api.get<ImportReport>(`/contacts/import/${jobId}`);
    return response.data;
  },

  /**
   * Désabonner un contact (RG-22: lien STOP)
   * POST /api/contacts/:id/opt-out
   */
  optOut: async (id: string) => {
    await api.post(`/contacts/${id}/opt-out`);
  },

  exportById: async (id: string, format: 'json' | 'csv' = 'json') => {
    try {
      const response = await api.get<{
        success: boolean;
        format: string;
        data: string;
        fileName: string;
      }>(`/contacts/${id}/export?format=${format}`);
      // Convertir le contenu en blob avec le bon type MIME
      const mimeType = format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json';
      const blob = new Blob([response.data.data], { type: mimeType });
      return blob;
    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  },

  previewSegment: async (logic: SegmentLogic, criteria: SegmentCriterion[]) => {
    // Filter out empty criteria before sending to backend
    const validCriteria = criteria.filter((c) => c.value && c.value.toString().trim().length > 0);

    const response = await api.post<{ count: number }>('/contacts/segments/preview', {
      logic,
      criteria: validCriteria,
    });
    return response.data;
  },

  createSegment: async (name: string, logic: SegmentLogic, criteria: SegmentCriterion[]) => {
    // Filter out empty criteria before sending to backend
    const validCriteria = criteria.filter((c) => c.value && c.value.toString().trim().length > 0);

    const response = await api.post<{ success: boolean; segment: DynamicSegment }>(
      '/contacts/segments',
      {
        name,
        logic,
        criteria: validCriteria,
      },
    );
    return response.data;
  },

  updateSegment: async (
    id: string,
    payload: {
      name?: string;
      logic?: SegmentLogic;
      criteria?: SegmentCriterion[];
      type?: 'dynamic' | 'static';
      contactIds?: string[];
    },
  ) => {
    const response = await api.patch<{ success: boolean; segment: DynamicSegment }>(
      `/contacts/segments/${id}`,
      payload,
    );
    return response.data;
  },

  deleteSegment: async (id: string) => {
    const response = await api.delete<{ success: boolean }>(`/contacts/segments/${id}`);
    return response.data;
  },

  createSegmentFromContacts: async (name: string, contactIds: string[]) => {
    const response = await api.post<{ success: boolean; segment: DynamicSegment }>(
      '/contacts/segments',
      {
        name,
        logic: 'AND',
        criteria: [],
        contactIds,
      },
    );
    return response.data;
  },

  listSegments: async () => {
    const response = await api.get<{ data: DynamicSegment[] }>('/contacts/segments');
    return response.data.data;
  },

  listSegmentsWithContacts: async (limit?: number) => {
    const query = typeof limit === 'number' ? `?limit=${limit}` : '';
    const response = await api.get<{ data: Array<DynamicSegment & { contacts: Contact[] }> }>(
      `/contacts/segments/with-contacts${query}`,
    );
    return response.data.data;
  },
};
