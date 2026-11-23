/* V5 demo registry persistence. One versioned, non-sensitive browser-local record.
 * Never sends data to Paperclip, production or external services.
 */
const KEY='volkovitsky-public-preview-v3-catalog-v1';
export function loadDemoCatalog(storage=globalThis.localStorage){
  try{
    const raw=storage?.getItem(KEY);if(!raw)return null;
    const v=JSON.parse(raw);
    if(v.version!==1||!Array.isArray(v.projects)||!Array.isArray(v.agents)||
       v.projects.length>100||v.agents.length>400)return null;
    return {
      projects:v.projects.filter(p=>typeof p?.name==='string'&&p.name.length<=56).slice(0,100),
      agents:v.agents.filter(a=>typeof a?.name==='string'&&typeof a?.projectId==='string'&&a.name.length<=40).slice(0,400)
    };
  }catch{return null}
}
export function saveDemoCatalog(world,storage=globalThis.localStorage){
  try{
    const data={
      version:1,projects:world.projects.slice(5).map(p=>({id:p.id,name:p.name,subtitle:p.subtitle})),
      agents:world.agents.slice(6).map(a=>({id:a.id,name:a.name,projectId:a.projectId,
        color:a.color,variant:a.variant}))
    };
    storage?.setItem(KEY,JSON.stringify(data));
    return true;
  }catch{return false}
}
export function restoreDemoCatalog(world,storage=globalThis.localStorage){
  const backup=loadDemoCatalog(storage);if(!backup)return {projects:0,agents:0};
  let projects=0,agents=0;
  for(const project of backup.projects){
    try{
      if(world.projects.some(p=>p.id===project.id))continue;
      world.addProject(project.name,{id:project.id,subtitle:project.subtitle,silent:true});projects++;
    }catch{}
  }
  for(const agent of backup.agents){
    try{
      if(world.agents.some(a=>a.id===agent.id))continue;
      world.addAgent(agent.name,agent.projectId,{id:agent.id,
        color:agent.color,variant:agent.variant,silent:true});agents++;
    }catch{}
  }
  return {projects,agents};
}
