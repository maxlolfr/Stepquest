const f=process.argv[2]; const d=JSON.parse(require('fs').readFileSync(f)).filter(x=>x.mode==='');
for(let w=0;w<10;w++){ const a=d.filter(x=>x.w===w); if(!a.length) continue; const m=a.filter(x=>!x.boss), b=a.filter(x=>x.boss);
 console.log(w,'mob',(m.filter(x=>x.res==='win').length/m.length*100).toFixed(0)+'%','n',m.length,'boss',b.filter(x=>x.res==='win').length+'/'+b.length,'lvl',Math.min(...a.map(x=>x.lvl))+'-'+Math.max(...a.map(x=>x.lvl)),'turns',(a.reduce((s,x)=>s+x.turns,0)/a.length).toFixed(1)); }
