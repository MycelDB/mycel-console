import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { BackupStatusCard } from "./BackupStatusCard";
import type { GetBackupObservabilityResponse, ListBackupSetsResponse } from "../../../types/backups";

const observability: GetBackupObservabilityResponse = {
  snapshot: {
    observedAt: "2026-07-06T20:00:10Z",
    repositoryId: "repo-1",
    metrics: [],
    alerts: [],
    summaryState: "healthy",
  },
};

const backupSets: ListBackupSetsResponse = {
  backupSets: [
    {
      backupSetId: "backup-set-1",
      repositoryId: "repo-1",
      deploymentId: "deployment-1",
      deploymentName: "dev",
      deploymentMode: "BACKUP_DEPLOYMENT_MODE_STANDALONE",
      state: "BACKUP_OPERATION_STATE_SUCCEEDED",
      createdAt: "2026-07-06T20:00:00Z",
      completedAt: "2026-07-06T20:00:10Z",
      expectedNodeCount: 1,
      manifestUri: "s3://repo/backup-set-1/backup-set.json",
      nodes: [],
    },
  ],
  nextPageToken: "",
};

function renderCard({
  getBackupObservabilityService = jest.fn().mockResolvedValue(observability),
  listBackupSetsService = jest.fn().mockResolvedValue(backupSets),
} = {}) {
  render(
    <MemoryRouter>
      <BackupStatusCard
        getBackupObservabilityService={getBackupObservabilityService}
        listBackupSetsService={listBackupSetsService}
      />
    </MemoryRouter>,
  );
  return { getBackupObservabilityService, listBackupSetsService };
}

test("renders repository backup summary", async () => {
  renderCard();

  expect(await screen.findByText("Repository health")).toBeInTheDocument();
  expect(screen.getByText("healthy")).toBeInTheDocument();
  expect(screen.getByText("backup-set-1")).toBeInTheDocument();
  expect(screen.getByText("dev")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage backups/i })).toHaveAttribute(
    "href",
    "/backups",
  );
});

test("loads backup sets from observed repository", async () => {
  const { listBackupSetsService } = renderCard();

  await waitFor(() => {
    expect(listBackupSetsService).toHaveBeenCalledWith({
      repositoryId: "repo-1",
      pageSize: 3,
      pageToken: "",
    });
  });
});

test("renders empty repository backup-set state", async () => {
  renderCard({
    listBackupSetsService: jest
      .fn()
      .mockResolvedValue({ backupSets: [], nextPageToken: "" }),
  });

  expect(await screen.findByText(/no repository backup sets found/i)).toBeInTheDocument();
});
