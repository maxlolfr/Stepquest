const fs=require('fs');
const html=fs.readFileSync('dragonbound.html','utf8');
const js=html.slice(html.lastIndexOf('<script>')+8, html.lastIndexOf('</script>'));
var els={};
const ctxStub=()=>new Proxy({}, {get:(t,k)=> (k==='createLinearGradient'||k==='createRadialGradient') ? ()=>({addColorStop(){}}) : (typeof k==='string' ? (t[k]!==undefined?t[k]:()=>{}) : undefined), set:(t,k,v)=>{t[k]=v;return true}});
function mk(id){ return {id,hidden:false,style:{},dataset:{},textContent:'',innerHTML:'',disabled:false,className:'',classList:{add(){},remove(){},toggle(){}},
  addEventListener(t,f){ (this._l=this._l||{})[t]=f; }, setAttribute(){}, getBoundingClientRect(){return{width:360,height:300}}, clientWidth:360, clientHeight:300,
  getContext:ctxStub, scrollIntoView(){}, closest(){return null}, append(){}, appendChild(){}, remove(){}, play(){return Promise.resolve()}, pause(){}, load(){}, setAttribute(){}, insertAdjacentHTML(){}, style:{setProperty(){}}, querySelector(q){ return q==='.pe'?null:Object.assign(mk('q'),{src:''}); }, querySelectorAll(){return []}, width:0, height:0 }; }
function el(id){ return els[id]||(els[id]=mk(id)); }
var docL={};
global.document={getElementById:el, querySelectorAll:()=>[], querySelector:()=>null, addEventListener(t,f){docL[t]=f}, body:{style:{},appendChild(){}}, documentElement:{}, createElement:()=>mk('c'), visibilityState:'visible'};
global.window={matchMedia:()=>({matches:true}), devicePixelRatio:1, addEventListener(){}, scrollTo(){}};
global.Image=class{ set src(v){ this.complete=true; this.naturalWidth=100; this.naturalHeight=100; } };
global.localStorage={_s:{},getItem(k){return this._s[k]||null},setItem(k,v){this._s[k]=v}};
global.performance={now:()=>Date.now()};
global.requestAnimationFrame=()=>{};
global.setInterval=()=>0;
const wrapped = js.replace("const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms));","const wait = ms => Promise.resolve();")
  .replace("if (auto) setTimeout(close, auto);","res();").replace("el.addEventListener('click', nextL); nextL();","res();").replace("const lv = WORLDS[w].levels[i], MD = MODES.find(m => m.id === (modeOpen(w, selMode) ? selMode : ''))","if (globalThis.__sel != null) selMode = globalThis.__sel; const lv = WORLDS[w].levels[i], MD = MODES.find(m => m.id === (modeOpen(w, selMode) ? selMode : ''))")
  .replace("async function chestFx(it, chestKey, chestEmoji) {","async function chestFx(it, chestKey, chestEmoji) { return;")
  .replace("  function loop(t)", "  globalThis.__api={startLevel, act, foeTurn, nextFoe, endRun, dmgCalc, stCost, BLOCK, ST_MAX, M, get fx(){return fx}, get F(){return F}, get G(){return G}, WORLDS, stats, itemStats, equip, nextLevel, render, setHero, SPELLS, rollItem, makeWeapon, MODES, win, kAt, diceOf, rollRarity};\n  function loop(t)");
eval(wrapped);
var api=globalThis.__api;
el("modal").hidden=true;
