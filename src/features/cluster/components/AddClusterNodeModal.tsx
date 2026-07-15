import { useState, type FormEvent } from "react";
import { Button, ErrorBox, Form, H2, Input, Label, Text } from "../../../components/typography";
import type { AddClusterNodeInput, AddClusterNodeResult, ClusterStatusInfo } from "../../../types/cluster";

export type AddClusterNodeModalProps = {
  open: boolean;
  cluster?: ClusterStatusInfo | null;
  onClose: () => void;
  onAdd: (input: AddClusterNodeInput) => Promise<AddClusterNodeResult>;
  onAdded: (result: AddClusterNodeResult) => void;
};

export function AddClusterNodeModal({ open, cluster, onClose, onAdd, onAdded }: AddClusterNodeModalProps) {
  const [nodeName, setNodeName] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState("30");
  const [result, setResult] = useState<AddClusterNodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  if (!open) return null;

  function reset() {
    setNodeName("");
    setTtlMinutes("30");
    setResult(null);
    setError("");
    setCopied("");
  }

  function handleClose() {
    if (loading) return;
    reset();
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const trimmedNodeName = nodeName.trim();
    const ttl = Number(ttlMinutes);
    if (!trimmedNodeName) {
      setError("Node name is required");
      return;
    }
    if (!Number.isFinite(ttl) || ttl <= 0) {
      setError("Token TTL must be a positive number of minutes");
      return;
    }

    setLoading(true);
    try {
      const created = await onAdd({ nodeName: trimmedNodeName, tokenTtlSeconds: Math.round(ttl * 60) });
      setResult(created);
      onAdded(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Add node failed");
    } finally {
      setLoading(false);
    }
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
    } catch {
      setCopied("");
      setError("Copy failed; select and copy the value manually.");
    }
  }

  const token = result?.token || "";
  const seed = cluster?.peers.find((peer) => peer.state === "self")?.backendAdvertiseAddr || cluster?.peers[0]?.backendAdvertiseAddr || "<seed-peer-addr>";
  const command = result
    ? `MYCELD_CLUSTER_SEED_PEERS=${seed} \\\nMYCELD_CLUSTER_JOIN_TOKEN_FILE=/path/to/${result.nodeName}.join \\\n./scripts/startClusterNode.sh ${result.nodeName}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <Form className="w-full max-w-2xl p-6" onSubmit={(event) => void handleSubmit(event)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <H2>{result ? "Node token created" : "Add Cluster Node"}</H2>
            <Text intent="muted" size="sm" className="mt-2">
              {result
                ? "Store this one-time join token securely. It is shown only after creation."
                : "Create a pending member and generate a node-specific one-time join token."}
            </Text>
          </div>
          <button
            type="button"
            className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close add cluster node dialog"
          >
            ✕
          </button>
        </div>

        {error && <ErrorBox className="mt-4">{error}</ErrorBox>}

        {!result ? (
          <>
            <Label className="mt-5" htmlFor="cluster-node-name">Node name</Label>
            <Input
              id="cluster-node-name"
              value={nodeName}
              onChange={(event) => setNodeName(event.target.value)}
              autoFocus
              disabled={loading}
              placeholder="node-c"
            />

            <Label className="mt-4" htmlFor="cluster-token-ttl">Token TTL, minutes</Label>
            <Input
              id="cluster-token-ttl"
              type="number"
              min="1"
              value={ttlMinutes}
              onChange={(event) => setTtlMinutes(event.target.value)}
              disabled={loading}
            />

            <div className="mt-6 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button disabled={loading}>{loading ? "Creating…" : "Create"}</Button>
            </div>
          </>
        ) : (
          <div className="mt-5 space-y-5">
            <Text>Node <span className="font-semibold">{result.nodeName}</span> was added as <span className="font-semibold">{result.state}</span>.</Text>

            <div>
              <Label>Join token</Label>
              <pre className="mt-2 overflow-x-auto rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950">{token || "Token was not returned"}</pre>
              {token && <Button type="button" variant="secondary" className="mt-2" onClick={() => void copy("token", token)}>Copy token</Button>}
            </div>

            <div>
              <Label>Start command</Label>
              <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border border-slate-300 bg-slate-50 p-3 font-mono text-sm dark:border-slate-700 dark:bg-slate-950">{command}</pre>
              <Button type="button" variant="secondary" className="mt-2" onClick={() => void copy("command", command)}>Copy command</Button>
            </div>

            <Text size="sm" intent="muted">Token ID: {result.tokenId || "—"} · Expires: {result.expiresAt || "—"}</Text>
            {copied && <Text size="sm" className="text-emerald-600 dark:text-emerald-300">Copied {copied}.</Text>}
            <div className="flex justify-end"><Button type="button" onClick={handleClose}>Done</Button></div>
          </div>
        )}
      </Form>
    </div>
  );
}
