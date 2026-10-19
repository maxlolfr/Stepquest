const { chromium } = require('playwright');
(async()=>{ const b=await chromium.launch(); const errs=[]; const p=await b.newPage({viewport:{width:+process.argv[3]||390,height:+process.argv[4]||844}}); p.on('pageerror',e=>errs.push(e.message));
 await p.goto('file://'+process.argv[2]+'/index.html');
 await p.evaluate(()=>{ const story={}; for(let w=0;w<10;w++){story['in'+w]=1;story['out'+w]=1;} localStorage.setItem('dragonbound.v2',JSON.stringify({v22:1,v40:1,v50:1,seen30:1,seen40:1,seen50:1,seen51:1,test:true,cls:'guerrier',welcomed:true,introSeen:true,lvl:20,xp:0,energy:50,gold:100,stars:{'0-0':3},mats:{},nextId:20,potions:3,story,daily:{last:new Date().toISOString().slice(0,10),streak:1},inv:[],eq:{}})); });
 await p.reload(); await p.waitForTimeout(1200); const c=await p.$('#modal:not([hidden]) [data-close]'); if(c) await c.click();
 await p.evaluate(()=>document.querySelector('[data-v="adv"]').click()); await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelector('.node[data-level="0-2"]').click()); await p.waitForTimeout(300);
 await p.evaluate(()=>document.querySelector('#modal [data-start="0-2"]').click()); await p.waitForTimeout(600);
 const waves=JSON.parse(process.argv[5]);
 for(let k=0;k<waves.length;k++){ const [w,keys]=waves[k];
   await p.evaluate(([w,keys])=>{ const F=__d.F; F.w=w; __d.lw(w); F.bg=__d.bgKey(w,2); __d.loadBg(F.bg); F.rooms[F.room]=keys; __d.nf(); document.querySelector('.celebrate, .cel')&&0; },[w,keys]);
   await p.waitForTimeout(1500); await p.mouse.click(5,5); await p.waitForTimeout(400); await p.mouse.click(5,5); await p.waitForTimeout(400); await p.screenshot({path:'v_'+k+'.png'}); }
 console.log(errs.slice(0,3)); await b.close(); })();
