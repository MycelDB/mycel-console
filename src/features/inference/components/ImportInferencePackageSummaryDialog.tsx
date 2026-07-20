import { Button, H2, Text } from "../../../components/typography";
import type { ApplyInferencePackageResponse } from "../../../types/inference";

export type ImportSummaryTarget = "endpoints" | "models" | "vectorStores" | "capabilities";

export type ImportInferencePackageSummaryDialogProps = {
  result: ApplyInferencePackageResponse | null;
  onClose: () => void;
  onViewCatalog?: (target: ImportSummaryTarget) => void;
};

export function ImportInferencePackageSummaryDialog({ result, onClose, onViewCatalog }: ImportInferencePackageSummaryDialogProps) {
  if (!result) return null;
  const pkg = result.package;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 px-4 backdrop-blur-sm dark:bg-slate-950/80">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <Text as="p" size="sm" className="font-medium uppercase tracking-[0.2em] text-cyan-300">
          Inference package imported
        </Text>
        <H2 className="mt-2 text-xl text-slate-900 dark:text-slate-100">{pkg ? `${pkg.name}@${pkg.version}` : "Import complete"}</H2>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <SummaryItem label="Model endpoints" value={result.modelEndpointCount} />
          <SummaryItem label="Models" value={result.modelCount} />
          <SummaryItem label="Vector stores" value={result.vectorStoreCount} />
          <SummaryItem label="Capabilities" value={result.capabilityCount} />
        </dl>
        {onViewCatalog && (
          <div className="mt-5 flex flex-wrap gap-2">
            {result.modelEndpointCount > 0 && <Button variant="secondary" onClick={() => onViewCatalog("endpoints")}>View endpoints</Button>}
            {result.modelCount > 0 && <Button variant="secondary" onClick={() => onViewCatalog("models")}>View models</Button>}
            {result.vectorStoreCount > 0 && <Button variant="secondary" onClick={() => onViewCatalog("vectorStores")}>View vector stores</Button>}
            {result.capabilityCount > 0 && <Button variant="secondary" onClick={() => onViewCatalog("capabilities")}>View capabilities</Button>}
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
