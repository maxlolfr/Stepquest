# stage 1: per cell, pick the main blob; save raw rgba + mask for review
import numpy as np, json, sys
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
U='/root/.claude/uploads/071cf51c-8950-5c70-94f5-10df1bd51a6e/'
P4=['idle','atk','hit','ko']
SHEETS=[ # (file, key or list of row keys, rows, cols, pose names)
 ('9e2ec74d',['wolf','spider','shroom','goblin'],None,None,P4),
 ('d75060b9',['snake','imp','scorp','golem'],None,None,P4),
 ('641e0d08',['frog','wisp','zombie','vine'],None,None,P4),
 ('33ac7737',['harpy','bear','spirit','yeti'],None,None,P4),
 ('66d15f30',['knight','garg','warlock','demon'],None,None,P4),
 ('8ea16444',['ghoul','banshee','necro','lich'],None,None,P4),
 ('eb84fe55',['vbat','werewolf','armor','vampire'],None,None,P4),
 ('f65b50e7',['prat','tslime','croco','thief'],None,None,P4),
 ('f58e56ac',['drake','dknight','dmage','salam'],None,None,P4),
 ('407db3fa','bossWitch',None,None,['idle','prep','atk','hit','spe','laugh','rage','blast','ko']),
 ('fc29f8fe','bossDragon',None,None,['idle','prep','atk','hit','blast','fly','dive','stun','ko']),
 ('e52f1a2c','bossHag',None,None,['idle','prep','atk','hit','spe','heal','laugh','rage','ko']),
 ('3c37521f','bossQueen',None,None,['idle','prep','atk','hit','freeze','spe','blast','rage','ko']),
 ('7d4b7035','bossVoid',None,None,['idle','prep','atk','hit','ghost','spe','blast','rage','ko']),
 ('949fdaee','bossLich',None,None,['idle','prep','atk','hit','spe','blast','rage','revive','ko']),
 ('58fc445d','bossVamp',None,None,['idle','prep','atk','hit','bite','spe','rage','blast','ko']),
 ('e2661fe6','bossRat',None,None,['idle','prep','atk','hit','spe','blast','rage','laugh','ko']),
 ('067a2e7d','bossVort',None,None,['idle','prep','atk','hit','break','spe','blast','rage','ko']),
 ('699a2297','bossBone',None,None,['idle','prep','atk','hit','spe','laugh','rage','blast','ko']),
]
def cells(fid,W,H,rows):
    if fid=='699a2297':
        ys=[0,470,950,H]; return [(c*W//3,ys[r],(c+1)*W//3,ys[r+1]) for r in range(3) for c in range(3)]
    if isinstance(rows,list):
        out=[]
        for r in range(4):
            n=5 if (fid=='66d15f30' and r==3) else 4
            out+= [(c*W//n,r*H//4,(c+1)*W//n,(r+1)*H//4) for c in range(n)]
        return out
    return [(c*W//3,r*H//3,(c+1)*W//3,(r+1)*H//3) for r in range(3) for c in range(3)]
info={}
for fid,keys,_,_,poses in SHEETS:
    im=np.asarray(Image.open(U+fid+'-image.jpg').convert('RGB')).astype(float); H,W,_=im.shape
    bg=np.median(np.concatenate([im[:6].reshape(-1,3),im[-6:].reshape(-1,3),im[:,:6].reshape(-1,3),im[:,-6:].reshape(-1,3)]),0)
    d=np.sqrt(((im-bg)**2).sum(2)); sat=im.max(2)-im.min(2); lum=im.mean(2)
    fg=d>35
    if fid=='699a2297': fog=(sat<28)&(lum>55)&(lum<235); fg&=~fog
    # drop text glyphs: small, dark, unsaturated components
    l0,n0=ndi.label(fg); ob=ndi.find_objects(l0)
    ms=ndi.mean(sat,l0,range(1,n0+1)); ml=ndi.mean(lum,l0,range(1,n0+1))
    txt=[i+1 for i in range(n0) if (ob[i][0].stop-ob[i][0].start)<0.034*H and ms[i]<30 and ml[i]<140]
    fg&=~np.isin(l0,txt)
    lab,n=ndi.label(ndi.binary_dilation(fg,iterations=5)); lab=lab*fg
    area=ndi.sum(fg,lab,range(1,n+1)); com=ndi.center_of_mass(fg,lab,range(1,n+1)); obj=ndi.find_objects(lab)
    cl=cells(fid,W,H,keys)
    names=[]
    if isinstance(keys,list):
        for r,k in enumerate(keys):
            ps=['idle','prep','atk','hit','ko'] if (fid=='66d15f30' and r==3) else poses
            names+=[k if p=='idle' else k+'_'+p for p in ps]
    else: names=[keys if p=='idle' else keys+'_'+p for p in poses]
    for (x0,y0,x1,y1),nm in zip(cl,names):
        cand=[i for i in range(n) if area[i]>0 and x0<=com[i][1]<x1 and y0<=com[i][0]<y1]
        if not cand: print('MISSING',nm); continue
        best=max(cand,key=lambda i:area[i])
        keep=[best]+[i for i in cand if i!=best and area[i]>0.04*area[best]]
        m=np.isin(lab,[i+1 for i in keep])
        ys,xs=np.where(m); Y0,Y1,X0,X1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        rgba=np.dstack([im,m*255.0])[Y0:Y1,X0:X1].astype(np.uint8)
        Image.fromarray(rgba).save(f'a7/raw/{nm}.png')
        info[nm]=dict(fid=fid,box=[int(X0),int(Y0),int(X1),int(Y1)],parts=len(keep))
json.dump(info,open('a7/info.json','w'))
print(len(info))
