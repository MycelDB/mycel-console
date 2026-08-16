import { consoleBranding } from "./branding";

test("uses Mycel Console as the user-facing identity", () => {
  expect(consoleBranding.currentAppName).toBe("mycel-console");
  expect(consoleBranding.currentDisplayName).toBe("Mycel Console");
  expect(consoleBranding.formerAppName).toBe("mycel-admin");
  expect(consoleBranding.renamePhaseNote).toMatch(/package and Tauri release metadata/i);
});
