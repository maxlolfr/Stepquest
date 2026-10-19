for (const dir of ['']) for (const c of process.argv[2]?process.argv[2].split(','):['guerrier','archer','mage']) { const d=JSON.parse(require('fs').readFileSync(dir+'sim_'+c+'.json'));
  const n=d.filter(x=>x.mode===''), w=n.filter(x=>x.res==='win').length, bl=n.filter(x=>x.boss), bw=bl.filter(x=>x.res==='win').length;
  const late=bl.filter(x=>x.w>=5), lw=late.filter(x=>x.res==='win').length, h=d.filter(x=>x.mode==='h'&&x.boss), hw=h.filter(x=>x.res==='win').length;
  const tt=n.reduce((a,x)=>a+x.turns,0)/n.length;
  console.log((dir||'2.2 ').padEnd(7),c.padEnd(9),'battles',n.length,'win',(w/n.length*100).toFixed(1)+'%','boss',bw+'/'+bl.length,'late boss',lw+'/'+late.length,'heroic boss',hw+'/'+h.length,'avg turns',tt.toFixed(1),'endLvl',Math.max(...d.map(x=>x.lvl))); }
