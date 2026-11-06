# Recorded-run media

`recorded-run-ko-125x-1080p.mp4` is the 1920 × 1080 Korean-narrated
presentation video at 1.25× speed (about 3:51). Its nine scenes follow meeting
feedback, the development and TSFabrics data choice, DINOv2 features, the
recorded visual shift, time-spaced review, the actual interval summary page,
full-run score distributions, separate update validation, and four feedback
questions. Each scene has timed Korean explanatory captions. The questions ask
for a 1–5 score, rationale, and priority improvement on implementation,
dataset choice, method, and practical use. The voice is generated with gTTS,
with DINOv2 spoken as “다이노 브이 투.” Images and scores are saved experimental
results; the presentation is a recorded replay. The site keeps the full
run-by-run results.

To regenerate the MP4, build and serve `docs/` at
`http://127.0.0.1:8766/`, then run:

```text
python -m pip install gTTS imageio-ffmpeg
python scripts/build_narrated_demo_audio.py --ffmpeg PATH_TO_FFMPEG
node scripts/capture_narrated_demo.js
python scripts/build_narrated_demo_video.py --ffmpeg PATH_TO_FFMPEG
```

`scripts/narrated_demo_script.json` holds the Korean narration. The captured
frames and intermediate audio stay in ignored `out/narrated-demo/`. Copy the
finished MP4 to `web/media/` and run `python scripts/build_site.py` to publish.

## Short silent GIF

`recorded-run-1080p.gif` is a 1920 x 1080 capture of the site's recorded-data
replay, not live camera inference. It uses saved TSFabrics photos and model
outputs. The opening scene shows an illustrated advisory meeting, three
feedback-to-design responses, and the TSFabrics dataset scope. The next scene
compares three curated photos from development and
final runs, including one where
the handcrafted method flags a defect that DINOv2 misses. The visual-change
scene advances through real frames 1, 32, 64, 96, and 192 from one recorded
run as its saved feature-distribution trace grows; the alert is confirmed at
frame 96. The middle scenes follow that run. Two aligned timelines contrast
clustered top scores with time-spaced review requests. The first two recorded
review outcomes are confirmed defects, so six more checks open. After all eight
checks, the recorded comparison shows six distinct defect episodes found versus
five with the unspaced top scores. The final screen reveals a
separate 15-run validation in order: fewer normal alerts, fewer detected
defect frames, fewer detected defect episodes, and a decision to keep the
frozen reference. The scope above each scene distinguishes the three example
runs, the one recorded review run, and the separate update test. Dataset images
are CC BY 4.0: Ni et
al. (2026),
https://doi.org/10.6084/m9.figshare.29573381.

To regenerate, build and serve `docs/` at `http://127.0.0.1:8766/`, then run
`node scripts/capture_recorded_run.js` and
`python scripts/build_recorded_run_gif.py`. The encoder needs ffmpeg on PATH,
`FFMPEG_PATH`, or the `imageio-ffmpeg` Python package. The captures remain in
the ignored `out/` directory.
