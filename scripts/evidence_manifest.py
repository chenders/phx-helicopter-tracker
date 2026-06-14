#!/usr/bin/env python3
"""Evidence chain-of-custody manifest generator + verifier.

This project collects flight/position/radio data as evidence for a civil-rights lawsuit.
Evidence is only as good as its provenance: to use an export (CSV/KML/PDF/JSON) as an
exhibit, you must be able to show it hasn't changed since collection. This script produces
a tamper-evident manifest — a SHA-256 of every file plus collection metadata — and can later
re-verify a directory against that manifest to prove (or disprove) integrity.

It NEVER modifies the evidence files; it only reads them and writes a separate manifest.

Usage
-----
  # Generate a manifest for a directory of exports (recursive):
  python scripts/evidence_manifest.py generate exports/2026-06-14/ -o exports/2026-06-14/MANIFEST.json

  # Verify a directory still matches a previously generated manifest:
  python scripts/evidence_manifest.py verify exports/2026-06-14/ -m exports/2026-06-14/MANIFEST.json

Exit codes: 0 = success / all files intact, 1 = verification mismatch, 2 = usage/IO error.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import hashlib
import json
import os
import socket
import subprocess
import sys
from pathlib import Path

CHUNK = 1 << 20  # 1 MiB
MANIFEST_VERSION = 1
DEFAULT_MANIFEST_NAME = "MANIFEST.json"


def _utc_now_iso() -> str:
    return _dt.datetime.now(_dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(CHUNK), b""):
            h.update(block)
    return h.hexdigest()


def _git_commit() -> str | None:
    try:
        out = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=5,
        )
        return out.stdout.strip() if out.returncode == 0 else None
    except Exception:
        return None


def _iter_files(root: Path, manifest_name: str):
    """Yield every regular file under root, sorted for deterministic manifests.

    Skips the manifest file itself so a manifest can live inside the dir it describes.
    """
    if root.is_file():
        yield root
        return
    for p in sorted(root.rglob("*")):
        if p.is_file() and p.name != manifest_name:
            yield p


def _file_record(path: Path, base: Path) -> dict:
    stat = path.stat()
    return {
        "path": str(path.relative_to(base)),
        "sha256": _sha256(path),
        "size_bytes": stat.st_size,
        "modified_utc": _dt.datetime.fromtimestamp(
            stat.st_mtime, _dt.timezone.utc
        ).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def generate(target: Path, out: Path | None) -> int:
    if not target.exists():
        print(f"error: {target} does not exist", file=sys.stderr)
        return 2
    base = target if target.is_dir() else target.parent
    manifest_name = out.name if out else DEFAULT_MANIFEST_NAME

    files = [_file_record(p, base) for p in _iter_files(target, manifest_name)]
    manifest = {
        "manifest_version": MANIFEST_VERSION,
        "generated_utc": _utc_now_iso(),
        "generated_by": os.environ.get("USER") or os.environ.get("USERNAME") or "unknown",
        "host": socket.gethostname(),
        "git_commit": _git_commit(),
        "root": str(target),
        "file_count": len(files),
        "total_bytes": sum(f["size_bytes"] for f in files),
        "hash_algorithm": "sha256",
        "files": files,
    }

    text = json.dumps(manifest, indent=2, sort_keys=False)
    if out:
        out.write_text(text + "\n")
        print(f"Wrote manifest: {out}")
    else:
        print(text)
    print(
        f"  {manifest['file_count']} files, "
        f"{manifest['total_bytes']:,} bytes, generated {manifest['generated_utc']}",
        file=sys.stderr,
    )
    return 0


def verify(target: Path, manifest_path: Path) -> int:
    if not manifest_path.exists():
        print(f"error: manifest {manifest_path} not found", file=sys.stderr)
        return 2
    manifest = json.loads(manifest_path.read_text())
    base = target if target.is_dir() else target.parent
    recorded = {f["path"]: f for f in manifest.get("files", [])}

    current_paths = {
        str(p.relative_to(base))
        for p in _iter_files(target, manifest_path.name)
    }

    changed, missing, added = [], [], []
    for rel, rec in recorded.items():
        fp = base / rel
        if not fp.exists():
            missing.append(rel)
            continue
        if _sha256(fp) != rec["sha256"]:
            changed.append(rel)
    added = sorted(current_paths - set(recorded))

    ok = not (changed or missing or added)
    print(f"Verifying {target} against {manifest_path}")
    print(f"  manifest generated {manifest.get('generated_utc')} "
          f"(git {str(manifest.get('git_commit'))[:8]})")
    print(f"  {len(recorded)} files recorded, {len(current_paths)} present")
    if ok:
        print("  ✓ INTACT — every recorded file is present and unchanged.")
        return 0
    for rel in changed:
        print(f"  ✗ CHANGED:  {rel}")
    for rel in missing:
        print(f"  ✗ MISSING:  {rel}")
    for rel in added:
        print(f"  ! ADDED (not in manifest): {rel}")
    print(f"  INTEGRITY FAILURE: {len(changed)} changed, {len(missing)} missing, "
          f"{len(added)} added.", file=sys.stderr)
    return 1


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)

    g = sub.add_parser("generate", help="hash a directory/file and write a manifest")
    g.add_argument("target", type=Path, help="directory or file of evidence to fingerprint")
    g.add_argument("-o", "--out", type=Path, default=None,
                   help=f"manifest output path (default: print to stdout; conventionally {DEFAULT_MANIFEST_NAME})")

    v = sub.add_parser("verify", help="re-hash and compare against an existing manifest")
    v.add_argument("target", type=Path, help="directory or file to verify")
    v.add_argument("-m", "--manifest", type=Path, required=True, help="manifest to verify against")

    args = parser.parse_args(argv)
    try:
        if args.cmd == "generate":
            return generate(args.target, args.out)
        if args.cmd == "verify":
            return verify(args.target, args.manifest)
    except KeyboardInterrupt:
        return 2
    return 2


if __name__ == "__main__":
    sys.exit(main())
