import { render, screen } from "@testing-library/react";
import { QueryResultView } from "./QueryResultView";

test("renders empty query state", () => {
  render(<QueryResultView result={null} view="result" />);
  expect(screen.getByText("No query run yet.")).toBeInTheDocument();
});

test("renders script returned rows instead of statement status in rows view", () => {
  render(
    <QueryResultView
      view="result"
      result={{
        statements: [
          {
            index: 1,
            success: true,
            statement: "MATCH (c:Character) RETURN c.name, c.role FETCH FIRST 20 ROWS ONLY;",
            error: "",
            result: {
              rows: [
                {
                  fields: {
                    "c.name": { scalar: "Iris Vale" },
                    "c.role": { scalar: "cartographer" },
                  },
                },
                {
                  fields: {
                    "c.name": { scalar: "Professor Brass" },
                    "c.role": { scalar: "clockmaker" },
                  },
                },
              ],
            },
          },
        ],
      }}
    />,
  );

  expect(screen.getByText(/Iris Vale/)).toBeInTheDocument();
  expect(screen.getByText(/cartographer/)).toBeInTheDocument();
  expect(screen.getByText(/Professor Brass/)).toBeInTheDocument();
  expect(screen.queryByText("Statement")).not.toBeInTheDocument();
});

test("renders direct Tauri row objects as a table in rows view", () => {
  render(
    <QueryResultView
      view="result"
      result={{
        result: {
          rows: [
            { "c.name": { scalar: "Iris Vale" }, "c.role": { scalar: "cartographer" } },
            { "c.name": { scalar: "Mina Quill" }, "c.role": { scalar: "librarian" } },
          ],
        },
      }}
    />,
  );

  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "c.name" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "c.role" })).toBeInTheDocument();
  expect(screen.getByText("Iris Vale")).toBeInTheDocument();
  expect(screen.getByText("cartographer")).toBeInTheDocument();
  expect(screen.getByText("Mina Quill")).toBeInTheDocument();
  expect(screen.queryByText(/\{\}/)).not.toBeInTheDocument();
});

test("renders graph payloads as graph in result view", () => {
  render(
    <QueryResultView
      view="result"
      result={{
        result: {
          rows: [{ "c.name": { scalar: "Iris Vale" } }],
          graph: {
            nodes: [{ nodeId: "character-iris", labels: ["Character"], properties: { name: "Iris Vale" } }],
            edges: [],
          },
        },
      }}
    />,
  );

  expect(screen.getByText("Graph visualization")).toBeInTheDocument();
  expect(screen.getByText("1 nodes · 0 edges")).toBeInTheDocument();
  expect(screen.queryByRole("columnheader", { name: "c.name" })).not.toBeInTheDocument();
});

test("renders statement results and per-statement errors", () => {
  render(
    <QueryResultView
      view="result"
      result={{
        statements: [
          { index: 1, success: true, statement: "MATCH n", error: "" },
          { index: 2, success: false, statement: "BAD", error: "syntax error" },
        ],
      }}
    />,
  );

  expect(screen.getByText("Statement")).toBeInTheDocument();
  expect(screen.getByText("MATCH n")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("syntax error");
});

test("renders row table and raw JSON separately", () => {
  const result = { result: { rows: [{ role: { scalar: "reader" }, total: { scalar: 2 } }] }, marker: "Ada" };
  const { rerender } = render(<QueryResultView result={result} view="result" />);

  expect(screen.getByRole("table")).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "role" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "total" })).toBeInTheDocument();
  expect(screen.getByText("reader")).toBeInTheDocument();
  expect(screen.getByText("2")).toBeInTheDocument();
  expect(screen.queryByText(/marker/)).not.toBeInTheDocument();

  rerender(<QueryResultView result={result} view="raw" />);
  expect(screen.getByText(/Ada/)).toBeInTheDocument();
});

test("renders empty row payloads and raw JSON", () => {
  const result = { result: { rows: [] }, marker: "Ada" };
  const { rerender } = render(<QueryResultView result={result} view="result" />);

  expect(screen.getByText("No rows returned.")).toBeInTheDocument();

  rerender(<QueryResultView result={result} view="raw" />);
  expect(screen.getByText(/Ada/)).toBeInTheDocument();
});
