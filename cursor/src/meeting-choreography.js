/* Deterministic two-person meeting choreography for isolated DEMO.
 * Participants first gather at physical positions, then alternate between
 * presenting, listening, pointing at the shared tablet, and taking notes.
 * No dialogue contents, task completion or live status is inferred.
 */
export const MEETING_BEATS=Object.freeze([
  Object.freeze({key:'greeting',duration:2.2,poses:Object.freeze(['explain','listen']),caption:'ВСТРЕЧА'}),
  Object.freeze({key:'review',duration:2.6,poses:Object.freeze(['point','notes']),caption:'МАТЕРИАЛЫ'}),
  Object.freeze({key:'reply',duration:2.6,poses:Object.freeze(['listen','explain']),caption:'ОБСУЖДЕНИЕ'}),
  Object.freeze({key:'decision',duration:2.2,poses:Object.freeze(['notes','point']),caption:'ПЛАН'}),
  Object.freeze({key:'closing',duration:1.6,poses:Object.freeze(['listen','listen']),caption:'ИТОГИ'})
]);
export const MEETING_LENGTH=MEETING_BEATS.reduce((sum,beat)=>sum+beat.duration,0);
export const MEETING_POSES=Object.freeze(['explain','listen','point','notes']);
export function meetingAt(seconds){
  const t=Math.max(0,Number.isFinite(seconds)?seconds:0);
  let elapsed=0;
  for(let i=0;i<MEETING_BEATS.length;i++){
    const beat=MEETING_BEATS[i];
    if(t<elapsed+beat.duration || i===MEETING_BEATS.length-1)
      return {index:i,key:beat.key,caption:beat.caption,
        poses:beat.poses,progress:Math.min(1,Math.max(0,(t-elapsed)/beat.duration))};
    elapsed+=beat.duration;
  }
}
export function meetingSpeaker(choreography){
  if(!choreography)return -1;
  return choreography.poses.indexOf('explain');
}
