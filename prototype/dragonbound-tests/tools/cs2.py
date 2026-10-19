import json
from PIL import Image, ImageDraw
P=json.load(open('a7/posem.json'))
ents={}
for n in P: ents.setdefault(n.split('_')[0],[]).append(n)
ents=list(ents.items())
S=150; per=12
for p in range(0,len(ents),per):
    ch=ents[p:p+per]; C=max(len(v) for _,v in ch)
    cs=Image.new('RGB',(C*S,len(ch)*(S+14)),(45,50,65)); dr=ImageDraw.Draw(cs)
    for r,(e,ns) in enumerate(ch):
        y0=r*(S+14)
        for c,n in enumerate(ns):
            g=Image.open(f'a7/out/{n}.png'); rh=P[n][0]*S*0.8; f=rh/g.size[1]; g=g.resize((max(1,int(g.size[0]*f)),max(1,int(g.size[1]*f))))
            cx=c*S+S//2; x=int(cx-g.size[0]*P[n][1]); cs.paste(g,(x,y0+S-g.size[1]),g); dr.line([(cx,y0),(cx,y0+S)],fill=(255,80,80)); dr.line([(c*S,y0+S),(c*S+S,y0+S)],fill=(255,255,0))
            dr.text((c*S+2,y0+S+1),n,fill='yellow')
    cs.save(f'a7/rf{p//per}.png')
print(len(ents))
