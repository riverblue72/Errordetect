"""Resume a large public dataset download with verified HTTP byte ranges.

All outputs, including progress metadata, stay beside the requested output file.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path


def fetch(url: str, fd: int, start: int, end: int) -> int:
    expected = end - start + 1
    for attempt in range(5):
        try:
            request = urllib.request.Request(url, headers={"Range": f"bytes={start}-{end}"})
            with urllib.request.urlopen(request, timeout=120) as response:
                content_range = response.headers.get("Content-Range", "")
                match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", content_range)
                if response.status != 206 or not match:
                    raise RuntimeError(f"range unsupported: {response.status} {content_range}")
                if (int(match[1]), int(match[2])) != (start, end):
                    raise RuntimeError(f"wrong range: {content_range}")
                offset = start
                while offset <= end:
                    data = response.read(min(1 << 20, end - offset + 1))
                    if not data:
                        raise RuntimeError(f"short read at {offset}")
                    os.pwrite(fd, data, offset)
                    offset += len(data)
                if offset - start != expected:
                    raise RuntimeError("downloaded length mismatch")
                return expected
        except Exception:
            if attempt == 4:
                raise
            time.sleep(min(30, 2 ** attempt))
    raise AssertionError("unreachable")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("output", type=Path)
    parser.add_argument("size", type=int)
    parser.add_argument("--jobs", type=int, default=8)
    parser.add_argument("--chunk-mib", type=int, default=64)
    parser.add_argument("--existing-prefix", type=int, default=0)
    args = parser.parse_args()
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    marker = output.with_name(output.name + ".ranges.json")
    chunk_size = args.chunk_mib << 20
    prefix = args.existing_prefix
    if prefix < 0 or prefix > args.size:
        raise ValueError("invalid existing prefix")
    if marker.exists():
        state = json.loads(marker.read_text())
        if (state["url"], state["size"], state["prefix"], state["chunk_size"]) != (
            args.url, args.size, prefix, chunk_size
        ):
            raise ValueError("download settings differ from progress marker")
        complete = set(state["complete"])
    else:
        complete = set()
    tasks = [
        (i, start, min(args.size - 1, start + chunk_size - 1))
        for i, start in enumerate(range(prefix, args.size, chunk_size))
        if i not in complete
    ]
    fd = os.open(output, os.O_RDWR | os.O_CREAT)
    try:
        if prefix and os.fstat(fd).st_size < prefix:
            raise ValueError("existing file is shorter than trusted prefix")
        os.ftruncate(fd, args.size)
        with ThreadPoolExecutor(max_workers=args.jobs) as pool:
            futures = {pool.submit(fetch, args.url, fd, start, end): i for i, start, end in tasks}
            for future in as_completed(futures):
                index = futures[future]
                future.result()
                complete.add(index)
                state = {
                    "url": args.url,
                    "size": args.size,
                    "prefix": prefix,
                    "chunk_size": chunk_size,
                    "complete": sorted(complete),
                }
                temp = marker.with_name(marker.name + ".tmp")
                temp.write_text(json.dumps(state))
                os.replace(temp, marker)
                print(f"{len(complete)}/{len(complete) + len(futures) - len(complete)} ranges", flush=True)
        os.fsync(fd)
    finally:
        os.close(fd)


if __name__ == "__main__":
    main()
