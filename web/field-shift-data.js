window.SURFACETRACE_SHIFT_ANALYSIS = {
  "schemaVersion": 1,
  "run": "T1_S478_I118_2",
  "sourceRun": "T1_S174_I111_1",
  "model": "Frozen DINOv2-S/14",
  "method": "Original core.py patch kNN, k=3, rebuilt original 512-image source reference, CPU float32 inference",
  "referenceImages": 308,
  "referencePatches": 7392,
  "sourceThreshold": 0.47077027037739766,
  "referenceCheck": {
    "frame": 1506,
    "recordedScore": 0.5369413495,
    "computedScore": 0.5351842641830444,
    "tolerance": 0.005
  },
  "display": {
    "low": 0.104827880859375,
    "high": 0.31040283203124996,
    "quantiles": [
      0.5,
      0.995
    ],
    "alphaMax": 180,
    "meaning": "continuous patch distance, not a binary defect mask"
  },
  "dataset": "https://doi.org/10.6084/m9.figshare.29573381",
  "assets": [
    {
      "run": "T1_S478_I118_2",
      "frame": 1,
      "image": "./scenario/demo-001.jpg",
      "heatmap": "./scenario/demo-001-heat.png",
      "score": 0.3124161958694458,
      "originalArchivePath": "TSfabrics/IMAGE/T1_S478_I118_2/000001.jpeg",
      "displayImagePixelMAE": 3.1169921875
    },
    {
      "run": "T1_S478_I118_2",
      "frame": 32,
      "image": "./scenario/demo-032.jpg",
      "heatmap": "./scenario/demo-032-heat.png",
      "score": 0.37680378556251526,
      "originalArchivePath": "TSfabrics/IMAGE/T1_S478_I118_2/000032.jpeg",
      "displayImagePixelMAE": 3.35665625
    },
    {
      "run": "T1_S478_I118_2",
      "frame": 64,
      "image": "./scenario/demo-064.jpg",
      "heatmap": "./scenario/demo-064-heat.png",
      "score": 0.2484634667634964,
      "originalArchivePath": "TSfabrics/IMAGE/T1_S478_I118_2/000064.jpeg",
      "displayImagePixelMAE": 3.31759375
    },
    {
      "run": "T1_S478_I118_2",
      "frame": 96,
      "image": "./scenario/demo-096.jpg",
      "heatmap": "./scenario/demo-096-heat.png",
      "score": 0.29740282893180847,
      "originalArchivePath": "TSfabrics/IMAGE/T1_S478_I118_2/000096.jpeg",
      "displayImagePixelMAE": 3.17284375
    },
    {
      "run": "T1_S478_I118_2",
      "frame": 192,
      "image": "./scenario/demo-192.jpg",
      "heatmap": "./scenario/demo-192-heat.png",
      "score": 0.2445826232433319,
      "originalArchivePath": "TSfabrics/IMAGE/T1_S478_I118_2/000192.jpeg",
      "displayImagePixelMAE": 3.032265625
    }
  ]
};
