"""Create an image contact sheet around a saved within-run change alert."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

from tsfabrics import TSFabricsArchive


FRAMES = (0, 512, 1024, 1536, 2047, 2112, 2304, 2560, 2816,
          3008, 3136, 3200, 3263, 3328, 3584, 4095)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", type=Path, required=True)
    parser.add_argument("--result", type=Path, required=True)
    parser.add_argument("--run", default="T2_S466_I39_1")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    result = json.loads(args.result.read_text(encoding="utf-8"))
    control = result["runs"][args.run]
    archive = TSFabricsArchive(args.zip)
    rows = archive.scenarios[args.run]
    if len(rows) <= max(FRAMES):
        raise ValueError("recording is shorter than the requested contact sheet")

    width, height, caption, columns = 320, 210, 36, 4
    cell_height = height + caption
    rows_count = (len(FRAMES) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * width, rows_count * cell_height), "#f2f3f5")
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype("DejaVuSans.ttf", 16)
    except OSError:
        font = ImageFont.load_default()
    for item, index in enumerate(FRAMES):
        image = archive.read_image(rows[index]["image"]).convert("RGB")
        image = ImageOps.contain(image, (width, height), Image.LANCZOS)
        x = (item % columns) * width
        y = (item // columns) * cell_height
        sheet.paste(image, (x + (width - image.width) // 2, y + (height - image.height) // 2))
        label = f"Index {index}"
        if index + 1 == control["original_first_alert"]:
            label += " · alert window end"
        draw.text((x + 10, y + height + 7), label, fill="#252b37", font=font)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(args.out, quality=88, optimize=True)
    print(args.out)


if __name__ == "__main__":
    main()
