global.HEAD=require('fs').readFileSync('t14head.js','utf8'); eval(HEAD);
const cls=process.argv[2], RUNS=+process.argv[3]||1, out=[];
(async()=>{
 for(let run=0; run<RUNS; run++){
  localStorage._s={}; const G=api.G; Object.assign(G,{lvl:1,xp:0,gold:30,potions:3,stars:{},inv:[],eq:{},mats:{},nextId:2,welcomed:true,test:false}); api.setHero(cls); G.hp=api.stats().hp;
  let attempts=0, grind=false;
  const playLevel=async(w,i,mode)=>{
    G.energy=99; const m=api.stats().hp; if(G.hp<m*0.6){ const ic=15+6*G.lvl; if(G.gold>=ic+20){G.gold-=ic;G.hp=m;} else G.hp=Math.min(m,G.hp+Math.round(m*0.35)); }
    globalThis.__sel=mode; api.startLevel(w,i); let F=api.F, cur=null, rec=null, guard=0, res=null;
    const close=()=>{ if(rec){ out.push(rec); rec=null; } };
    while(guard++<800){
      F=api.F; if(!F) break;
      if(F.foe!==cur){ close(); cur=F.foe; rec={cls,w,i,mode,boss:!!cur.boss,lvl:G.lvl,turns:0,ex:0,def:0,defLoss:0,res:'?'}; }
      if(!els.modal.hidden){ const body=els.mBody.innerHTML; const m2=body.match(/data-mequip="(\d+)"/);
        if(m2){ const it=G.inv.find(x=>x.id==+m2[1]); const c=G.inv.find(x=>x.id===G.eq[it.slot]); const sc=o=>{const s=api.itemStats(o);return (s.atk||0)*2+(s.def||0)*2+(s.hp||0)*0.5+(s.mag||0)*1.5}; if(!c||sc(it)>sc(c)) api.equip(it.id); }
        if(body.includes('data-next')){ rec.res='win'; rec.hp=G.hp/api.stats().hp; rec.st=F.st; close(); els.modal.hidden=true; docL.click({target:{closest:(s)=> s==='button'?{dataset:{next:'1'},closest:()=>({})}:null}}); continue; }
        res=els.mRib.textContent.includes('réussi')?'win':'lose'; if(rec){ rec.res=res; rec.hp=G.hp/api.stats().hp; rec.st=F.st; } close(); els.modal.hidden=true; docL.click({target:{closest:(s)=> s==='button'?{dataset:{home:'1'},closest:()=>({})}:null}}); break; }
      const s=api.stats(), can=id=>F.mp>=api.SPELLS[id].cost, stc=id=>api.stCost(id);
      let k;
      if (G.hp < s.hp*0.35) k = (cls==='mage'&&can('heal')) ? 'heal' : (G.potions>0?'pot':'def');
      else if (F.foe.charging||F.foe.howl) k='def';
      else if (cls==='guerrier') k = (!F.buff&&can('roar'))?'roar':can('whirl')?'whirl':'atk';
      else if (cls==='archer') k = (!F.foeSt.poison&&can('venom'))?'venom':can('rain')?'rain':'atk';
      else if (cls==='paladin') k = (!F.aegis&&can('aegis')&&G.hp<s.hp*0.75)?'aegis':can('smite')?'smite':'atk';
      else if (cls==='rogue') k = (!F.shadowCrit&&can('shadow'))?'shadow':can('blades')?'blades':'atk';
      else k = can('frost')&&!F.foeSt.frozen?'frost':can('fire')?'fire':'atk';
      if(k!=='atk' && F.st<stc(k)) k=(k==='def'&&G.potions>0&&G.hp<s.hp*0.5)?'pot':'atk';
      if(k==='atk' && F.st<10) rec.ex++;
      const hb=G.hp; rec.turns++; await api.act(k); if(k==='def'){ rec.def++; rec.defLoss+=Math.max(0,hb-G.hp)/s.hp; }
    }
    close(); return res;
  };
  while(api.nextLevel() && attempts<500){ attempts++; let [w,i]=api.nextLevel(); if(grind){grind=false; if(i>0)i--; else if(w>0){w--;i=4;}}
    const r=await playLevel(w,i,''); if(r==='lose') grind=true;
    while(G.potions<3 && G.gold>=20+2*G.lvl){ G.gold-=20+2*G.lvl; G.potions++; } }
  // heroic pass on every boss after the campaign
  for(let w=0;w<8;w++) for(let t=0;t<3;t++){ const r=await playLevel(w,4,'h'); if(r==='win') break; }
 }
 require('fs').writeFileSync(`sim_${cls}.json`, JSON.stringify(out));
 console.log(cls,'battles',out.length);
})();
