import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  buildSemanticFilter,
  DirectSemanticSearchPanel,
  type SemanticPropertyDraft,
} from "./DirectSemanticSearchPanel";
import type {
  SemanticSearchInput,
  SemanticSearchResponse,
} from "../../../types/semantic";

const firstPage: SemanticSearchResponse = {
  results: [
    {
      semanticRuleId: "rule-1",
      embeddingBindingKey: "primary",
      recordId: "record-1",
      nodeId: "node-1",
      score: 0.91,
      matchedChunkIds: ["chunk-1"],
      snippet: "Raft recovery",
    },
  ],
  warnings: [],
  nextPageToken: "opaque-next",
  filterExecutionMode: "semantic_index_pushdown",
  examinedSemanticCandidates: 12,
  eligibleSemanticCandidates: 4,
};

const lastPage: SemanticSearchResponse = {
  results: [],
  warnings: [],
  nextPageToken: "",
  filterExecutionMode: "semantic_index_pushdown",
  examinedSemanticCandidates: 12,
  eligibleSemanticCandidates: 4,
};

function renderPanel(
  semanticSearchService = jest
    .fn<Promise<SemanticSearchResponse>, [SemanticSearchInput]>()
    .mockResolvedValue(firstPage),
) {
  render(
    <DirectSemanticSearchPanel
      spaceId="space-1"
      domainId="domain-1"
      semanticSearchService={semanticSearchService}
    />,
  );
  return semanticSearchService;
}

test("builds typed explicit-null and missing predicates", () => {
  const drafts: SemanticPropertyDraft[] = [
    { id: 1, key: "archived_at", operator: "equal", valueType: "null", value: "" },
    { id: 2, key: "deleted_at", operator: "missing", valueType: "string", value: "" },
    { id: 3, key: "published", operator: "notEqual", valueType: "boolean", value: "false" },
    { id: 4, key: "summary", operator: "exists", valueType: "string", value: "ignored" },
  ];

  expect(buildSemanticFilter(" Article, Published ", " node-1 ", drafts)).toEqual({
    nodeLabels: ["Article", "Published"],
    nodeIds: ["node-1"],
    properties: [
      { key: "archived_at", operator: "equal", value: { type: "null" } },
      { key: "deleted_at", operator: "missing" },
      { key: "published", operator: "notEqual", value: { type: "boolean", value: false } },
      { key: "summary", operator: "exists" },
    ],
  });
});

test("forwards typed filters and reuses the exact request for opaque continuation", async () => {
  const search = jest
    .fn<Promise<SemanticSearchResponse>, [SemanticSearchInput]>()
    .mockResolvedValueOnce(firstPage)
    .mockResolvedValueOnce(lastPage);
  renderPanel(search);

  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.type(screen.getByLabelText("Semantic rule ID"), "rule-1");
  await userEvent.type(screen.getByLabelText("Embedding binding key"), "primary");
  await userEvent.type(screen.getByLabelText("Required labels"), "Article, Published");
  await userEvent.type(screen.getByLabelText("Eligible node IDs"), "node-1");
  await userEvent.type(screen.getByLabelText("Property key 1"), "archived_at");
  await userEvent.selectOptions(screen.getByLabelText("Value type 1"), "null");
  await userEvent.click(screen.getByRole("button", { name: "Add property filter" }));
  await userEvent.type(screen.getByLabelText("Property key 2"), "deleted_at");
  await userEvent.selectOptions(screen.getByLabelText("Operator 2"), "missing");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  const firstRequest = search.mock.calls[0][0];
  expect(firstRequest).toEqual({
    spaceId: "space-1",
    domainId: "domain-1",
    semanticRuleId: "rule-1",
    embeddingBindingKey: "primary",
    query: "raft recovery",
    limit: 10,
    minScore: undefined,
    filter: {
      nodeLabels: ["Article", "Published"],
      nodeIds: ["node-1"],
      properties: [
        { key: "archived_at", operator: "equal", value: { type: "null" } },
        { key: "deleted_at", operator: "missing" },
      ],
    },
  });
  expect(screen.getByText("semantic_index_pushdown")).toBeInTheDocument();
  expect(screen.getByText("12")).toBeInTheDocument();
  expect(screen.getByText("4")).toBeInTheDocument();

  await userEvent.click(screen.getByRole("button", { name: "Next page" }));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
  expect(search.mock.calls[1][0]).toEqual({
    ...firstRequest,
    pageToken: "opaque-next",
  });

  await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
  expect(screen.getByText("Page 1")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getByText("Page 2")).toBeInTheDocument();
  expect(search).toHaveBeenCalledTimes(2);
});

test("keeps results usable when provenance is absent", async () => {
  renderPanel();
  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByText("Raft recovery")).toBeInTheDocument();
  expect(screen.getByText("node-1")).toBeInTheDocument();
  expect(screen.queryByText("Provenance details")).not.toBeInTheDocument();
});

test("normalizes a populated value when switching its type to boolean", async () => {
  const search = renderPanel();
  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.type(screen.getByLabelText("Property key 1"), "published");
  await userEvent.type(screen.getByLabelText("Value 1"), "yes");
  await userEvent.selectOptions(screen.getByLabelText("Value type 1"), "boolean");

  expect(screen.getByLabelText("Value 1")).toHaveValue("true");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  expect(search.mock.calls[0][0].filter?.properties).toEqual([
    { key: "published", operator: "equal", value: { type: "boolean", value: true } },
  ]);
});

test("resets continuation when a result-affecting input changes", async () => {
  renderPanel();
  const query = screen.getByLabelText("Semantic query");
  await userEvent.type(query, "raft recovery");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByRole("button", { name: "Next page" })).toBeInTheDocument();

  await userEvent.type(query, " now");

  expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  expect(screen.queryByText("semantic_index_pushdown")).not.toBeInTheDocument();
});

test("discards cached pages when the visibility scope changes", async () => {
  const search = jest
    .fn<Promise<SemanticSearchResponse>, [SemanticSearchInput]>()
    .mockResolvedValue(firstPage);
  const view = render(
    <DirectSemanticSearchPanel
      key="visibility-1"
      spaceId="space-1"
      domainId="domain-1"
      visibilityScopeKey="visibility-1"
      semanticSearchService={search}
    />,
  );
  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByRole("button", { name: "Next page" })).toBeInTheDocument();

  view.rerender(
    <DirectSemanticSearchPanel
      key="visibility-2"
      spaceId="space-1"
      domainId="domain-1"
      visibilityScopeKey="visibility-2"
      semanticSearchService={search}
    />,
  );

  expect(screen.getByLabelText("Semantic query")).toHaveValue("");
  expect(screen.queryByRole("button", { name: "Next page" })).not.toBeInTheDocument();
  expect(screen.queryByText("Raft recovery")).not.toBeInTheDocument();
});

test("surfaces a stale continuation error without restarting", async () => {
  const search = jest
    .fn<Promise<SemanticSearchResponse>, [SemanticSearchInput]>()
    .mockResolvedValueOnce(firstPage)
    .mockRejectedValueOnce(new Error("stale semantic continuation token"));
  renderPanel(search);
  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));
  await userEvent.click(await screen.findByRole("button", { name: "Next page" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("stale semantic continuation token");
  expect(search).toHaveBeenCalledTimes(2);
});

test("rejects an invalid numeric predicate before invoking the service", async () => {
  const search = renderPanel();
  await userEvent.type(screen.getByLabelText("Semantic query"), "raft recovery");
  await userEvent.type(screen.getByLabelText("Property key 1"), "priority");
  await userEvent.selectOptions(screen.getByLabelText("Value type 1"), "number");
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Property filter 1 requires a numeric value");
  expect(search).not.toHaveBeenCalled();
});
