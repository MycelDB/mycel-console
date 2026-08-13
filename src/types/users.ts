export type PrincipalState =
  | "PRINCIPAL_STATE_UNSPECIFIED"
  | "PRINCIPAL_STATE_ACTIVE"
  | "PRINCIPAL_STATE_DISABLED"
  | "PRINCIPAL_STATE_DELETED";

export type LegacyUserState =
  | "USER_STATE_UNSPECIFIED"
  | "USER_STATE_ACTIVE"
  | "USER_STATE_DISABLED"
  | "USER_STATE_DELETED";

/** @deprecated Use PrincipalState. Kept during the unified principal migration. */
export type UserState = PrincipalState | LegacyUserState;

export type PrincipalInfo = {
  principalId: string;
  /** @deprecated Use principalId. Kept while user-named routes/components are migrated. */
  userId?: string;
  username: string;
  displayName?: string;
  email?: string;
  type?: string;
  state: PrincipalState | LegacyUserState | string;
  loginEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
};

/** @deprecated Use PrincipalInfo. Kept during the unified principal migration. */
export type UserInfo = Omit<PrincipalInfo, "principalId"> & { principalId?: string; userId: string };

export type AdminClientInfo = {
  name: string;
  version: string;
  platform: string;
  deviceLabel: string;
};

export type PrincipalSessionInfo = {
  authSessionId: string;
  createTime: string;
  lastSeenTime: string;
  expireTime: string;
  state: string;
  client?: AdminClientInfo | null;
};

/** @deprecated Use PrincipalSessionInfo. */
export type UserSessionInfo = PrincipalSessionInfo;

export type ListPrincipalSessionsInput = {
  principalId: string;
  pageSize?: number;
  pageToken?: string;
  includeInactive?: boolean;
};

/** @deprecated Use ListPrincipalSessionsInput. */
export type ListUserSessionsInput = Omit<ListPrincipalSessionsInput, "principalId"> & {
  principalId?: string;
  userId: string;
};

export type ListPrincipalSessionsResponse = {
  sessions: PrincipalSessionInfo[];
  nextPageToken: string;
};

/** @deprecated Use ListPrincipalSessionsResponse. */
export type ListUserSessionsResponse = ListPrincipalSessionsResponse;

export type ListPrincipalsInput = {
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
  includeDeleted?: boolean;
};

/** @deprecated Use ListPrincipalsInput. */
export type ListUsersInput = ListPrincipalsInput;

export type ListPrincipalsResponse = {
  principals: PrincipalInfo[];
  nextPageToken: string;
};

/** @deprecated Use ListPrincipalsResponse. */
export type ListUsersResponse = {
  users: UserInfo[];
  nextPageToken: string;
};

export type CreatePrincipalInput = {
  username: string;
  password?: string;
  disabled?: boolean;
};

/** @deprecated Use CreatePrincipalInput. */
export type CreateUserInput = CreatePrincipalInput;

export type DisablePrincipalInput = {
  principalId: string;
  reason?: string;
  revokeSessions: boolean;
};

/** @deprecated Use DisablePrincipalInput. */
export type DisableUserInput = Omit<DisablePrincipalInput, "principalId"> & {
  principalId?: string;
  userId: string;
};

export type DeletePrincipalInput = {
  principalId: string;
  revokeSessions: boolean;
};

/** @deprecated Use DeletePrincipalInput. */
export type DeleteUserInput = Omit<DeletePrincipalInput, "principalId"> & {
  principalId?: string;
  userId: string;
};

export type SetPrincipalPasswordInput = {
  principalId: string;
  password: string;
  revokeSessions: boolean;
};

/** @deprecated Use SetPrincipalPasswordInput. */
export type SetUserPasswordInput = Omit<SetPrincipalPasswordInput, "principalId"> & {
  principalId?: string;
  userId: string;
};

export type RevokePrincipalSessionInput = {
  principalId: string;
  authSessionId: string;
};

/** @deprecated Use RevokePrincipalSessionInput. */
export type RevokeUserSessionInput = Omit<RevokePrincipalSessionInput, "principalId"> & {
  principalId?: string;
  userId: string;
};

export type RevokePrincipalSessionsResponse = {
  revokedCount: number;
};

/** @deprecated Use RevokePrincipalSessionsResponse. */
export type RevokeUserSessionsResponse = RevokePrincipalSessionsResponse;

export function principalIdOf(principal: { principalId?: string; userId?: string }): string {
  return principal.principalId || principal.userId || "";
}

export function isPrincipalActive(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_ACTIVE" || principal.state === "USER_STATE_ACTIVE";
}

export function isPrincipalDisabled(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_DISABLED" || principal.state === "USER_STATE_DISABLED";
}

export function isPrincipalDeleted(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_DELETED" || principal.state === "USER_STATE_DELETED";
}
