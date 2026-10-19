import sys
idx=open(sys.argv[1]).read().split('\n'); src=open(sys.argv[2]).read().split('\n')
i3=idx.index(src[2]); head=idx[:i3]
se=src.index('</style>'); ie=idx.index('</style>',i3)
ib=idx.index('<body>'); mid=idx[ie+1:ib+1]
ilast=max(i for i,l in enumerate(idx) if l=='</script>' and idx[i+1]=='<script>')
tail=idx[ilast+1:]
b=src[se+1:]
if b and b[0]=='': b=b[1:]
out=head+src[2:se+1]+mid+b
if out[-1]=='': out=out[:-1]
out+=tail
open(sys.argv[3],'w').write('\n'.join(out))
