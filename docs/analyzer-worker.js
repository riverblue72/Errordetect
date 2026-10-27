"use strict";
importScripts("./anomaly-core.js");

let reference;
async function getReference() {
  if (!reference) reference = fetch("./normal_reference.json").then(r => {
    if (!r.ok) throw new Error("정상 기준 모델을 불러오지 못했습니다.");
    return r.json();
  }).then(model => {
    for (const key of ["bank", "center", "scale"]) model[key] = Float32Array.from(model[key]);
    return model;
  }).catch(error => { reference = null; throw error; });
  return reference;
}

// Connected regions are coarse review proposals, never ground-truth masks.
function regionsFromScores(scores, threshold) {
  const cutoff = Math.max(threshold * 1.1, percentile(scores, .98));
  const seen = new Uint8Array(scores.length), regions = [];
  for (let index = 0; index < scores.length; index++) {
    if (seen[index] || scores[index] < cutoff) continue;
    const queue = [index]; seen[index] = 1;
    let minX = GRID_W, minY = GRID_H, maxX = 0, maxY = 0, peak = 0;
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const at = queue[cursor], x = at % GRID_W, y = Math.floor(at / GRID_W);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y); peak = Math.max(peak, scores[at]);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, next = yy * GRID_W + xx;
        if (xx < 0 || yy < 0 || xx >= GRID_W || yy >= GRID_H || seen[next] || scores[next] < cutoff) continue;
        seen[next] = 1; queue.push(next);
      }
    }
    if (queue.length < 2) continue;
    const x0 = Math.max(0, minX - 1), y0 = Math.max(0, minY - 1);
    const x1 = Math.min(GRID_W, maxX + 2), y1 = Math.min(GRID_H, maxY + 2);
    regions.push({x:x0/GRID_W, y:y0/GRID_H, w:(x1-x0)/GRID_W, h:(y1-y0)/GRID_H, peak});
  }
  return regions.sort((a,b) => b.peak-a.peak).slice(0, 4);
}

async function dataURL(canvas) {
  return new FileReaderSync().readAsDataURL(await canvas.convertToBlob({type:"image/png"}));
}

self.onmessage = async ({data}) => {
  const {id, blob, rotate = true} = data;
  try {
    const started = performance.now(), model = await getReference();
    const bitmap = await createImageBitmap(blob);
    const sourceWidth = bitmap.width, sourceHeight = bitmap.height;
    const canvas = new OffscreenCanvas(W, H), ctx = canvas.getContext("2d", {willReadFrequently:true});
    ctx.drawImage(bitmap, 0, 0, W, H);
    bitmap.close();
    const rgba = ctx.getImageData(0,0,W,H).data, raw = new Float32Array(W*H);
    let brightness = 0;
    for (let i=0; i<raw.length; i++) { raw[i] = Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2])/255; brightness += raw[i]; }
    const scores = nearestScores(makeFeatures(raw), model), score = percentile(scores,.995);
    const heat = new OffscreenCanvas(GRID_W,GRID_H), hctx = heat.getContext("2d");
    const pixels = hctx.createImageData(GRID_W,GRID_H);
    for(let i=0;i<scores.length;i++) {
      const alpha = Math.max(0,Math.min(1,(scores[i]-model.threshold*.35)/Math.max(model.threshold*.9,.01)));
      pixels.data.set([244,91,84,Math.round(alpha*190)],i*4);
    }
    hctx.putImageData(pixels,0,0);
    let heatmapCanvas = heat;
    let boxes = regionsFromScores(scores,model.threshold);
    if (rotate) {
      heatmapCanvas = new OffscreenCanvas(GRID_H,GRID_W);
      const rotated = heatmapCanvas.getContext("2d");
      rotated.translate(GRID_H,0); rotated.rotate(Math.PI/2); rotated.drawImage(heat,0,0);
      boxes = boxes.map(b => ({...b,x:1-b.y-b.h,y:b.x,w:b.h,h:b.w}));
    }
    self.postMessage({id, result:{
      score, threshold:model.threshold, boxes, heatmap:await dataURL(heatmapCanvas),
      brightness:brightness/raw.length, latencyMs:Math.round(performance.now()-started),
      sourceWidth, sourceHeight, modelVersion:"normal-patch-v1", review:score>=model.threshold,
      comparable:sourceWidth/sourceHeight>=.32 && sourceWidth/sourceHeight<=.5 && Math.min(sourceWidth,sourceHeight)>=200
    }});
  } catch(error) { self.postMessage({id,error:error.message || "이미지를 분석하지 못했습니다."}); }
};
