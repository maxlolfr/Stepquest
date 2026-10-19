global.HEAD=require('fs').readFileSync('t14head.js','utf8'); eval(HEAD);
const R=Math.random; let pass=0, fail=0; const ok=(c,msg)=>{ if(c){pass++;} else {fail++; console.log('FAIL', msg);} };
(async()=>{
  const G=api.G; G.welcomed=true; G.lvl=10;
  const fresh=(cls)=>{ G.story={}; for(let w=0;w<8;w++){G.story['in'+w]=1;G.story['out'+w]=1;} api.setHero(cls); G.hp=api.stats().hp; G.energy=99; G.test=true; api.startLevel(0,0); const F=api.F; F.foes=[F.foe]; F.foe.role=''; F.foe.vtrait=null; F.foe.tint=null; F.foe.trait=null; F.foe.special=null; F.foe.hp=F.foe.hpMax=1e9; return F; };
  // A. costs
  for (const [cls,exp] of [['guerrier',15],['archer',12],['mage',12]]) { api.setHero(cls); ok(api.stCost('def')===exp, `def cost ${cls}`); }
  ok(api.stCost('atk')===10 && api.stCost('whirl')===15 && api.stCost('rain')===15 && api.stCost('fire')===0, 'action costs');
  // B. endurance edge cases
  let F=fresh('guerrier');
  F.st=0; const hp0=F.foe.hp; await api.act('atk'); ok(F.st===7, `winded attack keeps 0 then +7 (got ${F.st})`); ok(F.foe.hp<hp0, 'winded attack still hits');
  F.st=9; await api.act('atk'); ok(F.st===7, `st 9 -> 0 -> 7 (got ${F.st})`);
  F.st=10; await api.act('atk'); ok(F.st===7, `exact cost 10 -> 0 -> 7 (got ${F.st})`);
  F.st=99; await api.act('atk'); ok(F.st===96, `99-10+7 = 96 (got ${F.st})`);
  F.st=14; const before=G.hp; await api.act('def'); ok(F.st===14 && !F.busy && G.hp===before, 'block refused without enough endurance');
  F.st=14; F.mp=99; await api.act('whirl'); ok(F.st===14, 'whirl refused at 14');
  let minSt=999; F.mp=1e6; for(let i=0;i<30;i++){ await api.act(F.st>=15?'whirl':'atk'); minSt=Math.min(minSt,F.st); } ok(minSt>=0, 'never negative over 30 turns');
  F.st=100; F.busy=true; await api.act('atk'); ok(F.st===100, 'input ignored while busy'); F.busy=false;
  F.st=60; await api.act('def'); ok(F.st===63, `block: 60-15+18 = 63 (got ${F.st})`);
  // C. warrior shield 75%
  const raw=(F)=>{ const s=api.stats(); return Math.max(1, Math.round(F.foe.atk*(0.85+0.3*0.5)-s.def*0.6)); };
  F=fresh('guerrier'); Math.random=()=>0.5; F.defending=true; let h=G.hp; await api.foeTurn(); ok(h-G.hp===Math.max(1,Math.round(raw(F)*0.25)), `warrior 75% (lost ${h-G.hp}, raw ${raw(F)})`); Math.random=R;
  // D. archer
  F=fresh('archer'); let dodges=0, N=20000; const base=G.hp;
  for(let i=0;i<N;i++){ G.hp=api.stats().hp; F.evading=true; const b=G.hp; await api.foeTurn(); if(b===G.hp) dodges++; }
  const p=dodges/N; ok(Math.abs(p-0.715)<0.02, `archer evade rate ${p.toFixed(3)} over ${N}`); console.log('archer evade rate', p.toFixed(4), 'n=',N);
  G.hp=api.stats().hp; Math.random=()=>0.9; F.evading=true; F.defending=true; h=G.hp; await api.foeTurn(); const rawA=Math.max(1,Math.round((F.foe.atk*1.12-api.stats().def*0.6)*1.35)); ok(h-G.hp===Math.max(1,Math.round(rawA*0.5)), `archer guard 50% (lost ${h-G.hp}, raw ${rawA})`); F.defending=false;
  G.hp=api.stats().hp; Math.random=()=>0.3; F.evading=true; h=G.hp; await api.foeTurn(); ok(h===G.hp, 'archer successful evade = 0'); Math.random=R;
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
  // 2.2 loot & dice
  { const R2=Math.random; Math.random=R; const c=[0,0,0,0,0], b=[0,0,0,0,0]; for(let i=0;i<50000;i++){ c[api.rollRarity(false,0)]++; b[api.rollRarity(true,0)]++; }
    console.log('mob rarity %', c.map(x=>(x/500).toFixed(1)).join(' / '), ' boss %', b.map(x=>(x/500).toFixed(1)).join(' / '));
    ok(c[1]>c[2] && c[2]>c[3] && c[3]>c[4] && c[4]>0, 'mob rarity: green > blue > epic > legendary');
    ok(b[3]/50000 > 4*c[3]/50000, 'boss epic odds much better');
    const h=[0,0,0,0,0]; for(let i=0;i<20000;i++) h[api.rollRarity(false,3)]++; ok(h[3]>c[3]*0.4*1.5, 'nightmare improves odds');
    const it=api.rollItem(3,false,4); ok(it.r===4 && it.name, 'forced legendary roll');
    const w=api.makeWeapon('guerrier',1,4,10); const D=api.diceOf(w); ok(D.c===17 && D.sp===0.3, `brutal legendary crit range 17-20 (got ${D.c})`);
    ok(api.kAt(1)===1 && api.kAt(24)<0.3 && api.kAt(24)>0.15, `compression k(24)=${api.kAt(24).toFixed(3)}`);
    let prev=0, mono=true; for(let L=1;L<=40;L++){ G.lvl=L; G.eq={}; const s=api.stats(); if(s.hp+s.atk<prev) mono=false; prev=s.hp+s.atk; } ok(mono, 'naked hero stats grow every level');
    Math.random=R2; }
  // 2.3 heroes
  { let F=fresh('rogue'); F.mp=99; F.foe.hp=F.foe.hpMax=1e6; const h0=G.hp; await api.act('shadow'); ok(G.hp===h0, `rogue shadow dodges the next hit (lost ${h0-G.hp})`);
    ok(F.shadowCrit===true, 'shadow keeps the crit for the next blow'); const fx0=api.fx.length; await api.act('atk'); ok(F.shadowCrit===false, 'shadow crit consumed');
    F=fresh('paladin'); F.mp=99; F.foe.hp=F.foe.hpMax=1e6; G.hp=Math.round(api.stats().hp*0.5); const b=G.hp; await api.act('aegis'); ok(F.aegis===1, `aegis lasts (left ${F.aegis})`);
    F=fresh('paladin'); F.mp=99; F.foe.hp=F.foe.hpMax=1e6; G.hp=Math.round(api.stats().hp*0.5); const fh=F.foe.hp; await api.act('smite'); ok(F.foe.hp<fh, 'smite hurts'); }
  // 3.0 resources persist between fights
  { let F=fresh('mage'); F.mp=3; F.st=40; api.endRun(false); ok(G.mp===3 && G.st===40, `mana/endurance kept after the fight (${G.mp}/${G.st})`);
    G.energy=99; api.startLevel(0,0); F=api.F; ok(F.mp===3 && F.st===40, 'next fight starts with what is left');
    G.mpots=1; await api.act('mpot'); ok(G.mpots===0 && F.mp>3, 'mana potion works'); G.spots=1; F.st=10; await api.act('spot'); ok(G.spots===0 && F.st>=90, `endurance elixir works (${F.st})`); api.endRun(false); }

  // 4.0 waves
  { const wave=(cls,keys)=>{ const F=fresh(cls); F.rooms[F.room]=keys; api.nextFoe(); for(const o of F.foes){ o.trait=null; o.special=null; o.vtrait=null; } return F; };
    ok(api.WORLDS[0].levels.length===10 && api.M[api.WORLDS[0].levels[9][0].slice(-1)[0]].boss && api.WORLDS[0].levels[4][2]==='mini', '10 rooms per world, champion in 5, boss in 10');
    let F=wave('guerrier',['rat','rat','rat']); F.mp=99; for(const o of F.foes){o.hp=o.hpMax=1e6;} await api.act('whirl'); ok(F.foes.every(o=>o.hp<1e6), 'whirl hits the whole wave');
    F=wave('guerrier',['rat','rat','rat']); for(const o of F.foes){o.hp=o.hpMax=1e6;} const R0=Math.random; Math.random=()=>0.6; const h0=G.hp; await api.foeTurn(); ok(F.foes.every(o=>o.anim.lunge>0) && G.hp<h0, 'every enemy of the wave attacks'); Math.random=R0;
    F=wave('guerrier',['slime','rat']); const sl=F.foes[0], rt=F.foes[1]; sl.role='heal'; sl.hp=sl.hpMax=1e6; rt.hpMax=1000; rt.hp=100; F.turn=0; await api.foeTurn(); ok(rt.hp>100, `healer mends a hurt ally (${rt.hp})`);
    F=wave('guerrier',['rat','skel']); F.foes[1].role='guard'; for(const o of F.foes){o.hp=o.hpMax=1e6;} F.foe=F.foes[0]; Math.random=()=>0.1; await api.act('atk'); Math.random=R0; ok(F.foes[1].hp<1e6 && F.foes[0].hp===1e6, 'guard steps in front of a single-target attack');
    F=wave('guerrier',['rat','rat']); F.foes[0].hp=1; F.foes[1].hp=F.foes[1].hpMax=1e6; F.foe=F.foes[0]; els.modal.hidden=true; await api.act('atk'); ok(F.foes[0].dead && F.foe===F.foes[1] && els.modal.hidden, 'one kill retargets, the wave goes on');
    F=wave('guerrier',['rat']); F.foes[0].hp=1; els.modal.hidden=true; await api.act('atk'); ok(!els.modal.hidden, 'clearing the wave ends the fight'); els.modal.hidden=true; }

  // 4.1 skills
  { let F=fresh('guerrier'); F.mp=99; F.foe.charging=true; await api.act('bash'); ok(F.foe.st.stun===undefined||F.foe.st.stunCd, 'charge stuns (turn skipped)'); ok(!F.foe.charging, 'charge cancels a charged attack');
    F=fresh('rogue'); const R1=Math.random; Math.random=()=>0.5; F.mp=99; F.foe.hpMax=10000; F.foe.hp=9000; let b=F.foe.hp; await api.act('assassin'); const dh=b-F.foe.hp; F.foe.hp=2000; b=2000; F.mp=99; F.st=100; await api.act('assassin'); const dl=b-F.foe.hp; Math.random=R1; ok(dl>dh*2.5, `assassinate x3 under 30% (${dh} -> ${dl})`);
    F=fresh('mage'); F.st=10; F.mp=0; await api.act('wait'); ok(F.st>=40 && F.mp>=8, `wait restores (${F.st}/${F.mp})`);
    F=fresh('paladin'); F.mp=99; F.rooms[F.room]=['rat','rat','rat']; api.nextFoe(); for(const o of F.foes){o.hp=o.hpMax=1e6;o.trait=null;o.special=null;o.role='';} await api.act('consecrate'); ok(F.foes.every(o=>o.hp<1e6), 'consecration hits the group'); }
  console.log(`unit tests: ${pass} passed, ${fail} failed`);
})();
