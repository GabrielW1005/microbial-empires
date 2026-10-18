import {Camera} from '../game/Camera.ts';
import {Engine} from './Engine.ts';
import {Renderer} from './Renderer.ts';
import {UNITS,BUILDINGS,distance,canEat} from './model.ts';
import type {Point,BuildingKind,Unit,Order} from './model.ts';

export class Input {
 canvas:HTMLCanvasElement;getWorld:()=>Engine;camera:Camera;renderer:Renderer;
 selected=new Set<number>();building:number|null=null;mode:'move'|'attackMove'|'gather'|'rally'|BuildingKind|null=null;
 pointer:Point={x:0,y:0};down:Point|null=null;pan:Point|null=null;keys=new Set<string>();groups=new Map<number,number[]>();change=()=>{};notify:(s:string)=>void;blocked:()=>boolean;
 constructor(canvas:HTMLCanvasElement,getWorld:()=>Engine,camera:Camera,renderer:Renderer,notify:(s:string)=>void,blocked:()=>boolean){this.canvas=canvas;this.getWorld=getWorld;this.camera=camera;this.renderer=renderer;this.notify=notify;this.blocked=blocked;
  canvas.oncontextmenu=e=>e.preventDefault();canvas.onpointerdown=e=>{if(this.blocked())return;const p=this.pos(e);this.pointer=p;canvas.focus();if(e.button===1||e.altKey&&e.button===0){this.pan=p;canvas.setPointerCapture(e.pointerId);return;}if(e.button===2){if(this.mode)this.setMode(null);else this.command(camera.world(p),e.shiftKey);return;}if(e.button!==0)return;if(this.mode){this.command(camera.world(p),e.shiftKey);return;}this.down=p;canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{const p=this.pos(e);this.pointer=p;if(this.pan){camera.pan(this.pan.x-p.x,this.pan.y-p.y);this.pan=p;}else if(this.down&&distance(p,this.down)>6)renderer.marquee={a:this.down,b:p};this.updateGhost();};
  canvas.onpointerup=e=>{if(this.pan){this.pan=null;return;}if(!this.down)return;const p=this.pos(e),w=this.getWorld();if(!e.shiftKey)this.selected.clear();this.building=null;if(renderer.marquee){const a=camera.world(this.down),b=camera.world(p);for(const u of w.units)if(u.team===0&&u.x>=Math.min(a.x,b.x)&&u.x<=Math.max(a.x,b.x)&&u.y>=Math.min(a.y,b.y)&&u.y<=Math.max(a.y,b.y))this.selected.add(u.id);}else{const hit=this.hit(camera.world(p));if(hit&&'team'in hit&&hit.team===0){if('orders'in hit){if(e.shiftKey&&this.selected.has(hit.id))this.selected.delete(hit.id);else this.selected.add(hit.id);}else{this.selected.clear();this.building=hit.id;}}}this.down=null;renderer.marquee=null;this.change();};
  canvas.ondblclick=e=>{const hit=this.hit(camera.world(this.pos(e)));if(hit&&'orders'in hit&&hit.team===0){this.selected=new Set(wUnits().filter(u=>u.team===0&&u.kind===hit.kind&&Math.abs(u.x-camera.x)<camera.width/camera.zoom/2&&Math.abs(u.y-camera.y)<camera.height/camera.zoom/2).map(u=>u.id));this.change();}};const wUnits=()=>this.getWorld().units;
  canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoomAt(Math.exp(-e.deltaY*.001),this.pos(e));this.updateGhost();},{passive:false});
  window.addEventListener('keydown',e=>{if(this.blocked()||['INPUT','SELECT','TEXTAREA'].includes((e.target as HTMLElement).tagName))return;const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();this.keys.add(k);if(e.repeat)return;
   if(k==='escape')this.clear();else if(k==='h')this.home();else if(k==='.')this.idle();else if(k==='a'&&this.selected.size)this.setMode('attackMove');else if(k==='m'&&this.selected.size)this.setMode('move');else if(k==='g'&&this.selected.size)this.setMode('gather');else if(k==='s')this.stop();else if(/^[1-9]$/.test(k)){e.preventDefault();if(e.ctrlKey||e.metaKey){this.groups.set(+k,[...this.selected]);this.notify(`Group ${k} assigned.`);}else{this.selected=new Set((this.groups.get(+k)||[]).filter(id=>this.getWorld().unit(id)));this.building=null;this.change();}}
  });window.addEventListener('keyup',e=>this.keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{this.keys.clear();this.down=null;this.pan=null;renderer.marquee=null;});
 }
 pos(e:MouseEvent){const r=this.canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
 hit(p:Point){const w=this.getWorld();const u=w.units.filter(u=>distance(u,p)<Math.max(UNITS[u.kind].radius+5,16/this.camera.zoom)).sort((a,b)=>distance(a,p)-distance(b,p))[0];if(u)return u;const b=w.buildings.find(b=>distance(b,p)<BUILDINGS[b.kind].radius+14);if(b)return b;return w.resources.find(r=>r.amount>0&&distance(r,p)<42);}
 setMode(mode:Input['mode']){this.mode=mode;this.updateGhost();this.change();}
 clear(){this.selected.clear();this.building=null;this.setMode(null);}
 home(){const b=this.getWorld().home(0);if(!b)return;this.selected.clear();this.building=b.id;this.camera.x=b.x+180;this.camera.y=b.y+(this.camera.height<620?120:80);this.camera.zoom=this.camera.height<620?.75:1;this.mode=null;this.updateGhost();this.change();}
 idle(){const us=this.getWorld().units.filter(u=>u.team===0&&u.kind==='worker'&&!u.orders.length);const next=us.find(u=>!this.selected.has(u.id))||us[0];if(!next){this.notify('All workers have orders.');return;}this.selected=new Set([next.id]);this.building=null;this.camera.x=next.x;this.camera.y=next.y;this.change();}
 stop(){for(const id of this.selected){const u=this.getWorld().unit(id);if(u){u.orders=[];u.path=[];u.routeTarget=undefined;}}this.mode=null;this.updateGhost();this.change();}
 updateGhost(){const kind=this.mode;if(kind==='garden'||kind==='nursery'){const p=this.camera.world(this.pointer);this.renderer.ghost={kind,p,valid:this.getWorld().validBuild(kind,p)};}else this.renderer.ghost=null;this.canvas.style.cursor=this.mode?'crosshair':'default';}
 command(p:Point,queue=false){const w=this.getWorld();if(this.mode==='garden'||this.mode==='nursery'){const error=w.build([...this.selected],this.mode,p);this.notify(error||'Construction started. Workers will build here.');if(!error)this.setMode(null);return;}
  const b=this.building===null?undefined:w.building(this.building);if(b){b.rally=w.nav.project(p);this.notify('Rally point set.');this.setMode(null);return;}
  if(!this.selected.size){this.notify('Click a worker or your home colony first.');return;}
  const hit=this.hit(p);let ids=[...this.selected],o:Order={...p,type:this.mode==='attackMove'?'attackMove':'move'};
  if(!this.mode||this.mode==='gather'){
   if(hit&&'amount'in hit){ids=ids.filter(id=>w.unit(id)?.kind==='worker');o={...p,type:'gather',target:hit.id};}
   else if(hit&&'progress'in hit&&hit.team===0&&hit.progress<1){ids=ids.filter(id=>w.unit(id)?.kind==='worker');o={...p,type:'build',target:hit.id};}
   else if(hit&&'team'in hit&&hit.team===1){ids=ids.filter(id=>{const u=w.unit(id);return u&&u.kind!=='worker'&&('queue'in hit||canEat(u,hit));});o={...p,type:'attack',target:hit.id};}
   else if(this.mode==='gather'){this.notify('Click a brown food patch or a gray mineral patch.');return;}
  }
  if(!ids.length){this.notify('Workers gather and build. Ciliates eat bacteria; amoebae eat smaller cells.');return;}
  w.order(ids,o,queue);this.renderer.ping=p;this.renderer.pingUntil=performance.now()+800;this.notify(`${queue?'Queued: ':''}${o.type==='gather'?'Gather and return resources':o.type==='attack'?'Engage compatible prey':o.type==='build'?'Construct habitat':o.type==='attackMove'?'Attack move':'Move'} (${ids.length}).`);if(!queue)this.setMode(null);this.change();
 }
 update(dt:number){if(this.blocked())return;let x=0,y=0;if(this.keys.has('arrowleft'))x--;if(this.keys.has('arrowright'))x++;if(this.keys.has('arrowup'))y--;if(this.keys.has('arrowdown'))y++;this.camera.pan(x*500*dt,y*500*dt);for(const id of this.selected)if(!this.getWorld().unit(id))this.selected.delete(id);if(this.building!==null&&!this.getWorld().building(this.building))this.building=null;}
}
