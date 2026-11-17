"""Export same-frame DINOv2 maps for the operator replay, without model training.

Reads only verified HTTP ranges from the public TSFabrics ZIP. Reconstructs
512 source-image features with the original frozen extractor and selection
code. CPU inference can differ slightly from the recorded CUDA fp16 scores;
a held-out published frame must agree within 0.005 before assets are exported.
Colors use common display quantiles across the five replay maps. They are
continuous distances, not ground-truth masks or binary defect predictions.
Run: python scripts/export_field_shift_assets.py --cache /path/to/cache
"""
import io, os, sys, json, zipfile, urllib.request, time, hashlib, argparse, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
import torch
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'experiments/unsupervised'))
from core import DINOFeatures, mutual_image_scores, select_reference_indices, build_reference_bank, PatchScorer
from export_unlabeled_demo import heat_overlay
SIZE=9187191764
class RemoteZip(io.RawIOBase):
 def __init__(self,cache):self.cache=cache;self.pos=0;self.blocks={};self.downloaded=0;self.url='https://ndownloader.figshare.com/files/59998607';self.blocksize=1<<20
 def seekable(self):return True
 def readable(self):return True
 def tell(self):return self.pos
 def seek(self,offset,whence=0):
  self.pos=offset if whence==0 else self.pos+offset if whence==1 else SIZE+offset
  return self.pos
 def block(self,number):
  if number in self.blocks:return self.blocks[number]
  disk=self.cache/f'zip-block-{number}.bin'
  if disk.exists():data=disk.read_bytes()
  else:
   start=number*self.blocksize;end=min(SIZE-1,start+self.blocksize-1)
   for attempt in range(4):
    try:
     request=urllib.request.Request(self.url,headers={'Range':f'bytes={start}-{end}'})
     with urllib.request.urlopen(request,timeout=40) as response:
      if response.status!=206 or response.headers.get('Content-Range')!=f'bytes {start}-{end}/{SIZE}':raise RuntimeError('Incorrect HTTP range')
      data=response.read(end-start+2);self.url=response.geturl()
     if len(data)!=end-start+1:raise RuntimeError('Short range')
     break
    except Exception:
     self.url='https://ndownloader.figshare.com/files/59998607?range='+str(start)
     if attempt==3:raise
   disk.write_bytes(data);self.downloaded+=len(data)
   if self.downloaded>350*(1<<20):raise RuntimeError('Bounded download limit exceeded')
  self.blocks[number]=data;return data
 def read(self,n=-1):
  if n<0:n=SIZE-self.pos
  n=min(n,SIZE-self.pos)
  if n<=0:return b''
  start=self.pos;end=start+n;parts=[]
  for number in range(start//self.blocksize,(end-1)//self.blocksize+1):
   block=self.block(number);base=number*self.blocksize;parts.append(block[max(0,start-base):min(len(block),end-base)])
  self.pos=end;return b''.join(parts)
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--cache',type=Path,default=Path(tempfile.gettempdir())/'surfacetrace-shift-assets')
    CACHE=parser.parse_args().cache.resolve();CACHE.mkdir(parents=True,exist_ok=True)
    print('Reading public ZIP directory with verified byte ranges',flush=True)
    archive=zipfile.ZipFile(RemoteZip(CACHE))
    def paths(run):return sorted(n for n in archive.namelist() if '/image/'+run.lower()+'/' in '/'+n.lower() and n.lower().endswith(('.jpg','.png','.jpeg')))
    source=paths('T1_S174_I111_1');target=paths('T1_S478_I118_2')
    assert len(source)>=512 and len(target)>1505,(len(source),len(target))
    def photo(name):
     p=CACHE/('photo-'+hashlib.sha256(name.encode()).hexdigest()[:16]+'.png')
     if not p.exists():
      raw=archive.read(name);Image.open(io.BytesIO(raw)).convert('RGB').save(p)
     return Image.open(p).convert('RGB')
    print('Preparing frozen DINOv2-S/14; CPU inference only',flush=True)
    torch.set_num_threads(min(8,os.cpu_count() or 4))
    extractor=DINOFeatures(device='cpu')
    features=CACHE/'source-tokens.npy';globalsfile=CACHE/'source-global.npy'
    if features.exists() and globalsfile.exists():tokens=np.load(features);globals_=np.load(globalsfile)
    else:
     tokens=np.empty((512,832,384),np.float16);globals_=np.empty((512,384),np.float16)
     starttime=time.time()
     for start in range(0,512,4):
      t,g=extractor.encode([photo(n) for n in source[start:start+4]]);tokens[start:start+4]=t;globals_[start:start+4]=g
      if start%16==0:print(f'Source features {start+4}/512 ({time.time()-starttime:.0f}s)',flush=True)
     np.save(features,tokens);np.save(globalsfile,globals_)
    print('Reconstructing the original label-free reference bank',flush=True)
    selected=select_reference_indices(mutual_image_scores(tokens,device='cpu'),globals_)
    bank=build_reference_bank(tokens,selected);assert len(selected)==308 and len(bank)==7392
    scorer=PatchScorer(bank,device='cpu')
    frames=[1,32,64,96,192,1506]
    queries=[photo(target[f-1]) for f in frames]
    query_tokens,_=extractor.encode(queries)
    scores,maps=scorer.score(query_tokens)
    expected=.5369413495
    assert abs(float(scores[-1])-expected)<.005,('Reference check score mismatch',float(scores[-1]),expected)
    low,high=[float(v) for v in np.quantile(maps[:-1],[.5,.995])]
    np.savez(CACHE/'query-maps.npz',frames=frames,scores=scores,maps=maps)
    out=ROOT/'web/scenario';assets=[]
    for frame,im,score,heat in zip(frames[:-1],queries[:-1],scores[:-1],maps[:-1]):
     name=f'demo-{frame:03d}-heat.png'
     heat_overlay(heat,low,high,(400,320),out/name)
     existing=Image.open(out/f'demo-{frame:03d}.jpg').convert('RGB')
     resized=im.resize((400,320),Image.Resampling.LANCZOS)
     pixel_mae=float(np.abs(np.asarray(existing).astype(float)-np.asarray(resized).astype(float)).mean())
     assert pixel_mae<5,(frame,pixel_mae)
     assets.append({'run':'T1_S478_I118_2','frame':frame,'image':f'./scenario/demo-{frame:03d}.jpg','heatmap':f'./scenario/{name}','score':float(score),'originalArchivePath':target[frame-1],'displayImagePixelMAE':pixel_mae})
    manifest={'schemaVersion':1,'run':'T1_S478_I118_2','sourceRun':'T1_S174_I111_1','model':'Frozen DINOv2-S/14','method':'Original core.py patch kNN, k=3, rebuilt original 512-image source reference, CPU float32 inference','referenceImages':len(selected),'referencePatches':len(bank),'sourceThreshold':.47077027037739766,'referenceCheck':{'frame':1506,'recordedScore':expected,'computedScore':float(scores[-1]),'tolerance':.005},'display':{'low':low,'high':high,'quantiles':[.5,.995],'alphaMax':180,'meaning':'continuous patch distance, not a binary defect mask'},'dataset':'https://doi.org/10.6084/m9.figshare.29573381','assets':assets}
    (out/'shift-analysis.json').write_text(json.dumps(manifest,indent=2))
    (ROOT/'web/field-shift-data.js').write_text('window.SURFACETRACE_SHIFT_ANALYSIS = '+json.dumps(manifest,ensure_ascii=False,indent=2)+';\n')
    print('DONE',json.dumps({'frames':frames[:-1],'referenceCheck':manifest['referenceCheck'],'scores':[float(s) for s in scores[:-1]]}),flush=True)


if __name__ == "__main__":
    main()
