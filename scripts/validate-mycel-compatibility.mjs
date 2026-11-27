import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const manifest = JSON.parse(read(".release/mycel-compatibility.json"));
const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const tauriConfig = JSON.parse(read("src-tauri/tauri.conf.json"));
const cargoToml = read("src-tauri/Cargo.toml");
const workflow = read(".github/workflows/ci.yml");
const releaseWorkflow = read(".github/workflows/release-macos-dmg.yml");
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
const actualManifestKeys = Object.keys(manifest).sort((left, right) =>
  left.localeCompare(right),
);
if (JSON.stringify(actualManifestKeys) !== JSON.stringify(expectedManifestKeys)) {
  errors.push(`manifest keys ${JSON.stringify(actualManifestKeys)} do not match schema v1`);
}

const expected = {
  consoleVersion: "0.26.0",
  consoleRelease: "v0.26.0",
  consoleSource: "03b494e7fce76428292a56c8036f6a4e1a58f4c8",
  rustSdkVersion: "0.26.0",
  rustSdkSource: "33c7e643b679111398dcaf8a340572cc3cce56f5",
  apiLine: "0.26",
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
const expectedIncompatible = [
  {
    line: "0.20",
    contracts: [
      "search-channel-owned-query-v1",
      "semantic-trigger-events-enum-v1",
    ],
  },
  {
    line: "0.22",
    contracts: ["semantic-projection-consistency-v1"],
  },
  {
    line: "0.23",
    contracts: [
      "repository-backed-backup-restore-v1",
      "backup-quiesce-admission-evidence-v1",
      "restored-derived-readiness-v1",
    ],
  },
  {
    line: "0.24",
    contracts: [
      "repository-only-backup-api-v1",
      "deployment-wide-backup-api-v1",
    ],
  },
];
if (JSON.stringify(incompatible) !== JSON.stringify(expectedIncompatible)) {
  errors.push(`incompatible_daemon_api_lines=${JSON.stringify(incompatible)}`);
} else {
  for (const entry of incompatible) {
    if (manifest.supported_daemon_api_lines.includes(entry.line)) {
      errors.push(`daemon line ${entry.line} is both supported and incompatible`);
    }
  }
}

for (const [artifact, version] of [
  ["package.json", packageJson.version],
  ["package-lock.json", packageLock.version],
  ["package-lock.json root package", packageLock.packages?.[""]?.version],
  ["Tauri bundle", tauriConfig.version],
  ["Console Cargo package", cargoToml.match(/^version = "([^"]+)"/m)?.[1]],
]) {
  if (version !== expected.consoleVersion) errors.push(`${artifact} version=${version}`);
}

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

for (const [name, content] of [["CI", workflow], ["release", releaseWorkflow]]) {
  const workflowSdkRef = content.match(/^  MYCEL_RUST_SDK_REF: ([0-9a-f]{40})$/m)?.[1];
  if (workflowSdkRef !== expected.rustSdkSource) {
    errors.push(`${name} MYCEL_RUST_SDK_REF=${workflowSdkRef || "missing-or-mutable"}`);
  }
}

if (errors.length > 0) {
  console.error("Mycel compatibility validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Mycel compatibility validated: Console ${expected.consoleRelease}, Rust SDK v${expected.rustSdkVersion}, API/daemon ${expected.apiLine}`,
);
