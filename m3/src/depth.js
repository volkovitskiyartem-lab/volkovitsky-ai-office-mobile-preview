/* Visual-only painter order for a genuine 2.5D office.
 * Ground contact (not an entity's top-left) defines occlusion. It does not
 * modify routing, source-of-truth tasks, permissions or employee state.
 */
export function depthOfObject(object,tile=24){
  const y=object.y*tile;
  if(object.type==='desk')return y+12;
  if(object.type==='cabinet')return y+27;
  if(object.type==='plant')return y+31;
  if(object.type==='conference')return y+23;
  return y+20;
}
export function buildDepthQueue(floor,agents,roomDecorations=()=>[],{
  hideModelProps=false,tile=24,deskForeground=false
}={}){
  if(!floor)return [];
  const queue=[];
  let id=0;
  for(const room of floor.rooms){
    for(const decor of roomDecorations(room)||[]){
      queue.push({
        kind:'decor',depth:decor.depth??(decor.y+decor.h*.87),
        serial:id++,decor,roomId:room.id
      });
    }
  }
  for(const object of floor.objects){
    // These decorative assets come from the proper room library. Rendering
    // both would show two overlapping bookcases or plants.
    if(hideModelProps && (object.type==='plant'||object.type==='cabinet'))continue;
    queue.push({
      kind:'object',depth:depthOfObject(object,tile),
      serial:id++,object,roomId:object.roomId
    });
    // A separate fascia masks lower parts of the seated sprite, not the head.
    if(deskForeground&&object.type==='desk'){
      queue.push({
        kind:'desk-front',depth:object.y*tile+52,
        serial:id++,object,roomId:object.roomId
      });
    }
  }
  for(const actor of agents){
    if(actor.floor!==floor.id)continue;
    queue.push({
      kind:'actor',depth:actor.y,
      serial:id++,actor,roomId:actor.roomId
    });
  }
  // Stable tie-breaker ensures consistent layering even when positions match.
  queue.sort((a,b)=>a.depth-b.depth || a.serial-b.serial);
  return queue;
}
