import { useCallback, useEffect, useState } from "react";
import { Button, ErrorBox, FieldHint, H2, Input, Text } from "../../../components/typography";
import { canUseCapability, type ConsolePrincipalContext } from "../../console";
import {
  deleteBackup as defaultDeleteBackup,
  getBackupPolicy as defaultGetBackupPolicy,
  getBackupStatus as defaultGetBackupStatus,
  listBackups as defaultListBackups,
  triggerBackup as defaultTriggerBackup,
  updateBackupPolicy as defaultUpdateBackupPolicy,
} from "../../../services/adminService";
import type {
  BackupArchiveFormat,
  BackupPolicyInfo,
  BackupScheduleKind,
  BackupStatusResponse,
  BackupSummaryInfo,
  DeleteBackupResponse,
  ListBackupsInput,
  ListBackupsResponse,
  TriggerBackupInput,
  TriggerBackupResponse,
} from "../../../types/backups";

export type BackupsPageProps = {
  getBackupPolicyService?: () => Promise<BackupPolicyInfo>;
  updateBackupPolicyService?: (input: BackupPolicyInfo) => Promise<BackupPolicyInfo>;
  getBackupStatusService?: () => Promise<BackupStatusResponse>;
  listBackupsService?: (input?: ListBackupsInput) => Promise<ListBackupsResponse>;
  triggerBackupService?: (input?: TriggerBackupInput) => Promise<TriggerBackupResponse>;
  deleteBackupService?: (backupId: string) => Promise<DeleteBackupResponse>;
  principalContext?: ConsolePrincipalContext | null;
};

export function BackupsPage({
  getBackupPolicyService = defaultGetBackupPolicy,
  updateBackupPolicyService = defaultUpdateBackupPolicy,
  getBackupStatusService = defaultGetBackupStatus,
  listBackupsService = defaultListBackups,
  triggerBackupService = defaultTriggerBackup,
  deleteBackupService = defaultDeleteBackup,
  principalContext,
}: BackupsPageProps) {
  const [policy, setPolicy] = useState<BackupPolicyInfo | null>(null);
  const [status, setStatus] = useState<BackupStatusResponse | null>(null);
  const [backups, setBackups] = useState<BackupSummaryInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState("");
  const [pendingDelete, setPendingDelete] = useState<BackupSummaryInfo | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"status" | "policy" | "files">("status");

  const load = useCallback(
    async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      setNotice("");
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const [policyResponse, statusResponse, backupsResponse] = await Promise.all([
          getBackupPolicyService(),
          getBackupStatusService(),
          listBackupsService({ pageSize: 50, pageToken }),
        ]);
        setPolicy(policyResponse);
        setStatus(statusResponse);
        setBackups((current) =>
          append ? [...current, ...backupsResponse.backups] : backupsResponse.backups,
        );
        setNextPageToken(backupsResponse.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load backups");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [getBackupPolicyService, getBackupStatusService, listBackupsService],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSavePolicy() {
    if (!policy) return;
    setError("");
    setNotice("");
    setSavingPolicy(true);
    try {
      const updated = await updateBackupPolicyService(policy);
      setPolicy(updated);
      setNotice("Backup policy saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save backup policy");
    } finally {
      setSavingPolicy(false);
    }
  }

  async function handleTriggerBackup() {
    setError("");
    setNotice("");
    setTriggering(true);
    try {
      await triggerBackupService({ reason: "Triggered from Mycel Console" });
      setNotice("Backup triggered.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to trigger backup");
    } finally {
      setTriggering(false);
    }
  }

  function requestDeleteBackup(backup: BackupSummaryInfo) {
    setError("");
    setNotice("");
    setPendingDelete(backup);
  }

  async function confirmDeleteBackup() {
    if (!pendingDelete) return;
    const backup = pendingDelete;
    setError("");
    setNotice(`Deleting backup: ${backup.backupId}`);
    setDeletingBackupId(backup.backupId);
    try {
      const deleted = await deleteBackupService(backup.backupId);
      setPendingDelete(null);
      await load();
      setNotice(`Backup deleted: ${deleted.backupId || backup.backupId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete backup");
    } finally {
      setDeletingBackupId("");
    }
  }

  const canManageBackups = canUseCapability(principalContext, "backup.manage");
  const busy = loading || loadingMore || savingPolicy || triggering || Boolean(deletingBackupId);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text as="p" size="sm" className="font-medium uppercase tracking-[0.3em] text-cyan-300">
            Backups
          </Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Backup Management</H2>
          <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Inspect backup files, monitor backup state, trigger manual backups, and manage the daemon backup policy.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void load()} disabled={busy}>
            Refresh
          </Button>
          {canManageBackups && (
            <Button variant="secondary" onClick={() => void handleTriggerBackup()} disabled={busy}>
              {triggering ? "Triggering…" : "Trigger backup"}
            </Button>
          )}
        </div>
      </div>

      {error && <ErrorBox>{error}</ErrorBox>}
      {notice && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-200">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 text-center">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading backups…
          </Text>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Backup sections">
              {[
                ["status", "Status"],
                ["policy", "Policy"],
                ["files", "Files"],
              ].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  className={[
                    "rounded-t-md px-4 py-2 text-sm font-medium transition",
                    activeTab === tab
                      ? "border border-b-white border-slate-200 bg-white text-slate-950 dark:border-slate-800 dark:border-b-slate-950 dark:bg-slate-950 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
                  ].join(" ")}
                  onClick={() => setActiveTab(tab as typeof activeTab)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "status" && <StatusPanel status={status} />}
          {activeTab === "policy" && policy && (
            <PolicyPanel
              policy={policy}
              onChange={setPolicy}
              onSave={() => void handleSavePolicy()}
              saving={savingPolicy}
              readOnly={!canManageBackups}
            />
          )}
          {activeTab === "files" && (
            <>
              <BackupFilesPanel
                backups={backups}
                deletingBackupId={deletingBackupId}
                onDelete={requestDeleteBackup}
                canDelete={canManageBackups}
              />
              {nextPageToken && (
                <div className="flex justify-center">
                  <Button
                    variant="secondary"
                    onClick={() => void load({ append: true, pageToken: nextPageToken })}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading more…" : "Load more"}
                  </Button>
                </div>
              )}
            </>
          )}
          <DeleteBackupDialog
            backup={pendingDelete}
            deleting={Boolean(deletingBackupId)}
            onCancel={() => setPendingDelete(null)}
            onConfirm={() => void confirmDeleteBackup()}
          />
        </>
      )}
    </section>
  );
}

function StatusPanel({ status }: { status: BackupStatusResponse | null }) {
  const current = status?.status;
  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Status
      </Text>
      <dl className="mt-5 grid gap-4 md:grid-cols-4">
        <Metric label="State" value={current?.state || "Unknown"} />
        <Metric label="Last success" value={formatTimestamp(current?.lastSuccessAt)} />
        <Metric label="Next run" value={formatTimestamp(current?.nextRunAt)} />
        <Metric label="Active backup" value={current?.backupId || "None"} />
      </dl>
      {current?.error && <ErrorBox className="mt-4">{current.error}</ErrorBox>}
    </article>
  );
}

function PolicyPanel({
  policy,
  onChange,
  onSave,
  saving,
  readOnly,
}: {
  policy: BackupPolicyInfo;
  onChange: (policy: BackupPolicyInfo) => void;
  onSave: () => void;
  saving: boolean;
  readOnly: boolean;
}) {
  function set<K extends keyof BackupPolicyInfo>(key: K, value: BackupPolicyInfo[K]) {
    onChange({ ...policy, [key]: value });
  }

  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <div className="flex items-center justify-between gap-4">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
          Backup policy
        </Text>
        {readOnly ? (
          <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">Read-only</Text>
        ) : (
          <Button variant="secondary" onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save policy"}
          </Button>
        )}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <CheckboxField label="Backups enabled" checked={policy.enabled} disabled={readOnly} onChange={(value) => set("enabled", value)} hint="Turns scheduled backups on or off. Manual backups can still be triggered separately if the daemon allows it." />
        <CheckboxField label="Include logs" checked={policy.includeLogs} disabled={readOnly} onChange={(value) => set("includeLogs", value)} hint="Includes daemon log files in backup archives when supported." />
        <CheckboxField label="Allow reads during backup" checked={policy.allowReadsDuringBackup} disabled={readOnly} onChange={(value) => set("allowReadsDuringBackup", value)} hint="Allows read traffic while backup quiescing is active. Writes may still be paused." />
        <CheckboxField label="Run missed schedule" checked={policy.runMissed} disabled={readOnly} onChange={(value) => set("runMissed", value)} hint="If enabled, the daemon may run a missed daily or weekly backup after restart." />
        <Field label="Backup directory" value={policy.backupDir} disabled={readOnly} onChange={(value) => set("backupDir", value)} hint="Filesystem path on the Mycel daemon host or container where backup archives are written." />
        <ArchiveFormatField value={policy.archiveFormat} disabled={readOnly} onChange={(value) => set("archiveFormat", value)} />
        <ScheduleKindField value={policy.scheduleKind || "interval"} disabled={readOnly} onChange={(value) => set("scheduleKind", value)} />
        {(policy.scheduleKind === "" || policy.scheduleKind === "interval") && <NumberField label="Interval seconds" value={policy.intervalSeconds} disabled={readOnly} onChange={(value) => set("intervalSeconds", value)} hint="Number of seconds between scheduled backup attempts when schedule kind is interval." />}
        {(policy.scheduleKind === "daily" || policy.scheduleKind === "weekly") && <Field label="Time of day" value={policy.timeOfDay} disabled={readOnly} onChange={(value) => set("timeOfDay", value)} hint="Local wall-clock time for daily or weekly backups, in HH:MM 24-hour format." />}
        {(policy.scheduleKind === "daily" || policy.scheduleKind === "weekly") && <Field label="Timezone" value={policy.timezone} disabled={readOnly} onChange={(value) => set("timezone", value)} hint="IANA timezone used for wall-clock schedules, such as UTC or America/Toronto." />}
        {policy.scheduleKind === "weekly" && <WeekdaysField value={policy.weekdays} disabled={readOnly} onChange={(value) => set("weekdays", value)} />}
        <NumberField label="Retention count" value={policy.retentionCount} disabled={readOnly} onChange={(value) => set("retentionCount", value)} hint="Maximum number of completed backups to keep before old backups are eligible for deletion." />
        <NumberField label="Backup timeout seconds" value={policy.backupTimeoutSeconds} disabled={readOnly} onChange={(value) => set("backupTimeoutSeconds", value)} hint="Maximum time a backup run may take before it is considered failed." />
        <NumberField label="Quiesce drain timeout seconds" value={policy.quiesceDrainTimeoutSeconds} disabled={readOnly} onChange={(value) => set("quiesceDrainTimeoutSeconds", value)} hint="How long the daemon waits for active work to drain before taking a backup." />
        <NumberField label="Retry after seconds" value={policy.retryAfterSeconds} disabled={readOnly} onChange={(value) => set("retryAfterSeconds", value)} hint="Delay before retrying after a scheduled backup failure." />
        <NumberField label="Status history limit" value={policy.statusHistoryLimit} disabled={readOnly} onChange={(value) => set("statusHistoryLimit", value)} hint="Number of recent backup status records the daemon should retain." />
      </div>
    </article>
  );
}

function BackupFilesPanel({
  backups,
  deletingBackupId,
  onDelete,
  canDelete,
}: {
  backups: BackupSummaryInfo[];
  deletingBackupId: string;
  onDelete: (backup: BackupSummaryInfo) => void;
  canDelete: boolean;
}) {
  return (
    <article className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5">
      <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
        Backup files
      </Text>
      {backups.length === 0 ? (
        <div className="mt-5 rounded-lg border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/40 p-6 text-center">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">No backup files found.</Text>
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-sm">
            <thead className="bg-slate-100 dark:bg-slate-950/50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Archive</th>
                <th className="px-4 py-3">Completed</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Archive format</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              {backups.map((backup) => (
                <tr key={backup.backupId}>
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{backup.archiveName || backup.backupId}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatTimestamp(backup.completedAt || backup.createdAt)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatBytes(backup.sizeBytes)}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{formatArchiveFormat(backup.archiveFormat)}</td>
                  <td className="px-4 py-3 text-right">
                    {canDelete ? (
                      <Button
                        variant="secondary"
                        onClick={() => onDelete(backup)}
                        disabled={deletingBackupId === backup.backupId}
                      >
                        {deletingBackupId === backup.backupId ? "Deleting…" : "Delete"}
                      </Button>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400">Read-only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function DeleteBackupDialog({
  backup,
  deleting,
  onCancel,
  onConfirm,
}: {
  backup: BackupSummaryInfo | null;
  deleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!backup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-red-500 dark:text-red-300">
          Delete backup
        </Text>
        <H2 className="mt-2 text-xl text-slate-900 dark:text-slate-100">Confirm delete</H2>
        <Text intent="muted" className="mt-3 text-slate-600 dark:text-slate-400">
          Delete <span className="font-medium text-slate-900 dark:text-slate-100">{backup.archiveName || backup.backupId}</span>? This removes the backup archive and manifest from the daemon backup directory.
        </Text>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete backup"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, disabled = false, onChange, hint }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void; hint: string }) {
  return (
    <label className="block text-sm text-slate-700 dark:text-slate-300">
      <FieldLabel label={label} hint={hint} />
      <Input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberField({ label, value, disabled = false, onChange, hint }: { label: string; value: number; disabled?: boolean; onChange: (value: number) => void; hint: string }) {
  return (
    <label className="block text-sm text-slate-700 dark:text-slate-300">
      <FieldLabel label={label} hint={hint} />
      <Input type="number" value={value} disabled={disabled} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function CheckboxField({ label, checked, disabled = false, onChange, hint }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void; hint: string }) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-200">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span className="flex items-center gap-1">
        {label}
        <FieldHint label={`${label} help`}>{hint}</FieldHint>
      </span>
    </label>
  );
}

function ArchiveFormatField({ value, disabled = false, onChange }: { value: BackupArchiveFormat; disabled?: boolean; onChange: (value: BackupArchiveFormat) => void }) {
  return (
    <label className="block text-sm text-slate-700 dark:text-slate-300">
      <FieldLabel label="Archive format" hint="Backup archive/container format written by the daemon, such as ZIP or TAR.ZST." />
      <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BackupArchiveFormat)}>
        <option value="BACKUP_ARCHIVE_FORMAT_ZIP">ZIP</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR">TAR</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_GZ">TAR.GZ</option>
        <option value="BACKUP_ARCHIVE_FORMAT_TAR_ZST">TAR.ZST</option>
      </select>
    </label>
  );
}

function ScheduleKindField({ value, disabled = false, onChange }: { value: BackupScheduleKind; disabled?: boolean; onChange: (value: BackupScheduleKind) => void }) {
  return (
    <label className="block text-sm text-slate-700 dark:text-slate-300">
      <FieldLabel label="Schedule kind" hint="Controls whether backups run by interval, once per day, or on selected weekdays." />
      <select className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={value} disabled={disabled} onChange={(event) => onChange(event.target.value as BackupScheduleKind)}>
        <option value="interval">Interval</option>
        <option value="daily">Daily</option>
        <option value="weekly">Weekly</option>
      </select>
    </label>
  );
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function WeekdaysField({ value, disabled = false, onChange }: { value: number[]; disabled?: boolean; onChange: (value: number[]) => void }) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((item) => item !== day) : [...value, day].sort());
  }
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/30">
      <legend className="px-1"><FieldLabel label="Weekdays" hint="Days when weekly backups run. Sunday is 0 in the API, but the UI shows day names." /></legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {weekdayLabels.map((label, day) => (
          <label key={label} className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" checked={value.includes(day)} disabled={disabled} onChange={() => toggle(day)} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function FieldLabel({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="mb-1 flex items-center gap-1 text-xs uppercase tracking-wide text-slate-500">
      {label}
      <FieldHint label={`${label} help`}>{hint}</FieldHint>
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

function formatTimestamp(value?: string): string {
  if (!value) return "Not available";
  return value.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC");
}

function formatArchiveFormat(format: string): string {
  return format.replace("BACKUP_ARCHIVE_FORMAT_", "").replace(/_/g, ".");
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}
