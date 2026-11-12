"""Train only explicitly human-reviewed masks; no downloads, no app integration."""
import argparse,base64,json,random
from pathlib import Path
import cv2
import numpy as np
BASE=Path(__file__).parent

def reviewed_dataset(labels_path):
 manifest=json.loads((BASE/'manifest.json').read_text());frames={p['id']:p for p in manifest['frames']};labels=json.loads(Path(labels_path).read_text());seen=set();out=[]
 for label in labels.get('labels',[]):
  if label.get('skipped'):continue
  if label.get('reviewed') is not True:raise ValueError('Unreviewed mask in training input')
  ident=label['id']
  if ident in seen or ident not in frames:raise ValueError('Duplicate or unknown frame')
  seen.add(ident);f=frames[ident];m=label['mask'];w,h=f['width'],f['height']
  if m['width']!=w or m['height']!=h:raise ValueError('Mask dimensions do not match frame')
  packed=base64.b64decode(m['bits'],validate=True)
  if len(packed)!=(w*h+7)//8:raise ValueError('Truncated mask')
  mask=np.unpackbits(np.frombuffer(packed,dtype=np.uint8),bitorder='little')[:w*h].reshape(h,w)
  if int(mask.sum())!=m['areaPixels']:raise ValueError('Mask area does not match packed pixels')
  out.append((f,mask))
 counts={s:sum(f['split']==s for f,m in out) for s in ['train','validation','test']}
 if counts['train']<10 or counts['validation']<5 or counts['test']<5:raise ValueError(f'Pilot requires at least 10 train, 5 validation and 5 test human masks, by recording; found {counts}')
 return out,counts

def main():
 p=argparse.ArgumentParser();p.add_argument('labels');p.add_argument('--validate-only',action='store_true');p.add_argument('--epochs',type=int,default=30);args=p.parse_args();items,counts=reviewed_dataset(args.labels);print(counts)
 if args.validate_only:return
 import torch
 import segmentation_models_pytorch as smp
 torch.manual_seed(7);random.seed(7);torch.set_num_threads(2)
 model=smp.Unet(encoder_name='mobilenet_v2',encoder_weights=None,decoder_channels=(128,64,32,16,8),in_channels=3,classes=1)
 optimizer=torch.optim.Adam(model.parameters(),lr=.001)
 def tensor(f,mask):
  image=cv2.cvtColor(cv2.imread(str(BASE/f['image'])),cv2.COLOR_BGR2RGB);image=cv2.resize(image,(256,256)).astype(np.float32)/255
  return torch.from_numpy(image.transpose(2,0,1)).unsqueeze(0),torch.from_numpy(cv2.resize(mask,(256,256),interpolation=cv2.INTER_NEAREST).astype(np.float32)).unsqueeze(0).unsqueeze(0)
 def evaluate(split):
  model.eval();scores=[]
  with torch.no_grad():
   for f,m in items:
    if f['split']!=split:continue
    x,y=tensor(f,m);pred=(model(x).sigmoid()>.5);truth=y.bool();intersection=(pred&truth).sum().item();union=(pred|truth).sum().item();scores.append(intersection/union if union else 1.)
  return sum(scores)/len(scores)
 OUT=BASE/'output';OUT.mkdir(exist_ok=True);best=-1
 for epoch in range(args.epochs):
  model.train();train=[i for i in items if i[0]['split']=='train'];random.shuffle(train)
  for f,m in train:
   x,y=tensor(f,m)
   if random.random()<.5:x=x.flip(-1);y=y.flip(-1)
   optimizer.zero_grad();logits=model(x);prob=logits.sigmoid();dice=1-(2*(prob*y).sum()+1)/(prob.sum()+y.sum()+1);loss=torch.nn.functional.binary_cross_entropy_with_logits(logits,y)+dice;loss.backward();optimizer.step()
  score=evaluate('validation');print({'epoch':epoch+1,'validation_iou':score},flush=True)
  if score>best:best=score;torch.save(model.state_dict(),OUT/'pilot.pt')
 model.load_state_dict(torch.load(OUT/'pilot.pt',map_location='cpu',weights_only=True));report={'counts':counts,'best_validation_iou':best,'test_iou':evaluate('test'),'parameters':sum(p.numel() for p in model.parameters()),'production_approved':False,'notes':'From-scratch CPU pilot. Not integrated. Requires boundary/area/center/reflection review and runtime benchmark before use.'};(OUT/'report.json').write_text(json.dumps(report,indent=2));print(report)
if __name__=='__main__':main()
