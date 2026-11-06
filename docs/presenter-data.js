// SurfaceTrace presenter: recorded data only.
// Public labels are supplied for explicit reveal after a review action.
// Original demo photo pairs, full score trace, and queues are retained.
window.SURFACETRACE_PRESENTER_DATA = {
  "metadata": {
    "version": 2,
    "dataset": "TSFabrics",
    "model": "Frozen DINOv2 ViT-S/14 + selected source patch bank",
    "sourceRun": "T1_S174_I111_1",
    "sourceThreshold": 0.47077027037739766,
    "frameNumbering": "one-based displayed frame numbers",
    "recordedReplay": true,
    "modelWeightsUpdated": false,
    "labelSource": "TSFabrics published dataset labels",
    "labelPolicy": "요청된 사진의 공개 정답을 확인 결과로 재생합니다. 실제 현장 작업자의 검수 기록이나 브라우저의 실시간 추론이 아닙니다.",
    "revealPolicy": "review[].recordedLabel 및 datasetLabel은 확인 동작 이후에만 화면에 표시합니다.",
    "license": "TSFabrics · CC BY 4.0",
    "datasetUrl": "https://doi.org/10.6084/m9.figshare.29573381",
    "note": "원본 시연의 2건 우선→총8건 확대 사례를 먼저 보여줍니다. 추가 예시인 정상2건 종료 사례는 개발 녹화의 실제 순위를 따릅니다. 동일한 고정 DINOv2 기준과16프레임 간격 검수 규칙의 기록을 사용합니다.",
    "sources": [
      "experiments/unsupervised/SEQUENTIAL_REVIEW_PROTOCOL.md",
      "experiments/unsupervised/results/sequential_review_development.json",
      "experiments/unsupervised/results/sequential_review_final.json",
      "web/unlabeled-demo/manifest.json",
      "web/unlabeled-demo/evaluation.json"
    ]
  },
  "cases": {
    "normal": {
      "id": "normal",
      "title": "정상 2건 확인 후 종료",
      "phase": "development",
      "phaseLabel": "추가 사례 · 개발 녹화",
      "run": "T1_S164_I36_1",
      "evaluationFrames": [
        321,
        1807
      ],
      "frameCount": 1487,
      "pilotSize": 2,
      "maxReviews": 8,
      "recordedRequests": 2,
      "recordedOutcome": "stop-after-two-normal",
      "sourceThreshold": 0.47077027037739766,
      "queueFrames": [
        694,
        1596,
        514,
        1417,
        1235,
        333,
        1776,
        1054
      ],
      "review": [
        {
          "rank": 1,
          "frame": 694,
          "score": 0.5197678,
          "image": "./review-frames/T1_S164_I36_1-00694.jpg",
          "heatmap": null,
          "recordedLabel": "normal",
          "datasetLabel": "Normal",
          "ambiguous": false,
          "source": "web/review-frames/results.json · query frame 694"
        },
        {
          "rank": 2,
          "frame": 1596,
          "score": 0.507341206073761,
          "image": "./next-samples/sample-05.jpg",
          "heatmap": "./next-samples/sample-05-current.png",
          "recordedLabel": "normal",
          "datasetLabel": "Normal",
          "ambiguous": false,
          "source": "web/next-samples/catalog.json · sample 05; zero-based index 1595 → displayed frame 1596"
        }
      ],
      "allEightImagesAvailable": false,
      "note": "상위 두 사진 모두 공개 정답이 정상으로 확인되어 자동 추가 요청이 끝난 사례입니다. 구간 전체가 정상임을 두 장만으로 보장한다는 뜻은 아닙니다. 나머지 6건은 요청하지 않은 후보이며 이 페이지에 대응 사진을 꾸며 넣지 않습니다.",
      "sources": [
        "experiments/unsupervised/results/sequential_review_development.json",
        "experiments/unsupervised/results/unlabeled_review_development.json",
        "web/review-frames/results.json",
        "web/next-samples/catalog.json"
      ]
    },
    "defect": {
      "id": "defect",
      "title": "결함 확인 후 8건까지 확대",
      "phase": "final",
      "phaseLabel": "원본 시연 · 최종 평가 녹화",
      "run": "T1_S478_I118_2",
      "evaluationFrames": [
        321,
        3204
      ],
      "frameCount": 2884,
      "pilotSize": 2,
      "maxReviews": 8,
      "recordedRequests": 8,
      "recordedOutcome": "expand-to-eight",
      "sourceThreshold": 0.47077027037739766,
      "queueFrames": [
        1506,
        2473,
        538,
        1984,
        1026,
        2967,
        405,
        1380
      ],
      "review": [
        {
          "rank": 1,
          "frame": 1506,
          "score": 0.536941,
          "image": "./unlabeled-demo/review-01.jpg",
          "heatmap": "./unlabeled-demo/review-01-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 2,
          "frame": 2473,
          "score": 0.534239,
          "image": "./unlabeled-demo/review-02.jpg",
          "heatmap": "./unlabeled-demo/review-02-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 3,
          "frame": 538,
          "score": 0.530293,
          "image": "./unlabeled-demo/review-03.jpg",
          "heatmap": "./unlabeled-demo/review-03-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 4,
          "frame": 1984,
          "score": 0.529601,
          "image": "./unlabeled-demo/review-04.jpg",
          "heatmap": "./unlabeled-demo/review-04-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 5,
          "frame": 1026,
          "score": 0.524407,
          "image": "./unlabeled-demo/review-05.jpg",
          "heatmap": "./unlabeled-demo/review-05-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 6,
          "frame": 2967,
          "score": 0.500847,
          "image": "./unlabeled-demo/review-06.jpg",
          "heatmap": "./unlabeled-demo/review-06-heat.png",
          "recordedLabel": "defect",
          "datasetLabel": "Defect",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 7,
          "frame": 405,
          "score": 0.465753,
          "image": "./unlabeled-demo/review-07.jpg",
          "heatmap": "./unlabeled-demo/review-07-heat.png",
          "recordedLabel": "normal",
          "datasetLabel": "Normal",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        },
        {
          "rank": 8,
          "frame": 1380,
          "score": 0.437991,
          "image": "./unlabeled-demo/review-08.jpg",
          "heatmap": "./unlabeled-demo/review-08-heat.png",
          "recordedLabel": "normal",
          "datasetLabel": "Normal",
          "ambiguous": false,
          "source": "web/unlabeled-demo/manifest.json + evaluation.json"
        }
      ],
      "allEightImagesAvailable": true,
      "recordedNormalReviews": 2,
      "recordedDefectReviews": 6,
      "recordedEpisodesFound": 6,
      "newDefectEpisodes": 6,
      "note": "처음 두 요청 사진에서 결함이 확인되어 나머지 6건을 확인한 사례입니다. 총 8장에는 결함 사진 6장과 정상 사진 2장이 포함됩니다.",
      "sources": [
        "web/unlabeled-demo/manifest.json",
        "web/unlabeled-demo/evaluation.json",
        "experiments/unsupervised/results/sequential_review_final.json"
      ]
    }
  },
  "visualShift": {
    "sourceRun": "T1_S174_I111_1",
    "targetRun": "T1_S478_I118_2",
    "window": 128,
    "step": 32,
    "requiredConsecutive": 3,
    "threshold": 0.06392715334892274,
    "boundary": 1024,
    "alertPosition": 1120,
    "alertTargetFrame": 96,
    "points": [
      {
        "end": 128,
        "targetFrame": -896,
        "score": 0.013378,
        "above": false
      },
      {
        "end": 160,
        "targetFrame": -864,
        "score": 0.019982,
        "above": false
      },
      {
        "end": 192,
        "targetFrame": -832,
        "score": 0.022267,
        "above": false
      },
      {
        "end": 224,
        "targetFrame": -800,
        "score": 0.012899,
        "above": false
      },
      {
        "end": 256,
        "targetFrame": -768,
        "score": 0.024108,
        "above": false
      },
      {
        "end": 288,
        "targetFrame": -736,
        "score": 0.025634,
        "above": false
      },
      {
        "end": 320,
        "targetFrame": -704,
        "score": 0.018176,
        "above": false
      },
      {
        "end": 352,
        "targetFrame": -672,
        "score": 0.020374,
        "above": false
      },
      {
        "end": 384,
        "targetFrame": -640,
        "score": 0.026001,
        "above": false
      },
      {
        "end": 416,
        "targetFrame": -608,
        "score": 0.018622,
        "above": false
      },
      {
        "end": 448,
        "targetFrame": -576,
        "score": 0.021771,
        "above": false
      },
      {
        "end": 480,
        "targetFrame": -544,
        "score": 0.019063,
        "above": false
      },
      {
        "end": 512,
        "targetFrame": -512,
        "score": 0.023629,
        "above": false
      },
      {
        "end": 544,
        "targetFrame": -480,
        "score": 0.032278,
        "above": false
      },
      {
        "end": 576,
        "targetFrame": -448,
        "score": 0.015892,
        "above": false
      },
      {
        "end": 608,
        "targetFrame": -416,
        "score": 0.026069,
        "above": false
      },
      {
        "end": 640,
        "targetFrame": -384,
        "score": 0.02826,
        "above": false
      },
      {
        "end": 672,
        "targetFrame": -352,
        "score": 0.019909,
        "above": false
      },
      {
        "end": 704,
        "targetFrame": -320,
        "score": 0.029638,
        "above": false
      },
      {
        "end": 736,
        "targetFrame": -288,
        "score": 0.026327,
        "above": false
      },
      {
        "end": 768,
        "targetFrame": -256,
        "score": 0.021391,
        "above": false
      },
      {
        "end": 800,
        "targetFrame": -224,
        "score": 0.02658,
        "above": false
      },
      {
        "end": 832,
        "targetFrame": -192,
        "score": 0.016105,
        "above": false
      },
      {
        "end": 864,
        "targetFrame": -160,
        "score": 0.022813,
        "above": false
      },
      {
        "end": 896,
        "targetFrame": -128,
        "score": 0.024372,
        "above": false
      },
      {
        "end": 928,
        "targetFrame": -96,
        "score": 0.012983,
        "above": false
      },
      {
        "end": 960,
        "targetFrame": -64,
        "score": 0.020195,
        "above": false
      },
      {
        "end": 992,
        "targetFrame": -32,
        "score": 0.026478,
        "above": false
      },
      {
        "end": 1024,
        "targetFrame": 0,
        "score": 0.011486,
        "above": false
      },
      {
        "end": 1056,
        "targetFrame": 32,
        "score": 0.071945,
        "above": true
      },
      {
        "end": 1088,
        "targetFrame": 64,
        "score": 0.253231,
        "above": true
      },
      {
        "end": 1120,
        "targetFrame": 96,
        "score": 0.427358,
        "above": true
      },
      {
        "end": 1152,
        "targetFrame": 128,
        "score": 0.735944,
        "above": true
      },
      {
        "end": 1184,
        "targetFrame": 160,
        "score": 0.739636,
        "above": true
      },
      {
        "end": 1216,
        "targetFrame": 192,
        "score": 0.769458,
        "above": true
      },
      {
        "end": 1248,
        "targetFrame": 224,
        "score": 0.771083,
        "above": true
      },
      {
        "end": 1280,
        "targetFrame": 256,
        "score": 0.717042,
        "above": true
      },
      {
        "end": 1312,
        "targetFrame": 288,
        "score": 0.68845,
        "above": true
      },
      {
        "end": 1344,
        "targetFrame": 320,
        "score": 0.765248,
        "above": true
      },
      {
        "end": 1376,
        "targetFrame": 352,
        "score": 0.859663,
        "above": true
      },
      {
        "end": 1408,
        "targetFrame": 384,
        "score": 0.785439,
        "above": true
      },
      {
        "end": 1440,
        "targetFrame": 416,
        "score": 0.700305,
        "above": true
      },
      {
        "end": 1472,
        "targetFrame": 448,
        "score": 0.700163,
        "above": true
      },
      {
        "end": 1504,
        "targetFrame": 480,
        "score": 0.74898,
        "above": true
      },
      {
        "end": 1536,
        "targetFrame": 512,
        "score": 0.655473,
        "above": true
      },
      {
        "end": 1568,
        "targetFrame": 544,
        "score": 0.629165,
        "above": true
      },
      {
        "end": 1600,
        "targetFrame": 576,
        "score": 0.686497,
        "above": true
      },
      {
        "end": 1632,
        "targetFrame": 608,
        "score": 0.740104,
        "above": true
      },
      {
        "end": 1664,
        "targetFrame": 640,
        "score": 0.730958,
        "above": true
      },
      {
        "end": 1696,
        "targetFrame": 672,
        "score": 0.754398,
        "above": true
      },
      {
        "end": 1728,
        "targetFrame": 704,
        "score": 0.768534,
        "above": true
      },
      {
        "end": 1760,
        "targetFrame": 736,
        "score": 0.735408,
        "above": true
      },
      {
        "end": 1792,
        "targetFrame": 768,
        "score": 0.65909,
        "above": true
      },
      {
        "end": 1824,
        "targetFrame": 800,
        "score": 0.693782,
        "above": true
      },
      {
        "end": 1856,
        "targetFrame": 832,
        "score": 0.802278,
        "above": true
      },
      {
        "end": 1888,
        "targetFrame": 864,
        "score": 0.809111,
        "above": true
      },
      {
        "end": 1920,
        "targetFrame": 896,
        "score": 0.723526,
        "above": true
      },
      {
        "end": 1952,
        "targetFrame": 928,
        "score": 0.711134,
        "above": true
      },
      {
        "end": 1984,
        "targetFrame": 960,
        "score": 0.761081,
        "above": true
      },
      {
        "end": 2016,
        "targetFrame": 992,
        "score": 0.686506,
        "above": true
      },
      {
        "end": 2048,
        "targetFrame": 1024,
        "score": 0.651348,
        "above": true
      }
    ],
    "referencePhoto": {
      "frame": 3136,
      "run": "T1_S174_I111_1",
      "image": "./scenario/source-3136.jpg",
      "datasetLabel": "Normal",
      "caption": "기준 녹화 · 3,136번째 사진"
    },
    "photos": [
      {
        "frame": 1,
        "image": "./scenario/demo-001.jpg",
        "datasetLabel": "Normal",
        "caption": "변경 녹화 · 1번째 사진"
      },
      {
        "frame": 32,
        "image": "./scenario/demo-032.jpg",
        "datasetLabel": "Defect",
        "caption": "변경 녹화 · 32번째 사진"
      },
      {
        "frame": 64,
        "image": "./scenario/demo-064.jpg",
        "datasetLabel": "Normal",
        "caption": "변경 녹화 · 64번째 사진"
      },
      {
        "frame": 96,
        "image": "./scenario/demo-096.jpg",
        "datasetLabel": "Normal",
        "caption": "변경 녹화 · 96번째 사진"
      },
      {
        "frame": 192,
        "image": "./scenario/demo-192.jpg",
        "datasetLabel": "Normal",
        "caption": "변경 녹화 · 192번째 사진"
      }
    ],
    "note": "서로 다른 실제 녹화를 알려진 경계에서 이어 붙인 실험입니다. 이 사례는 변경 녹화의 96번째 사진 시점에 외관 변화 경보가 확정됩니다. 결함 확정이나 실제 공정 변경 원인·시각을 알아낸 결과가 아닙니다.",
    "sources": [
      "web/unlabeled-demo/manifest.json",
      "web/scenario/manifest.json"
    ]
  },
  "photoExamples": [
    {
      "id": "photo-06",
      "title": "정상 사진의 오경보 비교",
      "phase": "development",
      "phaseLabel": "개발 녹화 사례",
      "run": "T1_S164_I36_1",
      "frame": 1264,
      "image": "./next-samples/sample-06.jpg",
      "recordedLabel": "normal",
      "datasetLabel": "Normal",
      "classic": {
        "score": 4.580361366271973,
        "threshold": 3.7415819525718748,
        "heatmap": "./ablation/sample-06-classic.png",
        "alert": true
      },
      "dino": {
        "score": 0.1986994594335556,
        "threshold": 0.47077027037739766,
        "heatmap": "./next-samples/sample-06-current.png",
        "alert": false
      },
      "note": "원본 시연의 같은 사진·방법별 히트맵 비교입니다. 두 방법의 점수 척도와 경보선은 다르며 공개 정답으로 사후 해석한 예시입니다.",
      "sources": [
        "web/demo.js · featureCases [6, 7, 4]",
        "web/next-samples/catalog.json",
        "web/ablation/catalog.json"
      ]
    },
    {
      "id": "photo-07",
      "title": "DINOv2가 탐지한 결함 사진",
      "phase": "final",
      "phaseLabel": "최종 평가 녹화 사례",
      "run": "T1_S478_I118_2",
      "frame": 1509,
      "image": "./next-samples/sample-07.jpg",
      "recordedLabel": "defect",
      "datasetLabel": "Defect",
      "classic": {
        "score": 3.2714452743530273,
        "threshold": 3.7415819525718748,
        "heatmap": "./ablation/sample-07-classic.png",
        "alert": false
      },
      "dino": {
        "score": 0.5244917869567871,
        "threshold": 0.47077027037739766,
        "heatmap": "./next-samples/sample-07-current.png",
        "alert": true
      },
      "note": "원본 시연의 같은 사진·방법별 히트맵 비교입니다. 두 방법의 점수 척도와 경보선은 다르며 공개 정답으로 사후 해석한 예시입니다.",
      "sources": [
        "web/demo.js · featureCases [6, 7, 4]",
        "web/next-samples/catalog.json",
        "web/ablation/catalog.json"
      ]
    },
    {
      "id": "photo-04",
      "title": "DINOv2가 놓친 결함 사진",
      "phase": "development",
      "phaseLabel": "개발 녹화 사례",
      "run": "T1_S148_I108_2",
      "frame": 3011,
      "image": "./next-samples/sample-04.jpg",
      "recordedLabel": "defect",
      "datasetLabel": "Defect",
      "classic": {
        "score": 5.45220947265625,
        "threshold": 3.7415819525718748,
        "heatmap": "./ablation/sample-04-classic.png",
        "alert": true
      },
      "dino": {
        "score": 0.22427166998386383,
        "threshold": 0.47077027037739766,
        "heatmap": "./next-samples/sample-04-current.png",
        "alert": false
      },
      "note": "원본 시연의 같은 사진·방법별 히트맵 비교입니다. 두 방법의 점수 척도와 경보선은 다르며 공개 정답으로 사후 해석한 예시입니다.",
      "sources": [
        "web/demo.js · featureCases [6, 7, 4]",
        "web/next-samples/catalog.json",
        "web/ablation/catalog.json"
      ]
    }
  ],
  "interval": {
    "run": "T1_S478_I118_2",
    "evaluationFrames": [
      321,
      3204
    ],
    "frameCount": 2884,
    "sourceThreshold": 0.47077027037739766,
    "scoreQuantiles": {
      "p50": 0.247777,
      "p90": 0.303571,
      "p99": 0.479261
    },
    "chart": [
      {
        "frame": 321,
        "score": 0.223184
      },
      {
        "frame": 322,
        "score": 0.190793
      },
      {
        "frame": 323,
        "score": 0.21809
      },
      {
        "frame": 324,
        "score": 0.191308
      },
      {
        "frame": 325,
        "score": 0.205826
      },
      {
        "frame": 326,
        "score": 0.197114
      },
      {
        "frame": 327,
        "score": 0.198551
      },
      {
        "frame": 328,
        "score": 0.237617
      },
      {
        "frame": 329,
        "score": 0.192876
      },
      {
        "frame": 330,
        "score": 0.194883
      },
      {
        "frame": 331,
        "score": 0.220174
      },
      {
        "frame": 332,
        "score": 0.23369
      },
      {
        "frame": 333,
        "score": 0.204858
      },
      {
        "frame": 334,
        "score": 0.212325
      },
      {
        "frame": 335,
        "score": 0.206258
      },
      {
        "frame": 336,
        "score": 0.218095
      },
      {
        "frame": 337,
        "score": 0.20122
      },
      {
        "frame": 338,
        "score": 0.201949
      },
      {
        "frame": 339,
        "score": 0.230138
      },
      {
        "frame": 340,
        "score": 0.201179
      },
      {
        "frame": 341,
        "score": 0.217522
      },
      {
        "frame": 342,
        "score": 0.255392
      },
      {
        "frame": 343,
        "score": 0.232902
      },
      {
        "frame": 344,
        "score": 0.249261
      },
      {
        "frame": 345,
        "score": 0.266322
      },
      {
        "frame": 346,
        "score": 0.261394
      },
      {
        "frame": 347,
        "score": 0.249093
      },
      {
        "frame": 348,
        "score": 0.256612
      },
      {
        "frame": 349,
        "score": 0.26007
      },
      {
        "frame": 350,
        "score": 0.267848
      },
      {
        "frame": 351,
        "score": 0.277187
      },
      {
        "frame": 352,
        "score": 0.249174
      },
      {
        "frame": 353,
        "score": 0.256282
      },
      {
        "frame": 354,
        "score": 0.271689
      },
      {
        "frame": 355,
        "score": 0.257951
      },
      {
        "frame": 356,
        "score": 0.278204
      },
      {
        "frame": 357,
        "score": 0.269641
      },
      {
        "frame": 358,
        "score": 0.277422
      },
      {
        "frame": 359,
        "score": 0.286722
      },
      {
        "frame": 360,
        "score": 0.266495
      },
      {
        "frame": 361,
        "score": 0.272464
      },
      {
        "frame": 362,
        "score": 0.270856
      },
      {
        "frame": 363,
        "score": 0.294167
      },
      {
        "frame": 364,
        "score": 0.282003
      },
      {
        "frame": 365,
        "score": 0.315402
      },
      {
        "frame": 366,
        "score": 0.30634
      },
      {
        "frame": 367,
        "score": 0.289502
      },
      {
        "frame": 368,
        "score": 0.280915
      },
      {
        "frame": 369,
        "score": 0.2745
      },
      {
        "frame": 370,
        "score": 0.273325
      },
      {
        "frame": 371,
        "score": 0.28015
      },
      {
        "frame": 372,
        "score": 0.276273
      },
      {
        "frame": 373,
        "score": 0.268573
      },
      {
        "frame": 374,
        "score": 0.280567
      },
      {
        "frame": 375,
        "score": 0.261349
      },
      {
        "frame": 376,
        "score": 0.270086
      },
      {
        "frame": 377,
        "score": 0.267545
      },
      {
        "frame": 378,
        "score": 0.276789
      },
      {
        "frame": 379,
        "score": 0.260179
      },
      {
        "frame": 380,
        "score": 0.276699
      },
      {
        "frame": 381,
        "score": 0.27426
      },
      {
        "frame": 382,
        "score": 0.250997
      },
      {
        "frame": 383,
        "score": 0.268441
      },
      {
        "frame": 384,
        "score": 0.281356
      },
      {
        "frame": 385,
        "score": 0.272477
      },
      {
        "frame": 386,
        "score": 0.241099
      },
      {
        "frame": 387,
        "score": 0.256826
      },
      {
        "frame": 388,
        "score": 0.260429
      },
      {
        "frame": 389,
        "score": 0.254201
      },
      {
        "frame": 390,
        "score": 0.264342
      },
      {
        "frame": 391,
        "score": 0.275383
      },
      {
        "frame": 392,
        "score": 0.272567
      },
      {
        "frame": 393,
        "score": 0.235487
      },
      {
        "frame": 394,
        "score": 0.272992
      },
      {
        "frame": 395,
        "score": 0.251525
      },
      {
        "frame": 396,
        "score": 0.275061
      },
      {
        "frame": 397,
        "score": 0.262661
      },
      {
        "frame": 398,
        "score": 0.27755
      },
      {
        "frame": 399,
        "score": 0.302478
      },
      {
        "frame": 400,
        "score": 0.386693
      },
      {
        "frame": 401,
        "score": 0.350481
      },
      {
        "frame": 402,
        "score": 0.393137
      },
      {
        "frame": 403,
        "score": 0.362549
      },
      {
        "frame": 404,
        "score": 0.394809
      },
      {
        "frame": 405,
        "score": 0.465753
      },
      {
        "frame": 406,
        "score": 0.389484
      },
      {
        "frame": 407,
        "score": 0.411387
      },
      {
        "frame": 408,
        "score": 0.3999
      },
      {
        "frame": 409,
        "score": 0.443575
      },
      {
        "frame": 410,
        "score": 0.380062
      },
      {
        "frame": 411,
        "score": 0.416899
      },
      {
        "frame": 412,
        "score": 0.4167
      },
      {
        "frame": 413,
        "score": 0.402675
      },
      {
        "frame": 414,
        "score": 0.356235
      },
      {
        "frame": 415,
        "score": 0.377348
      },
      {
        "frame": 416,
        "score": 0.368625
      },
      {
        "frame": 417,
        "score": 0.265305
      },
      {
        "frame": 418,
        "score": 0.310667
      },
      {
        "frame": 419,
        "score": 0.274575
      },
      {
        "frame": 420,
        "score": 0.290756
      },
      {
        "frame": 421,
        "score": 0.287576
      },
      {
        "frame": 422,
        "score": 0.258419
      },
      {
        "frame": 423,
        "score": 0.288454
      },
      {
        "frame": 424,
        "score": 0.257669
      },
      {
        "frame": 425,
        "score": 0.294056
      },
      {
        "frame": 426,
        "score": 0.268621
      },
      {
        "frame": 427,
        "score": 0.328245
      },
      {
        "frame": 428,
        "score": 0.271522
      },
      {
        "frame": 429,
        "score": 0.220495
      },
      {
        "frame": 430,
        "score": 0.210264
      },
      {
        "frame": 431,
        "score": 0.226381
      },
      {
        "frame": 432,
        "score": 0.269454
      },
      {
        "frame": 433,
        "score": 0.235421
      },
      {
        "frame": 434,
        "score": 0.247392
      },
      {
        "frame": 435,
        "score": 0.241918
      },
      {
        "frame": 436,
        "score": 0.279321
      },
      {
        "frame": 437,
        "score": 0.237997
      },
      {
        "frame": 438,
        "score": 0.23041
      },
      {
        "frame": 439,
        "score": 0.231473
      },
      {
        "frame": 440,
        "score": 0.251065
      },
      {
        "frame": 441,
        "score": 0.261422
      },
      {
        "frame": 442,
        "score": 0.241245
      },
      {
        "frame": 443,
        "score": 0.236709
      },
      {
        "frame": 444,
        "score": 0.293882
      },
      {
        "frame": 445,
        "score": 0.269727
      },
      {
        "frame": 446,
        "score": 0.304078
      },
      {
        "frame": 447,
        "score": 0.241939
      },
      {
        "frame": 448,
        "score": 0.239697
      },
      {
        "frame": 449,
        "score": 0.211399
      },
      {
        "frame": 450,
        "score": 0.271487
      },
      {
        "frame": 451,
        "score": 0.267545
      },
      {
        "frame": 452,
        "score": 0.265367
      },
      {
        "frame": 453,
        "score": 0.274422
      },
      {
        "frame": 454,
        "score": 0.258342
      },
      {
        "frame": 455,
        "score": 0.273925
      },
      {
        "frame": 456,
        "score": 0.247083
      },
      {
        "frame": 457,
        "score": 0.267256
      },
      {
        "frame": 458,
        "score": 0.232545
      },
      {
        "frame": 459,
        "score": 0.251194
      },
      {
        "frame": 460,
        "score": 0.313243
      },
      {
        "frame": 461,
        "score": 0.29542
      },
      {
        "frame": 462,
        "score": 0.243578
      },
      {
        "frame": 463,
        "score": 0.305678
      },
      {
        "frame": 464,
        "score": 0.31117
      },
      {
        "frame": 465,
        "score": 0.30297
      },
      {
        "frame": 466,
        "score": 0.291192
      },
      {
        "frame": 467,
        "score": 0.290488
      },
      {
        "frame": 468,
        "score": 0.330303
      },
      {
        "frame": 469,
        "score": 0.327238
      },
      {
        "frame": 470,
        "score": 0.305569
      },
      {
        "frame": 471,
        "score": 0.314168
      },
      {
        "frame": 472,
        "score": 0.286494
      },
      {
        "frame": 473,
        "score": 0.282549
      },
      {
        "frame": 474,
        "score": 0.275238
      },
      {
        "frame": 475,
        "score": 0.288457
      },
      {
        "frame": 476,
        "score": 0.281256
      },
      {
        "frame": 477,
        "score": 0.285986
      },
      {
        "frame": 478,
        "score": 0.259953
      },
      {
        "frame": 479,
        "score": 0.264915
      },
      {
        "frame": 480,
        "score": 0.312966
      },
      {
        "frame": 481,
        "score": 0.275439
      },
      {
        "frame": 482,
        "score": 0.262215
      },
      {
        "frame": 483,
        "score": 0.272254
      },
      {
        "frame": 484,
        "score": 0.249999
      },
      {
        "frame": 485,
        "score": 0.243596
      },
      {
        "frame": 486,
        "score": 0.202827
      },
      {
        "frame": 487,
        "score": 0.235517
      },
      {
        "frame": 488,
        "score": 0.247095
      },
      {
        "frame": 489,
        "score": 0.215774
      },
      {
        "frame": 490,
        "score": 0.195104
      },
      {
        "frame": 491,
        "score": 0.233836
      },
      {
        "frame": 492,
        "score": 0.208529
      },
      {
        "frame": 493,
        "score": 0.20567
      },
      {
        "frame": 494,
        "score": 0.212504
      },
      {
        "frame": 495,
        "score": 0.219978
      },
      {
        "frame": 496,
        "score": 0.242897
      },
      {
        "frame": 497,
        "score": 0.238897
      },
      {
        "frame": 498,
        "score": 0.247754
      },
      {
        "frame": 499,
        "score": 0.213016
      },
      {
        "frame": 500,
        "score": 0.262272
      },
      {
        "frame": 501,
        "score": 0.234443
      },
      {
        "frame": 502,
        "score": 0.252687
      },
      {
        "frame": 503,
        "score": 0.205771
      },
      {
        "frame": 504,
        "score": 0.214272
      },
      {
        "frame": 505,
        "score": 0.201528
      },
      {
        "frame": 506,
        "score": 0.207202
      },
      {
        "frame": 507,
        "score": 0.256323
      },
      {
        "frame": 508,
        "score": 0.206524
      },
      {
        "frame": 509,
        "score": 0.191698
      },
      {
        "frame": 510,
        "score": 0.226281
      },
      {
        "frame": 511,
        "score": 0.185261
      },
      {
        "frame": 512,
        "score": 0.204273
      },
      {
        "frame": 513,
        "score": 0.193274
      },
      {
        "frame": 514,
        "score": 0.203377
      },
      {
        "frame": 515,
        "score": 0.249155
      },
      {
        "frame": 516,
        "score": 0.183297
      },
      {
        "frame": 517,
        "score": 0.209738
      },
      {
        "frame": 518,
        "score": 0.213452
      },
      {
        "frame": 519,
        "score": 0.191323
      },
      {
        "frame": 520,
        "score": 0.202531
      },
      {
        "frame": 521,
        "score": 0.192045
      },
      {
        "frame": 522,
        "score": 0.199448
      },
      {
        "frame": 523,
        "score": 0.235386
      },
      {
        "frame": 524,
        "score": 0.209864
      },
      {
        "frame": 525,
        "score": 0.207979
      },
      {
        "frame": 526,
        "score": 0.182663
      },
      {
        "frame": 527,
        "score": 0.3032
      },
      {
        "frame": 528,
        "score": 0.386855
      },
      {
        "frame": 529,
        "score": 0.395238
      },
      {
        "frame": 530,
        "score": 0.427156
      },
      {
        "frame": 531,
        "score": 0.435116
      },
      {
        "frame": 532,
        "score": 0.430009
      },
      {
        "frame": 533,
        "score": 0.473332
      },
      {
        "frame": 534,
        "score": 0.480796
      },
      {
        "frame": 535,
        "score": 0.486077
      },
      {
        "frame": 536,
        "score": 0.522242
      },
      {
        "frame": 537,
        "score": 0.475374
      },
      {
        "frame": 538,
        "score": 0.530293
      },
      {
        "frame": 539,
        "score": 0.505217
      },
      {
        "frame": 540,
        "score": 0.466473
      },
      {
        "frame": 541,
        "score": 0.427674
      },
      {
        "frame": 542,
        "score": 0.284778
      },
      {
        "frame": 543,
        "score": 0.181359
      },
      {
        "frame": 544,
        "score": 0.215499
      },
      {
        "frame": 545,
        "score": 0.190697
      },
      {
        "frame": 546,
        "score": 0.175833
      },
      {
        "frame": 547,
        "score": 0.207986
      },
      {
        "frame": 548,
        "score": 0.244277
      },
      {
        "frame": 549,
        "score": 0.191589
      },
      {
        "frame": 550,
        "score": 0.173405
      },
      {
        "frame": 551,
        "score": 0.202233
      },
      {
        "frame": 552,
        "score": 0.211308
      },
      {
        "frame": 553,
        "score": 0.18631
      },
      {
        "frame": 554,
        "score": 0.208031
      },
      {
        "frame": 555,
        "score": 0.206848
      },
      {
        "frame": 556,
        "score": 0.227625
      },
      {
        "frame": 557,
        "score": 0.208988
      },
      {
        "frame": 558,
        "score": 0.212423
      },
      {
        "frame": 559,
        "score": 0.222136
      },
      {
        "frame": 560,
        "score": 0.198293
      },
      {
        "frame": 561,
        "score": 0.227712
      },
      {
        "frame": 562,
        "score": 0.221209
      },
      {
        "frame": 563,
        "score": 0.243134
      },
      {
        "frame": 564,
        "score": 0.239034
      },
      {
        "frame": 565,
        "score": 0.235694
      },
      {
        "frame": 566,
        "score": 0.229328
      },
      {
        "frame": 567,
        "score": 0.223103
      },
      {
        "frame": 568,
        "score": 0.250832
      },
      {
        "frame": 569,
        "score": 0.2584
      },
      {
        "frame": 570,
        "score": 0.228668
      },
      {
        "frame": 571,
        "score": 0.22058
      },
      {
        "frame": 572,
        "score": 0.213614
      },
      {
        "frame": 573,
        "score": 0.230487
      },
      {
        "frame": 574,
        "score": 0.224584
      },
      {
        "frame": 575,
        "score": 0.22443
      },
      {
        "frame": 576,
        "score": 0.243637
      },
      {
        "frame": 577,
        "score": 0.237741
      },
      {
        "frame": 578,
        "score": 0.226305
      },
      {
        "frame": 579,
        "score": 0.25342
      },
      {
        "frame": 580,
        "score": 0.27112
      },
      {
        "frame": 581,
        "score": 0.278199
      },
      {
        "frame": 582,
        "score": 0.264032
      },
      {
        "frame": 583,
        "score": 0.233092
      },
      {
        "frame": 584,
        "score": 0.264483
      },
      {
        "frame": 585,
        "score": 0.293057
      },
      {
        "frame": 586,
        "score": 0.283541
      },
      {
        "frame": 587,
        "score": 0.330808
      },
      {
        "frame": 588,
        "score": 0.341781
      },
      {
        "frame": 589,
        "score": 0.338861
      },
      {
        "frame": 590,
        "score": 0.303383
      },
      {
        "frame": 591,
        "score": 0.315801
      },
      {
        "frame": 592,
        "score": 0.317671
      },
      {
        "frame": 593,
        "score": 0.303404
      },
      {
        "frame": 594,
        "score": 0.306683
      },
      {
        "frame": 595,
        "score": 0.312951
      },
      {
        "frame": 596,
        "score": 0.322226
      },
      {
        "frame": 597,
        "score": 0.322824
      },
      {
        "frame": 598,
        "score": 0.32524
      },
      {
        "frame": 599,
        "score": 0.334323
      },
      {
        "frame": 600,
        "score": 0.301164
      },
      {
        "frame": 601,
        "score": 0.303817
      },
      {
        "frame": 602,
        "score": 0.29645
      },
      {
        "frame": 603,
        "score": 0.298204
      },
      {
        "frame": 604,
        "score": 0.315272
      },
      {
        "frame": 605,
        "score": 0.302593
      },
      {
        "frame": 606,
        "score": 0.31531
      },
      {
        "frame": 607,
        "score": 0.305809
      },
      {
        "frame": 608,
        "score": 0.286454
      },
      {
        "frame": 609,
        "score": 0.278882
      },
      {
        "frame": 610,
        "score": 0.289142
      },
      {
        "frame": 611,
        "score": 0.298588
      },
      {
        "frame": 612,
        "score": 0.28731
      },
      {
        "frame": 613,
        "score": 0.266173
      },
      {
        "frame": 614,
        "score": 0.245223
      },
      {
        "frame": 615,
        "score": 0.322673
      },
      {
        "frame": 616,
        "score": 0.278815
      },
      {
        "frame": 617,
        "score": 0.247623
      },
      {
        "frame": 618,
        "score": 0.255956
      },
      {
        "frame": 619,
        "score": 0.254866
      },
      {
        "frame": 620,
        "score": 0.276587
      },
      {
        "frame": 621,
        "score": 0.245918
      },
      {
        "frame": 622,
        "score": 0.235154
      },
      {
        "frame": 623,
        "score": 0.240509
      },
      {
        "frame": 624,
        "score": 0.22101
      },
      {
        "frame": 625,
        "score": 0.239834
      },
      {
        "frame": 626,
        "score": 0.23356
      },
      {
        "frame": 627,
        "score": 0.261401
      },
      {
        "frame": 628,
        "score": 0.240304
      },
      {
        "frame": 629,
        "score": 0.246732
      },
      {
        "frame": 630,
        "score": 0.249589
      },
      {
        "frame": 631,
        "score": 0.245136
      },
      {
        "frame": 632,
        "score": 0.237983
      },
      {
        "frame": 633,
        "score": 0.276602
      },
      {
        "frame": 634,
        "score": 0.240449
      },
      {
        "frame": 635,
        "score": 0.26452
      },
      {
        "frame": 636,
        "score": 0.263023
      },
      {
        "frame": 637,
        "score": 0.272161
      },
      {
        "frame": 638,
        "score": 0.26113
      },
      {
        "frame": 639,
        "score": 0.262269
      },
      {
        "frame": 640,
        "score": 0.241733
      },
      {
        "frame": 641,
        "score": 0.23987
      },
      {
        "frame": 642,
        "score": 0.265604
      },
      {
        "frame": 643,
        "score": 0.248043
      },
      {
        "frame": 644,
        "score": 0.261356
      },
      {
        "frame": 645,
        "score": 0.255527
      },
      {
        "frame": 646,
        "score": 0.227626
      },
      {
        "frame": 647,
        "score": 0.250869
      },
      {
        "frame": 648,
        "score": 0.228829
      },
      {
        "frame": 649,
        "score": 0.226959
      },
      {
        "frame": 650,
        "score": 0.23432
      },
      {
        "frame": 651,
        "score": 0.275821
      },
      {
        "frame": 652,
        "score": 0.229649
      },
      {
        "frame": 653,
        "score": 0.246628
      },
      {
        "frame": 654,
        "score": 0.249441
      },
      {
        "frame": 655,
        "score": 0.245885
      },
      {
        "frame": 656,
        "score": 0.236202
      },
      {
        "frame": 657,
        "score": 0.233113
      },
      {
        "frame": 658,
        "score": 0.23769
      },
      {
        "frame": 659,
        "score": 0.206026
      },
      {
        "frame": 660,
        "score": 0.216926
      },
      {
        "frame": 661,
        "score": 0.203475
      },
      {
        "frame": 662,
        "score": 0.243295
      },
      {
        "frame": 663,
        "score": 0.262972
      },
      {
        "frame": 664,
        "score": 0.272077
      },
      {
        "frame": 665,
        "score": 0.228091
      },
      {
        "frame": 666,
        "score": 0.208451
      },
      {
        "frame": 667,
        "score": 0.218644
      },
      {
        "frame": 668,
        "score": 0.24675
      },
      {
        "frame": 669,
        "score": 0.259073
      },
      {
        "frame": 670,
        "score": 0.253586
      },
      {
        "frame": 671,
        "score": 0.215399
      },
      {
        "frame": 672,
        "score": 0.23442
      },
      {
        "frame": 673,
        "score": 0.212389
      },
      {
        "frame": 674,
        "score": 0.252135
      },
      {
        "frame": 675,
        "score": 0.239112
      },
      {
        "frame": 676,
        "score": 0.23274
      },
      {
        "frame": 677,
        "score": 0.257588
      },
      {
        "frame": 678,
        "score": 0.247958
      },
      {
        "frame": 679,
        "score": 0.226487
      },
      {
        "frame": 680,
        "score": 0.205932
      },
      {
        "frame": 681,
        "score": 0.212234
      },
      {
        "frame": 682,
        "score": 0.190098
      },
      {
        "frame": 683,
        "score": 0.221226
      },
      {
        "frame": 684,
        "score": 0.261796
      },
      {
        "frame": 685,
        "score": 0.219968
      },
      {
        "frame": 686,
        "score": 0.211117
      },
      {
        "frame": 687,
        "score": 0.23093
      },
      {
        "frame": 688,
        "score": 0.248573
      },
      {
        "frame": 689,
        "score": 0.203885
      },
      {
        "frame": 690,
        "score": 0.215291
      },
      {
        "frame": 691,
        "score": 0.25793
      },
      {
        "frame": 692,
        "score": 0.256311
      },
      {
        "frame": 693,
        "score": 0.214101
      },
      {
        "frame": 694,
        "score": 0.258955
      },
      {
        "frame": 695,
        "score": 0.262277
      },
      {
        "frame": 696,
        "score": 0.230085
      },
      {
        "frame": 697,
        "score": 0.215822
      },
      {
        "frame": 698,
        "score": 0.234967
      },
      {
        "frame": 699,
        "score": 0.23577
      },
      {
        "frame": 700,
        "score": 0.21972
      },
      {
        "frame": 701,
        "score": 0.217609
      },
      {
        "frame": 702,
        "score": 0.246976
      },
      {
        "frame": 703,
        "score": 0.215715
      },
      {
        "frame": 704,
        "score": 0.227892
      },
      {
        "frame": 705,
        "score": 0.237397
      },
      {
        "frame": 706,
        "score": 0.262654
      },
      {
        "frame": 707,
        "score": 0.259833
      },
      {
        "frame": 708,
        "score": 0.280627
      },
      {
        "frame": 709,
        "score": 0.255489
      },
      {
        "frame": 710,
        "score": 0.308804
      },
      {
        "frame": 711,
        "score": 0.276081
      },
      {
        "frame": 712,
        "score": 0.248494
      },
      {
        "frame": 713,
        "score": 0.257063
      },
      {
        "frame": 714,
        "score": 0.274166
      },
      {
        "frame": 715,
        "score": 0.251597
      },
      {
        "frame": 716,
        "score": 0.286599
      },
      {
        "frame": 717,
        "score": 0.226549
      },
      {
        "frame": 718,
        "score": 0.212898
      },
      {
        "frame": 719,
        "score": 0.229883
      },
      {
        "frame": 720,
        "score": 0.253942
      },
      {
        "frame": 721,
        "score": 0.209376
      },
      {
        "frame": 722,
        "score": 0.205649
      },
      {
        "frame": 723,
        "score": 0.219842
      },
      {
        "frame": 724,
        "score": 0.240919
      },
      {
        "frame": 725,
        "score": 0.236705
      },
      {
        "frame": 726,
        "score": 0.227002
      },
      {
        "frame": 727,
        "score": 0.189984
      },
      {
        "frame": 728,
        "score": 0.270294
      },
      {
        "frame": 729,
        "score": 0.194995
      },
      {
        "frame": 730,
        "score": 0.217096
      },
      {
        "frame": 731,
        "score": 0.218744
      },
      {
        "frame": 732,
        "score": 0.201324
      },
      {
        "frame": 733,
        "score": 0.230655
      },
      {
        "frame": 734,
        "score": 0.261502
      },
      {
        "frame": 735,
        "score": 0.215403
      },
      {
        "frame": 736,
        "score": 0.207342
      },
      {
        "frame": 737,
        "score": 0.206369
      },
      {
        "frame": 738,
        "score": 0.26265
      },
      {
        "frame": 739,
        "score": 0.256739
      },
      {
        "frame": 740,
        "score": 0.275609
      },
      {
        "frame": 741,
        "score": 0.236434
      },
      {
        "frame": 742,
        "score": 0.274947
      },
      {
        "frame": 743,
        "score": 0.236761
      },
      {
        "frame": 744,
        "score": 0.221977
      },
      {
        "frame": 745,
        "score": 0.198567
      },
      {
        "frame": 746,
        "score": 0.205423
      },
      {
        "frame": 747,
        "score": 0.235916
      },
      {
        "frame": 748,
        "score": 0.256665
      },
      {
        "frame": 749,
        "score": 0.19907
      },
      {
        "frame": 750,
        "score": 0.23132
      },
      {
        "frame": 751,
        "score": 0.239292
      },
      {
        "frame": 752,
        "score": 0.203284
      },
      {
        "frame": 753,
        "score": 0.187258
      },
      {
        "frame": 754,
        "score": 0.214568
      },
      {
        "frame": 755,
        "score": 0.17584
      },
      {
        "frame": 756,
        "score": 0.177937
      },
      {
        "frame": 757,
        "score": 0.190688
      },
      {
        "frame": 758,
        "score": 0.209309
      },
      {
        "frame": 759,
        "score": 0.212578
      },
      {
        "frame": 760,
        "score": 0.222864
      },
      {
        "frame": 761,
        "score": 0.24417
      },
      {
        "frame": 762,
        "score": 0.200461
      },
      {
        "frame": 763,
        "score": 0.197722
      },
      {
        "frame": 764,
        "score": 0.196095
      },
      {
        "frame": 765,
        "score": 0.202731
      },
      {
        "frame": 766,
        "score": 0.212084
      },
      {
        "frame": 767,
        "score": 0.236505
      },
      {
        "frame": 768,
        "score": 0.20203
      },
      {
        "frame": 769,
        "score": 0.21029
      },
      {
        "frame": 770,
        "score": 0.242039
      },
      {
        "frame": 771,
        "score": 0.213931
      },
      {
        "frame": 772,
        "score": 0.238817
      },
      {
        "frame": 773,
        "score": 0.232724
      },
      {
        "frame": 774,
        "score": 0.237961
      },
      {
        "frame": 775,
        "score": 0.246438
      },
      {
        "frame": 776,
        "score": 0.215119
      },
      {
        "frame": 777,
        "score": 0.200088
      },
      {
        "frame": 778,
        "score": 0.220414
      },
      {
        "frame": 779,
        "score": 0.208377
      },
      {
        "frame": 780,
        "score": 0.190518
      },
      {
        "frame": 781,
        "score": 0.191904
      },
      {
        "frame": 782,
        "score": 0.199166
      },
      {
        "frame": 783,
        "score": 0.201501
      },
      {
        "frame": 784,
        "score": 0.198954
      },
      {
        "frame": 785,
        "score": 0.236455
      },
      {
        "frame": 786,
        "score": 0.194013
      },
      {
        "frame": 787,
        "score": 0.191792
      },
      {
        "frame": 788,
        "score": 0.214269
      },
      {
        "frame": 789,
        "score": 0.219928
      },
      {
        "frame": 790,
        "score": 0.198283
      },
      {
        "frame": 791,
        "score": 0.209838
      },
      {
        "frame": 792,
        "score": 0.207703
      },
      {
        "frame": 793,
        "score": 0.22562
      },
      {
        "frame": 794,
        "score": 0.177734
      },
      {
        "frame": 795,
        "score": 0.20398
      },
      {
        "frame": 796,
        "score": 0.197409
      },
      {
        "frame": 797,
        "score": 0.223099
      },
      {
        "frame": 798,
        "score": 0.206111
      },
      {
        "frame": 799,
        "score": 0.202941
      },
      {
        "frame": 800,
        "score": 0.242467
      },
      {
        "frame": 801,
        "score": 0.20062
      },
      {
        "frame": 802,
        "score": 0.226112
      },
      {
        "frame": 803,
        "score": 0.188926
      },
      {
        "frame": 804,
        "score": 0.245574
      },
      {
        "frame": 805,
        "score": 0.174633
      },
      {
        "frame": 806,
        "score": 0.188896
      },
      {
        "frame": 807,
        "score": 0.231661
      },
      {
        "frame": 808,
        "score": 0.194072
      },
      {
        "frame": 809,
        "score": 0.198146
      },
      {
        "frame": 810,
        "score": 0.211707
      },
      {
        "frame": 811,
        "score": 0.202318
      },
      {
        "frame": 812,
        "score": 0.187856
      },
      {
        "frame": 813,
        "score": 0.200846
      },
      {
        "frame": 814,
        "score": 0.237755
      },
      {
        "frame": 815,
        "score": 0.195862
      },
      {
        "frame": 816,
        "score": 0.199479
      },
      {
        "frame": 817,
        "score": 0.180201
      },
      {
        "frame": 818,
        "score": 0.239582
      },
      {
        "frame": 819,
        "score": 0.194786
      },
      {
        "frame": 820,
        "score": 0.203408
      },
      {
        "frame": 821,
        "score": 0.193476
      },
      {
        "frame": 822,
        "score": 0.192233
      },
      {
        "frame": 823,
        "score": 0.212137
      },
      {
        "frame": 824,
        "score": 0.217571
      },
      {
        "frame": 825,
        "score": 0.237555
      },
      {
        "frame": 826,
        "score": 0.19641
      },
      {
        "frame": 827,
        "score": 0.211627
      },
      {
        "frame": 828,
        "score": 0.217995
      },
      {
        "frame": 829,
        "score": 0.216677
      },
      {
        "frame": 830,
        "score": 0.23751
      },
      {
        "frame": 831,
        "score": 0.244219
      },
      {
        "frame": 832,
        "score": 0.282939
      },
      {
        "frame": 833,
        "score": 0.2597
      },
      {
        "frame": 834,
        "score": 0.251515
      },
      {
        "frame": 835,
        "score": 0.259517
      },
      {
        "frame": 836,
        "score": 0.232138
      },
      {
        "frame": 837,
        "score": 0.249113
      },
      {
        "frame": 838,
        "score": 0.237643
      },
      {
        "frame": 839,
        "score": 0.257469
      },
      {
        "frame": 840,
        "score": 0.284465
      },
      {
        "frame": 841,
        "score": 0.249505
      },
      {
        "frame": 842,
        "score": 0.258326
      },
      {
        "frame": 843,
        "score": 0.26134
      },
      {
        "frame": 844,
        "score": 0.286715
      },
      {
        "frame": 845,
        "score": 0.272903
      },
      {
        "frame": 846,
        "score": 0.28505
      },
      {
        "frame": 847,
        "score": 0.277416
      },
      {
        "frame": 848,
        "score": 0.281019
      },
      {
        "frame": 849,
        "score": 0.257848
      },
      {
        "frame": 850,
        "score": 0.264615
      },
      {
        "frame": 851,
        "score": 0.252976
      },
      {
        "frame": 852,
        "score": 0.278556
      },
      {
        "frame": 853,
        "score": 0.27168
      },
      {
        "frame": 854,
        "score": 0.269686
      },
      {
        "frame": 855,
        "score": 0.292645
      },
      {
        "frame": 856,
        "score": 0.316743
      },
      {
        "frame": 857,
        "score": 0.287134
      },
      {
        "frame": 858,
        "score": 0.299124
      },
      {
        "frame": 859,
        "score": 0.291248
      },
      {
        "frame": 860,
        "score": 0.28571
      },
      {
        "frame": 861,
        "score": 0.287409
      },
      {
        "frame": 862,
        "score": 0.26325
      },
      {
        "frame": 863,
        "score": 0.269189
      },
      {
        "frame": 864,
        "score": 0.282906
      },
      {
        "frame": 865,
        "score": 0.279524
      },
      {
        "frame": 866,
        "score": 0.246861
      },
      {
        "frame": 867,
        "score": 0.259809
      },
      {
        "frame": 868,
        "score": 0.274407
      },
      {
        "frame": 869,
        "score": 0.252724
      },
      {
        "frame": 870,
        "score": 0.225481
      },
      {
        "frame": 871,
        "score": 0.234124
      },
      {
        "frame": 872,
        "score": 0.228941
      },
      {
        "frame": 873,
        "score": 0.227165
      },
      {
        "frame": 874,
        "score": 0.240519
      },
      {
        "frame": 875,
        "score": 0.249546
      },
      {
        "frame": 876,
        "score": 0.238051
      },
      {
        "frame": 877,
        "score": 0.22723
      },
      {
        "frame": 878,
        "score": 0.23071
      },
      {
        "frame": 879,
        "score": 0.257595
      },
      {
        "frame": 880,
        "score": 0.252762
      },
      {
        "frame": 881,
        "score": 0.233522
      },
      {
        "frame": 882,
        "score": 0.329944
      },
      {
        "frame": 883,
        "score": 0.353712
      },
      {
        "frame": 884,
        "score": 0.346066
      },
      {
        "frame": 885,
        "score": 0.367902
      },
      {
        "frame": 886,
        "score": 0.379387
      },
      {
        "frame": 887,
        "score": 0.409645
      },
      {
        "frame": 888,
        "score": 0.403727
      },
      {
        "frame": 889,
        "score": 0.410997
      },
      {
        "frame": 890,
        "score": 0.406338
      },
      {
        "frame": 891,
        "score": 0.392137
      },
      {
        "frame": 892,
        "score": 0.420838
      },
      {
        "frame": 893,
        "score": 0.354939
      },
      {
        "frame": 894,
        "score": 0.393114
      },
      {
        "frame": 895,
        "score": 0.36907
      },
      {
        "frame": 896,
        "score": 0.346273
      },
      {
        "frame": 897,
        "score": 0.315536
      },
      {
        "frame": 898,
        "score": 0.314715
      },
      {
        "frame": 899,
        "score": 0.300149
      },
      {
        "frame": 900,
        "score": 0.35146
      },
      {
        "frame": 901,
        "score": 0.30299
      },
      {
        "frame": 902,
        "score": 0.298576
      },
      {
        "frame": 903,
        "score": 0.307592
      },
      {
        "frame": 904,
        "score": 0.321561
      },
      {
        "frame": 905,
        "score": 0.302271
      },
      {
        "frame": 906,
        "score": 0.292976
      },
      {
        "frame": 907,
        "score": 0.271423
      },
      {
        "frame": 908,
        "score": 0.252408
      },
      {
        "frame": 909,
        "score": 0.283334
      },
      {
        "frame": 910,
        "score": 0.281164
      },
      {
        "frame": 911,
        "score": 0.273965
      },
      {
        "frame": 912,
        "score": 0.297091
      },
      {
        "frame": 913,
        "score": 0.273704
      },
      {
        "frame": 914,
        "score": 0.254921
      },
      {
        "frame": 915,
        "score": 0.259254
      },
      {
        "frame": 916,
        "score": 0.281159
      },
      {
        "frame": 917,
        "score": 0.266192
      },
      {
        "frame": 918,
        "score": 0.257628
      },
      {
        "frame": 919,
        "score": 0.219702
      },
      {
        "frame": 920,
        "score": 0.198887
      },
      {
        "frame": 921,
        "score": 0.244423
      },
      {
        "frame": 922,
        "score": 0.28061
      },
      {
        "frame": 923,
        "score": 0.251954
      },
      {
        "frame": 924,
        "score": 0.271153
      },
      {
        "frame": 925,
        "score": 0.259154
      },
      {
        "frame": 926,
        "score": 0.262656
      },
      {
        "frame": 927,
        "score": 0.229627
      },
      {
        "frame": 928,
        "score": 0.221126
      },
      {
        "frame": 929,
        "score": 0.257226
      },
      {
        "frame": 930,
        "score": 0.239683
      },
      {
        "frame": 931,
        "score": 0.233479
      },
      {
        "frame": 932,
        "score": 0.275228
      },
      {
        "frame": 933,
        "score": 0.286872
      },
      {
        "frame": 934,
        "score": 0.243905
      },
      {
        "frame": 935,
        "score": 0.273637
      },
      {
        "frame": 936,
        "score": 0.298637
      },
      {
        "frame": 937,
        "score": 0.282191
      },
      {
        "frame": 938,
        "score": 0.273469
      },
      {
        "frame": 939,
        "score": 0.281411
      },
      {
        "frame": 940,
        "score": 0.253179
      },
      {
        "frame": 941,
        "score": 0.253443
      },
      {
        "frame": 942,
        "score": 0.274304
      },
      {
        "frame": 943,
        "score": 0.300691
      },
      {
        "frame": 944,
        "score": 0.296049
      },
      {
        "frame": 945,
        "score": 0.265314
      },
      {
        "frame": 946,
        "score": 0.311727
      },
      {
        "frame": 947,
        "score": 0.31263
      },
      {
        "frame": 948,
        "score": 0.296281
      },
      {
        "frame": 949,
        "score": 0.290322
      },
      {
        "frame": 950,
        "score": 0.257629
      },
      {
        "frame": 951,
        "score": 0.299108
      },
      {
        "frame": 952,
        "score": 0.270068
      },
      {
        "frame": 953,
        "score": 0.265037
      },
      {
        "frame": 954,
        "score": 0.264461
      },
      {
        "frame": 955,
        "score": 0.285468
      },
      {
        "frame": 956,
        "score": 0.258309
      },
      {
        "frame": 957,
        "score": 0.274515
      },
      {
        "frame": 958,
        "score": 0.273836
      },
      {
        "frame": 959,
        "score": 0.210166
      },
      {
        "frame": 960,
        "score": 0.254047
      },
      {
        "frame": 961,
        "score": 0.286071
      },
      {
        "frame": 962,
        "score": 0.238946
      },
      {
        "frame": 963,
        "score": 0.286722
      },
      {
        "frame": 964,
        "score": 0.253781
      },
      {
        "frame": 965,
        "score": 0.242193
      },
      {
        "frame": 966,
        "score": 0.237416
      },
      {
        "frame": 967,
        "score": 0.221074
      },
      {
        "frame": 968,
        "score": 0.250645
      },
      {
        "frame": 969,
        "score": 0.227081
      },
      {
        "frame": 970,
        "score": 0.214134
      },
      {
        "frame": 971,
        "score": 0.254659
      },
      {
        "frame": 972,
        "score": 0.241161
      },
      {
        "frame": 973,
        "score": 0.265532
      },
      {
        "frame": 974,
        "score": 0.197738
      },
      {
        "frame": 975,
        "score": 0.25834
      },
      {
        "frame": 976,
        "score": 0.21554
      },
      {
        "frame": 977,
        "score": 0.2036
      },
      {
        "frame": 978,
        "score": 0.245987
      },
      {
        "frame": 979,
        "score": 0.272741
      },
      {
        "frame": 980,
        "score": 0.223041
      },
      {
        "frame": 981,
        "score": 0.223215
      },
      {
        "frame": 982,
        "score": 0.214707
      },
      {
        "frame": 983,
        "score": 0.219823
      },
      {
        "frame": 984,
        "score": 0.190744
      },
      {
        "frame": 985,
        "score": 0.206222
      },
      {
        "frame": 986,
        "score": 0.265045
      },
      {
        "frame": 987,
        "score": 0.204497
      },
      {
        "frame": 988,
        "score": 0.25619
      },
      {
        "frame": 989,
        "score": 0.2274
      },
      {
        "frame": 990,
        "score": 0.22031
      },
      {
        "frame": 991,
        "score": 0.228402
      },
      {
        "frame": 992,
        "score": 0.224259
      },
      {
        "frame": 993,
        "score": 0.267174
      },
      {
        "frame": 994,
        "score": 0.255669
      },
      {
        "frame": 995,
        "score": 0.2073
      },
      {
        "frame": 996,
        "score": 0.200604
      },
      {
        "frame": 997,
        "score": 0.261042
      },
      {
        "frame": 998,
        "score": 0.208736
      },
      {
        "frame": 999,
        "score": 0.206192
      },
      {
        "frame": 1000,
        "score": 0.214845
      },
      {
        "frame": 1001,
        "score": 0.22243
      },
      {
        "frame": 1002,
        "score": 0.219419
      },
      {
        "frame": 1003,
        "score": 0.222693
      },
      {
        "frame": 1004,
        "score": 0.240115
      },
      {
        "frame": 1005,
        "score": 0.208665
      },
      {
        "frame": 1006,
        "score": 0.226949
      },
      {
        "frame": 1007,
        "score": 0.202697
      },
      {
        "frame": 1008,
        "score": 0.197089
      },
      {
        "frame": 1009,
        "score": 0.183251
      },
      {
        "frame": 1010,
        "score": 0.201207
      },
      {
        "frame": 1011,
        "score": 0.195245
      },
      {
        "frame": 1012,
        "score": 0.208942
      },
      {
        "frame": 1013,
        "score": 0.32671
      },
      {
        "frame": 1014,
        "score": 0.380211
      },
      {
        "frame": 1015,
        "score": 0.4192
      },
      {
        "frame": 1016,
        "score": 0.43098
      },
      {
        "frame": 1017,
        "score": 0.444408
      },
      {
        "frame": 1018,
        "score": 0.450339
      },
      {
        "frame": 1019,
        "score": 0.455965
      },
      {
        "frame": 1020,
        "score": 0.499372
      },
      {
        "frame": 1021,
        "score": 0.509264
      },
      {
        "frame": 1022,
        "score": 0.475506
      },
      {
        "frame": 1023,
        "score": 0.478751
      },
      {
        "frame": 1024,
        "score": 0.472029
      },
      {
        "frame": 1025,
        "score": 0.50824
      },
      {
        "frame": 1026,
        "score": 0.524407
      },
      {
        "frame": 1027,
        "score": 0.467636
      },
      {
        "frame": 1028,
        "score": 0.459432
      },
      {
        "frame": 1029,
        "score": 0.472433
      },
      {
        "frame": 1030,
        "score": 0.431017
      },
      {
        "frame": 1031,
        "score": 0.380278
      },
      {
        "frame": 1032,
        "score": 0.269841
      },
      {
        "frame": 1033,
        "score": 0.189403
      },
      {
        "frame": 1034,
        "score": 0.225778
      },
      {
        "frame": 1035,
        "score": 0.211266
      },
      {
        "frame": 1036,
        "score": 0.208816
      },
      {
        "frame": 1037,
        "score": 0.195615
      },
      {
        "frame": 1038,
        "score": 0.175809
      },
      {
        "frame": 1039,
        "score": 0.196905
      },
      {
        "frame": 1040,
        "score": 0.190484
      },
      {
        "frame": 1041,
        "score": 0.219357
      },
      {
        "frame": 1042,
        "score": 0.242938
      },
      {
        "frame": 1043,
        "score": 0.206078
      },
      {
        "frame": 1044,
        "score": 0.198522
      },
      {
        "frame": 1045,
        "score": 0.210821
      },
      {
        "frame": 1046,
        "score": 0.203606
      },
      {
        "frame": 1047,
        "score": 0.202008
      },
      {
        "frame": 1048,
        "score": 0.212996
      },
      {
        "frame": 1049,
        "score": 0.190895
      },
      {
        "frame": 1050,
        "score": 0.209378
      },
      {
        "frame": 1051,
        "score": 0.187275
      },
      {
        "frame": 1052,
        "score": 0.213611
      },
      {
        "frame": 1053,
        "score": 0.226415
      },
      {
        "frame": 1054,
        "score": 0.201675
      },
      {
        "frame": 1055,
        "score": 0.212034
      },
      {
        "frame": 1056,
        "score": 0.196113
      },
      {
        "frame": 1057,
        "score": 0.201493
      },
      {
        "frame": 1058,
        "score": 0.200031
      },
      {
        "frame": 1059,
        "score": 0.193973
      },
      {
        "frame": 1060,
        "score": 0.198396
      },
      {
        "frame": 1061,
        "score": 0.201285
      },
      {
        "frame": 1062,
        "score": 0.19189
      },
      {
        "frame": 1063,
        "score": 0.227456
      },
      {
        "frame": 1064,
        "score": 0.237445
      },
      {
        "frame": 1065,
        "score": 0.246723
      },
      {
        "frame": 1066,
        "score": 0.261004
      },
      {
        "frame": 1067,
        "score": 0.22319
      },
      {
        "frame": 1068,
        "score": 0.23052
      },
      {
        "frame": 1069,
        "score": 0.24592
      },
      {
        "frame": 1070,
        "score": 0.228659
      },
      {
        "frame": 1071,
        "score": 0.23834
      },
      {
        "frame": 1072,
        "score": 0.252964
      },
      {
        "frame": 1073,
        "score": 0.27242
      },
      {
        "frame": 1074,
        "score": 0.287992
      },
      {
        "frame": 1075,
        "score": 0.279145
      },
      {
        "frame": 1076,
        "score": 0.297543
      },
      {
        "frame": 1077,
        "score": 0.321384
      },
      {
        "frame": 1078,
        "score": 0.316409
      },
      {
        "frame": 1079,
        "score": 0.310662
      },
      {
        "frame": 1080,
        "score": 0.337284
      },
      {
        "frame": 1081,
        "score": 0.30856
      },
      {
        "frame": 1082,
        "score": 0.306611
      },
      {
        "frame": 1083,
        "score": 0.292915
      },
      {
        "frame": 1084,
        "score": 0.319752
      },
      {
        "frame": 1085,
        "score": 0.286201
      },
      {
        "frame": 1086,
        "score": 0.272094
      },
      {
        "frame": 1087,
        "score": 0.272075
      },
      {
        "frame": 1088,
        "score": 0.260594
      },
      {
        "frame": 1089,
        "score": 0.255233
      },
      {
        "frame": 1090,
        "score": 0.252758
      },
      {
        "frame": 1091,
        "score": 0.265359
      },
      {
        "frame": 1092,
        "score": 0.265372
      },
      {
        "frame": 1093,
        "score": 0.257852
      },
      {
        "frame": 1094,
        "score": 0.271393
      },
      {
        "frame": 1095,
        "score": 0.294976
      },
      {
        "frame": 1096,
        "score": 0.278556
      },
      {
        "frame": 1097,
        "score": 0.269671
      },
      {
        "frame": 1098,
        "score": 0.252748
      },
      {
        "frame": 1099,
        "score": 0.271566
      },
      {
        "frame": 1100,
        "score": 0.291154
      },
      {
        "frame": 1101,
        "score": 0.262159
      },
      {
        "frame": 1102,
        "score": 0.270904
      },
      {
        "frame": 1103,
        "score": 0.268145
      },
      {
        "frame": 1104,
        "score": 0.260588
      },
      {
        "frame": 1105,
        "score": 0.266368
      },
      {
        "frame": 1106,
        "score": 0.254387
      },
      {
        "frame": 1107,
        "score": 0.31379
      },
      {
        "frame": 1108,
        "score": 0.276695
      },
      {
        "frame": 1109,
        "score": 0.252902
      },
      {
        "frame": 1110,
        "score": 0.247082
      },
      {
        "frame": 1111,
        "score": 0.254769
      },
      {
        "frame": 1112,
        "score": 0.253678
      },
      {
        "frame": 1113,
        "score": 0.270307
      },
      {
        "frame": 1114,
        "score": 0.24031
      },
      {
        "frame": 1115,
        "score": 0.302603
      },
      {
        "frame": 1116,
        "score": 0.283447
      },
      {
        "frame": 1117,
        "score": 0.273699
      },
      {
        "frame": 1118,
        "score": 0.315979
      },
      {
        "frame": 1119,
        "score": 0.272237
      },
      {
        "frame": 1120,
        "score": 0.278648
      },
      {
        "frame": 1121,
        "score": 0.294528
      },
      {
        "frame": 1122,
        "score": 0.275174
      },
      {
        "frame": 1123,
        "score": 0.2921
      },
      {
        "frame": 1124,
        "score": 0.281017
      },
      {
        "frame": 1125,
        "score": 0.275606
      },
      {
        "frame": 1126,
        "score": 0.309695
      },
      {
        "frame": 1127,
        "score": 0.262271
      },
      {
        "frame": 1128,
        "score": 0.259283
      },
      {
        "frame": 1129,
        "score": 0.28919
      },
      {
        "frame": 1130,
        "score": 0.258469
      },
      {
        "frame": 1131,
        "score": 0.236787
      },
      {
        "frame": 1132,
        "score": 0.251706
      },
      {
        "frame": 1133,
        "score": 0.221511
      },
      {
        "frame": 1134,
        "score": 0.256871
      },
      {
        "frame": 1135,
        "score": 0.247283
      },
      {
        "frame": 1136,
        "score": 0.22468
      },
      {
        "frame": 1137,
        "score": 0.256692
      },
      {
        "frame": 1138,
        "score": 0.231032
      },
      {
        "frame": 1139,
        "score": 0.226371
      },
      {
        "frame": 1140,
        "score": 0.265073
      },
      {
        "frame": 1141,
        "score": 0.264251
      },
      {
        "frame": 1142,
        "score": 0.246551
      },
      {
        "frame": 1143,
        "score": 0.24434
      },
      {
        "frame": 1144,
        "score": 0.252741
      },
      {
        "frame": 1145,
        "score": 0.211967
      },
      {
        "frame": 1146,
        "score": 0.204421
      },
      {
        "frame": 1147,
        "score": 0.249876
      },
      {
        "frame": 1148,
        "score": 0.271539
      },
      {
        "frame": 1149,
        "score": 0.260455
      },
      {
        "frame": 1150,
        "score": 0.254164
      },
      {
        "frame": 1151,
        "score": 0.20231
      },
      {
        "frame": 1152,
        "score": 0.21922
      },
      {
        "frame": 1153,
        "score": 0.238617
      },
      {
        "frame": 1154,
        "score": 0.231525
      },
      {
        "frame": 1155,
        "score": 0.207157
      },
      {
        "frame": 1156,
        "score": 0.190826
      },
      {
        "frame": 1157,
        "score": 0.253832
      },
      {
        "frame": 1158,
        "score": 0.22859
      },
      {
        "frame": 1159,
        "score": 0.229728
      },
      {
        "frame": 1160,
        "score": 0.234223
      },
      {
        "frame": 1161,
        "score": 0.232769
      },
      {
        "frame": 1162,
        "score": 0.238785
      },
      {
        "frame": 1163,
        "score": 0.195975
      },
      {
        "frame": 1164,
        "score": 0.241153
      },
      {
        "frame": 1165,
        "score": 0.237189
      },
      {
        "frame": 1166,
        "score": 0.259097
      },
      {
        "frame": 1167,
        "score": 0.2367
      },
      {
        "frame": 1168,
        "score": 0.248927
      },
      {
        "frame": 1169,
        "score": 0.261907
      },
      {
        "frame": 1170,
        "score": 0.262557
      },
      {
        "frame": 1171,
        "score": 0.226284
      },
      {
        "frame": 1172,
        "score": 0.239785
      },
      {
        "frame": 1173,
        "score": 0.25259
      },
      {
        "frame": 1174,
        "score": 0.247063
      },
      {
        "frame": 1175,
        "score": 0.237747
      },
      {
        "frame": 1176,
        "score": 0.236385
      },
      {
        "frame": 1177,
        "score": 0.253518
      },
      {
        "frame": 1178,
        "score": 0.227587
      },
      {
        "frame": 1179,
        "score": 0.235801
      },
      {
        "frame": 1180,
        "score": 0.224696
      },
      {
        "frame": 1181,
        "score": 0.216856
      },
      {
        "frame": 1182,
        "score": 0.226017
      },
      {
        "frame": 1183,
        "score": 0.250055
      },
      {
        "frame": 1184,
        "score": 0.192231
      },
      {
        "frame": 1185,
        "score": 0.285678
      },
      {
        "frame": 1186,
        "score": 0.29347
      },
      {
        "frame": 1187,
        "score": 0.26137
      },
      {
        "frame": 1188,
        "score": 0.295562
      },
      {
        "frame": 1189,
        "score": 0.303587
      },
      {
        "frame": 1190,
        "score": 0.290914
      },
      {
        "frame": 1191,
        "score": 0.266803
      },
      {
        "frame": 1192,
        "score": 0.289537
      },
      {
        "frame": 1193,
        "score": 0.267399
      },
      {
        "frame": 1194,
        "score": 0.227758
      },
      {
        "frame": 1195,
        "score": 0.214603
      },
      {
        "frame": 1196,
        "score": 0.25666
      },
      {
        "frame": 1197,
        "score": 0.213192
      },
      {
        "frame": 1198,
        "score": 0.221981
      },
      {
        "frame": 1199,
        "score": 0.249689
      },
      {
        "frame": 1200,
        "score": 0.209504
      },
      {
        "frame": 1201,
        "score": 0.193353
      },
      {
        "frame": 1202,
        "score": 0.223618
      },
      {
        "frame": 1203,
        "score": 0.213232
      },
      {
        "frame": 1204,
        "score": 0.190984
      },
      {
        "frame": 1205,
        "score": 0.216351
      },
      {
        "frame": 1206,
        "score": 0.202549
      },
      {
        "frame": 1207,
        "score": 0.227359
      },
      {
        "frame": 1208,
        "score": 0.209805
      },
      {
        "frame": 1209,
        "score": 0.231121
      },
      {
        "frame": 1210,
        "score": 0.184944
      },
      {
        "frame": 1211,
        "score": 0.218342
      },
      {
        "frame": 1212,
        "score": 0.232781
      },
      {
        "frame": 1213,
        "score": 0.221758
      },
      {
        "frame": 1214,
        "score": 0.180355
      },
      {
        "frame": 1215,
        "score": 0.199318
      },
      {
        "frame": 1216,
        "score": 0.205834
      },
      {
        "frame": 1217,
        "score": 0.204594
      },
      {
        "frame": 1218,
        "score": 0.220078
      },
      {
        "frame": 1219,
        "score": 0.211749
      },
      {
        "frame": 1220,
        "score": 0.211759
      },
      {
        "frame": 1221,
        "score": 0.219814
      },
      {
        "frame": 1222,
        "score": 0.211697
      },
      {
        "frame": 1223,
        "score": 0.226044
      },
      {
        "frame": 1224,
        "score": 0.198662
      },
      {
        "frame": 1225,
        "score": 0.231486
      },
      {
        "frame": 1226,
        "score": 0.199442
      },
      {
        "frame": 1227,
        "score": 0.200169
      },
      {
        "frame": 1228,
        "score": 0.228072
      },
      {
        "frame": 1229,
        "score": 0.200339
      },
      {
        "frame": 1230,
        "score": 0.309648
      },
      {
        "frame": 1231,
        "score": 0.227911
      },
      {
        "frame": 1232,
        "score": 0.243812
      },
      {
        "frame": 1233,
        "score": 0.267589
      },
      {
        "frame": 1234,
        "score": 0.214658
      },
      {
        "frame": 1235,
        "score": 0.210784
      },
      {
        "frame": 1236,
        "score": 0.237649
      },
      {
        "frame": 1237,
        "score": 0.220074
      },
      {
        "frame": 1238,
        "score": 0.207093
      },
      {
        "frame": 1239,
        "score": 0.227154
      },
      {
        "frame": 1240,
        "score": 0.28377
      },
      {
        "frame": 1241,
        "score": 0.203433
      },
      {
        "frame": 1242,
        "score": 0.199249
      },
      {
        "frame": 1243,
        "score": 0.227201
      },
      {
        "frame": 1244,
        "score": 0.200546
      },
      {
        "frame": 1245,
        "score": 0.20859
      },
      {
        "frame": 1246,
        "score": 0.2177
      },
      {
        "frame": 1247,
        "score": 0.273893
      },
      {
        "frame": 1248,
        "score": 0.222829
      },
      {
        "frame": 1249,
        "score": 0.211928
      },
      {
        "frame": 1250,
        "score": 0.248284
      },
      {
        "frame": 1251,
        "score": 0.27869
      },
      {
        "frame": 1252,
        "score": 0.223122
      },
      {
        "frame": 1253,
        "score": 0.263
      },
      {
        "frame": 1254,
        "score": 0.239118
      },
      {
        "frame": 1255,
        "score": 0.260963
      },
      {
        "frame": 1256,
        "score": 0.19649
      },
      {
        "frame": 1257,
        "score": 0.21686
      },
      {
        "frame": 1258,
        "score": 0.234029
      },
      {
        "frame": 1259,
        "score": 0.234712
      },
      {
        "frame": 1260,
        "score": 0.227137
      },
      {
        "frame": 1261,
        "score": 0.225741
      },
      {
        "frame": 1262,
        "score": 0.19233
      },
      {
        "frame": 1263,
        "score": 0.245808
      },
      {
        "frame": 1264,
        "score": 0.213243
      },
      {
        "frame": 1265,
        "score": 0.210007
      },
      {
        "frame": 1266,
        "score": 0.208343
      },
      {
        "frame": 1267,
        "score": 0.226372
      },
      {
        "frame": 1268,
        "score": 0.215559
      },
      {
        "frame": 1269,
        "score": 0.214207
      },
      {
        "frame": 1270,
        "score": 0.223061
      },
      {
        "frame": 1271,
        "score": 0.198514
      },
      {
        "frame": 1272,
        "score": 0.214346
      },
      {
        "frame": 1273,
        "score": 0.227473
      },
      {
        "frame": 1274,
        "score": 0.218875
      },
      {
        "frame": 1275,
        "score": 0.245929
      },
      {
        "frame": 1276,
        "score": 0.232769
      },
      {
        "frame": 1277,
        "score": 0.208877
      },
      {
        "frame": 1278,
        "score": 0.214282
      },
      {
        "frame": 1279,
        "score": 0.204877
      },
      {
        "frame": 1280,
        "score": 0.207993
      },
      {
        "frame": 1281,
        "score": 0.229794
      },
      {
        "frame": 1282,
        "score": 0.198444
      },
      {
        "frame": 1283,
        "score": 0.219196
      },
      {
        "frame": 1284,
        "score": 0.226002
      },
      {
        "frame": 1285,
        "score": 0.228294
      },
      {
        "frame": 1286,
        "score": 0.248078
      },
      {
        "frame": 1287,
        "score": 0.234373
      },
      {
        "frame": 1288,
        "score": 0.203008
      },
      {
        "frame": 1289,
        "score": 0.207992
      },
      {
        "frame": 1290,
        "score": 0.250859
      },
      {
        "frame": 1291,
        "score": 0.25597
      },
      {
        "frame": 1292,
        "score": 0.221954
      },
      {
        "frame": 1293,
        "score": 0.239968
      },
      {
        "frame": 1294,
        "score": 0.217723
      },
      {
        "frame": 1295,
        "score": 0.286702
      },
      {
        "frame": 1296,
        "score": 0.21962
      },
      {
        "frame": 1297,
        "score": 0.212423
      },
      {
        "frame": 1298,
        "score": 0.190618
      },
      {
        "frame": 1299,
        "score": 0.237243
      },
      {
        "frame": 1300,
        "score": 0.20709
      },
      {
        "frame": 1301,
        "score": 0.200203
      },
      {
        "frame": 1302,
        "score": 0.216617
      },
      {
        "frame": 1303,
        "score": 0.225867
      },
      {
        "frame": 1304,
        "score": 0.211377
      },
      {
        "frame": 1305,
        "score": 0.258302
      },
      {
        "frame": 1306,
        "score": 0.208412
      },
      {
        "frame": 1307,
        "score": 0.211681
      },
      {
        "frame": 1308,
        "score": 0.221142
      },
      {
        "frame": 1309,
        "score": 0.215508
      },
      {
        "frame": 1310,
        "score": 0.227494
      },
      {
        "frame": 1311,
        "score": 0.235883
      },
      {
        "frame": 1312,
        "score": 0.227011
      },
      {
        "frame": 1313,
        "score": 0.249686
      },
      {
        "frame": 1314,
        "score": 0.21462
      },
      {
        "frame": 1315,
        "score": 0.224818
      },
      {
        "frame": 1316,
        "score": 0.220186
      },
      {
        "frame": 1317,
        "score": 0.250738
      },
      {
        "frame": 1318,
        "score": 0.22638
      },
      {
        "frame": 1319,
        "score": 0.22425
      },
      {
        "frame": 1320,
        "score": 0.242636
      },
      {
        "frame": 1321,
        "score": 0.241165
      },
      {
        "frame": 1322,
        "score": 0.236634
      },
      {
        "frame": 1323,
        "score": 0.239098
      },
      {
        "frame": 1324,
        "score": 0.229519
      },
      {
        "frame": 1325,
        "score": 0.243991
      },
      {
        "frame": 1326,
        "score": 0.268639
      },
      {
        "frame": 1327,
        "score": 0.260888
      },
      {
        "frame": 1328,
        "score": 0.24641
      },
      {
        "frame": 1329,
        "score": 0.252522
      },
      {
        "frame": 1330,
        "score": 0.265653
      },
      {
        "frame": 1331,
        "score": 0.280074
      },
      {
        "frame": 1332,
        "score": 0.287032
      },
      {
        "frame": 1333,
        "score": 0.29631
      },
      {
        "frame": 1334,
        "score": 0.282611
      },
      {
        "frame": 1335,
        "score": 0.295497
      },
      {
        "frame": 1336,
        "score": 0.28499
      },
      {
        "frame": 1337,
        "score": 0.283119
      },
      {
        "frame": 1338,
        "score": 0.260823
      },
      {
        "frame": 1339,
        "score": 0.281407
      },
      {
        "frame": 1340,
        "score": 0.269636
      },
      {
        "frame": 1341,
        "score": 0.266737
      },
      {
        "frame": 1342,
        "score": 0.276528
      },
      {
        "frame": 1343,
        "score": 0.2987
      },
      {
        "frame": 1344,
        "score": 0.284526
      },
      {
        "frame": 1345,
        "score": 0.278499
      },
      {
        "frame": 1346,
        "score": 0.296397
      },
      {
        "frame": 1347,
        "score": 0.305343
      },
      {
        "frame": 1348,
        "score": 0.28484
      },
      {
        "frame": 1349,
        "score": 0.305233
      },
      {
        "frame": 1350,
        "score": 0.303856
      },
      {
        "frame": 1351,
        "score": 0.285348
      },
      {
        "frame": 1352,
        "score": 0.269879
      },
      {
        "frame": 1353,
        "score": 0.261924
      },
      {
        "frame": 1354,
        "score": 0.260643
      },
      {
        "frame": 1355,
        "score": 0.252464
      },
      {
        "frame": 1356,
        "score": 0.259306
      },
      {
        "frame": 1357,
        "score": 0.274236
      },
      {
        "frame": 1358,
        "score": 0.26807
      },
      {
        "frame": 1359,
        "score": 0.262981
      },
      {
        "frame": 1360,
        "score": 0.250855
      },
      {
        "frame": 1361,
        "score": 0.254043
      },
      {
        "frame": 1362,
        "score": 0.261945
      },
      {
        "frame": 1363,
        "score": 0.252426
      },
      {
        "frame": 1364,
        "score": 0.243425
      },
      {
        "frame": 1365,
        "score": 0.253853
      },
      {
        "frame": 1366,
        "score": 0.212765
      },
      {
        "frame": 1367,
        "score": 0.254585
      },
      {
        "frame": 1368,
        "score": 0.252979
      },
      {
        "frame": 1369,
        "score": 0.254089
      },
      {
        "frame": 1370,
        "score": 0.253531
      },
      {
        "frame": 1371,
        "score": 0.243903
      },
      {
        "frame": 1372,
        "score": 0.253686
      },
      {
        "frame": 1373,
        "score": 0.352318
      },
      {
        "frame": 1374,
        "score": 0.326778
      },
      {
        "frame": 1375,
        "score": 0.362922
      },
      {
        "frame": 1376,
        "score": 0.34685
      },
      {
        "frame": 1377,
        "score": 0.390205
      },
      {
        "frame": 1378,
        "score": 0.398511
      },
      {
        "frame": 1379,
        "score": 0.428923
      },
      {
        "frame": 1380,
        "score": 0.437991
      },
      {
        "frame": 1381,
        "score": 0.398754
      },
      {
        "frame": 1382,
        "score": 0.393339
      },
      {
        "frame": 1383,
        "score": 0.423295
      },
      {
        "frame": 1384,
        "score": 0.367364
      },
      {
        "frame": 1385,
        "score": 0.357687
      },
      {
        "frame": 1386,
        "score": 0.367028
      },
      {
        "frame": 1387,
        "score": 0.34104
      },
      {
        "frame": 1388,
        "score": 0.365128
      },
      {
        "frame": 1389,
        "score": 0.261955
      },
      {
        "frame": 1390,
        "score": 0.27017
      },
      {
        "frame": 1391,
        "score": 0.281687
      },
      {
        "frame": 1392,
        "score": 0.270493
      },
      {
        "frame": 1393,
        "score": 0.271247
      },
      {
        "frame": 1394,
        "score": 0.280189
      },
      {
        "frame": 1395,
        "score": 0.250366
      },
      {
        "frame": 1396,
        "score": 0.298093
      },
      {
        "frame": 1397,
        "score": 0.271972
      },
      {
        "frame": 1398,
        "score": 0.276451
      },
      {
        "frame": 1399,
        "score": 0.260388
      },
      {
        "frame": 1400,
        "score": 0.248294
      },
      {
        "frame": 1401,
        "score": 0.221113
      },
      {
        "frame": 1402,
        "score": 0.241026
      },
      {
        "frame": 1403,
        "score": 0.237063
      },
      {
        "frame": 1404,
        "score": 0.268357
      },
      {
        "frame": 1405,
        "score": 0.271422
      },
      {
        "frame": 1406,
        "score": 0.226787
      },
      {
        "frame": 1407,
        "score": 0.273284
      },
      {
        "frame": 1408,
        "score": 0.262106
      },
      {
        "frame": 1409,
        "score": 0.246725
      },
      {
        "frame": 1410,
        "score": 0.252774
      },
      {
        "frame": 1411,
        "score": 0.248966
      },
      {
        "frame": 1412,
        "score": 0.244579
      },
      {
        "frame": 1413,
        "score": 0.250833
      },
      {
        "frame": 1414,
        "score": 0.242475
      },
      {
        "frame": 1415,
        "score": 0.262443
      },
      {
        "frame": 1416,
        "score": 0.288261
      },
      {
        "frame": 1417,
        "score": 0.246702
      },
      {
        "frame": 1418,
        "score": 0.242209
      },
      {
        "frame": 1419,
        "score": 0.245057
      },
      {
        "frame": 1420,
        "score": 0.276246
      },
      {
        "frame": 1421,
        "score": 0.300936
      },
      {
        "frame": 1422,
        "score": 0.236911
      },
      {
        "frame": 1423,
        "score": 0.238915
      },
      {
        "frame": 1424,
        "score": 0.25776
      },
      {
        "frame": 1425,
        "score": 0.230834
      },
      {
        "frame": 1426,
        "score": 0.241704
      },
      {
        "frame": 1427,
        "score": 0.253555
      },
      {
        "frame": 1428,
        "score": 0.263343
      },
      {
        "frame": 1429,
        "score": 0.264157
      },
      {
        "frame": 1430,
        "score": 0.26001
      },
      {
        "frame": 1431,
        "score": 0.294603
      },
      {
        "frame": 1432,
        "score": 0.266646
      },
      {
        "frame": 1433,
        "score": 0.266107
      },
      {
        "frame": 1434,
        "score": 0.255628
      },
      {
        "frame": 1435,
        "score": 0.254303
      },
      {
        "frame": 1436,
        "score": 0.275998
      },
      {
        "frame": 1437,
        "score": 0.272998
      },
      {
        "frame": 1438,
        "score": 0.303153
      },
      {
        "frame": 1439,
        "score": 0.292355
      },
      {
        "frame": 1440,
        "score": 0.258321
      },
      {
        "frame": 1441,
        "score": 0.257679
      },
      {
        "frame": 1442,
        "score": 0.275924
      },
      {
        "frame": 1443,
        "score": 0.264134
      },
      {
        "frame": 1444,
        "score": 0.231667
      },
      {
        "frame": 1445,
        "score": 0.265901
      },
      {
        "frame": 1446,
        "score": 0.266746
      },
      {
        "frame": 1447,
        "score": 0.282979
      },
      {
        "frame": 1448,
        "score": 0.25719
      },
      {
        "frame": 1449,
        "score": 0.273603
      },
      {
        "frame": 1450,
        "score": 0.284439
      },
      {
        "frame": 1451,
        "score": 0.213707
      },
      {
        "frame": 1452,
        "score": 0.223962
      },
      {
        "frame": 1453,
        "score": 0.23912
      },
      {
        "frame": 1454,
        "score": 0.26866
      },
      {
        "frame": 1455,
        "score": 0.212579
      },
      {
        "frame": 1456,
        "score": 0.198067
      },
      {
        "frame": 1457,
        "score": 0.238742
      },
      {
        "frame": 1458,
        "score": 0.252445
      },
      {
        "frame": 1459,
        "score": 0.252698
      },
      {
        "frame": 1460,
        "score": 0.21143
      },
      {
        "frame": 1461,
        "score": 0.208461
      },
      {
        "frame": 1462,
        "score": 0.196892
      },
      {
        "frame": 1463,
        "score": 0.195714
      },
      {
        "frame": 1464,
        "score": 0.218264
      },
      {
        "frame": 1465,
        "score": 0.244356
      },
      {
        "frame": 1466,
        "score": 0.199494
      },
      {
        "frame": 1467,
        "score": 0.223064
      },
      {
        "frame": 1468,
        "score": 0.239644
      },
      {
        "frame": 1469,
        "score": 0.22573
      },
      {
        "frame": 1470,
        "score": 0.226813
      },
      {
        "frame": 1471,
        "score": 0.209963
      },
      {
        "frame": 1472,
        "score": 0.212936
      },
      {
        "frame": 1473,
        "score": 0.325518
      },
      {
        "frame": 1474,
        "score": 0.280255
      },
      {
        "frame": 1475,
        "score": 0.227641
      },
      {
        "frame": 1476,
        "score": 0.253419
      },
      {
        "frame": 1477,
        "score": 0.213325
      },
      {
        "frame": 1478,
        "score": 0.198948
      },
      {
        "frame": 1479,
        "score": 0.264744
      },
      {
        "frame": 1480,
        "score": 0.230857
      },
      {
        "frame": 1481,
        "score": 0.218653
      },
      {
        "frame": 1482,
        "score": 0.217847
      },
      {
        "frame": 1483,
        "score": 0.281501
      },
      {
        "frame": 1484,
        "score": 0.243274
      },
      {
        "frame": 1485,
        "score": 0.200449
      },
      {
        "frame": 1486,
        "score": 0.194887
      },
      {
        "frame": 1487,
        "score": 0.202485
      },
      {
        "frame": 1488,
        "score": 0.277478
      },
      {
        "frame": 1489,
        "score": 0.187169
      },
      {
        "frame": 1490,
        "score": 0.194141
      },
      {
        "frame": 1491,
        "score": 0.197935
      },
      {
        "frame": 1492,
        "score": 0.205546
      },
      {
        "frame": 1493,
        "score": 0.218541
      },
      {
        "frame": 1494,
        "score": 0.212809
      },
      {
        "frame": 1495,
        "score": 0.234374
      },
      {
        "frame": 1496,
        "score": 0.206779
      },
      {
        "frame": 1497,
        "score": 0.199919
      },
      {
        "frame": 1498,
        "score": 0.35737
      },
      {
        "frame": 1499,
        "score": 0.369399
      },
      {
        "frame": 1500,
        "score": 0.413549
      },
      {
        "frame": 1501,
        "score": 0.423498
      },
      {
        "frame": 1502,
        "score": 0.425336
      },
      {
        "frame": 1503,
        "score": 0.479469
      },
      {
        "frame": 1504,
        "score": 0.467083
      },
      {
        "frame": 1505,
        "score": 0.498044
      },
      {
        "frame": 1506,
        "score": 0.536941
      },
      {
        "frame": 1507,
        "score": 0.445207
      },
      {
        "frame": 1508,
        "score": 0.500456
      },
      {
        "frame": 1509,
        "score": 0.524492
      },
      {
        "frame": 1510,
        "score": 0.505542
      },
      {
        "frame": 1511,
        "score": 0.473789
      },
      {
        "frame": 1512,
        "score": 0.458847
      },
      {
        "frame": 1513,
        "score": 0.479948
      },
      {
        "frame": 1514,
        "score": 0.445774
      },
      {
        "frame": 1515,
        "score": 0.416556
      },
      {
        "frame": 1516,
        "score": 0.387506
      },
      {
        "frame": 1517,
        "score": 0.30273
      },
      {
        "frame": 1518,
        "score": 0.260077
      },
      {
        "frame": 1519,
        "score": 0.206465
      },
      {
        "frame": 1520,
        "score": 0.20018
      },
      {
        "frame": 1521,
        "score": 0.202288
      },
      {
        "frame": 1522,
        "score": 0.200923
      },
      {
        "frame": 1523,
        "score": 0.208625
      },
      {
        "frame": 1524,
        "score": 0.194154
      },
      {
        "frame": 1525,
        "score": 0.189174
      },
      {
        "frame": 1526,
        "score": 0.20491
      },
      {
        "frame": 1527,
        "score": 0.226806
      },
      {
        "frame": 1528,
        "score": 0.190868
      },
      {
        "frame": 1529,
        "score": 0.228711
      },
      {
        "frame": 1530,
        "score": 0.200449
      },
      {
        "frame": 1531,
        "score": 0.204305
      },
      {
        "frame": 1532,
        "score": 0.206341
      },
      {
        "frame": 1533,
        "score": 0.182808
      },
      {
        "frame": 1534,
        "score": 0.225182
      },
      {
        "frame": 1535,
        "score": 0.209078
      },
      {
        "frame": 1536,
        "score": 0.214968
      },
      {
        "frame": 1537,
        "score": 0.207735
      },
      {
        "frame": 1538,
        "score": 0.201553
      },
      {
        "frame": 1539,
        "score": 0.193312
      },
      {
        "frame": 1540,
        "score": 0.203442
      },
      {
        "frame": 1541,
        "score": 0.212183
      },
      {
        "frame": 1542,
        "score": 0.182323
      },
      {
        "frame": 1543,
        "score": 0.197087
      },
      {
        "frame": 1544,
        "score": 0.225965
      },
      {
        "frame": 1545,
        "score": 0.222159
      },
      {
        "frame": 1546,
        "score": 0.227339
      },
      {
        "frame": 1547,
        "score": 0.24629
      },
      {
        "frame": 1548,
        "score": 0.229757
      },
      {
        "frame": 1549,
        "score": 0.2191
      },
      {
        "frame": 1550,
        "score": 0.229357
      },
      {
        "frame": 1551,
        "score": 0.234126
      },
      {
        "frame": 1552,
        "score": 0.242172
      },
      {
        "frame": 1553,
        "score": 0.237984
      },
      {
        "frame": 1554,
        "score": 0.251895
      },
      {
        "frame": 1555,
        "score": 0.260923
      },
      {
        "frame": 1556,
        "score": 0.27057
      },
      {
        "frame": 1557,
        "score": 0.260897
      },
      {
        "frame": 1558,
        "score": 0.271726
      },
      {
        "frame": 1559,
        "score": 0.256891
      },
      {
        "frame": 1560,
        "score": 0.279555
      },
      {
        "frame": 1561,
        "score": 0.266005
      },
      {
        "frame": 1562,
        "score": 0.250485
      },
      {
        "frame": 1563,
        "score": 0.237815
      },
      {
        "frame": 1564,
        "score": 0.22298
      },
      {
        "frame": 1565,
        "score": 0.28411
      },
      {
        "frame": 1566,
        "score": 0.277167
      },
      {
        "frame": 1567,
        "score": 0.269208
      },
      {
        "frame": 1568,
        "score": 0.290852
      },
      {
        "frame": 1569,
        "score": 0.301531
      },
      {
        "frame": 1570,
        "score": 0.311522
      },
      {
        "frame": 1571,
        "score": 0.272215
      },
      {
        "frame": 1572,
        "score": 0.324121
      },
      {
        "frame": 1573,
        "score": 0.270055
      },
      {
        "frame": 1574,
        "score": 0.269656
      },
      {
        "frame": 1575,
        "score": 0.261468
      },
      {
        "frame": 1576,
        "score": 0.24487
      },
      {
        "frame": 1577,
        "score": 0.282166
      },
      {
        "frame": 1578,
        "score": 0.271659
      },
      {
        "frame": 1579,
        "score": 0.268733
      },
      {
        "frame": 1580,
        "score": 0.280034
      },
      {
        "frame": 1581,
        "score": 0.258586
      },
      {
        "frame": 1582,
        "score": 0.288134
      },
      {
        "frame": 1583,
        "score": 0.296869
      },
      {
        "frame": 1584,
        "score": 0.268572
      },
      {
        "frame": 1585,
        "score": 0.284978
      },
      {
        "frame": 1586,
        "score": 0.275797
      },
      {
        "frame": 1587,
        "score": 0.279108
      },
      {
        "frame": 1588,
        "score": 0.266583
      },
      {
        "frame": 1589,
        "score": 0.254019
      },
      {
        "frame": 1590,
        "score": 0.256256
      },
      {
        "frame": 1591,
        "score": 0.251568
      },
      {
        "frame": 1592,
        "score": 0.329525
      },
      {
        "frame": 1593,
        "score": 0.28449
      },
      {
        "frame": 1594,
        "score": 0.327395
      },
      {
        "frame": 1595,
        "score": 0.266032
      },
      {
        "frame": 1596,
        "score": 0.258291
      },
      {
        "frame": 1597,
        "score": 0.26644
      },
      {
        "frame": 1598,
        "score": 0.26334
      },
      {
        "frame": 1599,
        "score": 0.290152
      },
      {
        "frame": 1600,
        "score": 0.301373
      },
      {
        "frame": 1601,
        "score": 0.288399
      },
      {
        "frame": 1602,
        "score": 0.29788
      },
      {
        "frame": 1603,
        "score": 0.283576
      },
      {
        "frame": 1604,
        "score": 0.285088
      },
      {
        "frame": 1605,
        "score": 0.24062
      },
      {
        "frame": 1606,
        "score": 0.271152
      },
      {
        "frame": 1607,
        "score": 0.26136
      },
      {
        "frame": 1608,
        "score": 0.267355
      },
      {
        "frame": 1609,
        "score": 0.255572
      },
      {
        "frame": 1610,
        "score": 0.249301
      },
      {
        "frame": 1611,
        "score": 0.249826
      },
      {
        "frame": 1612,
        "score": 0.301417
      },
      {
        "frame": 1613,
        "score": 0.249508
      },
      {
        "frame": 1614,
        "score": 0.250431
      },
      {
        "frame": 1615,
        "score": 0.247496
      },
      {
        "frame": 1616,
        "score": 0.270198
      },
      {
        "frame": 1617,
        "score": 0.260484
      },
      {
        "frame": 1618,
        "score": 0.269898
      },
      {
        "frame": 1619,
        "score": 0.252316
      },
      {
        "frame": 1620,
        "score": 0.239952
      },
      {
        "frame": 1621,
        "score": 0.229479
      },
      {
        "frame": 1622,
        "score": 0.215479
      },
      {
        "frame": 1623,
        "score": 0.251661
      },
      {
        "frame": 1624,
        "score": 0.230425
      },
      {
        "frame": 1625,
        "score": 0.216171
      },
      {
        "frame": 1626,
        "score": 0.240331
      },
      {
        "frame": 1627,
        "score": 0.2303
      },
      {
        "frame": 1628,
        "score": 0.233295
      },
      {
        "frame": 1629,
        "score": 0.263395
      },
      {
        "frame": 1630,
        "score": 0.234293
      },
      {
        "frame": 1631,
        "score": 0.215476
      },
      {
        "frame": 1632,
        "score": 0.209821
      },
      {
        "frame": 1633,
        "score": 0.20707
      },
      {
        "frame": 1634,
        "score": 0.241833
      },
      {
        "frame": 1635,
        "score": 0.221093
      },
      {
        "frame": 1636,
        "score": 0.234288
      },
      {
        "frame": 1637,
        "score": 0.206667
      },
      {
        "frame": 1638,
        "score": 0.189281
      },
      {
        "frame": 1639,
        "score": 0.254688
      },
      {
        "frame": 1640,
        "score": 0.278816
      },
      {
        "frame": 1641,
        "score": 0.27409
      },
      {
        "frame": 1642,
        "score": 0.195932
      },
      {
        "frame": 1643,
        "score": 0.236393
      },
      {
        "frame": 1644,
        "score": 0.233608
      },
      {
        "frame": 1645,
        "score": 0.234606
      },
      {
        "frame": 1646,
        "score": 0.249079
      },
      {
        "frame": 1647,
        "score": 0.266029
      },
      {
        "frame": 1648,
        "score": 0.237888
      },
      {
        "frame": 1649,
        "score": 0.25794
      },
      {
        "frame": 1650,
        "score": 0.243943
      },
      {
        "frame": 1651,
        "score": 0.264007
      },
      {
        "frame": 1652,
        "score": 0.216931
      },
      {
        "frame": 1653,
        "score": 0.258397
      },
      {
        "frame": 1654,
        "score": 0.244568
      },
      {
        "frame": 1655,
        "score": 0.22213
      },
      {
        "frame": 1656,
        "score": 0.208919
      },
      {
        "frame": 1657,
        "score": 0.262721
      },
      {
        "frame": 1658,
        "score": 0.244313
      },
      {
        "frame": 1659,
        "score": 0.221886
      },
      {
        "frame": 1660,
        "score": 0.234526
      },
      {
        "frame": 1661,
        "score": 0.232079
      },
      {
        "frame": 1662,
        "score": 0.22693
      },
      {
        "frame": 1663,
        "score": 0.249321
      },
      {
        "frame": 1664,
        "score": 0.266788
      },
      {
        "frame": 1665,
        "score": 0.292404
      },
      {
        "frame": 1666,
        "score": 0.236673
      },
      {
        "frame": 1667,
        "score": 0.25953
      },
      {
        "frame": 1668,
        "score": 0.264768
      },
      {
        "frame": 1669,
        "score": 0.260782
      },
      {
        "frame": 1670,
        "score": 0.258457
      },
      {
        "frame": 1671,
        "score": 0.259802
      },
      {
        "frame": 1672,
        "score": 0.23946
      },
      {
        "frame": 1673,
        "score": 0.207692
      },
      {
        "frame": 1674,
        "score": 0.236542
      },
      {
        "frame": 1675,
        "score": 0.25759
      },
      {
        "frame": 1676,
        "score": 0.256113
      },
      {
        "frame": 1677,
        "score": 0.232156
      },
      {
        "frame": 1678,
        "score": 0.252985
      },
      {
        "frame": 1679,
        "score": 0.231756
      },
      {
        "frame": 1680,
        "score": 0.213961
      },
      {
        "frame": 1681,
        "score": 0.267803
      },
      {
        "frame": 1682,
        "score": 0.279457
      },
      {
        "frame": 1683,
        "score": 0.255963
      },
      {
        "frame": 1684,
        "score": 0.262802
      },
      {
        "frame": 1685,
        "score": 0.259111
      },
      {
        "frame": 1686,
        "score": 0.243594
      },
      {
        "frame": 1687,
        "score": 0.245523
      },
      {
        "frame": 1688,
        "score": 0.227843
      },
      {
        "frame": 1689,
        "score": 0.222763
      },
      {
        "frame": 1690,
        "score": 0.24227
      },
      {
        "frame": 1691,
        "score": 0.267427
      },
      {
        "frame": 1692,
        "score": 0.260939
      },
      {
        "frame": 1693,
        "score": 0.237846
      },
      {
        "frame": 1694,
        "score": 0.207099
      },
      {
        "frame": 1695,
        "score": 0.196125
      },
      {
        "frame": 1696,
        "score": 0.19644
      },
      {
        "frame": 1697,
        "score": 0.197509
      },
      {
        "frame": 1698,
        "score": 0.187483
      },
      {
        "frame": 1699,
        "score": 0.200511
      },
      {
        "frame": 1700,
        "score": 0.230331
      },
      {
        "frame": 1701,
        "score": 0.252793
      },
      {
        "frame": 1702,
        "score": 0.254476
      },
      {
        "frame": 1703,
        "score": 0.219637
      },
      {
        "frame": 1704,
        "score": 0.241764
      },
      {
        "frame": 1705,
        "score": 0.232907
      },
      {
        "frame": 1706,
        "score": 0.213967
      },
      {
        "frame": 1707,
        "score": 0.25408
      },
      {
        "frame": 1708,
        "score": 0.270193
      },
      {
        "frame": 1709,
        "score": 0.214405
      },
      {
        "frame": 1710,
        "score": 0.228544
      },
      {
        "frame": 1711,
        "score": 0.245052
      },
      {
        "frame": 1712,
        "score": 0.246039
      },
      {
        "frame": 1713,
        "score": 0.23019
      },
      {
        "frame": 1714,
        "score": 0.251716
      },
      {
        "frame": 1715,
        "score": 0.18993
      },
      {
        "frame": 1716,
        "score": 0.202868
      },
      {
        "frame": 1717,
        "score": 0.207618
      },
      {
        "frame": 1718,
        "score": 0.190578
      },
      {
        "frame": 1719,
        "score": 0.194696
      },
      {
        "frame": 1720,
        "score": 0.214314
      },
      {
        "frame": 1721,
        "score": 0.267724
      },
      {
        "frame": 1722,
        "score": 0.235785
      },
      {
        "frame": 1723,
        "score": 0.25951
      },
      {
        "frame": 1724,
        "score": 0.211858
      },
      {
        "frame": 1725,
        "score": 0.202705
      },
      {
        "frame": 1726,
        "score": 0.257248
      },
      {
        "frame": 1727,
        "score": 0.239931
      },
      {
        "frame": 1728,
        "score": 0.25531
      },
      {
        "frame": 1729,
        "score": 0.211578
      },
      {
        "frame": 1730,
        "score": 0.239066
      },
      {
        "frame": 1731,
        "score": 0.188464
      },
      {
        "frame": 1732,
        "score": 0.256963
      },
      {
        "frame": 1733,
        "score": 0.215589
      },
      {
        "frame": 1734,
        "score": 0.219016
      },
      {
        "frame": 1735,
        "score": 0.269033
      },
      {
        "frame": 1736,
        "score": 0.224675
      },
      {
        "frame": 1737,
        "score": 0.220361
      },
      {
        "frame": 1738,
        "score": 0.222186
      },
      {
        "frame": 1739,
        "score": 0.226038
      },
      {
        "frame": 1740,
        "score": 0.213834
      },
      {
        "frame": 1741,
        "score": 0.241861
      },
      {
        "frame": 1742,
        "score": 0.225487
      },
      {
        "frame": 1743,
        "score": 0.241022
      },
      {
        "frame": 1744,
        "score": 0.2049
      },
      {
        "frame": 1745,
        "score": 0.221279
      },
      {
        "frame": 1746,
        "score": 0.214452
      },
      {
        "frame": 1747,
        "score": 0.291027
      },
      {
        "frame": 1748,
        "score": 0.208786
      },
      {
        "frame": 1749,
        "score": 0.217422
      },
      {
        "frame": 1750,
        "score": 0.220983
      },
      {
        "frame": 1751,
        "score": 0.210855
      },
      {
        "frame": 1752,
        "score": 0.218778
      },
      {
        "frame": 1753,
        "score": 0.21717
      },
      {
        "frame": 1754,
        "score": 0.210195
      },
      {
        "frame": 1755,
        "score": 0.241992
      },
      {
        "frame": 1756,
        "score": 0.211939
      },
      {
        "frame": 1757,
        "score": 0.198096
      },
      {
        "frame": 1758,
        "score": 0.186178
      },
      {
        "frame": 1759,
        "score": 0.1915
      },
      {
        "frame": 1760,
        "score": 0.202268
      },
      {
        "frame": 1761,
        "score": 0.22848
      },
      {
        "frame": 1762,
        "score": 0.234684
      },
      {
        "frame": 1763,
        "score": 0.20385
      },
      {
        "frame": 1764,
        "score": 0.202766
      },
      {
        "frame": 1765,
        "score": 0.183191
      },
      {
        "frame": 1766,
        "score": 0.210532
      },
      {
        "frame": 1767,
        "score": 0.211369
      },
      {
        "frame": 1768,
        "score": 0.23208
      },
      {
        "frame": 1769,
        "score": 0.192685
      },
      {
        "frame": 1770,
        "score": 0.225376
      },
      {
        "frame": 1771,
        "score": 0.181957
      },
      {
        "frame": 1772,
        "score": 0.196866
      },
      {
        "frame": 1773,
        "score": 0.197946
      },
      {
        "frame": 1774,
        "score": 0.237288
      },
      {
        "frame": 1775,
        "score": 0.228369
      },
      {
        "frame": 1776,
        "score": 0.197862
      },
      {
        "frame": 1777,
        "score": 0.203803
      },
      {
        "frame": 1778,
        "score": 0.196252
      },
      {
        "frame": 1779,
        "score": 0.190138
      },
      {
        "frame": 1780,
        "score": 0.19215
      },
      {
        "frame": 1781,
        "score": 0.211283
      },
      {
        "frame": 1782,
        "score": 0.20388
      },
      {
        "frame": 1783,
        "score": 0.20597
      },
      {
        "frame": 1784,
        "score": 0.189738
      },
      {
        "frame": 1785,
        "score": 0.192745
      },
      {
        "frame": 1786,
        "score": 0.213817
      },
      {
        "frame": 1787,
        "score": 0.214442
      },
      {
        "frame": 1788,
        "score": 0.201413
      },
      {
        "frame": 1789,
        "score": 0.235409
      },
      {
        "frame": 1790,
        "score": 0.260522
      },
      {
        "frame": 1791,
        "score": 0.244321
      },
      {
        "frame": 1792,
        "score": 0.258925
      },
      {
        "frame": 1793,
        "score": 0.275675
      },
      {
        "frame": 1794,
        "score": 0.264998
      },
      {
        "frame": 1795,
        "score": 0.262682
      },
      {
        "frame": 1796,
        "score": 0.216431
      },
      {
        "frame": 1797,
        "score": 0.246692
      },
      {
        "frame": 1798,
        "score": 0.228997
      },
      {
        "frame": 1799,
        "score": 0.230543
      },
      {
        "frame": 1800,
        "score": 0.241076
      },
      {
        "frame": 1801,
        "score": 0.211979
      },
      {
        "frame": 1802,
        "score": 0.209616
      },
      {
        "frame": 1803,
        "score": 0.236713
      },
      {
        "frame": 1804,
        "score": 0.248979
      },
      {
        "frame": 1805,
        "score": 0.26281
      },
      {
        "frame": 1806,
        "score": 0.272484
      },
      {
        "frame": 1807,
        "score": 0.252942
      },
      {
        "frame": 1808,
        "score": 0.254422
      },
      {
        "frame": 1809,
        "score": 0.246059
      },
      {
        "frame": 1810,
        "score": 0.237843
      },
      {
        "frame": 1811,
        "score": 0.232736
      },
      {
        "frame": 1812,
        "score": 0.238033
      },
      {
        "frame": 1813,
        "score": 0.305748
      },
      {
        "frame": 1814,
        "score": 0.269511
      },
      {
        "frame": 1815,
        "score": 0.26253
      },
      {
        "frame": 1816,
        "score": 0.262843
      },
      {
        "frame": 1817,
        "score": 0.289933
      },
      {
        "frame": 1818,
        "score": 0.288063
      },
      {
        "frame": 1819,
        "score": 0.280157
      },
      {
        "frame": 1820,
        "score": 0.286024
      },
      {
        "frame": 1821,
        "score": 0.280072
      },
      {
        "frame": 1822,
        "score": 0.284666
      },
      {
        "frame": 1823,
        "score": 0.290669
      },
      {
        "frame": 1824,
        "score": 0.251223
      },
      {
        "frame": 1825,
        "score": 0.271626
      },
      {
        "frame": 1826,
        "score": 0.251649
      },
      {
        "frame": 1827,
        "score": 0.266308
      },
      {
        "frame": 1828,
        "score": 0.26975
      },
      {
        "frame": 1829,
        "score": 0.25875
      },
      {
        "frame": 1830,
        "score": 0.22138
      },
      {
        "frame": 1831,
        "score": 0.247125
      },
      {
        "frame": 1832,
        "score": 0.249904
      },
      {
        "frame": 1833,
        "score": 0.218007
      },
      {
        "frame": 1834,
        "score": 0.213093
      },
      {
        "frame": 1835,
        "score": 0.221724
      },
      {
        "frame": 1836,
        "score": 0.235385
      },
      {
        "frame": 1837,
        "score": 0.258222
      },
      {
        "frame": 1838,
        "score": 0.25129
      },
      {
        "frame": 1839,
        "score": 0.233587
      },
      {
        "frame": 1840,
        "score": 0.248835
      },
      {
        "frame": 1841,
        "score": 0.258695
      },
      {
        "frame": 1842,
        "score": 0.265517
      },
      {
        "frame": 1843,
        "score": 0.243619
      },
      {
        "frame": 1844,
        "score": 0.237156
      },
      {
        "frame": 1845,
        "score": 0.206628
      },
      {
        "frame": 1846,
        "score": 0.30398
      },
      {
        "frame": 1847,
        "score": 0.353896
      },
      {
        "frame": 1848,
        "score": 0.358595
      },
      {
        "frame": 1849,
        "score": 0.278764
      },
      {
        "frame": 1850,
        "score": 0.367407
      },
      {
        "frame": 1851,
        "score": 0.358911
      },
      {
        "frame": 1852,
        "score": 0.397704
      },
      {
        "frame": 1853,
        "score": 0.374902
      },
      {
        "frame": 1854,
        "score": 0.412911
      },
      {
        "frame": 1855,
        "score": 0.38637
      },
      {
        "frame": 1856,
        "score": 0.376499
      },
      {
        "frame": 1857,
        "score": 0.404144
      },
      {
        "frame": 1858,
        "score": 0.398375
      },
      {
        "frame": 1859,
        "score": 0.380898
      },
      {
        "frame": 1860,
        "score": 0.35424
      },
      {
        "frame": 1861,
        "score": 0.379211
      },
      {
        "frame": 1862,
        "score": 0.341441
      },
      {
        "frame": 1863,
        "score": 0.36148
      },
      {
        "frame": 1864,
        "score": 0.328758
      },
      {
        "frame": 1865,
        "score": 0.325379
      },
      {
        "frame": 1866,
        "score": 0.344186
      },
      {
        "frame": 1867,
        "score": 0.29754
      },
      {
        "frame": 1868,
        "score": 0.275947
      },
      {
        "frame": 1869,
        "score": 0.282342
      },
      {
        "frame": 1870,
        "score": 0.309466
      },
      {
        "frame": 1871,
        "score": 0.278293
      },
      {
        "frame": 1872,
        "score": 0.265212
      },
      {
        "frame": 1873,
        "score": 0.276441
      },
      {
        "frame": 1874,
        "score": 0.244243
      },
      {
        "frame": 1875,
        "score": 0.248917
      },
      {
        "frame": 1876,
        "score": 0.288058
      },
      {
        "frame": 1877,
        "score": 0.264987
      },
      {
        "frame": 1878,
        "score": 0.262191
      },
      {
        "frame": 1879,
        "score": 0.238365
      },
      {
        "frame": 1880,
        "score": 0.263094
      },
      {
        "frame": 1881,
        "score": 0.260741
      },
      {
        "frame": 1882,
        "score": 0.279854
      },
      {
        "frame": 1883,
        "score": 0.24598
      },
      {
        "frame": 1884,
        "score": 0.216
      },
      {
        "frame": 1885,
        "score": 0.26363
      },
      {
        "frame": 1886,
        "score": 0.283054
      },
      {
        "frame": 1887,
        "score": 0.226128
      },
      {
        "frame": 1888,
        "score": 0.226857
      },
      {
        "frame": 1889,
        "score": 0.254179
      },
      {
        "frame": 1890,
        "score": 0.261268
      },
      {
        "frame": 1891,
        "score": 0.274154
      },
      {
        "frame": 1892,
        "score": 0.255312
      },
      {
        "frame": 1893,
        "score": 0.279878
      },
      {
        "frame": 1894,
        "score": 0.281254
      },
      {
        "frame": 1895,
        "score": 0.250915
      },
      {
        "frame": 1896,
        "score": 0.229004
      },
      {
        "frame": 1897,
        "score": 0.272546
      },
      {
        "frame": 1898,
        "score": 0.239052
      },
      {
        "frame": 1899,
        "score": 0.263816
      },
      {
        "frame": 1900,
        "score": 0.201356
      },
      {
        "frame": 1901,
        "score": 0.230986
      },
      {
        "frame": 1902,
        "score": 0.269023
      },
      {
        "frame": 1903,
        "score": 0.250068
      },
      {
        "frame": 1904,
        "score": 0.230249
      },
      {
        "frame": 1905,
        "score": 0.283982
      },
      {
        "frame": 1906,
        "score": 0.264716
      },
      {
        "frame": 1907,
        "score": 0.273755
      },
      {
        "frame": 1908,
        "score": 0.276807
      },
      {
        "frame": 1909,
        "score": 0.276531
      },
      {
        "frame": 1910,
        "score": 0.307984
      },
      {
        "frame": 1911,
        "score": 0.281414
      },
      {
        "frame": 1912,
        "score": 0.246023
      },
      {
        "frame": 1913,
        "score": 0.29418
      },
      {
        "frame": 1914,
        "score": 0.293644
      },
      {
        "frame": 1915,
        "score": 0.283695
      },
      {
        "frame": 1916,
        "score": 0.303346
      },
      {
        "frame": 1917,
        "score": 0.294739
      },
      {
        "frame": 1918,
        "score": 0.292071
      },
      {
        "frame": 1919,
        "score": 0.264254
      },
      {
        "frame": 1920,
        "score": 0.288351
      },
      {
        "frame": 1921,
        "score": 0.288125
      },
      {
        "frame": 1922,
        "score": 0.275107
      },
      {
        "frame": 1923,
        "score": 0.291283
      },
      {
        "frame": 1924,
        "score": 0.300901
      },
      {
        "frame": 1925,
        "score": 0.305934
      },
      {
        "frame": 1926,
        "score": 0.269738
      },
      {
        "frame": 1927,
        "score": 0.318429
      },
      {
        "frame": 1928,
        "score": 0.277837
      },
      {
        "frame": 1929,
        "score": 0.267311
      },
      {
        "frame": 1930,
        "score": 0.268167
      },
      {
        "frame": 1931,
        "score": 0.228152
      },
      {
        "frame": 1932,
        "score": 0.262981
      },
      {
        "frame": 1933,
        "score": 0.298826
      },
      {
        "frame": 1934,
        "score": 0.258447
      },
      {
        "frame": 1935,
        "score": 0.231549
      },
      {
        "frame": 1936,
        "score": 0.212855
      },
      {
        "frame": 1937,
        "score": 0.211338
      },
      {
        "frame": 1938,
        "score": 0.242527
      },
      {
        "frame": 1939,
        "score": 0.186535
      },
      {
        "frame": 1940,
        "score": 0.209479
      },
      {
        "frame": 1941,
        "score": 0.222553
      },
      {
        "frame": 1942,
        "score": 0.185121
      },
      {
        "frame": 1943,
        "score": 0.220069
      },
      {
        "frame": 1944,
        "score": 0.237406
      },
      {
        "frame": 1945,
        "score": 0.252879
      },
      {
        "frame": 1946,
        "score": 0.235003
      },
      {
        "frame": 1947,
        "score": 0.242236
      },
      {
        "frame": 1948,
        "score": 0.259204
      },
      {
        "frame": 1949,
        "score": 0.225353
      },
      {
        "frame": 1950,
        "score": 0.230808
      },
      {
        "frame": 1951,
        "score": 0.220848
      },
      {
        "frame": 1952,
        "score": 0.24087
      },
      {
        "frame": 1953,
        "score": 0.234358
      },
      {
        "frame": 1954,
        "score": 0.289031
      },
      {
        "frame": 1955,
        "score": 0.261276
      },
      {
        "frame": 1956,
        "score": 0.263778
      },
      {
        "frame": 1957,
        "score": 0.203845
      },
      {
        "frame": 1958,
        "score": 0.214938
      },
      {
        "frame": 1959,
        "score": 0.282342
      },
      {
        "frame": 1960,
        "score": 0.195237
      },
      {
        "frame": 1961,
        "score": 0.248464
      },
      {
        "frame": 1962,
        "score": 0.212689
      },
      {
        "frame": 1963,
        "score": 0.217096
      },
      {
        "frame": 1964,
        "score": 0.185484
      },
      {
        "frame": 1965,
        "score": 0.181206
      },
      {
        "frame": 1966,
        "score": 0.235388
      },
      {
        "frame": 1967,
        "score": 0.241742
      },
      {
        "frame": 1968,
        "score": 0.243004
      },
      {
        "frame": 1969,
        "score": 0.214082
      },
      {
        "frame": 1970,
        "score": 0.206089
      },
      {
        "frame": 1971,
        "score": 0.179049
      },
      {
        "frame": 1972,
        "score": 0.199004
      },
      {
        "frame": 1973,
        "score": 0.183902
      },
      {
        "frame": 1974,
        "score": 0.21579
      },
      {
        "frame": 1975,
        "score": 0.213549
      },
      {
        "frame": 1976,
        "score": 0.257012
      },
      {
        "frame": 1977,
        "score": 0.344882
      },
      {
        "frame": 1978,
        "score": 0.408311
      },
      {
        "frame": 1979,
        "score": 0.432178
      },
      {
        "frame": 1980,
        "score": 0.4281
      },
      {
        "frame": 1981,
        "score": 0.458852
      },
      {
        "frame": 1982,
        "score": 0.474558
      },
      {
        "frame": 1983,
        "score": 0.50188
      },
      {
        "frame": 1984,
        "score": 0.529601
      },
      {
        "frame": 1985,
        "score": 0.473205
      },
      {
        "frame": 1986,
        "score": 0.51491
      },
      {
        "frame": 1987,
        "score": 0.508376
      },
      {
        "frame": 1988,
        "score": 0.479052
      },
      {
        "frame": 1989,
        "score": 0.470088
      },
      {
        "frame": 1990,
        "score": 0.288071
      },
      {
        "frame": 1991,
        "score": 0.179598
      },
      {
        "frame": 1992,
        "score": 0.204839
      },
      {
        "frame": 1993,
        "score": 0.199537
      },
      {
        "frame": 1994,
        "score": 0.224906
      },
      {
        "frame": 1995,
        "score": 0.188024
      },
      {
        "frame": 1996,
        "score": 0.255397
      },
      {
        "frame": 1997,
        "score": 0.252144
      },
      {
        "frame": 1998,
        "score": 0.209242
      },
      {
        "frame": 1999,
        "score": 0.205153
      },
      {
        "frame": 2000,
        "score": 0.19768
      },
      {
        "frame": 2001,
        "score": 0.206865
      },
      {
        "frame": 2002,
        "score": 0.216187
      },
      {
        "frame": 2003,
        "score": 0.218108
      },
      {
        "frame": 2004,
        "score": 0.206869
      },
      {
        "frame": 2005,
        "score": 0.223058
      },
      {
        "frame": 2006,
        "score": 0.215953
      },
      {
        "frame": 2007,
        "score": 0.202778
      },
      {
        "frame": 2008,
        "score": 0.200219
      },
      {
        "frame": 2009,
        "score": 0.205511
      },
      {
        "frame": 2010,
        "score": 0.208245
      },
      {
        "frame": 2011,
        "score": 0.224738
      },
      {
        "frame": 2012,
        "score": 0.201341
      },
      {
        "frame": 2013,
        "score": 0.236347
      },
      {
        "frame": 2014,
        "score": 0.223263
      },
      {
        "frame": 2015,
        "score": 0.23337
      },
      {
        "frame": 2016,
        "score": 0.221339
      },
      {
        "frame": 2017,
        "score": 0.238506
      },
      {
        "frame": 2018,
        "score": 0.234555
      },
      {
        "frame": 2019,
        "score": 0.226588
      },
      {
        "frame": 2020,
        "score": 0.210607
      },
      {
        "frame": 2021,
        "score": 0.229068
      },
      {
        "frame": 2022,
        "score": 0.232316
      },
      {
        "frame": 2023,
        "score": 0.238301
      },
      {
        "frame": 2024,
        "score": 0.255728
      },
      {
        "frame": 2025,
        "score": 0.271082
      },
      {
        "frame": 2026,
        "score": 0.262672
      },
      {
        "frame": 2027,
        "score": 0.279444
      },
      {
        "frame": 2028,
        "score": 0.278263
      },
      {
        "frame": 2029,
        "score": 0.253358
      },
      {
        "frame": 2030,
        "score": 0.262523
      },
      {
        "frame": 2031,
        "score": 0.263251
      },
      {
        "frame": 2032,
        "score": 0.282989
      },
      {
        "frame": 2033,
        "score": 0.278126
      },
      {
        "frame": 2034,
        "score": 0.275352
      },
      {
        "frame": 2035,
        "score": 0.272808
      },
      {
        "frame": 2036,
        "score": 0.289413
      },
      {
        "frame": 2037,
        "score": 0.267488
      },
      {
        "frame": 2038,
        "score": 0.297485
      },
      {
        "frame": 2039,
        "score": 0.315207
      },
      {
        "frame": 2040,
        "score": 0.266736
      },
      {
        "frame": 2041,
        "score": 0.293419
      },
      {
        "frame": 2042,
        "score": 0.288697
      },
      {
        "frame": 2043,
        "score": 0.280874
      },
      {
        "frame": 2044,
        "score": 0.249211
      },
      {
        "frame": 2045,
        "score": 0.263347
      },
      {
        "frame": 2046,
        "score": 0.251399
      },
      {
        "frame": 2047,
        "score": 0.259998
      },
      {
        "frame": 2048,
        "score": 0.262022
      },
      {
        "frame": 2049,
        "score": 0.254125
      },
      {
        "frame": 2050,
        "score": 0.2698
      },
      {
        "frame": 2051,
        "score": 0.28452
      },
      {
        "frame": 2052,
        "score": 0.272394
      },
      {
        "frame": 2053,
        "score": 0.269804
      },
      {
        "frame": 2054,
        "score": 0.268871
      },
      {
        "frame": 2055,
        "score": 0.270951
      },
      {
        "frame": 2056,
        "score": 0.284274
      },
      {
        "frame": 2057,
        "score": 0.291218
      },
      {
        "frame": 2058,
        "score": 0.24981
      },
      {
        "frame": 2059,
        "score": 0.276743
      },
      {
        "frame": 2060,
        "score": 0.292211
      },
      {
        "frame": 2061,
        "score": 0.302865
      },
      {
        "frame": 2062,
        "score": 0.304919
      },
      {
        "frame": 2063,
        "score": 0.295037
      },
      {
        "frame": 2064,
        "score": 0.272112
      },
      {
        "frame": 2065,
        "score": 0.270405
      },
      {
        "frame": 2066,
        "score": 0.266751
      },
      {
        "frame": 2067,
        "score": 0.278725
      },
      {
        "frame": 2068,
        "score": 0.279897
      },
      {
        "frame": 2069,
        "score": 0.270184
      },
      {
        "frame": 2070,
        "score": 0.252144
      },
      {
        "frame": 2071,
        "score": 0.256797
      },
      {
        "frame": 2072,
        "score": 0.258103
      },
      {
        "frame": 2073,
        "score": 0.252525
      },
      {
        "frame": 2074,
        "score": 0.256933
      },
      {
        "frame": 2075,
        "score": 0.23489
      },
      {
        "frame": 2076,
        "score": 0.262249
      },
      {
        "frame": 2077,
        "score": 0.244945
      },
      {
        "frame": 2078,
        "score": 0.239083
      },
      {
        "frame": 2079,
        "score": 0.268048
      },
      {
        "frame": 2080,
        "score": 0.241205
      },
      {
        "frame": 2081,
        "score": 0.235325
      },
      {
        "frame": 2082,
        "score": 0.268348
      },
      {
        "frame": 2083,
        "score": 0.242131
      },
      {
        "frame": 2084,
        "score": 0.24245
      },
      {
        "frame": 2085,
        "score": 0.277262
      },
      {
        "frame": 2086,
        "score": 0.253761
      },
      {
        "frame": 2087,
        "score": 0.260723
      },
      {
        "frame": 2088,
        "score": 0.260749
      },
      {
        "frame": 2089,
        "score": 0.251996
      },
      {
        "frame": 2090,
        "score": 0.255124
      },
      {
        "frame": 2091,
        "score": 0.247167
      },
      {
        "frame": 2092,
        "score": 0.217803
      },
      {
        "frame": 2093,
        "score": 0.249208
      },
      {
        "frame": 2094,
        "score": 0.275262
      },
      {
        "frame": 2095,
        "score": 0.276096
      },
      {
        "frame": 2096,
        "score": 0.248115
      },
      {
        "frame": 2097,
        "score": 0.253874
      },
      {
        "frame": 2098,
        "score": 0.207726
      },
      {
        "frame": 2099,
        "score": 0.219064
      },
      {
        "frame": 2100,
        "score": 0.221294
      },
      {
        "frame": 2101,
        "score": 0.219334
      },
      {
        "frame": 2102,
        "score": 0.233959
      },
      {
        "frame": 2103,
        "score": 0.20441
      },
      {
        "frame": 2104,
        "score": 0.215061
      },
      {
        "frame": 2105,
        "score": 0.211731
      },
      {
        "frame": 2106,
        "score": 0.229316
      },
      {
        "frame": 2107,
        "score": 0.241304
      },
      {
        "frame": 2108,
        "score": 0.204467
      },
      {
        "frame": 2109,
        "score": 0.229285
      },
      {
        "frame": 2110,
        "score": 0.20803
      },
      {
        "frame": 2111,
        "score": 0.204391
      },
      {
        "frame": 2112,
        "score": 0.265229
      },
      {
        "frame": 2113,
        "score": 0.292104
      },
      {
        "frame": 2114,
        "score": 0.242773
      },
      {
        "frame": 2115,
        "score": 0.208136
      },
      {
        "frame": 2116,
        "score": 0.219629
      },
      {
        "frame": 2117,
        "score": 0.238508
      },
      {
        "frame": 2118,
        "score": 0.204273
      },
      {
        "frame": 2119,
        "score": 0.208353
      },
      {
        "frame": 2120,
        "score": 0.267478
      },
      {
        "frame": 2121,
        "score": 0.244762
      },
      {
        "frame": 2122,
        "score": 0.196409
      },
      {
        "frame": 2123,
        "score": 0.225748
      },
      {
        "frame": 2124,
        "score": 0.254654
      },
      {
        "frame": 2125,
        "score": 0.243453
      },
      {
        "frame": 2126,
        "score": 0.210755
      },
      {
        "frame": 2127,
        "score": 0.201144
      },
      {
        "frame": 2128,
        "score": 0.22128
      },
      {
        "frame": 2129,
        "score": 0.249883
      },
      {
        "frame": 2130,
        "score": 0.214351
      },
      {
        "frame": 2131,
        "score": 0.214946
      },
      {
        "frame": 2132,
        "score": 0.247711
      },
      {
        "frame": 2133,
        "score": 0.227696
      },
      {
        "frame": 2134,
        "score": 0.235837
      },
      {
        "frame": 2135,
        "score": 0.250254
      },
      {
        "frame": 2136,
        "score": 0.254222
      },
      {
        "frame": 2137,
        "score": 0.262108
      },
      {
        "frame": 2138,
        "score": 0.252927
      },
      {
        "frame": 2139,
        "score": 0.245569
      },
      {
        "frame": 2140,
        "score": 0.199863
      },
      {
        "frame": 2141,
        "score": 0.234858
      },
      {
        "frame": 2142,
        "score": 0.257554
      },
      {
        "frame": 2143,
        "score": 0.220619
      },
      {
        "frame": 2144,
        "score": 0.2216
      },
      {
        "frame": 2145,
        "score": 0.254629
      },
      {
        "frame": 2146,
        "score": 0.255293
      },
      {
        "frame": 2147,
        "score": 0.263466
      },
      {
        "frame": 2148,
        "score": 0.236023
      },
      {
        "frame": 2149,
        "score": 0.256267
      },
      {
        "frame": 2150,
        "score": 0.314247
      },
      {
        "frame": 2151,
        "score": 0.240046
      },
      {
        "frame": 2152,
        "score": 0.27086
      },
      {
        "frame": 2153,
        "score": 0.259439
      },
      {
        "frame": 2154,
        "score": 0.25655
      },
      {
        "frame": 2155,
        "score": 0.255974
      },
      {
        "frame": 2156,
        "score": 0.260947
      },
      {
        "frame": 2157,
        "score": 0.25476
      },
      {
        "frame": 2158,
        "score": 0.248192
      },
      {
        "frame": 2159,
        "score": 0.25062
      },
      {
        "frame": 2160,
        "score": 0.253782
      },
      {
        "frame": 2161,
        "score": 0.205806
      },
      {
        "frame": 2162,
        "score": 0.214004
      },
      {
        "frame": 2163,
        "score": 0.206788
      },
      {
        "frame": 2164,
        "score": 0.187565
      },
      {
        "frame": 2165,
        "score": 0.235455
      },
      {
        "frame": 2166,
        "score": 0.20591
      },
      {
        "frame": 2167,
        "score": 0.193371
      },
      {
        "frame": 2168,
        "score": 0.234227
      },
      {
        "frame": 2169,
        "score": 0.172852
      },
      {
        "frame": 2170,
        "score": 0.195804
      },
      {
        "frame": 2171,
        "score": 0.182493
      },
      {
        "frame": 2172,
        "score": 0.213472
      },
      {
        "frame": 2173,
        "score": 0.211704
      },
      {
        "frame": 2174,
        "score": 0.204408
      },
      {
        "frame": 2175,
        "score": 0.187615
      },
      {
        "frame": 2176,
        "score": 0.193494
      },
      {
        "frame": 2177,
        "score": 0.207935
      },
      {
        "frame": 2178,
        "score": 0.197503
      },
      {
        "frame": 2179,
        "score": 0.209913
      },
      {
        "frame": 2180,
        "score": 0.276737
      },
      {
        "frame": 2181,
        "score": 0.224528
      },
      {
        "frame": 2182,
        "score": 0.272979
      },
      {
        "frame": 2183,
        "score": 0.226605
      },
      {
        "frame": 2184,
        "score": 0.231289
      },
      {
        "frame": 2185,
        "score": 0.225899
      },
      {
        "frame": 2186,
        "score": 0.230147
      },
      {
        "frame": 2187,
        "score": 0.270417
      },
      {
        "frame": 2188,
        "score": 0.211001
      },
      {
        "frame": 2189,
        "score": 0.213246
      },
      {
        "frame": 2190,
        "score": 0.223245
      },
      {
        "frame": 2191,
        "score": 0.219872
      },
      {
        "frame": 2192,
        "score": 0.211108
      },
      {
        "frame": 2193,
        "score": 0.217696
      },
      {
        "frame": 2194,
        "score": 0.228165
      },
      {
        "frame": 2195,
        "score": 0.213069
      },
      {
        "frame": 2196,
        "score": 0.247042
      },
      {
        "frame": 2197,
        "score": 0.195477
      },
      {
        "frame": 2198,
        "score": 0.217722
      },
      {
        "frame": 2199,
        "score": 0.204262
      },
      {
        "frame": 2200,
        "score": 0.192414
      },
      {
        "frame": 2201,
        "score": 0.196057
      },
      {
        "frame": 2202,
        "score": 0.206161
      },
      {
        "frame": 2203,
        "score": 0.202344
      },
      {
        "frame": 2204,
        "score": 0.207809
      },
      {
        "frame": 2205,
        "score": 0.229921
      },
      {
        "frame": 2206,
        "score": 0.201418
      },
      {
        "frame": 2207,
        "score": 0.229108
      },
      {
        "frame": 2208,
        "score": 0.215946
      },
      {
        "frame": 2209,
        "score": 0.25137
      },
      {
        "frame": 2210,
        "score": 0.212803
      },
      {
        "frame": 2211,
        "score": 0.208169
      },
      {
        "frame": 2212,
        "score": 0.226931
      },
      {
        "frame": 2213,
        "score": 0.21662
      },
      {
        "frame": 2214,
        "score": 0.190605
      },
      {
        "frame": 2215,
        "score": 0.235644
      },
      {
        "frame": 2216,
        "score": 0.253646
      },
      {
        "frame": 2217,
        "score": 0.216526
      },
      {
        "frame": 2218,
        "score": 0.20038
      },
      {
        "frame": 2219,
        "score": 0.215042
      },
      {
        "frame": 2220,
        "score": 0.224122
      },
      {
        "frame": 2221,
        "score": 0.234547
      },
      {
        "frame": 2222,
        "score": 0.217083
      },
      {
        "frame": 2223,
        "score": 0.238703
      },
      {
        "frame": 2224,
        "score": 0.224762
      },
      {
        "frame": 2225,
        "score": 0.225223
      },
      {
        "frame": 2226,
        "score": 0.247746
      },
      {
        "frame": 2227,
        "score": 0.236793
      },
      {
        "frame": 2228,
        "score": 0.230634
      },
      {
        "frame": 2229,
        "score": 0.227582
      },
      {
        "frame": 2230,
        "score": 0.299669
      },
      {
        "frame": 2231,
        "score": 0.234825
      },
      {
        "frame": 2232,
        "score": 0.199686
      },
      {
        "frame": 2233,
        "score": 0.204534
      },
      {
        "frame": 2234,
        "score": 0.19912
      },
      {
        "frame": 2235,
        "score": 0.214438
      },
      {
        "frame": 2236,
        "score": 0.229657
      },
      {
        "frame": 2237,
        "score": 0.192379
      },
      {
        "frame": 2238,
        "score": 0.202083
      },
      {
        "frame": 2239,
        "score": 0.201344
      },
      {
        "frame": 2240,
        "score": 0.19035
      },
      {
        "frame": 2241,
        "score": 0.198321
      },
      {
        "frame": 2242,
        "score": 0.197986
      },
      {
        "frame": 2243,
        "score": 0.190455
      },
      {
        "frame": 2244,
        "score": 0.206447
      },
      {
        "frame": 2245,
        "score": 0.239844
      },
      {
        "frame": 2246,
        "score": 0.214658
      },
      {
        "frame": 2247,
        "score": 0.223609
      },
      {
        "frame": 2248,
        "score": 0.200769
      },
      {
        "frame": 2249,
        "score": 0.209291
      },
      {
        "frame": 2250,
        "score": 0.209467
      },
      {
        "frame": 2251,
        "score": 0.236529
      },
      {
        "frame": 2252,
        "score": 0.242852
      },
      {
        "frame": 2253,
        "score": 0.246692
      },
      {
        "frame": 2254,
        "score": 0.250163
      },
      {
        "frame": 2255,
        "score": 0.239535
      },
      {
        "frame": 2256,
        "score": 0.188863
      },
      {
        "frame": 2257,
        "score": 0.227938
      },
      {
        "frame": 2258,
        "score": 0.190761
      },
      {
        "frame": 2259,
        "score": 0.22213
      },
      {
        "frame": 2260,
        "score": 0.234125
      },
      {
        "frame": 2261,
        "score": 0.299257
      },
      {
        "frame": 2262,
        "score": 0.237231
      },
      {
        "frame": 2263,
        "score": 0.197851
      },
      {
        "frame": 2264,
        "score": 0.22274
      },
      {
        "frame": 2265,
        "score": 0.195217
      },
      {
        "frame": 2266,
        "score": 0.19605
      },
      {
        "frame": 2267,
        "score": 0.193067
      },
      {
        "frame": 2268,
        "score": 0.201885
      },
      {
        "frame": 2269,
        "score": 0.226573
      },
      {
        "frame": 2270,
        "score": 0.211499
      },
      {
        "frame": 2271,
        "score": 0.205124
      },
      {
        "frame": 2272,
        "score": 0.230136
      },
      {
        "frame": 2273,
        "score": 0.22074
      },
      {
        "frame": 2274,
        "score": 0.249502
      },
      {
        "frame": 2275,
        "score": 0.190666
      },
      {
        "frame": 2276,
        "score": 0.206854
      },
      {
        "frame": 2277,
        "score": 0.246556
      },
      {
        "frame": 2278,
        "score": 0.214724
      },
      {
        "frame": 2279,
        "score": 0.230343
      },
      {
        "frame": 2280,
        "score": 0.233297
      },
      {
        "frame": 2281,
        "score": 0.221901
      },
      {
        "frame": 2282,
        "score": 0.228882
      },
      {
        "frame": 2283,
        "score": 0.239853
      },
      {
        "frame": 2284,
        "score": 0.266402
      },
      {
        "frame": 2285,
        "score": 0.265274
      },
      {
        "frame": 2286,
        "score": 0.256544
      },
      {
        "frame": 2287,
        "score": 0.242739
      },
      {
        "frame": 2288,
        "score": 0.251321
      },
      {
        "frame": 2289,
        "score": 0.250206
      },
      {
        "frame": 2290,
        "score": 0.249714
      },
      {
        "frame": 2291,
        "score": 0.251808
      },
      {
        "frame": 2292,
        "score": 0.258083
      },
      {
        "frame": 2293,
        "score": 0.267812
      },
      {
        "frame": 2294,
        "score": 0.276989
      },
      {
        "frame": 2295,
        "score": 0.268878
      },
      {
        "frame": 2296,
        "score": 0.268357
      },
      {
        "frame": 2297,
        "score": 0.252463
      },
      {
        "frame": 2298,
        "score": 0.269078
      },
      {
        "frame": 2299,
        "score": 0.279521
      },
      {
        "frame": 2300,
        "score": 0.289487
      },
      {
        "frame": 2301,
        "score": 0.286654
      },
      {
        "frame": 2302,
        "score": 0.261255
      },
      {
        "frame": 2303,
        "score": 0.268903
      },
      {
        "frame": 2304,
        "score": 0.291288
      },
      {
        "frame": 2305,
        "score": 0.274824
      },
      {
        "frame": 2306,
        "score": 0.262338
      },
      {
        "frame": 2307,
        "score": 0.273431
      },
      {
        "frame": 2308,
        "score": 0.256539
      },
      {
        "frame": 2309,
        "score": 0.271034
      },
      {
        "frame": 2310,
        "score": 0.260575
      },
      {
        "frame": 2311,
        "score": 0.261814
      },
      {
        "frame": 2312,
        "score": 0.275662
      },
      {
        "frame": 2313,
        "score": 0.259143
      },
      {
        "frame": 2314,
        "score": 0.284974
      },
      {
        "frame": 2315,
        "score": 0.25165
      },
      {
        "frame": 2316,
        "score": 0.246303
      },
      {
        "frame": 2317,
        "score": 0.245324
      },
      {
        "frame": 2318,
        "score": 0.253008
      },
      {
        "frame": 2319,
        "score": 0.264899
      },
      {
        "frame": 2320,
        "score": 0.248311
      },
      {
        "frame": 2321,
        "score": 0.261186
      },
      {
        "frame": 2322,
        "score": 0.243045
      },
      {
        "frame": 2323,
        "score": 0.22515
      },
      {
        "frame": 2324,
        "score": 0.235368
      },
      {
        "frame": 2325,
        "score": 0.231368
      },
      {
        "frame": 2326,
        "score": 0.220112
      },
      {
        "frame": 2327,
        "score": 0.242556
      },
      {
        "frame": 2328,
        "score": 0.268342
      },
      {
        "frame": 2329,
        "score": 0.248621
      },
      {
        "frame": 2330,
        "score": 0.267359
      },
      {
        "frame": 2331,
        "score": 0.255128
      },
      {
        "frame": 2332,
        "score": 0.2475
      },
      {
        "frame": 2333,
        "score": 0.283949
      },
      {
        "frame": 2334,
        "score": 0.29598
      },
      {
        "frame": 2335,
        "score": 0.378779
      },
      {
        "frame": 2336,
        "score": 0.403119
      },
      {
        "frame": 2337,
        "score": 0.416515
      },
      {
        "frame": 2338,
        "score": 0.400714
      },
      {
        "frame": 2339,
        "score": 0.372183
      },
      {
        "frame": 2340,
        "score": 0.399441
      },
      {
        "frame": 2341,
        "score": 0.350099
      },
      {
        "frame": 2342,
        "score": 0.411371
      },
      {
        "frame": 2343,
        "score": 0.378425
      },
      {
        "frame": 2344,
        "score": 0.365322
      },
      {
        "frame": 2345,
        "score": 0.360965
      },
      {
        "frame": 2346,
        "score": 0.352605
      },
      {
        "frame": 2347,
        "score": 0.344823
      },
      {
        "frame": 2348,
        "score": 0.331444
      },
      {
        "frame": 2349,
        "score": 0.301745
      },
      {
        "frame": 2350,
        "score": 0.29935
      },
      {
        "frame": 2351,
        "score": 0.273905
      },
      {
        "frame": 2352,
        "score": 0.249813
      },
      {
        "frame": 2353,
        "score": 0.312127
      },
      {
        "frame": 2354,
        "score": 0.275623
      },
      {
        "frame": 2355,
        "score": 0.24934
      },
      {
        "frame": 2356,
        "score": 0.223746
      },
      {
        "frame": 2357,
        "score": 0.261844
      },
      {
        "frame": 2358,
        "score": 0.279636
      },
      {
        "frame": 2359,
        "score": 0.255044
      },
      {
        "frame": 2360,
        "score": 0.256321
      },
      {
        "frame": 2361,
        "score": 0.236876
      },
      {
        "frame": 2362,
        "score": 0.250685
      },
      {
        "frame": 2363,
        "score": 0.27557
      },
      {
        "frame": 2364,
        "score": 0.251495
      },
      {
        "frame": 2365,
        "score": 0.217718
      },
      {
        "frame": 2366,
        "score": 0.225007
      },
      {
        "frame": 2367,
        "score": 0.269057
      },
      {
        "frame": 2368,
        "score": 0.270822
      },
      {
        "frame": 2369,
        "score": 0.227112
      },
      {
        "frame": 2370,
        "score": 0.224664
      },
      {
        "frame": 2371,
        "score": 0.250354
      },
      {
        "frame": 2372,
        "score": 0.267618
      },
      {
        "frame": 2373,
        "score": 0.257467
      },
      {
        "frame": 2374,
        "score": 0.258903
      },
      {
        "frame": 2375,
        "score": 0.243193
      },
      {
        "frame": 2376,
        "score": 0.268637
      },
      {
        "frame": 2377,
        "score": 0.230595
      },
      {
        "frame": 2378,
        "score": 0.241183
      },
      {
        "frame": 2379,
        "score": 0.250763
      },
      {
        "frame": 2380,
        "score": 0.282681
      },
      {
        "frame": 2381,
        "score": 0.249528
      },
      {
        "frame": 2382,
        "score": 0.293805
      },
      {
        "frame": 2383,
        "score": 0.262905
      },
      {
        "frame": 2384,
        "score": 0.267375
      },
      {
        "frame": 2385,
        "score": 0.264172
      },
      {
        "frame": 2386,
        "score": 0.239717
      },
      {
        "frame": 2387,
        "score": 0.319129
      },
      {
        "frame": 2388,
        "score": 0.287557
      },
      {
        "frame": 2389,
        "score": 0.255026
      },
      {
        "frame": 2390,
        "score": 0.26223
      },
      {
        "frame": 2391,
        "score": 0.29502
      },
      {
        "frame": 2392,
        "score": 0.29037
      },
      {
        "frame": 2393,
        "score": 0.257672
      },
      {
        "frame": 2394,
        "score": 0.24758
      },
      {
        "frame": 2395,
        "score": 0.29579
      },
      {
        "frame": 2396,
        "score": 0.2961
      },
      {
        "frame": 2397,
        "score": 0.277446
      },
      {
        "frame": 2398,
        "score": 0.27781
      },
      {
        "frame": 2399,
        "score": 0.298071
      },
      {
        "frame": 2400,
        "score": 0.290781
      },
      {
        "frame": 2401,
        "score": 0.284002
      },
      {
        "frame": 2402,
        "score": 0.308221
      },
      {
        "frame": 2403,
        "score": 0.333304
      },
      {
        "frame": 2404,
        "score": 0.327946
      },
      {
        "frame": 2405,
        "score": 0.281836
      },
      {
        "frame": 2406,
        "score": 0.286452
      },
      {
        "frame": 2407,
        "score": 0.280662
      },
      {
        "frame": 2408,
        "score": 0.285696
      },
      {
        "frame": 2409,
        "score": 0.275181
      },
      {
        "frame": 2410,
        "score": 0.314226
      },
      {
        "frame": 2411,
        "score": 0.295923
      },
      {
        "frame": 2412,
        "score": 0.260296
      },
      {
        "frame": 2413,
        "score": 0.275457
      },
      {
        "frame": 2414,
        "score": 0.306113
      },
      {
        "frame": 2415,
        "score": 0.281091
      },
      {
        "frame": 2416,
        "score": 0.274863
      },
      {
        "frame": 2417,
        "score": 0.308837
      },
      {
        "frame": 2418,
        "score": 0.258019
      },
      {
        "frame": 2419,
        "score": 0.29006
      },
      {
        "frame": 2420,
        "score": 0.285679
      },
      {
        "frame": 2421,
        "score": 0.305194
      },
      {
        "frame": 2422,
        "score": 0.215287
      },
      {
        "frame": 2423,
        "score": 0.251888
      },
      {
        "frame": 2424,
        "score": 0.257513
      },
      {
        "frame": 2425,
        "score": 0.247705
      },
      {
        "frame": 2426,
        "score": 0.230422
      },
      {
        "frame": 2427,
        "score": 0.247801
      },
      {
        "frame": 2428,
        "score": 0.216185
      },
      {
        "frame": 2429,
        "score": 0.272697
      },
      {
        "frame": 2430,
        "score": 0.208079
      },
      {
        "frame": 2431,
        "score": 0.246992
      },
      {
        "frame": 2432,
        "score": 0.202959
      },
      {
        "frame": 2433,
        "score": 0.237521
      },
      {
        "frame": 2434,
        "score": 0.246865
      },
      {
        "frame": 2435,
        "score": 0.205273
      },
      {
        "frame": 2436,
        "score": 0.196359
      },
      {
        "frame": 2437,
        "score": 0.23596
      },
      {
        "frame": 2438,
        "score": 0.251704
      },
      {
        "frame": 2439,
        "score": 0.205569
      },
      {
        "frame": 2440,
        "score": 0.220998
      },
      {
        "frame": 2441,
        "score": 0.273895
      },
      {
        "frame": 2442,
        "score": 0.267221
      },
      {
        "frame": 2443,
        "score": 0.219998
      },
      {
        "frame": 2444,
        "score": 0.247613
      },
      {
        "frame": 2445,
        "score": 0.260062
      },
      {
        "frame": 2446,
        "score": 0.219593
      },
      {
        "frame": 2447,
        "score": 0.193434
      },
      {
        "frame": 2448,
        "score": 0.185373
      },
      {
        "frame": 2449,
        "score": 0.193729
      },
      {
        "frame": 2450,
        "score": 0.253881
      },
      {
        "frame": 2451,
        "score": 0.21762
      },
      {
        "frame": 2452,
        "score": 0.187227
      },
      {
        "frame": 2453,
        "score": 0.196756
      },
      {
        "frame": 2454,
        "score": 0.1814
      },
      {
        "frame": 2455,
        "score": 0.207519
      },
      {
        "frame": 2456,
        "score": 0.177515
      },
      {
        "frame": 2457,
        "score": 0.183581
      },
      {
        "frame": 2458,
        "score": 0.239631
      },
      {
        "frame": 2459,
        "score": 0.23685
      },
      {
        "frame": 2460,
        "score": 0.251796
      },
      {
        "frame": 2461,
        "score": 0.224494
      },
      {
        "frame": 2462,
        "score": 0.235201
      },
      {
        "frame": 2463,
        "score": 0.182499
      },
      {
        "frame": 2464,
        "score": 0.186481
      },
      {
        "frame": 2465,
        "score": 0.219531
      },
      {
        "frame": 2466,
        "score": 0.195296
      },
      {
        "frame": 2467,
        "score": 0.212539
      },
      {
        "frame": 2468,
        "score": 0.365931
      },
      {
        "frame": 2469,
        "score": 0.416581
      },
      {
        "frame": 2470,
        "score": 0.448452
      },
      {
        "frame": 2471,
        "score": 0.450832
      },
      {
        "frame": 2472,
        "score": 0.495927
      },
      {
        "frame": 2473,
        "score": 0.534239
      },
      {
        "frame": 2474,
        "score": 0.481619
      },
      {
        "frame": 2475,
        "score": 0.479219
      },
      {
        "frame": 2476,
        "score": 0.448193
      },
      {
        "frame": 2477,
        "score": 0.483668
      },
      {
        "frame": 2478,
        "score": 0.462143
      },
      {
        "frame": 2479,
        "score": 0.447459
      },
      {
        "frame": 2480,
        "score": 0.438776
      },
      {
        "frame": 2481,
        "score": 0.277809
      },
      {
        "frame": 2482,
        "score": 0.207746
      },
      {
        "frame": 2483,
        "score": 0.197888
      },
      {
        "frame": 2484,
        "score": 0.181379
      },
      {
        "frame": 2485,
        "score": 0.195317
      },
      {
        "frame": 2486,
        "score": 0.194899
      },
      {
        "frame": 2487,
        "score": 0.194148
      },
      {
        "frame": 2488,
        "score": 0.180804
      },
      {
        "frame": 2489,
        "score": 0.191568
      },
      {
        "frame": 2490,
        "score": 0.212843
      },
      {
        "frame": 2491,
        "score": 0.213
      },
      {
        "frame": 2492,
        "score": 0.18265
      },
      {
        "frame": 2493,
        "score": 0.195614
      },
      {
        "frame": 2494,
        "score": 0.194806
      },
      {
        "frame": 2495,
        "score": 0.219134
      },
      {
        "frame": 2496,
        "score": 0.217506
      },
      {
        "frame": 2497,
        "score": 0.195752
      },
      {
        "frame": 2498,
        "score": 0.213313
      },
      {
        "frame": 2499,
        "score": 0.211994
      },
      {
        "frame": 2500,
        "score": 0.220666
      },
      {
        "frame": 2501,
        "score": 0.218366
      },
      {
        "frame": 2502,
        "score": 0.205697
      },
      {
        "frame": 2503,
        "score": 0.208682
      },
      {
        "frame": 2504,
        "score": 0.238278
      },
      {
        "frame": 2505,
        "score": 0.237669
      },
      {
        "frame": 2506,
        "score": 0.197965
      },
      {
        "frame": 2507,
        "score": 0.201185
      },
      {
        "frame": 2508,
        "score": 0.204514
      },
      {
        "frame": 2509,
        "score": 0.213337
      },
      {
        "frame": 2510,
        "score": 0.239045
      },
      {
        "frame": 2511,
        "score": 0.200633
      },
      {
        "frame": 2512,
        "score": 0.214199
      },
      {
        "frame": 2513,
        "score": 0.207117
      },
      {
        "frame": 2514,
        "score": 0.247614
      },
      {
        "frame": 2515,
        "score": 0.227691
      },
      {
        "frame": 2516,
        "score": 0.244094
      },
      {
        "frame": 2517,
        "score": 0.254736
      },
      {
        "frame": 2518,
        "score": 0.242163
      },
      {
        "frame": 2519,
        "score": 0.220416
      },
      {
        "frame": 2520,
        "score": 0.256448
      },
      {
        "frame": 2521,
        "score": 0.285691
      },
      {
        "frame": 2522,
        "score": 0.287298
      },
      {
        "frame": 2523,
        "score": 0.289184
      },
      {
        "frame": 2524,
        "score": 0.279748
      },
      {
        "frame": 2525,
        "score": 0.282521
      },
      {
        "frame": 2526,
        "score": 0.274875
      },
      {
        "frame": 2527,
        "score": 0.316449
      },
      {
        "frame": 2528,
        "score": 0.275521
      },
      {
        "frame": 2529,
        "score": 0.328907
      },
      {
        "frame": 2530,
        "score": 0.303535
      },
      {
        "frame": 2531,
        "score": 0.302448
      },
      {
        "frame": 2532,
        "score": 0.309011
      },
      {
        "frame": 2533,
        "score": 0.276876
      },
      {
        "frame": 2534,
        "score": 0.284027
      },
      {
        "frame": 2535,
        "score": 0.290231
      },
      {
        "frame": 2536,
        "score": 0.296579
      },
      {
        "frame": 2537,
        "score": 0.26567
      },
      {
        "frame": 2538,
        "score": 0.283096
      },
      {
        "frame": 2539,
        "score": 0.264345
      },
      {
        "frame": 2540,
        "score": 0.256722
      },
      {
        "frame": 2541,
        "score": 0.260338
      },
      {
        "frame": 2542,
        "score": 0.245924
      },
      {
        "frame": 2543,
        "score": 0.252954
      },
      {
        "frame": 2544,
        "score": 0.246924
      },
      {
        "frame": 2545,
        "score": 0.239267
      },
      {
        "frame": 2546,
        "score": 0.239379
      },
      {
        "frame": 2547,
        "score": 0.280052
      },
      {
        "frame": 2548,
        "score": 0.286451
      },
      {
        "frame": 2549,
        "score": 0.298938
      },
      {
        "frame": 2550,
        "score": 0.283682
      },
      {
        "frame": 2551,
        "score": 0.279876
      },
      {
        "frame": 2552,
        "score": 0.255096
      },
      {
        "frame": 2553,
        "score": 0.276324
      },
      {
        "frame": 2554,
        "score": 0.256184
      },
      {
        "frame": 2555,
        "score": 0.255023
      },
      {
        "frame": 2556,
        "score": 0.265657
      },
      {
        "frame": 2557,
        "score": 0.241547
      },
      {
        "frame": 2558,
        "score": 0.236581
      },
      {
        "frame": 2559,
        "score": 0.26105
      },
      {
        "frame": 2560,
        "score": 0.250282
      },
      {
        "frame": 2561,
        "score": 0.234979
      },
      {
        "frame": 2562,
        "score": 0.252937
      },
      {
        "frame": 2563,
        "score": 0.266267
      },
      {
        "frame": 2564,
        "score": 0.252391
      },
      {
        "frame": 2565,
        "score": 0.25227
      },
      {
        "frame": 2566,
        "score": 0.246099
      },
      {
        "frame": 2567,
        "score": 0.256823
      },
      {
        "frame": 2568,
        "score": 0.260909
      },
      {
        "frame": 2569,
        "score": 0.269894
      },
      {
        "frame": 2570,
        "score": 0.263797
      },
      {
        "frame": 2571,
        "score": 0.251483
      },
      {
        "frame": 2572,
        "score": 0.280529
      },
      {
        "frame": 2573,
        "score": 0.27608
      },
      {
        "frame": 2574,
        "score": 0.291239
      },
      {
        "frame": 2575,
        "score": 0.282525
      },
      {
        "frame": 2576,
        "score": 0.265674
      },
      {
        "frame": 2577,
        "score": 0.236359
      },
      {
        "frame": 2578,
        "score": 0.254361
      },
      {
        "frame": 2579,
        "score": 0.258934
      },
      {
        "frame": 2580,
        "score": 0.249272
      },
      {
        "frame": 2581,
        "score": 0.259022
      },
      {
        "frame": 2582,
        "score": 0.247079
      },
      {
        "frame": 2583,
        "score": 0.264449
      },
      {
        "frame": 2584,
        "score": 0.245614
      },
      {
        "frame": 2585,
        "score": 0.266751
      },
      {
        "frame": 2586,
        "score": 0.268175
      },
      {
        "frame": 2587,
        "score": 0.257038
      },
      {
        "frame": 2588,
        "score": 0.289627
      },
      {
        "frame": 2589,
        "score": 0.249405
      },
      {
        "frame": 2590,
        "score": 0.260139
      },
      {
        "frame": 2591,
        "score": 0.273691
      },
      {
        "frame": 2592,
        "score": 0.268376
      },
      {
        "frame": 2593,
        "score": 0.250891
      },
      {
        "frame": 2594,
        "score": 0.22181
      },
      {
        "frame": 2595,
        "score": 0.255229
      },
      {
        "frame": 2596,
        "score": 0.246028
      },
      {
        "frame": 2597,
        "score": 0.231044
      },
      {
        "frame": 2598,
        "score": 0.214378
      },
      {
        "frame": 2599,
        "score": 0.232317
      },
      {
        "frame": 2600,
        "score": 0.226252
      },
      {
        "frame": 2601,
        "score": 0.272773
      },
      {
        "frame": 2602,
        "score": 0.231613
      },
      {
        "frame": 2603,
        "score": 0.212607
      },
      {
        "frame": 2604,
        "score": 0.212521
      },
      {
        "frame": 2605,
        "score": 0.224512
      },
      {
        "frame": 2606,
        "score": 0.258104
      },
      {
        "frame": 2607,
        "score": 0.258303
      },
      {
        "frame": 2608,
        "score": 0.241176
      },
      {
        "frame": 2609,
        "score": 0.226461
      },
      {
        "frame": 2610,
        "score": 0.223421
      },
      {
        "frame": 2611,
        "score": 0.236528
      },
      {
        "frame": 2612,
        "score": 0.243169
      },
      {
        "frame": 2613,
        "score": 0.209531
      },
      {
        "frame": 2614,
        "score": 0.240305
      },
      {
        "frame": 2615,
        "score": 0.211423
      },
      {
        "frame": 2616,
        "score": 0.224046
      },
      {
        "frame": 2617,
        "score": 0.211038
      },
      {
        "frame": 2618,
        "score": 0.243619
      },
      {
        "frame": 2619,
        "score": 0.216695
      },
      {
        "frame": 2620,
        "score": 0.224289
      },
      {
        "frame": 2621,
        "score": 0.209578
      },
      {
        "frame": 2622,
        "score": 0.17741
      },
      {
        "frame": 2623,
        "score": 0.187514
      },
      {
        "frame": 2624,
        "score": 0.236781
      },
      {
        "frame": 2625,
        "score": 0.236858
      },
      {
        "frame": 2626,
        "score": 0.187791
      },
      {
        "frame": 2627,
        "score": 0.230562
      },
      {
        "frame": 2628,
        "score": 0.223782
      },
      {
        "frame": 2629,
        "score": 0.206641
      },
      {
        "frame": 2630,
        "score": 0.237113
      },
      {
        "frame": 2631,
        "score": 0.275818
      },
      {
        "frame": 2632,
        "score": 0.265129
      },
      {
        "frame": 2633,
        "score": 0.217713
      },
      {
        "frame": 2634,
        "score": 0.24351
      },
      {
        "frame": 2635,
        "score": 0.260536
      },
      {
        "frame": 2636,
        "score": 0.269383
      },
      {
        "frame": 2637,
        "score": 0.263856
      },
      {
        "frame": 2638,
        "score": 0.259264
      },
      {
        "frame": 2639,
        "score": 0.25466
      },
      {
        "frame": 2640,
        "score": 0.237272
      },
      {
        "frame": 2641,
        "score": 0.250933
      },
      {
        "frame": 2642,
        "score": 0.24264
      },
      {
        "frame": 2643,
        "score": 0.219782
      },
      {
        "frame": 2644,
        "score": 0.264291
      },
      {
        "frame": 2645,
        "score": 0.240855
      },
      {
        "frame": 2646,
        "score": 0.219844
      },
      {
        "frame": 2647,
        "score": 0.285816
      },
      {
        "frame": 2648,
        "score": 0.266236
      },
      {
        "frame": 2649,
        "score": 0.283481
      },
      {
        "frame": 2650,
        "score": 0.31485
      },
      {
        "frame": 2651,
        "score": 0.266261
      },
      {
        "frame": 2652,
        "score": 0.281058
      },
      {
        "frame": 2653,
        "score": 0.295212
      },
      {
        "frame": 2654,
        "score": 0.288724
      },
      {
        "frame": 2655,
        "score": 0.275556
      },
      {
        "frame": 2656,
        "score": 0.257211
      },
      {
        "frame": 2657,
        "score": 0.268873
      },
      {
        "frame": 2658,
        "score": 0.256643
      },
      {
        "frame": 2659,
        "score": 0.26144
      },
      {
        "frame": 2660,
        "score": 0.264383
      },
      {
        "frame": 2661,
        "score": 0.221723
      },
      {
        "frame": 2662,
        "score": 0.205315
      },
      {
        "frame": 2663,
        "score": 0.214794
      },
      {
        "frame": 2664,
        "score": 0.205098
      },
      {
        "frame": 2665,
        "score": 0.177357
      },
      {
        "frame": 2666,
        "score": 0.185329
      },
      {
        "frame": 2667,
        "score": 0.199904
      },
      {
        "frame": 2668,
        "score": 0.182757
      },
      {
        "frame": 2669,
        "score": 0.186653
      },
      {
        "frame": 2670,
        "score": 0.19192
      },
      {
        "frame": 2671,
        "score": 0.232828
      },
      {
        "frame": 2672,
        "score": 0.199798
      },
      {
        "frame": 2673,
        "score": 0.195914
      },
      {
        "frame": 2674,
        "score": 0.199573
      },
      {
        "frame": 2675,
        "score": 0.170176
      },
      {
        "frame": 2676,
        "score": 0.201095
      },
      {
        "frame": 2677,
        "score": 0.219821
      },
      {
        "frame": 2678,
        "score": 0.192624
      },
      {
        "frame": 2679,
        "score": 0.226344
      },
      {
        "frame": 2680,
        "score": 0.237245
      },
      {
        "frame": 2681,
        "score": 0.198904
      },
      {
        "frame": 2682,
        "score": 0.21003
      },
      {
        "frame": 2683,
        "score": 0.178965
      },
      {
        "frame": 2684,
        "score": 0.17348
      },
      {
        "frame": 2685,
        "score": 0.225528
      },
      {
        "frame": 2686,
        "score": 0.203957
      },
      {
        "frame": 2687,
        "score": 0.190173
      },
      {
        "frame": 2688,
        "score": 0.25069
      },
      {
        "frame": 2689,
        "score": 0.217312
      },
      {
        "frame": 2690,
        "score": 0.199133
      },
      {
        "frame": 2691,
        "score": 0.202713
      },
      {
        "frame": 2692,
        "score": 0.218636
      },
      {
        "frame": 2693,
        "score": 0.235744
      },
      {
        "frame": 2694,
        "score": 0.243093
      },
      {
        "frame": 2695,
        "score": 0.254915
      },
      {
        "frame": 2696,
        "score": 0.299139
      },
      {
        "frame": 2697,
        "score": 0.217623
      },
      {
        "frame": 2698,
        "score": 0.220938
      },
      {
        "frame": 2699,
        "score": 0.209885
      },
      {
        "frame": 2700,
        "score": 0.207877
      },
      {
        "frame": 2701,
        "score": 0.281709
      },
      {
        "frame": 2702,
        "score": 0.213979
      },
      {
        "frame": 2703,
        "score": 0.212417
      },
      {
        "frame": 2704,
        "score": 0.229889
      },
      {
        "frame": 2705,
        "score": 0.189922
      },
      {
        "frame": 2706,
        "score": 0.209574
      },
      {
        "frame": 2707,
        "score": 0.317508
      },
      {
        "frame": 2708,
        "score": 0.213478
      },
      {
        "frame": 2709,
        "score": 0.268253
      },
      {
        "frame": 2710,
        "score": 0.281452
      },
      {
        "frame": 2711,
        "score": 0.216832
      },
      {
        "frame": 2712,
        "score": 0.234933
      },
      {
        "frame": 2713,
        "score": 0.254948
      },
      {
        "frame": 2714,
        "score": 0.222459
      },
      {
        "frame": 2715,
        "score": 0.280881
      },
      {
        "frame": 2716,
        "score": 0.222496
      },
      {
        "frame": 2717,
        "score": 0.203353
      },
      {
        "frame": 2718,
        "score": 0.234982
      },
      {
        "frame": 2719,
        "score": 0.257008
      },
      {
        "frame": 2720,
        "score": 0.21311
      },
      {
        "frame": 2721,
        "score": 0.209546
      },
      {
        "frame": 2722,
        "score": 0.261436
      },
      {
        "frame": 2723,
        "score": 0.246439
      },
      {
        "frame": 2724,
        "score": 0.235433
      },
      {
        "frame": 2725,
        "score": 0.200599
      },
      {
        "frame": 2726,
        "score": 0.205106
      },
      {
        "frame": 2727,
        "score": 0.269338
      },
      {
        "frame": 2728,
        "score": 0.251481
      },
      {
        "frame": 2729,
        "score": 0.210751
      },
      {
        "frame": 2730,
        "score": 0.229615
      },
      {
        "frame": 2731,
        "score": 0.214204
      },
      {
        "frame": 2732,
        "score": 0.194707
      },
      {
        "frame": 2733,
        "score": 0.208903
      },
      {
        "frame": 2734,
        "score": 0.206307
      },
      {
        "frame": 2735,
        "score": 0.1881
      },
      {
        "frame": 2736,
        "score": 0.195083
      },
      {
        "frame": 2737,
        "score": 0.245887
      },
      {
        "frame": 2738,
        "score": 0.217502
      },
      {
        "frame": 2739,
        "score": 0.225643
      },
      {
        "frame": 2740,
        "score": 0.208452
      },
      {
        "frame": 2741,
        "score": 0.207975
      },
      {
        "frame": 2742,
        "score": 0.219327
      },
      {
        "frame": 2743,
        "score": 0.249082
      },
      {
        "frame": 2744,
        "score": 0.229666
      },
      {
        "frame": 2745,
        "score": 0.200837
      },
      {
        "frame": 2746,
        "score": 0.227038
      },
      {
        "frame": 2747,
        "score": 0.207315
      },
      {
        "frame": 2748,
        "score": 0.242395
      },
      {
        "frame": 2749,
        "score": 0.216103
      },
      {
        "frame": 2750,
        "score": 0.229764
      },
      {
        "frame": 2751,
        "score": 0.2394
      },
      {
        "frame": 2752,
        "score": 0.225451
      },
      {
        "frame": 2753,
        "score": 0.193572
      },
      {
        "frame": 2754,
        "score": 0.201334
      },
      {
        "frame": 2755,
        "score": 0.191077
      },
      {
        "frame": 2756,
        "score": 0.210686
      },
      {
        "frame": 2757,
        "score": 0.216193
      },
      {
        "frame": 2758,
        "score": 0.206562
      },
      {
        "frame": 2759,
        "score": 0.216565
      },
      {
        "frame": 2760,
        "score": 0.184321
      },
      {
        "frame": 2761,
        "score": 0.196646
      },
      {
        "frame": 2762,
        "score": 0.201178
      },
      {
        "frame": 2763,
        "score": 0.192141
      },
      {
        "frame": 2764,
        "score": 0.197697
      },
      {
        "frame": 2765,
        "score": 0.196681
      },
      {
        "frame": 2766,
        "score": 0.193357
      },
      {
        "frame": 2767,
        "score": 0.211657
      },
      {
        "frame": 2768,
        "score": 0.203182
      },
      {
        "frame": 2769,
        "score": 0.223779
      },
      {
        "frame": 2770,
        "score": 0.205364
      },
      {
        "frame": 2771,
        "score": 0.207729
      },
      {
        "frame": 2772,
        "score": 0.191043
      },
      {
        "frame": 2773,
        "score": 0.212031
      },
      {
        "frame": 2774,
        "score": 0.205902
      },
      {
        "frame": 2775,
        "score": 0.184484
      },
      {
        "frame": 2776,
        "score": 0.195335
      },
      {
        "frame": 2777,
        "score": 0.196493
      },
      {
        "frame": 2778,
        "score": 0.196737
      },
      {
        "frame": 2779,
        "score": 0.20864
      },
      {
        "frame": 2780,
        "score": 0.22383
      },
      {
        "frame": 2781,
        "score": 0.218167
      },
      {
        "frame": 2782,
        "score": 0.224623
      },
      {
        "frame": 2783,
        "score": 0.22659
      },
      {
        "frame": 2784,
        "score": 0.249871
      },
      {
        "frame": 2785,
        "score": 0.246241
      },
      {
        "frame": 2786,
        "score": 0.24655
      },
      {
        "frame": 2787,
        "score": 0.253389
      },
      {
        "frame": 2788,
        "score": 0.266474
      },
      {
        "frame": 2789,
        "score": 0.272799
      },
      {
        "frame": 2790,
        "score": 0.254884
      },
      {
        "frame": 2791,
        "score": 0.244926
      },
      {
        "frame": 2792,
        "score": 0.231323
      },
      {
        "frame": 2793,
        "score": 0.243471
      },
      {
        "frame": 2794,
        "score": 0.260584
      },
      {
        "frame": 2795,
        "score": 0.253284
      },
      {
        "frame": 2796,
        "score": 0.256981
      },
      {
        "frame": 2797,
        "score": 0.274177
      },
      {
        "frame": 2798,
        "score": 0.262549
      },
      {
        "frame": 2799,
        "score": 0.295483
      },
      {
        "frame": 2800,
        "score": 0.311165
      },
      {
        "frame": 2801,
        "score": 0.30611
      },
      {
        "frame": 2802,
        "score": 0.287443
      },
      {
        "frame": 2803,
        "score": 0.281941
      },
      {
        "frame": 2804,
        "score": 0.294786
      },
      {
        "frame": 2805,
        "score": 0.296315
      },
      {
        "frame": 2806,
        "score": 0.285331
      },
      {
        "frame": 2807,
        "score": 0.274855
      },
      {
        "frame": 2808,
        "score": 0.27745
      },
      {
        "frame": 2809,
        "score": 0.25803
      },
      {
        "frame": 2810,
        "score": 0.286817
      },
      {
        "frame": 2811,
        "score": 0.276812
      },
      {
        "frame": 2812,
        "score": 0.285507
      },
      {
        "frame": 2813,
        "score": 0.284301
      },
      {
        "frame": 2814,
        "score": 0.270456
      },
      {
        "frame": 2815,
        "score": 0.261095
      },
      {
        "frame": 2816,
        "score": 0.258321
      },
      {
        "frame": 2817,
        "score": 0.252121
      },
      {
        "frame": 2818,
        "score": 0.250904
      },
      {
        "frame": 2819,
        "score": 0.253
      },
      {
        "frame": 2820,
        "score": 0.255376
      },
      {
        "frame": 2821,
        "score": 0.228148
      },
      {
        "frame": 2822,
        "score": 0.240507
      },
      {
        "frame": 2823,
        "score": 0.22586
      },
      {
        "frame": 2824,
        "score": 0.236689
      },
      {
        "frame": 2825,
        "score": 0.239226
      },
      {
        "frame": 2826,
        "score": 0.233754
      },
      {
        "frame": 2827,
        "score": 0.277528
      },
      {
        "frame": 2828,
        "score": 0.249741
      },
      {
        "frame": 2829,
        "score": 0.246713
      },
      {
        "frame": 2830,
        "score": 0.281629
      },
      {
        "frame": 2831,
        "score": 0.271307
      },
      {
        "frame": 2832,
        "score": 0.284351
      },
      {
        "frame": 2833,
        "score": 0.332215
      },
      {
        "frame": 2834,
        "score": 0.380729
      },
      {
        "frame": 2835,
        "score": 0.34843
      },
      {
        "frame": 2836,
        "score": 0.407726
      },
      {
        "frame": 2837,
        "score": 0.424471
      },
      {
        "frame": 2838,
        "score": 0.407948
      },
      {
        "frame": 2839,
        "score": 0.403304
      },
      {
        "frame": 2840,
        "score": 0.398185
      },
      {
        "frame": 2841,
        "score": 0.390281
      },
      {
        "frame": 2842,
        "score": 0.382916
      },
      {
        "frame": 2843,
        "score": 0.397289
      },
      {
        "frame": 2844,
        "score": 0.345248
      },
      {
        "frame": 2845,
        "score": 0.377811
      },
      {
        "frame": 2846,
        "score": 0.385131
      },
      {
        "frame": 2847,
        "score": 0.376585
      },
      {
        "frame": 2848,
        "score": 0.335176
      },
      {
        "frame": 2849,
        "score": 0.337534
      },
      {
        "frame": 2850,
        "score": 0.318884
      },
      {
        "frame": 2851,
        "score": 0.35016
      },
      {
        "frame": 2852,
        "score": 0.289805
      },
      {
        "frame": 2853,
        "score": 0.27392
      },
      {
        "frame": 2854,
        "score": 0.261581
      },
      {
        "frame": 2855,
        "score": 0.280145
      },
      {
        "frame": 2856,
        "score": 0.282074
      },
      {
        "frame": 2857,
        "score": 0.265697
      },
      {
        "frame": 2858,
        "score": 0.213683
      },
      {
        "frame": 2859,
        "score": 0.236783
      },
      {
        "frame": 2860,
        "score": 0.221165
      },
      {
        "frame": 2861,
        "score": 0.267426
      },
      {
        "frame": 2862,
        "score": 0.289983
      },
      {
        "frame": 2863,
        "score": 0.260792
      },
      {
        "frame": 2864,
        "score": 0.243835
      },
      {
        "frame": 2865,
        "score": 0.217564
      },
      {
        "frame": 2866,
        "score": 0.266331
      },
      {
        "frame": 2867,
        "score": 0.293031
      },
      {
        "frame": 2868,
        "score": 0.23941
      },
      {
        "frame": 2869,
        "score": 0.211996
      },
      {
        "frame": 2870,
        "score": 0.241523
      },
      {
        "frame": 2871,
        "score": 0.296995
      },
      {
        "frame": 2872,
        "score": 0.281629
      },
      {
        "frame": 2873,
        "score": 0.22778
      },
      {
        "frame": 2874,
        "score": 0.24359
      },
      {
        "frame": 2875,
        "score": 0.248502
      },
      {
        "frame": 2876,
        "score": 0.272007
      },
      {
        "frame": 2877,
        "score": 0.273996
      },
      {
        "frame": 2878,
        "score": 0.26507
      },
      {
        "frame": 2879,
        "score": 0.231119
      },
      {
        "frame": 2880,
        "score": 0.281648
      },
      {
        "frame": 2881,
        "score": 0.261857
      },
      {
        "frame": 2882,
        "score": 0.259306
      },
      {
        "frame": 2883,
        "score": 0.228206
      },
      {
        "frame": 2884,
        "score": 0.2619
      },
      {
        "frame": 2885,
        "score": 0.261302
      },
      {
        "frame": 2886,
        "score": 0.255762
      },
      {
        "frame": 2887,
        "score": 0.248607
      },
      {
        "frame": 2888,
        "score": 0.269896
      },
      {
        "frame": 2889,
        "score": 0.235565
      },
      {
        "frame": 2890,
        "score": 0.273752
      },
      {
        "frame": 2891,
        "score": 0.294934
      },
      {
        "frame": 2892,
        "score": 0.297657
      },
      {
        "frame": 2893,
        "score": 0.249745
      },
      {
        "frame": 2894,
        "score": 0.236095
      },
      {
        "frame": 2895,
        "score": 0.300433
      },
      {
        "frame": 2896,
        "score": 0.323571
      },
      {
        "frame": 2897,
        "score": 0.315349
      },
      {
        "frame": 2898,
        "score": 0.295715
      },
      {
        "frame": 2899,
        "score": 0.309872
      },
      {
        "frame": 2900,
        "score": 0.327842
      },
      {
        "frame": 2901,
        "score": 0.264836
      },
      {
        "frame": 2902,
        "score": 0.290685
      },
      {
        "frame": 2903,
        "score": 0.298896
      },
      {
        "frame": 2904,
        "score": 0.295521
      },
      {
        "frame": 2905,
        "score": 0.269837
      },
      {
        "frame": 2906,
        "score": 0.267545
      },
      {
        "frame": 2907,
        "score": 0.277468
      },
      {
        "frame": 2908,
        "score": 0.290692
      },
      {
        "frame": 2909,
        "score": 0.249092
      },
      {
        "frame": 2910,
        "score": 0.273741
      },
      {
        "frame": 2911,
        "score": 0.277527
      },
      {
        "frame": 2912,
        "score": 0.250207
      },
      {
        "frame": 2913,
        "score": 0.270321
      },
      {
        "frame": 2914,
        "score": 0.309582
      },
      {
        "frame": 2915,
        "score": 0.286051
      },
      {
        "frame": 2916,
        "score": 0.288774
      },
      {
        "frame": 2917,
        "score": 0.277949
      },
      {
        "frame": 2918,
        "score": 0.276379
      },
      {
        "frame": 2919,
        "score": 0.24203
      },
      {
        "frame": 2920,
        "score": 0.255212
      },
      {
        "frame": 2921,
        "score": 0.251809
      },
      {
        "frame": 2922,
        "score": 0.247881
      },
      {
        "frame": 2923,
        "score": 0.243182
      },
      {
        "frame": 2924,
        "score": 0.216127
      },
      {
        "frame": 2925,
        "score": 0.208048
      },
      {
        "frame": 2926,
        "score": 0.235754
      },
      {
        "frame": 2927,
        "score": 0.217965
      },
      {
        "frame": 2928,
        "score": 0.222844
      },
      {
        "frame": 2929,
        "score": 0.192544
      },
      {
        "frame": 2930,
        "score": 0.231111
      },
      {
        "frame": 2931,
        "score": 0.226802
      },
      {
        "frame": 2932,
        "score": 0.212134
      },
      {
        "frame": 2933,
        "score": 0.259303
      },
      {
        "frame": 2934,
        "score": 0.211154
      },
      {
        "frame": 2935,
        "score": 0.201671
      },
      {
        "frame": 2936,
        "score": 0.21585
      },
      {
        "frame": 2937,
        "score": 0.212792
      },
      {
        "frame": 2938,
        "score": 0.219698
      },
      {
        "frame": 2939,
        "score": 0.25413
      },
      {
        "frame": 2940,
        "score": 0.212571
      },
      {
        "frame": 2941,
        "score": 0.351137
      },
      {
        "frame": 2942,
        "score": 0.213902
      },
      {
        "frame": 2943,
        "score": 0.255312
      },
      {
        "frame": 2944,
        "score": 0.223881
      },
      {
        "frame": 2945,
        "score": 0.209036
      },
      {
        "frame": 2946,
        "score": 0.20071
      },
      {
        "frame": 2947,
        "score": 0.239077
      },
      {
        "frame": 2948,
        "score": 0.201776
      },
      {
        "frame": 2949,
        "score": 0.187645
      },
      {
        "frame": 2950,
        "score": 0.282505
      },
      {
        "frame": 2951,
        "score": 0.232236
      },
      {
        "frame": 2952,
        "score": 0.198636
      },
      {
        "frame": 2953,
        "score": 0.190808
      },
      {
        "frame": 2954,
        "score": 0.228982
      },
      {
        "frame": 2955,
        "score": 0.200528
      },
      {
        "frame": 2956,
        "score": 0.204079
      },
      {
        "frame": 2957,
        "score": 0.198129
      },
      {
        "frame": 2958,
        "score": 0.211203
      },
      {
        "frame": 2959,
        "score": 0.218553
      },
      {
        "frame": 2960,
        "score": 0.241993
      },
      {
        "frame": 2961,
        "score": 0.193426
      },
      {
        "frame": 2962,
        "score": 0.245395
      },
      {
        "frame": 2963,
        "score": 0.359306
      },
      {
        "frame": 2964,
        "score": 0.402716
      },
      {
        "frame": 2965,
        "score": 0.409475
      },
      {
        "frame": 2966,
        "score": 0.438663
      },
      {
        "frame": 2967,
        "score": 0.500847
      },
      {
        "frame": 2968,
        "score": 0.485955
      },
      {
        "frame": 2969,
        "score": 0.494333
      },
      {
        "frame": 2970,
        "score": 0.492399
      },
      {
        "frame": 2971,
        "score": 0.490788
      },
      {
        "frame": 2972,
        "score": 0.450017
      },
      {
        "frame": 2973,
        "score": 0.451138
      },
      {
        "frame": 2974,
        "score": 0.446431
      },
      {
        "frame": 2975,
        "score": 0.339439
      },
      {
        "frame": 2976,
        "score": 0.288624
      },
      {
        "frame": 2977,
        "score": 0.292027
      },
      {
        "frame": 2978,
        "score": 0.178896
      },
      {
        "frame": 2979,
        "score": 0.284258
      },
      {
        "frame": 2980,
        "score": 0.257267
      },
      {
        "frame": 2981,
        "score": 0.215014
      },
      {
        "frame": 2982,
        "score": 0.211728
      },
      {
        "frame": 2983,
        "score": 0.206204
      },
      {
        "frame": 2984,
        "score": 0.206547
      },
      {
        "frame": 2985,
        "score": 0.251003
      },
      {
        "frame": 2986,
        "score": 0.218416
      },
      {
        "frame": 2987,
        "score": 0.206078
      },
      {
        "frame": 2988,
        "score": 0.203616
      },
      {
        "frame": 2989,
        "score": 0.217882
      },
      {
        "frame": 2990,
        "score": 0.198053
      },
      {
        "frame": 2991,
        "score": 0.231485
      },
      {
        "frame": 2992,
        "score": 0.190223
      },
      {
        "frame": 2993,
        "score": 0.203061
      },
      {
        "frame": 2994,
        "score": 0.212214
      },
      {
        "frame": 2995,
        "score": 0.234891
      },
      {
        "frame": 2996,
        "score": 0.191429
      },
      {
        "frame": 2997,
        "score": 0.186715
      },
      {
        "frame": 2998,
        "score": 0.202592
      },
      {
        "frame": 2999,
        "score": 0.198619
      },
      {
        "frame": 3000,
        "score": 0.22869
      },
      {
        "frame": 3001,
        "score": 0.200151
      },
      {
        "frame": 3002,
        "score": 0.229533
      },
      {
        "frame": 3003,
        "score": 0.205465
      },
      {
        "frame": 3004,
        "score": 0.218452
      },
      {
        "frame": 3005,
        "score": 0.211595
      },
      {
        "frame": 3006,
        "score": 0.216118
      },
      {
        "frame": 3007,
        "score": 0.248932
      },
      {
        "frame": 3008,
        "score": 0.21624
      },
      {
        "frame": 3009,
        "score": 0.263642
      },
      {
        "frame": 3010,
        "score": 0.262173
      },
      {
        "frame": 3011,
        "score": 0.259473
      },
      {
        "frame": 3012,
        "score": 0.211719
      },
      {
        "frame": 3013,
        "score": 0.234861
      },
      {
        "frame": 3014,
        "score": 0.214293
      },
      {
        "frame": 3015,
        "score": 0.289396
      },
      {
        "frame": 3016,
        "score": 0.267884
      },
      {
        "frame": 3017,
        "score": 0.223857
      },
      {
        "frame": 3018,
        "score": 0.268743
      },
      {
        "frame": 3019,
        "score": 0.209397
      },
      {
        "frame": 3020,
        "score": 0.254667
      },
      {
        "frame": 3021,
        "score": 0.236768
      },
      {
        "frame": 3022,
        "score": 0.259571
      },
      {
        "frame": 3023,
        "score": 0.290158
      },
      {
        "frame": 3024,
        "score": 0.258484
      },
      {
        "frame": 3025,
        "score": 0.293132
      },
      {
        "frame": 3026,
        "score": 0.279393
      },
      {
        "frame": 3027,
        "score": 0.282408
      },
      {
        "frame": 3028,
        "score": 0.284047
      },
      {
        "frame": 3029,
        "score": 0.297712
      },
      {
        "frame": 3030,
        "score": 0.287135
      },
      {
        "frame": 3031,
        "score": 0.29669
      },
      {
        "frame": 3032,
        "score": 0.299952
      },
      {
        "frame": 3033,
        "score": 0.295003
      },
      {
        "frame": 3034,
        "score": 0.293507
      },
      {
        "frame": 3035,
        "score": 0.29834
      },
      {
        "frame": 3036,
        "score": 0.292723
      },
      {
        "frame": 3037,
        "score": 0.286602
      },
      {
        "frame": 3038,
        "score": 0.283743
      },
      {
        "frame": 3039,
        "score": 0.25694
      },
      {
        "frame": 3040,
        "score": 0.261937
      },
      {
        "frame": 3041,
        "score": 0.256854
      },
      {
        "frame": 3042,
        "score": 0.264484
      },
      {
        "frame": 3043,
        "score": 0.266964
      },
      {
        "frame": 3044,
        "score": 0.261291
      },
      {
        "frame": 3045,
        "score": 0.269029
      },
      {
        "frame": 3046,
        "score": 0.276182
      },
      {
        "frame": 3047,
        "score": 0.290676
      },
      {
        "frame": 3048,
        "score": 0.283957
      },
      {
        "frame": 3049,
        "score": 0.312821
      },
      {
        "frame": 3050,
        "score": 0.295103
      },
      {
        "frame": 3051,
        "score": 0.316599
      },
      {
        "frame": 3052,
        "score": 0.287167
      },
      {
        "frame": 3053,
        "score": 0.316898
      },
      {
        "frame": 3054,
        "score": 0.301916
      },
      {
        "frame": 3055,
        "score": 0.303406
      },
      {
        "frame": 3056,
        "score": 0.311261
      },
      {
        "frame": 3057,
        "score": 0.281629
      },
      {
        "frame": 3058,
        "score": 0.286198
      },
      {
        "frame": 3059,
        "score": 0.280041
      },
      {
        "frame": 3060,
        "score": 0.279601
      },
      {
        "frame": 3061,
        "score": 0.283084
      },
      {
        "frame": 3062,
        "score": 0.292778
      },
      {
        "frame": 3063,
        "score": 0.286533
      },
      {
        "frame": 3064,
        "score": 0.278236
      },
      {
        "frame": 3065,
        "score": 0.27335
      },
      {
        "frame": 3066,
        "score": 0.259215
      },
      {
        "frame": 3067,
        "score": 0.260322
      },
      {
        "frame": 3068,
        "score": 0.251235
      },
      {
        "frame": 3069,
        "score": 0.244094
      },
      {
        "frame": 3070,
        "score": 0.253662
      },
      {
        "frame": 3071,
        "score": 0.251453
      },
      {
        "frame": 3072,
        "score": 0.281754
      },
      {
        "frame": 3073,
        "score": 0.294955
      },
      {
        "frame": 3074,
        "score": 0.246033
      },
      {
        "frame": 3075,
        "score": 0.270313
      },
      {
        "frame": 3076,
        "score": 0.282498
      },
      {
        "frame": 3077,
        "score": 0.267062
      },
      {
        "frame": 3078,
        "score": 0.267918
      },
      {
        "frame": 3079,
        "score": 0.255909
      },
      {
        "frame": 3080,
        "score": 0.279619
      },
      {
        "frame": 3081,
        "score": 0.289489
      },
      {
        "frame": 3082,
        "score": 0.288436
      },
      {
        "frame": 3083,
        "score": 0.248721
      },
      {
        "frame": 3084,
        "score": 0.244841
      },
      {
        "frame": 3085,
        "score": 0.270536
      },
      {
        "frame": 3086,
        "score": 0.259883
      },
      {
        "frame": 3087,
        "score": 0.296259
      },
      {
        "frame": 3088,
        "score": 0.266638
      },
      {
        "frame": 3089,
        "score": 0.276279
      },
      {
        "frame": 3090,
        "score": 0.212229
      },
      {
        "frame": 3091,
        "score": 0.256513
      },
      {
        "frame": 3092,
        "score": 0.229758
      },
      {
        "frame": 3093,
        "score": 0.247567
      },
      {
        "frame": 3094,
        "score": 0.240394
      },
      {
        "frame": 3095,
        "score": 0.238938
      },
      {
        "frame": 3096,
        "score": 0.259686
      },
      {
        "frame": 3097,
        "score": 0.243667
      },
      {
        "frame": 3098,
        "score": 0.222681
      },
      {
        "frame": 3099,
        "score": 0.242036
      },
      {
        "frame": 3100,
        "score": 0.226221
      },
      {
        "frame": 3101,
        "score": 0.282836
      },
      {
        "frame": 3102,
        "score": 0.236832
      },
      {
        "frame": 3103,
        "score": 0.251377
      },
      {
        "frame": 3104,
        "score": 0.224456
      },
      {
        "frame": 3105,
        "score": 0.252644
      },
      {
        "frame": 3106,
        "score": 0.263336
      },
      {
        "frame": 3107,
        "score": 0.241555
      },
      {
        "frame": 3108,
        "score": 0.253589
      },
      {
        "frame": 3109,
        "score": 0.208614
      },
      {
        "frame": 3110,
        "score": 0.198575
      },
      {
        "frame": 3111,
        "score": 0.244654
      },
      {
        "frame": 3112,
        "score": 0.247529
      },
      {
        "frame": 3113,
        "score": 0.248085
      },
      {
        "frame": 3114,
        "score": 0.209919
      },
      {
        "frame": 3115,
        "score": 0.204805
      },
      {
        "frame": 3116,
        "score": 0.239522
      },
      {
        "frame": 3117,
        "score": 0.210437
      },
      {
        "frame": 3118,
        "score": 0.199057
      },
      {
        "frame": 3119,
        "score": 0.219764
      },
      {
        "frame": 3120,
        "score": 0.253176
      },
      {
        "frame": 3121,
        "score": 0.200304
      },
      {
        "frame": 3122,
        "score": 0.193597
      },
      {
        "frame": 3123,
        "score": 0.280841
      },
      {
        "frame": 3124,
        "score": 0.259567
      },
      {
        "frame": 3125,
        "score": 0.186107
      },
      {
        "frame": 3126,
        "score": 0.179481
      },
      {
        "frame": 3127,
        "score": 0.281899
      },
      {
        "frame": 3128,
        "score": 0.223733
      },
      {
        "frame": 3129,
        "score": 0.215352
      },
      {
        "frame": 3130,
        "score": 0.230633
      },
      {
        "frame": 3131,
        "score": 0.238963
      },
      {
        "frame": 3132,
        "score": 0.259545
      },
      {
        "frame": 3133,
        "score": 0.258488
      },
      {
        "frame": 3134,
        "score": 0.228834
      },
      {
        "frame": 3135,
        "score": 0.218175
      },
      {
        "frame": 3136,
        "score": 0.264759
      },
      {
        "frame": 3137,
        "score": 0.256449
      },
      {
        "frame": 3138,
        "score": 0.22091
      },
      {
        "frame": 3139,
        "score": 0.246671
      },
      {
        "frame": 3140,
        "score": 0.249796
      },
      {
        "frame": 3141,
        "score": 0.215438
      },
      {
        "frame": 3142,
        "score": 0.261663
      },
      {
        "frame": 3143,
        "score": 0.256347
      },
      {
        "frame": 3144,
        "score": 0.231931
      },
      {
        "frame": 3145,
        "score": 0.276771
      },
      {
        "frame": 3146,
        "score": 0.264442
      },
      {
        "frame": 3147,
        "score": 0.252438
      },
      {
        "frame": 3148,
        "score": 0.288139
      },
      {
        "frame": 3149,
        "score": 0.29024
      },
      {
        "frame": 3150,
        "score": 0.251114
      },
      {
        "frame": 3151,
        "score": 0.265938
      },
      {
        "frame": 3152,
        "score": 0.262244
      },
      {
        "frame": 3153,
        "score": 0.276173
      },
      {
        "frame": 3154,
        "score": 0.253651
      },
      {
        "frame": 3155,
        "score": 0.259161
      },
      {
        "frame": 3156,
        "score": 0.293861
      },
      {
        "frame": 3157,
        "score": 0.267364
      },
      {
        "frame": 3158,
        "score": 0.244562
      },
      {
        "frame": 3159,
        "score": 0.278491
      },
      {
        "frame": 3160,
        "score": 0.306599
      },
      {
        "frame": 3161,
        "score": 0.280703
      },
      {
        "frame": 3162,
        "score": 0.272154
      },
      {
        "frame": 3163,
        "score": 0.391167
      },
      {
        "frame": 3164,
        "score": 0.332398
      },
      {
        "frame": 3165,
        "score": 0.322273
      },
      {
        "frame": 3166,
        "score": 0.282147
      },
      {
        "frame": 3167,
        "score": 0.335697
      },
      {
        "frame": 3168,
        "score": 0.272385
      },
      {
        "frame": 3169,
        "score": 0.276188
      },
      {
        "frame": 3170,
        "score": 0.200523
      },
      {
        "frame": 3171,
        "score": 0.20889
      },
      {
        "frame": 3172,
        "score": 0.202285
      },
      {
        "frame": 3173,
        "score": 0.204247
      },
      {
        "frame": 3174,
        "score": 0.198811
      },
      {
        "frame": 3175,
        "score": 0.187167
      },
      {
        "frame": 3176,
        "score": 0.179094
      },
      {
        "frame": 3177,
        "score": 0.235252
      },
      {
        "frame": 3178,
        "score": 0.230811
      },
      {
        "frame": 3179,
        "score": 0.174572
      },
      {
        "frame": 3180,
        "score": 0.213983
      },
      {
        "frame": 3181,
        "score": 0.194321
      },
      {
        "frame": 3182,
        "score": 0.185965
      },
      {
        "frame": 3183,
        "score": 0.193136
      },
      {
        "frame": 3184,
        "score": 0.190239
      },
      {
        "frame": 3185,
        "score": 0.223517
      },
      {
        "frame": 3186,
        "score": 0.191609
      },
      {
        "frame": 3187,
        "score": 0.193614
      },
      {
        "frame": 3188,
        "score": 0.209802
      },
      {
        "frame": 3189,
        "score": 0.19973
      },
      {
        "frame": 3190,
        "score": 0.239036
      },
      {
        "frame": 3191,
        "score": 0.256335
      },
      {
        "frame": 3192,
        "score": 0.24972
      },
      {
        "frame": 3193,
        "score": 0.237639
      },
      {
        "frame": 3194,
        "score": 0.230489
      },
      {
        "frame": 3195,
        "score": 0.2177
      },
      {
        "frame": 3196,
        "score": 0.20853
      },
      {
        "frame": 3197,
        "score": 0.239829
      },
      {
        "frame": 3198,
        "score": 0.229507
      },
      {
        "frame": 3199,
        "score": 0.220422
      },
      {
        "frame": 3200,
        "score": 0.207519
      },
      {
        "frame": 3201,
        "score": 0.220097
      },
      {
        "frame": 3202,
        "score": 0.214368
      },
      {
        "frame": 3203,
        "score": 0.216311
      },
      {
        "frame": 3204,
        "score": 0.206027
      }
    ],
    "chartAggregation": {
      "kind": "none",
      "groupSize": 1,
      "description": "원본 시연 manifest의 2,884개 사진 점수를 생략 없이 표시합니다."
    },
    "reviewFrames": [
      1506,
      2473,
      538,
      1984,
      1026,
      2967,
      405,
      1380
    ],
    "unspacedTopFrames": [
      1506,
      2473,
      538,
      1984,
      1509,
      1026,
      536,
      1986
    ],
    "note": "검수 요청은 점수 순위와 최소 16프레임 간격으로 정합니다. 외관 변화 경보 여부나 경보선 초과 여부만으로 요청을 제한하지 않습니다.",
    "sources": [
      "web/unlabeled-demo/manifest.json"
    ],
    "source": "web/unlabeled-demo/manifest.json · same full score trace and queues used by original demo"
  },
  "metrics": {
    "scope": "최종 16개 녹화의 순차 검수 실험",
    "runs": 16,
    "normalStopRuns": 12,
    "expandedRuns": 4,
    "fixedEightRequests": 128,
    "sequentialRequests": 56,
    "requestsSaved": 72,
    "requestReductionPercent": 56.25,
    "newDefectEpisodes": 90,
    "episodesFoundFixedEight": 26,
    "episodesFoundSequential": 26,
    "macroEpisodeCoverage": 0.7108036890645586,
    "note": "전체 사건 90건 중 26건을 요청 사진에서 확인했습니다. 이 수치는 전체 사진의 결함 탐지율이나 정상 2건 확인의 안전성 보장이 아닙니다. 두 대표 사례의 합산 결과도 아닙니다.",
    "source": "experiments/unsupervised/results/sequential_review_final.json"
  },
  "updateEvaluation": {
    "scope": "별도로 구분한 15개 녹화의 후속 구간 평가",
    "runs": 15,
    "reviewBudgetPerRun": 8,
    "activeReference": "frozen-source",
    "candidate": "reviewed-normal-patch-addition",
    "decision": "keep-source",
    "modelWeightsUpdated": false,
    "metrics": [
      {
        "id": "normal-alerts",
        "label": "정상 사진에 낸 오경보",
        "unit": "장",
        "before": 1050,
        "after": 0,
        "total": 20273
      },
      {
        "id": "defect-frames",
        "label": "경보를 낸 실제 결함 사진",
        "unit": "장",
        "before": 202,
        "after": 153,
        "total": 642
      },
      {
        "id": "defect-episodes",
        "label": "경보로 찾은 신규 결함 사건",
        "unit": "건",
        "before": 48,
        "after": 40,
        "total": 65
      }
    ],
    "note": "위 2건 우선 검수 시연과 구분되는 8건 고정 검수 실험입니다. 확인된 정상 특징으로 후보 기준을 실제 구성했지만, 후속 결함 탐지가 감소해 기존 기준을 유지했습니다.",
    "source": "experiments/unsupervised/FEEDBACK_VALIDATION_RESULTS.md"
  }
};
