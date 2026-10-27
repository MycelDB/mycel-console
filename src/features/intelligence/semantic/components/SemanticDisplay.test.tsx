import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { shortResourceId } from "../../../../components/typography";
import type { InferenceProfileInfo } from "../../../../types/inference";
import type { SemanticMaintenanceWorkItemInfo } from "../../../../types/semanticMaintenance";
import type { SemanticRow } from "../model/pageTypes";
import {
  DetailDrawer,
  MaintenanceWorkTable,
  SearchWarnings,
  SemanticRuleScope,
  StatusPill,
  SummaryCard,
  compareProfiles,
  formatActionLabel,
  formatTimestamp,
  groupValue,
  profileToOption,
  searchResultTitle,
  semanticScopeDisambiguation,
  semanticTab,
} from "./SemanticDisplay";

function semanticRow({
  spaceId,
  spaceName,
  domainId,
  domainName,
  ruleId,
}: {
  spaceId: string;
  spaceName: string;
  domainId: string;
  domainName?: string;
  ruleId: string;
}): SemanticRow {
  return {
    space: { spaceId, name: spaceName },
    domain: domainName
      ? {
          spaceId,
          domainId,
          key: domainName.toLowerCase(),
          name: domainName,
          description: "",
          state: "DOMAIN_STATE_ACTIVE",
          isDefault: false,
          system: false,
        }
      : undefined,
    rule: {
      semanticRuleId: ruleId,
      key: ruleId,
      displayName: ruleId,
      description: "",
      spaceId,
      domainId,
      enabled: true,
      state: "SEMANTIC_RULE_STATE_ACTIVE",
      bindings: [],
    },
  };
}

test("renders summary, status, warnings, and detail drawer", async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();

  render(
    <>
      <SummaryCard label="Rules" value={1234} />
      <StatusPill value="SEARCH_INDEX_STATE_READY" />
      <SearchWarnings warnings={["low score", "missing binding"]} />
      <DetailDrawer
        title="Rule detail"
        data={{ semanticRuleId: "rule_1" }}
        onClose={onClose}
      />
    </>,
  );

  expect(screen.getByText("1,234")).toBeInTheDocument();
  expect(screen.getByText("Ready")).toBeInTheDocument();
  expect(screen.getByText("Search warnings")).toBeInTheDocument();
  expect(screen.getByText(/rule_1/)).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("SemanticRuleScope renders name-first labels with UUID-backed navigation and identity context", () => {
  const row = semanticRow({
    spaceId: "space-12345678-aaaa",
    spaceName: "Research",
    domainId: "domain-12345678-aaaa",
    domainName: "Main",
    ruleId: "rule-1",
  });

  render(
    <MemoryRouter>
      <SemanticRuleScope
        row={row}
        disambiguation={semanticScopeDisambiguation([row])}
      />
    </MemoryRouter>,
  );

  const spaceLink = screen.getByRole("link", {
    name: "Space Research; ID space-12345678-aaaa",
  });
  expect(spaceLink).toHaveAttribute("href", "/spaces/space-12345678-aaaa");
  expect(spaceLink).toHaveAttribute("title", "Space ID: space-12345678-aaaa");
  expect(
    screen.getByLabelText("Domain Main; ID domain-12345678-aaaa"),
  ).toHaveAttribute("title", "Domain ID: domain-12345678-aaaa");
  expect(screen.queryByText("space-12345678-aaaa")).not.toBeInTheDocument();
  expect(screen.queryByText("domain-12345678-aaaa")).not.toBeInTheDocument();
});

test("SemanticRuleScope falls back to compact authoritative IDs when labels are missing", () => {
  const row = semanticRow({
    spaceId: "space-1234567890-abcdefgh",
    spaceName: "",
    domainId: "domain-1234567890-abcdefgh",
    ruleId: "rule-1",
  });

  render(
    <MemoryRouter>
      <SemanticRuleScope
        row={row}
        disambiguation={semanticScopeDisambiguation([row])}
      />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link")).toHaveTextContent(
    shortResourceId(row.space.spaceId),
  );
  expect(
    screen.getByLabelText(
      `Domain ${shortResourceId(row.rule.domainId)}; ID ${row.rule.domainId}`,
    ),
  ).toBeInTheDocument();
});

test("semantic scope disambiguation adds only the shortest unique collision suffixes", () => {
  const first = semanticRow({
    spaceId: "12345678-alpha-space",
    spaceName: "Research",
    domainId: "domain-12345678-alpha",
    domainName: "Main",
    ruleId: "rule-1",
  });
  const sameSpace = semanticRow({
    spaceId: first.space.spaceId,
    spaceName: "Research",
    domainId: "domain-12345678-beta",
    domainName: "main",
    ruleId: "rule-2",
  });
  const duplicateSpaceName = semanticRow({
    spaceId: "12345678-beta-space",
    spaceName: "research",
    domainId: "domain-elsewhere",
    domainName: "Main",
    ruleId: "rule-3",
  });

  const disambiguation = semanticScopeDisambiguation([
    first,
    sameSpace,
    duplicateSpaceName,
  ]);

  expect(disambiguation.spaces[first.space.spaceId]).toBeDefined();
  expect(disambiguation.spaces[duplicateSpaceName.space.spaceId]).toBeDefined();
  expect(disambiguation.spaces[first.space.spaceId]).not.toBe(
    disambiguation.spaces[duplicateSpaceName.space.spaceId],
  );
  expect(disambiguation.domains[first.rule.domainId]).toBeDefined();
  expect(disambiguation.domains[sameSpace.rule.domainId]).toBeDefined();
  expect(disambiguation.domains[duplicateSpaceName.rule.domainId]).toBeUndefined();
});

test("MaintenanceWorkTable renders empty, read-only, and mutable action states", async () => {
  const user = userEvent.setup();
  const onRetry = jest.fn();
  const onCancel = jest.fn();
  const item = {
    workItemId: "work_1",
    action: "embed",
    semanticRuleId: "rule_1",
    embeddingBindingKey: "body",
    targetNodeId: "node_1",
    status: "failed_retryable",
    attemptCount: 2,
    createdAt: "1700000000",
    updatedAt: "1700000010",
  } as SemanticMaintenanceWorkItemInfo;

  const { rerender } = render(
    <MaintenanceWorkTable
      items={[]}
      canManage
      loading={false}
      onRetry={onRetry}
      onCancel={onCancel}
    />,
  );
  expect(
    screen.getByText("No recent embedding generation work items found."),
  ).toBeInTheDocument();

  rerender(
    <MaintenanceWorkTable
      items={[item]}
      canManage={false}
      loading={false}
      onRetry={onRetry}
      onCancel={onCancel}
    />,
  );
  expect(screen.getByText("Read-only")).toBeInTheDocument();

  rerender(
    <MaintenanceWorkTable
      items={[item]}
      canManage
      loading={false}
      onRetry={onRetry}
      onCancel={onCancel}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Retry" }));
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(onRetry).toHaveBeenCalledWith(item);
  expect(onCancel).toHaveBeenCalledWith(item);
});

test("semantic display helpers preserve labels and fallbacks", () => {
  expect(semanticTab("activity")).toBe("activity");
  expect(semanticTab("unknown")).toBe("rules");
  expect(groupValue({ a: "", b: "value" }, "a", "b")).toBe("value");
  expect(formatActionLabel()).toBe("Embed");
  expect(formatTimestamp()).toBe("—");
  expect(formatTimestamp("not-a-number")).toBe("not-a-number");
  expect(searchResultTitle({ properties: { title: "Title" } })).toBe("Title");
  expect(searchResultTitle({ nodeId: "node_1" })).toBe("node_1");

  const a = {
    spaceId: "space_b",
    displayName: "B",
    key: "b",
  } as InferenceProfileInfo;
  const b = {
    spaceId: "space_a",
    displayName: "A",
    key: "a",
  } as InferenceProfileInfo;
  expect([a, b].sort(compareProfiles)[0]).toBe(b);
  expect(profileToOption(a)).toMatchObject({ value: "b", label: "B (b)" });
});
