import { useState } from "react";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import type { InferencePackageDocument } from "../../../types/inference";

export type ImportInferencePackageModalProps = {
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onImport: (document: InferencePackageDocument) => Promise<void>;
};

export function ImportInferencePackageModal({ open, loading, onClose, onImport }: ImportInferencePackageModalProps) {
  const [jsonText, setJsonText] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setJsonText(await readFileText(file));
  }

  async function handleSubmit() {
    setError("");
    try {
      const parsed = JSON.parse(jsonText) as InferencePackageDocument;
      if (!parsed || typeof parsed !== "object") throw new Error("Package JSON must be an object");
      if (!parsed.name?.trim()) throw new Error("Package name is required");
      if (!parsed.version?.trim()) throw new Error("Package version is required");
      const document: InferencePackageDocument = {
        ...parsed,
        source: parsed.source || fileName,
        model_endpoints: parsed.model_endpoints ?? [],
        models: parsed.models ?? [],
        vector_stores: parsed.vector_stores ?? [],
        model_endpoint_capabilities: parsed.model_endpoint_capabilities ?? [],
      };
      await onImport(document);
      setJsonText("");
      setFileName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid inference package JSON");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">Import package</Text>
            <H2 className="mt-2 text-xl text-slate-900 dark:text-slate-100">Import inference package JSON</H2>
            <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">Packages are install-only, idempotent deployment units.</Text>
          </div>
          <button className="rounded px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800" onClick={onClose} disabled={loading}>Close</button>
        </div>

        {error && <ErrorBox className="mt-4">{error}</ErrorBox>}

        <label className="mt-5 block text-sm font-medium text-slate-900 dark:text-slate-100">
          Package JSON file
          <input className="mt-2 block w-full text-sm text-slate-700 dark:text-slate-300" type="file" accept="application/json,.json" onChange={(event) => void handleFile(event.target.files?.[0])} disabled={loading} />
        </label>

        <label className="mt-5 block text-sm font-medium text-slate-900 dark:text-slate-100">
          Or paste package JSON
          <textarea className="mt-2 h-72 w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100" value={jsonText} onChange={(event) => setJsonText(event.target.value)} disabled={loading} />
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={loading || !jsonText.trim()}>{loading ? "Importing…" : "Import package"}</Button>
        </div>
      </div>
    </div>
  );
}

function readFileText(file: File): Promise<string> {
  if (typeof file.text === "function") return file.text();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
