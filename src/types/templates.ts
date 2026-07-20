export type TemplatePropertyInfo = {
  name: string;
  valueType: string;
  required: boolean;
  description?: string;
};

export type TemplateInfo = {
  templateId: string;
  spaceId: string;
  key: string;
  version: string;
  displayName?: string;
  description?: string;
  system: boolean;
  state: string;
  propertiesAllowExtra: boolean;
  propertiesForbidden: string[];
  properties: TemplatePropertyInfo[];
  createTime?: string;
  updateTime?: string;
};

export type ListTemplatesInput = {
  spaceId: string;
  pageSize?: number;
  pageToken?: string;
  includeArchived?: boolean;
  includeSystem?: boolean;
};

export type ListTemplatesResponse = {
  templates: TemplateInfo[];
  nextPageToken?: string;
};

export type GetTemplateInput = {
  spaceId: string;
  templateId: string;
};
