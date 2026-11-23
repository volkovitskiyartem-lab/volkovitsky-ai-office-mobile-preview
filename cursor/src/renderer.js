/* Pixel Office V5 — genuine, object-based top-down pixel-art renderer.
 * All furniture, rooms and people are independently drawn entities, not a poster.
 * Independent camera, hit testing and touch panning.
 */
import {TILE,ROOM_W,ROOM_H,MARGIN,COLUMNS,GAP_X,themeOf} from './world.js';
import {PremiumHQ} from './premium-room.js';
import {buildDepthQueue} from './depth.js';
import {drawRoomAtmosphere} from './room-atmosphere.js';
import {PremiumDepartments} from './premium-departments.js';
const colors={
  outside:'#121e27',outer:'#2c3641',hall:'#ada9a1',
  hallDark:'#9b9b97',border:'#273748',wood:'#b68559',
  woodDark:'#704f43',woodLight:'#dbaf76',
  ink:'#182735',screen:'#85e1c5',screenAlt:'#5c9bc1',
  cream:'#f9eaca',shadow:'#00000036',white:'#f0f5ef'
};
const tileN=(n)=>Math.floor(n*TILE);
const px=n=>Math.round(n);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const colorAlpha=(hex,alpha)=>hex+alpha;
function box(ctx,x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function line(ctx,x,y,xx,yy,color,w=1){ctx.strokeStyle=color;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(px(x)+.5,px(y)+.5);ctx.lineTo(px(xx)+.5,px(yy)+.5);ctx.stroke()}
function text(ctx,s,x,y,{color='#f0f1e8',size=13,align='left',weight=800,font='monospace'}={}){
  ctx.textAlign=align;ctx.textBaseline='alphabetic';
  ctx.font=weight+' '+size+'px '+font;ctx.fillStyle=color;ctx.fillText(s,x,y);
}
function decorSeed(x,y){let n=Math.imul((x+34)*7919,(y+47)*1283);n^=n<<13;return(n>>>0)%100}
function ellipse(ctx,x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill()}

function pixelLamp(ctx,x,y,t){
  box(ctx,x+6,y+4,12,3,'#5a6a5f');box(ctx,x+10,y-3,4,9,'#546a60');
  box(ctx,x+4,y-6,16,6,'#f3d18e');box(ctx,x+7,y-5,10,3,'#fff4b9');
  const intensity=.45+.45*Math.sin(t*2.9+x*.1);
  ctx.globalAlpha=intensity*.18;ellipse(ctx,x+12,y+7,22,9,'#ffd388');ctx.globalAlpha=1;
}
function plant(ctx,x,y,phase){
  box(ctx,x+6,y+14,13,7,'#715443');box(ctx,x+8,y+19,9,3,'#443a35');
  const sway=Math.round(Math.sin(phase*1.7+x)*2);
  box(ctx,x+11+sway,y+1,3,15,'#375b47');
  const leaves=[[2,3,8,5],[12,-3,7,7],[14,8,9,5],[5,-5,7,7],[0,10,8,4]];
  for(const [dx,dy,w,h] of leaves)box(ctx,x+dx+sway,y+dy,w,h,(dx%3===0?'#77ad74':'#3e8c69'));
  box(ctx,x+8+sway,y+3,6,3,'#a1c77e');
}
function drawDesk(ctx,obj,t){
  const x=tileN(obj.x),y=tileN(obj.y);
  // Desk legs, rim, illuminated keyboard and screen
  box(ctx,x-6,y+8,40,13,'#5c4a42');box(ctx,x-8,y+1,44,15,'#795b49');
  box(ctx,x-8,y-1,44,12,'#b88759');box(ctx,x-6,y,40,5,'#dda876');
  box(ctx,x+2,y-9,25,17,'#232b37');box(ctx,x+4,y-7,21,12,'#72c7c7');
  box(ctx,x+5,y-6,19,8,obj.index%2?'#507fa0':'#5ca7a6');
  const wave=Math.floor(t*3.5+(obj.x*7+obj.y))%5;
  for(let k=0;k<4;k++)box(ctx,x+7+k*4,y-4+(k%3)*2,2,4+(k+wave)%4,
    k%2?'#b1f5de':'#8bdaef');
  box(ctx,x+14,y+8,3,4,'#333644');box(ctx,x+6,y+13,20,3,'#ccb7a2');
  box(ctx,x+31,y+2,4,6,'#efe9cb');box(ctx,x+31,y+7,4,1,'#6a6a63');
  // Chair stays a separate tangible environment entity
  box(ctx,x+1,y+21,21,6,'#45485d');box(ctx,x+4,y+25,16,6,'#33384d');
  box(ctx,x+7,y+19,11,5,'#677486');
}
function drawCabinet(ctx,obj){
  const x=tileN(obj.x),y=tileN(obj.y);
  box(ctx,x-1,y-13,49,37,'#665048');
  box(ctx,x+1,y-14,47,8,'#aa855f');box(ctx,x+1,y-5,47,7,'#b69b71');
  box(ctx,x+1,y+4,47,7,'#91765c');box(ctx,x+1,y+13,47,7,'#b1986b');
  for(let i=0;i<8;i++){
    const bx=x+3+i*5;
    box(ctx,bx,y-4,4,6,['#77b5bb','#d6bd7e','#9fa4c1','#aace96'][i%4]);
    box(ctx,bx,y+6,4,6,['#b77e79','#f1c788','#8bc4a4'][i%3]);
  }
}
function drawObject(ctx,obj,t){
  const x=tileN(obj.x),y=tileN(obj.y);
  switch(obj.type){
    case 'desk':drawDesk(ctx,obj,t);break;
    case 'plant':plant(ctx,x,y,t);break;
    case 'cabinet':drawCabinet(ctx,obj);break;
    case 'camera':
      box(ctx,x,y,12,8,'#333e4e');box(ctx,x+3,y+2,5,5,'#93d3e4');
      box(ctx,x+5,y+8,2,13,'#313b49');box(ctx,x,y+20,15,3,'#566572');
      box(ctx,x+12,y+2,8,4,'#cbb0cc');break;
    case 'chart':
      box(ctx,x-5,y-8,58,24,'#232e40');box(ctx,x-3,y-6,54,20,'#335877');
      for(let i=0;i<6;i++)box(ctx,x+1+i*8,y+12-i*3,5,i*3+2,'#81d4b7');
      break;
    case 'map':
      box(ctx,x-3,y-9,50,25,'#e7dfbd');box(ctx,x-1,y-7,46,21,'#6d8c8c');
      for(let i=0;i<7;i++)box(ctx,x+3+i*6,y+(i*7%14)-3,4,6,'#b8bb83');
      break;
    case 'conference':
      box(ctx,x-22,y-7,55,22,'#94755b');box(ctx,x-18,y-11,48,16,'#bc926b');
      box(ctx,x-10,y-7,12,8,'#f0e3c4');box(ctx,x+9,y-6,12,8,'#dde6e2');
      break;
  }
}
function drawAgent(ctx,a,now,{selected=false,mode='demo'}={}){
  const x=Math.round(a.x),y=Math.round(a.y);
  const walking=mode==='demo'&&a.path.length>0;
  const phase=now*3+a.phase,arm=walking?Math.round(Math.sin(a.step)*3):
    a.state==='working'?Math.round(Math.sin(phase*4)*2):0;
  const bob=walking?(Math.round(Math.abs(Math.sin(a.step))*2)):Math.sin(phase*1.7)>.2?1:0;
  const facing=a.facing;
  ellipse(ctx,x,y-1,11,5,'#15192077');
  if(selected){ctx.strokeStyle='#ffdf9a';ctx.lineWidth=2;ctx.strokeRect(x-15,y-29,30,32)}
  // Boots: animated foot alternation driven by walking path, not arbitrary moving pixels
  box(ctx,x-8,y-7+arm,7,7,'#3e4553');box(ctx,x+3,y-7-arm,7,7,'#393f53');
  box(ctx,x-9,y-3+arm,9,4,'#252e3a');box(ctx,x+2,y-3-arm,9,4,'#252e3a');
  // Shirt + sleeves, overpants
  box(ctx,x-10,y-20-bob,21,17,'#293846');
  box(ctx,x-8,y-22-bob,17,15,a.color);
  box(ctx,x-13,y-20-bob+arm,5,13,a.skin);
  box(ctx,x+10,y-20-bob-arm,5,13,a.skin);
  box(ctx,x-5,y-21-bob,4,10,'#ffffff44');
  // Head, eyes and signature hair rendered on 12px pixel grid
  const headY=y-37-bob;
  box(ctx,x-10,headY+5,21,19,a.skin);
  box(ctx,x-11,headY,23,10,a.hair);
  box(ctx,x-10,headY+3,4,9,a.hair);
  if(a.variant%3===0)box(ctx,x+5,headY+1,7,11,a.hair);
  if(facing==='up'){
    box(ctx,x-8,headY+12,17,6,a.hair);
  }else if(facing==='left'){
    box(ctx,x-8,headY+14,2,3,'#293747');
    box(ctx,x-5,headY+14,2,3,'#293747');
  }else if(facing==='right'){
    box(ctx,x+6,headY+14,2,3,'#293747');
    box(ctx,x+2,headY+14,2,3,'#293747');
  }else{
    box(ctx,x-5,headY+14,3,3,'#263543');box(ctx,x+4,headY+14,3,3,'#263543');
    box(ctx,x-2,headY+21,6,1,'#b46d6e');
  }
  if(a.variant%4===1){
    box(ctx,x-7,headY+14,6,5,'#283c4b');box(ctx,x+3,headY+14,6,5,'#283c4b');
  }
  if(a.state==='working'&&!walking&&mode==='demo'){
    // Self-contained activity bubble is visual, not evidence of real execution.
    if(Math.sin(phase*1.4)>.72){
      box(ctx,x+12,y-44,12,11,'#e8d7a5');text(ctx,'·',x+18,y-36,{color:'#544b49',size:10,align:'center'});
    }
  }
}
export class OfficeRenderer {
  constructor(canvas,world,{onSelect=()=>{},onCamera=()=>{}}={}){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});
    this.ctx.imageSmoothingEnabled=false;this.world=world;
    this.premium=new PremiumHQ();
    this.departments=new PremiumDepartments(this.premium);
    this.onSelect=onSelect;this.onCamera=onCamera;
    this.width=1;this.height=1;this.dpr=1;
    this.x=0;this.y=0;this.zoom=1;this.dest=null;
    this.floor=0;this.selected=null;this.frame=0;this._pointer=null;
    this.followId=null;
    this.reducedMotion=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    this._resize=()=>this.resize();
    window.addEventListener('resize',this._resize,{passive:true});
    this._connectPointer();this.resize();this.focusRoom(world.roomFor('hq'),false);
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();this.width=Math.max(1,rect.width);
    this.height=Math.max(1,rect.height);this.dpr=clamp(window.devicePixelRatio||1,1,2);
    this.canvas.width=Math.round(this.width*this.dpr);
    this.canvas.height=Math.round(this.height*this.dpr);
    this.ctx.imageSmoothingEnabled=false;
  }
  focusRoom(room,smooth=true){
    if(!room)return;
    this.stopFollow();
    this.floor=room.floor;
    this.world.currentFloor=room.floor;
    const target={x:room.x+room.w/2,y:room.y+room.h/2,zoom:clamp(
      this.width<650?Math.min((this.width-24)/room.w,(this.height-45)/room.h,1.55):
       Math.min((this.width-98)/(room.w*1.15),(this.height-58)/(room.h*1.12),1.95),
      .65,1.95)};
    if(smooth){this.dest=target}else{this.x=target.x;this.y=target.y;this.zoom=target.zoom;this.dest=null}
    this.selected=room.id;this.onCamera({room:room.name,floor:room.floor});
  }
  focusFloor(f){
    const floor=this.world.floors[f];if(!floor)return;
    this.stopFollow();
    this.floor=f;this.world.currentFloor=f;this.selected=null;
    const target={x:floor.width/2,y:floor.height/2,zoom:clamp(
      Math.min((this.width-34)/floor.width,(this.height-26)/floor.height),.42,1.05)};
    this.dest=target;this.onCamera({room:'Весь этаж',floor:f});
  }
  stopFollow(){this.followId=null;}
  focusAgent(agentId){
    if(this.world.mode!=='demo')return false;
    const actor=this.world.agents.find(a=>a.id===agentId);
    if(!actor)return false;
    this.floor=actor.floor;
    this.world.currentFloor=actor.floor;
    this.followId=actor.id;
    this.selected=actor.id;
    this.dest=null;
    this.onCamera({room:actor.roomId,floor:actor.floor,agent:actor.id});
    return true;
  }
  pan(dx,dy){
    this.stopFollow();this.dest=null;
    this.x-=dx/this.zoom;this.y-=dy/this.zoom;
    this.onCamera({manual:true,action:'pan'});
  }
  setZoom(factor){
    this.stopFollow();this.dest=null;this.zoom=clamp(this.zoom*factor,.42,2.5);
    this.onCamera({manual:true,action:'zoom'});
    return this.zoom;
  }
  _toWorld(px,py){
    const rect=this.canvas.getBoundingClientRect();
    return {x:(px-rect.left-this.width/2)/this.zoom+this.x,
      y:(py-rect.top-this.height/2)/this.zoom+this.y};
  }
  _connectPointer(){
    this.canvas.style.touchAction='none';
    this.canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0&&e.pointerType==='mouse')return;
      this._pointer={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false};
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener('pointermove',e=>{
      const p=this._pointer;if(!p)return;
      const dx=e.clientX-p.x,dy=e.clientY-p.y;
      if(Math.abs(e.clientX-p.startX)+Math.abs(e.clientY-p.startY)>7)p.moved=true;
      if(p.moved)this.pan(dx,dy);
      p.x=e.clientX;p.y=e.clientY;
    });
    this.canvas.addEventListener('pointerup',e=>{
      const p=this._pointer;this._pointer=null;if(!p||p.moved)return;
      const spot=this._toWorld(e.clientX,e.clientY);
      const nearby=this.world.agents.find(a=>a.floor===this.floor&&
        Math.abs(a.x-spot.x)<19&&Math.abs(a.y-14-spot.y)<25);
      if(nearby)return this.onSelect({type:'agent',value:nearby});
      const room=this.world.floorRooms(this.floor).find(r=>
        spot.x>=r.x&&spot.x<=r.x+r.w&&spot.y>=r.y&&spot.y<=r.y+r.h);
      if(room){this.selected=room.id;this.onSelect({type:'room',value:room})}
    });
    this.canvas.addEventListener('wheel',e=>{
      e.preventDefault();this.setZoom(e.deltaY>0?.9:1.1);
    },{passive:false});
  }
  draw(now,dt){
    const ctx=this.ctx;this.frame++;
    if(this.world.mode!=='demo')this.stopFollow();
    if(this.followId){
      const actor=this.world.agents.find(a=>a.id===this.followId);
      if(!actor){this.stopFollow()}
      else {
        if(this.floor!==actor.floor){
          this.floor=actor.floor;this.world.currentFloor=actor.floor;
        }
        const rate=1-Math.exp(-dt*5.1);
        this.x+=(actor.x-this.x)*rate;
        this.y+=(actor.y-24-this.y)*rate;
        this.zoom+=(Math.min(this.width<650?2.25:2.35,2.5)-this.zoom)*rate;
      }
    }
    if(this.dest){
      const rate=1-Math.exp(-dt*7);
      this.x+=(this.dest.x-this.x)*rate;this.y+=(this.dest.y-this.y)*rate;
      this.zoom+=(this.dest.zoom-this.zoom)*rate;
      if(Math.abs(this.dest.x-this.x)+Math.abs(this.dest.y-this.y)<.6)this.dest=null;
    }
    ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
    box(ctx,0,0,this.width,this.height,colors.outside);
    const floor=this.world.floors[this.floor];if(!floor)return;
    // Subtle pixel pattern behind world footprint
    for(let y=0;y<this.height;y+=32)for(let x=0;x<this.width;x+=32)
      if(((x+y)/32)%4===0)box(ctx,x,y,2,2,'#27343d');
    ctx.save();ctx.translate(this.width/2,this.height/2);
    ctx.scale(this.zoom,this.zoom);ctx.translate(-this.x,-this.y);
    box(ctx,-13,-7,floor.width+30,floor.height+31,'#00000055');
    box(ctx,-7,-7,floor.width+14,floor.height+14,'#354653');
    for(let y=0;y<floor.h;y++)for(let x=0;x<floor.w;x++){
      const tile=floor.tiles[y*floor.w+x];
      if(tile===0)continue;
      const xx=x*TILE,yy=y*TILE;
      if(tile===2){
        box(ctx,xx,yy,TILE,TILE,colors.hall);
        box(ctx,xx+1,yy+1,TILE-2,TILE-2,decorSeed(x,y)<50?'#bbb9ad':'#b5b1a6');
        box(ctx,xx+2,yy+2,2,2,'#d1c8b9');
      }
    }
    // Each room independent, with visible physical walls and themed floors
    for(const room of floor.rooms){
      const theme=themeOf(room),highlight=this.selected===room.id;
      const {x:rx,y:ry,w:rw,h:rh}=room;
      if(room.projectId==='hq'&&this.premium.drawRoom(ctx,room,{selected:highlight,time:now})){
        drawRoomAtmosphere(ctx,room,now,{reducedMotion:this.reducedMotion});
        continue;
      }
      if(this.departments.drawRoom(ctx,room,{selected:highlight,time:now})){
        drawRoomAtmosphere(ctx,room,now,{reducedMotion:this.reducedMotion});
        continue;
      }
      box(ctx,rx-6,ry-4,rw+11,rh+12,'#26333c');
      for(let y=room.ty;y<room.ty+ROOM_H;y++)for(let x=room.tx;x<room.tx+ROOM_W;x++){
        const xx=x*TILE,yy=y*TILE;
        if(floor.tiles[y*floor.w+x]===3)continue;
        box(ctx,xx,yy,TILE,TILE,theme.floor);
        const n=decorSeed(x+room.theme,y);
        if(n<55)box(ctx,xx+1,yy+1,TILE-2,TILE-2,n<25?'#ffffff0d':'#00000009');
        if((x+y)%4===0)box(ctx,xx+2,yy+2,2,2,'#ffffff1e');
        line(ctx,xx,yy+TILE,xx+TILE,yy+TILE,'#6f645c18');
        line(ctx,xx+TILE,yy,xx+TILE,yy+TILE,'#6f645c14');
      }
      const rugX=rx+TILE*2,rugY=ry+TILE*3;
      box(ctx,rugX,rugY,TILE*9,TILE*5,theme.rug+'8a');
      box(ctx,rugX+5,rugY+5,TILE*9-10,TILE*5-10,'#ffffff0b');
      // Windows at top, wall panels, wall depth
      box(ctx,rx,ry-4,rw,9,'#4b5661');
      box(ctx,rx+TILE*2,ry-6,TILE*4,8,'#8cbed0');
      for(let x=rx+TILE*2;x<rx+TILE*6;x+=TILE)box(ctx,x+1,ry-5,2,7,'#d2e5db');
      box(ctx,rx,ry+rh-5,rw,8,'#5c655e');
      const doorX=room.door.x*TILE;
      const doorY=room.door.y*TILE;
      if(room.door.y===room.ty+ROOM_H-1)box(ctx,doorX-TILE,ry+rh-7,TILE*3,12,theme.floor);
      else box(ctx,doorX-TILE,ry-8,TILE*3,12,theme.floor);
      box(ctx,rx-4,ry,rw>0?7:0,rh,'#56656d');
      box(ctx,rx+rw-4,ry,8,rh,'#51606a');
      box(ctx,rx,ry+rh-5,6,11,'#8a7768');box(ctx,rx+rw-8,ry+rh-5,8,11,'#8a7768');
      // Color coded room header as an in-world sign, not external overlay.
      box(ctx,rx+13,ry+10,Math.min(255,rw-27),28,'#152b3b');
      box(ctx,rx+13,ry+10,5,28,theme.accent);
      text(ctx,room.name.length>22?room.name.slice(0,20)+'…':room.name,rx+27,ry+29,
        {color:'#f5f6ee',size:room.name.length>20?12:14,weight:800});
      if(highlight){
        ctx.strokeStyle='#f1d58d';ctx.lineWidth=2;ctx.strokeRect(rx-2,ry-2,rw+4,rh+4);
      }
    }
    // Ambient corridor lighting: benches, plants and cross-floor wayfinding.
    for(let y=0;y<floor.h;y++){
      if(y%14!==0||y<ROOM_H+MARGIN)continue;
      for(let col=0;col<COLUMNS;col++){
        const xx=(MARGIN+col*(ROOM_W+GAP_X)+7)*TILE;
        const yy=(y+.5)*TILE;
        box(ctx,xx-24,yy-2,48,5,'#d6c4a5');box(ctx,xx-14,yy+3,28,3,'#947e6b');
      }
    }
    // Paint free-standing furniture and people in one depth-sorted scene.
    // A character behind a bookcase is hidden by it; a character in front
    // is visible. The world model is never mutated by drawing.
    const premiumArt=this.premium.ready&&this.departments.ready;
    const actors=this.world.mode==='demo'?
      this.world.agents.filter(a=>a.floor===this.floor):[];
    const roomsById=new Map(floor.rooms.map(r=>[r.id,r]));
    const queue=buildDepthQueue(floor,actors,room=>{
      if(!premiumArt)return [];
      return room.projectId==='hq'?
        this.premium.roomDecorations(room):this.departments.roomDecorations(room);
    },{hideModelProps:premiumArt,deskForeground:premiumArt});
    this.lastQueueStats={decor:0,objects:0,actors:0,deskFronts:0,items:queue.length};
    for(const item of queue){
      this.lastQueueStats[item.kind==='actor'?'actors':
        item.kind==='object'?'objects':item.kind==='desk-front'?'deskFronts':'decor']++;
      if(item.kind==='desk-front'){
        this.premium.drawDeskForeground(ctx,item.object);
        continue;
      }
      if(item.kind==='decor'){
        const room=roomsById.get(item.roomId);
        if(room?.projectId==='hq')this.premium.drawDecoration(ctx,item.decor,now,this.world.demoMeeting);
        else this.departments.drawDecoration(ctx,item.decor,now);
        continue;
      }
      if(item.kind==='object'){
        const room=roomsById.get(item.roomId);
        if(room?.projectId==='hq'&&this.premium.ready){
          if(item.object.type==='desk')this.premium.drawDesk(ctx,item.object,now);
          // Conference table, cabinets and plants are room decorations.
          else if(!['conference','plant','cabinet'].includes(item.object.type))
            drawObject(ctx,item.object,now);
          continue;
        }
        if(this.departments.drawFurniture(ctx,item.object,now))continue;
        drawObject(ctx,item.object,now);
        continue;
      }
      const actor=item.actor;
      const selected=this.selected===actor.id;
      if(!this.premium.drawActor(ctx,actor,now,{selected}))
        drawAgent(ctx,actor,now,{selected,mode:this.world.mode});
    }
    // Signage for hall; source of truth remains floors data
    text(ctx,'FLOOR '+(this.floor+1)+'  /  VOLKOVITSKY AI COMPANY',
      19,floor.height-16,{color:'#516777',size:13});
    ctx.restore();
    // Bottom-left world position HUD
    box(ctx,14,this.height-36,180,25,'#111d29d9');
    text(ctx,'ЭТАЖ '+(this.floor+1)+'  ·  '+floor.rooms.length+' КАБИНЕТОВ',
      25,this.height-19,{color:'#d6e5df',size:11});
  }
  dispose(){window.removeEventListener('resize',this._resize)}
}
