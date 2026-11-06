"""Mux the frame-aligned Korean narration and 1080p replay capture."""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import wave
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "out" / "narrated-demo"
PLAYBACK_RATE = 1.25


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--ffmpeg", type=Path)
    args = parser.parse_args()
    out = args.out.resolve()
    ffmpeg = str(args.ffmpeg) if args.ffmpeg else shutil.which("ffmpeg")
    if not ffmpeg or not Path(ffmpeg).is_file():
        raise SystemExit("Pass --ffmpeg with an installed ffmpeg executable")
    plan = json.loads((out / "plan.json").read_text(encoding="utf-8"))
    fps = plan["fps"]
    expected = plan["total_frames"]
    frames = sorted((out / "frames").glob("frame-*.jpg"))
    if len(frames) != expected or any(
        frame.name != f"frame-{number:05d}.jpg" for number, frame in enumerate(frames)
    ):
        raise SystemExit(f"Expected sequential frames 0 through {expected - 1}")
    audio = out / "narration.wav"
    with wave.open(str(audio), "rb") as source:
        if source.getnframes() * fps != expected * source.getframerate():
            raise SystemExit("Narration duration does not match the captured frames")
    target = out / "recorded-run-ko-125x-1080p.mp4"
    subprocess.run(
        [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-framerate", str(fps),
         "-i", str(out / "frames" / "frame-%05d.jpg"), "-i", str(audio),
         "-filter_complex", f"[0:v]setpts=(PTS-STARTPTS)/{PLAYBACK_RATE},fps=30[v];"
         f"[1:a]atempo={PLAYBACK_RATE}[a]", "-map", "[v]", "-map", "[a]",
         "-c:v", "libx264", "-preset", "medium", "-crf", "21",
         "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
         "-movflags", "+faststart", "-shortest", str(target)],
        check=True,
    )
    print(f"{target} | 1.25× | {expected / fps / PLAYBACK_RATE:.2f}s | {target.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
