import type { PrincipalCapabilityState } from "./capabilities";
import { completeCapabilities } from "./capabilities";
import type { ConsolePrincipalContext } from "./principalContext";

export function permissiveConsoleCapabilityState(): PrincipalCapabilityState {
  return completeCapabilities([{ capability: "*" }]);
}

export function navigationCapabilityState(context?: ConsolePrincipalContext | null): PrincipalCapabilityState {
  if (!context || context.capabilityState.kind !== "complete") return permissiveConsoleCapabilityState();
  return context.capabilityState;
}
