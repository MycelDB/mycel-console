## Summary

<!-- What changed and why? -->

## UI and compatibility

- [ ] This change is backward compatible for UI behavior, Tauri commands, configuration, and packaging.
- [ ] This change may be incompatible and has maintainer approval.
- [ ] README/docs/examples are updated if public usage, setup, operations, or APIs changed.
- [ ] Screenshots or screen recordings are included for user-visible UI changes.

## Safety-sensitive areas

- [ ] Authentication, authorization, TLS/mTLS, tokens, and secret handling are unaffected or documented.
- [ ] Backup/restore, import/export, and raft/cluster workflows remain explicit and safe by default.
- [ ] No hidden destructive behavior, automatic repair, overwrite, rebalance, merge, or force action was added.
- [ ] Tauri commands and permissions remain narrow, typed, and justified.

## Repository boundaries

- [ ] UI code remains under `src/` and Tauri/Rust command bridge code remains under `src-tauri/`.
- [ ] SDK/API contract changes are not added here; they belong in the corresponding MycelDB repository.
- [ ] Generated build artifacts such as `node_modules/`, `dist/`, or `src-tauri/target/` were not committed.
- [ ] Secrets, tokens, passwords, TLS key material, private data, and confidential infrastructure details are not logged or exposed.

## Validation

- [ ] `npm test -- --runInBand` passes.
- [ ] `npm run build` passes.
- [ ] `cargo test --manifest-path src-tauri/Cargo.toml` passes for Tauri/Rust changes.
- [ ] Platform-specific `npm run tauri build` passes or is not applicable.

## Notes

<!-- Commands run, migration notes, dependency/version impact, screenshots, or follow-up work. -->
