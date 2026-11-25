/* Atmosphere and art direction for isolated ART V3 room scenes.
 * Lighting is purely decorative. It never indicates real AI task state.
 * All painting is clipped to the individual room and restores Canvas state.
 */
const PALETTES=Object.freeze({
  hq:{window:'#91c4d4',monitor:'#4dcec4',warm:'#f0b975'},
  budget:{window:'#a4b8d0',monitor:'#85d9bc',warm:'#dfb36e'},
  reels:{window:'#caa8da',monitor:'#dd91c4',warm:'#dba0c3'},
  urps:{window:'#86bfd6',monitor:'#79c4d3',warm:'#6cdbb7'},
  mosgortur:{window:'#acd6d9',monitor:'#8ed2ca',warm:'#e9c18f'},
  default:{window:'#a7c8be',monitor:'#90c9be',warm:'#d2c7a1'}
});
export function roomLightPalette(projectId){
  return PALETTES[projectId]||PALETTES.default;
}
function glow(ctx,x,y,rad,color,alpha){
  const gradient=ctx.createRadialGradient(x,y,1,x,y,rad);
  gradient.addColorStop(0,color+Math.round(alpha*255).toString(16).padStart(2,'0'));
  gradient.addColorStop(.5,color+Math.round(alpha*.32*255).toString(16).padStart(2,'0'));
  gradient.addColorStop(1,color+'00');
  ctx.fillStyle=gradient;
  ctx.fillRect(x-rad,y-rad,rad*2,rad*2);
}
export function drawRoomAtmosphere(ctx,room,time,{reducedMotion=false}={}){
  const theme=roomLightPalette(room.projectId);
  const x=room.x,y=room.y,w=room.w,h=room.h;
  const motion=reducedMotion?0:Math.sin(time*.65+(room.part||0)*2);
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
  ctx.globalCompositeOperation='screen';
  // Static/window ambient is not a "working" status lamp.
  for(const dx of [48,w-49]){
    glow(ctx,x+dx,y+49,54,theme.window,.10);
  }
  glow(ctx,x+w*.51,y+90,74,theme.monitor,.035+.006*motion);
  glow(ctx,x+w*.76,y+h*.71,61,theme.warm,.052+.008*motion);
  if(room.projectId==='hq'){
    glow(ctx,x+w*.14,y+h*.38,52,'#8bc4dc',.055+.012*motion);
    glow(ctx,x+w*.25,y+h*.22,58,theme.warm,.075+.015*motion);
    glow(ctx,x+w*.84,y+h*.28,54,theme.window,.085+.014*motion);
    glow(ctx,x+w*.50,y+h*.62,82,theme.monitor,.05+.01*motion);
    glow(ctx,x+w*.50,y+h*.62,96,'#f0b975',.038+.008*motion);
    glow(ctx,x+w*.50,y+h*.86,64,theme.warm,.048+.01*motion);
    glow(ctx,x+w*.82,y+h*.78,58,'#b8a0e0',.042+.009*motion);
    glow(ctx,x+w*.18,y+h*.52,48,'#9cc4e8',.04+.008*motion);
    glow(ctx,x+w*.62,y+h*.18,46,'#a8e0f0',.05+.01*motion);
  }else if(room.projectId==='budget'){
    glow(ctx,x+w*.36,y+h*.32,64,theme.monitor,.055+.01*motion);
    glow(ctx,x+w*.78,y+h*.26,52,theme.warm,.05+.009*motion);
    glow(ctx,x+w*.18,y+h*.64,58,'#8cdbb8',.045+.008*motion);
  }
  ctx.globalCompositeOperation='source-over';
  // Floor-edge vignette: visual depth without hiding furniture or text.
  const vignette=ctx.createLinearGradient(x,y+h*.64,x,y+h);
  vignette.addColorStop(0,'rgba(15,24,34,0)');
  vignette.addColorStop(1,'rgba(15,24,34,.17)');
  ctx.fillStyle=vignette;
  ctx.fillRect(x,y+h*.64,w,h*.36);
  ctx.restore();
}
