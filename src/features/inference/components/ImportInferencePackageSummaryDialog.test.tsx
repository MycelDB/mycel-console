import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportInferencePackageSummaryDialog } from "./ImportInferencePackageSummaryDialog";
import type { ApplyInferencePackageResponse } from "../../../types/inference";

const result: ApplyInferencePackageResponse = {
  package: {
    inferencePackageId: "pkg-1",
    name: "standard-openai-chat",
    version: "2026-06",
    source: "standard-openai-chat.json",
    checksum: "abc",
    definitionCounts: {},
    installedAt: "2026-07-06T20:00:00Z",
    installedBy: "admin",
  },
  modelEndpointCount: 1,
  modelCount: 2,
  vectorStoreCount: 1,
  capabilityCount: 2,
};

test("does not render without an import result", () => {
  render(<ImportInferencePackageSummaryDialog result={null} onClose={jest.fn()} />);

  expect(screen.queryByText(/inference package imported/i)).not.toBeInTheDocument();
});

test("renders one-time import summary", () => {
  render(<ImportInferencePackageSummaryDialog result={result} onClose={jest.fn()} />);

  expect(screen.getByText(/inference package imported/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "standard-openai-chat@2026-06" })).toBeInTheDocument();
  expect(screen.getByText("Model endpoints")).toBeInTheDocument();
  expect(screen.getByText("Models")).toBeInTheDocument();
  expect(screen.getByText("Vector stores")).toBeInTheDocument();
  expect(screen.getByText("Capabilities")).toBeInTheDocument();
  expect(screen.getAllByText("1")).toHaveLength(2);
  expect(screen.getAllByText("2")).toHaveLength(2);
});

test("renders catalog view actions", async () => {
  const onViewCatalog = jest.fn();
  render(<ImportInferencePackageSummaryDialog result={result} onClose={jest.fn()} onViewCatalog={onViewCatalog} />);

  await userEvent.click(screen.getByRole("button", { name: /view endpoints/i }));
  await userEvent.click(screen.getByRole("button", { name: /view models/i }));
  await userEvent.click(screen.getByRole("button", { name: /view vector stores/i }));
  expect(screen.queryByRole("button", { name: /view capabilities/i })).not.toBeInTheDocument();

  expect(onViewCatalog).toHaveBeenNthCalledWith(1, "endpoints");
  expect(onViewCatalog).toHaveBeenNthCalledWith(2, "models");
  expect(onViewCatalog).toHaveBeenNthCalledWith(3, "vectorStores");
});

test("invokes close callback", async () => {
  const onClose = jest.fn();
  render(<ImportInferencePackageSummaryDialog result={result} onClose={onClose} />);

  await userEvent.click(screen.getByRole("button", { name: /done/i }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
