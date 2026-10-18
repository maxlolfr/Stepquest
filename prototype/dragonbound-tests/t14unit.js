global.HEAD=require('fs').readFileSync('t14head.js','utf8'); eval(HEAD);
const R=Math.random; let pass=0, fail=0; const ok=(c,msg)=>{ if(c){pass++;} else {fail++; console.log('FAIL', msg);} };
(async()=>{
  const G=api.G; G.welcomed=true; G.lvl=10;
  const fresh=(cls)=>{ api.setHero(cls); G.hp=api.stats().hp; G.energy=99; G.test=true; api.startLevel(0,0); const F=api.F; F.foe.trait=null; F.foe.special=null; F.foe.hp=F.foe.hpMax=1e9; return F; };
  // A. costs
  for (const [cls,exp] of [['guerrier',25],['archer',20],['mage',20]]) { api.setHero(cls); ok(api.stCost('def')===exp, `def cost ${cls}`); }
  ok(api.stCost('atk')===10 && api.stCost('whirl')===15 && api.stCost('rain')===15 && api.stCost('fire')===0, 'action costs');
  // B. endurance edge cases
  let F=fresh('guerrier');
  F.st=0; const hp0=F.foe.hp; await api.act('atk'); ok(F.st===20, `winded attack keeps 0 then +20 (got ${F.st})`); ok(F.foe.hp<hp0, 'winded attack still hits');
  F.st=9; await api.act('atk'); ok(F.st===20, `st 9 -> 0 -> 20 (got ${F.st})`);
  F.st=10; await api.act('atk'); ok(F.st===20, `exact cost 10 -> 0 -> 20 (got ${F.st})`);
  F.st=95; await api.act('atk'); ok(F.st===100, `cap at max (got ${F.st})`);
  F.st=24; const before=G.hp; await api.act('def'); ok(F.st===24 && !F.busy && G.hp===before, 'block refused without enough endurance');
  F.st=14; F.mp=99; await api.act('whirl'); ok(F.st===14, 'whirl refused at 14');
  let minSt=999; F.mp=1e6; for(let i=0;i<30;i++){ await api.act(F.st>=15?'whirl':'atk'); minSt=Math.min(minSt,F.st); } ok(minSt>=0, 'never negative over 30 turns');
  F.st=100; F.busy=true; await api.act('atk'); ok(F.st===100, 'input ignored while busy'); F.busy=false;
  F.st=60; await api.act('def'); ok(F.st===65, `block: 60-25+30 = 65 (got ${F.st})`);
  // C. warrior shield 75%
  const raw=(F)=>{ const s=api.stats(); return Math.max(1, Math.round(F.foe.atk*(0.85+0.3*0.5)-s.def*0.6)); };
  F=fresh('guerrier'); Math.random=()=>0.5; F.defending=true; let h=G.hp; await api.foeTurn(); ok(h-G.hp===Math.max(1,Math.round(raw(F)*0.25)), `warrior 75% (lost ${h-G.hp}, raw ${raw(F)})`); Math.random=R;
  // D. archer
  F=fresh('archer'); let dodges=0, N=20000; const base=G.hp;
  for(let i=0;i<N;i++){ G.hp=api.stats().hp; F.defending=true; const b=G.hp; await api.foeTurn(); if(b===G.hp) dodges++; }
  const p=dodges/N; ok(Math.abs(p-0.5)<0.02, `archer dodge rate ${p.toFixed(3)} over ${N}`); console.log('archer dodge rate', p.toFixed(4), 'n=',N);
  G.hp=api.stats().hp; Math.random=()=>0.9; F.defending=true; h=G.hp; await api.foeTurn(); const rawA=Math.max(1,Math.round(F.foe.atk*(0.85+0.3*0.9)-api.stats().def*0.6)); ok(h-G.hp===Math.max(1,Math.round(rawA*0.7)), `archer failed dodge -30% (lost ${h-G.hp}, raw ${rawA})`);
  G.hp=api.stats().hp; Math.random=()=>0.3; F.defending=true; h=G.hp; await api.foeTurn(); ok(h===G.hp, 'archer successful dodge = 0'); Math.random=R;
  // E. mage barrier
  F=fresh("mage"); Math.random=()=>0.5; G.hp=api.stats().hp; const rm=raw(F);
  F.defending=true; F.barrier=rm+50; h=G.hp; await api.foeTurn(); ok(h===G.hp && F.barrier===50, `small hit absorbed (barrier left ${F.barrier})`);
  G.hp=api.stats().hp; F.defending=true; F.barrier=Math.floor(rm/3); h=G.hp; const bar0=F.barrier; await api.foeTurn(); ok(h-G.hp===rm-bar0 && F.barrier===0, `overflow ${h-G.hp} = ${rm}-${bar0}`);
  F.foe.trait='double'; const r2=Math.max(1,Math.round(F.foe.atk*0.6*(0.85+0.3*0.5)-api.stats().def*0.6));
  G.hp=api.stats().hp; F.defending=true; F.barrier=Math.round(r2*1.5); h=G.hp; await api.foeTurn(); ok(h-G.hp===r2*2-Math.round(r2*1.5), `double hit spill ${h-G.hp} vs ${r2*2-Math.round(r2*1.5)}`); F.foe.trait=null; Math.random=R;
  // F. single damage resolution + cleanup
  F=fresh('mage'); F.mp=999; const fx0=api.fx.length; const hpb=F.foe.hp; const origFoe=api.foeTurn;
  await api.act('fire'); const nums=api.fx.slice(fx0).filter(p=>p.type==='txt' && /^-\d/.test(p.text) && p.color!=='#ff6a5a'); ok(nums.length===1, `fireball damage numbers: ${nums.length}`);
  const dealt=hpb-F.foe.hp; ok(String(dealt)===nums[0].text.slice(1), `hp loss ${dealt} matches number ${nums[0]&&nums[0].text}`);
  api.endRun(false); ok(api.fx.length===0, `fx cleared after battle (${api.fx.length} left)`);
  console.log(`unit tests: ${pass} passed, ${fail} failed`);
})();
