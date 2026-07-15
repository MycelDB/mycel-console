export type UserState =
  | "USER_STATE_UNSPECIFIED"
  | "USER_STATE_ACTIVE"
  | "USER_STATE_DISABLED"
  | "USER_STATE_DELETED";

export type UserInfo = {
  userId: string;
  username: string;
  state: UserState | string;
  createTime?: string;
  updateTime?: string;
};

export type AdminClientInfo = {
  name: string;
  version: string;
  platform: string;
  deviceLabel: string;
};

export type UserSessionInfo = {
  authSessionId: string;
  createTime: string;
  lastSeenTime: string;
  expireTime: string;
  state: string;
  client?: AdminClientInfo | null;
};

export type ListUserSessionsInput = {
  userId: string;
  pageSize?: number;
  pageToken?: string;
  includeInactive?: boolean;
};

export type ListUserSessionsResponse = {
  sessions: UserSessionInfo[];
  nextPageToken: string;
};

export type ListUsersInput = {
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
  includeDeleted?: boolean;
};

export type ListUsersResponse = {
  users: UserInfo[];
  nextPageToken: string;
};

export type CreateUserInput = {
  username: string;
  password?: string;
  disabled?: boolean;
};

export type DisableUserInput = {
  userId: string;
  reason?: string;
  revokeSessions: boolean;
};

export type DeleteUserInput = {
  userId: string;
  revokeSessions: boolean;
};

export type SetUserPasswordInput = {
  userId: string;
  password: string;
  revokeSessions: boolean;
};

export type RevokeUserSessionInput = {
  userId: string;
  authSessionId: string;
};

export type RevokeUserSessionsResponse = {
  revokedCount: number;
};
