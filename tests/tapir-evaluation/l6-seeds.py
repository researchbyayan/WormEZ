import os,sys,time
import cv2,numpy as np,torch
source=os.environ.get('TAPNET_SOURCE')
checkpoint=os.environ.get('TAPIR_CHECKPOINT')
if not source or not checkpoint:raise RuntimeError('Set TAPNET_SOURCE and TAPIR_CHECKPOINT')
sys.path.insert(0,source)
from tapnet.torch import tapir_model
torch.set_num_threads(4)
cap=cv2.VideoCapture(os.environ.get('WORMEZ_L6_VIDEO','../03-05-2026 da Gal4 x w1118 L6.MP4'))
frames=[]
for _ in range(48):
 ok,f=cap.read()
 if not ok:break
 frames.append(cv2.cvtColor(f[224:480,512:768],cv2.COLOR_BGR2RGB))
cap.release()
model=tapir_model.TAPIR(pyramid_level=0,extra_convs=False)
model.load_state_dict(torch.load(checkpoint,map_location='cpu',weights_only=True));model.eval()
seeds=[(630,352),(627,350),(630,349),(633,350),(627,353),(633,353),(630,355)]
q=torch.tensor([[[0,y-224,x-512] for x,y in seeds]],dtype=torch.float32)
v=torch.from_numpy(np.stack(frames)).float().unsqueeze(0)/255*2-1
t=time.monotonic()
with torch.no_grad():o=model(v,q)
vis=((1-torch.sigmoid(o['occlusion'][0]))*(1-torch.sigmoid(o['expected_dist'][0]))>.5).numpy()
xy=o['tracks'][0].numpy()
for i,seed in enumerate(seeds):print(seed,'visible',vis[i].sum(),'first',xy[i,0].tolist(),'last',xy[i,-1].tolist())
print('inference_seconds',round(time.monotonic()-t,2))
