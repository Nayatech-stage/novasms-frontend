import { useCallback, useEffect, useState } from 'react';
import api from '@/api/axios';
import { contactsApi } from '@/api/contacts';
import { useAuthStore } from '@/stores/authStore';

type AppMetrics = {
  credits: number | null;
  alertThreshold: number | null;
  creditLimit: number | null;
  contactsTotal: number;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useAppMetrics(): AppMetrics {
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [credits, setCredits] = useState<number | null>(null);
  const [alertThreshold, setAlertThreshold] = useState<number | null>(null);
  const [creditLimit, setCreditLimit] = useState<number | null>(null);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !accessToken) {
      setCredits(null);
      setAlertThreshold(null);
      setCreditLimit(null);
      setContactsTotal(0);
      return;
    }

    setLoading(true);
    try {
      const [balanceResult, contactsResult] = await Promise.allSettled([
        api.get<{
          balance: number;
          alertThreshold: number | null;
          creditLimit: number | null;
        }>('/account/balance'),
        contactsApi.list({ limit: 1 }),
      ]);

      if (balanceResult.status === 'fulfilled') {
        const d = balanceResult.value.data;
        const parsed = d?.balance == null ? null : Number(d.balance);
        setCredits(Number.isFinite(parsed as number) ? (parsed as number) : null);
        setAlertThreshold(d?.alertThreshold ?? null);
        setCreditLimit(d?.creditLimit ?? null);
      }

      if (contactsResult.status === 'fulfilled') {
        setContactsTotal(contactsResult.value.total ?? 0);
      }
    } catch {
      // Les composants affichent un fallback si métriques indisponibles.
    } finally {
      setLoading(false);
    }
  }, [accessToken, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { credits, alertThreshold, creditLimit, contactsTotal, loading, refresh };
}
