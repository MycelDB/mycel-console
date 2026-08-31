# AGENTS.md

Instructions for AI coding agents working in this repository.

## Project overview

Mycel Console is a React/Vite UI packaged with Tauri. It provides operator-facing views for MycelDB daemon and cluster operations, including authentication, spaces/domains, graph/query workflows, semantic/inference setup, backups, activity, and raft/cluster reliability.

## Repository rules

- Keep frontend UI code under `src/` and Tauri/Rust command bridge code under `src-tauri/`.
- Keep Tauri commands narrow, typed, and explicit; avoid broad filesystem, shell, or network capabilities.
- Do not commit `node_modules/`, `dist/`, or `src-tauri/target/`.
- Do not commit generated SDK/API bindings in this repository.
- Do not hand-edit generated Tauri schemas unless the change explicitly requires it.
- Keep each tranche functional: avoid large rewrites that leave the repo in a partially broken state.

## Safety-critical behavior

- Operator actions that can change data, credentials, access, backups, restores, imports, exports, or cluster state must be explicit and confirmation-oriented.
- Do not add hidden destructive behavior, automatic repair, overwrite, rebalance, merge, or force actions.
- Raft/cluster reliability UI should expose diagnostics first and preserve daemon consistency semantics.
- Backup/restore and divergence workflows must remain explicit operator tooling.
- Authentication and authorization failures should be clear without exposing secrets.
- Do not log or display passwords, bearer tokens, refresh tokens, TLS key material, private data, or confidential infrastructure details.

## Frontend guidance

- Prefer small feature-scoped components with nearby tests.
- Preserve accessibility: labels, roles, keyboard interaction, focus behavior, and readable error messages.
- Keep reusable typography/layout primitives under `src/components/`.
- Keep feature-specific behavior under `src/features/<feature>/`.
- Prefer deterministic tests over brittle timing or snapshot-heavy tests.

## Tauri/Rust guidance

- Keep Rust command handlers in `src-tauri/src/commands/` organized by subsystem.
- Map SDK and daemon errors into safe, actionable UI errors.
- Preserve async cancellation and avoid blocking the async runtime.
- Keep the dependency on `../mycel-rust-sdk` compatible with the current workspace branch.

## Common validation commands

For frontend changes:

```sh
npm test -- --runInBand
npm run build
git diff --check
```

For Tauri/Rust command changes:

```sh
cargo test --manifest-path src-tauri/Cargo.toml
```

For desktop packaging changes, run the relevant platform-specific Tauri build:

```sh
npm run tauri build
```

## Before final response

Summarize:

- files changed
- commands run
- tests/checks passed or not run
- remaining risks or follow-ups
