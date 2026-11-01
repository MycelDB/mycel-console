export type ProcedureInferenceAttemptState =
  | "requested"
  | "authorized"
  | "started"
  | "succeeded"
  | "failed"
  | "denied"
  | "canceled"
  | "ambiguous";

export type ProcedureInferenceOperation =
  | "embeddings"
  | "chat"
  | "rerank"
  | "summarize"
  | "classify"
  | "image_analysis";

export interface ProcedureInferenceAttemptFilterInput {
  domainId?: string;
  procedureId?: string;
  procedureVersion?: number;
  bindingId?: string;
  bindingVersion?: number;
  invocationId?: string;
  runId?: string;
  workflowStepId?: string;
  endpointId?: string;
  modelId?: string;
  capabilityId?: string;
  operation?: ProcedureInferenceOperation;
  states?: ProcedureInferenceAttemptState[];
  eventOriginPrincipalId?: string;
  actorPrincipalId?: string;
  ownerPrincipalId?: string;
  onBehalfOfPrincipalId?: string;
  requestedAtOrAfterSeconds?: number;
  requestedBeforeSeconds?: number;
  completedAtOrAfterSeconds?: number;
  completedBeforeSeconds?: number;
}

export interface GetProcedureInferenceAttemptInput {
  spaceId: string;
  attemptId: string;
}

export interface ListProcedureInferenceAttemptsInput {
  spaceId: string;
  filter: ProcedureInferenceAttemptFilterInput;
  pageSize?: number;
  pageToken?: string;
}

export interface ListProcedureInferenceAttemptChangesInput {
  spaceId: string;
  filter: ProcedureInferenceAttemptFilterInput;
  pageSize?: number;
  afterCursor?: string;
}

export interface ProcedureInferenceAttemptInfo {
  id: string;
  recordVersion: string;
  spaceId: string;
  domainId: string;
  procedureId: string;
  procedureVersion: number;
  bindingId: string;
  bindingVersion: number;
  invocationId: string;
  runId: string;
  runAttemptNumber: number;
  workflowStepId: string;
  providerAttemptNumber: number;
  sourceEventId: string;
  sourceTransactionId: string;
  sourceGraphRevision: string;
  eventOriginPrincipalId: string;
  actorPrincipalId: string;
  ownerPrincipalId: string;
  onBehalfOfPrincipalId: string;
  operation: string;
  profileId: string;
  endpointId: string;
  modelId: string;
  capabilityId: string;
  policyDecisionId: string;
  authorizationRevision: string;
  configurationRevision: string;
  state: string;
  outcomeCategory: string;
  inputTokens: string;
  outputTokens: string;
  totalTokens: string;
  tokenCountAuthority: string;
  providerDurationMillis: string;
  publicationDisposition: string;
  requestedAt: string;
  authorizedAt: string;
  startedAt: string;
  completedAt: string;
}

export interface ProcedureInferenceAttemptChangeInfo {
  eventId: string;
  schemaVersion: string;
  spaceId: string;
  sequence: string;
  changeKind: string;
  attemptId: string;
  recordVersion: string;
  attempt?: ProcedureInferenceAttemptInfo | null;
  occurredAt: string;
  committedAt: string;
}

export interface ListProcedureInferenceAttemptsResponseInfo {
  attempts: ProcedureInferenceAttemptInfo[];
  nextPageToken: string;
  snapshotHighWaterSequence: string;
  earliestRetainedStateSequence: string;
  snapshotCursor: string;
}

export interface ListProcedureInferenceAttemptChangesResponseInfo {
  changes: ProcedureInferenceAttemptChangeInfo[];
  nextCursor: string;
  highWaterSequence: string;
  earliestRetainedSequence: string;
  earliestRetainedStateSequence: string;
  historyGap: boolean;
}
