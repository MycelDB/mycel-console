# Changelog

All notable changes to Mycel Console should be documented in this file.

This project follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Before `1.0.0`, UI behavior, Tauri command surfaces, and packaging may still evolve, but user/operator-impacting and compatibility-affecting changes should be called out clearly.

## [Unreleased]

### Added

- Added direct semantic search with typed label, node-ID, and property eligibility filters, explicit null-versus-missing values, opaque continuation pagination, and daemon-provided candidate diagnostics (#65).
- Added expandable semantic result provenance showing exact generation, graph revision, vector-space, configured-route, and actual-route evidence with safe copy support (#66).

### Compatibility

- Direct semantic search filters, continuation pagination, and result provenance require Mycel API/daemon v0.21.0 or later and Mycel Rust SDK v0.21.1 or later. Results from older daemons remain usable when provenance is absent.

## [v0.21.0] - 2026-10-29

### Added

- Added an accessible Show/Hide control to the login password field so operators can verify entered credentials without changing login behavior (#96).
- Added list-first Semantic Rules routes for rule inventory, dedicated creation, and identity-backed editing, with editor-only catalog loading and in-app unsaved-change protection (#78).
- Added an accessible semantic trigger-event checkbox group backed by the enum-only API field, with fail-closed handling of unknown projections (#75).
- Added catalog-backed semantic-rule vector-store selection using authoritative UUID values and unique display-name labels, including search, disabled/empty states, legacy-name disambiguation, and unavailable-reference preservation (#76).

### Changed

- Replaced the shared Models catalog tab with URL-addressable counted Generative, Embedding, and conditional Other tabs, each with kind-specific filters, columns, loading, and empty states (#89).
- Aligned the Search page header with the Data navigation section while retaining Search as the page title and sidebar label (#95).
- Coordinated Admin and data RPC authentication through one rotating-token source and refresh lock, routed generated-client calls through guarded refresh/retry handling, and made terminal refresh-session failures return operators to login (#82, #83).
- Replaced free-text space-owner entry with a capability-aware, paginated active-principal selector showing name-only options backed by authoritative principal IDs, while retaining an explicit manual username fallback (#80).
- Renamed the Intelligence navigation entry from Semantic to Semantic Rules and removed semantic search controls from rule administration; search remains under the Search feature. The retired `/intelligence/semantic` route is not redirected (#78).
- Made Semantic Rules scope cells name-first while preserving UUID-backed links, accessible exact-ID context, safe ID fallbacks, and concise collision disambiguation (#84).
- Split the inference model catalog into type-aware generative, embedding, and fallback tables with relevant limits, vector metadata, and defensive missing-value presentation (#88).
- Updated OpenAI profile and setup-wizard defaults to the concrete supported `openai/gpt-5.6-terra` catalog key instead of the removed `openai/gpt-5.6-mini` example (#261 in `mycel`).
- Search now provides separate lexical-syntax and semantic-natural-language inputs in hybrid mode, places text only in the corresponding channel options, and carries bound continuation tokens without populating the removed top-level fallback (#64).

### Fixed

- Refresh package history and authoritative model catalog data after successful inference package imports, including explicit retry handling when a follow-up read fails (#81).

### Compatibility

- Search requires a daemon and Rust SDK implementing channel-specific queries; older top-level-query-only Search contracts are not supported.
- Semantic rule requests and responses require the enum-only `trigger.events` contract. The Console no longer reads or dual-writes legacy trigger strings and requires matching regenerated SDK and daemon versions.
- Older, unauthorized, or temporarily unavailable vector-store catalogs are surfaced explicitly. Existing UUID or legacy key references remain unchanged during unrelated edits; new rules require selection of an enabled UUID-backed store.
- Semantic-rule edits preserve opaque embedding metadata and daemon-owned provider-budget policy fields even though this Console release does not expose budget configuration controls.

## [v0.20.0] - 2026-10-20

### Changed

- Aligned package and Tauri versions with the coordinated MycelDB v0.20.0 release train.
- Updated macOS DMG builds to use the GitHub-source-only `mycel-rust-sdk v0.20.1` correction release.
- Updated the Rust command bridge for the v0.20 commit request fields while preserving the existing non-idempotent Console commit behavior.

### Compatibility

- Best used with Mycel daemon v0.20.0 and API/SDK v0.20.1 for matching repeatable-read contract documentation and durable graph transaction commit idempotency.
- macOS DMGs remain unsigned and unnotarized; Gatekeeper may require explicit operator approval.

## [v0.19.0] - 2026-10-09

### Changed

- Aligned package, Tauri, and Rust bridge versions with the coordinated MycelDB v0.19.0 release train.
- Aligned space access UI with daemon identity scoped grants: actual space ownership is shown separately from delegated roles/capabilities, `space.owner` is no longer offered as a grantable role, and the graph query console identifies the effective query principal (#55).
- Constrained long signed-in usernames in the sidebar session card with truncation and a full-value tooltip (#54).
- Added vertical scrolling to the left sidebar so navigation and session actions remain reachable in short windows (#53).

### Compatibility

- Best used with Mycel daemon/API/SDK v0.19.0 for matching identity scoped space access semantics.

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
