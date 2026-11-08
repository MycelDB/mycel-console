import type {
  SemanticDuration,
  SemanticProviderBudgetPolicy,
  SemanticProviderCostLimit,
} from "../../../../types/semantic";

const maxInt64 = "9223372036854775807";
const decimalPattern = /^\d+$/;

export function emptyProviderBudget(): SemanticProviderBudgetPolicy {
  return {
    correlationId: "",
    maxRequests: "",
    maxRetryAttempts: "",
    maxRetriesPerRequest: "",
    maxConcurrentProviderCalls: "",
    batchingMode: null,
    maxBatchItems: "",
    maxInputTokensPerRequest: "",
    maxInputTokens: "",
    requestTimeout: { seconds: "", nanos: 0 },
    totalTimeout: { seconds: "", nanos: 0 },
    cost: {
      currency: "",
      priceDefinitionVersion: "",
      inputMicrosPerMillionTokens: "",
      maxEstimatedCostMicros: "",
    },
  };
}

export function validateSemanticProviderBudget(
  policy: SemanticProviderBudgetPolicy | null | undefined,
): string[] {
  if (!policy) return [];
  const errors: string[] = [];
  const maxRequests = requiredInteger(policy.maxRequests, "maxRequests", false, errors);
  const maxRetryAttempts = requiredInteger(
    policy.maxRetryAttempts,
    "maxRetryAttempts",
    true,
    errors,
  );
  const maxRetriesPerRequest = requiredInteger(
    policy.maxRetriesPerRequest,
    "maxRetriesPerRequest",
    true,
    errors,
  );
  const maxConcurrent = requiredInteger(
    policy.maxConcurrentProviderCalls,
    "maxConcurrentProviderCalls",
    false,
    errors,
  );
  const maxBatchItems = requiredInteger(
    policy.maxBatchItems,
    "maxBatchItems",
    false,
    errors,
  );
  const maxInputTokensPerRequest = requiredInteger(
    policy.maxInputTokensPerRequest,
    "maxInputTokensPerRequest",
    false,
    errors,
  );
  const maxInputTokens = requiredInteger(
    policy.maxInputTokens,
    "maxInputTokens",
    false,
    errors,
  );

  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(policy.correlationId.trim())) {
    errors.push("correlationId must be 1–128 safe ASCII characters (A-Z, a-z, 0-9, ., _, :, -)");
  }
  if (policy.batchingMode !== 1 && policy.batchingMode !== 2) {
    errors.push("batchingMode must be selected");
  }
  if (policy.batchingMode === 1 && maxBatchItems && maxBatchItems !== "1") {
    errors.push("maxBatchItems must be 1 for single-item batching");
  }
  if (maxRetriesPerRequest && maxRetryAttempts && compareDecimal(maxRetriesPerRequest, maxRetryAttempts) > 0) {
    errors.push("maxRetriesPerRequest must not exceed maxRetryAttempts");
  }
  if (
    maxInputTokensPerRequest &&
    maxInputTokens &&
    compareDecimal(maxInputTokensPerRequest, maxInputTokens) > 0
  ) {
    errors.push("maxInputTokensPerRequest must not exceed maxInputTokens");
  }
  if (maxRequests && maxRetryAttempts && compareDecimal(addDecimal(maxRequests, maxRetryAttempts), maxInt64) > 0) {
    errors.push("maxRequests + maxRetryAttempts exceeds the int64 limit");
  }

  validateDuration(policy.requestTimeout, "requestTimeout", errors);
  validateDuration(policy.totalTimeout, "totalTimeout", errors);
  if (policy.requestTimeout && policy.totalTimeout && durationCompare(policy.requestTimeout, policy.totalTimeout) > 0) {
    errors.push("requestTimeout must not exceed totalTimeout");
  }
  validateCost(policy.cost, errors);
  return errors;
}

function requiredInteger(
  value: string | null | undefined,
  field: string,
  allowZero: boolean,
  errors: string[],
): string | undefined {
  const normalized = normalizeDecimal(value);
  if (!normalized) {
    errors.push(`${field} is required and must be a decimal integer`);
    return undefined;
  }
  if (!allowZero && normalized === "0") {
    errors.push(`${field} must be greater than zero`);
  }
  if (compareDecimal(normalized, maxInt64) > 0) {
    errors.push(`${field} exceeds the int64 limit`);
  }
  return normalized;
}

function validateDuration(
  duration: SemanticDuration | null | undefined,
  field: string,
  errors: string[],
) {
  if (!duration) {
    errors.push(`${field} is required`);
    return;
  }
  const seconds = normalizeDecimal(duration.seconds);
  if (!seconds) errors.push(`${field}.seconds must be a decimal integer`);
  else if (seconds === "0" && duration.nanos === 0) errors.push(`${field} must be greater than zero`);
  else if (compareDecimal(seconds, maxInt64) > 0) errors.push(`${field}.seconds exceeds the int64 limit`);
  if (!Number.isInteger(duration.nanos) || duration.nanos < 0 || duration.nanos > 999_999_999) {
    errors.push(`${field}.nanos must be between 0 and 999999999`);
  }
}

function validateCost(
  cost: SemanticProviderCostLimit | null | undefined,
  errors: string[],
) {
  if (!cost) {
    errors.push("cost is required");
    return;
  }
  if (!/^[A-Z]{3}$/.test(cost.currency.trim())) errors.push("cost.currency must be an uppercase ISO 4217 code");
  if (!cost.priceDefinitionVersion.trim()) errors.push("cost.priceDefinitionVersion is required");
  requiredInteger(cost.inputMicrosPerMillionTokens, "cost.inputMicrosPerMillionTokens", false, errors);
  requiredInteger(cost.maxEstimatedCostMicros, "cost.maxEstimatedCostMicros", false, errors);
}

function normalizeDecimal(value: string | null | undefined): string | undefined {
  if (typeof value !== "string" || !decimalPattern.test(value.trim())) return undefined;
  return value.trim().replace(/^0+(?=\d)/, "");
}

function compareDecimal(left: string, right: string): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  return left === right ? 0 : left < right ? -1 : 1;
}

function addDecimal(left: string, right: string): string {
  let carry = 0;
  let result = "";
  let leftIndex = left.length - 1;
  let rightIndex = right.length - 1;
  while (leftIndex >= 0 || rightIndex >= 0 || carry > 0) {
    const sum =
      (leftIndex >= 0 ? Number(left[leftIndex--]) : 0) +
      (rightIndex >= 0 ? Number(right[rightIndex--]) : 0) +
      carry;
    result = `${sum % 10}${result}`;
    carry = Math.floor(sum / 10);
  }
  return result;
}

function durationCompare(left: SemanticDuration, right: SemanticDuration): number {
  const leftSeconds = normalizeDecimal(left.seconds) || "0";
  const rightSeconds = normalizeDecimal(right.seconds) || "0";
  const seconds = compareDecimal(leftSeconds, rightSeconds);
  return seconds !== 0 ? seconds : left.nanos - right.nanos;
}
