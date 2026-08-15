import { consoleRoleBundleForRole, consoleRoleBundleIdForRole } from "./roles";

test("maps daemon role names to console role bundle labels", () => {
  expect(consoleRoleBundleIdForRole("inference_admin")).toBe("inference-admin");
  expect(consoleRoleBundleIdForRole("automation.admin")).toBe("automation-author");
  expect(consoleRoleBundleIdForRole("space.viewer")).toBe("space-user");
  expect(consoleRoleBundleIdForRole("storage_admin")).toBe("system-operator");
});

test("returns bundle metadata for known roles", () => {
  const bundle = consoleRoleBundleForRole("identity.admin");

  expect(bundle?.label).toBe("Access admin");
  expect(bundle?.exampleCapabilities).toContain("identity.grant.manage");
});
