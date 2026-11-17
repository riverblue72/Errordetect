"""Build the GitHub Pages site in docs/ from the editable web/ source."""

from __future__ import annotations

import json
import hashlib
import re
import shutil
import sys
import tempfile
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model"))
from model import DATA, MODEL  # noqa: E402
from sample_catalog import test_rows  # noqa: E402


WEB = ROOT / "web"
OUT = ROOT / "docs"
ASSET_REF = re.compile(r'(?P<prefix>\b(?:href|src)="\./)(?P<name>[a-zA-Z0-9-]+\.(?:css|js))(?P<suffix>")')


def fingerprint_page_assets(out: Path) -> None:
    """Force browsers to fetch new CSS and JS after each Pages deployment."""
    versions = {
        asset.name: hashlib.sha256(asset.read_bytes().replace(b"\r\n", b"\n")).hexdigest()[:12]
        for asset in out.iterdir()
        if asset.suffix in {".css", ".js"}
    }
    for page in out.glob("*.html"):
        markup = page.read_text(encoding="utf-8")

        def version_ref(match: re.Match[str]) -> str:
            name = match.group("name")
            if name not in versions:
                raise SystemExit(f"Missing page asset: {name}")
            return f'{match.group("prefix")}{name}?v={versions[name]}{match.group("suffix")}'

        page.write_text(ASSET_REF.sub(version_ref, markup), encoding="utf-8")


def build(out: Path) -> tuple[int, int]:
    if not MODEL.exists():
        raise SystemExit("Train the reference model with model.py first")
    for directory in ("samples", "landscape", "method", "next-method", "next-samples", "feedback", "ablation", "scenario", "review-frames", "unlabeled-demo", "media"):
        (out / directory).mkdir(parents=True, exist_ok=True)
    for source, target in [
        ("landing.html", "index.html"),
        ("inspector.html", "inspect.html"),
        ("next-inspector.html", "next-inspect.html"),
        ("review.html", "review.html"),
        ("interval.html", "interval.html"),
        ("demo.html", "demo.html"),
        ("presenter.html", "presenter.html"),
        ("presenter.css", "presenter.css"),
        ("presenter.js", "presenter.js"),
        ("presenter-data.js", "presenter-data.js"),
        ("presenter-copy.js", "presenter-copy.js"),
        ("field-demo.html", "field-demo.html"),
        ("field-demo.css", "field-demo.css"),
        ("field-demo.js", "field-demo.js"),
        ("field-shift-data.js", "field-shift-data.js"),
        ("field-reference.html", "field-reference.html"),
        ("field-reference.js", "field-reference.js"),
        ("presenter-en.html", "presenter-en.html"),
        ("presenter-en.css", "presenter-en.css"),
        ("presenter-en.js", "presenter-en.js"),
        ("site.css", "site.css"),
        ("pipeline.css", "pipeline.css"),
        ("improvements.css", "improvements.css"),
        ("theme.css", "theme.css"),
        ("demo-entry.css", "demo-entry.css"),
        ("ablation.js", "ablation.js"),
        ("landing-nav.js", "landing-nav.js"),
        ("review-routing.js", "review-routing.js"),
        ("next-app.js", "next-app.js"),
        ("review.js", "review.js"),
        ("review.css", "review.css"),
        ("interval.js", "interval.js"),
        ("interval.css", "interval.css"),
        ("demo.css", "demo.css"),
        ("demo.js", "demo.js"),
        ("favicon.svg", "favicon.svg"),
    ]:
        shutil.copyfile(WEB / source, out / target)
    # Retain the repository's earlier review/report tools when their sources exist.
    for name in ("analyzer-worker.js", "anomaly-core.js", "method-studio.css",
                 "report.html", "report.js", "workspace-store.js", "workspace.css",
                 "workspace.html", "workspace.js"):
        if (WEB / name).is_file():
            shutil.copyfile(WEB / name, out / name)
    (out / ".nojekyll").touch()
    shutil.copyfile(WEB / "app.js", out / "app.js")
    for asset in (WEB / "method").iterdir():
        if asset.suffix in {".gif", ".png"}:
            shutil.copyfile(asset, out / "method" / asset.name)
    for asset in (WEB / "next-method").iterdir():
        if asset.suffix in {".gif", ".png", ".webp"}:
            shutil.copyfile(asset, out / "next-method" / asset.name)
    for asset in (WEB / "next-samples").iterdir():
        if asset.suffix in {".jpg", ".png", ".json"}:
            shutil.copyfile(asset, out / "next-samples" / asset.name)
    for asset in (WEB / "ablation").iterdir():
        if asset.suffix in {".png", ".json", ".svg"}:
            shutil.copyfile(asset, out / "ablation" / asset.name)
    for asset in (WEB / "scenario").iterdir():
        if asset.suffix in {".jpg", ".png", ".json"}:
            shutil.copyfile(asset, out / "scenario" / asset.name)
    for asset in (WEB / "review-frames").iterdir():
        if asset.suffix in {".jpg", ".json"}:
            shutil.copyfile(asset, out / "review-frames" / asset.name)
    for asset in (WEB / "unlabeled-demo").iterdir():
        if asset.suffix in {".jpg", ".png", ".json"}:
            shutil.copyfile(asset, out / "unlabeled-demo" / asset.name)
    shutil.copyfile(WEB / "feedback" / "meeting-illustration.png", out / "feedback" / "meeting-illustration.png")
    shutil.copyfile(WEB / "media" / "recorded-run-1080p.gif", out / "media" / "recorded-run-1080p.gif")
    shutil.copyfile(WEB / "media" / "recorded-run-ko-125x-1080p.mp4", out / "media" / "recorded-run-ko-125x-1080p.mp4")

    saved = np.load(MODEL)
    calibration_file = ROOT / "model" / "browser_calibration.json"
    calibration = json.loads(calibration_file.read_text(encoding="utf-8")) if calibration_file.exists() else None
    payload = {
        "bank": saved["bank"].astype(np.float32).reshape(-1).tolist(),
        "center": saved["center"].tolist(),
        "scale": saved["scale"].tolist(),
        "normal_scores": calibration["normal_scores"] if calibration else saved["normal_scores"].tolist(),
        "threshold": calibration["threshold"] if calibration else float(saved["threshold"]),
        "bank_rows": int(saved["bank"].shape[0]),
        "feature_count": int(saved["bank"].shape[1]),
    }
    (out / "normal_reference.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    samples = test_rows(DATA / "manifest.csv")
    catalog = []
    for i, row in enumerate(samples, 1):
        name = f"sample-{i:02d}.jpg"
        original = WEB / "samples" / name
        landscape = WEB / "landscape" / name
        if not original.exists() or not landscape.exists():
            raise SystemExit(f"Run scripts/prepare_samples.py before building: {name}")
        shutil.copyfile(original, out / "samples" / name)
        shutil.copyfile(landscape, out / "landscape" / name)
        catalog.append({
            "id": i,
            "label": "Defect" if row["is_anomaly"] == "1" else "Normal",
            "model": f"./samples/{name}",
            "display": f"./landscape/{name}",
        })
    (out / "samples.json").write_text(json.dumps(catalog, separators=(",", ":")), encoding="utf-8")
    for sample in ("01", "04"):
        shutil.copyfile(WEB / "demo_assets" / f"sample-{sample}-heat.png", out / "samples" / f"sample-{sample}-heat.png")
    fingerprint_page_assets(out)
    return len(payload["bank"]), len(samples)


def main() -> None:
    # docs/ is generated output. Build completely before replacing it.
    if OUT.is_symlink() or OUT.resolve() != ROOT.resolve() / "docs":
        raise SystemExit("Refusing to replace a site directory outside this repository")
    with tempfile.TemporaryDirectory(prefix="surface-trace-site-", dir=ROOT) as staging:
        feature_count, sample_count = build(Path(staging))
        if OUT.exists():
            shutil.rmtree(OUT)
        shutil.copytree(staging, OUT)
    print(f"Built {OUT}")
    print(f"Static model: {feature_count} feature values, {sample_count} held-out samples")


if __name__ == "__main__":
    main()
