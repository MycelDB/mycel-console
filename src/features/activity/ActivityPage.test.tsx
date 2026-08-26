import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActivityPage } from "./ActivityPage";
import type { ListActivityEventsInput, ListActivityEventsResponseInfo } from "../../types/activity";

const response: ListActivityEventsResponseInfo = {
  nextPageToken: "",
  events: [
    {
      eventId: "evt_1",
      occurredAt: "1780000000",
      ingestedAt: "1780000001",
      severity: "warning",
      category: "cluster",
      eventType: "raft.readiness.degraded",
      message: "Raft readiness degraded",
      source: "daemon",
      actor: "",
      resource: "raft-group-1",
      correlationId: "",
    },
  ],
};

test("renders activity events and applies category, severity, and date filters", async () => {
  const service = jest.fn<Promise<ListActivityEventsResponseInfo>, [ListActivityEventsInput | undefined]>().mockResolvedValue(response);
  render(<ActivityPage listActivityEventsService={service} />);

  expect(await screen.findByText("Raft readiness degraded")).toBeInTheDocument();
  expect(screen.getByText("raft.readiness.degraded")).toBeInTheDocument();

  await userEvent.selectOptions(screen.getByLabelText("Category"), "cluster");
  await userEvent.click(screen.getByText("All severities"));
  await userEvent.click(screen.getByLabelText("Warning"));
  await userEvent.type(screen.getByLabelText("From"), "2026-05-28T10:00");
  await userEvent.type(screen.getByLabelText("To"), "2026-05-29T10:00");
  await userEvent.click(screen.getByRole("button", { name: /apply filters/i }));

  await waitFor(() => expect(service).toHaveBeenLastCalledWith(expect.objectContaining({
    pageSize: 50,
    categories: ["cluster"],
    severities: ["warning"],
    sinceSeconds: Math.floor(new Date("2026-05-28T10:00").getTime() / 1000),
    untilSeconds: Math.floor(new Date("2026-05-29T10:00").getTime() / 1000),
  })));
});

test("loads additional activity events from the next page", async () => {
  const firstPage = { ...response, nextPageToken: "page-2" };
  const secondPage: ListActivityEventsResponseInfo = {
    nextPageToken: "",
    events: [{ ...response.events[0], eventId: "evt_2", message: "Backup completed", category: "backup", eventType: "backup.completed" }],
  };
  const service = jest.fn<Promise<ListActivityEventsResponseInfo>, [ListActivityEventsInput | undefined]>()
    .mockResolvedValueOnce(firstPage)
    .mockResolvedValueOnce(secondPage);
  render(<ActivityPage listActivityEventsService={service} />);

  expect(await screen.findByText("Raft readiness degraded")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /load more/i }));

  expect(await screen.findByText("Backup completed")).toBeInTheDocument();
  expect(service).toHaveBeenLastCalledWith({ pageSize: 50, pageToken: "page-2" });
  expect(screen.getByText("End of activity events.")).toBeInTheDocument();
});

test("clears filters", async () => {
  const service = jest.fn<Promise<ListActivityEventsResponseInfo>, [ListActivityEventsInput | undefined]>().mockResolvedValue(response);
  render(<ActivityPage listActivityEventsService={service} />);

  await screen.findByText("Raft readiness degraded");
  await userEvent.selectOptions(screen.getByLabelText("Category"), "cluster");
  await userEvent.click(screen.getByRole("button", { name: /clear/i }));

  await waitFor(() => expect(service).toHaveBeenLastCalledWith({ pageSize: 50 }));
});

test("shows errors and empty state", async () => {
  const service = jest.fn<Promise<ListActivityEventsResponseInfo>, [ListActivityEventsInput | undefined]>().mockRejectedValue("permission denied");
  render(<ActivityPage listActivityEventsService={service} />);

  expect(await screen.findByText("permission denied")).toBeInTheDocument();
  expect(screen.getByText("No activity events found.")).toBeInTheDocument();
});
