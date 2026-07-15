export type Contact = {
  id: string;
  accountId: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  tags: string[];
  createdAt: string;
  optOut: boolean;
  location?: string;
  lastPurchaseDate?: string;
  engagementScore?: number;
  birthday?: string | null;
  phoneStatus?: 'VALID' | 'INVALID' | 'UNVERIFIED';
};

export type ImportMapping = Record<string, string>;

export type ImportReport = {
  jobId: string;
  fileName: string;
  totalRecords: number;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errors?: Array<{ row: number; message: string }>;
};

export type ContactFilter = {
  location?: string;
  tag?: string;
  dateAddedFrom?: string;
  dateAddedTo?: string;
  lastPurchaseFrom?: string;
  lastPurchaseTo?: string;
  status?: 'active' | 'inactive' | 'all';
};

export type SegmentLogic = 'AND' | 'OR';

export type SegmentCriterion = {
  field: 'tag' | 'status' | 'email' | 'phone' | 'firstName' | 'lastName';
  operator: 'equals' | 'contains';
  value: string;
};

export type DynamicSegment = {
  id: string;
  name: string | null;
  type: string | null;
  criteria: unknown;
  contactCount: number;
  lastCalculated: string | null;
};

export type SegmentWithContacts = DynamicSegment & {
  contacts: Contact[];
};
