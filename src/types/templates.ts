export type TemplateState = "TEMPLATE_STATE_UNSPECIFIED" | "TEMPLATE_STATE_ACTIVE" | "TEMPLATE_STATE_ARCHIVED";

export type TemplateInfo = {
  templateId: string;
  spaceId: string;
  key: string;
  version: string;
  displayName: string;
  description: string;
  system: boolean;
  state: TemplateState | string;
};

export type ListTemplatesInput = {
  spaceId: string;
  pageSize?: number;
  pageToken?: string;
  includeSystem?: boolean;
  includeArchived?: boolean;
};

export type ListTemplatesResponse = {
  templates: TemplateInfo[];
  nextPageToken: string;
};
