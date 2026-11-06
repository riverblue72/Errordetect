"""Plot the preregistered LUSITANOv2 random-position localization control."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[2]


def plot(result: dict, output: Path) -> None:
    plt.rcParams.update({
        "font.family": "DejaVu Sans",
        "font.size": 11,
        "svg.hashsalt": "surface-trace-lusitano-box-hit",
    })
    figure, axes = plt.subplots(1, 2, figsize=(12.4, 5.1), sharex=True)
    figure.patch.set_facecolor("#f7f6f3")
    panels = (
        ("Single hottest patch", "random_single_hottest_patch_box_hit", "single_hottest_patch_box_hit"),
        ("Any of the top 1%", "random_top_1pct_patch_box_hit", "top_1pct_patch_box_hit"),
    )
    for axis, (title, random_key, observed_key) in zip(axes, panels):
        axis.set_facecolor("#f7f6f3")
        modes = [result["modes"][name] for name in ("global", "tiles")]
        random = np.array([mode[random_key] * 100 for mode in modes])
        observed = np.array([mode["observed"]["all_unlabeled"][observed_key] * 100 for mode in modes])
        positions = np.array([1, 0])
        axis.barh(positions + .17, random, height=.27, color="#b8bdc9", label="Random positions")
        axis.barh(positions - .17, observed, height=.27, color="#5b50d6", label="DINOv2")
        for y, value in zip(positions + .17, random):
            axis.text(value + 1.2, y, f"{value:.1f}%", va="center", color="#525c6c", fontsize=10)
        for y, value in zip(positions - .17, observed):
            axis.text(value + 1.2, y, f"{value:.1f}%", va="center", color="#393187", fontsize=10)
        axis.set_title(title, loc="left", color="#202431", fontsize=16, pad=22)
        axis.set_yticks(positions, ["Global letterbox", "Five tiles"])
        axis.set_xlim(0, 110)
        axis.set_xticks([0, 25, 50, 75, 100], ["0", "25", "50", "75", "100%"])
        axis.tick_params(axis="both", length=0, pad=10, colors="#596373")
        axis.set_axisbelow(True)
        axis.grid(axis="x", color="#dedee4", linewidth=.8)
        for spine in axis.spines.values():
            spine.set_visible(False)
    figure.suptitle("Box-hit rate versus random patch positions", x=.07, y=.98,
                    ha="left", fontsize=21, color="#202431")
    figure.legend(*axes[0].get_legend_handles_labels(), loc="lower left",
                  bbox_to_anchor=(.07, .08), ncol=2, frameon=False,
                  labelcolor="#525c6c")
    figure.text(.07, .035,
                "Official test defect images (n = 1,248). Random is the exact expectation for the same boxes and patch grid."
                " DINOv2 uses the all-startup reference.",
                color="#657084", fontsize=9)
    figure.subplots_adjust(left=.17, right=.965, top=.77, bottom=.22, wspace=.38)
    output.parent.mkdir(parents=True, exist_ok=True)
    figure.savefig(output, dpi=160, facecolor=figure.get_facecolor(), metadata={"Date": None})
    plt.close(figure)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--result", type=Path, default=ROOT / "experiments/unsupervised/results/lusitano_box_hit_control.json")
    parser.add_argument("--out", type=Path, default=ROOT / "experiments/unsupervised/figures/lusitano_box_hit_control.svg")
    args = parser.parse_args()
    plot(json.loads(args.result.read_text(encoding="utf-8")), args.out)
