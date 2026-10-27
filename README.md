# Errordetect · SurfaceTrace

금속 표면의 이상 영역을 찾고, **AI 박스 초안을 사람이 수정·확정한 뒤 일일 보고서와 라벨 데이터로 내보내는** 팀 시연 프로젝트입니다.

[팀 코드 저장소](https://github.com/riverblue72/Errordetect) · [현재 시연 사이트](https://surface-trace-labeling-demo.ableolm2049.chatgpt.site) · [팀 작업 안내](CONTRIBUTING.md)

현재 시연 사이트는 공개되어 있어 링크가 있는 누구나 접속할 수 있습니다. 팀원에게 위 시연 사이트 주소를 전달하면 됩니다. GitHub에 코드를 올리는 것만으로 이 사이트의 배포 내용이 바뀌지는 않습니다.

## 팀원 빠른 시작

Python이 설치되어 있다면 저장소에 포함된 완성본을 바로 실행할 수 있습니다.

```bash
git clone https://github.com/riverblue72/Errordetect.git
cd Errordetect
python3 -m http.server 8766 --bind 127.0.0.1 --directory docs
```

브라우저에서 <http://127.0.0.1:8766/>에 접속합니다. 첫 화면에서 **Labeling studio**로 들어가 AI 초안 생성 → 사람의 수정·확정 → **Daily report** 흐름을 시연할 수 있습니다. `index.html`을 파일로 직접 열지 말고 위 서버를 사용하세요.

수정은 `web/`에서 하고, `python3 scripts/build_site.py`로 `docs/`를 다시 만듭니다. 최초 개발 환경 설치와 팀 작업 순서는 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

기존 SurfaceTrace의 정상 기준 모델·이상 점수·히트맵을 활용하고, 라벨 초안 생성과 편집 화면, 인간 검수, 일일 보고서·JSON 내보내기 흐름을 연결했습니다. 새로운 모델 학습이나 팀원 간 검수 데이터 동기화는 구현되어 있지 않습니다.

Original SurfaceTrace: industrial surface anomaly review demo by ISM × RIKU, [original demonstration](https://gohyunsu.github.io/surface-trace/).

SurfaceTrace highlights regions unlike normal reference photos and gives an operator a review cue. The current data is **KolektorSDD metal surface imagery**, not rubber belt imagery. The anomaly score is a distance, not a defect probability or a production quality decision.

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/` | Editable HTML, CSS, JavaScript, six method GIFs, held-out photos, landscape display copies, and example heatmaps |
| `model/` | CPU reference model, saved normal patch bank, browser calibration, and Python evaluation |
| `scripts/` | Static site build, calibration, and browser checks |
| `data/ksdd/` | Reproducible item-group split; full dataset images are downloaded separately |
| `docs/` | Generated static site, ready to serve locally or publish from `main` / `docs` with GitHub Pages |
| `notes/experiment.md` | Experiment protocol, metrics, and limitations |

Edit `web/` or the model source, then run `python scripts/build_site.py`. Commit the resulting `docs/` changes with the source changes. The sample explorer runs inference on packaged held-out test photos. The added labeling studio also accepts local image uploads.

## Labeling studio demo

Open `workspace.html` from the homepage's **Labeling studio** link. The original landing page and sample explorer remain available.

1. The studio loads 12 marked demonstration photos and generates real region proposals with the existing model in a Web Worker.
2. Select a photo. Toggle the heatmap, draw a box, drag a box to move it, or resize its corners. Delete and undo are supported.
3. Choose a defect type and confirm the label, or confirm the image as normal. Normal confirmation removes final boxes but preserves the original AI proposal. Edits to a confirmed item return it to the review queue.
4. Open **Daily report** to see counts, confirmed defect types, the actual model score distribution, and recent decisions. Filters use the image registration date, source, and LOT. PDF output is available through the browser's print dialog.
5. Export confirmed labels or the filtered report as JSON. Normalized bounding boxes use the displayed image coordinates; demo photos are rotated 90 degrees clockwise. Uploaded files retain their original orientation. Original uploaded images are not embedded in the export.

Images, annotations, and decision events persist in this browser's IndexedDB. Uploaded images are processed locally and are not sent to a server. This is a single-browser demonstration, with no accounts, shared database, background scheduling, or model retraining. **Reset demo** clears only demonstration annotations and events, preserving uploads. Supported uploads are JPEG, PNG, and WebP, up to 15 MB and 40 megapixels each, 30 files per selection.

The model proposes coarse bounding boxes from patch scores; it does not classify defect types, measure physical depth, or produce calibrated confidence values. Dataset labels are used only to choose varied demo photos and are never used to generate predictions. “New type candidate” is a human-assigned label. Report counts describe images, not production units.

Run `npm run smoke:workspace` against the local server to test editing, confirmation, reload persistence, upload processing, report reconciliation, exports, and selective reset. Use `CHROME_PATH` for an installed browser.

## Run locally

The checked-in model and held-out test photos are enough to rebuild and test the site without downloading the full dataset:

```bash
python -m pip install -r requirements.txt
python scripts/build_site.py
python -m http.server 8766 --bind 127.0.0.1 --directory docs
```

Open `http://127.0.0.1:8766/`. To run the browser checks, install Node dependencies with `npm install` and a browser with `npx playwright install chromium`, then use `npm run smoke` or `npm run visual`. Set `SITE_URL` to test a deployed site; otherwise the scripts use the local server. Set `CHROME_PATH` to an installed Chrome executable if desired.

To refresh the packaged samples from the original KolektorSDD dataset, run `python scripts/prepare_samples.py` before building. It keeps each original JPEG for model input and creates a landscape copy for display.

The HOW IT WORKS section uses English headings and Korean detail text. Steps 01–06 retain the original GIFs in `web/method/`, covering reference preparation, preprocessing, patches, handcrafted features, comparison, and heatmaps. Steps 07–09 use SVG/CSS illustrations of label proposals, human correction, and daily reports. All nine cards and illustration canvases have white backgrounds and the original card layout. The illustrations describe the process, not live measurements. Reduced-motion preferences select static PNG posters for the original GIFs and stop the added SVG animations. Styles for the additions live in `web/method-studio.css`. The favicon is `web/favicon.svg`.

## Reproduce the model and evaluation

Download the [original KolektorSDD images and pixel masks](https://www.vicos.si/resources/kolektorsdd/) into `data/ksdd/raw/kosXX/`, preserving the source folder names. The downloaded files are ignored by Git. The checked-in `manifest.csv` records our project split; `python data/ksdd/make_manifest.py` regenerates it. The model commands are:

```bash
python model/model.py
python scripts/build_site.py
python model/evaluate.py
npm run calibrate
python scripts/build_site.py
```

`npm run calibrate` needs the local static server running and the full dataset. It measures scores through the browser Canvas path and writes `model/browser_calibration.json`; rebuilding then embeds its threshold. See [experiment notes](notes/experiment.md) for the exact split and held-out results.

## Deployment

This repository stores the team's source and the generated `docs/` website. The current ChatGPT Sites demo is a separate deployment: pushing to this GitHub repository does **not** update it automatically.

To host the same static site on GitHub Pages, enable **Settings → Pages → Deploy from a branch → main → /docs**. Once Pages is enabled, pushes containing rebuilt `docs/` files can publish the updated site. This README does not imply that Pages has already been enabled. See [the team guide](CONTRIBUTING.md) for the editing and handoff workflow.

## Data attribution

The demo photos and reference model are derived from [KolektorSDD by ViCoS Lab / Kolektor Group](https://www.vicos.si/resources/kolektorsdd/), associated with [Tabernik et al. (2019)](https://doi.org/10.1007/s10845-019-01476-x). The dataset is [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/); check the source terms before commercial use. No license for the original project code is granted by this README.

