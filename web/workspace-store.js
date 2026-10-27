"use strict";
// Images, drafts, and confirmed annotations stay on this browser, including across reloads.
window.SurfaceStore = (() => {
  let connection;
  function db() {
    if (!connection) connection = new Promise((resolve,reject) => {
      const request = indexedDB.open("surfacetrace-workspace",1);
      request.onupgradeneeded = () => {
        const database = request.result;
        database.createObjectStore("items",{keyPath:"id"});
        database.createObjectStore("events",{keyPath:"id"});
      };
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>reject(request.error);
    });
    return connection;
  }
  async function transaction(stores,mode,action) {
    const database = await db();
    return new Promise((resolve,reject)=>{
      const tx=database.transaction(stores,mode); let value;
      try { value=action(tx); } catch(e) { tx.abort(); reject(e); return; }
      tx.oncomplete=()=>resolve(value?.result ?? value);
      tx.onerror=()=>reject(tx.error);
      tx.onabort=()=>reject(tx.error || new Error("저장을 완료하지 못했습니다."));
    });
  }
  const all = () => transaction(["items"],"readonly",tx=>tx.objectStore("items").getAll());
  const events = () => transaction(["events"],"readonly",tx=>tx.objectStore("events").getAll());
  const put = item => transaction(["items"],"readwrite",tx=>tx.objectStore("items").put(item));
  const putMany = items => transaction(["items"],"readwrite",tx=>{for(const item of items)tx.objectStore("items").put(item);});
  const record = (item, event) => transaction(["items","events"],"readwrite",tx=>{
    tx.objectStore("items").put(item);
    tx.objectStore("events").put({id:crypto.randomUUID(),at:new Date().toISOString(),itemId:item.id,...event});
  });
  const resetDemo = () => transaction(["items","events"],"readwrite",tx=>{
    const request=tx.objectStore("items").openCursor();
    request.onsuccess=()=>{const c=request.result;if(c){if(c.value.source==="demo")c.delete();c.continue();}};
    const events=tx.objectStore("events").openCursor();
    events.onsuccess=()=>{const c=events.result;if(c){if(c.value.source==="demo")c.delete();c.continue();}};
  });
  function day(value) {
    const d=new Date(value);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
  function download(name,data,type="application/json") {
    const blob=new Blob([typeof data==="string"?data:JSON.stringify(data,null,2)],{type});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  }
  function exportItem(item) {
    return {id:item.id,name:item.name,source:item.source,lot:item.lot,material:item.material,
      importedAt:item.importedAt,reviewedAt:item.reviewedAt || null,status:item.status,
      model:item.analysis?{version:item.analysis.modelVersion,score:item.analysis.score,threshold:item.analysis.threshold,latencyMs:item.analysis.latencyMs,comparable:item.analysis.comparable}:null,
      coordinateSystem:"normalized xywh on displayed image",rotationClockwise:item.rotate?90:0,
      sourceImage:item.model || null,sourceSize:item.analysis?{width:item.analysis.sourceWidth,height:item.analysis.sourceHeight}:null,
      aiDraft:item.analysis?.boxes || [],annotation:{label:item.label,severity:item.severity,boxes:item.boxes || [],note:item.note || ""}};
  }
  return {all,events,put,putMany,record,resetDemo,day,download,exportItem};
})();
