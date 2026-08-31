# Mycel Console

[![CI](https://github.com/MycelDB/mycel-console/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/MycelDB/mycel-console/actions/workflows/ci.yml)
[![License](https://img.shields.io/github/license/MycelDB/mycel-console)](LICENSE)

Desktop and web console UI for MycelDB daemon and cluster operations.

Mycel Console is a React/Vite application packaged with Tauri. It connects to `myceld` through the Rust SDK and provides operator-facing views for authentication, spaces/domains, graph/query workflows, semantic/inference setup, backups, activity, and raft/cluster reliability.

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

## Security

Please report suspected vulnerabilities privately through GitHub Security Advisories / private vulnerability reporting. See [`SECURITY.md`](SECURITY.md).

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for contribution guidelines, repository boundaries, validation expectations, and AI-assisted contribution guidance. See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) for community standards and [`CHANGELOG.md`](CHANGELOG.md) for release notes.

## License

Licensed under the Apache License, Version 2.0. See [`LICENSE`](LICENSE).
