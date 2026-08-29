import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { InferenceProfileInfo } from "../../../../types/inference";
import type { SemanticMaintenanceWorkItemInfo } from "../../../../types/semanticMaintenance";
import {
  DetailDrawer,
  MaintenanceWorkTable,
  SearchWarnings,
  StatusPill,
  SummaryCard,
  compareProfiles,
  formatActionLabel,
  formatTimestamp,
  groupValue,
  profileToOption,
  searchResultTitle,
  semanticTab,
} from "./SemanticDisplay";

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
