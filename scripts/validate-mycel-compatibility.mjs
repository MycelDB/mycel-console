import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const manifest = JSON.parse(read(".release/mycel-compatibility.json"));
const packageJson = JSON.parse(read("package.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const workflow = read(".github/workflows/ci.yml");
const errors = [];

const expectedManifestKeys = [
  "component",
  "component_release",
  "incompatible_daemon_api_lines",
  "mycel_api_line",
  "published_at",
  "schema_version",
  "source_revision",
  "supported_daemon_api_lines",
];
const actualManifestKeys = Object.keys(manifest).sort();
if (JSON.stringify(actualManifestKeys) !== JSON.stringify(expectedManifestKeys)) {
  errors.push(`manifest keys ${JSON.stringify(actualManifestKeys)} do not match schema v1`);
}

const expected = {
  consoleVersion: "0.21.1",
  consoleRelease: "v0.21.1",
  consoleSource: "425bd513e5de72c9065c49765c417b0a3590e024",
  rustSdkVersion: "0.21.1",
  rustSdkSource: "f8c9b1d95d976f8b12b0acba22cba4a1f81d44a7",
  apiLine: "0.21",
};

if (manifest.schema_version !== 1) errors.push(`schema_version=${manifest.schema_version}`);
if (manifest.component !== "mycel-console") errors.push(`component=${manifest.component}`);
if (manifest.component_release !== expected.consoleRelease) {
  errors.push(`component_release=${manifest.component_release}`);
}
if (manifest.source_revision !== expected.consoleSource) {
  errors.push(`source_revision=${manifest.source_revision}`);
}
if (manifest.mycel_api_line !== expected.apiLine) {
  errors.push(`mycel_api_line=${manifest.mycel_api_line}`);
}
if (JSON.stringify(manifest.supported_daemon_api_lines) !== JSON.stringify([expected.apiLine])) {
  errors.push(`supported_daemon_api_lines=${JSON.stringify(manifest.supported_daemon_api_lines)}`);
}

const incompatible = manifest.incompatible_daemon_api_lines;
if (!Array.isArray(incompatible) || incompatible.length !== 1) {
  errors.push("exactly one incompatible daemon line is required");
} else {
  const entry = incompatible[0];
  const expectedContracts = [
    "search-channel-owned-query-v1",
    "semantic-trigger-events-enum-v1",
  ];
  if (entry.line !== "0.20") errors.push(`incompatible line=${entry.line}`);
  if (JSON.stringify(entry.contracts) !== JSON.stringify(expectedContracts)) {
    errors.push(`incompatible contracts=${JSON.stringify(entry.contracts)}`);
  }
  if (manifest.supported_daemon_api_lines.includes(entry.line)) {
    errors.push(`daemon line ${entry.line} is both supported and incompatible`);
  }
}

if (packageJson.version !== expected.consoleVersion) {
  errors.push(`package.json version=${packageJson.version}`);
}
const tauriVersion = cargoToml.match(/^version = "([^"]+)"/m)?.[1];
if (tauriVersion !== expected.consoleVersion) errors.push(`Tauri version=${tauriVersion}`);

const sdkDependency = cargoToml.match(
  /^mycel-sdk = \{ version = "=([^"]+)", path = "([^"]+)" \}$/m,
);
if (!sdkDependency) {
  errors.push("mycel-sdk must use an exact version and explicit path dependency");
} else {
  if (sdkDependency[1] !== expected.rustSdkVersion) {
    errors.push(`mycel-sdk version=${sdkDependency[1]}`);
  }
  if (sdkDependency[2] !== "../../mycel-rust-sdk/crates/mycel-sdk") {
    errors.push(`mycel-sdk path=${sdkDependency[2]}`);
  }
}

const workflowSdkRef = workflow.match(/^  MYCEL_RUST_SDK_REF: ([0-9a-f]{40})$/m)?.[1];
if (workflowSdkRef !== expected.rustSdkSource) {
  errors.push(`MYCEL_RUST_SDK_REF=${workflowSdkRef || "missing-or-mutable"}`);
}

if (errors.length > 0) {
  console.error("Mycel compatibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Mycel compatibility validated: Console ${expected.consoleRelease}, Rust SDK v${expected.rustSdkVersion}, API/daemon ${expected.apiLine}`,
);
