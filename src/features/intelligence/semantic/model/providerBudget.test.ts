import {
  emptyProviderBudget,
  validateSemanticProviderBudget,
} from "./providerBudget";

test("omitted provider budget is valid and remains disabled", () => {
  expect(validateSemanticProviderBudget(null)).toEqual([]);
  expect(validateSemanticProviderBudget(undefined)).toEqual([]);
});

function validBudget() {
  return {
    ...emptyProviderBudget(),
    correlationId: "semantic-budget-1",
    maxRequests: "128",
    maxRetryAttempts: "4",
    maxRetriesPerRequest: "1",
    maxConcurrentProviderCalls: "2",
    batchingMode: 1,
    maxBatchItems: "1",
    maxInputTokensPerRequest: "2048",
    maxInputTokens: "20000",
    requestTimeout: { seconds: "30", nanos: 0 },
    totalTimeout: { seconds: "300", nanos: 0 },
    cost: {
      currency: "USD",
      priceDefinitionVersion: "2026-10-01",
      inputMicrosPerMillionTokens: "20",
      maxEstimatedCostMicros: "1000000",
    },
  };
}

test("accepts a complete valid policy", () => {
  expect(validateSemanticProviderBudget(validBudget())).toEqual([]);
});

test("reports every missing required field", () => {
  const errors = validateSemanticProviderBudget(emptyProviderBudget());
  for (const field of [
    "correlationId",
    "maxRequests",
    "maxRetryAttempts",
    "maxRetriesPerRequest",
    "maxConcurrentProviderCalls",
    "batchingMode",
    "maxBatchItems",
    "maxInputTokensPerRequest",
    "maxInputTokens",
    "requestTimeout.seconds",
    "totalTimeout.seconds",
    "cost",
  ]) {
    expect(errors.join("\n")).toContain(field);
  }
});

test("enforces cross-field limits and rejects overflow", () => {
  const errors = validateSemanticProviderBudget({
    ...validBudget(),
    maxRequests: "9223372036854775807",
    maxRetryAttempts: "1",
    maxRetriesPerRequest: "5",
    maxInputTokensPerRequest: "20001",
    maxInputTokens: "20000",
    batchingMode: 1,
    maxBatchItems: "2",
    requestTimeout: { seconds: "301", nanos: 0 },
    totalTimeout: { seconds: "300", nanos: 0 },
  });
  expect(errors).toEqual(
    expect.arrayContaining([
      "maxRetriesPerRequest must not exceed maxRetryAttempts",
      "maxInputTokensPerRequest must not exceed maxInputTokens",
      "maxRequests + maxRetryAttempts exceeds the int64 limit",
      "maxBatchItems must be 1 for single-item batching",
      "requestTimeout must not exceed totalTimeout",
    ]),
  );
});

test("rejects unsafe correlation IDs, invalid currency, zero hard limits, and bad nanos", () => {
  const errors = validateSemanticProviderBudget({
    ...validBudget(),
    correlationId: "provider/openai key",
    maxRequests: "0",
    maxConcurrentProviderCalls: "0",
    cost: { ...validBudget().cost!, currency: "usd" },
    requestTimeout: { seconds: "1", nanos: 1_000_000_000 },
  });
  expect(errors).toEqual(
    expect.arrayContaining([
      expect.stringContaining("correlationId"),
      "maxRequests must be greater than zero",
      "maxConcurrentProviderCalls must be greater than zero",
      "cost.currency must be an uppercase ISO 4217 code",
      "requestTimeout.nanos must be between 0 and 999999999",
    ]),
  );
});
