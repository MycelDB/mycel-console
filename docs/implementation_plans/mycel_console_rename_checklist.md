# `mycel-console` Rename Checklist

This checklist prepares the later rename from `mycel-console` to `mycel-console`. Do not execute these steps during CC8; the current application still ships as `mycel-console`.

## Release Identity

- Rename the npm package after release coordination.
- Rename Tauri product metadata, bundle identifiers, and window titles.
- Rename binaries and platform-specific artifacts.
- Update release notes, changelog entries, and download artifact names.

## Repository and CI

- Rename repository paths and project references when the repository move is approved.
- Update CI workflow names, cache keys, artifact paths, and badge URLs.
- Update scripts that assume `mycel-console` paths.
- Update dependency and release automation references.

## Documentation

- Replace user-facing prose references to the app name.
- Preserve historical release references where they describe old artifacts.
- Update screenshots, diagrams, and quick-start commands.
- Keep technical identifiers accurate until their owning files are renamed.

## Source

- Continue using `console` for new internal capability-shell types and components.
- Keep app branding strings isolated in `src/features/console/branding.ts` until the rename occurs.
- Avoid broad file moves unless they are part of the explicit rename tranche.

## Validation

- Run frontend tests and build.
- Run Tauri `cargo check` with the expected `MYCEL_API_ROOT` override.
- Verify packaged app metadata and window titles on each target platform.
