"""Draw a continuous, evenly spaced change trace from recorded TSFabrics scores."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "web" / "ablation" / "change-figure.json"
OUT = ROOT / "web" / "ablation"
SOURCE_COLOR = "#7788bf"
CHANGED_COLOR = "#d98387"


def y(score: float, top: float, bottom: float) -> float:
    return bottom - (bottom - top) * score


def points(scores: list[float], xs: list[float], top: float, bottom: float) -> str:
    return " ".join(f"{x:.1f},{y(score, top, bottom):.1f}" for x, score in zip(xs, scores))


def svg(width: int, height: int, content: str) -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">Visual change across two production runs</title>
<desc id="desc">The last 16 consecutive reference windows and first 16 windows of a separate changed normal run are plotted at equal intervals. The reference run stays below the alert limit. The first three changed-run windows exceed it, confirming an alert at frame 192; the chart continues through frame 608.</desc>
<style>
text{{font-family:Segoe UI,Arial,sans-serif}}
.heading{{fill:#59698f;font-size:11px;letter-spacing:1px}}
.axis{{fill:#75829b;font-size:10px}}
.alert{{fill:#ba676c;font-size:10px;letter-spacing:1px}}
</style>
{content}
</svg>
'''


def figure(source: list[float], target: list[float], limit: float, mobile: bool) -> str:
    source = source[-16:]
    target = target[:16]
    left, right = (35, 274) if mobile else (54, 548)
    top, bottom = (44, 163) if mobile else (57, 180)
    width, height = (300, 223) if mobile else (600, 238)
    xs = [left + (right - left) * i / (len(source) + len(target) - 1)
          for i in range(len(source) + len(target))]
    boundary = (xs[len(source) - 1] + xs[len(source)]) / 2
    source_xs = xs[:len(source)]
    target_xs = xs[len(source):]
    lines = [
        f'<text x="{left}" y="{24 if mobile else 26}" class="heading">REFERENCE RUN</text>',
        f'<text x="{right}" y="{24 if mobile else 26}" text-anchor="end" class="heading">NEW RUN</text>',
        f'<line x1="{boundary:.1f}" x2="{boundary:.1f}" y1="{top - 8}" y2="{bottom + 9}" stroke="#cbd2e1" stroke-dasharray="4 5"/>',
    ]
    for level in (1.0, 0.5, 0.0):
        pos = y(level, top, bottom)
        lines.extend([
            f'<line x1="{left}" x2="{right}" y1="{pos:.1f}" y2="{pos:.1f}" stroke="#dce2ef"/>',
            f'<text x="{left - 10}" y="{pos + 3:.1f}" text-anchor="end" class="axis">{level:g}</text>',
        ])
    limit_y = y(limit, top, bottom)
    lines.extend([
        f'<line x1="{left}" x2="{right}" y1="{limit_y:.1f}" y2="{limit_y:.1f}" stroke="#ba8f71" stroke-width="1.5" stroke-dasharray="5 4"/>',
        f'<text x="{left}" y="{limit_y - 8:.1f}" class="axis">ALERT LIMIT · {limit:.3f}</text>',
        f'<polyline points="{points(source, source_xs, top, bottom)}" fill="none" stroke="{SOURCE_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
        f'<polyline points="{points([source[-1], *target], [source_xs[-1], *target_xs], top, bottom)}" fill="none" stroke="{CHANGED_COLOR}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
    ])
    marker_radius = 1.2 if mobile else 1.7
    for scores, positions, color in ((source, source_xs, SOURCE_COLOR), (target, target_xs, CHANGED_COLOR)):
        for x, score in zip(positions, scores):
            lines.append(
                f'<circle cx="{x:.1f}" cy="{y(score, top, bottom):.1f}" r="{marker_radius}" fill="{color}"/>'
            )
    alert_x, alert_y = target_xs[2], y(target[2], top, bottom)
    lines.extend([
        f'<circle cx="{alert_x:.1f}" cy="{alert_y:.1f}" r="8" fill="none" stroke="#ba676c" stroke-width="1.5"/>',
        f'<text x="{alert_x:.1f}" y="{bottom + 22}" text-anchor="middle" class="axis">192</text>',
        f'<text x="{alert_x:.1f}" y="{bottom + 45}" text-anchor="middle" class="alert">ALERT</text>',
    ])
    if not mobile:
        lines.append(f'<text x="{right}" y="{bottom + 22}" text-anchor="end" class="axis">608</text>')
    return svg(width, height, "\n".join(lines))


def main() -> None:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    source = data["source_holdout"]["scores"]
    target = data["target_start"]["scores"]
    assert len(source) == 59 and data["target_start"]["ends"] == list(range(128, 609, 32))
    assert data["target_start"]["first_alarm"] == 192
    assert max(source) < data["limit"] < min(target[:3])
    (OUT / "change-figure.svg").write_text(figure(source, target, data["limit"], False), encoding="utf-8")
    (OUT / "change-figure-mobile.svg").write_text(figure(source, target, data["limit"], True), encoding="utf-8")
    print("Wrote desktop and mobile change figures")


if __name__ == "__main__":
    main()
