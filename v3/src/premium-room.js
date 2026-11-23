/* Modular pixel art assets for one fully interactive 2.5D HQ room.
   This is NOT one illustration with overlaid new characters. Every prop and actor
   is a separate scene entity; characters use an actual frame-based sprite atlas.
 */
const SRC={
  shell:'rooms/hq-shell.png',
  desk:'props/executive-desk.png',
  chair:'props/leather-chair.png',
  glass:'props/glass-partition.png',
  meeting:'props/meeting-table.png',
  plant:'props/monstera.png',
  bookcase:'props/library.png',
  halo:'props/halo-light.png',
  server:'props/server-rack.png',
  coffee:'props/coffee-station.png',
  people:'agents/team-frames.png',
};
import {meetingAt} from './meeting-choreography.js';
const easing=t=>Math.max(0,Math.min(1,t));
function drawLabel(ctx,label,x,y){
  ctx.fillStyle='#0c1d2ae8';ctx.fillRect(x,y,148,22);
  ctx.fillStyle='#e1c28c';ctx.fillRect(x,y,4,22);
  ctx.fillStyle='#f2efe6';ctx.font='800 11px system-ui';
  ctx.fillText(label.slice(0,24),x+11,y+15);
}
export class PremiumHQ {
  constructor(){
    this.assets={};this.ready=false;this.failed=false;this.errors=[];
    this.loading=Promise.all(Object.entries(SRC).map(([name,path])=>new Promise((resolve,reject)=>{
      const img=new Image();img.decoding='async';
      img.onload=()=>{this.assets[name]=img;resolve()};
      img.onerror=()=>reject(new Error('Asset unavailable: '+path));
      img.src='./assets/'+path;
    }))).then(()=>{this.ready=true;return true}).catch(error=>{
      this.failed=true;this.errors.push(error.message);return false;
    });
    this.props=['bookcase','glass','meeting','plant','halo','server','coffee'];
  }
  _img(ctx,asset,x,y,w,h,{alpha=1}={}){
    const img=this.assets[asset];
    if(!img||!img.complete||img.naturalWidth===0)return false;
    ctx.save();ctx.globalAlpha*=alpha;
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(img,x,y,w,h);
    ctx.restore();return true;
  }
  drawRoom(ctx,room,{selected=false,time=0}={}){
    if(!this.ready)return false;
    const x=room.x,y=room.y;
    this._img(ctx,'shell',x,y,room.w,room.h);
    // Dynamic warm/cool lighting adds depth; never replaces the room or people.
    ctx.save();
    ctx.beginPath();ctx.rect(x,y,room.w,room.h);ctx.clip();
    ctx.globalCompositeOperation='screen';
    for(const [lx,ly,rad,color] of [
      [43,28,44,'rgba(255,168,86,'],
      [267,32,39,'rgba(91,192,237,'],
      [155,152,86,'rgba(255,156,86,'],
    ]){
      const wave=.62+.12*Math.sin(time*1.3+lx);
      const g=ctx.createRadialGradient(x+lx,y+ly,1,x+lx,y+ly,rad);
      g.addColorStop(0,color+(wave*.19).toFixed(3)+')');
      g.addColorStop(.45,color+(wave*.08).toFixed(3)+')');
      g.addColorStop(1,color+'0)');
      ctx.fillStyle=g;ctx.fillRect(x+lx-rad,y+ly-rad,rad*2,rad*2);
    }
    ctx.restore();
    ctx.save();
    ctx.beginPath();ctx.ellipse(x+156,y+153,91,47,0,0,Math.PI*2);
    ctx.strokeStyle='rgba(243,177,111,'+(.48+.16*Math.sin(time*1.7)).toFixed(3)+')';
    ctx.lineWidth=2;ctx.shadowBlur=12;ctx.shadowColor='#efbc84';ctx.stroke();
    ctx.restore();
    // Transparent architectural glass is behind actors; meeting furniture,
    // bookcases and plants are painted later at their real ground-contact depth.
    this._img(ctx,'glass',x+95,y+40,126,68,{alpha:.92});
    // Warm fixture glows without touching character or furniture layers.
    this._img(ctx,'halo',x+112,y+113,90,38,{alpha:.78+.12*Math.sin(time*1.2)});
    ctx.save();ctx.fillStyle='#edb26a';ctx.font='800 10px system-ui';
    ctx.fillText('VOLKOVITSKY',x+121,y+28);
    ctx.font='650 7px system-ui';ctx.fillStyle='#b2d6d7';
    ctx.fillText('AI COMPANY',x+140,y+37);
    ctx.restore();
    if(selected){
      ctx.save();ctx.strokeStyle='#e9c187';ctx.lineWidth=2;
      ctx.strokeRect(x+1,y+1,room.w-2,room.h-2);ctx.restore();
    }
    return true;
  }
  roomDecorations(room){
    if(room.projectId!=='hq')return [];
    const xy=(asset,dx,dy,w,h,depth=null)=>({
      asset,x:room.x+dx,y:room.y+dy,w,h,
      depth:room.y+(depth===null?dy+h*.86:depth)
    });
    return [
      xy('chair',108,102,36,43,119),
      xy('chair',164,102,36,43,119),
      // The circular table is part of the physical premium floor scene.
      // Props occupy its actual surface, rather than floating by the wall.
      xy('meeting-kit',100,136,112,50,161),
      xy('bookcase',8,43,75,94),
      xy('server',254,52,50,66),
      xy('plant',264,118,49,64),
      xy('plant',12,149,41,54),
      xy('coffee',255,192,43,37)
    ];
  }
  drawDecoration(ctx,decor,time=0,meeting=null){
    if(decor.asset==='meeting-kit'){
      this.drawTabletopInteraction(ctx,decor,time,meeting);
      return true;
    }
    return this._img(ctx,decor.asset,decor.x,decor.y,decor.w,decor.h);
  }
  drawTabletopInteraction(ctx,decor,time,meeting){
    // Independently rendered tangible props, attached to table coordinates:
    // the tablet, two paper folders and cups remain visible between meetings.
    const x=decor.x,y=decor.y;
    ctx.save();
    ctx.fillStyle='#1b3039';ctx.fillRect(x+34,y+8,49,26);
    ctx.fillStyle='#728c90';ctx.fillRect(x+36,y+9,45,23);
    ctx.fillStyle='#0d2534';ctx.fillRect(x+38,y+11,41,19);
    ctx.strokeStyle='#b5a17f';ctx.lineWidth=1;
    ctx.strokeRect(x+38.5,y+11.5,40,18);
    const active=meeting?.phase==='discussion'&&Number.isFinite(meeting.readyAt);
    const beat=active?meetingAt(time-meeting.readyAt):null;
    const swatches=['#73c1c5','#b4d78d','#e5bd83','#dca2c9','#99bfdc'];
    for(let k=0;k<5;k++){
      const selected=beat?.index===k;
      ctx.fillStyle=selected?'#e9d69a':swatches[k];
      ctx.fillRect(x+43+k*6,y+25-(selected?7:(k%3+2)),4,selected?9:(k%3+4));
    }
    // Notebook pages: turn-taking suggests working with materials, never a
    // fake task result or a claim of real collaboration.
    for(const [px,py,angle] of [[9,13,-.12],[91,12,.14]]){
      ctx.save();ctx.translate(x+px,y+py);ctx.rotate(angle);
      ctx.fillStyle='#c4a779';ctx.fillRect(0,1,18,15);
      ctx.fillStyle='#f1e6c9';ctx.fillRect(1,0,16,14);
      ctx.fillStyle='#9d8e79';
      for(let line=0;line<3;line++)ctx.fillRect(3,4+line*3,11-line,1);
      ctx.restore();
    }
    for(const [cx,cy] of [[27,12],[89,34]]){
      ctx.fillStyle='#896d57';ctx.fillRect(x+cx-1,y+cy,11,9);
      ctx.fillStyle='#e5dac2';ctx.fillRect(x+cx,y+cy,9,7);
      ctx.fillStyle='#7e5c46';ctx.fillRect(x+cx+2,y+cy+1,5,3);
      ctx.strokeStyle='#d5cbb3';ctx.strokeRect(x+cx+9,y+cy+2,3,4);
    }
    if(active){
      ctx.fillStyle='#233a47e8';ctx.fillRect(x+30,y-9,62,12);
      ctx.fillStyle='#b6eadf';ctx.font='700 6px system-ui';
      ctx.fillText(beat.caption,x+34,y-1,54);
      ctx.fillStyle='#70d5bd';ctx.fillRect(x+32,y+0,58*beat.progress,1);
    }
    ctx.restore();
  }
  drawDesk(ctx,obj,time){
    if(!this.ready)return false;
    // Position is taken from the world objects, not from a baked static photo.
    const x=obj.x*24,y=obj.y*24;
    this._img(ctx,'chair',x-5,y+23,36,43);
    this._img(ctx,'desk',x-19,y-22,76,64);
    const blink=Math.floor(time*3+obj.index)%4;
    ctx.save();
    ctx.globalCompositeOperation='screen';
    const screenLight=ctx.createRadialGradient(x+21,y-5,1,x+21,y-5,25);
    screenLight.addColorStop(0,'rgba(67,210,235,.22)');
    screenLight.addColorStop(1,'rgba(67,210,235,0)');
    ctx.fillStyle=screenLight;ctx.fillRect(x-4,y-30,50,50);
    ctx.globalAlpha=.7+.3*Math.sin(time*3+obj.x);
    ctx.fillStyle='#86ddc8';
    ctx.fillRect(x+18+blink*3,y-12,2,4+blink);
    ctx.fillStyle='#b8dfef';
    ctx.fillRect(x+28,y-7,2,4);
    ctx.restore();
    return true;
  }
  drawDeskForeground(ctx,obj){
    // The lower wooden fascia must visually overlap a seated employee's
    // torso, while the monitor and chair remain behind the employee.
    if(!this.ready)return false;
    const img=this.assets.desk;
    if(!img||!img.complete||!img.naturalWidth)return false;
    const sourceHeight=img.naturalHeight;
    const sourceWidth=img.naturalWidth;
    const split=42/64;
    const sy=Math.round(sourceHeight*split);
    const x=obj.x*24-19,y=obj.y*24-22;
    ctx.save();
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(img,0,sy,sourceWidth,sourceHeight-sy,
      x,y+42,76,22);
    ctx.restore();
    return true;
  }
  drawActor(ctx,actor,time,{selected=false}={}){
    if(!this.ready)return false;
    const atlas=this.assets.people;
    const frameWidth=40,frameHeight=57,scale=3;
    const walking=actor.path?.length>0;
    let anim=0,frame=0;
    if(walking){
      anim=actor.facing==='up'?3:(actor.facing==='right'||actor.facing==='left')?2:1;
      frame=Math.floor(actor.step*1.55)%4;
    }else if(actor.state==='seating'){
      anim=4;frame=Math.min(3,Math.floor(easing(actor.seatProgress)*4));
    }else if(actor.state==='typing'){
      anim=5;frame=Math.floor(time*5.2+actor.phase)%4;
    }else if(actor.state==='review'){
      anim=7;frame=Math.floor(time*3.2+actor.phase)%4;
    }else if(actor.state==='break'){
      anim=6;frame=Math.floor(time*3+actor.phase)%4;
    }else if(actor.state==='stretch'){
      anim=8;frame=Math.floor(time*3+actor.phase)%4;
    }else if(actor.state==='meeting'){
      const pose=actor.meetingPose||'listen';
      anim=pose==='listen'?10:pose==='explain'?11:pose==='point'?12:7;
      frame=Math.floor(time*(pose==='listen'?2.2:pose==='point'?4.0:3.1)+actor.phase)%4;
    }else if(actor.state==='meeting-wait'){
      anim=10;frame=Math.floor(time*1.4+actor.phase)%4;
    }else if(actor.state==='wave'||actor.state==='meeting-wrap'){
      anim=9;frame=Math.floor(time*4.1+actor.phase)%4;
    }else if(actor.state==='standing'){
      anim=4;frame=Math.min(3,Math.floor(easing(actor.seatProgress)*4));
    }else{
      anim=0;frame=Math.floor(time*1.1+actor.phase)%4;
    }
    const isSeated=anim===4||anim===5||anim===7;
    const variant=(actor.variant||0)%8;
    const srcX=(anim*4+frame)*frameWidth*scale,srcY=variant*frameHeight*scale;
    const x=Math.round(actor.x-20),y=Math.round(actor.y-(isSeated?49:54));
    ctx.save();
    ctx.fillStyle='#0e182340';ctx.beginPath();
    ctx.ellipse(Math.round(actor.x),Math.round(actor.y),12,4,0,0,Math.PI*2);ctx.fill();
    if(actor.facing==='left'&&walking){
      ctx.translate(actor.x*2,0);ctx.scale(-1,1);
    }
    ctx.imageSmoothingEnabled=true;
    ctx.drawImage(atlas,srcX,srcY,frameWidth*scale,frameHeight*scale,x,y,frameWidth,frameHeight);
    ctx.restore();
    if(actor.state==='meeting'&&actor.meetingPose==='explain'){
      // The speaker gets a restrained original talk gesture indicator;
      // listener and note-taker have no fictional 'task done' bubbles.
      ctx.save();
      const bx=Math.round(actor.x+7),by=Math.round(actor.y-69);
      ctx.fillStyle='#1b3442e8';ctx.fillRect(bx,by,27,13);
      ctx.fillStyle='#e3b67b';ctx.fillRect(bx,by,2,13);
      ctx.fillStyle='#b8edd9';
      for(let i=0;i<3;i++){
        const level=i===Math.floor(time*3+actor.phase)%3?6:3;
        ctx.fillRect(bx+7+i*6,by+8-level,3,level);
      }
      ctx.restore();
    }
    if(selected){
      ctx.save();ctx.strokeStyle='#ffd48a';ctx.lineWidth=1.5;
      ctx.strokeRect(actor.x-20,actor.y-49,40,52);ctx.restore();
    }
    return true;
  }
  status(){
    return {ready:this.ready,failed:this.failed,
      loaded:Object.keys(this.assets).length,
      props:this.props.length,frameAtlas:this.assets.people?.naturalWidth||0,
      errors:this.errors.slice()};
  }
}
