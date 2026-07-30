import api from './axios';

export interface SegmentFilter {
  field: 'tags' | 'country' | 'createdAt' | 'lastPurchase' | 'openRate' | 'city';
  op: 'contains' | 'eq' | 'neq' | 'gte' | 'lte' | 'in';
  value: string | string[];
}

export interface SegmentCriteria {
  operator: 'AND' | 'OR';
  filters: SegmentFilter[];
}

export interface Segment {
  id: string;
  name: string;
  criteria: SegmentCriteria;
  contactCount: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

function normalizeCriteria(value: unknown): SegmentCriteria {
  if (!value || typeof value !== 'object') {
    return { operator: 'AND', filters: [] };
  }

  const raw = value as Partial<SegmentCriteria>;
  return {
    operator: raw.operator === 'OR' ? 'OR' : 'AND',
    filters: Array.isArray(raw.filters) ? raw.filters : [],
  };
}

function normalizeSegment(segment: Partial<Segment> | null | undefined): Segment {
  return {
    id: String(segment?.id ?? ''),
    name:
      typeof segment?.name === 'string' && segment.name.trim() ? segment.name : 'Segment sans nom',
    criteria: normalizeCriteria(segment?.criteria),
    contactCount: Number(segment?.contactCount ?? 0),
    createdAt: segment?.createdAt ?? null,
    updatedAt: segment?.updatedAt ?? null,
  };
}

export const segmentsApi = {
  list: async (): Promise<Segment[]> => {
    const res = await api.get<Segment[]>('/segments');
    return Array.isArray(res.data) ? res.data.map(normalizeSegment) : [];
  },

  create: async (name: string, criteria: SegmentCriteria): Promise<Segment> => {
    const res = await api.post<Segment>('/segments', { name, criteria });
    return normalizeSegment(res.data);
  },

  update: async (
    id: string,
    data: Partial<{ name: string; criteria: SegmentCriteria }>,
  ): Promise<Segment> => {
    const res = await api.patch<Segment>(`/segments/${id}`, data);
    return normalizeSegment(res.data);
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/segments/${id}`);
  },

  /** Aperçu du nombre de contacts correspondant aux critères (temps réel) */
  previewCount: async (criteria: SegmentCriteria): Promise<number> => {
    const res = await api.post<number | { count?: number }>('/segments/preview', criteria);
    return typeof res.data === 'number' ? res.data : Number(res.data?.count ?? 0);
  },

  /** Rafraîchit le compteur d'un segment existant */
  refresh: async (id: string): Promise<Segment> => {
    const res = await api.post<Segment>(`/segments/${id}/refresh`);
    return normalizeSegment(res.data);
  },
};
