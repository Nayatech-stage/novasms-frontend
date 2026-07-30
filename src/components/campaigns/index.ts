/**
 * Campaign Components & Hooks Index
 * Central export point for all campaign-related UI components
 */

// Main Wizard
export { CampaignWizard } from './CampaignWizard';

// Dashboard
export { default as CampaignListDashboard } from './CampaignListDashboard';

// Steps
export { CampaignChannelStep } from './steps/CampaignChannelStep';
export { CampaignContentStep } from './steps/CampaignContentStep';
export { CampaignAudienceStep } from './steps/CampaignAudienceStep';
export { CampaignScheduleStep } from './steps/CampaignScheduleStep';

// Editors
export { EmailEditor } from './editors/EmailEditor';
export { SMSEditor } from './editors/SMSEditor';

// Templates
export { TemplateLibrary } from './TemplateLibrary';
export { default as MobilePreview } from './previews/MobilePreview';

// Scheduling & Advanced
export { default as BestSendTimePicker } from './scheduling/BestSendTimePicker';
export { default as CancellationControl } from './scheduling/CancellationControl';

// Reports
export { default as ABReport } from './reports/ABReport';

// Store & Types
export { useCampaignStore } from '@/store/campaign.store';
export type {
  Campaign,
  CampaignChannel,
  CampaignStatus,
  CampaignDraft,
  EmailContent,
  SMSContent,
  ABTestConfig,
  ScheduleConfig,
} from '@/store/campaign.store';
