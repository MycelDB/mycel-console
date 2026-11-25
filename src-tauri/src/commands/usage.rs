use std::collections::HashMap;

use mycel_sdk::proto::admin::v1::{
    batch_usage_result, usage_scope, BatchGetUsageRequest, DomainInclusionMode,
    DomainUsageScope, GetUsageAccountingHealthRequest, GetUsageRequest, ListUsageRequest,
    SpaceUsageScope, UsageAccountingHealth, UsageAccountingState, UsageAuthority,
    UsageListMode, UsageMetric, UsageRevision, UsageScope, UsageSnapshot, UsageStatus,
    UsageStatusReason, UsageStatusSeverity, UsageUnit,
};
use prost_types::Timestamp;
use tauri::State;

use crate::commands::command_error::{
    authenticated_rpc, sdk_error, validation_error, ConsoleCommandError,
};
use crate::state::AppState;

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UsageScopeInput {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub space_id: String,
    #[serde(default)]
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageScopeInfo {
    pub kind: String,
    pub space_id: String,
    pub domain_id: String,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageSourceRevisionInfo {
    pub source: String,
    pub revision: String,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageRevisionInfo {
    pub revision_token: String,
    pub source_revisions: Vec<UsageSourceRevisionInfo>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageStatusInfo {
    pub reason: String,
    pub severity: String,
    pub message: String,
    pub scope: Option<UsageScopeInfo>,
    pub metric_name: String,
    pub evidence: HashMap<String, String>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageMetricInfo {
    pub name: String,
    pub metric_version: u32,
    pub value: u64,
    pub unit: String,
    pub authority: String,
    pub quota_safe: bool,
    pub hard_limit_eligible: bool,
    pub observed_at: String,
    pub as_of_revision: Option<UsageRevisionInfo>,
    pub labels: HashMap<String, String>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageSnapshotInfo {
    pub scope: Option<UsageScopeInfo>,
    pub domain_inclusion: String,
    pub observed_at: String,
    pub as_of_revision: Option<UsageRevisionInfo>,
    pub accounting_state: String,
    pub quota_safe_complete: bool,
    pub metrics: Vec<UsageMetricInfo>,
    pub blockers: Vec<UsageStatusInfo>,
    pub warnings: Vec<UsageStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UsageAccountingHealthInfo {
    pub scope: Option<UsageScopeInfo>,
    pub observed_at: String,
    pub state: String,
    pub as_of_revision: Option<UsageRevisionInfo>,
    pub quota_safe_ready: bool,
    pub blockers: Vec<UsageStatusInfo>,
    pub warnings: Vec<UsageStatusInfo>,
    pub rebuilding_scope_count: u64,
    pub stale_scope_count: u64,
    pub drift_scope_count: u64,
    pub diagnostic_collector_unavailable_count: u64,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetUsageInput {
    #[serde(default)]
    pub scope: UsageScopeInput,
    #[serde(default)]
    pub domain_inclusion: String,
    #[serde(default)]
    pub include_diagnostic_physical: bool,
    #[serde(default)]
    pub require_quota_safe: bool,
    #[serde(default)]
    pub max_staleness_seconds: Option<u64>,
    #[serde(default)]
    pub metric_names: Vec<String>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchGetUsageInput {
    #[serde(default)]
    pub requests: Vec<GetUsageInput>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BatchUsageResultInfo {
    pub scope: Option<UsageScopeInfo>,
    pub snapshot: Option<UsageSnapshotInfo>,
    pub status: Option<UsageStatusInfo>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct BatchGetUsageResponseInfo {
    pub results: Vec<BatchUsageResultInfo>,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ListUsageInput {
    #[serde(default)]
    pub parent: Option<UsageScopeInput>,
    #[serde(default)]
    pub mode: String,
    #[serde(default)]
    pub domain_inclusion: String,
    #[serde(default)]
    pub include_diagnostic_physical: bool,
    #[serde(default)]
    pub require_quota_safe: bool,
    #[serde(default)]
    pub max_staleness_seconds: Option<u64>,
    #[serde(default)]
    pub page_size: Option<i32>,
    #[serde(default)]
    pub page_token: String,
    #[serde(default)]
    pub metric_names: Vec<String>,
}

#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ListUsageResponseInfo {
    pub snapshots: Vec<UsageSnapshotInfo>,
    pub next_page_token: String,
}

#[derive(Debug, Clone, Default, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GetUsageAccountingHealthInput {
    #[serde(default)]
    pub scope: Option<UsageScopeInput>,
    #[serde(default)]
    pub include_reconciliation: bool,
    #[serde(default)]
    pub include_diagnostic_collectors: bool,
}

#[tauri::command]
pub async fn admin_get_usage(
    input: GetUsageInput,
    state: State<'_, AppState>,
) -> Result<UsageSnapshotInfo, ConsoleCommandError> {
    let request = get_usage_request(input)?;
    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(not_authenticated)?;

    let response = authenticated_rpc!(session._client, usage.get_usage(request))
        .map_err(sdk_error)?
        .into_inner();

    response
        .snapshot
        .map(snapshot_info)
        .ok_or_else(|| validation_error("GetUsage response did not include a snapshot"))
}

#[tauri::command]
pub async fn admin_batch_get_usage(
    input: BatchGetUsageInput,
    state: State<'_, AppState>,
) -> Result<BatchGetUsageResponseInfo, ConsoleCommandError> {
    if input.requests.is_empty() {
        return Err(validation_error("At least one usage request is required"));
    }
    if input.requests.len() > 100 {
        return Err(validation_error("Batch usage requests are limited to 100 scopes"));
    }
    let requests = input
        .requests
        .into_iter()
        .map(get_usage_request)
        .collect::<Result<Vec<_>, _>>()?;

    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(not_authenticated)?;

    let response = authenticated_rpc!(
        session._client,
        usage.batch_get_usage(BatchGetUsageRequest { requests })
    )
    .map_err(sdk_error)?
    .into_inner();

    Ok(BatchGetUsageResponseInfo {
        results: response.results.into_iter().map(batch_result_info).collect(),
    })
}

#[tauri::command]
pub async fn admin_list_usage(
    input: ListUsageInput,
    state: State<'_, AppState>,
) -> Result<ListUsageResponseInfo, ConsoleCommandError> {
    let page_size = input.page_size.unwrap_or(50);
    if !(1..=500).contains(&page_size) {
        return Err(validation_error("Page size must be between 1 and 500"));
    }
    let mode = parse_usage_list_mode(&input.mode)?;
    let parent = match input.parent {
        Some(parent) => usage_scope(parent, true)?,
        None => None,
    };
    let request = ListUsageRequest {
        parent,
        mode,
        domain_inclusion: parse_domain_inclusion(&input.domain_inclusion)?,
        include_diagnostic_physical: input.include_diagnostic_physical,
        require_quota_safe: input.require_quota_safe,
        max_staleness_seconds: input.max_staleness_seconds.unwrap_or_default(),
        page_size,
        page_token: input.page_token.trim().to_string(),
        metric_names: metric_names(input.metric_names),
        minimum_revision: None,
    };

    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(not_authenticated)?;

    let response = authenticated_rpc!(session._client, usage.list_usage(request))
        .map_err(sdk_error)?
        .into_inner();

    Ok(ListUsageResponseInfo {
        snapshots: response.snapshots.into_iter().map(snapshot_info).collect(),
        next_page_token: response.next_page_token,
    })
}

#[tauri::command]
pub async fn admin_get_usage_accounting_health(
    input: GetUsageAccountingHealthInput,
    state: State<'_, AppState>,
) -> Result<UsageAccountingHealthInfo, ConsoleCommandError> {
    let request = GetUsageAccountingHealthRequest {
        scope: match input.scope {
            Some(scope) => usage_scope(scope, true)?,
            None => None,
        },
        include_reconciliation: input.include_reconciliation,
        include_diagnostic_collectors: input.include_diagnostic_collectors,
    };

    let mut guard = state.admin.write().await;
    let session = guard.as_mut().ok_or_else(not_authenticated)?;

    let response = authenticated_rpc!(
        session._client,
        usage.get_usage_accounting_health(request)
    )
    .map_err(sdk_error)?
    .into_inner();

    response
        .health
        .map(health_info)
        .ok_or_else(|| validation_error("GetUsageAccountingHealth response did not include health"))
}

fn get_usage_request(input: GetUsageInput) -> Result<GetUsageRequest, ConsoleCommandError> {
    Ok(GetUsageRequest {
        scope: usage_scope(input.scope, false)?,
        domain_inclusion: parse_domain_inclusion(&input.domain_inclusion)?,
        include_diagnostic_physical: input.include_diagnostic_physical,
        require_quota_safe: input.require_quota_safe,
        max_staleness_seconds: input.max_staleness_seconds.unwrap_or_default(),
        minimum_revision: None,
        metric_names: metric_names(input.metric_names),
    })
}

fn usage_scope(
    input: UsageScopeInput,
    allow_empty: bool,
) -> Result<Option<UsageScope>, ConsoleCommandError> {
    let kind = input.kind.trim().to_ascii_lowercase();
    let space_id = input.space_id.trim().to_string();
    let domain_id = input.domain_id.trim().to_string();

    if kind.is_empty() && space_id.is_empty() && domain_id.is_empty() && allow_empty {
        return Ok(None);
    }

    let inferred_kind = if kind.is_empty() {
        if !domain_id.is_empty() {
            "domain"
        } else {
            "space"
        }
    } else {
        kind.as_str()
    };

    match inferred_kind {
        "space" | "spaces" | "usage_scope_space" => {
            if space_id.is_empty() {
                return Err(validation_error("Space ID is required"));
            }
            Ok(Some(UsageScope {
                scope: Some(usage_scope::Scope::Space(SpaceUsageScope { space_id })),
            }))
        }
        "domain" | "domains" | "usage_scope_domain" => {
            if space_id.is_empty() {
                return Err(validation_error("Space ID is required"));
            }
            if domain_id.is_empty() {
                return Err(validation_error("Domain ID is required"));
            }
            Ok(Some(UsageScope {
                scope: Some(usage_scope::Scope::Domain(DomainUsageScope {
                    space_id,
                    domain_id,
                })),
            }))
        }
        "" if allow_empty => Ok(None),
        _ => Err(validation_error("Usage scope kind must be space or domain")),
    }
}

fn parse_domain_inclusion(value: &str) -> Result<i32, ConsoleCommandError> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Ok(DomainInclusionMode::RetainedNonSystem as i32);
    }
    let upper = normalized.to_ascii_uppercase();
    let enum_name = match upper.as_str() {
        "RETAINED_NON_SYSTEM" | "NON_SYSTEM" | "DEFAULT" => {
            "DOMAIN_INCLUSION_MODE_RETAINED_NON_SYSTEM"
        }
        "RETAINED_ALL" | "ALL" => "DOMAIN_INCLUSION_MODE_RETAINED_ALL",
        "SYSTEM_ONLY" | "SYSTEM" => "DOMAIN_INCLUSION_MODE_SYSTEM_ONLY",
        other => other,
    };
    DomainInclusionMode::from_str_name(enum_name)
        .map(|mode| mode as i32)
        .ok_or_else(|| validation_error("Unknown domain inclusion mode"))
}

fn parse_usage_list_mode(value: &str) -> Result<i32, ConsoleCommandError> {
    let normalized = value.trim();
    if normalized.is_empty() {
        return Ok(UsageListMode::Spaces as i32);
    }
    let upper = normalized.to_ascii_uppercase();
    let enum_name = match upper.as_str() {
        "SPACES" => "USAGE_LIST_MODE_SPACES",
        "DOMAINS" | "DOMAINS_IN_SPACE" => "USAGE_LIST_MODE_DOMAINS_IN_SPACE",
        "SPACE_WITH_DOMAIN_BREAKDOWN" | "BREAKDOWN" => {
            "USAGE_LIST_MODE_SPACE_WITH_DOMAIN_BREAKDOWN"
        }
        other => other,
    };
    UsageListMode::from_str_name(enum_name)
        .map(|mode| mode as i32)
        .ok_or_else(|| validation_error("Unknown usage list mode"))
}

fn metric_names(names: Vec<String>) -> Vec<String> {
    names
        .into_iter()
        .map(|name| name.trim().to_string())
        .filter(|name| !name.is_empty())
        .collect()
}

fn snapshot_info(snapshot: UsageSnapshot) -> UsageSnapshotInfo {
    UsageSnapshotInfo {
        scope: snapshot.scope.map(scope_info),
        domain_inclusion: DomainInclusionMode::try_from(snapshot.domain_inclusion)
            .unwrap_or(DomainInclusionMode::Unspecified)
            .as_str_name()
            .to_string(),
        observed_at: timestamp_string(snapshot.observed_at),
        as_of_revision: snapshot.as_of_revision.map(revision_info),
        accounting_state: UsageAccountingState::try_from(snapshot.accounting_state)
            .unwrap_or(UsageAccountingState::Unspecified)
            .as_str_name()
            .to_string(),
        quota_safe_complete: snapshot.quota_safe_complete,
        metrics: snapshot.metrics.into_iter().map(metric_info).collect(),
        blockers: snapshot.blockers.into_iter().map(status_info).collect(),
        warnings: snapshot.warnings.into_iter().map(status_info).collect(),
    }
}

fn health_info(health: UsageAccountingHealth) -> UsageAccountingHealthInfo {
    UsageAccountingHealthInfo {
        scope: health.scope.map(scope_info),
        observed_at: timestamp_string(health.observed_at),
        state: UsageAccountingState::try_from(health.state)
            .unwrap_or(UsageAccountingState::Unspecified)
            .as_str_name()
            .to_string(),
        as_of_revision: health.as_of_revision.map(revision_info),
        quota_safe_ready: health.quota_safe_ready,
        blockers: health.blockers.into_iter().map(status_info).collect(),
        warnings: health.warnings.into_iter().map(status_info).collect(),
        rebuilding_scope_count: health.rebuilding_scope_count,
        stale_scope_count: health.stale_scope_count,
        drift_scope_count: health.drift_scope_count,
        diagnostic_collector_unavailable_count: health.diagnostic_collector_unavailable_count,
    }
}

fn metric_info(metric: UsageMetric) -> UsageMetricInfo {
    UsageMetricInfo {
        name: metric.name,
        metric_version: metric.metric_version,
        value: metric.value,
        unit: UsageUnit::try_from(metric.unit)
            .unwrap_or(UsageUnit::Unspecified)
            .as_str_name()
            .to_string(),
        authority: UsageAuthority::try_from(metric.authority)
            .unwrap_or(UsageAuthority::Unspecified)
            .as_str_name()
            .to_string(),
        quota_safe: metric.quota_safe,
        hard_limit_eligible: metric.hard_limit_eligible,
        observed_at: timestamp_string(metric.observed_at),
        as_of_revision: metric.as_of_revision.map(revision_info),
        labels: metric.labels,
    }
}

fn status_info(status: UsageStatus) -> UsageStatusInfo {
    UsageStatusInfo {
        reason: UsageStatusReason::try_from(status.reason)
            .unwrap_or(UsageStatusReason::Unspecified)
            .as_str_name()
            .to_string(),
        severity: UsageStatusSeverity::try_from(status.severity)
            .unwrap_or(UsageStatusSeverity::Unspecified)
            .as_str_name()
            .to_string(),
        message: status.message,
        scope: status.scope.map(scope_info),
        metric_name: status.metric_name,
        evidence: status.evidence,
    }
}

fn revision_info(revision: UsageRevision) -> UsageRevisionInfo {
    UsageRevisionInfo {
        revision_token: revision.revision_token,
        source_revisions: revision
            .source_revisions
            .into_iter()
            .map(|source| UsageSourceRevisionInfo {
                source: source.source,
                revision: source.revision,
            })
            .collect(),
    }
}

fn scope_info(scope: UsageScope) -> UsageScopeInfo {
    match scope.scope {
        Some(usage_scope::Scope::Space(scope)) => UsageScopeInfo {
            kind: "space".to_string(),
            space_id: scope.space_id,
            domain_id: String::new(),
        },
        Some(usage_scope::Scope::Domain(scope)) => UsageScopeInfo {
            kind: "domain".to_string(),
            space_id: scope.space_id,
            domain_id: scope.domain_id,
        },
        None => UsageScopeInfo {
            kind: "unknown".to_string(),
            space_id: String::new(),
            domain_id: String::new(),
        },
    }
}

fn batch_result_info(result: mycel_sdk::proto::admin::v1::BatchUsageResult) -> BatchUsageResultInfo {
    let (snapshot, status) = match result.result {
        Some(batch_usage_result::Result::Snapshot(snapshot)) => (Some(snapshot_info(snapshot)), None),
        Some(batch_usage_result::Result::Status(status)) => (None, Some(status_info(status))),
        None => (None, None),
    };
    BatchUsageResultInfo {
        scope: result.scope.map(scope_info),
        snapshot,
        status,
    }
}

fn timestamp_string(timestamp: Option<Timestamp>) -> String {
    timestamp
        .map(|timestamp| {
            if timestamp.nanos == 0 {
                format!("{}", timestamp.seconds)
            } else {
                format!("{}.{:09}", timestamp.seconds, timestamp.nanos)
            }
        })
        .unwrap_or_default()
}

fn not_authenticated() -> ConsoleCommandError {
    sdk_error(mycel_sdk::Error::Message("Not authenticated".to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use mycel_sdk::proto::admin::v1::{UsageSourceRevision, UsageStatus};

    #[test]
    fn maps_snapshot_metrics_and_diagnostic_safety_flags() {
        let info = snapshot_info(UsageSnapshot {
            scope: Some(UsageScope {
                scope: Some(usage_scope::Scope::Domain(DomainUsageScope {
                    space_id: "sp_main".to_string(),
                    domain_id: "dom_default".to_string(),
                })),
            }),
            domain_inclusion: DomainInclusionMode::RetainedNonSystem as i32,
            observed_at: Some(Timestamp {
                seconds: 1_700_000_000,
                nanos: 0,
            }),
            as_of_revision: Some(UsageRevision {
                revision_token: "rev-1".to_string(),
                source_revisions: vec![UsageSourceRevision {
                    source: "raft".to_string(),
                    revision: "42".to_string(),
                }],
            }),
            accounting_state: UsageAccountingState::Ready as i32,
            quota_safe_complete: true,
            metrics: vec![
                UsageMetric {
                    name: "graph.node_count".to_string(),
                    metric_version: 1,
                    value: 7,
                    unit: UsageUnit::Count as i32,
                    authority: UsageAuthority::RaftCommittedExact as i32,
                    quota_safe: true,
                    hard_limit_eligible: true,
                    observed_at: None,
                    as_of_revision: None,
                    labels: HashMap::new(),
                },
                UsageMetric {
                    name: "diagnostic.physical_bytes".to_string(),
                    metric_version: 1,
                    value: 2048,
                    unit: UsageUnit::Bytes as i32,
                    authority: UsageAuthority::ObservedApproximate as i32,
                    quota_safe: false,
                    hard_limit_eligible: false,
                    observed_at: None,
                    as_of_revision: None,
                    labels: HashMap::from([("source".to_string(), "pvc".to_string())]),
                },
            ],
            blockers: vec![],
            warnings: vec![UsageStatus {
                reason: UsageStatusReason::MetricNotQuotaSafe as i32,
                severity: UsageStatusSeverity::Warning as i32,
                message: "physical bytes are diagnostic".to_string(),
                scope: None,
                metric_name: "diagnostic.physical_bytes".to_string(),
                evidence: HashMap::new(),
            }],
        });

        assert_eq!(info.scope.unwrap().kind, "domain");
        assert_eq!(info.accounting_state, "USAGE_ACCOUNTING_STATE_READY");
        assert!(info.quota_safe_complete);
        assert!(info.metrics[0].quota_safe);
        assert!(info.metrics[0].hard_limit_eligible);
        assert!(!info.metrics[1].quota_safe);
        assert!(!info.metrics[1].hard_limit_eligible);
        assert_eq!(info.metrics[1].authority, "USAGE_AUTHORITY_OBSERVED_APPROXIMATE");
        assert_eq!(info.warnings[0].reason, "USAGE_STATUS_REASON_METRIC_NOT_QUOTA_SAFE");
    }

    #[test]
    fn maps_health_fail_closed_state_and_blockers() {
        let info = health_info(UsageAccountingHealth {
            scope: None,
            observed_at: None,
            state: UsageAccountingState::Rebuilding as i32,
            as_of_revision: None,
            quota_safe_ready: false,
            blockers: vec![UsageStatus {
                reason: UsageStatusReason::CountersRebuilding as i32,
                severity: UsageStatusSeverity::Blocker as i32,
                message: "counters are rebuilding".to_string(),
                scope: None,
                metric_name: String::new(),
                evidence: HashMap::from([("restore_marker".to_string(), "pending".to_string())]),
            }],
            warnings: vec![],
            rebuilding_scope_count: 2,
            stale_scope_count: 0,
            drift_scope_count: 0,
            diagnostic_collector_unavailable_count: 1,
        });

        assert_eq!(info.state, "USAGE_ACCOUNTING_STATE_REBUILDING");
        assert!(!info.quota_safe_ready);
        assert_eq!(info.blockers[0].severity, "USAGE_STATUS_SEVERITY_BLOCKER");
        assert_eq!(info.rebuilding_scope_count, 2);
        assert_eq!(info.diagnostic_collector_unavailable_count, 1);
    }

    #[test]
    fn validates_scope_inputs() {
        let err = usage_scope(UsageScopeInput { kind: "domain".to_string(), space_id: "sp".to_string(), domain_id: "".to_string() }, false).unwrap_err();
        assert_eq!(err.kind, "validation");
        assert!(err.message.contains("Domain ID"));

        let scope = usage_scope(UsageScopeInput { kind: "".to_string(), space_id: "sp".to_string(), domain_id: "".to_string() }, false).unwrap().unwrap();
        assert_eq!(scope_info(scope).kind, "space");
    }

    #[test]
    fn parses_friendly_enum_inputs() {
        assert_eq!(parse_usage_list_mode("domains").unwrap(), UsageListMode::DomainsInSpace as i32);
        assert_eq!(parse_domain_inclusion("all").unwrap(), DomainInclusionMode::RetainedAll as i32);
        assert!(parse_usage_list_mode("bogus").is_err());
    }
}
