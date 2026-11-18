"""Mirror only presentation assets; preserve the homepage and other experiments byte-for-byte."""
from __future__ import annotations

import hashlib
from pathlib import Path
import re
import shutil

ROOT = Path(__file__).resolve().parents[1]
ASSETS = (
    "presenter.html", "presenter-en.html", "presenter.css", "presenter-en.css",
    "presenter.js", "presenter-en.js", "presenter-copy.js", "reference-validation-results.js",
    "media/presenter-closing-22.png", "media/presenter-closing-23.png",
)
REFERENCES = re.compile(r'(\b(?:href|src)="\./)([a-zA-Z0-9-]+\.(?:css|js))(?:\?v=[a-f0-9]+)?(")')


def main():
    out = ROOT / "docs"
    for name in ASSETS:
        (out / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / "web" / name, out / name)
    for name in ("presenter.html", "presenter-en.html"):
        page = out / name

        def version(match):
            asset = out / match[2]
            if not asset.is_file():
                raise ValueError(f"Missing presentation dependency: {asset.name}")
            key = hashlib.sha256(asset.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:12]
            return f"{match[1]}{match[2]}?v={key}{match[3]}"

        page.write_text(REFERENCES.sub(version, page.read_text(encoding="utf-8")), encoding="utf-8")
    print(f"Updated {len(ASSETS)} presentation assets only.")


if __name__ == "__main__":
    main()
