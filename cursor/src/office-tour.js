/* ART V3 guided walkthrough — display-only orchestration.
 * The controller navigates existing project rooms. No tasks, backend calls,
 * synthetic completed outcomes, installation or API keys.
 */
const finite=(x,fallback=0)=>Number.isFinite(x)?x:fallback;
const normalized=rooms=>(Array.isArray(rooms)?rooms:[])
  .filter(r=>r && typeof r.id==='string' && Number.isFinite(r.floor))
  .map(r=>({id:r.id,name:String(r.name||r.id),projectId:String(r.projectId||''),
    floor:r.floor,part:Number(r.part)||0}));
export class OfficeTour{
  constructor({onStep=()=>{},onChange=()=>{},dwellSeconds=8,hqSeconds=15}={}){
    this.onStep=onStep;
    this.onChange=onChange;
    this.dwellSeconds=Math.max(2,finite(dwellSeconds,8));
    this.hqSeconds=Math.max(2,finite(hqSeconds,15));
    this.active=false;
    this.paused=false;
    this.completed=false;
    this.index=0;
    this.elapsed=0;
    this.rooms=[];
  }
  get current(){return this.active?this.rooms[this.index]||null:null}
  get duration(){return this.current?.projectId==='hq'?this.hqSeconds:this.dwellSeconds}
  get progress(){return this.active?Math.min(1,this.elapsed/this.duration):0}
  get state(){return Object.freeze({active:this.active,paused:this.paused,
    completed:this.completed,index:this.index,total:this.rooms.length,
    elapsed:this.elapsed,duration:this.active?this.duration:0,progress:this.progress,
    roomId:this.current?.id||null,name:this.current?.name||''})}
  start(rooms){
    const original=normalized(rooms);
    const unique=new Set();
    const available=original.filter(r=>!unique.has(r.id)&&unique.add(r.id));
    if(!available.length)return false;
    this.rooms=available;
    this.index=0;
    this.elapsed=0;
    this.active=true;
    this.paused=false;
    this.completed=false;
    this.onStep(this.current,this.state);
    this.onChange(this.state);
    return true;
  }
  _go(index){
    if(!this.active||index<0||index>=this.rooms.length)return false;
    this.index=index;
    this.elapsed=0;
    this.onStep(this.current,this.state);
    this.onChange(this.state);
    return true;
  }
  next(){
    if(!this.active)return false;
    if(this.index>=this.rooms.length-1){this.stop({completed:true});return true}
    return this._go(this.index+1);
  }
  previous(){return this._go(this.index-1)}
  setPaused(paused){
    if(!this.active)return false;
    this.paused=!!paused;
    this.onChange(this.state);
    return true;
  }
  update(dt){
    if(!this.active||this.paused)return false;
    this.elapsed+=Math.max(0,Math.min(finite(dt),.25));
    if(this.elapsed<this.duration)return false;
    this.next();
    return true;
  }
  stop({completed=false}={}){
    if(!this.active)return false;
    this.active=false;this.paused=false;this.completed=!!completed;
    this.elapsed=0;
    this.onChange(this.state);
    return true;
  }
}
