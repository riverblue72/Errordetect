"""Build a static GitHub Pages package from the local BeltGuard prototype."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "model"))
from model import DATA, MODEL  # noqa: E402
from sample_catalog import test_rows  # noqa: E402


WEB = ROOT / "web"
OUT = ROOT / "docs"
def main() -> None:
    if not MODEL.exists():
        raise SystemExit("Train the reference model with model.py first")
    OUT.mkdir(exist_ok=True)
    (OUT / "samples").mkdir(exist_ok=True)
    (OUT / "landscape").mkdir(exist_ok=True)
    (OUT / "method").mkdir(exist_ok=True)
    for source, target in [
        ("landing.html", "index.html"),
        ("inspector.html", "inspect.html"),
        ("workspace.html", "workspace.html"),
        ("report.html", "report.html"),
        ("site.css", "site.css"),
        ("workspace.css", "workspace.css"),
        ("method-studio.css", "method-studio.css"),
        ("favicon.svg", "favicon.svg"),
    ]:
        shutil.copyfile(WEB / source, OUT / target)
    (OUT / ".nojekyll").touch()
    for name in ("app.js", "anomaly-core.js", "analyzer-worker.js", "workspace-store.js", "workspace.js", "report.js"):
        shutil.copyfile(WEB / name, OUT / name)
    for asset in (WEB / "method").iterdir():
        if asset.suffix in {".gif", ".png"}:
            shutil.copyfile(asset, OUT / "method" / asset.name)

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
    (OUT / "normal_reference.json").write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    samples = test_rows(DATA / "manifest.csv")
    catalog = []
    for i, row in enumerate(samples, 1):
        name = f"sample-{i:02d}.jpg"
        original = WEB / "samples" / name
        landscape = WEB / "landscape" / name
        if not original.exists() or not landscape.exists():
            raise SystemExit(f"Run scripts/prepare_samples.py before building: {name}")
        shutil.copyfile(original, OUT / "samples" / name)
        shutil.copyfile(landscape, OUT / "landscape" / name)
        catalog.append({
            "id": i,
            "label": "Defect" if row["is_anomaly"] == "1" else "Normal",
            "model": f"./samples/{name}",
            "display": f"./landscape/{name}",
        })
    (OUT / "samples.json").write_text(json.dumps(catalog, separators=(",", ":")), encoding="utf-8")
    for sample in ("01", "04"):
        shutil.copyfile(WEB / "demo_assets" / f"sample-{sample}-heat.png", OUT / "samples" / f"sample-{sample}-heat.png")
    print(f"Built {OUT}")
    print(f"Static model: {len(payload['bank'])} feature values, {len(samples)} held-out samples")


if __name__ == "__main__":
    main()
