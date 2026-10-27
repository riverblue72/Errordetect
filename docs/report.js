"use strict";
(() => {
  const $=id=>document.getElementById(id),store=window.SurfaceStore;
  const labels={unclassified:"미분류",normal:"정상",scratch:"스크래치",crack:"균열",contamination:"표면 오염",other:"기타 결함",new:"새 유형 후보"};
  let items=[],filtered=[],toastTimer;
  const urls=new Map();
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  function photo(item){if(item.display)return item.display;if(!urls.has(item.id))urls.set(item.id,URL.createObjectURL(item.blob));return urls.get(item.id);}
  function toast(message){clearTimeout(toastTimer);$("toast").textContent=message;$("toast").hidden=false;toastTimer=setTimeout(()=>$("toast").hidden=true,4000);}
  function metrics(list){const reviewed=list.filter(i=>i.status==="confirmed"),defects=reviewed.filter(i=>i.label!=="normal");return {total:list.length,reviewed:reviewed.length,defects:defects.length,normal:reviewed.length-defects.length,pending:list.length-reviewed.length,rate:reviewed.length?defects.length/reviewed.length:null};}
  function render(){
    filtered=items.filter(item=>store.day(item.importedAt)===$("reportDate").value&&($("sourceFilter").value==="all"||item.source===$("sourceFilter").value)&&($("lotFilter").value==="all"||item.lot===$("lotFilter").value));
    const m=metrics(filtered),confirmed=filtered.filter(i=>i.status==="confirmed"),demos=filtered.filter(i=>i.source==="demo").length;
    $("reportScope").textContent=`시연 ${demos}장 · 업로드 ${filtered.length-demos}장 · 브라우저 저장 데이터`;
    $("reportEmpty").hidden=filtered.length>0;$("reportContent").hidden=!filtered.length;
    $("exportReport").disabled=!filtered.length;$("printReport").disabled=!filtered.length;
    $("reportTotal").textContent=m.total;$("reportReviewed").textContent=m.reviewed;$("reportPending").textContent=`${m.pending}건 대기`;
    $("reportDefects").textContent=m.defects;$("reportRate").textContent=m.rate===null?"—":`${(m.rate*100).toFixed(1)}%`;
    const progress=m.total?Math.round(m.reviewed/m.total*100):0;
    $("progressPercent").textContent=`${progress}%`;$("progressRing").style.setProperty("--progress",`${progress*3.6}deg`);
    $("normalTotal").textContent=m.normal;$("defectTotal").textContent=m.defects;$("waitingTotal").textContent=m.pending;
    $("briefHeadline").textContent=m.pending===0?"오늘의 검수를 모두 마쳤습니다.":m.reviewed?`${m.total}장 중 ${m.reviewed}장의 검수가 끝났습니다.`:"첫 번째 라벨을 확정해 보세요.";
    $("briefDescription").textContent=m.reviewed?`정상 ${m.normal}장, 결함 ${m.defects}장으로 확정했습니다. ${m.pending?`남은 ${m.pending}장을 검수하면 오늘의 데이터가 완성됩니다.`:"확정 라벨을 다음 학습 데이터로 내보낼 수 있습니다."}`:"작업대에서 확정한 라벨이 이곳에 자동으로 반영됩니다.";
    const types=["scratch","crack","contamination","other","new"],counts=types.map(type=>confirmed.filter(i=>i.label===type).length),max=Math.max(1,...counts);
    $("defectBars").innerHTML=types.map((type,index)=>`<div class="defect-row"><span>${labels[type]}</span><div><i style="width:${counts[index]/max*100}%"></i></div><strong>${counts[index]}</strong></div>`).join("");
    renderDistribution(filtered);
    const awaiting=filtered.filter(i=>i.analysis?.review&&i.status!=="confirmed").length;
    const candidates=confirmed.filter(i=>i.label==="new").length;
    const falseAlerts=confirmed.filter(i=>i.label==="normal"&&i.analysis?.review).length;
    const attention=[
      [awaiting,"AI 검토 요청 중 미확정",awaiting?"점수가 기준보다 높은 이미지부터 확인해 보세요.":"AI 검토 요청 이미지의 판정을 모두 확인했습니다."],
      [candidates,"새 유형으로 등록한 후보",candidates?"기존 유형에 없는 특징을 따로 모아 후속 검토할 수 있습니다.":"낯선 형태는 작업대에서 ‘새 유형 후보’로 분류하세요."],
      [falseAlerts,"AI 요청 후 정상으로 확정",falseAlerts?"작업자 판정과 모델 판단이 다른 사례입니다. 기준 개선 시 검토하세요.":"AI 판단과 작업자 판정이 다른 사례를 여기서 확인합니다."]
    ];
    $("attentionList").innerHTML=attention.map(([n,title,description])=>`<div class="attention-item"><span class="attention-number">${n}</span><div><strong>${title}</strong><p>${description}</p></div></div>`).join("");
    const history=[...confirmed].sort((a,b)=>new Date(b.reviewedAt)-new Date(a.reviewedAt));
    $("historyEmpty").hidden=history.length>0;
    $("reviewHistory").innerHTML=history.map(item=>`<tr><td><div class="history-image"><img src="${escape(photo(item))}" alt=""><span>${escape(item.name)}</span></div></td><td>${item.source==="demo"?"시연":"업로드"} · ${escape(item.lot)}</td><td><span class="tag ${item.label==="normal"?"done":""}">${escape(labels[item.label]||item.label)}</span></td><td>${item.boxes.length}</td><td>${escape(new Date(item.reviewedAt).toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}))}</td><td><a class="inline-link" href="./workspace.html?item=${encodeURIComponent(item.id)}">검수 보기 ↗</a></td></tr>`).join("");
  }
  function renderDistribution(list){
    const analyzed=list.filter(i=>i.analysis),threshold=analyzed[0]?.analysis.threshold || 2.477;
    if(!analyzed.length){$("scoreDistribution").innerHTML='<p class="table-empty">AI 분석이 완료되면 점수 분포가 표시됩니다.</p>';return;}
    const maxScore=Math.max(threshold*1.5,...analyzed.map(i=>i.analysis.score))*1.05,bins=12;
    const data=Array.from({length:bins},()=>({normal:0,review:0}));
    for(const item of analyzed){const index=Math.min(bins-1,Math.floor(item.analysis.score/maxScore*bins));data[index][item.analysis.review?"review":"normal"]++;}
    const peak=Math.max(1,...data.map(b=>b.normal+b.review));
    const x0=25,plotWidth=470,baseline=125,plotHeight=95,barStep=plotWidth/bins,thresholdX=x0+threshold/maxScore*plotWidth;
    const grids=[0,.5,1].map(r=>`<line x1="25" y1="${baseline-r*plotHeight}" x2="495" y2="${baseline-r*plotHeight}" stroke="#edf0f7"/><text x="5" y="${baseline-r*plotHeight+4}">${Math.round(peak*r)}</text>`).join("");
    const bars=data.map((bin,index)=>{
      const normal=bin.normal/peak*plotHeight,review=bin.review/peak*plotHeight,x=x0+index*barStep+4;
      return `<rect x="${x}" y="${baseline-normal}" width="${barStep-9}" height="${normal}" rx="2" fill="#a1afd6"><title>기준 미만 ${bin.normal}장</title></rect><rect x="${x}" y="${baseline-normal-review}" width="${barStep-9}" height="${review}" rx="2" fill="#dca195"><title>검토 요청 ${bin.review}장</title></rect>`;
    }).join("");
    $("scoreDistribution").innerHTML=`<svg viewBox="0 0 520 160" role="img" aria-label="분석된 ${analyzed.length}장 중 AI 검토 요청 ${analyzed.filter(i=>i.analysis.review).length}장. 검토 기준 ${threshold.toFixed(2)}.">${grids}${bars}<line x1="${thresholdX}" y1="20" x2="${thresholdX}" y2="128" stroke="#c27f78" stroke-dasharray="3 3"/><text x="${thresholdX}" y="12" text-anchor="middle" style="fill:#bb8f88;font-size:10px">검토 기준 ${threshold.toFixed(2)}</text><text x="25" y="149">0</text><text x="495" y="149" text-anchor="end">${maxScore.toFixed(1)}</text></svg>`;
  }
  async function refresh(initial=false){
    try{
      items=await store.all();
      if(initial){const today=store.day(new Date()),latest=[...items].map(i=>store.day(i.importedAt)).sort().pop();$("reportDate").value=items.some(i=>store.day(i.importedAt)===today)?today:latest||today;}
      const selected=$("lotFilter").value,lots=[...new Set(items.map(i=>i.lot))].sort();
      $("lotFilter").replaceChildren(new Option("전체 LOT","all"),...lots.map(lot=>new Option(lot,lot)));
      $("lotFilter").value=lots.includes(selected)?selected:"all";render();
    }catch(error){toast("보고서를 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.");$("reportScope").textContent="데이터를 불러오지 못했습니다.";}
  }
  for(const id of ["reportDate","sourceFilter","lotFilter"])$(id).onchange=render;
  $("printReport").onclick=()=>window.print();
  $("exportReport").onclick=()=>{
    const m=metrics(filtered);
    store.download(`surfacetrace-report-${$("reportDate").value}.json`,{schemaVersion:1,exportedAt:new Date().toISOString(),registrationDate:$("reportDate").value,source:$("sourceFilter").value,lot:$("lotFilter").value,metrics:{registeredImages:m.total,reviewedImages:m.reviewed,confirmedDefectImages:m.defects,confirmedNormalImages:m.normal,pendingImages:m.pending,defectFractionAmongReviewed:m.rate},items:filtered.map(store.exportItem)});
    toast("선택한 조건의 보고서를 내보냈습니다.");
  };
  window.addEventListener("focus",()=>refresh());
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
  window.addEventListener("pagehide",()=>{for(const url of urls.values())URL.revokeObjectURL(url);urls.clear();});
  window.addEventListener("pageshow",event=>{if(event.persisted)refresh();});
  refresh(true);
})();
