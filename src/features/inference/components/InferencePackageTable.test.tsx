import { render, screen } from "@testing-library/react";
import { InferencePackageTable } from "./InferencePackageTable";
import type { InferencePackageInfo } from "../../../types/inference";

const packages: InferencePackageInfo[] = [
  {
    inferencePackageId: "pkg-1",
    name: "standard-openai-chat",
    version: "2026-06",
    source: "examples/inference/standard-openai-chat.json",
    checksum: "abc123",
    definitionCounts: {
      model_endpoints: 1,
      models: 2,
      vector_stores: 1,
      model_endpoint_capabilities: 2,
    },
    installedAt: "2026-07-06T20:00:00Z",
    installedBy: "admin",
  },
];

test("renders inference package accounting rows", () => {
  render(<InferencePackageTable packages={packages} />);

  expect(screen.getByText("standard-openai-chat")).toBeInTheDocument();
  expect(screen.getByText("2026-06")).toBeInTheDocument();
  expect(
    screen.getByText("examples/inference/standard-openai-chat.json"),
  ).toBeInTheDocument();
  expect(screen.getByText(/Model Endpoints: 1/)).toBeInTheDocument();
  expect(screen.getByText(/Models: 2/)).toBeInTheDocument();
  expect(screen.getByText(/Vector Stores: 1/)).toBeInTheDocument();
  expect(
    screen.getByText(/Model Endpoint Capabilities: 2/),
  ).toBeInTheDocument();
  expect(screen.getByText("2026-07-06 20:00:00 UTC")).toBeInTheDocument();
  expect(screen.getByText("admin")).toBeInTheDocument();
  expect(screen.getByText("abc123")).toBeInTheDocument();
});

test("renders empty package accounting state", () => {
  render(<InferencePackageTable packages={[]} />);

  expect(
    screen.getByText(/no inference packages imported yet/i),
  ).toBeInTheDocument();
  expect(screen.getByText(/import a package json file/i)).toBeInTheDocument();
});

test("does not render package uninstall or delete actions", () => {
  render(<InferencePackageTable packages={packages} />);

  expect(
    screen.queryByRole("button", { name: /delete/i }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /uninstall/i }),
  ).not.toBeInTheDocument();
});
