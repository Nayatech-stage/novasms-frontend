export type CampaignType = 'EMAIL' | 'SMS';
export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'CANCELLED' | 'FAILED';
export type CampaignVariant = 'A' | 'B';
export type SendVariant = 'A' | 'B' | 'NONE';

export interface Campaign {
  id: string;
  accountId: string;
  name: string;
  channelType: CampaignType;
  status: CampaignStatus;
  subject?: string;
  subjectA?: string;
  subjectB?: string;
  content?: string;
  contentJson?: {
    blocks?: CampaignBlock[];
    variables?: string[];
    smsText?: string;
  };
  abSplitPct: number;
  abWinner?: CampaignVariant;
  abTestDuration?: number;
  scheduledAt?: string;
  timezone: string;
  bestSendTime?: { day: number; hour: number; confidence: number };
  estimatedCost?: number;
  segmentId?: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
  failedCount: number;
  createdAt: string;
}

export interface CampaignBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'product' | 'separator' | 'social';
  content: string;
  styles?: Record<string, unknown>;
  imageUrl?: string;
  linkUrl?: string;
  buttonText?: string;
}

export interface ABConfig {
  subjectA: string;
  subjectB: string;
  splitPct: number;
  victoryMetric: 'open' | 'click';
  testDuration: number;
}

export interface BestSendTime {
  recommendedDay: number;
  recommendedHour: number;
  confidence: number;
  basedOn: number;
  timezone: string;
  reason: string;
}
