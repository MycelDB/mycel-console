export type AccessScopeInfo = {
  type: string;
  spaceId?: string;
  domainId?: string;
};

export type PrincipalRoleGrantInfo = {
  roleGrantId: string;
  principalId: string;
  role: string;
  scope?: AccessScopeInfo | null;
  reason?: string;
  grantedByPrincipalId?: string;
  createTime?: string;
};

export type ListPrincipalRolesResponse = {
  grants: PrincipalRoleGrantInfo[];
  effectiveRoles: string[];
};

export type PrincipalCapabilityGrantInfo = {
  capabilityGrantId: string;
  principalId: string;
  capability: string;
  scope?: AccessScopeInfo | null;
  reason?: string;
  grantedByPrincipalId?: string;
  createTime?: string;
};

export type ListPrincipalCapabilitiesResponse = {
  grants: PrincipalCapabilityGrantInfo[];
  effectiveCapabilities: string[];
};
