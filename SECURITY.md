# Security Policy

## Reporting a vulnerability

Please report suspected security vulnerabilities privately through GitHub Security Advisories / private vulnerability reporting for this repository.

Use the repository's **Security** tab and choose **Report a vulnerability**. Do not open a public issue with vulnerability details.

If private vulnerability reporting is not visible, open a public issue that says only that you need a private security reporting channel. Do not include exploit details, affected secrets, proof-of-concept code, private data, screenshots with sensitive content, or infrastructure details in the public issue.

## What to include

When possible, include:

- The affected Mycel Console version, commit, release tag, or build.
- The affected UI area, Tauri command, dependency, configuration path, or deployment mode.
- A description of the vulnerability and expected impact.
- Reproduction steps or proof-of-concept details.
- Whether the issue affects authentication, authorization, token handling, TLS/mTLS, Tauri permissions, filesystem access, command execution, backup/restore, import/export, raft/cluster operations, or private data display.
- Any known mitigations or workarounds.

## Scope

Security reports may apply to Mycel Console when behavior could expose data, weaken authentication or authorization, mishandle credentials, bypass TLS expectations, expose unsafe Tauri capabilities, leak sensitive UI data, misrepresent daemon authorization semantics, or enable unintended destructive operator actions.

Vulnerabilities in the daemon, API contract, SDKs, deployment charts, or downstream applications may be redirected to the corresponding MycelDB repository after initial triage.

## Sensitive information

Do not include secrets, passwords, bearer tokens, refresh tokens, TLS private keys, production data, private user data, screenshots with sensitive content, or confidential infrastructure details in public issues, pull requests, logs, screenshots, test fixtures, or AI prompts.
