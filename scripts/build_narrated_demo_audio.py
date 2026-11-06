"""Generate fixed Korean narration and a frame-accurate capture plan."""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import wave
from pathlib import Path

from gtts import gTTS


ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
FPS = 6
TAIL_SECONDS = 1.0
PLAYBACK_RATE = 1.25


def stamp(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3600000)
    minutes, milliseconds = divmod(milliseconds, 60000)
    whole, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{whole:02},{milliseconds:03}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", type=Path, required=True)
    parser.add_argument("--out", type=Path, default=ROOT / "out" / "narrated-demo")
    args = parser.parse_args()
    if not args.ffmpeg.is_file():
        raise SystemExit(f"ffmpeg executable not found: {args.ffmpeg}")
    script = json.loads((ROOT / "scripts" / "narrated_demo_script.json").read_text(encoding="utf-8"))
    if len(script) != 9 or len({item["id"] for item in script}) != 9:
        raise SystemExit("Expected nine distinct narration scenes")
    for item in script:
        cues = item["captions"]
        times = [cue["at"] for cue in cues]
        if not times or times[0] != 0 or times != sorted(set(times)) or times[-1] >= 1:
            raise SystemExit(f"Invalid caption cues: {item['id']}")
    args.out.mkdir(parents=True, exist_ok=True)

    segments = []
    audio_chunks = []
    frame_cursor = 0
    for number, item in enumerate(script, 1):
        mp3 = args.out / f"{number:02d}-{item['id']}.mp3"
        wav = args.out / f"{number:02d}-{item['id']}.wav"
        gTTS(item["narration"], lang="ko").save(str(mp3))
        subprocess.run([str(args.ffmpeg), "-y", "-hide_banner", "-loglevel", "error",
                        "-i", str(mp3), "-ar", str(RATE), "-ac", "2",
                        "-c:a", "pcm_s16le", str(wav)], check=True)
        with wave.open(str(wav), "rb") as source:
            if source.getframerate() != RATE or source.getnchannels() != 2 or source.getsampwidth() != 2:
                raise SystemExit(f"Unexpected decoded audio format: {wav}")
            sample_count = source.getnframes()
            chunk = source.readframes(sample_count)
        frames = math.ceil((sample_count / RATE + TAIL_SECONDS + item.get("hold_seconds", 0)) * FPS)
        padded_samples = frames * RATE // FPS
        audio_chunks.append(chunk + bytes((padded_samples - sample_count) * 4))
        segments.append({**item, "audio_seconds": round(sample_count / RATE, 3),
                         "start_frame": frame_cursor, "frames": frames,
                         "end_frame": frame_cursor + frames})
        frame_cursor += frames
        print(f"{number:02d} {item['id']}: {sample_count / RATE:.2f}s voice, {frames / FPS:.2f}s scene")

    soundtrack = args.out / "narration.wav"
    with wave.open(str(soundtrack), "wb") as target:
        target.setnchannels(2)
        target.setsampwidth(2)
        target.setframerate(RATE)
        for chunk in audio_chunks:
            target.writeframes(chunk)
    plan = {"fps": FPS, "resolution": [1920, 1080], "total_frames": frame_cursor,
            "duration_seconds": frame_cursor / FPS, "segments": segments}
    (args.out / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    subtitles = []
    for item in segments:
        for index, cue in enumerate(item["captions"]):
            first = item["start_frame"] + round(cue["at"] * item["frames"])
            last = item["start_frame"] + (round(item["captions"][index + 1]["at"] * item["frames"])
                                          if index + 1 < len(item["captions"]) else item["frames"])
            subtitles.append(f"{len(subtitles) + 1}\n{stamp(first / FPS / PLAYBACK_RATE)} --> "
                             f"{stamp(last / FPS / PLAYBACK_RATE)}\n{cue['text']}\n")
    (args.out / "captions.srt").write_text("\n".join(subtitles), encoding="utf-8")
    print(f"Total: {frame_cursor / FPS:.2f}s; audio: {soundtrack}")


if __name__ == "__main__":
    main()
