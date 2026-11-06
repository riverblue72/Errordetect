"""Create six looping method GIFs from audited TSFabrics experiment outputs.

Run after experiments/unsupervised/export_animation_data.py has produced its
ignored animation_data/ directory. The images, feature map, scores, and drift
curve are from the actual TSFabrics experiment; the movement is explanatory.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "experiments" / "unsupervised" / "animation_data"
OUT = ROOT / "web" / "next-method"
W, H = 720, 420
FRAMES = 20
WHITE = (251, 252, 254)
INDIGO = (91, 107, 187)
PALE = (225, 230, 247)
LINE = (207, 215, 237)
RED = (240, 91, 83)
AMBER = (222, 155, 75)
TEAL = (54, 163, 151)
MUTED = (158, 169, 190)


def new() -> Image.Image:
    image = Image.new("RGBA", (W, H), WHITE + (255,))
    return image


def ease(value: float) -> float:
    value = max(0.0, min(1.0, value))
    return value * value * (3 - 2 * value)


def line_arrow(draw: ImageDraw.ImageDraw, x1: int, y: int, x2: int, color=INDIGO) -> None:
    draw.line((x1, y, x2 - 9, y), fill=color, width=2)
    draw.polygon(((x2, y), (x2 - 11, y - 6), (x2 - 11, y + 6)), fill=color)


def picture(name: str) -> Image.Image:
    with Image.open(DATA / name) as image:
        return image.convert("RGB").copy()


def photo(base: Image.Image, image: Image.Image, box: tuple[int, int, int, int],
          *, outline=LINE, opacity: float = 1) -> None:
    x, y, width, height = box
    fitted = ImageOps.fit(image, (width, height), method=Image.Resampling.LANCZOS)
    if opacity < 1:
        fitted = Image.blend(Image.new("RGB", fitted.size, WHITE), fitted, opacity)
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius=10, fill=255)
    base.paste(fitted, (x, y), mask)
    ImageDraw.Draw(base).rounded_rectangle((x, y, x + width - 1, y + height - 1),
                                           radius=10, outline=outline, width=2)


def heat(base: Image.Image, values: np.ndarray, box: tuple[int, int, int, int],
         progress: float, scale: tuple[float, float] | None = None) -> None:
    x, y, width, height = box
    low, high = scale if scale else (float(np.percentile(values, 74)), float(np.percentile(values, 99)))
    low_res = Image.fromarray(values.astype(np.float32), mode="F")
    large = np.asarray(low_res.resize((width, height), Image.Resampling.BICUBIC), dtype=np.float32)
    strength = np.clip((large - low) / max(high - low, 1e-5), 0, 1)
    alpha = np.asarray(195 * strength * ease(progress), dtype=np.uint8)
    clip = Image.new("L", (width, height), 0)
    ImageDraw.Draw(clip).rounded_rectangle((0, 0, width - 1, height - 1), radius=10, fill=255)
    alpha = (alpha.astype(np.uint16) * np.asarray(clip, dtype=np.uint16) // 255).astype(np.uint8)
    overlay = Image.new("RGBA", (width, height), RED + (0,))
    overlay.putalpha(Image.fromarray(alpha, "L"))
    base.alpha_composite(overlay, (x, y))


def gauge(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, score: float,
          threshold: float, progress: float, *, color=RED) -> None:
    minimum = min(score, threshold) - .035
    maximum = max(score, threshold) + .035
    scale = lambda value: x + int(width * (value - minimum) / (maximum - minimum))
    draw.line((x, y, x + width, y), fill=LINE, width=4)
    tx = scale(threshold)
    draw.line((tx, y - 15, tx, y + 15), fill=RED, width=2)
    dotx = scale(minimum + (score - minimum) * ease(progress))
    draw.ellipse((dotx - 6, y - 6, dotx + 6, y + 6), fill=color)


def focus_ring(draw: ImageDraw.ImageDraw, values: np.ndarray,
               box: tuple[int, int, int, int], tick: int, progress: float) -> None:
    if progress < .28:
        return
    row, col = np.unravel_index(np.argmax(values), values.shape)
    x, y, width, height = box
    cx = round(x + (col + .5) * width / values.shape[1])
    cy = round(y + (row + .5) * height / values.shape[0])
    radius = 11 + round(3 * math.sin(tick * math.pi / 3))
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius),
                 outline=WHITE, width=5)
    draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius),
                 outline=RED, width=2)
    draw.ellipse((cx - 2, cy - 2, cx + 2, cy + 2), fill=RED)


def animation_01(meta: dict) -> list[Image.Image]:
    frames = [picture(f"stream_{i:02d}.jpg") for i in range(5)]
    output = []
    for tick in range(FRAMES):
        base = new()
        draw = ImageDraw.Draw(base)
        draw.line((32, 210, 690, 210), fill=PALE, width=11)
        center = min(4, tick // 4)
        photo(base, frames[max(0, center - 1)], (36, 151, 148, 118), opacity=.62)
        photo(base, frames[min(4, center + 1)], (536, 151, 148, 118), opacity=.62)
        photo(base, frames[center], (185, 70, 350, 280), outline=INDIGO)
        draw = ImageDraw.Draw(base)
        scan = 191 + int(338 * ((tick % 4) / 3))
        beam = Image.new("RGBA", base.size, (0, 0, 0, 0))
        ImageDraw.Draw(beam).rectangle((scan - 12, 78, scan + 12, 342),
                                       fill=INDIGO + (26,))
        base = Image.alpha_composite(base, beam)
        draw = ImageDraw.Draw(base)
        draw.line((scan, 78, scan, 342), fill=INDIGO, width=2)
        for i in range(5):
            draw.rounded_rectangle((309 + 22 * i, 376, 322 + 22 * i, 381),
                                   radius=2, fill=INDIGO if i == center else LINE)
        output.append(base.convert("RGB"))
    return output


def animation_02(meta: dict) -> list[Image.Image]:
    source = picture("hero.jpg")
    values = np.asarray(meta["feature_projection"], dtype=float)
    lo, hi = np.percentile(values, [5, 95])
    output = []
    for tick in range(FRAMES):
        progress = ease(tick / (FRAMES - 1))
        base = new()
        photo(base, source, (32, 98, 280, 224), outline=INDIGO)
        draw = ImageDraw.Draw(base)
        reveal = int(32 * progress)
        for col in range(1, 32):
            gx = 32 + round(col * 280 / 32)
            draw.line((gx, 99, gx, 321), fill=INDIGO + (70,), width=1)
        for row in range(1, 26):
            gy = 98 + round(row * 224 / 26)
            draw.line((33, gy, 311, gy), fill=INDIGO + (70,), width=1)
        line_arrow(draw, 340, 210, 380)
        draw.rounded_rectangle((408, 98, 687, 321), radius=10, fill=(245, 247, 253), outline=LINE, width=2)
        for row in range(26):
            for col in range(32):
                x, y = 420 + 8 * col, 106 + 8 * row
                draw.rounded_rectangle((x, y, x + 6, y + 6), radius=2, fill=(230, 234, 247))
        for row in range(26):
            for col in range(reveal):
                strength = np.clip((values[row, col] - lo) / max(hi - lo, 1e-5), 0, 1)
                color = tuple(int(226 + (72 - 226) * strength) if channel == 0 else
                              int(233 + (91 - 233) * strength) if channel == 1 else
                              int(248 + (179 - 248) * strength) for channel in range(3))
                x, y = 420 + 8 * col, 106 + 8 * row
                draw.rounded_rectangle((x, y, x + 6, y + 6), radius=2, fill=color)
        if reveal:
            col = min(reveal - 1, 31)
            row = (tick * 3) % 26
            fx = 32 + round(col * 280 / 32)
            fy = 98 + round(row * 224 / 26)
            draw.rectangle((fx, fy, fx + 9, fy + 9), outline=AMBER, width=2)
            tx, ty = 420 + col * 8, 106 + row * 8
            draw.ellipse((tx - 3, ty - 3, tx + 9, ty + 9), outline=AMBER, width=2)
        output.append(base.convert("RGB"))
    return output


def animation_03(meta: dict) -> list[Image.Image]:
    examples = meta["reference_examples"]
    images = [picture(item["file"]) for item in examples]
    output = []
    for tick in range(FRAMES):
        base = new()
        draw = ImageDraw.Draw(base)
        progress = ease(tick / (FRAMES - 1))
        for slot, (item, image) in enumerate(zip(examples, images)):
            x = 31 + 145 * (slot % 3)
            y = 79 + 156 * (slot // 3)
            revealed = progress >= (slot + 1) / 8
            selected = item["selected"]
            photo(base, image, (x, y, 132, 106),
                  outline=TEAL if revealed and selected else MUTED if revealed else LINE,
                  opacity=.42 if revealed and not selected else 1)
            draw = ImageDraw.Draw(base)
            if revealed:
                draw.ellipse((x + 109, y + 9, x + 122, y + 22),
                             fill=TEAL if selected else WHITE,
                             outline=TEAL if selected else MUTED, width=2)
        line_arrow(draw, 470, 209, 506)
        active = min(5, int(progress * 6))
        if progress > .15 and examples[active]["selected"]:
            travel = (tick % 5) / 4
            dot_x = round(470 + 36 * travel)
            draw.ellipse((dot_x - 4, 205, dot_x + 4, 213), fill=TEAL)
        draw.rounded_rectangle((523, 68, 690, 352), radius=11, fill=(247, 249, 253), outline=LINE, width=2)
        for i in range(14 * 22):
            row, col = divmod(i, 14)
            x, y = 531 + col * 11, 80 + row * 12
            draw.rounded_rectangle((x, y, x + 8, y + 8), radius=2, fill=(226, 232, 246))
        cells = int(14 * 22 * progress)
        for i in range(cells):
            row, col = divmod(i, 14)
            color = (114 + (i * 17) % 43, 131 + (i * 11) % 41, 200 + (i * 7) % 31)
            x, y = 531 + col * 11, 80 + row * 12
            draw.rounded_rectangle((x, y, x + 8, y + 8), radius=2, fill=color)
        output.append(base.convert("RGB"))
    return output


def animation_04(meta: dict) -> list[Image.Image]:
    image = picture("hero.jpg")
    values = np.asarray(meta["heatmap"], dtype=float)
    output = []
    for tick in range(FRAMES):
        progress = ease(tick / (FRAMES - 1))
        base = new()
        box = (32, 54, 390, 312)
        photo(base, image, box, outline=INDIGO)
        heat(base, values, box, progress)
        draw = ImageDraw.Draw(base)
        focus_ring(draw, values, box, tick, progress)
        draw.rounded_rectangle((463, 77, 688, 343), radius=11, fill=(247, 249, 254), outline=LINE, width=2)
        quantiles = np.quantile(values, [.10, .25, .40, .55, .70, .82, .93, .99])
        low, high = float(quantiles[0]), float(quantiles[-1])
        for i, value in enumerate(quantiles):
            y = 105 + i * 24
            draw.line((491, y, 659, y), fill=LINE, width=2)
            extent = int(145 * (float(value) - low) / max(high - low, 1e-5) * progress)
            color = RED if i >= 6 else INDIGO
            draw.rounded_rectangle((491, y - 4, 491 + max(5, extent), y + 4),
                                   radius=4, fill=color)
        draw.line((489, 295, 663, 295), fill=LINE, width=1)
        gauge(draw, 495, 318, 160, meta["hero_score"], meta["hero_threshold"], progress, color=RED)
        output.append(base.convert("RGB"))
    return output


def animation_05(meta: dict) -> list[Image.Image]:
    if meta["drift_target"] != "T1_S164_I36_1" or meta["drift_first_alarm"] != 192:
        raise ValueError("The shift animation must use the recorded changed-normal run")
    images = [picture(f"drift_{i:02d}.jpg") for i in range(5)]
    source_scores = np.asarray(meta["drift_source_values"][-16:], dtype=float)
    target_scores = np.asarray(meta["drift_values"][:16], dtype=float)
    ends = np.asarray(meta["drift_ends"][:16])
    limit = float(meta["drift_threshold"])
    if len(source_scores) != 16 or len(target_scores) != 16 or ends[-1] != 608:
        raise ValueError("The shift animation needs 16 consecutive windows per run")
    plot = (50, 247, 670, 365)
    coordinate = lambda value: plot[3] - round(value * (plot[3] - plot[1]))
    step = (plot[2] - plot[0]) / (len(source_scores) + len(target_scores) - 1)
    source_points = [(round(plot[0] + step * i), coordinate(score))
                     for i, score in enumerate(source_scores)]
    target_points = [(round(plot[0] + step * (len(source_scores) + i)), coordinate(score))
                     for i, score in enumerate(target_scores)]
    points = source_points + target_points
    boundary = round((source_points[-1][0] + target_points[0][0]) / 2)
    alarm_index = len(source_points) + 2
    output = []
    for tick in range(FRAMES):
        progress = ease(tick / (FRAMES - 1))
        base = new()
        draw = ImageDraw.Draw(base)
        source_image = images[0 if tick < 5 else 1]
        target_image = images[2 if tick < 12 else 3 if tick < 16 else 4]
        photo(base, source_image, (50, 51, 280, 145),
              outline=INDIGO if progress < .5 else LINE)
        photo(base, target_image, (390, 51, 280, 145),
              outline=RED if progress >= .5 else LINE,
              opacity=.5 if progress < .5 else 1)
        draw = ImageDraw.Draw(base)
        draw.line((boundary, 224, boundary, 373), fill=PALE, width=2)
        draw.line((plot[0], plot[3], plot[2], plot[3]), fill=LINE, width=2)
        threshold_y = coordinate(limit)
        for x in range(plot[0], plot[2], 16):
            draw.line((x, threshold_y, min(x + 9, plot[2]), threshold_y), fill=AMBER, width=2)
        count = max(1, round(1 + (len(points) - 1) * progress))
        source_count = min(count, len(source_points))
        if source_count > 1:
            draw.line(source_points[:source_count], fill=INDIGO, width=3, joint="curve")
        if count > len(source_points):
            draw.line([source_points[-1], *target_points[:count - len(source_points)]],
                      fill=RED, width=3, joint="curve")
        for x, y in source_points[:source_count]:
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=INDIGO)
        for x, y in target_points[:max(0, count - len(source_points))]:
            draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=RED)
        alarm_x, alarm_y = points[alarm_index]
        if count > alarm_index:
            pulse = 10 + round(3 * math.sin(tick * math.pi / 3))
            draw.ellipse((alarm_x - pulse, alarm_y - pulse,
                          alarm_x + pulse, alarm_y + pulse),
                         outline=RED, width=3)
        output.append(base.convert("RGB"))
    return output


def animation_06(meta: dict) -> list[Image.Image]:
    image = picture("hero.jpg")
    current = np.asarray(meta["heatmap"], dtype=float)
    shadow = np.asarray(meta["shadow_heatmap"], dtype=float)
    shared = (float(np.percentile(current, 74)), float(np.percentile(current, 99)))
    try:
        font = ImageFont.truetype("arial.ttf", 20)
    except OSError:
        font = ImageFont.load_default(size=20)
    output = []
    for tick in range(FRAMES):
        progress = ease(tick / (FRAMES - 1))
        base = new()
        draw = ImageDraw.Draw(base)
        draw.text((37, 49), "CURRENT", fill=INDIGO, font=font)
        draw.text((389, 49), "CANDIDATE", fill=AMBER, font=font)
        left, right = (37, 82, 294, 235), (389, 82, 294, 235)
        photo(base, image, left, outline=INDIGO)
        photo(base, image, right, outline=AMBER)
        heat(base, current, left, progress, shared)
        heat(base, shadow, right, progress, shared)
        draw = ImageDraw.Draw(base)
        focus_ring(draw, current, left, tick, progress)
        gauge(draw, 65, 367, 238, meta["hero_score"], meta["hero_threshold"], progress,
              color=RED)
        gauge(draw, 417, 367, 238, meta["shadow_score"], meta["shadow_threshold"], progress,
              color=INDIGO)
        output.append(base.convert("RGB"))
    return output


def save(name: str, frames: list[Image.Image]) -> None:
    if any(frame.size != (W, H) for frame in frames):
        raise ValueError("Frame dimensions differ from the existing method animations")
    palette = frames[-1].quantize(colors=192, method=Image.Quantize.MEDIANCUT)
    indexed = [frame.quantize(palette=palette, dither=Image.Dither.NONE) for frame in frames]
    path = OUT / f"{name}.gif"
    indexed[0].save(path, save_all=True, append_images=indexed[1:], loop=0,
                    duration=190, disposal=2, optimize=True)
    frames[-2].save(OUT / f"{name}-poster.png", optimize=True)
    print(path.name, path.stat().st_size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    meta = json.loads((DATA / "metadata.json").read_text())
    if not meta["hero_ground_truth_defect"] or meta["hero_score"] < meta["hero_threshold"]:
        raise ValueError("The illustrated detection must match the recorded experiment")
    if not meta["shadow_score"] < meta["shadow_threshold"]:
        raise ValueError("The shadow illustration requires a real missed defect")
    for name, animation in (
        ("01", animation_01), ("02", animation_02), ("03", animation_03),
        ("04", animation_04), ("05", animation_05), ("06", animation_06),
    ):
        save(name, animation(meta))
    preview = Image.new("RGB", (1120, 453), WHITE)
    for i in range(6):
        with Image.open(OUT / f"{i + 1:02d}-poster.png") as poster:
            tile = poster.convert("RGB").resize((352, 205), Image.Resampling.LANCZOS)
        preview.paste(tile, (8 + (i % 3) * 376, 12 + (i // 3) * 224))
    preview.save(OUT / "preview.png", optimize=True)


if __name__ == "__main__":
    main()
