"""Prepare unlabelled, source-pixel crops. Never turns predictions into labels."""
import json
from pathlib import Path
import cv2
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).parent/'frames'
CASES=[('L4','03-05-2026 da Gal4 x w1118 L4.MP4','train'),('L6','03-05-2026 da Gal4 x w1118 L6.MP4','validation'),('straight','straight final.mp4','train'),('curved','curved final.mp4','train'),('irregular','irregular.mp4','test')]
def main():
 OUT.mkdir(exist_ok=True);items=[]
 for clip,name,split in CASES:
  cap=cv2.VideoCapture(str(ROOT.parent/name));n=int(cap.get(cv2.CAP_PROP_FRAME_COUNT));assert n>30,name
  trace=json.loads((ROOT/'tests'/('trace-'+Path(name).stem+'.json')).read_text());points={p['frame']:p for p in trace}
  for i in range(30):
   frame=round(i*(n-1)/29);cap.set(cv2.CAP_PROP_POS_FRAMES,frame);ok,image=cap.read();assert ok,(name,frame)
   h,w=image.shape[:2];p=points.get(frame,{});outline=p.get('anatomy',{}).get('outline',[]) if p.get('anatomy') else []
   if outline:
    xs=[q['x'] for q in outline];ys=[q['y'] for q in outline];margin=max(32,(max(xs)-min(xs)+max(ys)-min(ys))*.5)
    x0=max(0,int(min(xs)-margin));y0=max(0,int(min(ys)-margin));x1=min(w,int(max(xs)+margin+1));y1=min(h,int(max(ys)+margin+1))
   else:x0,y0,x1,y1=0,0,w,h
   ident=f'{clip}-{frame:06d}';cv2.imwrite(str(OUT/(ident+'.jpg')),image[y0:y1,x0:x1],[cv2.IMWRITE_JPEG_QUALITY,96])
   items.append(dict(id=ident,clip=clip,source=name,frame=frame,split=split,image='frames/'+ident+'.jpg',width=x1-x0,height=y1-y0,sourceWidth=w,sourceHeight=h,crop=[x0,y0,x1-x0,y1-y0],reviewed=False))
  cap.release();print(clip,'30 unreviewed crops',flush=True)
 manifest={'schema':1,'notes':'All crops unreviewed; prediction-based crops may be wrong. Human masks required. Splits are by entire recording.','frames':items}
 (OUT.parent/'manifest.json').write_text(json.dumps(manifest,indent=2));(OUT.parent/'manifest.js').write_text('window.LarvaManifest='+json.dumps(manifest)+';\n')
if __name__=='__main__':main()
