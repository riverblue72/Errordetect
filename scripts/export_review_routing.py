"""Export the final recorded review requests for the landing-page chart."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "experiments" / "unsupervised" / "results" / "sequential_review_final.json"
TARGET = ROOT / "web" / "ablation" / "review-routing.json"


def main() -> None:
    result = json.loads(SOURCE.read_text(encoding="utf-8"))
    runs = [{"run": name, "requests": row["pilot2"]["requests"]}
            for name, row in result["runs"].items()]
    summary = result["summary"]["methods"]
    assert len(runs) == result["summary"]["runs"] == 16
    assert all(row["requests"] in (2, 8) for row in runs)
    assert sum(row["requests"] for row in runs) == summary["pilot2"]["requests"]
    assert summary["fixed8"]["requests"] == len(runs) * 8
    TARGET.write_text(json.dumps({"runs": runs}, indent=2) + "\n", encoding="utf-8")
    print(f"Exported {len(runs)} runs, {summary['pilot2']['requests']} requests")


if __name__ == "__main__":
    main()
