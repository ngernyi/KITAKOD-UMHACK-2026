"""Convert the three GigShift documentation Markdown files to .docx.

Run from the repo root:

    python scripts/md_to_docx.py

Requires ``pypandoc-binary`` (which ships its own pandoc binary):

    pip install pypandoc-binary

The script is idempotent: it overwrites existing .docx files.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pypandoc

REPO_ROOT = Path(__file__).resolve().parent.parent
DOC_DIR = REPO_ROOT / "documentation"

TARGETS = [
    "UMHackathon2026 Product Requirement Documentation",
    "UMHackathon2026 System Analysis Documentation",
    "UMHackathon2026 Testing Analysis Documentation (Preliminary)",
]


def convert_one(base_name: str) -> Path:
    md_path = DOC_DIR / f"{base_name}.md"
    docx_path = DOC_DIR / f"{base_name}.docx"
    if not md_path.exists():
        raise FileNotFoundError(f"Missing source: {md_path}")
    pypandoc.convert_file(
        str(md_path),
        "docx",
        outputfile=str(docx_path),
        extra_args=["--toc", "--toc-depth=3", "--standalone"],
    )
    return docx_path


def main() -> int:
    print(f"pandoc version: {pypandoc.get_pandoc_version()}")
    for base in TARGETS:
        out = convert_one(base)
        size_kb = out.stat().st_size / 1024
        print(f"  wrote {out.relative_to(REPO_ROOT)}  ({size_kb:,.1f} KB)")
    print("done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
