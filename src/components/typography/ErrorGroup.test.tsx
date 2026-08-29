import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorGroup, type PanelError } from "./ErrorGroup";

const baseErrors: PanelError[] = [
  { id: "cluster.runtime", source: "Cluster runtime", message: "offline" },
  { id: "cluster.health", source: "Cluster health", message: "timeout" },
];

test("renders nothing for an empty list", () => {
  const { container } = render(<ErrorGroup errors={[]} />);

  expect(container).toBeEmptyDOMElement();
});

test("renders one error as a bare alert without list markup or count", () => {
  render(<ErrorGroup errors={[baseErrors[0]]} />);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("Cluster runtime: offline");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(alert).not.toHaveTextContent("1 requests failed");
});

test("renders two errors as one alert with source labels and messages", () => {
  render(<ErrorGroup errors={baseErrors} />);

  const alerts = screen.getAllByRole("alert");
  expect(alerts).toHaveLength(1);
  expect(alerts[0]).toHaveTextContent("2 requests failed");
  expect(alerts[0]).toHaveTextContent("Cluster runtime: offline");
  expect(alerts[0]).toHaveTextContent("Cluster health: timeout");
});

test("uses the strongest severity present", () => {
  render(
    <ErrorGroup
      errors={[
        {
          id: "warning",
          source: "Warning",
          message: "degraded",
          severity: "warning",
        },
        { id: "error", source: "Error", message: "failed", severity: "error" },
      ]}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("❌");
});

test("caps visible errors and reports the remaining count", () => {
  render(
    <ErrorGroup
      max={3}
      errors={Array.from({ length: 5 }, (_, index) => ({
        id: `error-${index}`,
        source: `Source ${index}`,
        message: `Message ${index}`,
      }))}
    />,
  );

  expect(screen.getByText("Source 0").closest("li")).toHaveTextContent(
    "Message 0",
  );
  expect(screen.getByText("Source 2").closest("li")).toHaveTextContent(
    "Message 2",
  );
  expect(screen.queryByText("Source 3")).not.toBeInTheDocument();
  expect(screen.getByText("+2 more")).toBeInTheDocument();
});

test("dedupes by id and keeps the first occurrence", () => {
  render(
    <ErrorGroup
      errors={[
        { id: "same", source: "First", message: "kept" },
        { id: "same", source: "Second", message: "dropped" },
      ]}
    />,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("First: kept");
  expect(screen.getByRole("alert")).not.toHaveTextContent("Second");
});

test("fires per-error and retry-all callbacks", async () => {
  const retryOne = jest.fn();
  const retryAll = jest.fn();
  render(
    <ErrorGroup
      errors={[{ ...baseErrors[0], onRetry: retryOne }, baseErrors[1]]}
      onRetryAll={retryAll}
    />,
  );

  await userEvent.click(screen.getByRole("button", { name: "Retry" }));
  await userEvent.click(screen.getByRole("button", { name: "Retry all" }));

  expect(retryOne).toHaveBeenCalledTimes(1);
  expect(retryAll).toHaveBeenCalledTimes(1);
});

test("omits retry buttons when callbacks are absent", () => {
  render(<ErrorGroup errors={baseErrors} />);

  expect(
    screen.queryByRole("button", { name: /retry/i }),
  ).not.toBeInTheDocument();
});

test("renders exactly one alert regardless of error count", () => {
  render(<ErrorGroup errors={baseErrors} />);

  expect(screen.getAllByRole("alert")).toHaveLength(1);
});
