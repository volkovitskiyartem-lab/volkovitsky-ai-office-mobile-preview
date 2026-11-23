/* VOLKOVITSKY V3 visual pilot: independent project-room artwork.
 * This module changes presentation only. It never reads Paperclip, mutates
 * world state, starts agents or changes the owner approval flow.
 */
const ROOM_ART = Object.freeze({
  budget: 'budget-shell.png',
  reels: 'reels-shell.png',
  urps: 'urps-shell.png',
  mosgortur: 'mosgortur-shell.png',
  default: 'default-shell.png'
});
const ACCENTS = Object.freeze({
  budget:'#dfb36e',reels:'#e39ace',urps:'#79c4d3',
  mosgortur:'#e9c18f',default:'#9cbeb8'
});
const tile = n => n*24;
const p = n => Math.round(n);
const glow = (ctx,x,y,r,color,opacity=.24)=>{
  const g=ctx.createRadialGradient(x,y,1,x,y,r);
  g.addColorStop(0,color+Math.round(opacity*255).toString(16).padStart(2,'0'));
  g.addColorStop(1,color+'00');
  ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
};
function panel(ctx,x,y,w,h,accent){
  ctx.fillStyle='#162737';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=accent;ctx.fillRect(x,y,3,h);
  ctx.fillStyle='#405766';ctx.fillRect(x+6,y+4,w-10,1);
}
function financeTicker(ctx,x,y,w,h,accent,time){
  ctx.fillStyle='#0f1e29';ctx.fillRect(x,y,w,h);
  ctx.fillStyle=accent;ctx.fillRect(x,y,w,2);
  const pulse=.5+.5*Math.sin(time*2.2);
  const offset=Math.floor(time*18)%Math.max(1,w-40);
  ctx.fillStyle='#94d4c8';ctx.font='700 7px ui-monospace,monospace';
  const feed='DEMO · BUDGET MODEL · FORECAST · SAMPLE SCENARIO';
  ctx.fillText(feed,x+6-offset,y+14,w-8);
  ctx.fillStyle='#62a8b4';
  ctx.fillRect(x+4,y+h-4,(w-8)*pulse,2);
}
function financeWall(ctx,x,y,w,h,accent,time){
  panel(ctx,x,y,w,h,accent);
  ctx.fillStyle='#101f2a';ctx.fillRect(x+8,y+8,w-16,h-16);
  ctx.fillStyle='#7dcfb8';ctx.font='700 6px ui-monospace,monospace';
  ctx.fillText('P&L · DEMO',x+12,y+18);
  const bars=[6,11,8,15,10,18,14,12];
  bars.forEach((height,k)=>{
    ctx.fillStyle=k%2?'#68b3a4':'#e0b36f';
    const rise=height+Math.round(2*Math.sin(time*1.9+k));
    ctx.fillRect(x+14+k*9,y+h-8-rise,6,rise);
  });
  ctx.strokeStyle='#dfb36e';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+12,y+26);ctx.lineTo(x+w-12,y+26);ctx.stroke();
  for(let k=0;k<5;k++){
    const sel=k===Math.floor(time*1.4)%5;
    ctx.fillStyle=sel?'#f0df9a':'#3c6a72';
    ctx.fillRect(x+14+k*16,y+28,10,6);
  }
}
export class PremiumDepartments {
  constructor(premium){
    this.premium=premium;this.art={};this.ready=false;this.errors=[];
    this.loading=Promise.all(Object.entries(ROOM_ART).map(([key,file])=>
      new Promise((resolve,reject)=>{
        const img=new Image();img.decoding='async';
        img.onload=()=>{this.art[key]=img;resolve()};
        img.onerror=()=>reject(new Error('Missing room shell: '+file));
        img.src='./assets/rooms/'+file;
      })
    )).then(()=>{this.ready=true;return true}).catch(error=>{
      this.errors.push(String(error.message));return false;
    });
  }
  _asset(ctx,key,x,y,w,h,alpha=1){
    const im=this.art[key];if(!im?.complete||!im.naturalWidth)return false;
    ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;
    ctx.drawImage(im,x,y,w,h);ctx.restore();return true;
  }
  drawRoom(ctx,room,{selected=false,time=0}={}){
    if(!this.ready||room.projectId==='hq')return false;
    const id=ROOM_ART[room.projectId]?room.projectId:'default';
    const a=ACCENTS[id],x=room.x,y=room.y;
    if(!this._asset(ctx,id,x,y,room.w,room.h))return false;
    // Freestanding decorations are painted later in the depth queue.
    if(id==='budget'){
      financeWall(ctx,x+98,y+42,112,34,a,time);
      financeTicker(ctx,x+88,y+198,138,16,a,time);
      panel(ctx,x+20,y+52,62,22,a);
      ctx.fillStyle='#5d9a8a';
      for(let row=0;row<4;row++){
        for(let col=0;col<5;col++){
          ctx.fillRect(x+26+col*9,y+58+row*4,5,2);
        }
      }
      ctx.fillStyle='#dfb36e';ctx.font='800 8px ui-monospace,monospace';
      ctx.fillText('₽',x+52,y+67);
      glow(ctx,x+48,y+156,48,a,.08+.03*Math.sin(time*1.1));
      glow(ctx,x+232,y+84,36,'#8cdbb8',.06+.02*Math.sin(time*.9));
    } else if(id==='reels'){
      // Studio light, independent on-screen live ambience; not a task status.
      ctx.save();ctx.strokeStyle=a;ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(x+157,y+67,19,0,Math.PI*2);ctx.stroke();
      glow(ctx,x+157,y+67,36,a,.12+.04*Math.sin(time*1.6));
      ctx.restore();
      panel(ctx,x+107,y+45,96,22,a);
      ctx.fillStyle='#e5d6d0';ctx.fillRect(x+145,y+51,15,10);
      ctx.fillStyle='#c75b91';ctx.fillRect(x+151,y+52,5,8);
    } else if(id==='urps'){
      panel(ctx,x+98,y+48,112,29,a);
      const bars=[8,13,10,18,14,20,17];
      bars.forEach((height,k)=>{
        ctx.fillStyle=k%2?'#62accb':'#8dddc6';
        ctx.fillRect(x+109+k*13,y+69-height,8,height);
      });
      ctx.strokeStyle=a;ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x+108,y+63);ctx.lineTo(x+129,y+56);
      ctx.lineTo(x+146,y+62);ctx.lineTo(x+169,y+53);ctx.lineTo(x+196,y+52);ctx.stroke();
    } else if(id==='mosgortur'){
      panel(ctx,x+102,y+45,108,42,a);
      ctx.fillStyle='#77acb3';ctx.fillRect(x+111,y+52,91,26);
      ctx.fillStyle='#b6b58b';
      for(const [xx,yy,w,h] of [[117,55,21,12],[135,64,15,10],[169,57,25,8],[182,69,9,7]]){
        ctx.fillRect(x+xx,y+yy,w,h);
      }
      ctx.strokeStyle='#f0d29e';ctx.lineWidth=2;
      ctx.beginPath();ctx.moveTo(x+125,y+67);ctx.lineTo(x+147,y+72);
      ctx.lineTo(x+176,y+59);ctx.stroke();
    } else {
      panel(ctx,x+112,y+49,88,22,a);
    }
    // A physical coffee point for the employee break lifecycle, in every room.
    // Signage is drawn at runtime to remain correct after user renames a project.
    ctx.save();
    ctx.fillStyle='#112231db';ctx.fillRect(x+83,y+10,146,28);
    ctx.fillStyle=a;ctx.fillRect(x+83,y+10,4,28);
    ctx.fillStyle='#f6f0e3';ctx.font='800 11px system-ui';
    ctx.textAlign='center';ctx.textBaseline='middle';
    const label=room.name.length>22?room.name.slice(0,20)+'…':room.name;
    ctx.fillText(label,x+157,y+24,132);
    ctx.restore();
    glow(ctx,x+154,y+43,43,a,.095+.018*Math.sin(time*.8));
    if(selected){
      ctx.save();ctx.strokeStyle=a;ctx.lineWidth=2;
      ctx.strokeRect(x+1,y+1,room.w-2,room.h-2);ctx.restore();
    }
    return true;
  }
  roomDecorations(room){
    if(!this.ready||room.projectId==='hq')return [];
    const id=ROOM_ART[room.projectId]?room.projectId:'default';
    const pos=(asset,dx,dy,w,h)=>({
      asset,x:room.x+dx,y:room.y+dy,w,h,
      depth:room.y+dy+h*.88
    });
    const common=[['coffee',255,191,38,33]];
    const variants={
      budget:[['bookcase',8,48,72,101],['server',261,53,38,70],
        ['finance-ledger',228,44,54,58],['plant',263,138,43,59],...common],
      reels:[['bookcase',11,49,63,88],['server',261,65,40,67],
        ['plant',265,143,39,58],...common],
      urps:[['server',8,52,49,87],['bookcase',258,51,40,78],
        ['plant',260,143,43,59],...common],
      mosgortur:[['bookcase',11,53,57,85],['plant',260,127,42,68],
        ['coffee',261,197,38,33]],
      default:[['bookcase',10,51,58,82],['plant',259,141,46,62],
        ['coffee',262,194,36,34]]
    };
    return variants[id].map(([asset,dx,dy,w,h])=>pos(asset,dx,dy,w,h));
  }
  drawDecoration(ctx,decor,time=0){
    if(decor.asset==='finance-ledger'){
      ctx.save();
      const {x,y,w,h}=decor;
      ctx.fillStyle='#3e2e2c';ctx.fillRect(x,y,w,h);
      ctx.fillStyle='#dfb36e';ctx.fillRect(x,y,3,h);
      for(let shelf=0;shelf<4;shelf++){
        const sy=y+8+shelf*12;
        ctx.fillStyle='#567158';ctx.fillRect(x+6,sy,w-12,9);
        for(let book=0;book<4;book++){
          ctx.fillStyle=['#9bc4b0','#d9b57b','#89a7b9','#c9a0a1'][book];
          ctx.fillRect(x+8+book*11,sy+1,8,7);
        }
      }
      ctx.fillStyle='#142531';ctx.fillRect(x+10,y+h-18,w-20,12);
      ctx.fillStyle='#86d7c0';ctx.font='700 6px ui-monospace,monospace';
      ctx.fillText('LEDGER',x+14,y+h-8);
      ctx.restore();
      return true;
    }
    return this.premium._img(ctx,decor.asset,decor.x,decor.y,decor.w,decor.h);
  }
  drawFurniture(ctx,object,time){
    if(!this.ready||object.roomId==='hq')return false;
    const x=tile(object.x),y=tile(object.y);
    switch(object.type){
      case 'desk':{
        const drew=this.premium.drawDesk(ctx,object,time);
        const budgetRoom=String(object.roomId||'').startsWith('budget');
        if(budgetRoom){
          const x=tile(object.x),y=tile(object.y);
          ctx.save();
          ctx.fillStyle='#162737';ctx.fillRect(x+40,y-18,28,16);
          ctx.fillStyle='#85d9bc';ctx.fillRect(x+43,y-15,22,10);
          ctx.fillStyle='#e0b36f';
          for(let k=0;k<4;k++)ctx.fillRect(x+45+k*5,y-4,3,2);
          ctx.restore();
        }
        return drew;
      }
      case 'plant':
        return this.premium._img(ctx,'plant',x-11,y-13,42,57);
      case 'cabinet':
        return this.premium._img(ctx,'bookcase',x-6,y-16,43,56);
      case 'camera':
        ctx.save();
        ctx.fillStyle='#171d31';ctx.fillRect(x,y,23,13);
        ctx.fillStyle='#c899dc';ctx.fillRect(x+3,y+3,8,6);
        ctx.fillStyle='#75cfce';ctx.fillRect(x+11,y+4,7,5);
        ctx.fillStyle='#857b9c';ctx.fillRect(x+9,y+13,3,20);
        ctx.fillRect(x+5,y+32,11,3);ctx.restore();return true;
      case 'chart':
        panel(ctx,x-6,y-9,55,27,'#79c4d3');
        for(let k=0;k<6;k++){
          ctx.fillStyle=k%2?'#88e0bc':'#5295ba';
          ctx.fillRect(x+2+k*7,y+11-(k*5+4)%13,5,(k*5+4)%13);
        }
        return true;
      case 'map':
        panel(ctx,x-5,y-9,55,29,'#e9c18f');
        ctx.fillStyle='#538a96';ctx.fillRect(x+1,y-3,44,18);
        ctx.fillStyle='#d2bc92';ctx.fillRect(x+7,y,12,8);
        ctx.fillRect(x+24,y+2,14,10);
        return true;
    }
    return false;
  }
  status(){return {
    ready:this.ready,loaded:Object.keys(this.art).length,
    expected:Object.keys(ROOM_ART).length,errors:this.errors.slice(),
    independentRooms:Object.keys(ROOM_ART).length
  }}
}
