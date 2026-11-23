/* Collision-aware deterministic movement for isolated DEMO animation.
 * No network, task dispatch or authority over actual AI agents.
 * Never teleport agents through one another to resolve a blockage.
 */
export const PERSONAL_SPACE = 15;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function stepAlongRoute(world,actor,dt,{speed=44}={}){
  if(!actor.path.length)return {arrived:true,moved:false,blocked:false};
  const next=actor.path[0],distance=dist(next,actor);
  const maxStep=Math.max(0,dt*speed);
  const step=Math.min(distance,maxStep);
  const candidate=distance>0?{
    x:actor.x+(next.x-actor.x)*step/distance,
    y:actor.y+(next.y-actor.y)*step/distance
  }:{x:next.x,y:next.y};

  // A stationary colleague or another walker has a real footprint.
  // Only intersecting this proposed step is forbidden; unrelated workers do
  // not interrupt animation.
  const blocker=world.agents.find(other=>other!==actor&&other.floor===actor.floor&&
    dist(other,candidate)<PERSONAL_SPACE);
  if(blocker){
    actor.blockedFor=(actor.blockedFor||0)+dt;
    if(actor.blockedFor>.45 && world.time>=(actor.replanAfter||0)){
      // One walker yields into a nearby traversable side lane. Giving way
      // is deterministic, so two colleagues won't endlessly mirror each
      // other's avoidance step. A stationary coworker always has priority.
      const giveWay=!blocker.path?.length || actor.id>blocker.id || actor.blockedFor>2.5;
      if(giveWay && world.time>=(actor.lastYieldAt||0)+1.0){
        const heading=actor.path[0];
        const horizontal=Math.abs(heading.x-actor.x)>=Math.abs(heading.y-actor.y);
        const offsets=horizontal?[[0,24],[0,-24],[-24,0],[24,0]]:
          [[24,0],[-24,0],[0,24],[0,-24]];
        for(const [dx,dy] of offsets){
          const side={x:actor.x+dx,y:actor.y+dy};
          if(!world._walkable(actor.floor,Math.floor(side.x/24),Math.floor(side.y/24)))continue;
          if(world.agents.some(other=>other!==actor&&other.floor===actor.floor&&
             dist(other,side)<PERSONAL_SPACE+4))continue;
          actor.path.unshift(side);
          actor.yielding=true;
          actor.lastYieldAt=world.time;
          actor.blockedFor=0;
          actor.replanAfter=world.time+.65;
          return {arrived:false,moved:false,blocked:true,yielding:true,by:blocker.id};
        }
      }
      const destination=actor.path[actor.path.length-1];
      const detour=world.findPath(actor.floor,actor,destination,{
        avoidAgents:true,ignoreAgentId:actor.id
      });
      if(detour.length)actor.path=detour;
      actor.replanAfter=world.time+.8;
    }
    return {arrived:false,moved:false,blocked:true,by:blocker.id};
  }
  actor.blockedFor=0;
  actor.x=candidate.x;actor.y=candidate.y;
  if(distance<=maxStep+.5)actor.path.shift();
  actor.facing=Math.abs(next.x-candidate.x)>Math.abs(next.y-candidate.y)?
    (next.x>=candidate.x?'right':'left'):
    (next.y>=candidate.y?'down':'up');
  actor.step=(actor.step||0)+dt*11;
  if(!actor.path.length)actor.yielding=false;
  return {arrived:actor.path.length===0,moved:step>0,blocked:false};
}
