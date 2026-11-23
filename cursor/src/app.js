/* V5 — independent mobile-first application shell.
 * All interactions stay local to this experimental office; no remote API writes.
 */
import {OfficeWorld} from './world.js';
import {OfficeRenderer} from './renderer.js';
import {portraitFor,staffStateLabel} from './staff-presentation.js';
import {OfficeTour} from './office-tour.js';
import {restoreDemoCatalog,saveDemoCatalog} from './catalog.js';
const $=id=>document.getElementById(id);
const world=new OfficeWorld();
const isBrowserTest=new URLSearchParams(location.search).has('test')||
  new URLSearchParams(location.search).has('smoke');
if(!isBrowserTest)restoreDemoCatalog(world);
const saveLocal=()=>{if(!isBrowserTest)saveDemoCatalog(world)};
const officeEmblem={hq:'♜',budget:'▣',reels:'▸',urps:'▥',mosgortur:'✈'};
const roomNotes={
  hq:'Координация компании, задачи и совещания.',
  budget:'Финансовые модели, расчёты и бюджеты.',
  reels:'Контент, монтаж и визуальное производство.',
  urps:'Аналитика, отчёты и показатели.',
  mosgortur:'Партнёры, туристические продукты и продажи.',
};
const dom={
  canvas:$('officeCanvas'),floors:$('floorTabs'),offices:$('officeList'),
  desc:$('roomDescription'),heading:$('roomHeadline'),floorLabel:$('floorLabel'),
  projectCount:$('countProjects'),roomsCount:$('countRooms'),
  agentCount:$('countAgents'),floorCount:$('countFloors'),
  modeDemo:$('modeDemo'),modeLive:$('modeLive'),modeHeadline:$('modeHeadline'),
  systemState:$('systemState'),modeNote:$('stageModeNote'),
  roster:$('staffRoster'),staffCount:$('staffCount'),events:$('activityList'),
  inspector:$('inspector'),title:$('inspectorTitle'),info:$('inspectorDescription'),
  featureIcon:$('featureIcon'),liveWarning:$('liveWarning'),eventModeBadge:$('eventModeBadge'),
  dialog:$('entityDialog'),dialogTitle:$('dialogTitle'),dialogHelp:$('dialogHelp'),
  dialogForm:$('entityForm'),dialogMessage:$('dialogMessage'),
  selectedPortrait:$('selectedPortrait'),observeAgent:$('observeAgent'),
  demoMeetingButton:$('demoMeetingButton'),watchNote:$('watchNote'),
  tourToggle:$('tourToggle'),tourHUD:$('tourHUD'),tourCount:$('tourCount'),
  tourRoom:$('tourRoom'),tourDescription:$('tourDescription'),tourProgress:$('tourProgress'),
  tourPrevious:$('tourPrevious'),tourPause:$('tourPause'),tourNext:$('tourNext'),
  tourStop:$('tourStop'),sceneMode:$('sceneMode'),
  dialogEyebrow:$('dialogEyebrow'),dialogName:$('entityName'),
  dialogNameLabel:$('entityNameLabel'),dialogProject:$('entityProject'),
  targetRow:$('targetRow'),task:$('taskInput'),toast:$('toast'),
};
let selectedRoom=world.roomFor('hq'),selectedAgent=null,dialogType='project',lastEventUpdate=-1;
let toastTimer=0;
let tour=null;
const renderer=new OfficeRenderer(dom.canvas,world,{
  onSelect:selection=>{
    if(selection.type==='room'){
      selectedAgent=null;selectRoom(selection.value,false);
    }else{
      selectAgent(selection.value,{follow:true});
    }
  },
  onCamera:change=>{
    if(change?.manual&&tour?.active)tour.stop();
  }
});
function titleFor(room){return room?.name||'Весь этаж'}
function projectFor(room){return world.projects.find(p=>p.id===room?.projectId)}
function badgeFor(room){return officeEmblem[room?.projectId]||'▧'}
function announce(msg,warning=false){
  clearTimeout(toastTimer);
  dom.toast.textContent=msg;dom.toast.hidden=false;
  dom.toast.style.background=warning?'#5b4131':'#244638';
  dom.toast.style.borderColor=warning?'#c69971':'#75b4a4';
  toastTimer=setTimeout(()=>{dom.toast.hidden=true},3900);
}
function selectRoom(room,focus=true,{fromTour=false}={}){
  if(!room)return;
  if(!fromTour&&tour?.active)tour.stop();
  selectedRoom=room;selectedAgent=null;
  renderer.stopFollow();renderer.selected=room.id;
  if(focus)renderer.focusRoom(room,true);
  else{world.currentFloor=room.floor;renderer.floor=room.floor}
  dom.heading.textContent=titleFor(room);
  dom.desc.textContent=projectFor(room)?.subtitle||roomNotes[room.projectId]||'Рабочая зона проекта';
  dom.floorLabel.textContent=(room.floor+1)+' ЭТАЖ';
  drawFloors();drawRooms();paintInspector();
}
function selectAgent(agent,{follow=true}={}){
  if(!agent)return false;
  if(tour?.active)tour.stop();
  selectedAgent=agent;
  selectedRoom=world.rooms.find(r=>r.id===agent.roomId)||
    world.rooms.find(r=>r.members.includes(agent.id))||selectedRoom;
  if(follow&&world.mode==='demo')renderer.focusAgent(agent.id);
  else renderer.selected=agent.id;
  paintInspector();
  dom.inspector.classList.add('is-visible');
  return true;
}
function paintTour(state){
  const active=!!state.active;
  dom.tourHUD.hidden=!active;
  dom.tourToggle.setAttribute('aria-pressed',String(active));
  dom.tourToggle.setAttribute('aria-label',active?'Завершить экскурсию':'Начать экскурсию по офису');
  dom.tourToggle.title=active?'Завершить экскурсию':'Показать все кабинеты по очереди';
  if(!active)return;
  const current=tour?.current;
  dom.tourCount.textContent=String(state.index+1).padStart(2,'0')+
    ' / '+String(state.total).padStart(2,'0')+' · DEMO';
  dom.tourRoom.textContent=current?.name||'Проектный кабинет';
  dom.tourDescription.textContent=roomNotes[current?.projectId]||
    (current?.part?'Дополнительный кабинет проекта.':'Здесь работает проектная команда.');
  dom.tourProgress.style.width=Math.round(state.progress*100)+'%';
  dom.tourProgress.parentElement.setAttribute('aria-valuenow',String(Math.round(state.progress*100)));
  dom.tourPrevious.disabled=state.index===0;
  dom.tourPause.textContent=state.paused?'▶ Продолжить':'Ⅱ Пауза';
  dom.tourPause.setAttribute('aria-pressed',String(state.paused));
  dom.tourNext.textContent=state.index===state.total-1?'Готово ✓':'Далее →';
}
tour=new OfficeTour({
  hqSeconds:15,dwellSeconds:9,
  onStep:step=>{
    const room=world.rooms.find(r=>r.id===step.id);
    if(!room)return;
    selectRoom(room,true,{fromTour:true});
    // Touring only changes the camera. Live work and DEMO choreography
    // continue on their own schedules; this never starts a task or meeting.
  },
  onChange:state=>{
    paintTour(state);
    if(state.completed)announce('Экскурсия завершена. Можно выбрать любой кабинет или сотрудника.');
  }
});
function drawFloors(){
  dom.floors.replaceChildren();
  world.floors.forEach(f=>{
    const b=document.createElement('button');
    b.type='button';b.className='floor-tab'+(f.id===renderer.floor?' active':'');
    b.textContent=(f.id+1)+' эт.';b.title='Этаж '+(f.id+1);
    b.onclick=()=>{
      if(tour?.active)tour.stop();
      renderer.focusFloor(f.id);world.currentFloor=f.id;
      selectedRoom=null;selectedAgent=null;
      dom.heading.textContent='Обзор '+(f.id+1)+' этажа';
      dom.desc.textContent='Выбери кабинет или сотрудника на карте.';
      dom.floorLabel.textContent=(f.id+1)+' ЭТАЖ';
      drawFloors();drawRooms();paintInspector();
    };
    dom.floors.append(b);
  });
}
function drawRooms(){
  dom.offices.replaceChildren();
  const onFloor=world.floorRooms(renderer.floor);
  onFloor.forEach(room=>{
    const b=document.createElement('button');
    b.type='button';b.className='office-entry'+(room.id===selectedRoom?.id?' selected':'');
    b.setAttribute('aria-current',room.id===selectedRoom?.id?'true':'false');
    const sym=document.createElement('span');sym.className='office-symbol';
    sym.textContent=badgeFor(room);
    const copy=document.createElement('span');copy.className='office-copy';
    const title=document.createElement('strong');title.textContent=room.name;
    const sub=document.createElement('small');
    const count=world.agentAtRoom(room.id).length;
    sub.textContent=count+' чел. · '+(room.part?'доп. кабинет':'рабочая зона');
    copy.append(title,sub);b.append(sym,copy);
    b.onclick=()=>selectRoom(room,true);
    dom.offices.append(b);
  });
}
function paintInspector(){
  const room=selectedRoom;
  if(selectedAgent){
    dom.title.textContent=selectedAgent.name;
    dom.info.textContent='Сотрудник · '+(projectFor(room)?.name||'кабинет')+
      '. В DEMO его движения и состояния смоделированы.';
    dom.featureIcon.textContent='◕';
    dom.selectedPortrait.src=portraitFor(selectedAgent);
    dom.selectedPortrait.hidden=false;
    dom.observeAgent.hidden=false;
    dom.demoMeetingButton.hidden=true;
    dom.observeAgent.disabled=world.mode!=='demo';
    const active=renderer.followId===selectedAgent.id&&world.mode==='demo';
    dom.observeAgent.setAttribute('aria-pressed',String(active));
    dom.observeAgent.textContent=active?'◉ Остановить наблюдение':'◎ Наблюдать за сотрудником';
  }else{
    dom.title.textContent=room?.name||'Обзор этажа';
    dom.info.textContent=room?(projectFor(room)?.subtitle||'Рабочее помещение'):
      'Кабинеты и сотрудники текущего этажа.';
    dom.featureIcon.textContent=badgeFor(room);
    dom.selectedPortrait.hidden=true;dom.observeAgent.hidden=true;
    const canMeet=world.mode==='demo'&&room?.projectId==='hq';
    dom.demoMeetingButton.hidden=!canMeet;
    dom.demoMeetingButton.disabled=!canMeet||!!world.demoMeeting;
    dom.demoMeetingButton.textContent=world.demoMeeting?'● Демо-совещание идёт':'▶ Демо-совещание';
  }
  const watching=world.mode==='demo'&&renderer.followId&&selectedAgent?.id===renderer.followId;
  dom.watchNote.hidden=!watching;
  if(watching)dom.watchNote.textContent=selectedAgent.name+' · '+staffStateLabel(selectedAgent,'demo');
  const list=room?world.agentAtRoom(room.id):world.agents.filter(a=>a.floor===renderer.floor);
  dom.staffCount.textContent=String(list.length);
  dom.roster.replaceChildren();
  if(!list.length){
    const line=document.createElement('div');line.className='activity-item';
    line.textContent='Пока нет сотрудников. Добавь агента через «Новый сотрудник».';
    dom.roster.append(line);
  }
  for(const agent of list){
    const block=document.createElement('button');block.type='button';
    block.className='staff-item'+(selectedAgent?.id===agent.id?' selected':'');
    block.setAttribute('aria-label','Наблюдать: '+agent.name);
    block.onclick=()=>selectAgent(agent,{follow:true});
    const avatar=document.createElement('img');avatar.className='staff-avatar';
    avatar.src=portraitFor(agent);avatar.alt='';avatar.loading='lazy';
    const copy=document.createElement('div'),name=document.createElement('strong'),status=document.createElement('small');
    name.textContent=agent.name;status.textContent=staffStateLabel(agent,world.mode);
    copy.append(name,status);block.append(avatar,copy);
    dom.roster.append(block);
  }
}
function paintEvents(){
  dom.events.replaceChildren();
  for(const event of world.events.slice(0,9)){
    const node=document.createElement('div');node.className='activity-item';
    const meta=document.createElement('small');meta.textContent='ДЕМО / '+event.time.toFixed(0)+' С';
    const label=document.createElement('span');label.textContent=event.message;
    node.append(meta,label);dom.events.append(node);
  }
}
function refreshStats(){
  dom.projectCount.textContent=String(world.projects.length);
  dom.roomsCount.textContent=String(world.rooms.length);
  dom.agentCount.textContent=String(world.agents.length);
  dom.floorCount.textContent=String(world.floors.length);
}
function refreshMode(){
  const demo=world.mode==='demo';
  dom.modeDemo.classList.toggle('active',demo);
  dom.modeLive.classList.toggle('active',!demo);
  dom.modeDemo.setAttribute('aria-pressed',String(demo));
  dom.modeLive.setAttribute('aria-pressed',String(!demo));
  dom.modeHeadline.textContent=demo?'ДЕМО · ЖИВОЙ ОФИС':'LIVE · НЕТ ПОДКЛЮЧЕНИЯ';
  dom.modeNote.textContent=demo?
    'DEMO · маршруты и события имитируются, агенты не запущены':
    'LIVE · Paperclip пока не подключён';
  dom.modeNote.classList.toggle('live-note',!demo);
  dom.systemState.textContent=demo?'Изолированный прототип · без API':
    'Live-интеграция не настроена · реальных статусов нет';
  dom.liveWarning.hidden=demo;
  dom.eventModeBadge.textContent=demo?'ДЕМО':'НЕТ ДАННЫХ';
  paintInspector();paintEvents();
}
function revealInspector(){paintInspector();dom.inspector.classList.add('is-visible')}
function openDialog(type){
  if(tour?.active)tour.stop();
  if(world.mode==='live'){
    announce('Добавление проектов и сотрудников доступно пока только в демонстрационном мире.',true);
    return;
  }
  dialogType=type;dom.dialogMessage.textContent='';
  dom.dialogName.value='';dom.dialogName.maxLength=type==='project'?56:40;
  if(type==='project'){
    dom.dialogTitle.textContent='Новый проект';
    dom.dialogEyebrow.textContent='РАСШИРЕНИЕ КОМПАНИИ';
    dom.dialogHelp.textContent='Новый проект автоматически создаёт кабинет. При заполнении этажа открывается следующий.';
    dom.dialogNameLabel.textContent='Название проекта';dom.dialogName.placeholder='Например: VOID VIBE';
    dom.targetRow.hidden=true;
  }else{
    dom.dialogTitle.textContent='Новый сотрудник';
    dom.dialogEyebrow.textContent='РЕЕСТР СОТРУДНИКОВ';
    dom.dialogHelp.textContent='Персонаж получит собственное рабочее место и анимацию. При переполнении проекта появится дополнительный кабинет.';
    dom.dialogNameLabel.textContent='Имя сотрудника';dom.dialogName.placeholder='Например: Research Agent';
    dom.targetRow.hidden=false;dom.dialogProject.replaceChildren();
    for(const project of world.projects){
      const opt=document.createElement('option');opt.value=project.id;opt.textContent=project.name;
      dom.dialogProject.append(opt);
    }
    dom.dialogProject.value=selectedRoom?.projectId||world.projects[0]?.id||'';
  }
  dom.dialog.showModal();dom.dialogName.focus();
}
function createEntity(e){
  e.preventDefault();const name=dom.dialogName.value.trim();
  try{
    if(dialogType==='project'){
      const project=world.addProject(name);
      const room=world.roomFor(project.id);
      dom.dialog.close();saveLocal();refreshStats();selectRoom(room);
      announce('Создан кабинет «'+name+'». Этажей: '+world.floors.length);
    }else{
      const projectId=dom.dialogProject.value;
      const agent=world.addAgent(name,projectId);
      const room=world.rooms.find(r=>r.members.includes(agent.id));
      dom.dialog.close();saveLocal();refreshStats();selectRoom(room);
      announce('Новый сотрудник «'+name+'» появился в кабинете '+room.name);
    }
    drawFloors();drawRooms();paintEvents();
  }catch(err){dom.dialogMessage.textContent=err.message}
}
function sendTask(){
  const message=dom.task.value.trim();
  const result=world.startDemoTask(message);
  if(!result.ok)return announce(result.error,true);
  dom.task.value='';
  announce('ДЕМО: поручение направлено в «'+result.project+'». Ничего не отправлено в Paperclip.');
  paintEvents();
}
function setSceneMode(value=null){
  const shell=$('app');
  const enabled=value===null?!shell.classList.contains('scene-only'):!!value;
  shell.classList.toggle('scene-only',enabled);
  dom.sceneMode.setAttribute('aria-pressed',String(enabled));
  dom.sceneMode.setAttribute('aria-label',enabled?'Вернуться к панелям офиса':'Развернуть сцену');
  dom.sceneMode.title=enabled?'Вернуться к панелям офиса':'Развернуть сцену';
  dom.sceneMode.textContent=enabled?'⤡':'⛶';
  requestAnimationFrame(()=>{
    renderer.resize();
    if(selectedAgent&&renderer.followId===selectedAgent.id&&world.mode==='demo'){
      renderer.focusAgent(selectedAgent.id);
    }else if(selectedRoom){
      renderer.focusRoom(selectedRoom,true);
    }else{
      renderer.focusFloor(renderer.floor);
    }
  });
  return enabled;
}
dom.sceneMode.onclick=()=>setSceneMode();
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&$('app').classList.contains('scene-only')&&!dom.dialog.open){
    setSceneMode(false);
  }
});
dom.modeDemo.onclick=()=>{if(tour.active)tour.stop();world.setMode('demo');refreshMode();announce('Демо: офис снова живёт по учебным сценариям.')};
dom.modeLive.onclick=()=>{if(tour.active)tour.stop();world.setMode('live');refreshMode();announce('Live пока не подключён. Работа и статусы не имитируются.',true)};
dom.tourToggle.onclick=()=>{
  if(tour.active){tour.stop();return}
  if(world.mode!=='demo'){
    announce('Экскурсия доступна только в DEMO: настоящие статусы не подключены.',true);
    return;
  }
  if(!tour.start(world.rooms))announce('Пока нет кабинетов для экскурсии.',true);
};
dom.tourStop.onclick=()=>tour.stop();
dom.tourPrevious.onclick=()=>tour.previous();
dom.tourNext.onclick=()=>tour.next();
dom.tourPause.onclick=()=>tour.setPaused(!tour.paused);
$('focusHQ').onclick=()=>selectRoom(world.roomFor('hq'),true);
$('viewAll').onclick=()=>{if(tour.active)tour.stop();renderer.focusFloor(renderer.floor);drawFloors();drawRooms()};
$('zoomIn').onclick=()=>renderer.setZoom(1.18);
$('zoomOut').onclick=()=>renderer.setZoom(1/1.18);
$('newProject').onclick=()=>openDialog('project');
$('newProjectTop').onclick=()=>openDialog('project');
$('newAgent').onclick=()=>openDialog('agent');
const mobileMenu=$('mobileActionMenu');
$('mobileTools').onclick=()=>{
  mobileMenu.hidden=!mobileMenu.hidden;
  $('mobileTools').setAttribute('aria-expanded',String(!mobileMenu.hidden));
};
$('mobileNewProject').onclick=()=>{mobileMenu.hidden=true;openDialog('project')};
$('mobileNewAgent').onclick=()=>{mobileMenu.hidden=true;openDialog('agent')};
dom.observeAgent.onclick=()=>{
  if(!selectedAgent||world.mode!=='demo')return;
  if(renderer.followId===selectedAgent.id)renderer.stopFollow();
  else renderer.focusAgent(selectedAgent.id);
  paintInspector();
};
dom.demoMeetingButton.onclick=()=>{
  if(world.mode!=='demo')return;
  const result=world.startDemoMeeting();
  if(!result.ok){
    announce(result.reason==='active'?'ДЕМО: совещание уже идёт.':
      'ДЕМО: участники пока недоступны для встречи.',true);
    return;
  }
  const hq=world.roomFor('hq');
  if(hq)selectRoom(hq,true);
  announce('ДЕМО: участники идут к переговорному столу. Реальная задача не запускается.');
  paintEvents();
};
$('showStaff').onclick=revealInspector;
$('closeInspector').onclick=()=>dom.inspector.classList.remove('is-visible');
$('dialogClose').onclick=()=>dom.dialog.close();
$('dialogCancel').onclick=()=>dom.dialog.close();
dom.dialogForm.addEventListener('submit',createEntity);
$('sendTask').onclick=sendTask;
dom.task.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendTask()}
});
dom.task.addEventListener('input',()=>{
  dom.task.style.height='27px';dom.task.style.height=Math.min(dom.task.scrollHeight,64)+'px';
});
refreshStats();selectRoom(world.roomFor('hq'),false);refreshMode();
let last=0;let frames=0;let paused=false;
document.addEventListener('visibilitychange',()=>{paused=document.hidden});
function animate(t){
  requestAnimationFrame(animate);
  const dt=last?Math.min((t-last)/1000,.1):.016;last=t;
  if(paused)return;
  try{
    if(tour.active)tour.update(dt);
    world.update(dt);
    renderer.draw(world.time,dt);
    if(tour.active){
      dom.tourProgress.style.width=Math.round(tour.progress*100)+'%';
      dom.tourProgress.parentElement.setAttribute('aria-valuenow',String(Math.round(tour.progress*100)));
    }
  }catch(err){
    window.__v5RenderError=String(err.stack||err);
    console.error('V5_RENDER_FAILED',err);
    return;
  }
  if(++frames%43===0){
    paintEvents();paintInspector();
    // Camera and floor may change without rebuilding data.
    dom.floorLabel.textContent=(renderer.floor+1)+' ЭТАЖ';
  }
}
requestAnimationFrame(animate);
if(new URLSearchParams(location.search).has('smoke')||new URLSearchParams(location.search).has('test')){
  window.PixelV5={
    snapshot:()=>world.snapshot(),
    getCamera:()=>({x:renderer.x,y:renderer.y,zoom:renderer.zoom,floor:renderer.floor,
      followId:renderer.followId}),
    watchAgent:id=>{const agent=world.agents.find(a=>a.id===id);
      return agent?selectAgent(agent,{follow:true}):false;},
    stopWatch:()=>{renderer.stopFollow();paintInspector();return !renderer.followId;},
    addProject:(name)=>{const r=world.addProject(name);saveLocal();refreshStats();drawFloors();drawRooms();return r.id},
    addAgent:(name,projectId)=>{const a=world.addAgent(name,projectId);saveLocal();refreshStats();drawFloors();drawRooms();return a.id},
    sendAgent:(agent,room)=>world.sendToRoom(agent,room),
    setMode:mode=>{world.setMode(mode);refreshMode()},
    task:text=>world.startDemoTask(text),
    focusRoom:id=>{const room=world.rooms.find(r=>r.id===id);if(room)selectRoom(room,true)},
    viewFloor:f=>{renderer.focusFloor(f);drawFloors();drawRooms()},
    getFrames:()=>frames,
    tourState:()=>tour.state,
    getSceneMode:()=>$('app').classList.contains('scene-only'),
    setSceneMode:value=>setSceneMode(value),
    tourStart:()=>world.mode==='demo'?tour.start(world.rooms):false,
    tourNext:()=>tour.next(),
    tourPrevious:()=>tour.previous(),
    tourPause:value=>tour.setPaused(value),
    tourStop:()=>tour.stop(),
    tourAdvance:seconds=>{
      const steps=Math.ceil(Math.min(120,Math.max(0,seconds||0))/.05);
      for(let i=0;i<steps&&tour.active;i++)tour.update(.05);
      return tour.state;
    },
    getPremiumStatus:()=>renderer.premium.status(),
    getDepartmentStatus:()=>renderer.departments.status(),
    getDepthStatus:()=>renderer.lastQueueStats||null,
    previewSeatedAgent:(id='gigacode')=>{
      const actor=world.agents.find(a=>a.id===id);
      const room=world.rooms.find(r=>r.members.includes(id));
      if(!actor||!room)return null;
      const station=room.workstations[room.members.indexOf(id)];
      actor.x=station.x;actor.y=station.y;actor.roomId=room.id;actor.floor=room.floor;
      actor.path=[];actor.goal='desk';actor.manual=false;
      actor.state='typing';actor.wait=7;actor.seatProgress=1;actor.facing='up';
      return {x:actor.x,y:actor.y,room:room.id};
    },
    startDemoMeeting:()=>world.startDemoMeeting(),
    stepSimulation:(seconds=1)=>{
      const steps=Math.ceil(Math.max(0,Math.min(90,seconds))/.05);
      for(let i=0;i<steps;i++)world.update(.05);
      return world.snapshot();
    },
    runHQCycle:(seconds=28)=>{
      const who=world.agents.find(a=>a.id==='codex');
      const states=new Set();
      const count=Math.min(1600,Math.round(Math.max(0,seconds)/.05));
      for(let i=0;i<count;i++){
        world.update(.05);if(who)states.add(who.state);
      }
      return {states:[...states],sessions:who?.sessions||0,
        final:who?.state,actorId:who?.id};
    },
  };
  // Directly embedded smoke output for Chrome headless --dump-dom.
  if(new URLSearchParams(location.search).has('smoke'))setTimeout(()=>{
    try{
      const before=world.snapshot();const floorsBefore=before.floorCount;
      window.PixelV5.addProject('Тестовый новый проект');
      window.PixelV5.addProject('Новый проект второго этажа');
      const after=world.snapshot();
      const id=window.PixelV5.addAgent('Новый агент','budget');
      const added=world.agents.find(a=>a.id===id);
      const found=added&&added.roomId&&world.rooms.some(r=>r.id===added.roomId);
      window.PixelV5.focusRoom('budget');
      const task=world.startDemoTask('Проверь BudgetBot');
      const note={
        ok:after.projectCount===before.projectCount+2&&after.floorCount>floorsBefore&&
          after.roomCount===before.roomCount+2&&found&&task.ok&&frames>0,
        initial:before,after:world.snapshot(),
        newAgent:id,frames,canvasWidth:dom.canvas.width,stageWidth:dom.canvas.clientWidth,
        overflow:document.documentElement.scrollWidth>innerWidth+2
      };
      const out=document.createElement('output');out.id='v5-smoke-result';
      out.textContent=JSON.stringify({
        ok:note.ok&&!note.overflow,
        beforeProjects:before.projectCount,
        afterProjects:after.projectCount,
        beforeFloors:floorsBefore,afterFloors:after.floorCount,
        agentAdded:found,frames,overflow:note.overflow,renderError:window.__v5RenderError||null});
      document.body.append(out);
    }catch(err){
      const out=document.createElement('output');out.id='v5-smoke-result';
      out.textContent=JSON.stringify({ok:false,error:String(err.message||err)});document.body.append(out);
    }
  },1700);
}
