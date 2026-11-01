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
  bindingId: string;
  bindingVersion: number;
  procedureId: string;
  procedureVersion: number;
  actorPrincipalId: string;
  ownerPrincipalId: string;
  onBehalfOfPrincipalId: string;
  eventOriginPrincipalId: string;
}

export interface ListAutomationInvocationsResponseInfo {
  invocations: AutomationInvocationSummaryInfo[];
}

export interface GetAutomationRunInput {
  domainId: string;
  runId: string;
}

export type AutomationRunState =
  | "running"
  | "succeeded"
  | "skipped"
  | "retryable"
  | "failed"
  | "canceled"
  | "unsupported";

export interface AutomationRunProjectionInfo {
  id: string;
  domainId: string;
  invocationId: string;
  bindingId: string;
  bindingVersion: number;
  procedureId: string;
  procedureVersion: number;
  attemptNumber: number;
  state: AutomationRunState;
  stateCode: number;
  outcomeCategory: string;
  actorPrincipalId: string;
  ownerPrincipalId: string;
  onBehalfOfPrincipalId: string;
  eventOriginPrincipalId: string;
  inferenceProfile: string;
  inferenceProfileId: string;
  policyDecisionId: string;
  endpointId: string;
  modelId: string;
  capabilityId: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  tokenCountAuthority: string;
  inferenceAttemptIds: string[];
  startedAt: string;
  completedAt: string;
}

export interface AutomationRunInfo {
  projection: AutomationRunProjectionInfo | null;
  diagnosticJson: string;
  compatibility: "typed_projection_available" | "typed_projection_unavailable";
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

export interface GraphProcedureSummaryInfo {
  id: string;
  name: string;
  version: number;
  status: string;
  updatedAt: string;
  operation: string;
  inferenceProfile: string;
  inferenceProfileId: string;
}

export interface ListGraphProceduresResponseInfo {
  procedures: GraphProcedureSummaryInfo[];
}

export interface GraphProcedureActionInput {
  domainId: string;
  procedureId: string;
}

export interface GraphProcedureInfo {
  procedureJson: string;
}

export interface GraphProcedureControlInput {
  spaceId: string;
  domainId: string;
  procedureId: string;
}

export type ProcedureControlTargetStatus = "enabled" | "disabled";

export interface ProcedureControlBarrierInfo {
  spaceId: string;
  domainId: string;
  procedureId: string;
  procedureVersion: number;
  targetStatus: ProcedureControlTargetStatus;
  controlEpoch: string;
  controllingPrincipalId: string;
  affectedPartitions: number[];
  acknowledgedPartitions: number[];
  completed: boolean;
  completionRevision: string;
  committedAt: string;
  completedAt: string;
}

export interface GraphProcedureControlResponseInfo {
  control: ProcedureControlBarrierInfo;
}

export interface GraphAutomationBindingSummaryInfo {
  id: string;
  name: string;
  version: number;
  status: string;
  procedureId: string;
  procedureVersion: number;
  triggerType: string;
  events: string[];
  labels: string[];
  actorPrincipalId: string;
  ownerPrincipalId: string;
  onBehalfOfPrincipalId: string;
  inferenceProfile: string;
  inferenceProfileId: string;
  scopeSpaceId: string;
  scopeDomainId: string;
  updatedAt: string;
}

export interface ListGraphAutomationBindingsResponseInfo {
  bindings: GraphAutomationBindingSummaryInfo[];
}

export interface GraphAutomationBindingActionInput {
  domainId: string;
  bindingId: string;
}

export interface GraphAutomationBindingInfo {
  bindingJson: string;
}
