import api from './axios';

export type ApiKeyItem = {
  id: string;
  name: string;
  keyPrefix: string;
  keySuffix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type NewApiKey = ApiKeyItem & { key: string };

export type ApiKeyLog = {
  endpoint: string;
  method: string;
  statusCode: number;
  creditsUsed: number;
  createdAt: string;
};

export type ApiKeyStats = {
  totalCalls: number;
  callsToday: number;
  callsThisMonth: number;
  creditsThisMonth: number;
  recentLogs: ApiKeyLog[];
};

export const apiKeysApi = {
  list: () => api.get<ApiKeyItem[]>('/account/api-keys').then((r) => r.data),

  create: (name: string, permissions: string[], expiresAt?: string) =>
    api.post<NewApiKey>('/account/api-keys', { name, permissions, expiresAt }).then((r) => r.data),

  revoke: (id: string) =>
    api.delete<{ success: boolean }>(`/account/api-keys/${id}`).then((r) => r.data),

  listPermissions: () =>
    api
      .get<{ permissions: { value: string; label: string }[] }>('/account/api-keys/permissions')
      .then((r) => r.data.permissions),

  stats: (id: string) => api.get<ApiKeyStats>(`/account/api-keys/${id}/stats`).then((r) => r.data),

  sendToDeveloper: (developerEmail: string, fullKey: string, keyName: string) =>
    api
      .post<{ sent: boolean; to: string }>('/account/api-keys/send', {
        developerEmail,
        fullKey,
        keyName,
      })
      .then((r) => r.data),
};
