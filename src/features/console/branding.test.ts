import { consoleBranding } from "./branding";

test("keeps current release branding separate from future console name", () => {
  expect(consoleBranding.currentAppName).toBe("mycel-admin");
  expect(consoleBranding.currentDisplayName).toBe("Mycel Admin");
  expect(consoleBranding.futureDisplayName).toBe("mycel-console");
  expect(consoleBranding.renameDeferredNote).toMatch(/still ships as mycel-admin/i);
});
