# Dataset integrity checks (2026-10-27)

These archives were downloaded and checked on the private experiment server.
The raw data is not committed to Git.

| Archive | MD5 obtained | Published MD5 | Result |
| --- | --- | --- | --- |
| TSFabrics ZIP | `0ec5124111b17234b41f529983eb4e98` | `0ec5124111b17234b41f529983eb4e98` | Match |
| LUSITANOv2 validation images | `b7d2f585dfd063f557f8b881b8d0ad65` | `b7d2f585dfd063f557f8b881b8d0ad65` | Match |
| LUSITANOv2 test images | `6d6e676719c112146bd4505aabec9f44` | `6d6e676719c112146bd4505aabec9f44` | Match |

Sources: [TSFabrics Figshare](https://doi.org/10.6084/m9.figshare.29573381),
[LUSITANOv2 Zenodo](https://doi.org/10.5281/zenodo.22150068).

The TSFabrics inventory contains 93,196 frames in 22 scenarios. CSV image
labels and defect masks disagree on 11 frames; see
[`results/mask_audit.json`](results/mask_audit.json). The released LUSITANOv2
test archive contains one zero-byte TIFF (`20240724_225529_420.tif`), excluded
from image evaluation. Its archive hash still matches the published value.
