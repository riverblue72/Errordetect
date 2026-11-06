"""Encode captured 1920x1080 recorded-run frames as a looping GIF."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]


def ffmpeg_path() -> str | None:
    configured = os.environ.get("FFMPEG_PATH")
    if configured:
        return configured
    installed = shutil.which("ffmpeg")
    if installed:
        return installed
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return None


def encode_with_pillow(frames: list[Path], output: Path) -> None:
    """Keep a shared palette when ffmpeg is unavailable."""
    sample_indices = [0, len(frames) // 5, len(frames) * 2 // 5,
                      len(frames) * 3 // 5, len(frames) * 4 // 5, len(frames) - 1]
    contact_sheet = Image.new("RGB", (960, 360))
    for tile, index in enumerate(sample_indices):
        with Image.open(frames[index]) as image:
            contact_sheet.paste(image.convert("RGB").resize((320, 180)),
                                ((tile % 3) * 320, (tile // 3) * 180))
    palette = contact_sheet.quantize(colors=128, method=Image.Quantize.MEDIANCUT)
    encoded = []
    for frame in frames:
        with Image.open(frame) as image:
            encoded.append(image.convert("RGB").quantize(palette=palette,
                           dither=Image.Dither.NONE))
    encoded[0].save(output, save_all=True, append_images=encoded[1:],
                    duration=250, loop=0, optimize=True, disposal=2)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--frames", type=Path, default=ROOT / "out" / "recorded-run-frames")
    parser.add_argument("--output", type=Path, default=ROOT / "web" / "media" / "recorded-run-1080p.gif")
    args = parser.parse_args()
    frames = sorted(args.frames.glob("frame-*.png"))
    if len(frames) < 4:
        raise SystemExit("Expected captured frame-0000.png and subsequent frames")
    with Image.open(frames[0]) as first:
        if first.size != (1920, 1080):
            raise SystemExit(f"Expected 1920x1080 frames; got {first.size}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    ffmpeg = ffmpeg_path()
    if ffmpeg:
        palette = args.frames / "palette.png"
        source = str(args.frames / "frame-%04d.png")
        subprocess.run([
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "4",
            "-i", source, "-vf", "palettegen=max_colors=128:stats_mode=diff", str(palette),
        ], check=True)
        subprocess.run([
            ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", "4",
            "-i", source, "-i", str(palette), "-filter_complex",
            "[0:v][1:v]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle",
            "-loop", "0", str(args.output),
        ], check=True)
    else:
        encode_with_pillow(frames, args.output)
    with Image.open(args.output) as result:
        duration_ms = 0
        for index in range(result.n_frames):
            result.seek(index)
            duration_ms += result.info.get("duration", 0)
        if result.size != (1920, 1080) or duration_ms != len(frames) * 250:
            raise SystemExit("Encoded GIF does not match its captured duration or resolution")
        print(f"{result.size[0]}x{result.size[1]}, {result.n_frames} stored frames, "
              f"{duration_ms / 1000:.2f}s, {args.output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
