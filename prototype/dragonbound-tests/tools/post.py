import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
Z={'bossBone':[(0,0,.07,1)],'bossBone_atk':[(.84,0,1,1)],'frog_ko':[(0,0,1,.4)],'prat':[(.45,0,1,.45)],'ghoul_hit':[(0,0,.25,.5)],
   'ghoul_ko':[(.55,0,1,.35)],'lich_hit':[(0,0,.3,.6)],'lich_ko':[(.45,0,1,.45)],'bossHag_atk':[(.86,0,1,1)],'bossVamp_blast':[(.85,.55,1,1)]}
meta=json.load(open('a7/meta.json')); P=json.load(open('a7/posem.json'))
for n,zs in Z.items():
    im=np.asarray(Image.open(f'a7/out/{n}.png')).copy(); H,W=im.shape[:2]
    for x0,y0,x1,y1 in zs: im[int(y0*H):int(y1*H),int(x0*W):int(x1*W),3]=0
    a=im[...,3]>0; l,k=ndi.label(a)
    if k: s=ndi.sum(a,l,range(1,k+1)); im[...,3][~np.isin(l,[j+1 for j in range(k) if s[j]>0.08*s.max()])]=0
    ys,xs=np.where(im[...,3]>0); im=im[ys.min():ys.max()+1,xs.min():xs.max()+1]
    I=Image.fromarray(im); I.save(f'a7/out/{n}.png')
    sc=520/max(I.size); (I.resize((round(I.size[0]*sc),round(I.size[1]*sc)),Image.LANCZOS) if sc<1 else I).save(f'a7/out/{n}.webp',quality=88)
    base=n.split('_')[0]; P[n]=[round(im.shape[0]/meta[base]['bh'],3), round(float(np.median(np.where(im[...,3]>128)[1]))/im.shape[1],3)]
json.dump(P,open('a7/posem.json','w')); print('ok')
