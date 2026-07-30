import { useCallback, useEffect, useState } from 'react';
import api from '@/api/axios';
import { contactsApi } from '@/api/contacts';
import { campaignApi } from '@/api/campaignApi';

export type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  icon: string;
};

export function useOnboardingChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshChecklist = useCallback(async () => {
    setLoading(true);
    try {
      const [profileResult, contactsResult, campaignsResult, segmentsResult] =
        await Promise.allSettled([
          api.get('/auth/me'),
          contactsApi.list({ limit: 1 }),
          campaignApi.list({ limit: 1 }),
          contactsApi.listSegments(),
        ]);

      const profileCompleted =
        profileResult.status === 'fulfilled' && Boolean(profileResult.value.data?.account?.sector);

      const contactsCount =
        contactsResult.status === 'fulfilled' &&
        Boolean(
          contactsResult.value.data && contactsResult.value.total && contactsResult.value.total > 0,
        );

      const campaignsCount =
        campaignsResult.status === 'fulfilled' &&
        Boolean(
          campaignsResult.value.data &&
          campaignsResult.value.total &&
          campaignsResult.value.total > 0,
        );

      const segmentsCount =
        segmentsResult.status === 'fulfilled' &&
        Boolean(Array.isArray(segmentsResult.value) && segmentsResult.value.length > 0);

      setItems([
        {
          id: 'profile',
          label: 'Profil complété',
          description: 'Configurez vos informations professionnelles',
          completed: profileCompleted,
          icon: '👤',
        },
        {
          id: 'contacts',
          label: 'Premiers contacts importés',
          description: 'Importez ou ajoutez vos premiers contacts',
          completed: contactsCount,
          icon: '👥',
        },
        {
          id: 'segment',
          label: 'Segment créé',
          description: 'Créez un segment pour cibler vos audiences',
          completed: segmentsCount,
          icon: '🎯',
        },
        {
          id: 'campaign',
          label: 'Première campagne créée',
          description: 'Envoyez votre première campagne',
          completed: campaignsCount,
          icon: '📧',
        },
      ]);
    } catch {
      console.error('Failed to load onboarding checklist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshChecklist();
  }, [refreshChecklist]);

  const completionPercentage = Math.round(
    (items.filter((item) => item.completed).length / items.length) * 100,
  );

  return {
    items,
    loading,
    completionPercentage,
    refresh: refreshChecklist,
  };
}
