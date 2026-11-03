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

Semantic trigger events are mapped to generated `SemanticTriggerEventType` values at the Tauri boundary. The Console never reads or dual-writes legacy trigger strings, preserves unknown numeric projections as unsupported diagnostics, and refuses to save unresolved values.

Machine-readable compatibility metadata is published at [`.release/mycel-compatibility.json`](.release/mycel-compatibility.json). The exact SDK version is pinned in `src-tauri/Cargo.toml`, and CI pins the immutable SDK source revision. Validate the synchronized contract with:

```sh
npm run validate:mycel-compatibility
```

Missing metadata, unknown schema/API lines, mismatched Console or SDK versions, mutable SDK refs, and contradictory compatibility declarations fail closed.

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
