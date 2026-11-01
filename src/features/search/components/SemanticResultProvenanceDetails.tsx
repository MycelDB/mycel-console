import type { ReactNode } from "react";
import { Button, Text, themeClasses } from "../../../components/typography";
import type { SemanticResultProvenance } from "../../../types/semantic";

export type SemanticResultProvenanceDetailsProps = {
  provenance: SemanticResultProvenance;
};

export function SemanticResultProvenanceDetails({
  provenance,
}: SemanticResultProvenanceDetailsProps) {
  function copyProvenance() {
    void navigator.clipboard?.writeText(
      JSON.stringify(copyableSemanticProvenance(provenance), null, 2),
    );
  }

  return (
    <details
      className={`mt-3 rounded-lg border border-dashed ${themeClasses.border.input} p-3`}
    >
      <summary
        className={`cursor-pointer text-sm font-medium ${themeClasses.text.secondary}`}
      >
        Provenance details
      </summary>
      <Text intent="muted" size="xs" className="mt-2">
        Authorization-scoped generation evidence reported by the daemon.
      </Text>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <ProvenanceSection title="Generation evidence">
          <ProvenanceField label="Source graph revision" value={provenance.sourceGraphRevision} />
          <ProvenanceField label="Semantic generation" value={provenance.semanticGeneration} />
          <ProvenanceField label="Configuration hash" value={provenance.semanticConfigurationHash} />
          <ProvenanceField label="Opaque source version" value={provenance.opaqueSourceVersion} />
          <ProvenanceField label="Rebuild epoch" value={provenance.rebuildEpoch} />
          <ProvenanceField label="Generated at" value={provenance.generatedAt} />
        </ProvenanceSection>

        <ProvenanceSection title="Vector space">
          <ProvenanceField label="Vector-space key" value={provenance.vectorSpaceKey} />
          <ProvenanceField label="Dimensions" value={provenance.dimensions} />
        </ProvenanceSection>

        <ProvenanceSection title="Configured route">
          <ProvenanceField
            label="Intelligence profile ID"
            value={provenance.configuredIntelligenceProfileId}
          />
          <ProvenanceField
            label="Model endpoint ID"
            value={provenance.configuredModelEndpointId}
          />
          <ProvenanceField label="Model ID" value={provenance.configuredModelId} />
          <ProvenanceField label="Capability ID" value={provenance.configuredCapabilityId} />
        </ProvenanceSection>

        <ProvenanceSection title="Actual route">
          <ProvenanceField
            label="Route status"
            value={
              provenance.actualRouteKnown
                ? "Known"
                : "Unknown (actual_route_known=false)"
            }
          />
          <ProvenanceField label="Model endpoint ID" value={provenance.actualModelEndpointId} />
          <ProvenanceField label="Model ID" value={provenance.actualModelId} />
          <ProvenanceField label="Capability ID" value={provenance.actualCapabilityId} />
        </ProvenanceSection>
      </div>

      <Button type="button" variant="secondary" className="mt-4" onClick={copyProvenance}>
        Copy provenance
      </Button>
    </details>
  );
}

function ProvenanceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <Text as="h4" intent="primary" size="sm" className="font-semibold">
        {title}
      </Text>
      <dl className="mt-2 grid gap-2 text-sm">{children}</dl>
    </section>
  );
}

function ProvenanceField({ label, value }: { label: string; value: string | number }) {
  const reported = typeof value === "string" ? value.length > 0 : true;
  return (
    <div>
      <dt className={themeClasses.text.parts.quietLight}>{label}</dt>
      <dd>
        <code
          className={`select-all break-all text-xs ${
            reported ? themeClasses.text.primary : themeClasses.text.muted
          }`}
        >
          {reported ? String(value) : "Not reported"}
        </code>
      </dd>
    </div>
  );
}

export function copyableSemanticProvenance(
  provenance: SemanticResultProvenance,
): SemanticResultProvenance {
  return {
    sourceGraphRevision: provenance.sourceGraphRevision,
    semanticGeneration: provenance.semanticGeneration,
    semanticConfigurationHash: provenance.semanticConfigurationHash,
    opaqueSourceVersion: provenance.opaqueSourceVersion,
    dimensions: provenance.dimensions,
    vectorSpaceKey: provenance.vectorSpaceKey,
    configuredIntelligenceProfileId: provenance.configuredIntelligenceProfileId,
    configuredModelEndpointId: provenance.configuredModelEndpointId,
    configuredModelId: provenance.configuredModelId,
    configuredCapabilityId: provenance.configuredCapabilityId,
    actualRouteKnown: provenance.actualRouteKnown,
    actualModelEndpointId: provenance.actualModelEndpointId,
    actualModelId: provenance.actualModelId,
    actualCapabilityId: provenance.actualCapabilityId,
    rebuildEpoch: provenance.rebuildEpoch,
    generatedAt: provenance.generatedAt,
  };
}
