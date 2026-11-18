/* Stored validation results. The two-normal-stop values were supplied by the user. */
(() => {
  "use strict";
  const original = window.SURFACETRACE_PRESENTER_DATA.updateEvaluation;
  const eight = Object.freeze({ ...original, id: "eight-fixed-review", reviewRoute: "eight-fixed-review", label: "8장 고정 검수", liveValidationPerformed: false });
  const two = Object.freeze({
    id: "two-normal-stop", reviewRoute: "two-normal-stop", label: "정상 2장 확인 후 종료",
    source: "user-provided-validation-results", scope: "사용자가 제공한 정상 2장 확인 후 종료 경로의 검증 결과",
    liveValidationPerformed: false, modelWeightsUpdated: false,
    metrics: Object.freeze([
      Object.freeze({ id: "normal-alerts", before: 1050, after: 1060, unit: "장" }),
      Object.freeze({ id: "defect-frames", before: 202, after: 202, unit: "장" }),
      Object.freeze({ id: "defect-episodes", before: 48, after: 47, unit: "건" })
    ])
  });
  window.SURFACETRACE_REFERENCE_RESULTS = Object.freeze({
    select: ({ stoppedAfterTwo, reviewedCount }) => stoppedAfterTwo && reviewedCount === 2 ? two : eight
  });
})();
