export type UserState =
  | "USER_STATE_UNSPECIFIED"
  | "USER_STATE_ACTIVE"
  | "USER_STATE_DISABLED"
  | "USER_STATE_DELETED";

export type UserInfo = {
  userId: string;
  username: string;
  state: UserState | string;
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
