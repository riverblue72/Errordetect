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
      "narration": "공개 TSFabrics의 스물두 개 녹화, 구만 삼천백구십육 장을 사용했습니다. 초기 오백십이 장의 DINOv2 전체 이미지 특징을 PCA 첫 번째 주성분에 투영하고 사분위수로 네 그룹을 만듭니다. 그룹마다 코사인 유사도 기반 이례성 점수가 낮은 육십 퍼센트를 선별해 삼백팔 장을 남깁니다. 사진당 스물네 패치, 총 칠천삼백구십이 개가 비교 기준입니다. DINOv2 가중치는 재학습하지 않았습니다.",
      "durationMs": 31000,
      "ticks": 2,
      "delay": 15500
    },
    {
      "view": "compare",
      "label": "이상 위치·성능",
      "scope": "ANOMALY DETECTION · 결함 포함 4개 Run의 Macro 평균",
      "narration": "같은 사진의 수작업 특징과 DINOv2 히트맵을 비교합니다. 결함이 포함된 네 개 Run의 매크로 평균에서 AUROC는 영 점 팔팔사에서 영 점 구육오로, AP는 육십육 점 사 퍼센트에서 팔십오 점 사 퍼센트로 바뀌었습니다. AUROC는 정상과 결함의 점수 구분 능력이며, 결함 검출률이 아닙니다. 현재 경보선 영 점 사칠공팔은 사진 점수를 경보로 바꾸는 기준입니다.",
      "durationMs": 32000,
      "ticks": 2,
      "delay": 16000
    },
    {
      "view": "shift",
      "label": "외관 변화",
      "scope": "VISUAL SHIFT · 생산 조건·외관 변화의 확인 신호",
      "narration": "외관 변화는 개별 사진의 결함 탐지와 독립된 신호입니다. 백스물여덟 장의 창을 서른두 장씩 옮기며 비교하고, 세 번 연속 경보선을 넘을 때 확인 신호를 냅니다. 사진의 시간순 변화를 보면서 소재나 촬영 조건이 달라졌는지 담당자가 확인합니다. 변화 신호만으로 공정 이상을 확정하거나 사진의 결함 경보를 해제하지 않습니다.",
      "durationMs": 25000,
      "ticks": 5,
      "delay": 5000
    },
    {
      "view": "interval",
      "label": "구간 요약",
      "scope": "INTERVAL REVIEW · 2,884장 → 검수 후보 8장",
      "narration": "모든 사진을 사람이 다 보지 않고, AI가 검수 우선순위를 정합니다. 이 구간의 이천팔백팔십사 장을 여덟 장의 검수 후보로 요약합니다. 단순히 점수 상위 여덟 장을 고른 경우와 열여섯 프레임 간격을 둔 경우를 비교합니다. 동일한 검수 예산에서 새 결함 사건 발견은 열다섯 건에서 스물여섯 건으로 늘었습니다.",
      "durationMs": 26000,
      "ticks": 1,
      "delay": 26000
    },
    {
      "view": "inspect",
      "label": "사람의 검수",
      "scope": "HUMAN REVIEW · 확인·기록과 검수 요청 감소",
      "narration": "먼저 두 건을 확인하고 필요하면 총 여덟 건까지 검수합니다. 버튼을 누르면 확인 결과가 기록됩니다. 이번 순차 검수 평가에서는 요청이 백스물여덟 건에서 쉰여섯 건으로 줄어 오십육 점 삼 퍼센트 감소했고, 발견한 새 결함 사건은 스물여섯 건으로 유지됐습니다. 실제 작업자 기록이 아니라 공개 데이터의 정답으로 검수를 재현한 결과입니다. 사람이 확인한 결과는 향후 기준 후보 검증의 근거가 될 수 있습니다.",
      "durationMs": 38000,
      "ticks": 20,
      "delay": 1900
    },
    {
      "view": "candidate",
      "label": "기준 갱신 후보 검증",
      "scope": "REFERENCE VALIDATION · 후보 생성 → 후속 검증 → 적용 또는 보류",
      "narration": "품질 관리의 핵심은 새 기준을 검증한 뒤 변경하는 것입니다. 기존 기준을 보존하고 검수된 정상 특징으로 후보를 만듭니다. 별도의 열다섯 Run 후속 평가에서 정상 오경보는 천오십 장에서 영 장으로 줄었지만, 결함 사진 탐지는 이백이 장에서 백쉰세 장으로, 새 결함 사건 탐지는 마흔여덟 건에서 마흔 건으로 줄었습니다. 따라서 후보 적용은 보류하고 기존 기준을 유지합니다. 자동 승인이나 모델 재학습을 구현한 것은 아닙니다.",
      "durationMs": 38000,
      "ticks": 1,
      "delay": 38000
    },
    {
      "view": "results",
      "label": "최종 결과",
      "scope": "RESULTS · 검수 효율 + AI 성능 + 검증된 기준 관리",
      "narration": "검수 효율과 AUROC, AP를 함께 봅니다. 같은 예산에서 발견한 신규 사건은 스물두 건에서 스물여섯 건으로 늘었습니다. AI가 이상을 분석하고, 사람이 검수하며, 검수 결과를 바탕으로 기준 후보를 검증하는 품질 관리 파이프라인입니다.",
      "durationMs": 26000,
      "ticks": 2,
      "delay": 13000
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
      "narration": "TSFabrics contains 22 recorded runs and 93,196 photos. Project the first 512 photos' global DINOv2 features onto the first PCA component. Quartiles define four groups. Within each group, select the 60 percent with the lowest cosine-similarity-based unusualness scores. This leaves 308 photos. Twenty-four patch features per photo produce 7,392 reference features. DINOv2 weights are not retrained.",
      "durationMs": 31000,
      "ticks": 2,
      "delay": 15500
    },
    {
      "view": "compare",
      "label": "Anomaly detection",
      "scope": "ANOMALY DETECTION · Macro means over 4 defect-containing runs",
      "narration": "Compare handcrafted and DINOv2 heatmaps on the same photo. Across four defect-containing runs, macro AUROC changes from 0.884 to 0.965, and Average Precision from 66.4 to 85.4 percent. Both metrics use the same four-run scope. AUROC measures discrimination between normal and defect scores, not the defect detection rate. The current 0.4708 limit turns photo scores into alerts.",
      "durationMs": 32000,
      "ticks": 2,
      "delay": 16000
    },
    {
      "view": "shift",
      "label": "Visual shift",
      "scope": "VISUAL SHIFT · Operator confirmation of production or appearance changes",
      "narration": "Visual shift is independent of individual defect detection. Compare a 128-photo window every 32 frames, requiring three consecutive threshold exceedances. The time-ordered photos help an operator check for material or imaging-condition changes. This signal does not confirm a process fault by itself, or cancel photo-level anomaly alerts.",
      "durationMs": 25000,
      "ticks": 5,
      "delay": 5000
    },
    {
      "view": "interval",
      "label": "Interval review",
      "scope": "INTERVAL REVIEW · 2,884 photos → 8 review candidates",
      "narration": "People do not inspect every photo: AI sets review priorities. Summarize this interval's 2,884 photos as eight candidates. Compare the eight highest-scoring photos with eight selected at least 16 frames apart. Under the same review budget, new defect episodes found increase from 15 to 26. This comparison concerns candidate selection, not a change in model weights.",
      "durationMs": 26000,
      "ticks": 1,
      "delay": 26000
    },
    {
      "view": "inspect",
      "label": "Human review",
      "scope": "HUMAN REVIEW · Confirm, record and reduce requests",
      "narration": "Start with two checks and expand to eight when needed. Confirmed results appear in the review record. In this staged-review evaluation, requests fall from 128 to 56, a 56.3 percent reduction, while 26 new defect episodes are still found. These are replayed public dataset labels, not actual worker records. Reviewed normal features can support a future reference candidate; stopping after two checks does not certify the whole interval as normal.",
      "durationMs": 38000,
      "ticks": 20,
      "delay": 1900
    },
    {
      "view": "candidate",
      "label": "Reference validation",
      "scope": "REFERENCE VALIDATION · Build → validate → adopt or hold",
      "narration": "Reference management is the key validation gate. Preserve the current reference and build a candidate from reviewed normal features. In a separate 15-run follow-up evaluation, false alarms fall from 1,050 to zero. But defect photos detected fall from 202 to 153, and new episodes detected from 48 to 40. Hold the candidate and retain the current reference. More data do not guarantee improvement. Automatic approval and real-time model retraining are not implemented.",
      "durationMs": 38000,
      "ticks": 1,
      "delay": 38000
    },
    {
      "view": "results",
      "label": "Results",
      "scope": "RESULTS · Review efficiency + AI performance + reference management",
      "narration": "Review requests fall from 128 to 56. AUROC and AP summarize four defect-containing runs. In a model comparison with the same review budget, newly found episodes increase from 22 to 26. AI-assisted inspection with human feedback and validated reference updates.",
      "durationMs": 26000,
      "ticks": 2,
      "delay": 13000
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
