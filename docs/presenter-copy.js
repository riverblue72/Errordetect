/* Presentation narration only. Speaker notes live in notes/presenter_notes.json. */
(() => {
  "use strict";
  const copy = {
  "ko": [
    {
      "view": "overview",
      "label": "전체 흐름",
      "scope": "HUMAN-IN-THE-LOOP · AI 분석 → 검수 → 기준 후보 검증",
      "narration": "현장 검수를 지원하는 산업용 AI 품질 관리 파이프라인입니다. 사진별 이상 분석과 구간 외관 변화는 독립적으로 진행됩니다. AI가 검수할 사진의 우선순위를 제시하고, 사람이 확인합니다. 흐름도의 마지막 단계에서는 검수 결과 기반 기준 후보를 만들고 후속 데이터에서 검증합니다. 오경보와 결함 탐지를 함께 비교해 적용하거나 보류합니다.",
      "durationMs": 24000,
      "ticks": 2,
      "delay": 12000
    },
    {
      "view": "data",
      "label": "데이터·기준",
      "scope": "DATA & REFERENCE · 고정된 DINOv2와 PCA 기반 선별",
      "narration": "TSFabrics는 스물두 개 녹화, 구만 삼천백아흔여섯 장입니다. 초기 오백열두 장의 코사인 유사도 기반 이례성 점수를 계산하고, 전체 이미지 특징을 PCA 첫 주성분의 사분위수로 네 그룹으로 나눕니다. 그룹별 이례성 하위 육십 퍼센트인 삼백여덟 장에서 칠천삼백아흔두 개 기준 특징을 구성합니다. DINOv2는 재학습하지 않습니다.",
      "durationMs": 31000,
      "ticks": 2,
      "delay": 15500
    },
    {
      "view": "compare",
      "label": "이상 위치·성능",
      "scope": "ANOMALY DETECTION · 결함 포함 4개 Run의 Macro 평균",
      "narration": "같은 사진의 수작업 특징과 DINOv2 히트맵을 비교합니다. 결함 포함 네 개 Run의 매크로 평균에서 AUROC는 영 점 팔팔사에서 영 점 구육오로, AP는 육십육 점 사 퍼센트에서 팔십오 점 사 퍼센트로 바뀌었습니다. AUROC는 정상과 결함의 점수 구분 능력입니다. 현재 경보선 영 점 사칠공팔은 사진 점수를 경보로 바꾸는 기준입니다.",
      "durationMs": 32000,
      "ticks": 2,
      "delay": 16000
    },
    {
      "view": "shift",
      "label": "외관 변화",
      "scope": "VISUAL SHIFT · 생산 조건·외관 변화의 확인 신호",
      "narration": "소재나 조명, 촬영 조건이 바뀌면 정상 사진도 기존 기준과 달라질 수 있습니다. 백스물여덟 장의 창을 서른두 장씩 옮기며 MMD를 비교하고, 세 번 연속 경보선을 넘으면 담당자 확인 신호를 냅니다. 열여섯 전환 중 열다섯 개를 감지했고, 신호 시점의 중앙값은 새 녹화 아흔여섯 번째 프레임입니다. 이 신호가 자동 정상 판정이나 기존 결함 경보 취소를 뜻하지는 않습니다.",
      "durationMs": 25000,
      "ticks": 5,
      "delay": 5000
    },
    {
      "view": "interval",
      "label": "구간 요약",
      "scope": "INTERVAL REVIEW · 2,884장 → 검수 후보 8장",
      "narration": "AI가 이천팔백팔십사 장에서 여덟 장의 검수 우선순위를 정합니다. 하나의 결함이 여러 연속 사진에 나타날 수 있어, 같은 결함을 반복 검수하지 않도록 시간적으로 분산된 사진을 고릅니다. 단순 상위 여덟 장과 열여섯 프레임 간격을 비교하면, 같은 검수 예산에서 새 결함 사건 발견이 열다섯 건에서 스물여섯 건으로 늘었습니다.",
      "durationMs": 26000,
      "ticks": 1,
      "delay": 26000
    },
    {
      "view": "inspect",
      "label": "사람의 검수",
      "scope": "HUMAN REVIEW · 확인·기록과 검수 요청 감소",
      "narration": "먼저 두 장을 확인하고 필요하면 총 여덟 장까지 검수하며 결과를 기록합니다. 두 장이 정상이면 추가 요청을 끝낼 뿐, 구간 전체를 정상으로 판정하지는 않습니다. 이번 평가에서 검수 요청은 백스물여덟 건에서 쉰여섯 건으로, 오십육 점 삼 퍼센트 줄었고 발견한 새 결함 사건 스물여섯 건은 유지됐습니다. 공개 데이터의 정답으로 검수를 재현한 결과입니다. 확인된 결과는 향후 기준 후보 검증의 근거가 될 수 있습니다.",
      "durationMs": 38000,
      "ticks": 20,
      "delay": 1900
    },
    {
      "view": "candidate",
      "label": "기준 갱신 후보 검증",
      "scope": "REFERENCE VALIDATION · 후보 생성 → 후속 검증 → 적용 또는 보류",
      "narration": "기존 기준을 보존하고, 검수된 정상 특징을 복사본에 추가해 후보를 만듭니다. 별도 열다섯 Run의 후속 검증에서 정상 사진 오경보는 천오십 장에서 영 장으로 줄었습니다. 하지만 실제 결함 사진 경보는 이백이 장에서 백쉰세 장으로, 서로 다른 신규 결함 사건 경보는 마흔여덟 건에서 마흔 건으로 줄었습니다. 후보 적용을 보류하고 기존 기준을 유지합니다. 데이터 축적이 성능 향상을 보장하지 않으므로 검증 후 판단합니다.",
      "durationMs": 38000,
      "ticks": 1,
      "delay": 38000
    },
    {
      "view": "results",
      "label": "최종 결과",
      "scope": "RESULTS · 검수 효율 + AI 성능 + 검증된 기준 관리",
      "narration": "두 가지 산업적 강점입니다. 이상 영역과 외관 변화를 분석해 확인할 곳을 제시하고, 두 장부터 필요한 만큼 검수해 요청을 백스물여덟 건에서 쉰여섯 건으로 줄였습니다. 사람이 정상으로 확인한 특징은 기준 후보를 만들고 후속 데이터에서 검증하는 데 활용합니다. 이번 후보는 결함 탐지도 줄어 적용을 보류했습니다. 공개 정답으로 검수를 재현한 오프라인 실험입니다.",
      "durationMs": 26000,
      "ticks": 4,
      "delay": 6500
    }
  ],
  "en": [
    {
      "view": "overview",
      "label": "Overview",
      "scope": "HUMAN-IN-THE-LOOP · AI analysis → review → reference validation",
      "narration": "This industrial human-in-the-loop pipeline supports field inspection and decisions. Photo-level anomalies and visual shift are analyzed independently. AI prioritizes photos for human review. The final stage uses review results to form a reference candidate, validates it on later data, and considers adoption or hold by comparing false alarms and defect detection.",
      "durationMs": 24000,
      "ticks": 2,
      "delay": 12000
    },
    {
      "view": "data",
      "label": "Data & reference",
      "scope": "DATA & REFERENCE · Frozen DINOv2 and PCA-based selection",
      "narration": "TSFabrics contains 22 recordings and 93,196 photos. Compute cosine-similarity-based unusualness scores for the first 512 photos. Project global DINOv2 features onto the first PCA component and use quartiles to form four groups. Retain the lowest-scoring 60 percent in each group: 308 photos providing 7,392 reference patch features. DINOv2 remains a frozen feature extractor.",
      "durationMs": 31000,
      "ticks": 2,
      "delay": 15500
    },
    {
      "view": "compare",
      "label": "Anomaly detection",
      "scope": "ANOMALY DETECTION · Macro means over 4 defect-containing runs",
      "narration": "Compare handcrafted and DINOv2 heatmaps on the same photo. Macro means across four defect-containing runs change from 0.884 to 0.965 AUROC and from 66.4 to 85.4 percent AP. AUROC measures discrimination between normal and defect scores. The current 0.4708 limit turns photo scores into alerts.",
      "durationMs": 32000,
      "ticks": 2,
      "delay": 16000
    },
    {
      "view": "shift",
      "label": "Visual shift",
      "scope": "VISUAL SHIFT · Operator confirmation of production or appearance changes",
      "narration": "Material, lighting or camera changes can make normal photos differ from the reference. Compare MMD in a 128-photo window every 32 frames. Three consecutive limit exceedances signal operator confirmation. Fifteen of sixteen transitions were detected, with a median signal at frame 96 of the new recording. This independent signal neither automatically labels photos as normal nor cancels existing defect alerts.",
      "durationMs": 25000,
      "ticks": 5,
      "delay": 5000
    },
    {
      "view": "interval",
      "label": "Interval review",
      "scope": "INTERVAL REVIEW · 2,884 photos → 8 review candidates",
      "narration": "AI prioritizes eight review candidates from 2,884 photos. One defect can appear in several consecutive photos, so spread the selections over time to avoid reviewing the same defect repeatedly. Compare the eight highest scores with eight photos at least 16 frames apart. Under the same review budget, new defect episodes found increase from 15 to 26.",
      "durationMs": 26000,
      "ticks": 1,
      "delay": 26000
    },
    {
      "view": "inspect",
      "label": "Human review",
      "scope": "HUMAN REVIEW · Confirm, record and reduce requests",
      "narration": "Start with two checks, expanding to eight when needed, and record the results. Two normal checks end further requests; they do not classify the entire interval as normal. In this evaluation, requests fall from 128 to 56, a 56.3 percent reduction, while 26 newly found episodes are retained. This replays public dataset labels, not actual worker records. Confirmed results can support future reference-candidate validation.",
      "durationMs": 38000,
      "ticks": 20,
      "delay": 1900
    },
    {
      "view": "candidate",
      "label": "Reference validation",
      "scope": "REFERENCE VALIDATION · Build → validate → adopt or hold",
      "narration": "Preserve the current reference and add reviewed normal features to a copy. In a separate 15-run follow-up validation, false alarms on normal photos fall from 1,050 to zero. However, alerts on actual defect photos fall from 202 to 153, and alerts on distinct new defect episodes from 48 to 40. Hold the candidate and retain the current reference. More data do not guarantee improvement: validate before deciding whether to adopt.",
      "durationMs": 38000,
      "ticks": 1,
      "delay": 38000
    },
    {
      "view": "results",
      "label": "Results",
      "scope": "RESULTS · Review efficiency + AI performance + reference management",
      "narration": "Two industrial strengths connect analysis to decisions. Anomaly and shift signals guide attention; two-first review reduces requests from 128 to 56 while retaining 26 newly found episodes. Human-confirmed normal features support reference candidates validated on later data. This candidate was held because defect detection also fell. These are offline experiments replaying public ground truth, not automatic reference updates.",
      "durationMs": 26000,
      "ticks": 4,
      "delay": 6500
    }
  ],
  "durationMs": 240000,
  "evidence": {
    "scoreComparison": "experiments/unsupervised/results/unlabeled_review_final.json",
    "sequentialReview": "experiments/unsupervised/results/sequential_review_final.json",
    "referenceValidation": "experiments/unsupervised/FEEDBACK_VALIDATION_RESULTS.md"
  }
};
  for (const language of ["ko", "en"]) {
    copy[language] = Object.freeze(copy[language].map(chapter => Object.freeze(chapter)));
  }
  copy.evidence = Object.freeze(copy.evidence);
  window.SURFACETRACE_PRESENTER_COPY = Object.freeze(copy);
})();
