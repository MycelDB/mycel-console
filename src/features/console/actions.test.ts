import { canUseCapability } from "./actions";
import type { ConsolePrincipalContext } from "./principalContext";

const base = {
  session: { addr: "127.0.0.1:19091", principalId: "prn", username: "alice" },
  roles: [],
  capabilities: [],
  warnings: [],
};

test("allows actions while capability context is unknown to preserve current operator behavior", () => {
  expect(canUseCapability(null, "identity.principal.update")).toBe(true);
  expect(canUseCapability({ ...base, capabilityState: { kind: "unknown", warnings: [] } }, "identity.principal.update")).toBe(true);
});

test("filters actions when complete capability context is available", () => {
  const context: ConsolePrincipalContext = {
    ...base,
    capabilities: ["CAPABILITY_SPACE_READ"],
    capabilityState: { kind: "complete", capabilities: [{ capability: "CAPABILITY_SPACE_READ" }] },
  };

  expect(canUseCapability(context, "space.read")).toBe(true);
  expect(canUseCapability(context, "space.create")).toBe(false);
});
