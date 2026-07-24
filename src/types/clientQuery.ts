export type ClientQueryLoginInput = { addr: string; username: string; password: string };
export type ClientQuerySessionInfo = { addr: string; username: string };
export type ExecuteGqlInput = { spaceId: string; domainId: string; query: string; pageSize?: number; pageToken?: string; readWrite?: boolean };
export type ExecuteGqlResponse = { result: unknown };
export type ExecuteGraphQueryInput = { spaceId: string; domainId: string; queryJson: string; pageSize?: number; pageToken?: string };
export type ExecuteGraphQueryResponse = { rows: unknown; nextPageToken: string };
