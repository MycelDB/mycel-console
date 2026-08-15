import type { ReactNode } from "react";
import type { CapabilityRequirement, FeatureFallback, PrincipalCapabilityState } from "./capabilities";
import { evaluateRequirements, featureAvailability } from "./capabilities";
import { FeatureUnavailable } from "./FeatureUnavailable";

export type CapabilityGateProps = {
  state: PrincipalCapabilityState;
  requirements?: CapabilityRequirement[];
  fallback?: FeatureFallback;
  children: ReactNode;
  unavailableTitle?: string;
  unavailableMessage?: string;
};

export function CapabilityGate({
  state,
  requirements = [],
  fallback = "hide",
  children,
  unavailableTitle,
  unavailableMessage,
}: CapabilityGateProps) {
  const availability = featureAvailability(state, requirements, fallback);
  if (availability === "visible" || availability === "readonly") return <>{children}</>;
  if (availability === "disabled") {
    const evaluation = evaluateRequirements(state, requirements);
    return (
      <FeatureUnavailable
        title={unavailableTitle}
        message={unavailableMessage}
        availability={availability}
        missing={evaluation.missing}
      />
    );
  }
  return null;
}
