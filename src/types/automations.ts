export interface DomainAutomationInput {
  domainId: string;
}

export interface AutomationActionInput {
  domainId: string;
  automationId: string;
}

export interface AutomationDefinitionSummaryInfo {
  id: string;
  name: string;
  version: number;
  status: string;
  events: string[];
  labels: string[];
  updatedAt: string;
}

export interface ListAutomationsResponseInfo {
  automations: AutomationDefinitionSummaryInfo[];
}

export interface AutomationDefinitionInfo {
  definitionJson: string;
}

export interface ListAutomationInvocationsInput {
  domainId: string;
  automationId?: string;
  status?: string;
  limit?: number;
}

export interface AutomationInvocationSummaryInfo {
  id: string;
  automationId: string;
  automationVersion: number;
  eventId: string;
  changedElementId: string;
  eventType: string;
  status: string;
  skipReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAutomationInvocationsResponseInfo {
  invocations: AutomationInvocationSummaryInfo[];
}

export interface GetAutomationRunInput {
  domainId: string;
  runId: string;
}

export interface AutomationRunInfo {
  runJson: string;
}


export interface AutomationDefinitionInput {
  domainId: string;
  definitionJson: string;
}

export interface UpdateAutomationInput {
  domainId: string;
  automationId: string;
  definitionJson: string;
}

export interface ValidateAutomationInfo {
  valid: boolean;
  error: string;
  normalizedDefinitionJson: string;
}
