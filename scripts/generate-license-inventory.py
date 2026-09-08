#!/usr/bin/env python3
"""Generate docs/legal/dependency-license-inventory.tsv for Console npm and Cargo dependencies."""
from __future__ import annotations

import csv
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "legal" / "dependency-license-inventory.tsv"
FIRST_PARTY = {"mycel-console", "mycel", "mycel-sdk", "mycel-proto"}


def npm_rows() -> list[list[str]]:
    lock = json.loads((ROOT / "package-lock.json").read_text())
    rows = []
    for key, package in lock.get("packages", {}).items():
        if not key or not package.get("version"):
            continue
        name = package.get("name") or key.removeprefix("node_modules/")
        scope = "development" if package.get("dev") else "runtime"
        if package.get("optional"):
            scope += ", optional"
        rows.append([
            "npm",
            name,
            package["version"],
            scope,
            package.get("license") or "UNKNOWN",
            "",
            package.get("resolved") or "",
        ])
    return sorted(rows, key=lambda row: (row[0], row[1].lower(), row[2]))


def cargo_rows() -> list[list[str]]:
    metadata = json.loads(subprocess.check_output(["cargo", "metadata", "--locked", "--format-version", "1"], cwd=ROOT / "src-tauri", text=True))
    rows = []
    for package in sorted(metadata["packages"], key=lambda item: (item["name"], item["version"], item.get("source") or "")):
        if not package.get("source") or package["name"] in FIRST_PARTY:
            continue
        rows.append([
            "cargo",
            package["name"],
            package["version"],
            "cargo-lock",
            package.get("license") or "UNKNOWN",
            "",
            package.get("repository") or package.get("homepage") or package.get("documentation") or package.get("source") or "",
        ])
    return rows


def main() -> None:
    rows = npm_rows() + cargo_rows()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerow(["Ecosystem", "Package", "Version", "Scope", "License", "License files", "Source"])
        writer.writerows(rows)


if __name__ == "__main__":
    main()
