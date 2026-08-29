export interface ListActivityEventsInput {
  pageSize?: number;
  pageToken?: string;
  sinceSeconds?: number;
  untilSeconds?: number;
  severities?: string[];
  categories?: string[];
  types?: string[];
}

export interface GetActivityEventInput {
  eventId: string;
}

export interface ActivityEventInfo {
  eventId: string;
  occurredAt: string;
  ingestedAt: string;
  severity: string;
  category: string;
  eventType: string;
  message: string;
  source: string;
  actor: string;
  resource: string;
  correlationId: string;
}

export interface ActivityEventSummaryInfo {
  totalCount: number;
  warningCount: number;
  errorCount: number;
}

export interface ListActivityEventsResponseInfo {
  events: ActivityEventInfo[];
  nextPageToken: string;
  summary?: ActivityEventSummaryInfo | null;
}
