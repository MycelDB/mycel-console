export type DomainState = "DOMAIN_STATE_UNSPECIFIED" | "DOMAIN_STATE_ACTIVE";

export type DomainInfo = {
  spaceId: string;
  domainId: string;
  key: string;
  name: string;
  description: string;
  state: DomainState | string;
  isDefault: boolean;
  system: boolean;
  createTime?: string;
  updateTime?: string;
};

export type ListDomainsInput = {
  spaceId: string;
  pageSize?: number;
  pageToken?: string;
  includeSystem?: boolean;
};

export type ListDomainsResponse = {
  domains: DomainInfo[];
  nextPageToken: string;
};
