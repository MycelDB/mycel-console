import type { CapabilityRequirement } from "./capabilities";
import { hasCapability, requirement } from "./capabilities";
import { navigationCapabilityState } from "./liveState";
import type { ConsolePrincipalContext } from "./principalContext";

export function canUseCapability(
  principalContext: ConsolePrincipalContext | null | undefined,
  capability: string,
  scope?: CapabilityRequirement["scope"],
): boolean {
  return hasCapability(navigationCapabilityState(principalContext), requirement(capability, scope));
}

export function canUseAnyCapability(
  principalContext: ConsolePrincipalContext | null | undefined,
  capabilities: string[],
): boolean {
  return capabilities.some((capability) => canUseCapability(principalContext, capability));
}
