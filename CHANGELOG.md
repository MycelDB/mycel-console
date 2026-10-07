# Changelog

All notable changes to Mycel Console should be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Before `1.0.0`, UI behavior, Tauri command surfaces, and packaging may still evolve, but user/operator-impacting and compatibility-affecting changes should be called out clearly.

## [Unreleased]

## [v0.18.0] - 2026-10-07

### Added

- Added Console support for asynchronous cluster backup operations, including start/status/cancel flow, readiness blockers, operation state display, and backup-set validation (#47).
- Added a guided cluster backup restore workflow that validates backup-set plans and generates explicit offline restore commands without executing destructive restore actions from the UI (#49).

### Changed

- Aligned package, Tauri, and Rust bridge versions with the coordinated MycelDB v0.18.0 release train.

### Compatibility

- Best used with Mycel daemon/API/SDK v0.18.0 for matching async cluster backup and guided restore semantics.
- Restore remains an offline operator workflow; Console guides validation and command generation but does not perform live-cluster restore.

## [v0.17.0] - 2026-09-30

### Changed

- Consolidated GQL query result tabs into `Result` and `Raw JSON`; `Result` now automatically renders graph visualizations, row tables, or statement status based on the response payload (#41).
- Rendered GQL row results as a table with returned columns instead of formatted JSON (#39).
- Updated generated app icon assets with a padded rounded source icon for macOS visual polish (#28).

### Fixed

- Fixed GQL script row extraction so Rows/Result displays returned data instead of statement execution metadata (#35).
- Fixed direct Tauri GQL row object rendering so scalar cell values no longer appear as empty objects (#37).

### Compatibility

- Best used with Mycel daemon/API/SDK v0.17.0 for matching graph checkpoint/index status and query-result behavior.

## [v0.15.2] - 2026-09-19

### Fixed

- Pinned the macOS DMG release workflow to the coordinated `mycel-rust-sdk` `v0.15.0` tag instead of requiring a matching Console patch tag in the SDK repository.

## [v0.15.1] - 2026-09-18

### Fixed

- Updated Console cluster readiness test fixtures for the v0.15.0 Rust SDK dimensioned readiness fields so tag CI passes.

## [v0.15.0] - 2026-09-18

### Added

- Added a searchable node-picker flow for attaching blobs to existing graph nodes (#19).
- Added a shared in-app confirmation dialog component and migrated initial destructive confirmation flows (#26).

### Fixed

- Replaced the inference credential revoke `window.confirm` prompt with a reliable in-app confirmation modal and verified daemon revoke responses before showing success (#21).

## [v0.13.0] - 2026-09-12

### Changed

- Added the improved Mycel Console app icon and refreshed brand styling (#4).

## [v0.12.0] - 2026-09-09

### Added

- Added hybrid lexical + semantic search controls to the Search UI and Tauri command bridge, including weights, candidate counts, metadata filters, and source diagnostics.

## [v0.11.0] - 2026-09-07

### Added

- Tag-triggered macOS DMG release workflow for Intel and Apple Silicon builds, plus Homebrew Cask distribution documentation.
- Added lexical search UI, Tauri command bindings, freshness/status display, and index rebuild controls backed by the Rust SDK lexical Search/Admin APIs.

## [v0.9.0] - 2026-08-31

### Added

- First public-release baseline for Mycel Console.
- Open-source project documentation: README, contributing guide, agent guidance, security policy, code of conduct, changelog, CI workflow, pull request template, issue templates, and gitleaks false-positive baseline.
- Operator-facing UI coverage for authentication, spaces/domains, graph/query workflows, semantic/inference setup, backups, activity, and raft/cluster reliability.

### Changed

- Aligned package, Tauri, and Rust bridge versions for the coordinated MycelDB public-release baseline.
- Updated the Rust bridge lockfile for the `mycel-rust-sdk` low-level crate rename from `mycel-proto` to `mycel`.

## Release notes policy

For each release, add a dated section such as:

```md
## [v0.9.0] - YYYY-MM-DD

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
```

Include notes for user-visible UI changes, Tauri command behavior, configuration, auth/token handling, TLS behavior, backup/restore workflows, raft/cluster workflows, dependency updates, packaging/signing changes, and matching daemon/API/SDK versions.
