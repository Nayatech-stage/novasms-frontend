import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axios';
import type { Contact } from '../types/contact';

type ContactNote = {
  id: string;
  content: string;
  createdAt: string;
};

type ContactHistoryEvent = {
  id: string;
  type: string;
  message?: string;
  createdAt: string;
};

type ContactDetail = Contact & {
  notes?: ContactNote[];
  history?: ContactHistoryEvent[];
};

export default function useContactDetail(id: string | undefined) {
  const [data, setData] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContact = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.get<ContactDetail>(`/contacts/by-id/${id}`);
      setData(res.data);
    } catch (err: unknown) {
      const message =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
            ? err.message
            : 'Erreur de chargement';
      setError(message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContact();
  }, [fetchContact]);

  return { data, loading, error, refresh: fetchContact };
}
