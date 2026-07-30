import type { FC } from 'react';
import { CampaignWizard } from '@/components/campaigns';

/**
 * Campaign Editor Page (Sprint 3)
 * Main entry point for the campaign creation & editing wizard
 * Features:
 * - 4-step workflow (Channel → Content → Audience → Schedule/A/B)
 * - Email + SMS editors
 * - Multi-tenant isolation (accountId)
 * - Persistent draft (localStorage)
 * - Full A/B testing support
 */

const CampaignEditorPage: FC = () => {
  return <CampaignWizard />;
};

export default CampaignEditorPage;
