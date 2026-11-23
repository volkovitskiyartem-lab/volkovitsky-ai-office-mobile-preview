/* VOLKOVITSKY AI COMPANY — Pixel Office V5.
 * Fresh data-first office simulation. No V3/V4 dependencies or network access.
 * Deterministic domain model, tile-based navigation, dynamic rooms and floors.
 */
import {advanceWorkRoutine} from './behavior.js';
import {stepAlongRoute} from './motion.js';
import {MEETING_LENGTH,meetingAt} from './meeting-choreography.js';
export const TILE = 24;
export const ROOM_W = 13, ROOM_H = 10, COLUMNS = 3, PER_FLOOR = 6;
export const GAP_X = 3, GAP_Y = 4, MARGIN = 2, ROOM_CAPACITY = 4;
export const FLOOR_TILE_W = 2 * MARGIN + COLUMNS * ROOM_W + (COLUMNS - 1) * GAP_X;
export const FLOOR_TILE_H = 2 * MARGIN + 2 * ROOM_H + GAP_Y;
const THEMES = [
  {floor:'#cabd9e',wall:'#746952',accent:'#63a9ad',rug:'#819c9c'},
  {floor:'#d2c0a7',wall:'#745d51',accent:'#d69a64',rug:'#b79875'},
  {floor:'#c9b5b4',wall:'#6c586f',accent:'#ba7fb2',rug:'#a68aa5'},
  {floor:'#bdc9bb',wall:'#506b69',accent:'#79b9a4',rug:'#8ca9a0'},
  {floor:'#d3c3a8',wall:'#786753',accent:'#ddb36b',rug:'#bba37f'},
  {floor:'#bcc8d3',wall:'#536677',accent:'#8faad1',rug:'#879bad'},
];
const DEMO_PROJECTS = [
  ['hq','Главный штаб','HQ · управление'],
  ['budget','BudgetBot','Финансы и бюджеты'],
  ['reels','Reels Studio','Видео и контент'],
  ['urps','URPS KPI Dashboard','Данные и аналитика'],
  ['mosgortur','Мосгортур','Туристический продукт'],
];
const DEMO_AGENTS = [
  ['codex','Codex','hq','#5c98b3',0],
  ['gigacode','GigaCode','hq','#d49c7e',1],
  ['budget-analyst','Budget Analyst','budget','#84b9a5',2],
  ['reels-director','Reels Director','reels','#bc8dd0',3],
  ['kpi-monitor','KPI Monitor','urps','#87a3d0',4],
  ['partner-manager','Partner Manager','mosgortur','#d0ae7b',5],
];

const mod=(n,m)=>(n % m + m)%m;
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619);return h>>>0};
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const idClean=s=>String(s||'').trim().toLowerCase().replace(/[^a-zа-яё0-9-]+/gi,'-').replace(/^-+|-+$/g,'').slice(0,58);

export class OfficeWorld {
  constructor({seed=20261122, empty=false}={}){
    this.seed=seed>>>0;this.randomState=this.seed||1;
    this.projects=[];this.agents=[];this.rooms=[];this.floors=[];
    this.currentFloor=0;this.mode='demo';this.events=[];this.time=0;
    this._nextProject=1;this._nextAgent=1;this._nextAction=3.5;this._demoStep=0;
    this.demoTask=null;this.demoMeeting=null;this._nextMeetingAt=31;
    if(!empty){
      for(const [id,name,subtitle] of DEMO_PROJECTS)this.addProject(name,{id,subtitle,silent:true});
      for(const [id,name,projectId,color,variant] of DEMO_AGENTS)
        this.addAgent(name,projectId,{id,color,variant,silent:true});
      // A busy HQ is visible immediately on first paint, without waiting for
      // a random task. This state is explicitly DEMO, never a live claim.
      const firstRoom=this.roomFor('hq');
      const seated=this.agents.find(a=>a.id==='gigacode');
      if(firstRoom&&seated){
        const seat=firstRoom.workstations[1];
        if(seat){
          seated.x=seat.x;seated.y=seat.y;
          seated.state='typing';seated.facing='up';seated.wait=6.8;
          seated.seatProgress=1;seated.sessions=1;
        }
      }
      const codex=this.agents.find(a=>a.id==='codex');
      if(codex)codex.nextMoveAt=.65;
      this._event('Демонстрационный офис создан. Все действия персонажей условные.','setup');
      this._demoTick();
    }
  }
  rand(){let x=this.randomState;x^=x<<13;x^=x>>>17;x^=x<<5;this.randomState=x>>>0;return (this.randomState>>>0)/4294967296}
  _event(message,type='demo'){this.events.unshift({time:this.time,type,message});if(this.events.length>35)this.events.length=35}
  addProject(name,{id,subtitle='',silent=false}={}){
    const title=String(name||'').trim().slice(0,56);
    if(title.length<2)throw Error('Название проекта должно содержать минимум 2 символа');
    let key=id||idClean(title)||'project';
    if(this.projects.some(x=>x.id===key))key+='-'+this._nextProject++;
    const project={id:key,name:title,subtitle,theme:this.projects.length%THEMES.length,archived:false};
    this.projects.push(project);this.rebuild();
    if(!silent)this._event('Создан новый проект и кабинет: '+title);
    return project;
  }
  addAgent(name,projectId,{id,color,variant,silent=false}={}){
    const project=this.projects.find(x=>x.id===projectId&&!x.archived);
    if(!project)throw Error('Выбери действующий проект для сотрудника');
    const title=String(name||'').trim().slice(0,40);
    if(title.length<2)throw Error('Имя сотрудника должно содержать минимум 2 символа');
    let key=id||idClean(title)||'agent';
    if(this.agents.some(x=>x.id===key))key+='-'+this._nextAgent++;
    const n=hash(key),actor={
      id:key,name:title,projectId,color:color||['#76afc9','#c9a580','#9dbf91','#c392b6','#d1af86'][n%5],
      skin:['#ecc5a2','#c99474','#a97455','#f5d7b4'][n%4],
      hair:['#423630','#674a38','#262d39','#9c6b44','#483b4c'][(n>>>4)%5],
      variant:variant??(n%8),state:'idle',facing:'down',
      x:0,y:0,floor:0,roomId:null,path:[],target:null,
      wait:0,phase:this.rand()*6,step:0,manual:false,nextMoveAt:1+this.rand()*2,
      goal:null,seatProgress:0,sessions:0,didCoffee:false,
      didStretch:false,didWave:false,blockedFor:0,replanAfter:0,
    };
    this.agents.push(actor);this.rebuild();
    if(!silent)this._event('Новый сотрудник '+title+' появился в кабинете '+project.name);
    return actor;
  }
  moveAgent(agentId,projectId){
    const agent=this.agents.find(a=>a.id===agentId);
    const project=this.projects.find(p=>p.id===projectId&&!p.archived);
    if(!agent||!project)throw Error('Не найден агент или проект');
    agent.projectId=projectId;agent.path=[];this.rebuild();
    this._event(agent.name+' переведён в '+project.name);
  }
  /** Room count is data-driven: 1 office/4 agents per project, with annex rooms. */
  rebuild(){
    // A floor reflow invalidates existing meeting waypoints. End the synthetic
    // gathering before relocating people so no participant follows a stale path.
    if(this.demoMeeting){
      const participants=new Set(this.demoMeeting.participantIds);
      for(const agent of this.agents){
        if(!participants.has(agent.id)||agent.goal!=='meeting')continue;
        agent.goal=null;agent.path=[];agent.wait=0;
        agent.meetingUntil=0;agent.meetingPose=null;
        agent.state='idle';agent.nextMoveAt=this.time+.8;
      }
      this.demoMeeting=null;this._nextMeetingAt=this.time+31;
    }
    const next=[];
    for(const project of this.projects.filter(p=>!p.archived)){
      const members=this.agents.filter(a=>a.projectId===project.id);
      const count=Math.max(1,Math.ceil(members.length/ROOM_CAPACITY));
      for(let part=0;part<count;part++){
        next.push({
          id:project.id+(part?'-annex-'+(part+1):''),projectId:project.id,
          name:part?project.name+' · '+(part+1):project.name,
          theme:project.theme,part,capacity:ROOM_CAPACITY,
          members:members.slice(part*ROOM_CAPACITY,(part+1)*ROOM_CAPACITY).map(x=>x.id)
        });
      }
    }
    this.rooms=next;this.floors=[];
    const floorCount=Math.max(1,Math.ceil(next.length/PER_FLOOR));
    for(let f=0;f<floorCount;f++)this.floors.push(this._buildFloor(f,next.slice(f*PER_FLOOR,(f+1)*PER_FLOOR)));
    this.currentFloor=clamp(this.currentFloor,0,floorCount-1);
    for(const agent of this.agents){
      const office=this.rooms.find(r=>r.members.includes(agent.id));
      if(!office)continue;
      const insideAssignedRoom=agent.floor===office.floor &&
        agent.x>office.x+TILE && agent.x<office.x+office.w-TILE &&
        agent.y>office.y+TILE && agent.y<office.y+office.h-TILE;
      if(agent.roomId!==office.id||!insideAssignedRoom||
        !this._walkable(office.floor,Math.floor(agent.x/TILE),Math.floor(agent.y/TILE))){
        agent.roomId=office.id;agent.floor=office.floor;
        const point=this._freeSpot(office,agent.variant);
        agent.x=point.x;agent.y=point.y;
        agent.path=[];agent.target=null;agent.wait=0;
      }
    }
  }
  _buildFloor(f,rooms){
    const w=FLOOR_TILE_W,h=FLOOR_TILE_H,walk=new Uint8Array(w*h),tiles=new Uint8Array(w*h);
    const index=(x,y)=>y*w+x;
    // 0 = outside, 1 = office, 2 = hallway, 3 = wall, 4 = furniture
    for(let y=MARGIN;y<h-MARGIN;y++){
      for(let x=MARGIN;x<w-MARGIN;x++){
        tiles[index(x,y)]=2;walk[index(x,y)]=1;
      }
    }
    const objects=[];
    rooms.forEach((room,i)=>{
      const col=i%COLUMNS,row=Math.floor(i/COLUMNS);
      const tx=MARGIN+col*(ROOM_W+GAP_X);
      const ty=MARGIN+row*(ROOM_H+GAP_Y);
      const floor=room.floor=f;room.tx=tx;room.ty=ty;room.x=tx*TILE;room.y=ty*TILE;
      room.w=ROOM_W*TILE;room.h=ROOM_H*TILE;
      room.door={x:tx+Math.floor(ROOM_W/2),y:row===0?ty+ROOM_H-1:ty};
      room.workstations=[];
      for(let yy=ty;yy<ty+ROOM_H;yy++){
        for(let xx=tx;xx<tx+ROOM_W;xx++){
          const edge=xx===tx||xx===tx+ROOM_W-1||yy===ty||yy===ty+ROOM_H-1;
          const door=(xx===room.door.x&&yy===room.door.y);
          tiles[index(xx,yy)]=edge&&!door?3:1;walk[index(xx,yy)]=edge&&!door?0:1;
        }
      }
      // 4 desk islands: furniture is always a non-walkable physical object.
      const desks=[[3,3],[9,3],[3,6],[9,6]];
      desks.forEach(([dx,dy],j)=>{
        const ox=tx+dx,oy=ty+dy;
        if(ox<tx+ROOM_W-2){
          tiles[index(ox,oy)]=4;walk[index(ox,oy)]=0;
          objects.push({type:'desk',x:ox,y:oy,theme:room.theme,roomId:room.id,index:j});
          room.workstations.push({x:ox*TILE+TILE*.5,y:(oy+1.5)*TILE});
        }
      });
      objects.push({type:'plant',x:tx+ROOM_W-2,y:ty+ROOM_H-2,roomId:room.id});
      objects.push({type:'cabinet',x:tx+1,y:ty+1,roomId:room.id});
      if(room.projectId==='reels')objects.push({type:'camera',x:tx+ROOM_W-3,y:ty+1,roomId:room.id});
      if(room.projectId==='urps')objects.push({type:'chart',x:tx+ROOM_W-4,y:ty+1,roomId:room.id});
      if(room.projectId==='mosgortur')objects.push({type:'map',x:tx+ROOM_W-4,y:ty+1,roomId:room.id});
      if(room.projectId==='hq')objects.push({type:'conference',x:tx+7,y:ty+5,roomId:room.id});
    });
    return {id:f,rooms,objects,width:w*TILE,height:h*TILE,w,h,walk,tiles};
  }
  _walkable(f,x,y){
    const layout=this.floors[f];return !!(layout&&x>=0&&y>=0&&x<layout.w&&y<layout.h&&layout.walk[y*layout.w+x]);
  }
  _freeSpot(room,n=0,excludeId=null){
    const candidates=[[6,7],[5,4],[8,7],[4,7],[7,6],[2,5],[10,5],[7,2],[4,2],[8,4]];
    // Every worker needs a distinct physical starting location. Reusing one
    // tile for two workers creates a permanent mutual blockage.
    const available=(dx,dy)=>{
      const x=room.tx+dx,y=room.ty+dy;
      if(!this._walkable(room.floor,x,y))return false;
      const point={x:(x+.5)*TILE,y:(y+.5)*TILE};
      return !this.agents.some(a=>a.id!==excludeId&&a.floor===room.floor&&
        Math.hypot(a.x-point.x,a.y-point.y)<19);
    };
    for(let k=0;k<candidates.length;k++){
      const [dx,dy]=candidates[mod(n+k,candidates.length)];
      if(available(dx,dy))return {x:(room.tx+dx+.5)*TILE,y:(room.ty+dy+.5)*TILE};
    }
    // A busy annex may exhaust preferred spots; search all walkable tiles
    // rather than falling back to the same coordinate for every worker.
    for(let dy=1;dy<ROOM_H-1;dy++)for(let dx=1;dx<ROOM_W-1;dx++){
      if(available(dx,dy))return {x:(room.tx+dx+.5)*TILE,y:(room.ty+dy+.5)*TILE};
    }
    return {x:(room.tx+6.5)*TILE,y:(room.ty+5.5)*TILE};
  }
  roomFor(projectId){return this.rooms.find(r=>r.projectId===projectId)||null}
  floorRooms(f=this.currentFloor){return this.floors[f]?.rooms||[]}
  agentAtRoom(roomId){return this.agents.filter(a=>a.roomId===roomId)}
  /** Four-way BFS across the real tile collision grid; hallway joins rooms. */
  findPath(f,start,goal,{avoidAgents=false,ignoreAgentId=null}={}){
    const map=this.floors[f];if(!map)return [];
    const nearest=({x,y})=>{
      let xx=clamp(Math.floor(x/TILE),0,map.w-1),yy=clamp(Math.floor(y/TILE),0,map.h-1);
      if(this._walkable(f,xx,yy))return [xx,yy];
      for(let r=1;r<13;r++){
        for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
          const nx=xx+dx,ny=yy+dy;
          if(this._walkable(f,nx,ny))return [nx,ny];
        }
      }return null;
    };
    const a=nearest(start),b=nearest(goal);if(!a||!b)return [];
    const startIndex=a[1]*map.w+a[0],endIndex=b[1]*map.w+b[0],size=map.w*map.h;
    const prev=new Int32Array(size);prev.fill(-1);const seen=new Uint8Array(size);
    const queue=new Int32Array(size);let head=0,tail=0;queue[tail++]=startIndex;seen[startIndex]=1;
    while(head<tail){
      const cur=queue[head++];if(cur===endIndex)break;
      const x=cur%map.w,y=Math.floor(cur/map.w);
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=x+dx,ny=y+dy;if(!this._walkable(f,nx,ny))continue;
        const idx=ny*map.w+nx;if(seen[idx])continue;
        if(avoidAgents && idx!==startIndex && idx!==endIndex && this.agents.some(other=>
          other.id!==ignoreAgentId && other.floor===f &&
          Math.hypot(other.x-(nx+.5)*TILE,other.y-(ny+.5)*TILE)<20))continue;
        seen[idx]=1;prev[idx]=cur;queue[tail++]=idx;
      }
    }
    if(!seen[endIndex])return [];
    let k=endIndex;const path=[];
    while(k!==startIndex){path.push({x:((k%map.w)+.5)*TILE,y:(Math.floor(k/map.w)+.5)*TILE});k=prev[k]}
    path.reverse();return path;
  }
  sendToRoom(agentId,roomId,{state='walking'}={}){
    const actor=this.agents.find(a=>a.id===agentId);
    const room=this.rooms.find(r=>r.id===roomId);
    if(!actor||!room)return false;
    if(actor.floor!==room.floor){
      // Separate virtual floors are not connected by invisible routes.
      // Prototype uses a clearly defined elevator transfer.
      actor.floor=room.floor;const entry=this._freeSpot(room,actor.variant);
      actor.x=entry.x;actor.y=entry.y;actor.path=[];
    }
    const end=this._freeSpot(room,actor.variant+Math.floor(this.rand()*10));
    const path=this.findPath(actor.floor,{x:actor.x,y:actor.y},end,
      {avoidAgents:true,ignoreAgentId:actor.id});
    if(path.length<1)return false;
    actor.path=path;actor.target=room.id;actor.state=state;actor.wait=0;
    actor.manual=true;actor.goal='roam';actor.blockedFor=0;actor.replanAfter=0;
    actor.yielding=false;
    return true;
  }
  _demoTick(){
    if(this.mode!=='demo'||!this.agents.length)return;
    const a=this.agents[Math.floor(this.rand()*this.agents.length)];
    const original=this.roomFor(a.projectId);
    const hq=this.roomFor('hq');
    if(!original||!hq)return;
    if(a.path.length||a.projectId==='hq'||['seating','typing','standing'].includes(a.state))return;
    if(a.roomId!==original.id){
      this.sendToRoom(a.id,original.id);
      this._event(a.name+' возвращается в кабинет '+original.name);
      return;
    }
    const visitHq=a.projectId!=='hq'&&this.rand()>.58;
    const target=visitHq?hq:original;
    if(this.sendToRoom(a.id,target.id)){
      this._event(a.name+(visitHq?' идёт на совещание в штаб':' перемещается к рабочему месту'));
    }
  }
  startDemoMeeting(){
    if(this.mode!=='demo')return {ok:false,reason:'live'};
    if(this.demoMeeting)return {ok:false,reason:'active'};
    const room=this.roomFor('hq');
    if(!room||room.members.length<2)return {ok:false,reason:'staff'};
    const actors=room.members.slice(0,2).map(id=>this.agents.find(a=>a.id===id));
    if(actors.some(a=>!a||a.floor!==room.floor||a.manual))
      return {ok:false,reason:'participants'};
    const slots=[
      {x:room.x+126,y:room.y+126},
      {x:room.x+182,y:room.y+126}
    ];
    const routes=[];
    for(let i=0;i<actors.length;i++){
      const actor=actors[i],spot=slots[i];
      if(!this._walkable(room.floor,Math.floor(spot.x/TILE),Math.floor(spot.y/TILE)))
        return {ok:false,reason:'blocked-space'};
      const route=this.findPath(room.floor,actor,spot,
        {avoidAgents:true,ignoreAgentId:actor.id});
      if(route.length===0&&Math.hypot(actor.x-spot.x,actor.y-spot.y)>12)
        return {ok:false,reason:'no-route'};
      routes.push(route);
    }
    for(let i=0;i<actors.length;i++){
      const a=actors[i];
      a.path=routes[i];a.target=room.id;a.goal='meeting';a.meetingUntil=0;
      a.meetingRole=i;a.manual=false;a.seatProgress=0;a.meetingPose=null;
      a.blockedFor=0;a.yielding=false;
      a.state=routes[i].length?'walking':'meeting-wait';
      a.wait=0;
    }
    this.demoMeeting={started:this.time,phase:'gathering',readyAt:null,
      until:null,beat:null,participantIds:actors.map(a=>a.id)};
    this._nextMeetingAt=this.time+115;
    this._event('ДЕМО: '+actors.map(a=>a.name).join(' и ')+
      ' собираются за столом','demo');
    return {ok:true,participants:actors.map(a=>a.id)};
  }
  _advanceDemoMeeting(){
    const m=this.demoMeeting;
    if(!m||this.mode!=='demo')return;
    const participants=m.participantIds.map(id=>this.agents.find(a=>a.id===id));
    if(participants.some(a=>!a||a.manual||a.goal!=='meeting')){
      for(const a of participants){
        if(!a||a.goal!=='meeting')continue;
        a.goal=null;a.path=[];a.meetingPose=null;a.meetingUntil=0;
        a.state='idle';a.nextMoveAt=this.time+.5;
      }
      this.demoMeeting=null;
      return;
    }
    if(m.phase==='gathering'){
      if(!participants.every(a=>a.state==='meeting-wait'))return;
      m.phase='discussion';m.readyAt=this.time;m.until=this.time+MEETING_LENGTH;
      m.beat='greeting';
      participants.forEach(a=>{a.state='meeting';a.wait=MEETING_LENGTH;
        a.meetingUntil=m.until;});
      this._event('ДЕМО: участники собрались, обсуждение началось','demo');
    }
    if(m.phase==='discussion'){
      const ch=meetingAt(this.time-m.readyAt);
      if(ch.key!==m.beat){
        m.beat=ch.key;
        this._event('ДЕМО: этап встречи — '+ch.caption.toLowerCase(),'demo');
      }
      participants.forEach((a,i)=>{
        a.meetingPose=ch.poses[i]||'listen';
        a.state='meeting';
        a.wait=Math.max(0,m.until-this.time);
      });
      if(this.time>=m.until){
        m.phase='concluding';m.beat='closing';m.until=this.time+.8;
        participants.forEach(a=>{a.state='meeting-wrap';a.wait=.8;
          a.meetingPose=null;});
        this._event('ДЕМО: встреча завершена, сотрудники расходятся','demo');
      }
    }else if(m.phase==='concluding'&&this.time>=m.until+.2){
      this.demoMeeting=null;
    }
  }
  startDemoTask(text){
    if(this.mode!=='demo')return {ok:false,error:'Для реальной отправки необходима интеграция с Paperclip. Ничего не отправлено.'};
    const title=String(text||'').trim();
    if(title.length<5)return {ok:false,error:'Опиши задачу подробнее.'};
    const match=this.projects.find(p=>title.toLowerCase().includes(p.name.toLowerCase())||
      (p.id==='budget'&&/бюджет|остатк|финанс/.test(title.toLowerCase()))||
      (p.id==='reels'&&/видео|рилс|контент/.test(title.toLowerCase()))||
      (p.id==='urps'&&/дашборд|kpi|аналитик/.test(title.toLowerCase())))||this.projects[0];
    this.demoTask={id:'DEMO-'+Math.floor(this.time*1000),title,projectId:match.id,
      step:0,created:this.time,steps:['Получена','Определён проект','Сотрудник работает','Проверка','Готово']};
    this._event('ДЕМО: новая задача «'+title.slice(0,48)+'»');
    this._nextAction=Math.min(this._nextAction,1.2);
    return {ok:true,demo:true,project:match.name};
  }
  setMode(mode){
    if(!['demo','live'].includes(mode))throw Error('Неподдерживаемый режим');
    if(this.mode===mode)return;
    this.mode=mode;
    this.demoMeeting=null;
    this._nextMeetingAt=this.time+31;
    for(const a of this.agents){
      a.path=[];a.state='idle';a.wait=0;a.goal=null;
      a.manual=false;a.blockedFor=0;a.yielding=false;a.seatProgress=0;
      a.meetingPose=null;a.meetingUntil=0;
    }
    this._event(mode==='demo'?'Включён DEMO. Действия не являются реальными.':
      'LIVE отключён от источника данных: нельзя показывать фиктивные статусы.','system');
  }
  update(dt){
    const d=clamp(dt,0,.1);this.time+=d;
    if(this.mode==='demo'){
      this._advanceDemoMeeting();
      if(!this.demoMeeting&&this.time>=this._nextMeetingAt){
        const started=this.startDemoMeeting();
        this._nextMeetingAt=this.time+(started.ok?115:8);
      }
      this._nextAction-=d;
      if(this._nextAction<=0){this._demoTick();this._nextAction=3+this.rand()*3.4}
      if(this.demoTask){
        const task=this.demoTask;
        const newStep=Math.min(4,Math.floor((this.time-task.created)/3.4));
        if(newStep!==task.step){
          task.step=newStep;this._event('ДЕМО-задача: '+task.steps[newStep]);
          if(newStep===2){
            const assigned=this.agents.find(a=>a.projectId===task.projectId);
            const room=this.roomFor(task.projectId);
            if(assigned&&room)this.sendToRoom(assigned.id,room.id);
          }
        }
      }
    }
    for(const actor of this.agents){
      actor.phase+=d;
      if(advanceWorkRoutine(this,actor,d))continue;
      if(this.mode==='demo' && !actor.path.length && actor.wait<=0 &&
        this.time>=actor.nextMoveAt){
        const own=this.roomFor(actor.projectId);
        const meeting=this.roomFor('hq');
        const visitHQ=actor.projectId!=='hq'&&this.rand()>.87;
        if(own)this.sendToRoom(actor.id,visitHQ&&meeting?meeting.id:own.id);
        actor.nextMoveAt=this.time+4.5+this.rand()*6;
      }
      if(actor.path.length&&this.mode==='demo'){
        actor.state='walking';
        const travel=stepAlongRoute(this,actor,d,{speed:actor.id==='codex'?49:42});
        if(travel.arrived){
          actor.roomId=actor.target||actor.roomId;actor.state='idle';
          actor.wait=1.4;actor.manual=false;actor.nextMoveAt=this.time+1.4;
        }
      }else if(actor.wait>0&&this.mode==='demo'){
        actor.wait-=d;if(actor.wait<=0)actor.state='idle';
      }
    }
  }
  snapshot(){
    return {mode:this.mode,currentFloor:this.currentFloor,time:this.time,
      projectCount:this.projects.length,roomCount:this.rooms.length,
      floorCount:this.floors.length,agentCount:this.agents.length,
      projects:this.projects.map(x=>({...x})),
      rooms:this.rooms.map(x=>({id:x.id,name:x.name,floor:x.floor,
        projectId:x.projectId,members:x.members.length,part:x.part})),
      agents:this.agents.map(a=>({id:a.id,name:a.name,projectId:a.projectId,roomId:a.roomId,
        floor:a.floor,x:a.x,y:a.y,state:this.mode==='live'?'unverified':a.state,
        seatProgress:a.seatProgress||0,sessions:a.sessions||0,
        meetingPose:this.mode==='demo'?a.meetingPose||null:null,
        walking:this.mode==='demo'&&a.path.length>0})),
      demoTask:this.demoTask?{...this.demoTask}:null,
      demoMeeting:this.mode==='demo'&&this.demoMeeting?{
        ...this.demoMeeting,participantIds:[...this.demoMeeting.participantIds]}:null,
      events:this.events.slice(0,8)
    };
  }
}
export const themeOf=room=>THEMES[(room?.theme??0)%THEMES.length];
