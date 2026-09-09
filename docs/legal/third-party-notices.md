# Third-party notices and dependency license inventory

This repository is licensed under the Apache License, Version 2.0. The project also uses third-party open source dependencies. This document records the current license inventory and the release expectations for preserving upstream notices.

Tracked issue: MycelDB/mycel-console#5

## Inventory

The generated inventory is committed at:

```text
docs/legal/dependency-license-inventory.tsv
```

It includes package name, resolved version, dependency ecosystem, scope, declared or detected license, detected license files when available, and upstream source/resolution metadata.

Current detected license summary:

- `(Apache-2.0 OR MPL-1.1)`: 1
- `(MIT OR Apache-2.0) AND Unicode-3.0`: 1
- `(MIT OR CC0-1.0)`: 2
- `0BSD`: 1
- `0BSD OR MIT OR Apache-2.0`: 1
- `Apache-2.0`: 17
- `Apache-2.0 / MIT`: 1
- `Apache-2.0 AND ISC`: 1
- `Apache-2.0 AND MIT`: 1
- `Apache-2.0 OR ISC OR MIT`: 3
- `Apache-2.0 OR MIT`: 46
- `Apache-2.0 WITH LLVM-exception`: 1
- `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT`: 5
- `Apache-2.0/MIT`: 3
- `BSD-2-Clause`: 4
- `BSD-2-Clause OR Apache-2.0 OR MIT`: 2
- `BSD-3-Clause`: 17
- `BSD-3-Clause AND MIT`: 1
- `BSD-3-Clause OR MIT OR Apache-2.0`: 2
- `BSD-3-Clause/MIT`: 1
- `BlueOak-1.0.0`: 4
- `CC-BY-4.0`: 1
- `CC0-1.0 OR MIT-0 OR Apache-2.0`: 1
- `ISC`: 46
- `MIT`: 595
- `MIT AND BSD-3-Clause`: 1
- `MIT OR Apache-2.0`: 219
- `MIT OR Apache-2.0 OR LGPL-2.1-or-later`: 2
- `MIT OR Apache-2.0 OR Zlib`: 2
- `MIT OR Zlib OR Apache-2.0`: 1
- `MIT-0`: 1
- `MIT/Apache-2.0`: 19
- `MPL-2.0`: 5
- `Unicode-3.0`: 18
- `Unlicense OR MIT`: 4
- `Unlicense/MIT`: 2
- `Zlib`: 1
- `Zlib OR Apache-2.0 OR MIT`: 17

## Covered ecosystems

- npm frontend/build dependencies from `package-lock.json`.
- Rust/Tauri dependencies from `src-tauri/Cargo.lock` via `cargo metadata --locked`.

## Notice handling

- Keep upstream copyright, license, and NOTICE files intact in source checkouts and vendored/generated material.
- Do not remove license headers from generated code or copied third-party source.
- Binary, Docker, SDK, and desktop distributions should include this repository's `LICENSE` and link to or include this third-party notice document.
- If a dependency declares a license outside the existing allowlist, review it before release and update this document with any required attribution or redistribution notes.
- This inventory is a release-hygiene aid and is not legal advice.

## Regeneration

Run `python3 scripts/generate-license-inventory.py` from the repository root. The script reads `package-lock.json` and runs `cargo metadata --locked` in `src-tauri`; it does not require external Python packages.

After regenerating, review changes to `docs/legal/dependency-license-inventory.tsv`, update the summary above if needed, and run the normal repository validation before opening a release PR.

## Distribution guidance

Desktop app/DMG releases should include or link to this notice document and inventory. If a future installer embeds bundled notice files, generate them from this inventory during the release workflow.
