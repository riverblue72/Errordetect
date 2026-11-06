"""Loop the four visual themes retained in the feedback-led site story."""

from __future__ import annotations

from bisect import bisect_right
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "web" / "next-method"
SCENES = (2, 3, 5, 6)  # foundation features, reference, change, candidate check
SAMPLES_PER_SCENE = 20
STEP_FRAME_MS = 135
TRANSITION_FRAMES = 3
TRANSITION_FRAME_MS = 95


def samples(path: Path) -> list[Image.Image]:
    with Image.open(path) as animation:
        frames: list[Image.Image] = []
        ends: list[int] = []
        elapsed = 0
        for index in range(animation.n_frames):
            animation.seek(index)
            frames.append(animation.convert("RGB").copy())
            elapsed += animation.info.get("duration", 190)
            ends.append(elapsed)
    return [frames[min(bisect_right(ends, elapsed * index / SAMPLES_PER_SCENE), len(frames) - 1)]
            for index in range(SAMPLES_PER_SCENE)]


def main() -> None:
    scenes = [samples(ASSETS / f"{index:02d}.gif") for index in SCENES]
    frames: list[Image.Image] = []
    durations: list[int] = []
    for scene, sequence in enumerate(scenes):
        frames.extend(sequence)
        durations.extend([STEP_FRAME_MS] * len(sequence))
        following = scenes[(scene + 1) % len(scenes)][0]
        for transition in range(1, TRANSITION_FRAMES + 1):
            blend = Image.blend(sequence[-1], following, transition / (TRANSITION_FRAMES + 1))
            frames.append(blend)
            durations.append(TRANSITION_FRAME_MS)

    output = ASSETS / "hero.webp"
    frames[0].save(output, format="WEBP", save_all=True, append_images=frames[1:],
                   duration=durations, loop=0, quality=80, method=5)
    with Image.open(output) as check:
        assert check.n_frames >= len(SCENES) * 10, "Hero animation lost too many frames"
        assert check.info.get("loop") == 0, "Hero animation must loop"
        encoded_frames = check.n_frames
    print(f"{output.relative_to(ROOT)}: {encoded_frames} frames, {output.stat().st_size:,} bytes")


if __name__ == "__main__":
    main()
