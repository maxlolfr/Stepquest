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

OL=np.array([22,16,26.])
CLIP={'scorp_ko':(0,0,1,.59),'bossVoid_prep':(.12,0,1,1),'bossQueen_rage':(0,0,.82,1),'bossWitch_laugh':(0,0,1,.82),
 'bossRat_laugh':(0,0,.75,1),'bossVort_prep':(.13,0,1,1),'dknight_hit':(.2,0,1,1),'bossDragon_stun':(0,0,.78,1),'bossQueen_ko':(.12,0,1,1),'bossHag_atk':(.02,0,1,1),'bossVamp_atk':(.08,0,1,1),'bossVamp_spe':(.18,0,1,1),'bossVamp_blast':(.26,0,1,1),
 'bossBone':(0,0,.76,1),'bossBone_prep':(.19,0,.62,1),'bossBone_atk':(0,0,1,.93),'bossBone_laugh':(.27,0,1,1),'bossBone_spe':(0,.1,.8,1)}
DROP={'bossHag_prep','bossVamp_prep','bossLich_prep','bossVoid_ko','bossLich_revive','bossVamp_bite','bossVort_ko','dknight_atk','werewolf_hit','bossBone_hit'}
NOFLIP={'wolf','wolf_ko','snake','snake_atk','snake_hit','bossDragon','bossDragon_prep','bossDragon_blast','bossDragon_dive','bossDragon_stun','bossDragon_ko'}
import os
meta=json.load(open('a7/meta.json')) if os.path.exists('a7/meta.json') else {}; body={}
ONLY=sys.argv[1:] 
for fid,keys,_,_,poses in SHEETS:
    if ONLY and fid not in ONLY: continue
    im=np.asarray(Image.open(U+fid+'-image.jpg').convert('RGB')).astype(float); H,W,_=im.shape
    bg=np.median(np.concatenate([im[:6].reshape(-1,3),im[-6:].reshape(-1,3),im[:,:6].reshape(-1,3),im[:,-6:].reshape(-1,3)]),0)
    d=np.sqrt(((im-bg)**2).sum(2)); sat=im.max(2)-im.min(2); lum=im.mean(2)
    fg=d>35
    if fid=='699a2297': fg&=~((sat<24)&(lum>70))
    l0,n0=ndi.label(fg); ob=ndi.find_objects(l0)
    ms=ndi.mean(sat,l0,range(1,n0+1)); ml=ndi.mean(lum,l0,range(1,n0+1))
    txt=[i+1 for i in range(n0) if (ob[i][0].stop-ob[i][0].start)<0.034*H and ms[i]<30 and ml[i]<140]
    fg&=~np.isin(l0,txt)
    cl=cells(fid,W,H,keys); names=[]
    if isinstance(keys,list):
        for r,k in enumerate(keys):
            ps=['idle','prep','atk','hit','ko'] if (fid=='66d15f30' and r==3) else poses
            names+=[k if p=='idle' else k+'_'+p for p in ps]
    else: names=[keys if p=='idle' else keys+'_'+p for p in poses]
    for (x0,y0,x1,y1),nm in zip(cl,names):
        if nm in DROP: continue
        cw,ch=x1-x0,y1-y0
        if nm in CLIP: a,b,c,e=CLIP[nm]; X0,Y0,X1,Y1=int(x0+a*cw),int(y0+b*ch),int(x0+c*cw),int(y0+e*ch)
        else: mg=int(0.015*W); X0,Y0,X1,Y1=max(0,x0-mg),max(0,y0-mg//2),min(W,x1+mg),min(H,y1+mg//2)
        sub=np.zeros_like(fg); sub[Y0:Y1,X0:X1]=fg[Y0:Y1,X0:X1]
        lab,n=ndi.label(ndi.binary_dilation(sub,iterations=3)); lab=lab*sub
        if n==0: print('EMPTY',nm); continue
        area=ndi.sum(sub,lab,range(1,n+1)); objs=ndi.find_objects(lab); best=int(np.argmax(area))
        bs=objs[best]; keep=[best]
        for i in range(n):
            if i==best or area[i]<0.03*area[best] or objs[i] is None: continue
            s_=objs[i]
            if s_[0].start<bs[0].stop and s_[0].stop>bs[0].start and s_[1].start<bs[1].stop and s_[1].stop>bs[1].start: keep.append(i)
        m=np.isin(lab,[i+1 for i in keep])
        r_,g_,b_=im[...,0],im[...,1],im[...,2]
        CM={'red':(r_>110)&(g_<95)&(b_<95)&(r_>g_+50),'green':(g_>r_+40)&(g_>b_+10),'white':(lum>190)&(sat<35),'purple':(r_>g_+25)&(b_>g_+25),'cyan':(g_>r_+40)&(b_>g_-35)}
        FILT={'frog_hit':['red'],'frog_ko':['red'],'vine':['red'],'vine_atk':['red'],'prat':['red'],'harpy_ko':['green'],'ghoul_atk':['white','purple'],'ghoul_ko':['white','purple'],
              'lich_hit':['purple'],'lich_ko':['purple'],'wisp_hit':['red'],'bossBone_atk':['cyan']}
        fl=FILT.get(nm,[])
        if fl:
            for f_ in fl: m&=~CM[f_]
            m=ndi.binary_opening(m,iterations=2); c3,c3n=ndi.label(m)
            if c3n: c3s=ndi.sum(m,c3,range(1,c3n+1)); m=np.isin(c3,[j+1 for j in range(c3n) if c3s[j]>0.15*c3s.max()])
        holes=ndi.binary_fill_holes(m)&~m; hl,hn=ndi.label(holes); hs=ndi.sum(holes,hl,range(1,hn+1)) if hn else []
        if hn: m|=np.isin(hl,[j+1 for j in range(hn) if hs[j]<60])
        m=ndi.binary_opening(m,iterations=1)
        cl2,cn=ndi.label(m); cs=ndi.sum(m,cl2,range(1,cn+1)); m=np.isin(cl2,[j+1 for j in range(cn) if cs[j]>0.04*cs.max()])
        m=ndi.binary_erosion(m,iterations=1)
        a=m.astype(float); rgb=im.copy()
        e=m&~ndi.binary_erosion(m,iterations=1); rgb[e]=rgb[e]*0.55+OL*0.45
        light=m&(lum>175)&(sat<90); darkm=m&~light
        ring=ndi.binary_dilation(darkm,iterations=2)&~m; soft=ndi.binary_dilation(darkm,iterations=3)&~ndi.binary_dilation(darkm,iterations=2)&~m
        rgb[ring]=OL; a[ring]=1; rgb[soft]=OL; a[soft]=0.45
        le=light&~ndi.binary_erosion(m,iterations=3); a[le]=np.clip((d[le]-20)/90,0.15,1); rgb[e&light]=im[e&light]
        # body = non-glow pixels (unless the creature is itself mostly glow)
        glow=m&(lum>150)&(sat>70)
        bm=m&~glow if glow.sum()<0.45*m.sum() else m
        ys,xs=np.where(a>0); Y0,Y1,X0,X1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        by,bx=np.where(bm); bb=min(Y1,by.max()+int(0.012*H))  # crop ground glow below the feet
        rgba=np.dstack([rgb,a*255])[Y0:bb,X0:X1].astype(np.uint8)
        bxm=float(np.median(bx))-X0; wimg=X1-X0
        if nm not in NOFLIP: rgba=rgba[:,::-1].copy(); bxm=wimg-bxm
        meta[nm]=dict(h=int(bb-Y0),bh=int(by.max()-by.min()),ax=round(bxm/wimg,3))
        I=Image.fromarray(rgba); I.save(f'a7/out/{nm}.png')
        s=520/max(I.size); I=I.resize((max(1,round(I.size[0]*s)),max(1,round(I.size[1]*s))),Image.LANCZOS) if s<1 else I
        I.save(f'a7/out/{nm}.webp',quality=88)
json.dump(meta,open('a7/meta.json','w'))
P={}
for nm,v in meta.items():
    base=nm.split('_')[0]
    if base not in meta: continue
    P[nm]=[round(v['h']/meta[base]['bh'],3),v['ax']]
json.dump(P,open('a7/posem.json','w')); print(len(P))
