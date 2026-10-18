import './style.css';
import {Engine} from './rts/Engine.ts';
import {Renderer} from './rts/Renderer.ts';
import {Input} from './rts/Input.ts';
import {Camera} from './game/Camera.ts';
import {UNITS,BUILDINGS,ADVANCE,SAVE_KEY,SETTINGS_KEY,PEACE,WIDTH,HEIGHT} from './rts/model.ts';
import type {UnitKind,BuildingKind} from './rts/model.ts';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const txt=(id:string,value:string)=>{const el=$(id);if(el.textContent!==value)el.textContent=value;};
const formatTime=(t:number)=>`${Math.floor(t/60).toString().padStart(2,'0')}:${Math.floor(t%60).toString().padStart(2,'0')}`;
const canvas=$<HTMLCanvasElement>('world'),map=$<HTMLCanvasElement>('minimap'),field=$('field');
let world=new Engine(),paused=false,resultShown=false,lastNotice=-1,toastUntil=0,selectionKey='',limit=30;
const camera=new Camera();camera.x=510;camera.y=910;camera.zoom=1;
const renderer=new Renderer(canvas,camera);
const anyModal=()=>!!document.querySelector('dialog[open]');
function notify(s:string){txt('toast',s);$('toast').hidden=false;toastUntil=performance.now()+3300;}
const input=new Input(canvas,()=>world,camera,renderer,notify,anyModal);
function closeDialogs(){document.querySelectorAll<HTMLDialogElement>('dialog[open]').forEach(d=>d.close());}
function modal(id:string){closeDialogs();$<HTMLDialogElement>(id).showModal();}
function resize(){renderer.resize(field.clientWidth,field.clientHeight);}
window.addEventListener('resize',resize);
function save(){try{localStorage.setItem(SAVE_KEY,world.save());notify('Match saved in this browser.');txt('save-note','Saved at '+formatTime(world.time)+'. You can return to this colony later.');return true;}catch{notify('Browser storage is unavailable. Use Export save instead.');return false;}}
function newMatch(){world=new Engine();paused=false;resultShown=false;lastNotice=-1;input.clear();input.groups.clear();camera.x=510;camera.y=830+(camera.height<620?120:80);camera.zoom=camera.height<620?.75:1;$('guide').hidden=false;closeDialogs();updateHUD();canvas.focus();}
function loadMatch(raw:string){try{world=Engine.load(raw);paused=false;resultShown=false;lastNotice=world.time;input.clear();input.groups.clear();camera.x=(world.home(0)?.x??330)+180;camera.y=world.home(0)?.y??830;closeDialogs();updateHUD();notify('Saved colony restored.');}catch(e){notify(e instanceof Error?e.message:'Could not load this save.');txt('save-note',e instanceof Error?e.message:'Could not load this save.');}}
function addCommand(label:string,detail:string,action:()=>void,disabled=false,title=''){const b=document.createElement('button');b.append(document.createTextNode(label));const s=document.createElement('small');s.textContent=detail;b.append(s);b.disabled=disabled;b.title=title;b.onclick=()=>{action();selectionKey='';refreshSelection();};$('commands').append(b);return b;}
const cost=(food:number,mineral:number)=>`${food} food${mineral?' · '+mineral+' min':''}`;
function refreshSelection(){
 const b=input.building===null?undefined:world.building(input.building),us=[...input.selected].map(id=>world.unit(id)).filter(u=>!!u);
 const has=!!b||us.length>0;$('selection').hidden=!has;
 const mode=input.mode;const modeText=mode==='garden'||mode==='nursery'?`Place ${BUILDINGS[mode].name.toLowerCase()} on open ground · Esc cancels`:mode==='rally'?'Click a rally point · Esc cancels':mode==='gather'?'Click brown food or gray minerals · Esc cancels':mode==='attackMove'?'Click a destination to advance and engage smaller prey':mode==='move'?'Click a destination · Shift queues orders':'';
 txt('mode-hint',modeText);$('mode-hint').hidden=!modeText;
 if(!has){selectionKey='';return;}
 const key=JSON.stringify([b?.id,b?.progress===1,b?.queue.map(q=>q.kind),us.map(u=>u.id),world.age[0],world.capacity(0),world.count(0)+world.queued(0),Math.floor(world.stock[0].food),Math.floor(world.stock[0].mineral),mode]);
 const finished=b&&b.progress===1,queue=b?.queue[0];$('production').hidden=!queue;
 if(queue){$<HTMLProgressElement>('queue-progress').value=1-queue.left/queue.total;txt('queue-text',`${queue.kind==='advance'?'Maturing':UNITS[queue.kind].name} · ${Math.ceil(queue.left)}s${b!.queue.length>1?' · +'+(b!.queue.length-1)+' queued':''}`);}
 if(b){txt('selection-role',b.progress<1?'CONSTRUCTION':world.age[0]===1?'FOUNDING COLONY':'MATURE COLONY');txt('selection-name',BUILDINGS[b.kind].name);txt('selection-detail',`${Math.ceil(b.hp)} / ${BUILDINGS[b.kind].hp} health${b.progress<1?' · '+Math.floor(b.progress*100)+'% built':b.kind==='garden'?' · +8 space · +0.5 food/s':''}`);}
 else{const kinds=new Set(us.map(u=>u.kind)),name=kinds.size===1?UNITS[us[0].kind].name:'Mixed group';txt('selection-role',kinds.size===1?UNITS[us[0].kind].role.toUpperCase():'SELECTED CELLS');txt('selection-name',us.length===1?name:`${us.length} ${kinds.size===1?name.toLowerCase()+'s':'cells'}`);const u=us[0];txt('selection-detail',us.length===1?`${Math.ceil(u.hp)} / ${UNITS[u.kind].hp} health${u.cargo>0?' · Carrying '+Math.floor(u.cargo)+' '+u.resource:''}${u.orders.length?' · '+({gather:'Gathering',build:'Building',move:'Moving',attack:'Attacking',attackMove:'Advancing',hold:'Holding'}[u.orders[0].type]):' · Idle'}`:'Right-click a target to command this group.');}
 if(key===selectionKey)return;selectionKey=key;$('commands').replaceChildren();
 if(b){
  if(finished){const train=(kind:UnitKind|'advance')=>{const c=kind==='advance'?ADVANCE:UNITS[kind].cost;const why=!world.canPay(0,c)?'Gather more resources.':b.queue.length>=5?'Production queue full.':kind!=='advance'&&world.count(0)+world.queued(0)>=world.capacity(0)?'Build an algal bed for more space.':kind==='advance'&&!world.buildings.some(x=>x.team===0&&x.kind==='nursery'&&x.progress===1)?'Build a grazing pool first.':kind==='amoeba'&&world.age[0]<2?'Mature your home colony first.':'';addCommand(kind==='advance'?'Mature colony':kind==='worker'?'Grow worker':kind==='ciliate'?'Grow ciliate':'Grow amoeba',cost(c.food,c.mineral),()=>notify(world.train(b.id,kind)||'Added to production queue.'),!!why,why||`${kind==='advance'?ADVANCE.time:UNITS[kind].time} seconds`);};
   if(b.kind==='colony'){train('worker');if(world.age[0]===1&&!b.queue.some(q=>q.kind==='advance'))train('advance');}
   if(b.kind==='nursery'){train('ciliate');train('amoeba');}
   if(b.kind!=='garden')addCommand('Rally point','Click destination',()=>input.setMode('rally'));
   if(b.queue.length)addCommand('Cancel last','Refund resources',()=>world.cancel(b.id));
  }txt('command-hint',b.progress<1?'Right-click this site with selected workers to help construction.':b.kind==='garden'?BUILDINGS.garden.description:'Right-click the map to set the rally point for new units.');
 }else{
  if(us.some(u=>u.kind==='worker')){addCommand('Gather','G · choose patch',()=>input.setMode('gather'));for(const kind of ['garden','nursery'] as BuildingKind[]){const info=BUILDINGS[kind];addCommand(info.name,cost(info.cost.food,info.cost.mineral),()=>input.setMode(kind),!world.canPay(0,info.cost),info.description);}}
  if(us.some(u=>u.kind!=='worker'))addCommand('Attack move','A · choose target',()=>input.setMode('attackMove'));
  addCommand('Move','M · destination',()=>input.setMode('move'));addCommand('Stop','S · cancel orders',()=>input.stop());txt('command-hint','Right-click to command · Shift queues orders · Esc clears selection');
 }
}
input.change=()=>{refreshSelection();};
function updateHUD(){const stock=world.stock[0];txt('food',Math.floor(stock.food).toString());txt('mineral',Math.floor(stock.mineral).toString());txt('population',`${world.count(0)}${world.queued(0)?'+'+world.queued(0):''} / ${world.capacity(0)}`);txt('clock',formatTime(world.time));txt('idle-count',world.units.filter(u=>u.team===0&&u.kind==='worker'&&!u.orders.length).length.toString());txt('pause',paused?'Resume':'Pause');$('paused-label').hidden=!paused||anyModal()||world.winner!==null;
 const gather=world.units.some(u=>u.team===0&&u.orders.some(o=>o.type==='gather')),garden=world.buildings.some(b=>b.team===0&&b.kind==='garden'),pool=world.buildings.some(b=>b.team===0&&b.kind==='nursery');
 const hints=!gather&&world.deposited===0?['01 / ESTABLISH','Start with food.','Click a worker, then right-click the brown food patch.']:world.deposited<20?['01 / ESTABLISH','Give every worker a job.','Send two workers to food and one to the gray minerals. They gather and return automatically.']:!garden?['02 / GROW','Make room to grow.','Select your colony to grow workers. Select a worker to build an algal bed for +8 spaces.']:!pool?['03 / EXPAND','Establish a grazing pool.','Gather 100 food and 60 minerals, then select a worker to place your first grazing pool.']:world.age[0]===1?['04 / DEVELOP','Grow your first defenders.','Select a grazing pool to grow ciliates. Mature your home colony to unlock amoebae.']:['05 / EXPAND','Cross the pond.','Bring amoebae and ciliates east. Destroy the red home colony while protecting your workers.'];
 txt('step-label',hints[0]);txt('guide-title',hints[1]);txt('guide-text',hints[2]);txt('peace',world.time<PEACE?'Rival stays home for '+formatTime(PEACE-world.time):'Goal: destroy the rival home colony');
 if(!$('map-panel').hidden)renderer.minimap(map,world);refreshSelection();
 if(world.noticeTime>lastNotice){lastNotice=world.noticeTime;notify(world.notice);}
 if(world.winner!==null&&!resultShown){resultShown=true;txt('result-title',world.winner===0?'Your colony prevails.':'Your colony has fallen.');txt('result-detail',`${world.winner===0?'The rival home colony was destroyed.':'Protect your home colony while your workers expand.'} Match time: ${formatTime(world.time)}.`);modal('result-dialog');}
}
$('pause').onclick=()=>{paused=!paused;updateHUD();};window.addEventListener('keydown',e=>{if(e.code==='Space'&&!anyModal()&&!['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName)){e.preventDefault();if(!e.repeat){paused=!paused;updateHUD();}}});
$('menu').onclick=()=>{let present=false;try{present=!!localStorage.getItem(SAVE_KEY);}catch{}$<HTMLButtonElement>('load').disabled=!present;modal('menu-dialog');};
for(const el of document.querySelectorAll<HTMLButtonElement>('[data-close]'))el.onclick=()=>{el.closest('dialog')?.close();updateHUD();canvas.focus();};
$('new-game').onclick=()=>{if(world.time<5||confirm('Start a new match? Your last saved match will remain available.'))newMatch();};$('rematch').onclick=newMatch;$('save').onclick=save;
$('load').onclick=()=>{try{const raw=localStorage.getItem(SAVE_KEY);if(raw)loadMatch(raw);else notify('No saved colony yet.');}catch{notify('Cannot access browser storage.');}};
for(const id of ['help','settings','biology'])$(id).onclick=()=>modal(id+'-dialog');
$('dismiss-guide').onclick=()=>{$('guide').hidden=true;};$('show-guide').onclick=()=>{$('guide').hidden=false;closeDialogs();};$('home').onclick=()=>input.home();$('idle').onclick=()=>input.idle();$('deselect').onclick=()=>input.clear();
$('map-toggle').onclick=()=>{$('map-panel').hidden=!$('map-panel').hidden;$('map-toggle').setAttribute('aria-expanded',String(!$('map-panel').hidden));renderer.minimap(map,world);};
map.onclick=e=>{const r=map.getBoundingClientRect();camera.x=(e.clientX-r.left)/r.width*WIDTH;camera.y=(e.clientY-r.top)/r.height*HEIGHT;};
$('export').onclick=()=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([world.save()],{type:'application/json'}));a.href=url;a.download='microbial-empires-colony.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$<HTMLInputElement>('import-file').click();$<HTMLInputElement>('import-file').onchange=async e=>{const f=(e.target as HTMLInputElement).files?.[0];if(f){if(f.size>1_000_000)notify('Save file is too large.');else loadMatch(await f.text());}(e.target as HTMLInputElement).value='';};
function applySettings(){renderer.scale=+$<HTMLSelectElement>('resolution').value;limit=+$<HTMLSelectElement>('frame-limit').value;renderer.reduced=$<HTMLInputElement>('reduced').checked;resize();try{localStorage.setItem(SETTINGS_KEY,JSON.stringify({scale:renderer.scale,limit,reduced:renderer.reduced}));}catch{}}
try{const s=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'null');if(s){if([.65,.8,1].includes(s.scale))$<HTMLSelectElement>('resolution').value=String(s.scale);if([30,60].includes(s.limit))$<HTMLSelectElement>('frame-limit').value=String(s.limit);$<HTMLInputElement>('reduced').checked=s.reduced===true;}}catch{}
for(const id of ['resolution','frame-limit','reduced'])$(id).onchange=applySettings;
applySettings();camera.y=830+(camera.height<620?120:80);camera.zoom=camera.height<620?.75:1;updateHUD();
let previous=performance.now(),accumulator=0,hud=0,lastDraw=0;
function frame(now:number){const dt=Math.min(.2,Math.max(0,(now-previous)/1000));previous=now;
 if(!document.hidden){input.update(dt);if(!paused&&!anyModal()&&world.winner===null){accumulator=Math.min(.4,accumulator+dt);while(accumulator>=.1){world.step(.1);accumulator-=.1;}}else accumulator=0;
  if(now-lastDraw>=1000/limit-1){renderer.draw(world,input.selected,input.building,now,paused||anyModal()?1:accumulator/.1);lastDraw=now;}hud+=dt;if(hud>=.25){updateHUD();hud=0;}if(now>toastUntil)$('toast').hidden=true;
 }requestAnimationFrame(frame);
}requestAnimationFrame(frame);
window.addEventListener('beforeunload',()=>{if(world.time>5&&world.winner===null)try{localStorage.setItem(SAVE_KEY,world.save());}catch{}});
document.addEventListener('visibilitychange',()=>{previous=performance.now();accumulator=0;});
