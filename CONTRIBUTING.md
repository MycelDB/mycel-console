# Contributing to Mycel Console

Thank you for contributing to Mycel Console. This guide describes expectations for issues, pull requests, tests, documentation, licensing, and AI-assisted work.

Mycel Console is preparing for an open-source release under the Apache License 2.0. The guidance below follows common practices used by Apache-licensed projects: clear issue discussion, small reviewable pull requests, contributor ownership of submitted work, explicit licensing expectations, and reproducible validation.

## Code of conduct

Be respectful, constructive, and patient. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards and reporting guidance.

## Licensing and contribution rights

Mycel Console is intended to be released under the Apache License, Version 2.0. By submitting a contribution, you agree that your contribution may be distributed under the same license.

Only submit work that you have the right to contribute. Do not copy code, configuration, tests, documentation, generated assets, model output, or design assets from sources with incompatible licenses. If your change adapts prior work, identify the source and license in the pull request.

If the project later adopts a CLA, DCO, or additional release-time provenance process, maintainers will document it before requiring it for new contributions.

## Before starting work

For small fixes, opening a pull request directly is fine. For larger changes, please open or comment on an issue first so maintainers can discuss scope, approach, compatibility, and validation expectations.

Open an issue first for changes that affect:

- authentication, authorization, token handling, or credential storage;
- Tauri command boundaries, filesystem access, shell access, or app permissions;
- raft/cluster reliability views, backup/restore workflows, or destructive operator actions;
- navigation, information architecture, or major UI patterns;
- API contracts, SDK behavior, or cross-repository dependency versions;
- generated assets, packaging, signing, or release behavior.

## Development setup

Install frontend dependencies:

```sh
npm ci
```

The Tauri command bridge depends on the Rust SDK via a sibling checkout:

```text
../mycel-rust-sdk/crates/mycel-sdk
```

Ensure the sibling `mycel-rust-sdk` checkout is on a compatible branch or tag before running Rust/Tauri checks.

## Validation

Use the narrowest meaningful validation first, then broaden as risk increases.

Common checks:

```sh
npm test -- --runInBand
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
git diff --check
```

For docs-only changes, run `git diff --check` and inspect rendered Markdown when practical.

For Tauri or release-package changes, also run the relevant platform-specific Tauri build and document the OS used:

```sh
npm run tauri build
```

## Repository guidance for agents and contributors

Read [AGENTS.md](AGENTS.md) before making changes. It captures project-specific architecture and safety rules for both humans and AI coding agents.

Key expectations include:

- keep UI behavior safe for operators and explicit for risky actions;
- keep Tauri commands narrow and typed;
- do not expose secrets, tokens, passwords, TLS keys, or private data in logs, UI errors, screenshots, fixtures, or tests;
- prefer small, feature-scoped components and tests;
- preserve daemon/API semantics rather than hiding auth, retry, backup, restore, or raft consistency details.

## Generated code and artifacts

Do not commit generated build artifacts unless the change explicitly requires it and maintainers agree.

In particular:

- do not commit `node_modules/`, `dist/`, or `src-tauri/target/`;
- do not hand-edit generated Tauri schema files;
- do not commit generated SDK/API bindings here;
- update source configuration, SDK crates, or generation scripts instead.

After running generators or builds, inspect the diff carefully and remove unintended artifacts before committing.

## Pull request expectations

Keep pull requests small, focused, and reviewable. A good PR should include:

- a clear summary of the user/operator/developer problem being solved;
- a concise explanation of the approach;
- tests or a reason tests are not applicable;
- screenshots or short screen recordings for user-visible UI changes;
- documentation updates when behavior, setup, operations, or APIs change;
- notes about compatibility, migrations, dependency updates, or follow-up work;
- exact commands run and their results.

Avoid mixing unrelated refactors with behavior changes. If a refactor is needed, prefer a separate preparatory PR.

## Security and sensitive information

Do not include secrets, credentials, tokens, private keys, production data, private customer/user data, screenshots with sensitive content, or confidential infrastructure details in issues, PRs, tests, fixtures, logs, screenshots, or AI prompts.

If you believe you found a vulnerability, do not open a public issue with exploit details. Use the private security reporting guidance in [SECURITY.md](SECURITY.md), or contact the maintainers privately until that channel is available.

## AI-assisted contributions

AI tools are allowed, but contributors remain responsible for everything they submit. Before opening a PR, review any AI-assisted changes for correctness, security, licensing, maintainability, accessibility, and test coverage.

Do not paste secrets, credentials, private user data, proprietary third-party code, screenshots with sensitive content, or confidential operational details into AI tools. AI-assisted changes must follow the same project standards as any other contribution, including [AGENTS.md](AGENTS.md), applicable tests, and licensing requirements.

## Review and merge

Maintainers may request changes for correctness, maintainability, accessibility, tests, documentation, compatibility, safety, or project scope. Approval of a PR does not guarantee immediate merge; maintainers may batch or sequence changes around release, migration, or operational risk.

Thank you for helping make Mycel Console reliable, understandable, and safe to operate.
