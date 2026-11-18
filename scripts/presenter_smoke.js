"use strict";
const assert = require("node:assert/strict"), fs = require("node:fs/promises"), path = require("node:path");
const { chromium } = require("playwright");
const base = process.env.SITE_URL || "http://127.0.0.1:62309/";
const output = process.env.QA_OUTPUT || "/private/tmp/surfacetrace-presenter-team-qa";
const views = ["overview","data","shift","compare","interval","inspect","handoff","candidate","results","conclusion","thanks"];
function fakeVoice() {
  window.__narrationCalls = [];
  Object.defineProperty(window,"SpeechSynthesisUtterance",{configurable:true,value:class { constructor(text){this.text=text;} }});
  Object.defineProperty(window,"speechSynthesis",{configurable:true,value:{cancel(){},getVoices(){return [];},speak(u){window.__narrationCalls.push({text:u.text,lang:u.lang});}}});
}
(async()=>{
  await fs.mkdir(output,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"});
  const reports=[];
  try {
    for(const language of ["ko","en"]){
      const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addInitScript(fakeVoice);
      const page=await context.newPage(),errors=[],failed=[];page.on("pageerror",e=>errors.push(e.message));page.on("response",r=>{if(r.status()>=400)failed.push(r.url());});
      const state=()=>page.evaluate(()=>window.surfaceTracePresenter.getState());
      const review=()=>page.evaluate(()=>window.surfaceTracePresenter.getReviewStatus());
      const file=language==="ko"?"presenter.html":"presenter-en.html";
      const scene=async index=>{await page.locator(`.demo-steps [data-step="${index}"]`).click();await page.waitForFunction(v=>window.surfaceTracePresenter.getState().view===v,views[index]);};
      const capture=async name=>{await page.waitForTimeout(650);await page.locator("#toast").evaluate(e=>e.hidden=true);await page.screenshot({path:path.join(output,`${language}-${name}.png`),fullPage:true});};
      await page.goto(new URL(file,base).href);await page.waitForFunction(()=>window.surfaceTracePresenter);
      const copy=await page.evaluate(lang=>window.SURFACETRACE_PRESENTER_COPY[lang],language);
      assert.deepEqual(copy.map(c=>c.view),views);assert.equal(copy.reduce((n,c)=>n+c.durationMs,0),240000);
      assert.equal(await page.locator(".demo-steps [data-step]").count(),11);
      assert.equal(await page.locator("[data-scene]").count(),11);
      assert.equal(await page.locator(".summary-card .flow-number").innerText(),"REVIEW SELECTION");
      assert.equal(await page.locator(".reviewer-card .flow-number").innerText(),"HUMAN REVIEW");
      assert(await page.locator(".parallel-analyses article").first().evaluate(e=>e.classList.contains("shift-analysis")));
      if(language==="ko"){assert.equal(await page.locator(".summary-card h3").innerText(),"8장 선정");assert.equal(await page.locator(".input-card h3").innerText(),"데이터 업로드하기");assert.equal(await page.locator("#aiAnalysisTitle").innerText(),"AI 모델이 탐지하는 구간");}
      assert.equal(await page.locator(".ai-analysis-group .analysis-card").count(),2);assert.equal(await page.locator(".ai-analysis-group .summary-card").count(),1);assert.equal(await page.locator(".ai-analysis-group .reviewer-card,.ai-analysis-group .reference-candidate-card,.ai-analysis-group .input-card").count(),0);
      const originalData=await page.evaluate(()=>JSON.stringify(window.SURFACETRACE_PRESENTER_DATA));
      for(const size of [{width:2560,height:1440},{width:1440,height:900},{width:1280,height:720}]){
        await page.setViewportSize(size);
        for(let index=0;index<views.length;index++){
          await scene(index);await page.waitForTimeout(120);
          const bounds=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,controlsBottom:document.querySelector(".demo-controls").getBoundingClientRect().bottom}));
          assert(bounds.scrollWidth<=bounds.width+1,`${language} ${views[index]} width: ${JSON.stringify(bounds)}`);
          if(language==="ko")assert(bounds.scrollHeight<=bounds.height+2&&bounds.controlsBottom<=bounds.height+2,`${language} ${views[index]} viewport: ${JSON.stringify(bounds)}`);
          if(index===0){
            const geometry=await page.evaluate(()=>({cards:[...document.querySelectorAll(":is(.parallel-flow,.ai-analysis-group)>.pipeline-card")].map(e=>e.getBoundingClientRect().height),overlap:["summary-card","reviewer-card","reference-candidate-card"].some(cls=>{const card=document.querySelector("."+cls);return card.querySelector("h3").getBoundingClientRect().top < Math.max(...[...card.querySelectorAll("img")].map(i=>i.getBoundingClientRect().bottom))-1;})}));
            assert(geometry.cards.every(h=>h<=622),"Overview cards should not stretch into empty towers");assert(!geometry.overlap,"Overview image/title overlap");
            assert(await page.locator(".ai-analysis-group>.ai-group-heading").evaluate(e=>{const h=e.getBoundingClientRect(),a=document.querySelector(".ai-analysis-group").getBoundingClientRect(),title=document.querySelector(".overview-heading").getBoundingClientRect();return h.top>=title.bottom&&h.bottom<=a.top;}),"AI heading must sit above its group without covering the overview heading");
            assert.equal(await page.locator(".pipeline-owner").count(),0);assert.equal(await page.locator(".team-group-heading").count(),2);
            const roleHeadings=await page.locator(".overview-stage .ai-group-heading").evaluateAll(items=>items.map(e=>({y:e.getBoundingClientRect().top,size:parseFloat(getComputedStyle(e.querySelector("h3")).fontSize)})));
            assert(Math.max(...roleHeadings.map(e=>e.y))-Math.min(...roleHeadings.map(e=>e.y))<=2,"AI and both team labels should share the same top line");assert(roleHeadings.every(e=>e.size>=15));
          }
          if(index>=9) { await page.locator(`[data-scene="${index}"]>img`).evaluate(e=>e.decode()); assert(await page.locator("#playTour").isDisabled()); const image=await page.locator(`[data-scene="${index}"]>img`).evaluate(e=>({width:e.naturalWidth,height:e.naturalHeight,fit:getComputedStyle(e).objectFit}));assert.equal(image.width,2560);assert.equal(image.fit,"contain"); }
          if(size.width===1440&&[0,2,6,7,9,10].includes(index))await capture(views[index]);
        }
      }
      await page.setViewportSize({width:1440,height:900});
      await scene(8);assert(await page.locator("#nextStep").isEnabled());await page.locator("#nextStep").click();assert.equal((await state()).view,"conclusion");await page.locator("#nextStep").click();assert.equal((await state()).view,"thanks");assert(await page.locator("#nextStep").isDisabled());await page.locator("#previousStep").click();assert.equal((await state()).view,"conclusion");await page.keyboard.press("ArrowLeft");assert.equal((await state()).view,"results");
      await scene(0);await page.locator('[data-overview="animation"]').click();assert.equal((await state()).overview,"animation");await page.locator('[data-overview="flow"]').click();
      await scene(1);await page.locator('[data-method="reference"]').click();assert.equal((await state()).method,"reference");
      await scene(2);await page.locator("#shiftSlider").evaluate(e=>e.value="4");await page.locator("#shiftSlider").dispatchEvent("input");assert.equal((await state()).shift,4);assert.equal((await page.locator("#shiftStreak").innerText()).replace(/\s/g,""),"3/3");
      await scene(3);await page.waitForFunction(()=>document.querySelector("#analysisOriginal").naturalWidth>0);await page.locator("#compareRaw").click();assert(await page.locator("#analysisHeat").isHidden());await page.locator("#compareRaw").click();await page.locator('[data-photo="1"]').click();assert.equal((await state()).photo,1);
      const scores=await page.locator('[data-scene="3"]').innerText();for(const n of ["0.884","0.965","66.4%","85.4%"])assert(scores.includes(n));
      await scene(4);assert.equal(await page.locator("#intervalPhotos .film-frame").count(),8);assert.equal(await page.locator("#top8Track i").count(),8);assert.equal(await page.locator("#spaced8Track i").count(),8);
      await scene(6);assert.match(await page.locator("#handoffReviewed").innerText(),language==="ko"?/확인 전/:/pending/);
      await scene(5);await page.locator("#caseSelect").selectOption("defect");
      for(let i=0;i<8;i++){if(i)await page.locator("#nextPhoto").click();await page.locator("#reviewAction").click();}
      assert((await review()).complete);assert.equal((await review()).count,8);
      await scene(6);assert.match(await page.locator("#handoffReviewed").innerText(),/8/);assert.match(await page.locator("#handoffStatus").innerText(),language==="ko"?/AI 솔루션팀/:/AI solution/);await capture("handoff-reviewed");
      await page.locator('.report-handoff-stage [data-step="7"]').click();assert.equal((await state()).view,"candidate");
      for(const n of ["1,050","202","153","48","40"])assert((await page.locator(".decision-visual").innerText()).includes(n));
      assert.equal(await page.locator(".presenter-reference-choices button").count(),2);await page.locator("#presenterApplyCandidate").click();assert.equal((await state()).referenceChoice,"apply");assert.match(await page.locator("#referenceChoiceMessage").innerText(),language==="ko"?/적용 보류/:/held/);await page.locator("#presenterKeepReference").click();assert.equal((await state()).referenceChoice,"keep");
      await scene(5);await page.locator("#caseSelect").selectOption("normal");await page.locator("#reviewAction").click();await page.locator("#nextPhoto").click();await page.locator("#reviewAction").click();assert((await review()).stopped);assert.equal((await review()).count,2);
      await scene(6);assert.match(await page.locator("#handoffReviewed").innerText(),/2/);await scene(7);assert.deepEqual(await page.locator(".decision-row strong>b").allTextContents(),["1,060","202","47"]);assert.match(await page.locator("#referenceResultSummary").innerText(),language==="ko"?/경보 유지/:/unchanged/);await page.locator("#caseSelect").evaluate(e=>{e.value="defect";e.dispatchEvent(new Event("change",{bubbles:true}));});await scene(7);assert.deepEqual(await page.locator(".decision-row strong>b").allTextContents(),["0","153","40"]);
      await page.setViewportSize({width:390,height:844});for(let i=0;i<views.length;i++){await scene(i);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${language} mobile ${views[i]} overflow`);}await capture("mobile-results");
      assert.equal(await page.evaluate(()=>JSON.stringify(window.SURFACETRACE_PRESENTER_DATA)),originalData);assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
      await context.close();
      const timed=await browser.newContext({viewport:{width:1440,height:900}});await timed.addInitScript(fakeVoice);const replay=await timed.newPage(),replayErrors=[];replay.on("pageerror",e=>replayErrors.push(e.message));await replay.clock.install();await replay.goto(new URL(file,base).href);await replay.waitForFunction(()=>window.surfaceTracePresenter);await replay.clock.pauseAt(await replay.evaluate(()=>new Date(Date.now()+10000)));await replay.locator("#playTour").click();
      const autoCopy=copy.filter(chapter=>!chapter.manual);
      for(let i=0;i<autoCopy.length;i++){await replay.clock.runFor(autoCopy[i].durationMs);const s=await replay.evaluate(()=>window.surfaceTracePresenter.getState());assert.equal(s.scene,Math.min(i+1,autoCopy.length-1),`${language} autoplay after ${views[i]}`);}
      const final=await replay.evaluate(()=>({state:window.surfaceTracePresenter.getState(),calls:window.__narrationCalls}));assert.equal(final.state.playing,false);assert.equal(final.calls.length,9);assert(final.calls[7].text.includes(language==="ko"?"천육십":"1,060"));assert.equal(final.state.reviews.defect.records.filter(Boolean).length,8);assert.equal(final.state.reviews.normal.records.filter(Boolean).length,2);assert.equal(final.state.view,"results");assert(await replay.locator("#nextStep").isEnabled());await replay.locator("#nextStep").click();assert.equal((await replay.evaluate(()=>window.surfaceTracePresenter.getState())).view,"conclusion");await replay.clock.runFor(60000);assert.equal((await replay.evaluate(()=>window.surfaceTracePresenter.getState())).view,"conclusion");await replay.keyboard.press("Space");assert.equal((await replay.evaluate(()=>window.surfaceTracePresenter.getState())).view,"conclusion");assert.equal(await replay.evaluate(()=>window.__narrationCalls.length),9);assert.deepEqual(replayErrors,[]);await timed.close();
      reports.push({language,chapters:11,automaticChapters:9,manualPdfPages:[22,23],durationMs:240000,reviewPaths:[8,2],reportHandoff:true,referenceChoices:true,overviewSizing:true,narrationChapters:9});
    }
    console.log(JSON.stringify({status:"passed",reports,screenshots:output}));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
