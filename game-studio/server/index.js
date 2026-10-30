import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { StudioStore } from './store.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../web');
const store=await new StudioStore(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'data/studio.json')).load();
const agents=[
  {id:'chef',name:'Chef',role:'Orchestration'},
  {id:'hugo',name:'Hugo',role:'Game design'},
  {id:'lea',name:'Léa',role:'Programmation'},
  {id:'malo',name:'Malo',role:'Graphismes'},
  {id:'zoe',name:'Zoé',role:'QA'},
  {id:'ines',name:'Inès',role:'GitHub'}
];
function send(res,status,data){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(data));}
async function body(req){
  let raw='';
  for await(const chunk of req){raw+=chunk;if(raw.length>8192)throw Error('Requête trop longue');}
  try{return JSON.parse(raw);}catch{throw Error('JSON invalide');}
}
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(req.method==='GET'&&url.pathname==='/api/status')return send(res,200,{mode:'prototype',agents,projects:store.listProjects(),missions:store.listMissions()});
  if(req.method==='POST'&&(url.pathname==='/api/projects'||url.pathname==='/api/missions')){
    try {
      const input=await body(req);
      const result=url.pathname==='/api/projects'?await store.addProject(input):await store.addMission(input);
      return send(res,201,result);
    }catch(e){return send(res,400,{error:e.message});}
  }
  if(req.method!=='GET')return send(res,405,{error:'Méthode interdite'});
  const routes={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  const file=routes[url.pathname];
  if(!file)return send(res,404,{error:'Introuvable'});
  try {
    const data=await readFile(path.join(root,file));
    const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html';
    res.writeHead(200,{'content-type':type+'; charset=utf-8','x-content-type-options':'nosniff'});
    res.end(data);
  }catch{send(res,500,{error:'Erreur de lecture'});}
});
server.listen(Number(process.env.PORT)||3000,'127.0.0.1',()=>console.log('Game Studio AI ready'));
