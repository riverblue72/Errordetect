"""Plot retrospective score distributions by published TSFabrics label."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("result", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    results = json.loads(args.result.read_text())
    runs = [(name, item) for name, item in results["runs"].items()
            if item["frozen"]["source_threshold"]["anomalies"]]
    fig, axes = plt.subplots(len(runs), 2, figsize=(11, 2.65 * len(runs)),
                             constrained_layout=True)
    colors = {0: "#557c90", 1: "#d47652"}
    for row, (name, item) in enumerate(runs):
        balanced = item["strategies"]["balanced"]
        paired = balanced["paired_evaluation"]
        labels = np.asarray([frame["label"] for frame in paired], dtype=int)
        for col, (key, title, limit) in enumerate((
            ("frozen", "Frozen reference", item["frozen"]["source_threshold"]["threshold"]),
            ("pca", "Run-local PCA candidate", balanced["pca_residual"]["threshold"]),
        )):
            ax = axes[row, col]
            values = np.asarray([frame[key] for frame in paired], dtype=float)
            bins = np.linspace(values.min(), values.max(), 38)
            for label, text in ((0, "Normal"), (1, "Defect")):
                ax.hist(values[labels == label], bins=bins, density=True,
                        color=colors[label], alpha=.55, label=text)
            ax.axvline(limit, color="#a43d42", linestyle="--", linewidth=1.5,
                       label="Threshold")
            ax.set_title(f"{name}  ·  {title}", loc="left", fontsize=10)
            ax.set_xlabel("Anomaly score")
            ax.set_ylabel("Density")
            ax.spines[["top", "right"]].set_visible(False)
            if row == 0 and col == 0:
                ax.legend(frameon=False, ncol=3, fontsize=8)
            if col == 1:
                count = item["calibration_defects_for_audit_only"]
                ax.text(.98, .94, f"Calibration defects: {count}/128",
                        ha="right", va="top", transform=ax.transAxes, fontsize=8,
                        bbox={"facecolor": "white", "alpha": .85, "edgecolor": "none"})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output, dpi=160)
    plt.close(fig)


if __name__ == "__main__":
    main()
