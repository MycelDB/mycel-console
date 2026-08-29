import { act, renderHook } from "@testing-library/react";
import { useErrorGroup } from "./ErrorGroup";

test("capture ignores fulfilled results", () => {
  const { result } = renderHook(() => useErrorGroup());

  act(() => {
    result.current.capture(
      { status: "fulfilled", value: "ok" },
      { id: "ok", source: "OK", fallback: "Failed" },
    );
  });

  expect(result.current.errors).toEqual([]);
});

test("capture extracts Error.message", () => {
  const { result } = renderHook(() => useErrorGroup());

  act(() => {
    result.current.capture(
      { status: "rejected", reason: new Error("transport unavailable") },
      {
        id: "cluster.health",
        source: "Cluster health",
        fallback: "Unavailable",
      },
    );
  });

  expect(result.current.errors).toEqual([
    expect.objectContaining({
      id: "cluster.health",
      source: "Cluster health",
      message: "transport unavailable",
    }),
  ]);
});

test("capture extracts a raw thrown string", () => {
  const { result } = renderHook(() => useErrorGroup());

  act(() => {
    result.current.capture(
      { status: "rejected", reason: "raw failure" },
      {
        id: "cluster.status",
        source: "Cluster status",
        fallback: "Unavailable",
      },
    );
  });

  expect(result.current.errors[0].message).toBe("raw failure");
});

test("capture falls back when rejection has no message", () => {
  const { result } = renderHook(() => useErrorGroup());

  act(() => {
    result.current.capture(
      { status: "rejected", reason: { code: "UNKNOWN" } },
      {
        id: "cluster.runtime",
        source: "Cluster runtime",
        fallback: "Runtime unavailable",
      },
    );
  });

  expect(result.current.errors[0].message).toBe("Runtime unavailable");
});

test("clear empties the list", () => {
  const { result } = renderHook(() => useErrorGroup());

  act(() => {
    result.current.capture(
      { status: "rejected", reason: new Error("failed") },
      { id: "failure", source: "Failure", fallback: "Unavailable" },
    );
  });
  expect(result.current.errors).toHaveLength(1);

  act(() => {
    result.current.clear();
  });

  expect(result.current.errors).toEqual([]);
});
