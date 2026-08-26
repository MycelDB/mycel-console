export type SpaceState =
  | "SPACE_STATE_UNSPECIFIED"
  | "SPACE_STATE_ACTIVE"
  | "SPACE_STATE_ARCHIVED";

export type PrincipalInfo = {
  principalType: string;
  id: string;
  displayName: string;
};

export type EffectiveAccessInfo = {
  roles: string[];
  capabilities: string[];
};

export type SpaceInfo = {
  spaceId: string;
  name: string;
  owner?: PrincipalInfo | null;
  state?: SpaceState | string;
  createTime?: string;
  updateTime?: string;
  callerAccess?: EffectiveAccessInfo | null;
};

export type ListSpacesInput = {
  pageSize?: number;
  pageToken?: string;
  includeArchived?: boolean;
};

export type ListSpacesResponse = {
  spaces: SpaceInfo[];
  nextPageToken: string;
};

export type CreateSpaceInput = {
  name: string;
  ownerUserId?: string;
  ownerUsername?: string;
  defaultDomainKey?: string;
  defaultDomainName?: string;
};

export type CreateSpaceResponse = {
  space: SpaceInfo;
  defaultDomainId: string;
};

export type DeleteSpaceResponse = void;
