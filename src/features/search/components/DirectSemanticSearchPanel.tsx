import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  ErrorGroup,
  errorMessage,
  Input,
  ResourceIdText,
  Select,
  Text,
  themeClasses,
} from "../../../components/typography";
import { semanticSearch as defaultSemanticSearch } from "../../../services/adminService";
import type {
  SemanticEligibilityFilter,
  SemanticPropertyOperator,
  SemanticPropertyPredicate,
  SemanticPropertyValue,
  SemanticSearchInput,
  SemanticSearchResponse,
} from "../../../types/semantic";

export type DirectSemanticSearchPanelProps = {
  spaceId: string;
  domainId: string;
  semanticSearchService?: (input: SemanticSearchInput) => Promise<SemanticSearchResponse>;
  visibilityScopeKey?: string;
};

type SemanticValueKind = SemanticPropertyValue["type"];

export type SemanticPropertyDraft = {
  id: number;
  key: string;
  operator: SemanticPropertyOperator;
  valueType: SemanticValueKind;
  value: string;
};

const emptyPropertyDraft = (id: number): SemanticPropertyDraft => ({
  id,
  key: "",
  operator: "equal",
  valueType: "string",
  value: "",
});

export function DirectSemanticSearchPanel({
  spaceId,
  domainId,
  semanticSearchService = defaultSemanticSearch,
  visibilityScopeKey = "",
}: DirectSemanticSearchPanelProps) {
  const nextPropertyId = useRef(2);
  const requestEpoch = useRef(0);
  const [query, setQuery] = useState("");
  const [semanticRuleId, setSemanticRuleId] = useState("");
  const [embeddingBindingKey, setEmbeddingBindingKey] = useState("");
  const [limit, setLimit] = useState("10");
  const [minScore, setMinScore] = useState("");
  const [nodeLabels, setNodeLabels] = useState("");
  const [nodeIds, setNodeIds] = useState("");
  const [properties, setProperties] = useState<SemanticPropertyDraft[]>([
    emptyPropertyDraft(1),
  ]);
  const [activeRequest, setActiveRequest] = useState<SemanticSearchInput | null>(null);
  const [response, setResponse] = useState<SemanticSearchResponse | null>(null);
  const [pageHistory, setPageHistory] = useState<SemanticSearchResponse[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function invalidatePagination() {
    requestEpoch.current += 1;
    setActiveRequest(null);
    setResponse(null);
    setPageHistory([]);
    setPageIndex(0);
    setLoading(false);
    setError("");
  }

  useEffect(() => {
    invalidatePagination();
  }, [spaceId, domainId, visibilityScopeKey]);

  function updateText(setter: (value: string) => void, value: string) {
    invalidatePagination();
    setter(value);
  }

  function updateProperty(id: number, patch: Partial<SemanticPropertyDraft>) {
    invalidatePagination();
    setProperties((current) =>
      current.map((property) =>
        property.id === id ? { ...property, ...patch } : property,
      ),
    );
  }

  function addProperty() {
    invalidatePagination();
    const id = nextPropertyId.current++;
    setProperties((current) => [...current, emptyPropertyDraft(id)]);
  }

  function removeProperty(id: number) {
    invalidatePagination();
    setProperties((current) => current.filter((property) => property.id !== id));
  }

  function requestFromDraft(): SemanticSearchInput {
    const normalizedQuery = query.trim();
    if (!spaceId || !domainId) throw new Error("Select a space and domain first");
    if (!normalizedQuery) throw new Error("Search text is required");
    const normalizedLimit = Number(limit);
    if (!Number.isInteger(normalizedLimit) || normalizedLimit <= 0) {
      throw new Error("Result limit must be a positive whole number");
    }
    const normalizedRuleId = semanticRuleId.trim();
    const normalizedBindingKey = embeddingBindingKey.trim();
    if (normalizedBindingKey && !normalizedRuleId) {
      throw new Error("Embedding binding key requires a semantic rule ID");
    }
    let normalizedMinScore: number | undefined;
    if (minScore.trim()) {
      normalizedMinScore = Number(minScore);
      if (!Number.isFinite(normalizedMinScore)) {
        throw new Error("Minimum score must be a finite number");
      }
    }
    return {
      spaceId,
      domainId,
      semanticRuleId: normalizedRuleId || undefined,
      embeddingBindingKey: normalizedBindingKey || undefined,
      query: normalizedQuery,
      limit: normalizedLimit,
      minScore: normalizedMinScore,
      filter: buildSemanticFilter(nodeLabels, nodeIds, properties),
    };
  }

  async function runSearch(
    request: SemanticSearchInput,
    navigation: "initial" | "next",
    epoch = requestEpoch.current,
  ) {
    setLoading(true);
    setError("");
    try {
      const nextResponse = await semanticSearchService(request);
      if (epoch !== requestEpoch.current) return;
      setResponse(nextResponse);
      if (navigation === "initial") {
        setPageHistory([nextResponse]);
        setPageIndex(0);
      } else {
        setPageHistory((current) => [...current.slice(0, pageIndex + 1), nextResponse]);
        setPageIndex((current) => current + 1);
      }
    } catch (err) {
      if (epoch === requestEpoch.current) {
        setError(errorMessage(err, "Semantic search failed"));
      }
    } finally {
      if (epoch === requestEpoch.current) setLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const request = requestFromDraft();
      requestEpoch.current += 1;
      setActiveRequest(request);
      setResponse(null);
      setPageHistory([]);
      setPageIndex(0);
      await runSearch(request, "initial");
    } catch (err) {
      setError(errorMessage(err, "Semantic search input is invalid"));
    }
  }

  async function nextPage() {
    if (pageIndex < pageHistory.length - 1) {
      const nextIndex = pageIndex + 1;
      setPageIndex(nextIndex);
      setResponse(pageHistory[nextIndex]);
      setError("");
      return;
    }
    if (!activeRequest || !response?.nextPageToken) return;
    await runSearch(
      { ...activeRequest, pageToken: response.nextPageToken },
      "next",
    );
  }

  function previousPage() {
    if (pageIndex === 0) return;
    const previousIndex = pageIndex - 1;
    setPageIndex(previousIndex);
    setResponse(pageHistory[previousIndex]);
    setError("");
  }

  return (
    <div className="space-y-6">
      {error ? (
        <ErrorGroup
          errors={[{ id: "direct-semantic-search", source: "Semantic search", message: error }]}
        />
      ) : null}
      <form
        className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`}
        onSubmit={(event) => void submit(event)}
      >
        <Text as="h2" intent="primary" className="text-lg font-semibold">
          Direct semantic search
        </Text>
        <Text intent="muted" size="sm" className="mt-1">
          Apply authorization-safe hard filters before semantic ranking. All labels and property predicates are required together.
        </Text>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="space-y-2 md:col-span-2">
            <Text as="span" size="sm" intent="subtle">Semantic query</Text>
            <Input
              value={query}
              onChange={(event) => updateText(setQuery, event.target.value)}
              placeholder="How does raft recovery work?"
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Semantic rule ID</Text>
            <Input
              value={semanticRuleId}
              onChange={(event) => updateText(setSemanticRuleId, event.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Embedding binding key</Text>
            <Input
              value={embeddingBindingKey}
              onChange={(event) => updateText(setEmbeddingBindingKey, event.target.value)}
              placeholder="optional; requires rule ID"
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Result limit</Text>
            <Input
              type="number"
              min={1}
              value={limit}
              onChange={(event) => updateText(setLimit, event.target.value)}
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Minimum score</Text>
            <Input
              type="number"
              step="any"
              value={minScore}
              onChange={(event) => updateText(setMinScore, event.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Required labels</Text>
            <Input
              value={nodeLabels}
              onChange={(event) => updateText(setNodeLabels, event.target.value)}
              placeholder="comma separated, e.g. Article,Published"
            />
          </label>
          <label className="space-y-2">
            <Text as="span" size="sm" intent="subtle">Eligible node IDs</Text>
            <Input
              value={nodeIds}
              onChange={(event) => updateText(setNodeIds, event.target.value)}
              placeholder="comma separated, optional"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <Text as="h3" intent="primary" className="font-medium">Property predicates</Text>
              <Text intent="muted" size="xs">Equality is exact and type-sensitive. Explicit null is distinct from a missing key.</Text>
            </div>
            <Button type="button" variant="secondary" onClick={addProperty}>
              Add property filter
            </Button>
          </div>
          {properties.map((property, index) => {
            const needsValue = property.operator === "equal" || property.operator === "notEqual";
            return (
              <div
                key={property.id}
                className={`grid items-end gap-3 rounded-lg border ${themeClasses.border.default} p-3 md:grid-cols-12`}
              >
                <label className="space-y-2 md:col-span-3">
                  <Text as="span" size="sm" intent="subtle">Property key {index + 1}</Text>
                  <Input
                    value={property.key}
                    onChange={(event) => updateProperty(property.id, { key: event.target.value })}
                    placeholder="status"
                  />
                </label>
                <div className="md:col-span-3">
                  <Select
                    label={`Operator ${index + 1}`}
                    value={property.operator}
                    onChange={(value) => updateProperty(property.id, { operator: value as SemanticPropertyOperator })}
                    options={[
                      { value: "equal", label: "Equals" },
                      { value: "notEqual", label: "Does not equal" },
                      { value: "exists", label: "Exists" },
                      { value: "missing", label: "Missing" },
                    ]}
                  />
                </div>
                {needsValue ? (
                  <>
                    <div className="md:col-span-2">
                      <Select
                        label={`Value type ${index + 1}`}
                        value={property.valueType}
                        onChange={(value) => updateProperty(property.id, { valueType: value as SemanticValueKind })}
                        options={[
                          { value: "string", label: "String" },
                          { value: "number", label: "Number" },
                          { value: "boolean", label: "Boolean" },
                          { value: "null", label: "Explicit null" },
                        ]}
                      />
                    </div>
                    <div className="md:col-span-3">
                      {property.valueType === "boolean" ? (
                        <Select
                          label={`Value ${index + 1}`}
                          value={property.value === "false" ? "false" : "true"}
                          onChange={(value) => updateProperty(property.id, { value })}
                          options={[
                            { value: "true", label: "True" },
                            { value: "false", label: "False" },
                          ]}
                        />
                      ) : property.valueType === "null" ? (
                        <div className="space-y-2">
                          <Text as="span" size="sm" intent="subtle">Value {index + 1}</Text>
                          <Text size="sm">Explicit null</Text>
                        </div>
                      ) : (
                        <label className="space-y-2">
                          <Text as="span" size="sm" intent="subtle">Value {index + 1}</Text>
                          <Input
                            type={property.valueType === "number" ? "number" : "text"}
                            step={property.valueType === "number" ? "any" : undefined}
                            value={property.value}
                            onChange={(event) => updateProperty(property.id, { value: event.target.value })}
                          />
                        </label>
                      )}
                    </div>
                  </>
                ) : (
                  <Text intent="muted" size="sm" className="self-end md:col-span-5 md:pb-2">
                    No value is sent for this operator.
                  </Text>
                )}
                <div className="flex items-end md:col-span-1">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => removeProperty(property.id)}
                    aria-label={`Remove property filter ${index + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Button className="mt-5" type="submit" disabled={!spaceId || !domainId || loading}>
          {loading ? "Searching…" : "Search"}
        </Button>
      </form>

      <section className={`rounded-xl border ${themeClasses.border.input} ${themeClasses.surface.panel} p-5`}>
        <Text as="h2" intent="primary" className="text-lg font-semibold">Semantic results</Text>
        {response?.warnings.map((warning, index) => (
          <Alert key={`${index}-${warning}`} variant="warning">{warning}</Alert>
        ))}
        {response ? (
          <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div><dt className={themeClasses.text.parts.quietLight}>Filter execution mode</dt><dd>{response.filterExecutionMode || "Not reported"}</dd></div>
            <div><dt className={themeClasses.text.parts.quietLight}>Candidates examined</dt><dd>{response.examinedSemanticCandidates}</dd></div>
            <div><dt className={themeClasses.text.parts.quietLight}>Candidates eligible</dt><dd>{response.eligibleSemanticCandidates}</dd></div>
          </dl>
        ) : null}
        <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
          {(response?.results || []).map((result) => (
            <div key={`${result.semanticRuleId}-${result.recordId}-${result.nodeId}`} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Text intent="primary" className="font-medium"><ResourceIdText value={result.nodeId} /></Text>
                <Text intent="muted" size="sm">score {result.score.toFixed(4)}</Text>
              </div>
              {result.snippet ? <Text size="sm" className="mt-1">{result.snippet}</Text> : null}
              <Text intent="muted" size="xs" className="mt-1">
                Rule <ResourceIdText value={result.semanticRuleId} /> · binding {result.embeddingBindingKey || "default"}
              </Text>
            </div>
          ))}
        </div>
        {response && response.results.length === 0 ? (
          <Text intent="muted" size="sm" className="mt-3">No semantic matches.</Text>
        ) : null}
        {response ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" onClick={previousPage} disabled={loading || pageIndex === 0}>
              Previous page
            </Button>
            <Text intent="muted" size="sm">Page {pageIndex + 1}</Text>
            {response.nextPageToken || pageIndex < pageHistory.length - 1 ? (
              <Button type="button" variant="secondary" onClick={() => void nextPage()} disabled={loading}>
                Next page
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function buildSemanticFilter(
  labelsText: string,
  nodeIdsText: string,
  drafts: SemanticPropertyDraft[],
): SemanticEligibilityFilter | undefined {
  const nodeLabels = commaSeparatedValues(labelsText);
  const nodeIds = commaSeparatedValues(nodeIdsText);
  const properties: SemanticPropertyPredicate[] = [];
  for (const [index, draft] of drafts.entries()) {
    const untouched =
      !draft.key.trim() &&
      draft.operator === "equal" &&
      draft.valueType === "string" &&
      draft.value === "";
    if (untouched) continue;
    const key = draft.key.trim();
    if (!key) throw new Error(`Property filter ${index + 1} requires a key`);
    if (draft.operator === "exists" || draft.operator === "missing") {
      properties.push({ key, operator: draft.operator });
      continue;
    }
    properties.push({
      key,
      operator: draft.operator,
      value: semanticPropertyValue(draft, index),
    });
  }
  if (!nodeLabels.length && !nodeIds.length && !properties.length) return undefined;
  return { nodeLabels, nodeIds, properties };
}

function semanticPropertyValue(
  draft: SemanticPropertyDraft,
  index: number,
): SemanticPropertyValue {
  switch (draft.valueType) {
    case "null":
      return { type: "null" };
    case "boolean":
      return { type: "boolean", value: draft.value !== "false" };
    case "number": {
      if (!draft.value.trim()) {
        throw new Error(`Property filter ${index + 1} requires a numeric value`);
      }
      const value = Number(draft.value);
      if (!Number.isFinite(value)) {
        throw new Error(`Property filter ${index + 1} requires a finite numeric value`);
      }
      return { type: "number", value };
    }
    case "string":
      return { type: "string", value: draft.value };
  }
}

function commaSeparatedValues(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}
