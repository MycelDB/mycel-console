# Mycel Console

[![CI](https://github.com/MycelDB/mycel-console/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/MycelDB/mycel-console/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/MycelDB/mycel-console)](LICENSE)

Desktop and web console UI for MycelDB daemon and cluster operations.

Mycel Console is a React/Vite application packaged with Tauri. It connects to `myceld` through the Rust SDK and provides operator-facing views for authentication, spaces/domains, graph/query workflows, semantic/inference setup, backups, activity, and raft/cluster reliability. Semantic generation rules use dedicated list, create, and edit pages; semantic-assisted queries remain in Search.

## Compatibility

Console release lines are certified with one exact Rust SDK contract and matching Mycel API/daemon line. A successful connection or health check is not compatibility evidence.

| Console line | Rust SDK contract | Supported daemon/API line | Notes |
| --- | --- | --- | --- |
| `v0.20.x` | `v0.20.x` | `v0.20.x` | Does not support the v0.21 enum-only semantic trigger contract. |
| `v0.21.1` | exact `mycel-sdk v0.21.1` at `f8c9b1d95d976f8b12b0acba22cba4a1f81d44a7` | `v0.21.x` | Uses channel-owned Search queries and enum-only semantic trigger events. Older daemon lines are not certified. |
| `v0.22.x` | exact `mycel-sdk v0.22.0` at `87de6c921dbc175bf6b2dc20213855b58e2912c2` | `v0.22.x` | Adds provider-budget configuration and certifies the v0.22 API/daemon contract. |
| `v0.23.x` | exact `mycel-sdk v0.23.0` at `ab54de0ad8c17819a0ad67bd39cffc46a3c85454` | `v0.23.x` | Adds hybrid semantic projection consistency controls and per-channel search diagnostics. Older daemon lines are not certified. |
| `v0.24.x` | exact `mycel-sdk v0.24.0` at `7030f0e0d6cef6309be87fd21cbbf5455018ebe6` | `v0.24.x` | Adds backup validation, quiesce admission, and restored-derived readiness evidence for the v0.24 production backup/restore contract. Older daemon lines are not certified. |
| `v0.25.x` | exact `mycel-sdk v0.25.0` at `e0499e4aa11fc36cee4a2e34063ea762893ed1ef` | `v0.25.x` | Uses the repository-only, deployment-wide backup API. Local backup files/trigger/list/delete and cluster-specific backup helper names are not part of this Console line. |

Semantic trigger events are mapped to generated `SemanticTriggerEventType` values at the Tauri boundary. The Console never reads or dual-writes legacy trigger strings, preserves unknown numeric projections as unsupported diagnostics, and refuses to save unresolved values. Search uses strict semantic projection consistency by default; relaxed bounded-stale or best-effort policies are opt-in per hybrid request and affect retrieval freshness only, not graph authorization or visibility.

Machine-readable compatibility metadata is published at [`.release/mycel-compatibility.json`](.release/mycel-compatibility.json). The exact SDK version is pinned in `src-tauri/Cargo.toml`, and CI pins the immutable SDK source revision. Validate the synchronized contract with:

```sh
npm run validate:mycel-compatibility
```

Missing metadata, unknown schema/API lines, mismatched Console or SDK versions, mutable SDK refs, and contradictory compatibility declarations fail closed.

## Backup UX model

Console v0.25 makes repository-backed backup sets the only operator-facing backup artifact. The Backups page supports repository catalog CRUD/validation, deployment-wide backup start/cancel/operation history, repository backup-set inventory, validation, explicit-confirmation retention actions, observability, and read-only restore planning. It intentionally does not expose daemon-local backup files, local output directories, local backup trigger/status/list/delete calls, or destructive restore execution.

Credential handling is reference-only: Console may collect environment variable names, Kubernetes Secret names, external secret references, KMS key references, and TLS CA references, but it must not collect, render, persist, or log raw object-store credentials.

## Repository layout

- `src/` — React application, feature modules, reusable components, and UI tests.
- `src-tauri/` — Tauri shell and Rust command bridge to `mycel-sdk`.
- `docs/design/` — current console design notes.
- `docs/implementation_plans/` — implementation plans and migration notes.
- `dist/` — generated frontend build output; ignored by git.

## Prerequisites

- Node.js and npm compatible with the checked-in `package-lock.json`.
- Rust stable toolchain for Tauri/Rust bridge tests.
- A sibling checkout of `mycel-rust-sdk` at `../mycel-rust-sdk`, or an adjusted local dependency path in `src-tauri/Cargo.toml`.
- Platform-specific Tauri prerequisites when building desktop bundles. See the Tauri setup guide for OS-specific packages.

## Install

```sh
npm ci
```

## Develop

Run the Vite dev server:

```sh
npm run dev
```

Run the Tauri desktop app in development mode:

```sh
npm run tauri dev
```

## Validate

Frontend tests:

```sh
npm test -- --runInBand
```

Frontend production build:

```sh
npm run build
```

Tauri/Rust bridge tests:

```sh
cargo test --manifest-path src-tauri/Cargo.toml
```

## Build

Build the frontend assets:

```sh
npm run build
```

Build a Tauri desktop bundle:

```sh
npm run tauri build
```

## macOS distribution

Tagged `v*` releases build Intel and Apple Silicon DMGs and attach them to the matching GitHub Release. The Homebrew Cask install path is:

```sh
brew install --cask myceldb/tap/mycel-console
```

See [`docs/release/homebrew-cask.md`](docs/release/homebrew-cask.md) for release asset names, cask update steps, and the current unsigned/notarization status.

## Security

Please report suspected vulnerabilities privately through GitHub Security Advisories / private vulnerability reporting. See [`SECURITY.md`](SECURITY.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines, repository boundaries, validation expectations, and AI-assisted contribution guidance. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community standards and [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## License

Licensed under the Apache License, Version 2.0. See [`LICENSE`](LICENSE).
