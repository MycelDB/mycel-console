import { render, screen } from "@testing-library/react";
import {
  CheckBadge,
  CountStatusBadge,
  HelpIcon,
  StatusBadge,
  clusterBadgeClass,
} from "./ClusterStatusBadges";

test("StatusBadge renders formatted labels and exposes raw value as title", () => {
  render(<StatusBadge value="no_leader" />);

  expect(screen.getByText("No Leader")).toBeInTheDocument();
  expect(screen.getByTitle("no_leader")).toHaveClass("bg-red-100");
});

test("CountStatusBadge includes value and status in accessible label", () => {
  render(<CountStatusBadge label="Read failures" status="warning" value={3} />);

  expect(
    screen.getByLabelText("Read failures: 3 (Warning)"),
  ).toBeInTheDocument();
});

test("CheckBadge maps booleans to pass/fail badges", () => {
  const { rerender } = render(<CheckBadge ok />);
  expect(screen.getByText("Pass")).toBeInTheDocument();

  rerender(<CheckBadge ok={false} />);
  expect(screen.getByText("Fail")).toBeInTheDocument();
});

test("HelpIcon renders accessible help text and tooltip content", () => {
  render(<HelpIcon label="Client readiness" description="Safe to serve" />);

  expect(
    screen.getByRole("img", { name: "Client readiness: Safe to serve" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("tooltip")).toHaveTextContent("Safe to serve");
});

test("clusterBadgeClass keeps unknown statuses visible with info tone", () => {
  expect(clusterBadgeClass("custom_status")).toContain("bg-sky-50");
});
