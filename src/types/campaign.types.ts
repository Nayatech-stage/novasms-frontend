/**
 * Campaign API & Form Types
 * Synchronisé avec backend DTOs et validations
 */

// Internal Domain Types (from store/campaign.store.ts)
export interface CampaignBlock {
  id: string;
  type:
    | 'text'
    | 'image'
    | 'button'
    | 'product'
    | 'divider'
    | 'social'
    | 'columns'
    | 'spacing'
    | 'html';
  content: Record<string, unknown>;
}

export interface EmailContent {
  subject: string;
  preheader?: string;
  blocks: CampaignBlock[];
  template?: string;
}

export interface SMSContent {
  message: string;
  senderName: string;
  shortLinks?: Record<string, string>;
  variables?: string[];
}

export interface ABTestConfig {
  enabled: boolean;
  splitRatio: number;
  variantA: {
    emailSubject?: string;
    emailPreheader?: string;
    emailBlocks?: import('@/store/campaign.store').CampaignBlock[];
    smsMessage?: string;
    emailHtml?: string;
    templateId?: string;
  };
  variantB: {
    emailSubject?: string;
    emailPreheader?: string;
    emailBlocks?: import('@/store/campaign.store').CampaignBlock[];
    smsMessage?: string;
    emailHtml?: string;
    templateId?: string;
  };
  winnerCriteria?: 'open_rate' | 'click_rate' | 'conversion';
  autoEvaluate?: boolean;
}

export interface ScheduleConfig {
  type: 'immediate' | 'scheduled' | 'recurring';
  scheduledAt?: Date;
  timezone?: string;
  recurringPattern?: 'daily' | 'weekly' | 'monthly';
  aiSuggestedTime?: { date: Date; confidence: number };
}

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  channel: 'SMS' | 'EMAIL';
  status: 'draft' | 'scheduled' | 'sent' | 'paused' | 'failed' | 'cancelled' | 'automation';
  segmentId: string;
  segmentName?: string;
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  abTest?: ABTestConfig;
  schedule?: ScheduleConfig;
  estimatedRecipients: number;
  estimatedCost: number;
  createdAt: Date;
  updatedAt: Date;
  sentAt?: Date;
  analytics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

export interface CampaignAPICreateRequest {
  name: string;
  description?: string;
  channelType: 'SMS' | 'EMAIL';
  subject?: string;
  content?: string;
  segmentId?: string;
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  abTest?: ABTestConfig;
  schedule?: ScheduleConfig;
  estimatedRecipients?: number;
  estimatedCost?: number;
  promoCode?: string; // EN-1688: Personalization variable
  status: string;
}

export type CampaignAPIUpdateRequest = Partial<CampaignAPICreateRequest>;

export interface CampaignAPIResponse {
  id: string;
  accountId: string;
  name: string;
  description?: string;
  channel: 'SMS' | 'EMAIL';
  status: 'draft' | 'scheduled' | 'sent' | 'paused' | 'failed' | 'cancelled' | 'automation';
  segmentId: string;
  segmentName?: string;
  emailContent?: EmailContent;
  smsContent?: SMSContent;
  abTest?: ABTestConfig;
  schedule?: ScheduleConfig;
  estimatedRecipients: number;
  estimatedCost: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  analytics?: {
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}

export interface CampaignAPIListResponse {
  data: CampaignAPIResponse[];
  total: number;
  page: number;
  limit: number;
}

// Form Validation Schemas (Zod)
export const createCampaignSchema = {
  name: { required: true, minLength: 3, maxLength: 100 },
  channel: { required: true, enum: ['SMS', 'EMAIL'] },
  segmentId: { required: true, format: 'uuid' },
  emailSubject: { maxLength: 120 },
  smsMessage: { maxLength: 160 },
};

// Segment Type (used in Campaign form)
export interface Segment {
  id: string;
  name: string;
  contactCount: number;
  criteria: Record<string, unknown>;
  createdAt: Date;
}

// Contact Variable Types (for dynamic content)
export const CONTACT_VARIABLES = {
  email: {
    firstName: '{{firstName}}',
    lastName: '{{lastName}}',
    email: '{{email}}',
    phone: '{{phone}}',
    shopName: '{{shopName}}',
    promoCode: '{{promoCode}}',
    tags: '{{tags}}',
    customField1: '{{customField1}}',
  },
  sms: {
    firstName: '{{firstName}}',
    phone: '{{phone}}',
    shopName: '{{shopName}}',
    promoCode: '{{promoCode}}',
    customField1: '{{customField1}}',
  },
};

// Tarifs SMS — synchronisés avec backend/src/common/billing.util.ts
// GSM7 (lettres standards) : 1 SMS = 160 car., multi-parties = 153 car./partie
// Unicode (émojis, accents spéciaux) : 1 SMS = 70 car., multi-parties = 67 car./partie
export const SMS_COST_CONFIG = {
  pricePerSms: 12, // FCFA par SMS (1 partie)
  gsm7Single: 160,
  gsm7Multi: 153,
  unicodeSingle: 70,
  unicodeMulti: 67,
  currency: 'XOF',
};

const GSM7_EXTENDED = 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ';

function isUnicode(text: string): boolean {
  return [...text].some((ch) => {
    const code = ch.charCodeAt(0);
    return code > 127 && !GSM7_EXTENDED.includes(ch);
  });
}

export const calculateSMSSegments = (textOrLength: string | number): number => {
  if (typeof textOrLength === 'number') {
    const len = textOrLength;
    if (len <= SMS_COST_CONFIG.gsm7Single) return 1;
    return Math.ceil(len / SMS_COST_CONFIG.gsm7Multi);
  }
  const text = textOrLength;
  if (!text || text.length === 0) return 1;
  const unicode = isUnicode(text);
  const limitSingle = unicode ? SMS_COST_CONFIG.unicodeSingle : SMS_COST_CONFIG.gsm7Single;
  const limitMulti = unicode ? SMS_COST_CONFIG.unicodeMulti : SMS_COST_CONFIG.gsm7Multi;
  if (text.length <= limitSingle) return 1;
  return Math.ceil(text.length / limitMulti);
};

export const calculateSMSCost = (textOrLength: string | number, recipientCount: number): number => {
  const segments = calculateSMSSegments(textOrLength);
  return segments * SMS_COST_CONFIG.pricePerSms * recipientCount;
};
