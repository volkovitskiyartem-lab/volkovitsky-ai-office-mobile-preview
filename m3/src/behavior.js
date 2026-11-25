/* Pure local DEMO behaviour for independently rendered HQ agent entities.
 * An agent walks to a real workstation, sits, types, gets up, then can visit
 * the coffee space. This is never a claim about a live Paperclip task.
 */
import {stepAlongRoute} from './motion.js';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(v,b));
function plan(world,agent,room,point,goal){
  const path=world.findPath(agent.floor,{x:agent.x,y:agent.y},point,
    {avoidAgents:true,ignoreAgentId:agent.id});
  if(path.length){
    agent.path=path;
    agent.target=room.id;
    agent.goal=goal;
    agent.state='walking';
    agent.seatProgress=0;
    agent.blockedFor=0;agent.yielding=false;
    return true;
  }
  if(dist(agent,point)<3){
    agent.goal=goal;
    agent.state=goal==='desk'?'seating':'idle';
    agent.wait=goal==='desk'?.75:1.4;
    return true;
  }
  return false;
}
export function advanceWorkRoutine(world,agent,dt){
  if(world.mode!=='demo'||agent.manual)return false;
  const assigned=world.rooms.find(r=>r.members.includes(agent.id));
  if(!assigned)return false;
  const rosterIndex=Math.max(0,assigned.members.indexOf(agent.id));
  const station=assigned.workstations[rosterIndex%assigned.workstations.length];
  if(!station)return false;
  if(agent.path?.length){
    agent.state='walking';
    const travel=stepAlongRoute(world,agent,dt,{speed:42+(agent.variant%4)*2});
    if(travel.arrived){
      agent.roomId=assigned.id;
      if(agent.goal==='desk'){
        agent.state='seating';agent.wait=.75;
        agent.facing='up';
        world._event('ДЕМО: '+agent.name+' садится за рабочий стол','demo');
      }else if(agent.goal==='coffee'){
        agent.state='break';agent.wait=1.6;
        world._event('ДЕМО: '+agent.name+' подошёл к кофе','demo');
      }else if(agent.goal==='meeting'){
        agent.state='meeting-wait';agent.wait=0;agent.meetingPose=null;
        agent.facing=agent.meetingRole===0?'right':'left';
        world._event('ДЕМО: '+agent.name+' подошёл к столу','demo');
      }else{
        agent.state='idle';
      }
    }
    return true;
  }
  if(agent.state==='meeting-wait'||agent.state==='meeting'){
    // The central meeting coordinator handles synchronized turn-taking.
    // Nobody speaks until every participant has arrived at the table.
    return true;
  }
  if(agent.state==='meeting-wrap'){
    agent.wait-=dt;
    if(agent.wait<=0){
      agent.state='idle';agent.goal=null;agent.meetingUntil=0;
      agent.meetingPose=null;agent.nextMoveAt=world.time+.5;
      world._event('ДЕМО: '+agent.name+' возвращается к рабочему месту','demo');
    }
    return true;
  }
  if(agent.state==='seating'){
    agent.wait-=dt;
    agent.seatProgress=clamp(1-agent.wait/.75,0,1);
    if(agent.wait<=0){
      agent.state='typing';agent.wait=5.6+world.rand()*3.0;
      agent.seatProgress=1;
      agent.sessions=(agent.sessions||0)+1;
      world._event('ДЕМО: '+agent.name+' печатает за компьютером','demo');
    }
    return true;
  }
  if(agent.state==='typing'){
    agent.wait-=dt;
    agent.seatProgress=1;
    if(agent.wait<=0){
      if(agent.sessions%2===0){
        agent.state='review';agent.wait=1.6+world.rand()*1.0;
        world._event('ДЕМО: '+agent.name+' проверяет материалы','demo');
      }else{
        agent.state='standing';agent.wait=.65;
        world._event('ДЕМО: '+agent.name+' закончил работу за столом','demo');
      }
    }
    return true;
  }
  if(agent.state==='review'){
    agent.wait-=dt;
    if(agent.wait<=0){agent.state='standing';agent.wait=.65}
    return true;
  }
  if(agent.state==='standing'){
    agent.wait-=dt;
    agent.seatProgress=clamp(agent.wait/.65,0,1);
    if(agent.wait<=0){
      agent.seatProgress=0;
      if(agent.sessions>0&&agent.sessions%4===0&&!agent.didStretch){
        agent.state='stretch';agent.wait=1.4;agent.didStretch=true;
      }else{
        agent.state='idle';
        if(agent.sessions%4!==0)agent.didStretch=false;
        agent.nextMoveAt=world.time+.4+world.rand()*1.1;
      }
    }
    return true;
  }
  if(agent.state==='stretch'){
    agent.wait-=dt;
    if(agent.wait<=0){agent.state='idle';agent.nextMoveAt=world.time+.4}
    return true;
  }
  if(agent.state==='wave'){
    agent.wait-=dt;
    if(agent.wait<=0){agent.state='idle';agent.nextMoveAt=world.time+.6}
    return true;
  }
  if(agent.state==='break'){
    agent.wait-=dt;
    if(agent.wait<=0){
      agent.state='idle';
      agent.nextMoveAt=world.time+.2;
    }
    return true;
  }
  if(world.time>=agent.nextMoveAt){
    const colleague=world.agents.find(other=>other!==agent&&other.floor===agent.floor&&
      other.roomId===assigned.id&&other.state==='idle'&&dist(other,agent)<76);
    if(colleague&&!agent.didWave && agent.sessions>0&&agent.sessions%5===0){
      agent.state='wave';agent.wait=1.25;agent.didWave=true;
      return true;
    }
    if(agent.sessions%5!==0)agent.didWave=false;
    const coffeeTime=(agent.sessions||0)>0&&(agent.sessions%3===0)&&!agent.didCoffee;
    if(coffeeTime){
      // The coffee point is visibly next to the separate prop in every room.
      const spot={x:assigned.x+assigned.w*.81,y:assigned.y+assigned.h*.75};
      if(plan(world,agent,assigned,spot,'coffee'))agent.didCoffee=true;
    }else{
      agent.didCoffee=false;
      plan(world,agent,assigned,station,'desk');
    }
    agent.nextMoveAt=world.time+3;
  }
  return true;
}
