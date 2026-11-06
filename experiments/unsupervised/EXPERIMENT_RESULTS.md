# Unlabeled production-image inspection: experiment results

This is an experimental pipeline separate from the KolektorSDD browser MVP.
The public site shows curated TSFabrics frames and saved results from this
experiment; it does not run the research model on new inputs. All operational
reference selection, threshold calibration, and change detection use images
without defect labels.
Public labels are used for evaluation; LUSITANOv2 validation labels additionally
construct the disclosed rare-defect simulation.

## Data and fixed protocol

| Dataset | Why it is used | Evaluation |
| --- | --- | --- |
| [TSFabrics](https://doi.org/10.6084/m9.figshare.29573381) | 93,196 time-ordered production frames in 22 fabric scenarios, with changes in acquisition conditions and annotated cutlines | One source scenario, three separate target scenarios; fixed early-frame startup/calibration and later-frame evaluation. A second, defect-contaminated source is a post-hoc sensitivity analysis. |
| [LUSITANOv2](https://doi.org/10.5281/zenodo.22150068) | Native 4096×1024 RGB line-scan TIFFs from an active production line | 510 validation images for startup, 510 disjoint validation images for calibration, official test split for evaluation. Each validation subset contains 3 defects (0.59%) by construction. |

The backbone is frozen DINOv2 ViT-S/14. Patch features form a k=3 cosine
nearest-neighbor reference bank, and each image score is the mean of its
highest-scoring 1% of patches. A label-free mutual-similarity rank can retain
the 60% least novel startup frames across four appearance bins. The simple
comparison uses an equal-size bank sampled from all startup frames. Thresholds
are the 99.5th percentile of scores from disjoint, unlabeled calibration
images. TSFabrics also compares the previous eight-feature handcrafted method,
an oracle normal-only reference, MMD change alarms, and a shadow adaptation
candidate. This implementation is inspired by MuSc/PatchCore-style matching;
it is not an official reproduction of either method.

The equal-capacity DINOv2 banks isolate the effect of reference-frame
selection. The handcrafted method uses a different representation; the shadow
candidate changes both the reference and its calibration threshold. Those
comparisons are not single-factor ablations.

## 1. TSFabrics: changes and contaminated startup

The primary source is `T1_S174_I111_1`. Its first 512 frames contain no
labeled defects. Source calibration is frames 512–2047 and source holdout is
2112–4095. Each target uses frames 0–511 only for the shadow adaptation bank,
512–767 for its calibration, and 832 onward for evaluation. The 64-frame gaps
limit adjacent-frame leakage. The frozen methods use only source calibration.

| Target test stream | Defects / frames | Mutual-selected DINO: AUROC, recall, false alarms | All-unlabeled DINO: AUROC, recall, false alarms | Handcrafted: AUROC, recall, false alarms |
| --- | ---: | ---: | ---: | ---: |
| `T1_S148_I108_2`, related condition | 138 / 3,972 | .989, .543, 7 | .969, .101, 28 | **.997, .703, 5** |
| `T1_S164_I36_1`, normal changed condition | 0 / 975 | AUROC N/A, 11 false alarms | N/A, 971 false alarms | N/A, 975 false alarms |
| `T1_S478_I118_2`, larger shift | 82 / 2,372 | **.987, .402, 0** | .561, 1.000, 2,060 | .973, .427, 14 |

The handcrafted approach wins in the related condition. The selected DINO
bank is substantially more stable in the two changed conditions; on the
larger shift it trades a small amount of recall for zero false alarms. AUROC
cannot be computed on the all-normal stream.

The change detector raises no alarm on the source holdout. It first alarms
at target frame 192 on the two changed conditions and at frame 3744
on the related condition. It detects a feature-distribution change; it does
not identify a defect or authorize a new reference automatically.

The shadow candidate applies the same label-free selection to the first 512
frames of each target run, keeps 308 frames, and recalibrates its threshold on
frames 512–767. The frozen and candidate models are evaluated on the same later
frames. Labels below are used only for retrospective evaluation.

| Target | Selected startup defects, checked afterward | Defect recall: frozen → candidate | False alarms: frozen → candidate | Image AUROC: frozen → candidate |
| --- | ---: | ---: | ---: | ---: |
| Related run | 1 / 308 | 54.3% (75/138) → 28.3% (39/138) | 7/3,834 → 1/3,834 | .9891 → .9890 |
| Changed, normal | 0 / 308 | N/A | 11/975 → 3/975 | N/A |
| Larger shift | 0 / 308 | 40.2% (33/82) → 6.1% (5/82) | 0/2,290 → 0/2,290 | .9873 → .9943 |

The candidate reduces false alarms on two runs but loses defect recall on both
runs with defects. On the larger shift, AUROC improves while thresholded recall
falls, so the ranking and the decision threshold tell different stories.
Selection removed all labeled defects from that candidate startup set, yet
recall still fell. Because both the target reference and its calibration
threshold changed, these results do not isolate the cause of that loss.
**Automatic promotion of the candidate is not supported.**

This is an offline trial: its first 512 target frames were chosen regardless of
when the change detector fired. For the related run, the first change alarm was
at frame 3744, long after those startup frames. It is therefore not yet an
evaluation of a prospectively triggered, post-alert update.
With one source and three target runs, these figures describe the tested runs;
they do not establish a population-wide advantage or a reliable confidence
interval across production conditions.

For a cleaner next comparison, freeze the alert rule and use only frames after
the alert for the candidate's startup, a disjoint later block for calibration,
and a further later block for evaluation. Compare equal-capacity target banks
built from all startup frames versus label-free selected frames. For the selected
bank, compare source-based versus target-based threshold calibration separately.
Report defect recall at a fixed false-alarm budget, false alarms per 10,000
normal frames, image AUROC/AP, change-alert latency, and the rate of false
change alerts. Use run-level or temporal-block confidence intervals rather than
independent-frame intervals. Operator-vetted normal frames can form a separate
human-in-the-loop condition once actual review decisions exist.

For a separate sensitivity analysis, `T1_S148_I108_2` is the source. Its
first 512 frames contain 21 labeled defects; label-free selection retains
308 frames containing 1 defect. On `T1_S478_I118_2`, selected DINO yields
AUROC .993, recall .159, and 0 false alarms. The all-unlabeled bank yields
AUROC .630, recall .890, and 1,518 false alarms; the handcrafted baseline
yields AUROC .954, recall 0, and 0 false alarms. Selection resists reference
contamination, although the thresholded recall remains low. This source
choice followed the primary results and is not an independent confirmatory
test.

## 2. LUSITANOv2: raw-image preprocessing

One input keeps the full 4096×1024 frame in a 518×518 aspect-preserving
letterbox. The other uses five overlapping 1024×1024 crops, each resized to
518×518. Both use the same 510 startup images, frozen backbone, 3,696-vector
reference capacity, disjoint calibration images, and 2,511 readable official
test images (1,248 defective). Each startup set contains 3 defects; the
label-free selection keeps 308 frames and happens to exclude all 3.

| Input and bank | Image AUROC | Average precision | Recall at calibrated threshold | False alarms | Hottest patch in a labeled box |
| --- | ---: | ---: | ---: | ---: | ---: |
| Full frame, all-unlabeled | **.9765** | **.9781** | **.4519** (564/1,248) | **2/1,263** | .6242 |
| Full frame, selected | .9724 | .9722 | .3582 | 4/1,263 | .6755 |
| Five tiles, all-unlabeled | .9521 | .9522 | .1907 | 3/1,263 | .7236 |
| Five tiles, selected | .9388 | .9329 | .2372 | 3/1,263 | **.7492** |

Full-frame input discriminates images better; tiles place the hottest patch
inside a labeled defect box more often. Selection removes the rare startup
defects but does not improve image-level ranking on this dataset. A practical
next prototype should therefore test a full-frame screening step followed by
tile-based localization for reviewed frames. That two-stage combination has
**not yet been measured as one end-to-end decision rule**.

Mean test time was 42 ms per full-frame image and 92 ms per tiled image on
the RTX 3090. These timings include image loading, feature extraction, **both**
reference scorers, and localization bookkeeping; they are not isolated
single-model production latency. Test prevalence is about 50%, so the measured
test precision is not an estimate of field precision at 0.59% defects.

## Data checks and interpretation

- The TSFabrics archive checksum was verified. CSV image labels and defect
  masks disagree on 11 frames among 93,196; conflicting frames are excluded
  from scored test streams. The selected scenarios have no such conflicts.
- The LUSITANOv2 validation and test archive checksums match Zenodo. One
  released test TIFF is zero bytes; `20240724_225529_420.tif` is excluded.
- These are textile production images, not rubber-belt production images.
  The LUSITANOv2 train archive was not used; its validation/test split is a
  simulation, and the official test split is nearly balanced. Neither result
  estimates factory defect prevalence, drift frequency, or operating safety.
- The LUSITANOv2 Zenodo record has no stated license in its Rights field as
  checked on 2026-10-27. Research evaluation is kept on the private server;
  sample images should not be republished on the site without clarification.

The next implementation gate is a prospective, time-ordered benchmark with
multiple source/target pairs and an explicit false-alarm budget. Change alarms
should open a review/shadow-adaptation workflow; reference promotion needs an
independent check that recall is preserved. Real rubber-belt photos and the
company's defect criteria are still required before a deployment claim.

Machine-readable results: [primary TSFabrics](results/tsfabrics.json),
[contaminated-source sensitivity](results/tsfabrics_contaminated_source.json),
[LUSITANOv2 full frame](results/lusitano_global.json), and
[LUSITANOv2 tiles](results/lusitano_tiles.json).
