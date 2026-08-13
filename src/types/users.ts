export type PrincipalState =
  | "PRINCIPAL_STATE_UNSPECIFIED"
  | "PRINCIPAL_STATE_ACTIVE"
  | "PRINCIPAL_STATE_DISABLED"
  | "PRINCIPAL_STATE_DELETED";

export type PrincipalInfo = {
  principalId: string;
  username: string;
  displayName?: string;
  email?: string;
  type?: string;
  state: PrincipalState | string;
  loginEnabled?: boolean;
  createTime?: string;
  updateTime?: string;
};

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

export type ListPrincipalSessionsInput = {
  principalId: string;
  pageSize?: number;
  pageToken?: string;
  includeInactive?: boolean;
};

export type ListPrincipalSessionsResponse = {
  sessions: PrincipalSessionInfo[];
  nextPageToken: string;
};

export type ListPrincipalsInput = {
  pageSize?: number;
  pageToken?: string;
  includeDisabled?: boolean;
  includeDeleted?: boolean;
};

export type ListPrincipalsResponse = {
  principals: PrincipalInfo[];
  nextPageToken: string;
};

export type CreatePrincipalInput = {
  username: string;
  password?: string;
  disabled?: boolean;
};

export type DisablePrincipalInput = {
  principalId: string;
  reason?: string;
  revokeSessions: boolean;
};

export type DeletePrincipalInput = {
  principalId: string;
  revokeSessions: boolean;
};

export type SetPrincipalPasswordInput = {
  principalId: string;
  password: string;
  revokeSessions: boolean;
};

export type RevokePrincipalSessionInput = {
  principalId: string;
  authSessionId: string;
};

export type RevokePrincipalSessionsResponse = {
  revokedCount: number;
};

export function principalIdOf(principal: { principalId?: string }): string {
  return principal.principalId || "";
}

export function isPrincipalActive(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_ACTIVE";
}

export function isPrincipalDisabled(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_DISABLED";
}

export function isPrincipalDeleted(principal: Pick<PrincipalInfo, "state">): boolean {
  return principal.state === "PRINCIPAL_STATE_DELETED";
}
