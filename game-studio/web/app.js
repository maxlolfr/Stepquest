const $=s=>document.querySelector(s);
const feedback=$('#feedback');
function element(tag,content,className){const el=document.createElement(tag);el.textContent=content;if(className)el.className=className;return el;}
async function api(url,body){const r=await fetch(url,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{});const data=await r.json();if(!r.ok)throw Error(data.error||'Erreur réseau');return data;}
async function refresh(){
 try{
  const data=await api('/api/status');
  $('#projects').replaceChildren();$('#project-select').replaceChildren();
  for(const p of data.projects){
    const item=element('div',p.name,'mission');$('#projects').append(item);
    const option=document.createElement('option');option.value=p.id;option.textContent=p.name;$('#project-select').append(option);
  }
  $('#agents').replaceChildren();
  for(const a of data.agents){const card=element('div','','agent');card.append(element('strong',a.name),element('small',a.role),element('div','Non connecté','status'));$('#agents').append(card);}
  $('#missions').replaceChildren();
  if(!data.missions.length)$('#missions').append(element('p','Aucune mission enregistrée.','muted'));
  for(const m of data.missions){
    const project=data.projects.find(p=>p.id===m.projectId);
    const card=element('div','','mission');
    card.append(element('strong',m.prompt),element('p',(project?.name||'Projet inconnu')+' · '+m.status+' · '+m.note,'muted'));
    $('#missions').append(card);
  }
 }catch(e){feedback.textContent=e.message;}
}
$('#project-form').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/projects',{name:$('#project-name').value});$('#project-name').value='';feedback.textContent='Projet créé.';await refresh();}catch(e){feedback.textContent=e.message;}});
$('#mission-form').addEventListener('submit',async e=>{e.preventDefault();try{await api('/api/missions',{projectId:$('#project-select').value,prompt:$('#prompt').value});$('#prompt').value='';feedback.textContent='Mission enregistrée, sans exécution IA.';await refresh();}catch(e){feedback.textContent=e.message;}});
refresh();
