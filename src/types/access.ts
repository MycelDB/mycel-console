export type AccessScopeInfo = {
  type: string;
  spaceId?: string;
  domainId?: string;
};

export type AccessScopeInput = {
  type: string;
  spaceId?: string;
  domainId?: string;
};

export type MyAccessScopeInput = {
  type?: string;
  spaceId?: string;
  domainId?: string;
};

export type GetMyAccessInput = {
  scope?: MyAccessScopeInput;
};

export type MyAccessScopeInfo = {
  kind: string;
  spaceId?: string;
  domainId?: string;
};

export type MyAccessRoleInfo = {
  role: string;
  scope?: MyAccessScopeInfo;
  source: string;
};

export type MyAccessCapabilityInfo = {
  capability: string;
  scope?: MyAccessScopeInfo;
  source: string;
  role?: string;
};

export type MyAccessInfo = {
  principal: {
    addr: string;
    principalId: string;
    username: string;
  };
  effectiveRoles: string[];
  effectiveCapabilities: string[];
  roles: MyAccessRoleInfo[];
  capabilities: MyAccessCapabilityInfo[];
  warnings: string[];
  complete: boolean;
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

export type GrantPrincipalRoleInput = {
  principalId: string;
  role: string;
  scope?: AccessScopeInput;
  reason?: string;
};

export type GrantPrincipalRoleResponse = {
  grant: PrincipalRoleGrantInfo;
  effectiveCapabilities: string[];
};

export type RevokePrincipalRoleInput = {
  principalId: string;
  roleGrantId: string;
  reason?: string;
};

export type RevokePrincipalRoleResponse = {
  effectiveCapabilities: string[];
};

export type SetPrincipalRolesForScopeInput = {
  principalId: string;
  scope?: AccessScopeInput;
  roles: string[];
  reason?: string;
};

export type SetPrincipalRolesForScopeResponse = {
  grants: PrincipalRoleGrantInfo[];
  effectiveRoles: string[];
  effectiveCapabilities: string[];
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

export type GrantPrincipalCapabilityInput = {
  principalId: string;
  capability: string;
  scope?: AccessScopeInput;
  reason?: string;
};

export type GrantPrincipalCapabilityResponse = {
  grant: PrincipalCapabilityGrantInfo;
  effectiveCapabilities: string[];
};

export type RevokePrincipalCapabilityInput = {
  principalId: string;
  capabilityGrantId: string;
  reason?: string;
};

export type RevokePrincipalCapabilityResponse = {
  effectiveCapabilities: string[];
};

export type SetPrincipalCapabilitiesForScopeInput = {
  principalId: string;
  scope?: AccessScopeInput;
  capabilities: string[];
  reason?: string;
};

export type SetPrincipalCapabilitiesForScopeResponse = {
  grants: PrincipalCapabilityGrantInfo[];
  effectiveCapabilities: string[];
};
