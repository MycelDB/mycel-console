import { completeCapabilities } from "./capabilities";
import { navigationCapabilityState } from "./liveState";
import type { ConsolePrincipalContext } from "./principalContext";

const contextBase = {
  session: { addr: "127.0.0.1:19091", principalId: "prn", username: "alice" },
  roles: [],
  capabilities: [],
  warnings: [],
};

test("uses permissive wildcard state until capability discovery is complete", () => {
  expect(navigationCapabilityState(null)).toEqual({ kind: "complete", capabilities: [{ capability: "*" }] });
  expect(navigationCapabilityState({ ...contextBase, capabilityState: { kind: "unknown", warnings: [] } })).toEqual({ kind: "complete", capabilities: [{ capability: "*" }] });
  expect(navigationCapabilityState({ ...contextBase, capabilityState: { kind: "partial", roles: ["auditor"], warnings: [] } })).toEqual({ kind: "complete", capabilities: [{ capability: "*" }] });
});

test("uses complete discovered capability state when available", () => {
  const complete = completeCapabilities([{ capability: "space.read" }]);
  const context: ConsolePrincipalContext = { ...contextBase, capabilityState: complete };

  expect(navigationCapabilityState(context)).toBe(complete);
});
