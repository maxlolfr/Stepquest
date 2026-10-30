import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StudioStore } from '../store.js';

test('multi-project persistence and mission validation', async () => {
  const dir=await mkdtemp(join(tmpdir(),'game-studio-'));
  try {
    const file=join(dir,'studio.json');
    const store=await new StudioStore(file).load();
    assert.equal(store.listProjects()[0].id,'infinite-dungeon');
    const project=await store.addProject({name:'Second game'});
    const mission=await store.addMission({projectId:project.id,prompt:'Build a title screen'});
    assert.equal(mission.status,'en attente');
    const reloaded=await new StudioStore(file).load();
    assert.equal(reloaded.listProjects().length,2);
    assert.equal(reloaded.listMissions()[0].prompt,'Build a title screen');
    await assert.rejects(()=>store.addMission({projectId:'unknown',prompt:'hello'}),/Projet inconnu/);
    await assert.rejects(()=>store.addProject({name:' '}),/invalide/);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
