import api from './axios';

export type AutomationTrigger =
  | 'contact_added'
  | 'api'
  | 'segment_joined'
  | 'tag_added'
  | 'campaign_opened'
  | 'link_clicked'
  | 'date_based'
  | 'birthday'
  | 'inactivity_window'
  | 'recurring_schedule';
export type AutomationChannel = 'Email' | 'SMS' | 'WhatsApp';
export type AutomationStatus = 'Active' | 'Inactive' | 'Draft';

export type WorkflowNodeType = 'trigger' | 'wait' | 'action' | 'end' | 'condition' | 'tag';

export type WorkflowNodeConfig = {
  delaySeconds?: number;
  delayPreset?: '0' | '300' | '1800' | '3600' | '86400' | 'custom';
  tag?: string;
  tagMode?: 'add' | 'remove';
  triggerSource?: AutomationTrigger;
  conditionType?: 'open' | 'click' | 'purchase' | 'tag' | 'field';
  campaignId?: string;
  field?: string;
  operator?: 'exists' | 'equals' | 'notEquals' | 'contains';
  value?: string;
  channel?: AutomationChannel;
  templateId?: string;
  retryAttempts?: number;
  backoffSeconds?: number;
};

export type WorkflowNode = {
  id: string;
  x: number;
  y: number;
  label: string;
  type: WorkflowNodeType;
  config?: WorkflowNodeConfig;
};

export type WorkflowEdge = {
  id: string;
  from: string;
  to: string;
  fromPort?: string;
  toPort?: string;
};

export type AutomationWorkflow = {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
};

export type AutomationItem = {
  id: string;
  accountId: string;
  name: string;
  trigger: AutomationTrigger;
  triggerConfig?: Record<string, unknown> | null;
  delaySeconds: number;
  channel: AutomationChannel;
  templateId: string | null;
  campaignId?: string | null;
  status: AutomationStatus;
  sendCount: number;
  workflow?: AutomationWorkflow | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    executions?: number;
  };
};

export type AutomationCreateInput = {
  name: string;
  trigger: AutomationTrigger;
  triggerConfig?: Record<string, unknown>;
  delaySeconds: number;
  channel: AutomationChannel;
  templateId?: string | null;
  campaignId?: string | null;
  status?: AutomationStatus;
};

export const automationsApi = {
  list: async (): Promise<AutomationItem[]> => {
    const response = await api.get<{ data: AutomationItem[] }>('/automations');
    return response.data.data;
  },

  create: async (payload: AutomationCreateInput): Promise<AutomationItem> => {
    const response = await api.post<AutomationItem>('/automations', payload);
    return response.data;
  },

  toggle: async (id: string): Promise<AutomationItem> => {
    const response = await api.patch<AutomationItem>(`/automations/${id}/toggle`);
    return response.data;
  },

  update: async (
    id: string,
    payload: Partial<AutomationCreateInput> & { workflow?: AutomationWorkflow | null },
  ): Promise<AutomationItem> => {
    const response = await api.patch<AutomationItem>(`/automations/${id}`, payload);
    return response.data;
  },

  remove: async (id: string): Promise<{ success: boolean }> => {
    const response = await api.delete<{ success: boolean }>(`/automations/${id}`);
    return response.data;
  },

  getReport: async (id: string): Promise<Record<string, unknown>> => {
    const response = await api.get<Record<string, unknown>>(`/automations/${id}/report`);
    return response.data;
  },

  trigger: async (
    id: string,
    payload: { contactId: string; delaySeconds?: number },
  ): Promise<{ id: string; status: string; contactId: string; automationId: string }> => {
    const response = await api.post<{
      id: string;
      status: string;
      contactId: string;
      automationId: string;
    }>(`/automations/${id}/trigger`, payload);
    return response.data;
  },

  listAutomationCampaigns: async (
    channel?: string,
  ): Promise<
    { id: string; name: string; channelType: string; status: string; updatedAt: string }[]
  > => {
    const params = channel ? `?channel=${encodeURIComponent(channel)}` : '';
    const response = await api.get<
      { id: string; name: string; channelType: string; status: string; updatedAt: string }[]
    >(`/campaigns/automation-ready${params}`);
    return response.data;
  },
};
