import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { AutomationInvocationSummaryInfo } from "../../../types/automations";
import type { SemanticMaintenanceWorkItemInfo } from "../../../types/semanticMaintenance";
import {
  ConfirmMaintenanceActionDialog,
  ContextualIntelligenceLink,
  DetailCard,
  DetailList,
  DetailRow,
  Metric,
  RecentInvocations,
  formatTargetLabel,
  formatTimestamp,
  shortInlineId,
} from "./SpaceDetailPrimitives";

test("ContextualIntelligenceLink renders copy and target route", () => {
  render(
    <MemoryRouter>
      <ContextualIntelligenceLink
        title="Semantic rules"
        description="Manage rules for this space."
        to="/intelligence/semantic"
      />
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "Semantic rules" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Open Intelligence view" }),
  ).toHaveAttribute("href", "/intelligence/semantic");
});

test("ConfirmMaintenanceActionDialog renders retry/cancel variants and callbacks", async () => {
  const user = userEvent.setup();
  const onCancel = jest.fn();
  const onConfirm = jest.fn();
  const item = {
    workItemId: "work_1",
    action: "backfill",
    status: "failed_retryable",
    semanticRuleId: "rule_1",
    embeddingBindingKey: "body",
  } as SemanticMaintenanceWorkItemInfo;

  const { rerender } = render(
    <ConfirmMaintenanceActionDialog
      kind="retry"
      item={item}
      loading={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );

  expect(
    screen.getByRole("heading", { name: "Retry maintenance work item" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Retry item" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);

  rerender(
    <ConfirmMaintenanceActionDialog
      kind="cancel"
      item={item}
      loading={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Keep item unchanged" }));
  expect(onCancel).toHaveBeenCalledTimes(1);
});

test("Detail primitives and metric render labels and values", () => {
  render(
    <DetailCard title="Identity">
      <DetailRow label="Space" value="Knowledge" />
      <DetailList label="Owners" values={[]} />
      <Metric label="Pending" value={3} tone="warning" />
    </DetailCard>,
  );

  expect(screen.getByRole("heading", { name: "Identity" })).toBeInTheDocument();
  expect(screen.getByText("Knowledge")).toBeInTheDocument();
  expect(screen.getByText("Not reported")).toBeInTheDocument();
  expect(screen.getByText("3")).toBeInTheDocument();
});

test("format helpers preserve compact display behavior", () => {
  expect(shortInlineId()).toBe("—");
  expect(shortInlineId("short-id")).toBe("short-id");
  expect(shortInlineId("abcdefghijklmnopqrstuvwxyz0123456789")).toBe(
    "abcdefghij…23456789",
  );
  expect(
    formatTargetLabel("abcdefghijklmnopqrstuvwxyz0123456789", "domain_1"),
  ).toBe("abcdefghij…23456789 / domain_1");
  expect(formatTimestamp()).toBe("Not reported");
  expect(formatTimestamp("not-a-number")).toBe("not-a-number");
  expect(formatTimestamp("1700000000")).toContain("2023");
});

test("RecentInvocations renders empty and action states", async () => {
  const user = userEvent.setup();
  const onShowRun = jest.fn();
  const { rerender } = render(
    <RecentInvocations domainId="domain_1" items={[]} onShowRun={onShowRun} />,
  );
  expect(screen.getByText("No recent invocations.")).toBeInTheDocument();

  rerender(
    <RecentInvocations
      domainId="domain_1"
      items={[
        {
          id: "run_1",
          status: "completed",
          changedElementId: "node_1",
          skipReason: "",
        } as AutomationInvocationSummaryInfo,
      ]}
      onShowRun={onShowRun}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Run detail" }));
  expect(onShowRun).toHaveBeenCalledWith("domain_1", "run_1");
});
