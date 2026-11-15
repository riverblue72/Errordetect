/* Presentation-only copy. Scores, labels, images and experimental records stay in presenter-data.js. */
(() => {
  "use strict";
  const timing = [
    ["overview", 24000, 2], ["data", 31000, 2], ["compare", 32000, 2],
    ["shift", 25000, 5], ["interval", 26000, 1], ["inspect", 38000, 20],
    ["candidate", 38000, 1], ["results", 26000, 2]
  ];
  const copy = {
    ko: [
      ["전체 흐름", "OVERVIEW · AI 분석 → 검수 → 기준 후보 검증",
        "AI가 모든 결함을 판정하는 대신, 현장 담당자의 검수와 의사결정을 지원하는 흐름입니다. 사진별 이상 분석과 구간 외관 변화는 독립된 경로입니다. AI가 검수 우선순위를 제시하고 사람이 확인 결과를 기록합니다. 이 기록은 새 기준 후보를 만들고 후속 데이터로 검증하는 근거가 됩니다.",
        "이상 위치와 외관 변화는 독립된 두 신호입니다. AI 분석 → 검수 후보 선정 → 사람의 확인·기록 → 검수 결과 활용 → 기준 갱신 후보 검증으로 이어집니다. 기존 기준을 보존하며 후보는 검증을 통과한 경우에만 적용을 검토합니다. 실제 자동 승인이나 실시간 모델 재학습을 구현했다는 의미가 아닙니다."],
      ["데이터·기준", "DATA & REFERENCE · 고정된 DINOv2와 PCA 기반 선별",
        "공개 TSFabrics의 스물두 개 녹화, 구만 삼천백구십육 장을 사용했습니다. 초기 오백십이 장의 DINOv2 전체 이미지 특징을 PCA 첫 번째 주성분에 투영하고 사분위수로 네 그룹을 만듭니다. 그룹마다 코사인 유사도 기반 이례성 점수가 낮은 육십 퍼센트를 선별해 삼백팔 장을 남깁니다. 사진당 스물네 패치, 총 칠천삼백구십이 개가 비교 기준입니다. DINOv2 가중치는 재학습하지 않았습니다.",
        "TSFabrics 총 22개 녹화·93,196장. 초기 512장의 DINOv2 전체 이미지 특징을 PCA 첫 번째 주성분에 투영하고 사분위수 기준으로 4개 그룹을 구성합니다. 각 그룹에서 코사인 유사도 기반 이례성 점수가 낮은 60%를 선별합니다. 308장 × 사진당 24개 패치 = 7,392개 기준 특징입니다. DINOv2 ViT-S/14 가중치는 고정합니다. 경보선은 별도 보정 사진의 점수로 정한 0.4708입니다."],
      ["이상 위치·성능", "ANOMALY DETECTION · 결함 포함 4개 Run의 Macro 평균",
        "같은 사진의 수작업 특징과 DINOv2 히트맵을 비교합니다. 결함이 포함된 네 개 Run의 매크로 평균에서 AUROC는 영 점 팔팔사에서 영 점 구육오로, AP는 육십육 점 사 퍼센트에서 팔십오 점 사 퍼센트로 바뀌었습니다. AUROC는 결함 검출률이 아니라 점수의 구분 성능입니다. 현재 경보선 영 점 사칠공팔은 사진 점수를 경보로 바꾸는 기준입니다.",
        "수작업 특징은 사람이 설계한 영상 특징을 쓰는 비교 알고리즘입니다. AUROC 0.884 → 0.965, Average Precision 66.4% → 85.4%는 모두 결함 포함 4개 Run의 Macro 평균이며 평가 범위를 확대하지 않습니다. AUROC는 경보선에서의 결함 검출률이 아닙니다. 0.4708은 보정 점수의 99.5백분위수로 정한 현재 경보선입니다. 원본·히트맵과 정상·결함 사례 전환을 유지합니다."],
      ["외관 변화", "VISUAL SHIFT · 소재·촬영 조건의 담당자 확인 신호",
        "외관 변화는 개별 사진의 결함 탐지와 독립된 신호입니다. 백스물여덟 장의 창을 서른두 장씩 옮기며 비교하고, 세 번 연속 경보선을 넘을 때 확인 신호를 냅니다. 사진의 시간순 변화를 보면서 소재나 촬영 조건이 달라졌는지 담당자가 확인합니다. 변화 신호만으로 공정 이상을 확정하거나 사진의 결함 경보를 해제하지 않습니다.",
        "128장 Window, 32장 이동, 3회 연속 경보선 초과 규칙과 실제 사진의 시간순 전환을 유지합니다. 서로 다른 녹화를 이어 붙인 시험에서 새 녹화 96번째 프레임에 신호가 확인됩니다. 외관 변화는 개별 결함 탐지와 독립적이며 소재나 촬영 조건 변화에 대한 담당자 확인 신호입니다. 현장 공정 이상이 자동 확정됐다는 의미는 아닙니다."],
      ["구간 요약", "INTERVAL REVIEW · 2,884장 → 검수 후보 8장",
        "모든 사진을 사람이 확인하는 것이 아니라 AI가 검수 우선순위를 정합니다. 이 구간의 이천팔백팔십사 장을 여덟 장의 검수 후보로 요약합니다. 단순히 점수 상위 여덟 장을 고른 경우와 열여섯 프레임 간격을 둔 경우를 비교합니다. 동일한 검수 예산에서 새 결함 사건 발견은 열다섯 건에서 스물여섯 건으로 늘었습니다.",
        "2,884장 → 8장은 원본 시연 한 구간의 요약입니다. 두 점 배열과 실제 사진에서 단순 Top 8과 최소 16프레임 간격의 Spaced 8을 비교합니다. 15 → 26건은 결함 포함 4개 Run, 구간당 8건의 같은 검수 예산에서 후보 선정 규칙을 비교한 결과입니다. 모든 사진은 점수를 계산하지만 사람이 확인할 후보는 순위와 간격으로 따로 정합니다."],
      ["사람의 검수", "HUMAN REVIEW · 확인·기록과 검수 요청 감소",
        "먼저 두 건을 확인하고 필요하면 총 여덟 건까지 검수합니다. 버튼을 누르면 확인 결과가 기록됩니다. 이번 순차 검수 평가에서는 요청이 백스물여덟 건에서 쉰여섯 건으로 줄어 오십육 점 삼 퍼센트 감소했고, 발견한 새 결함 사건은 스물여섯 건으로 유지됐습니다. 실제 작업자 기록이 아니라 공개 데이터의 정답으로 검수를 재현한 결과입니다. 확인된 정상 특징은 향후 기준 후보를 구성하는 근거가 될 수 있습니다.",
        "최종 16개 Run의 순차 검수 평가: 항상 8건씩 요청한 128건 → 우선 2건, 필요하면 8건인 56건. 감소율 56.25%를 소수 첫째 자리로 반올림하면 56.3%이며 발견한 신규 결함 사건 26건은 유지됐습니다. 공개 정답을 이용한 검수 재현으로 실제 현장 작업자 기록이 아닙니다. 정상 2건으로 종료해도 전체 구간이 정상이라는 보장은 아닙니다. 확인·기록된 정상 특징만 향후 후보 검증의 근거가 될 수 있습니다."],
      ["기준 갱신 후보 검증", "REFERENCE VALIDATION · 후보 생성 → 후속 검증 → 적용 또는 보류",
        "품질 관리의 핵심은 새 기준을 검증한 뒤 변경하는 것입니다. 기존 기준을 보존하고 검수된 정상 특징으로 후보를 만듭니다. 별도의 열다섯 Run 후속 평가에서 정상 오경보는 천오십 장에서 영 장으로 줄었지만, 결함 사진 탐지는 이백이 장에서 백쉰세 장으로, 새 결함 사건 탐지는 마흔여덟 건에서 마흔 건으로 줄었습니다. 따라서 후보 적용은 보류하고 기존 기준을 유지합니다. 자동 승인이나 모델 재학습을 구현한 것은 아닙니다.",
        "후보 생성 → 같은 후속 데이터에서 검증 → 적용 또는 보류의 흐름입니다. 기존 기준은 보존하고 복사본에 검수된 정상 특징을 추가합니다. 별도 15개 Run·구간당 8건 고정 검수 실험에서 정상 오경보 1,050 → 0, 결함 사진 탐지 202 → 153, 신규 결함 사건 탐지 48 → 40입니다. 오경보만 줄어도 적용하지 않습니다. 결론은 후보 적용 보류 / 기존 기준 유지입니다. 데이터가 쌓이면 무조건 좋아진다는 결과나 실제 자동 승인·실시간 재학습 기능을 주장하지 않습니다."],
      ["최종 결과", "RESULTS · 검수 효율 + AI 성능 + 검증된 기준 관리",
        "검수 요청은 백스물여덟 건에서 쉰여섯 건으로 줄었습니다. AUROC와 AP는 결함 포함 네 Run의 평균입니다. 별도의 동일한 백스물여덟 건 예산 모델 비교에서 신규 사건 발견은 스물두 건에서 스물여섯 건으로 늘었습니다. AI 분석과 사람의 검수, 새로운 기준의 적용 가능성 검증을 잇는 품질 관리 파이프라인입니다.",
        "서로 다른 평가를 섞지 않습니다. 검수 효율 128 → 56건, 56.3% 감소는 순차 검수 평가입니다. AUROC 0.884 → 0.965와 AP 66.4% → 85.4%는 결함 포함 4개 Run의 Macro 평균입니다. 신규 사건 22 → 26건은 같은 128건 예산의 수작업 특징 대 DINOv2 + Selection 모델 비교입니다. 기준 후보 실험에서는 탐지 감소로 보류했습니다. AI-assisted inspection with human feedback and validated reference updates. AI가 이상을 분석하고 사람이 검수하며, 축적된 검수 결과를 바탕으로 새로운 기준의 적용 가능성을 검증하는 품질 관리 파이프라인입니다."]
    ],
    en: [
      ["Overview", "OVERVIEW · AI analysis → human review → reference validation",
        "AI supports inspection and decisions; it does not decide every defect. Photo-level anomaly analysis and interval visual shift are independent paths. AI prioritizes review candidates, and people confirm and record results. Those records can support a reference candidate, which must be validated on later data before any change is considered.",
        "Follow AI analysis → candidate selection → human confirmation and records → use of review results → reference-candidate validation. Preserve the current reference. Independent anomaly and shift signals support the reviewer. This is not a claim of implemented automatic approval or real-time model retraining."],
      ["Data & reference", "DATA & REFERENCE · Frozen DINOv2 and PCA-based selection",
        "TSFabrics contains 22 recorded runs and 93,196 photos. Project the first 512 photos' global DINOv2 features onto the first PCA component. Quartiles define four groups. Within each group, select the 60 percent with the lowest cosine-similarity-based unusualness scores. This leaves 308 photos. Twenty-four patch features per photo produce 7,392 reference features. DINOv2 weights are not retrained.",
        "Project global DINOv2 image features from the first 512 photos onto the first principal component of PCA. Use quartiles for four groups, then retain the lowest-scoring 60% by cosine-similarity-based unusualness within each group. The 308 selected photos supply 24 patch features each: 7,392 in total. DINOv2 ViT-S/14 stays frozen. Calibration photos define the current 0.4708 alert limit."],
      ["Anomaly detection", "ANOMALY DETECTION · Macro means over 4 defect-containing runs",
        "Compare handcrafted and DINOv2 heatmaps on the same photo. Across four defect-containing runs, macro AUROC changes from 0.884 to 0.965, and Average Precision from 66.4 to 85.4 percent. Both metrics use the same four-run scope. AUROC measures score discrimination, not the defect detection rate at a threshold. The current 0.4708 limit turns photo scores into alerts.",
        "Handcrafted means an algorithm with human-designed image features. AUROC 0.884 → 0.965 and AP 66.4% → 85.4% are both macro averages over the four defect-containing runs. AUROC is not a defect detection rate. The current alert limit, 0.4708, is calibrated from the 99.5th percentile of reference-run calibration scores. Preserve raw/heatmap and normal/defect photo comparisons."],
      ["Visual shift", "VISUAL SHIFT · A signal for operator confirmation",
        "Visual shift is independent of individual defect detection. Compare a 128-photo window every 32 frames, requiring three consecutive threshold exceedances. The time-ordered photos help an operator check for material or imaging-condition changes. This signal does not confirm a process fault by itself, or cancel photo-level anomaly alerts.",
        "Keep the 128-photo window, 32-frame step, three consecutive exceedances and time-ordered photos. The joined-run test confirms a signal at frame 96 of the new run. Treat this as a request for operator confirmation of material or imaging-condition changes, independently of individual defects."],
      ["Interval review", "INTERVAL REVIEW · 2,884 photos → 8 review candidates",
        "People do not inspect every photo: AI sets review priorities. Summarize this interval's 2,884 photos as eight candidates. Compare the eight highest-scoring photos with eight selected at least 16 frames apart. Under the same review budget, new defect episodes found increase from 15 to 26. This comparison concerns candidate selection, not a change in model weights.",
        "2,884 → 8 summarizes one recorded interval. The two marker tracks contrast plain Top 8 with a minimum 16-frame spacing rule. The 15 → 26 result compares selection rules on four defect-containing runs, with eight checks per run in both cases. Scores are calculated for every photo, but review candidates are selected separately by ranking and spacing."],
      ["Human review", "HUMAN REVIEW · Confirm, record and reduce requests",
        "Start with two checks and expand to eight when needed. Confirmed results appear in the review record. In this staged-review evaluation, requests fall from 128 to 56, a 56.3 percent reduction, while 26 new defect episodes are still found. These are replayed public dataset labels, not actual worker records. Reviewed normal features can support a future reference candidate; stopping after two checks does not certify the whole interval as normal.",
        "Final 16-run staged-review evaluation: fixed eight per run gives 128 requests; two-first review gives 56. The reduction is 56.25%, displayed as 56.3%, with 26 newly found episodes retained in this evaluation. This replay uses published ground truth, not real worker records. Two normal checks do not establish whole-interval safety. Confirmed normal features may support future reference candidates."],
      ["Reference validation", "REFERENCE VALIDATION · Build → validate → adopt or hold",
        "Reference management is the key validation gate. Preserve the current reference and build a candidate from reviewed normal features. In a separate 15-run follow-up evaluation, false alarms fall from 1,050 to zero. But defect photos detected fall from 202 to 153, and new episodes detected from 48 to 40. Hold the candidate and retain the current reference. More data do not guarantee improvement. Automatic approval and real-time model retraining are not implemented.",
        "Build a candidate → validate on the same later photos → consider adoption or hold. Preserve the current reference and add reviewed normal features to a copy. Separate 15-run experiment, eight fixed checks per run: normal false alarms 1,050 → 0; defect photos detected 202 → 153; newly detected defect episodes 48 → 40. Decision: candidate held / current reference retained. Do not imply implemented automatic approval, model retraining or guaranteed improvement from accumulating data."],
      ["Results", "RESULTS · Review efficiency + AI performance + reference management",
        "Review requests fall from 128 to 56. AUROC and AP summarize four defect-containing runs. In a separate model comparison using the same 128-check budget, newly found episodes increase from 22 to 26. AI-assisted inspection with human feedback and validated reference updates.",
        "Keep the evaluation scopes distinct. Review efficiency: 128 → 56 requests, 56.3% reduction, from staged review. AUROC: 0.884 → 0.965; AP: 66.4% → 85.4%; both macro means over four defect-containing runs. Newly found episodes: 22 → 26 from handcrafted versus DINOv2 + Selection under the same 128-check budget. The reference candidate was held because detection declined. AI-assisted inspection with human feedback and validated reference updates. A quality-management pipeline where AI analyzes anomalies, people review them, and accumulated review results support validation of possible reference changes."]
    ]
  };
  const locales = {};
  for (const [language, rows] of Object.entries(copy)) {
    locales[language] = Object.freeze(rows.map(([label, scope, narration, note], index) => {
      const [view, durationMs, ticks] = timing[index];
      return Object.freeze({ view, label, scope, narration, note, durationMs, ticks, delay: durationMs / ticks });
    }));
  }
  window.SURFACETRACE_PRESENTER_COPY = Object.freeze({
    ...locales,
    durationMs: timing.reduce((sum, row) => sum + row[1], 0),
    evidence: Object.freeze({
      scoreComparison: "experiments/unsupervised/results/unlabeled_review_final.json",
      sequentialReview: "experiments/unsupervised/results/sequential_review_final.json",
      referenceValidation: "experiments/unsupervised/FEEDBACK_VALIDATION_RESULTS.md"
    })
  });
})();
