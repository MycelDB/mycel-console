# Changelog

All notable changes to Mycel Console should be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Before `1.0.0`, UI behavior, Tauri command surfaces, and packaging may still evolve, but user/operator-impacting and compatibility-affecting changes should be called out clearly.

## [Unreleased]

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
