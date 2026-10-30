import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

export class StudioStore {
  constructor(file) { this.file=file; this.data={projects:[{id:'infinite-dungeon',name:'Infinite Dungeon',repository:'maxlolfr/Stepquest',branch:'wip/infinite-dungeon-0.7',path:'prototype/infinite-dungeon/'}],missions:[]}; }
  async load() { try { const parsed=JSON.parse(await readFile(this.file,'utf8')); if(!Array.isArray(parsed.projects)||!Array.isArray(parsed.missions)) throw Error('Invalid data'); this.data=parsed; } catch(e) { if(e.code!=='ENOENT') throw e; await this.save(); } return this; }
  async save() { await mkdir(dirname(this.file),{recursive:true}); const tmp=this.file+'.'+randomUUID()+'.tmp'; await writeFile(tmp,JSON.stringify(this.data,null,2)); await rename(tmp,this.file); }
  listProjects(){return this.data.projects;}
  listMissions(){return this.data.missions;}
  async addProject(input) {
    const name=typeof input?.name==='string'?input.name.trim():'';
    if(name.length<2||name.length>100) throw Error('Nom de projet invalide (2–100 caractères)');
    const project={id:randomUUID(),name,repository:'',branch:'',path:''};
    this.data.projects.push(project); await this.save(); return project;
  }
  async addMission(input) {
    const prompt=typeof input?.prompt==='string'?input.prompt.trim():'';
    if(!prompt||prompt.length>2000) throw Error('Mission invalide (1–2000 caractères)');
    if(!this.data.projects.some(p=>p.id===input.projectId)) throw Error('Projet inconnu');
    const mission={id:randomUUID(),projectId:input.projectId,prompt,status:'en attente',createdAt:new Date().toISOString(),note:'Mission enregistrée. Aucun agent IA connecté.'};
    this.data.missions.unshift(mission); await this.save(); return mission;
  }
}
