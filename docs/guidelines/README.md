# React engineering guidelines

This repository synchronizes the canonical React standard from:

- Project: `reacticity/engineering/development`
- Path: `docs/guidelines/react_coding_guidelines.md`
- Version: `1.0.0`
- Pinned commit: `0f819aec9e1c7746d6dde5224fb61eca95344616`

The synchronized copy and machine-readable provenance are:

- `docs/guidelines/react_coding_guidelines.md`
- `docs/guidelines/react_coding_guidelines.source.json`

## Check for drift

```sh
scripts/sync-react-coding-guidelines.sh --check
```

The check is non-mutating. It uses `REACT_CODING_GUIDELINES_SOURCE_FILE` when
set, which is useful for credential-free local checks:

```sh
REACT_CODING_GUIDELINES_SOURCE_FILE=/path/to/react_coding_guidelines.md \
  scripts/sync-react-coding-guidelines.sh --check
```

## Adopt an intentional update

1. Review the canonical change and identify its immutable full commit SHA.
2. Update `ref` and `version` together in
   `docs/guidelines/react_coding_guidelines.source.json`.
3. Run the update with a read-only GitLab credential:

   ```sh
   REACTICITY_ENGINEERING_TOKEN='read-only-token' \
     scripts/sync-react-coding-guidelines.sh --update
   ```

   `CI_JOB_TOKEN` is preferred automatically when running in GitLab CI.
4. Run `scripts/sync-react-coding-guidelines.sh --check`, review the exact
   synchronized diff, and submit the provenance and copy together in a pull
   request.

The synchronization script never prints the credential or private response
content. Do not commit credentials or use a moving branch/tag as the machine
pin.
