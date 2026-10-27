"use strict";
(() => {
  const $=id=>document.getElementById(id), store=window.SurfaceStore;
  const labels={unclassified:"미분류",normal:"정상",scratch:"스크래치",crack:"균열",contamination:"표면 오염",other:"기타 결함",new:"새 유형 후보"};
  let items=[], selectedId=null, tool="select", selectedBox=-1, batchBusy=false, storageFailed=false;
  let worker, workerSerial=0, toastTimer, drag=null, saveChain=Promise.resolve();
  const jobs=new Map(), urls=new Map(), undoStacks=new Map();
  const current=()=>items.find(item=>item.id===selectedId);
  function toast(message,error=false){clearTimeout(toastTimer);$("toast").textContent=message;$("toast").classList.toggle("error",error);$("toast").hidden=false;toastTimer=setTimeout(()=>$("toast").hidden=true,error?6500:3400);}
  function reportError(error){storageFailed=true;$("saveState").textContent="저장 실패 · 브라우저 저장 공간을 확인해 주세요.";toast(error.message || "작업을 완료하지 못했습니다.",true);}
  function persist(item,event){
    const snapshot=structuredClone(item);
    saveChain=saveChain.then(()=>event?store.record(snapshot,event):store.put(snapshot)).then(()=>{
      storageFailed=false;$("saveState").textContent="이 브라우저에 저장됨 ✓";
    }).catch(reportError);
    return saveChain;
  }
  function getWorker(){
    if(worker)return worker;
    worker=new Worker("./analyzer-worker.js");
    worker.onmessage=({data})=>{
      const job=jobs.get(data.id);if(!job)return;
      clearTimeout(job.timeout);jobs.delete(data.id);
      if(data.error)job.reject(new Error(data.error));else job.resolve(data.result);
    };
    worker.onerror=()=>{
      for(const job of jobs.values()){clearTimeout(job.timeout);job.reject(new Error("분석 작업을 시작하지 못했습니다. 새로고침 후 다시 시도해 주세요."));}
      jobs.clear();worker?.terminate();worker=null;
    };
    return worker;
  }
  function analyze(blob,rotate){return new Promise((resolve,reject)=>{
    const id=++workerSerial;
    const timeout=setTimeout(()=>{jobs.delete(id);reject(new Error("분석 시간이 초과되었습니다. 다시 시도해 주세요."));},60000);
    jobs.set(id,{resolve,reject,timeout});
    try{getWorker().postMessage({id,blob,rotate});}catch(e){clearTimeout(timeout);jobs.delete(id);reject(e);}
  });}
  function imageURL(item){
    if(item.display)return item.display;
    if(!urls.has(item.id))urls.set(item.id,URL.createObjectURL(item.blob));
    return urls.get(item.id);
  }
  function visibleItems(){
    const filter=$("queueFilter").value;
    const filtered=items.filter(item=>filter==="all" || (filter==="confirmed"?item.status==="confirmed":filter==="flagged"?item.analysis?.review:item.status!=="confirmed"));
    return filtered.sort((a,b)=>{
      if($("queueSort").value==="name")return a.name.localeCompare(b.name);
      const priority=item=>item.status==="confirmed"?-1000:item.analysis?.review?100+(item.analysis?.score || 0):item.status==="deferred"?-10:0;
      return priority(b)-priority(a)||a.name.localeCompare(b.name);
    });
  }
  function renderStats(){
    const complete=items.filter(i=>i.status==="confirmed").length;
    $("totalCount").textContent=items.length;$("reviewedCount").textContent=complete;
    $("pendingCount").textContent=items.length-complete;
    $("flaggedCount").textContent=items.filter(i=>i.analysis?.review).length;
    $("completionText").textContent=`검수 진행률 ${items.length?Math.round(complete/items.length*100):0}%`;
    $("exportDataset").disabled=complete===0;
    const demos=items.filter(i=>i.source==="demo").length,uploads=items.length-demos;
    $("sessionDescription").textContent=`시연 샘플 ${demos}장${uploads?` · 업로드 ${uploads}장`:""} · 수정하고 확정하면 보고서에 반영됩니다.`;
    $("sessionTag").textContent=uploads?"MIXED WORKSPACE":"DEMO · METAL";
  }
  function renderQueue(){
    const filtered=visibleItems();$("queueCount").textContent=filtered.length;
    $("reviewQueue").replaceChildren();
    if(!filtered.length){const empty=document.createElement("p");empty.className="queue-empty";empty.textContent="조건에 맞는 이미지가 없습니다. 필터를 변경해 보세요.";$("reviewQueue").append(empty);}
    for(const item of filtered){
      const button=document.createElement("button");button.type="button";button.className="queue-item"+(item.id===selectedId?" selected":"");
      button.setAttribute("aria-pressed",String(item.id===selectedId));button.dataset.id=item.id;
      const image=document.createElement("img");image.src=imageURL(item);image.alt="";image.loading="lazy";
      const text=document.createElement("span"),name=document.createElement("strong"),meta=document.createElement("small"),dot=document.createElement("i");
      name.textContent=item.name;
      dot.className="dot "+(item.status==="confirmed"?"green":item.analysis?.review?"coral":"gray");
      const state=item.status==="confirmed"?labels[item.label]:item.status==="deferred"?"판정 보류":item.analysisError?"분석 재시도":item.analysis?(item.analysis.review?"검토 요청":"기준 미만 · 검수 대기"):"분석 대기";
      meta.append(dot,document.createTextNode(state));text.append(name,meta);button.append(image,text);
      button.addEventListener("click",()=>selectItem(item.id));$("reviewQueue").append(button);
    }
    const index=filtered.findIndex(i=>i.id===selectedId);
    $("previousImage").disabled=index<=0;$("nextImage").disabled=index<0||index>=filtered.length-1;
  }
  function selectItem(id){
    if(drag)endPointer();
    selectedId=id;selectedBox=-1;renderQueue();renderEditor();
  }
  function renderEditor(){
    const item=current();$("stageEmpty").hidden=!!item;
    for(const id of ["confirmLabel","markNormal","deferItem","defectLabel","severity","lotName","reviewNote","drawTool","selectTool"])$(id).disabled=!item;
    if(!item){$("editorHeading").textContent="검수할 이미지가 없습니다";$("reviewImage").removeAttribute("src");$("reviewHeatmap").removeAttribute("src");$("annotationCanvas").replaceChildren();$("regionCount").textContent="0개";$("regionArea").textContent="0%";$("modelLatency").textContent="—";$("anomalyScore").textContent="—";$("insightTitle").textContent="선택한 조건에 이미지가 없습니다";$("insightDescription").textContent="검수함 필터를 변경하거나 새 사진을 추가하세요.";$("deleteBox").disabled=true;$("undoEdit").disabled=true;return;}
    $("editorHeading").textContent=item.name;
    $("imageSource").textContent=item.source==="demo"?"DEMO · METAL SURFACE":"UPLOAD · USER IMAGE";
    $("reviewImage").onload=()=>{
      const img=$("reviewImage");$("annotationPhoto").style.aspectRatio=`${img.naturalWidth}/${img.naturalHeight}`;
      $("annotationPhoto").style.width=`min(100%, ${340*img.naturalWidth/img.naturalHeight}px)`;
    };
    $("reviewImage").src=imageURL(item);
    if(item.analysis){$("reviewHeatmap").src=item.analysis.heatmap;$("imageDimensions").textContent=`${item.analysis.sourceWidth} × ${item.analysis.sourceHeight} px`;}
    else{$("reviewHeatmap").removeAttribute("src");$("imageDimensions").textContent="";}
    $("reviewHeatmap").hidden=!$("toggleHeatmap").checked || !item.analysis;
    $("defectLabel").value=item.label;$("severity").value=item.severity;$("lotName").value=item.lot;$("reviewNote").value=item.note || "";
    $("reviewState").textContent=item.status==="confirmed"?"검수 완료":item.status==="deferred"?"판정 보류":"검수 대기";
    $("reviewState").className="tag "+(item.status==="confirmed"?"done":"muted");
    $("confirmLabel").innerHTML=item.status==="confirmed"?'검수 완료 <span>✓</span>':'라벨 확정 <span>✓</span>';
    $("anomalyScore").textContent=item.analysis?item.analysis.score.toFixed(2):"—";
    $("modelLatency").textContent=item.analysis?`${item.analysis.latencyMs} ms`:"—";
    if(item.analysisError){$("insightTitle").textContent="분석을 다시 시도해 주세요";$("insightDescription").textContent=item.analysisError;}
    else if(!item.analysis){$("insightTitle").textContent="AI가 결함 후보를 찾고 있습니다";$("insightDescription").textContent="분석 후 영역 초안이 나타납니다. 직접 영역을 그릴 수도 있습니다.";}
    else if(!item.analysis.comparable){$("insightTitle").textContent="새 촬영 조건 · 참고용 분석";$("insightDescription").textContent="기존 금속 사진과 비율·해상도가 다릅니다. 직접 영역을 확인해 주세요.";}
    else if(item.analysis.review){$("insightTitle").textContent=`AI가 ${item.analysis.boxes.length}개 후보 영역을 제안했습니다`;$("insightDescription").textContent="정상 기준과 차이가 큰 영역입니다. 위치와 결함 유형을 확인해 주세요.";}
    else{$("insightTitle").textContent="이상 점수가 검토 기준보다 낮습니다";$("insightDescription").textContent="미검출된 결함이 있을 수 있습니다. 사진을 확인한 뒤 판정하세요.";}
    renderBoxes();
  }
  function unionArea(boxes){
    const xs=[...new Set(boxes.flatMap(b=>[b.x,b.x+b.w]))].sort((a,b)=>a-b);let area=0;
    for(let i=1;i<xs.length;i++){
      const mid=(xs[i-1]+xs[i])/2,ys=boxes.filter(b=>b.x<=mid&&b.x+b.w>=mid).map(b=>[b.y,b.y+b.h]).sort((a,b)=>a[0]-b[0]);
      let length=0,start=0,end=0;
      for(const [a,b]of ys){if(a>end){length+=end-start;start=a;end=b;}else end=Math.max(end,b);}
      area+=(xs[i]-xs[i-1])*(length+end-start);
    }
    return Math.max(0,Math.min(1,area));
  }
  function svgElement(tag,attrs){const node=document.createElementNS("http://www.w3.org/2000/svg",tag);for(const [key,value]of Object.entries(attrs))node.setAttribute(key,value);return node;}
  function renderBoxes(){
    const item=current(),canvas=$("annotationCanvas");canvas.replaceChildren();
    canvas.hidden=!$("toggleBoxes").checked;canvas.classList.toggle("drawing",tool==="draw");
    if(!item)return;
    item.boxes.forEach((box,index)=>{
      const group=svgElement("g",{"data-index":index,class:index===selectedBox?"selected":""});
      const rect=svgElement("rect",{x:box.x*1000,y:box.y*400,width:box.w*1000,height:box.h*400,rx:1,class:"region-box","data-index":index});
      const labelY=Math.max(0,box.y*400-24),labelWidth=48;
      const label=svgElement("rect",{x:box.x*1000,y:labelY,width:labelWidth,height:24,rx:2,class:"box-label","data-index":index});
      const text=svgElement("text",{x:box.x*1000+6,y:labelY+18});text.textContent=String(index+1).padStart(2,"0");group.append(rect,label,text);
      if(index===selectedBox)for(const [corner,x,y]of [["nw",box.x,box.y],["ne",box.x+box.w,box.y],["sw",box.x,box.y+box.h],["se",box.x+box.w,box.y+box.h]]){
        group.append(svgElement("rect",{x:x*1000-5,y:y*400-5,width:10,height:10,class:"box-handle","data-index":index,"data-corner":corner}));
      }
      canvas.append(group);
    });
    $("regionCount").textContent=`${item.boxes.length}개`;$("regionArea").textContent=`${(unionArea(item.boxes)*100).toFixed(1)}%`;
    $("deleteBox").disabled=selectedBox<0;$("undoEdit").disabled=!(undoStacks.get(item.id)?.length);
  }
  function snapshot(item){return {boxes:structuredClone(item.boxes),label:item.label,severity:item.severity,note:item.note,lot:item.lot,status:item.status,reviewedAt:item.reviewedAt};}
  function remember(item){const stack=undoStacks.get(item.id)||[];stack.push(snapshot(item));if(stack.length>25)stack.shift();undoStacks.set(item.id,stack);}
  function edited(item){if(item.status==="confirmed"){item.status="draft";item.reviewedAt=null;}item.touched=true;item.updatedAt=new Date().toISOString();}
  function position(event){const r=$("annotationCanvas").getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))};}
  $("annotationCanvas").addEventListener("pointerdown",event=>{
    const item=current();if(!item||event.button!==0)return;
    const p=position(event),target=event.target.closest("[data-index]");
    if(tool==="draw"){
      remember(item);selectedBox=item.boxes.length;item.boxes.push({x:p.x,y:p.y,w:0,h:0,origin:"manual"});
      drag={mode:"draw",start:p,id:item.id,index:selectedBox,changed:false};
    }else if(target){
      selectedBox=Number(target.dataset.index);remember(item);
      drag={mode:target.dataset.corner?"resize":"move",corner:target.dataset.corner,start:p,id:item.id,index:selectedBox,original:{...item.boxes[selectedBox]},changed:false};
    }else{selectedBox=-1;renderBoxes();return;}
    event.preventDefault();$("annotationCanvas").setPointerCapture(event.pointerId);renderBoxes();
  });
  $("annotationCanvas").addEventListener("pointermove",event=>{
    if(!drag)return;const item=current();if(!item||item.id!==drag.id)return;
    const p=position(event),box=item.boxes[drag.index],dx=p.x-drag.start.x,dy=p.y-drag.start.y;
    if(Math.abs(dx)+Math.abs(dy)<.002&&!drag.changed)return;drag.changed=true;
    if(drag.mode==="draw"){box.x=Math.min(p.x,drag.start.x);box.y=Math.min(p.y,drag.start.y);box.w=Math.abs(dx);box.h=Math.abs(dy);}
    else if(drag.mode==="move"){box.x=Math.max(0,Math.min(1-box.w,drag.original.x+dx));box.y=Math.max(0,Math.min(1-box.h,drag.original.y+dy));box.origin="edited";}
    else{
      let x0=drag.original.x,y0=drag.original.y,x1=x0+drag.original.w,y1=y0+drag.original.h;
      if(drag.corner.includes("w"))x0=Math.min(p.x,x1-.01);else x1=Math.max(p.x,x0+.01);
      if(drag.corner.includes("n"))y0=Math.min(p.y,y1-.02);else y1=Math.max(p.y,y0+.02);
      Object.assign(box,{x:x0,y:y0,w:x1-x0,h:y1-y0,origin:"edited"});
    }
    renderBoxes();
  });
  function endPointer(){
    if(!drag)return;const item=items.find(i=>i.id===drag.id),box=item?.boxes[drag.index];
    if(item){
      if(!drag.changed||(drag.mode==="draw"&&(box.w<.008||box.h<.015))){const prior=undoStacks.get(item.id)?.pop();if(prior)Object.assign(item,prior);selectedBox=-1;}
      else{edited(item);persist(item);}
    }
    drag=null;renderBoxes();renderStats();renderQueue();if(item)updateReviewBadge(item);
  }
  $("annotationCanvas").addEventListener("pointerup",endPointer);
  $("annotationCanvas").addEventListener("pointercancel",()=>{
    if(!drag)return;const item=items.find(i=>i.id===drag.id),prior=undoStacks.get(drag.id)?.pop();if(item&&prior)Object.assign(item,prior);drag=null;renderBoxes();
  });
  function updateReviewBadge(item){$("reviewState").textContent=item.status==="confirmed"?"검수 완료":"검수 대기";$("reviewState").className="tag "+(item.status==="confirmed"?"done":"muted");$("confirmLabel").innerHTML=item.status==="confirmed"?'검수 완료 <span>✓</span>':'라벨 확정 <span>✓</span>';}
  function setTool(value){tool=value;$("selectTool").classList.toggle("active",value==="select");$("drawTool").classList.toggle("active",value==="draw");$("selectTool").setAttribute("aria-pressed",String(value==="select"));$("drawTool").setAttribute("aria-pressed",String(value==="draw"));if(value==="draw")$("toggleBoxes").checked=true;renderBoxes();}
  $("selectTool").onclick=()=>setTool("select");$("drawTool").onclick=()=>setTool("draw");
  $("deleteBox").onclick=()=>{const item=current();if(!item||selectedBox<0)return;remember(item);item.boxes.splice(selectedBox,1);selectedBox=-1;edited(item);persist(item);renderEditor();renderQueue();renderStats();};
  $("undoEdit").onclick=()=>{const item=current(),previous=undoStacks.get(item?.id)?.pop();if(!item||!previous)return;Object.assign(item,previous);selectedBox=-1;persist(item);renderEditor();renderQueue();renderStats();};
  $("toggleHeatmap").onchange=()=>{$("reviewHeatmap").hidden=!$("toggleHeatmap").checked||!current()?.analysis;};
  $("toggleBoxes").onchange=renderBoxes;
  for(const [id,key]of [["defectLabel","label"],["severity","severity"],["lotName","lot"],["reviewNote","note"]]){
    $(id).addEventListener(id==="reviewNote"||id==="lotName"?"input":"change",()=>{
      const item=current();if(!item)return;
      remember(item);item[key]=$(id).value;edited(item);persist(item);updateReviewBadge(item);renderStats();renderQueue();renderBoxes();
    });
  }
  function navigate(direction){const filtered=visibleItems(),index=filtered.findIndex(i=>i.id===selectedId),next=filtered[index+direction];if(next)selectItem(next.id);}
  $("previousImage").onclick=()=>navigate(-1);$("nextImage").onclick=()=>navigate(1);
  for(const id of ["queueFilter","queueSort"])$(id).onchange=()=>{const filtered=visibleItems();if(!filtered.some(i=>i.id===selectedId))selectedId=filtered[0]?.id || null;renderQueue();renderEditor();};
  async function confirm(normal=false){
    const item=current();if(!item)return;
    if(!normal&&item.label==="unclassified"){toast("먼저 결함 유형을 선택하거나 ‘정상으로 확정’을 눌러 주세요.");$("defectLabel").focus();return;}
    if(!normal&&item.label!=="normal"&&!item.boxes.length){toast("결함 위치를 하나 이상 표시해 주세요. ‘영역 추가’로 그릴 수 있습니다.");setTool("draw");return;}
    if(!item.lot.trim()){toast("LOT / 작업 묶음을 입력해 주세요.");$("lotName").focus();return;}
    remember(item);if(normal)item.label="normal";
    if(item.label==="normal"){item.boxes=[];item.severity="unspecified";}
    item.status="confirmed";item.touched=true;item.reviewedAt=new Date().toISOString();
    await persist(item,{kind:"confirmed",source:item.source,label:item.label,boxes:item.boxes.length});
    renderStats();renderQueue();renderEditor();
    if(!storageFailed)toast(`${item.name} · ${labels[item.label]} 확정. 일일 보고서에 반영되었습니다.`);
  }
  $("confirmLabel").onclick=()=>confirm(false);$("markNormal").onclick=()=>confirm(true);
  $("deferItem").onclick=async()=>{const item=current();if(!item)return;remember(item);item.status="deferred";item.reviewedAt=null;await persist(item,{kind:"deferred",source:item.source});renderStats();const next=visibleItems().find(i=>i.id!==item.id&&i.status!=="confirmed");if(next)selectItem(next.id);else{renderQueue();renderEditor();}toast("판정을 보류했습니다. 검수 대기에 남아 있습니다.");};
  async function runBatch(){
    if(batchBusy)return;
    const targets=items.filter(i=>!i.analysis || i.analysisError);
    if(!targets.length){toast("모든 이미지의 AI 초안이 준비되었습니다. 영역과 라벨을 확인해 주세요.");return;}
    batchBusy=true;$("analyzeBatch").disabled=true;$("resetDemo").disabled=true;$("batchProgress").hidden=false;
    let errors=0;
    for(let i=0;i<targets.length;i++){
      const item=targets[i];$("batchMessage").textContent=`AI 초안 생성 중 · ${i+1} / ${targets.length}`;$("batchFill").style.width=`${i/targets.length*100}%`;
      $("scanLine").hidden=selectedId!==item.id;
      try{
        let blob=item.blob;
        if(!blob){const response=await fetch(item.model);if(!response.ok)throw new Error("샘플 이미지를 불러오지 못했습니다.");blob=await response.blob();}
        const result=await analyze(blob,item.rotate);
        item.analysis=result;delete item.analysisError;
        // An arriving model result must never overwrite edits made during inference.
        if(!item.touched && item.status!=="confirmed")item.boxes=result.boxes.map(b=>({...b,origin:"ai"}));
        if(item.status==="pending")item.status="draft";
        await persist(item);
      }catch(error){item.analysisError=error.message;errors++;await persist(item);}
      renderStats();renderQueue();if(selectedId===item.id)renderEditor();
    }
    batchBusy=false;$("scanLine").hidden=true;$("analyzeBatch").disabled=false;$("resetDemo").disabled=false;
    $("batchFill").style.width="100%";$("batchMessage").textContent=errors?`초안 생성 완료 · ${errors}장 재시도 필요`:`${targets.length}장 초안 생성 완료 · 검수를 시작하세요`;
    $("analyzeBatch").textContent=errors?"✧ 실패한 분석 재시도":"✧ AI 초안 준비 완료";
    if(!errors)setTimeout(()=>{if(!batchBusy)$("batchProgress").hidden=true;},3500);
  }
  $("analyzeBatch").onclick=runBatch;
  async function createDemo(){
    const response=await fetch("./samples.json");if(!response.ok)throw new Error("시연 샘플 목록을 불러오지 못했습니다.");
    const catalog=await response.json();
    // Dataset labels select a varied demonstration set only; predictions never read them.
    const chosen=[...catalog.filter(i=>i.label==="Defect").slice(0,5),...catalog.filter(i=>i.label==="Normal").slice(0,7)];
    const now=new Date().toISOString();
    const demos=chosen.map(sample=>({id:`demo-${sample.id}`,name:`Sample ${String(sample.id).padStart(2,"0")}`,source:"demo",material:"metal",lot:"DEMO-METAL-01",model:sample.model,display:sample.display,rotate:true,importedAt:now,status:"pending",label:"unclassified",severity:"unspecified",boxes:[],note:""}));
    await store.putMany(demos);items.push(...demos);return demos;
  }
  $("resetDemo").onclick=()=>$("resetDialog").showModal();
  $("resetDialog").onclose=async()=>{
    if($("resetDialog").returnValue!=="reset"||batchBusy)return;
    try{await saveChain;await store.resetDemo();items=items.filter(i=>i.source!=="demo");undoStacks.clear();const demos=await createDemo();$("queueFilter").value="all";selectItem(demos[0].id);renderStats();runBatch();toast("시연 샘플을 초기화했습니다.");}catch(e){reportError(e);}
  };
  $("uploadButton").onclick=()=>$("uploadFiles").click();
  async function uploadFiles(files){
    const accepted=[...files].slice(0,30);let count=0;
    for(const file of accepted){
      if(!["image/jpeg","image/png","image/webp"].includes(file.type)){toast(`${file.name}: JPG, PNG, WebP만 추가할 수 있습니다.`,true);continue;}
      if(file.size>15*1024*1024){toast(`${file.name}: 15MB 이하 이미지를 선택해 주세요.`,true);continue;}
      try{
        const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>40000000){bitmap.close();throw new Error("이미지 해상도가 너무 큽니다. 4천만 화소 이하로 줄여 주세요.");}bitmap.close();
        const item={id:crypto.randomUUID(),name:file.name,source:"upload",material:"unspecified",lot:`UPLOAD-${store.day(new Date())}`,blob:file,rotate:false,importedAt:new Date().toISOString(),status:"pending",label:"unclassified",severity:"unspecified",boxes:[],note:""};
        await store.put(item);items.push(item);count++;if(count===1){$("queueFilter").value="all";selectItem(item.id);}
      }catch(e){toast(`${file.name}: ${e.message || "이미지를 읽지 못했습니다."}`,true);}
    }
    $("uploadFiles").value="";renderStats();renderQueue();
    if(count){toast(`${count}장의 사진을 추가했습니다. 실제 업로드 이미지로 표시됩니다.`);if(batchBusy){await new Promise(resolve=>{const interval=setInterval(()=>{if(!batchBusy){clearInterval(interval);resolve();}},200);});}runBatch();}
  }
  $("uploadFiles").onchange=event=>uploadFiles(event.target.files);
  for(const name of ["dragenter","dragover"])$("annotationStage").addEventListener(name,event=>{event.preventDefault();});
  $("annotationStage").addEventListener("drop",event=>{event.preventDefault();if(event.dataTransfer.files.length)uploadFiles(event.dataTransfer.files);});
  $("exportDataset").onclick=async()=>{
    await saveChain;const confirmed=items.filter(i=>i.status==="confirmed");if(!confirmed.length){toast("라벨을 먼저 확정해 주세요.");return;}
    store.download(`surfacetrace-labels-${store.day(new Date())}.json`,{schemaVersion:1,exportedAt:new Date().toISOString(),description:"Human-confirmed image annotations. AI proposals are retained separately. Original uploaded files are not embedded.",items:confirmed.map(store.exportItem)});
    toast(`${confirmed.length}장의 확정 라벨을 내보냈습니다.`);
  };
  document.addEventListener("keydown",event=>{
    if(/INPUT|TEXTAREA|SELECT/.test(event.target.tagName)||$("resetDialog").open)return;
    if(event.key==="Delete"||event.key==="Backspace"){if(selectedBox>=0){event.preventDefault();$("deleteBox").click();}}
    if((event.ctrlKey||event.metaKey)&&event.key==="z"){event.preventDefault();$("undoEdit").click();}
    if(event.key==="Escape"){setTool("select");selectedBox=-1;renderBoxes();}
  });
  async function init(){
    try{
      items=await store.all();if(!items.some(i=>i.source==="demo"))await createDemo();
      const params=new URLSearchParams(location.search);if(params.get("filter")==="pending")$("queueFilter").value="pending";
      const requested=params.get("item"),first=visibleItems()[0];
      selectedId=items.some(i=>i.id===requested)?requested:first?.id || null;
      renderStats();renderQueue();renderEditor();
      if(items.some(i=>!i.analysis))runBatch();else $("analyzeBatch").textContent="✧ AI 초안 준비 완료";
    }catch(error){reportError(error);$("stageEmpty").hidden=false;$("stageEmpty").textContent="작업대를 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.";}
  }
  window.addEventListener("pagehide",()=>{for(const url of urls.values())URL.revokeObjectURL(url);worker?.terminate();});
  window.addEventListener("pageshow",event=>{if(event.persisted)location.reload();});
  init();
})();
