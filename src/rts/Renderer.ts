import {Camera} from '../game/Camera.ts';
import {Engine} from './Engine.ts';
import {UNITS,BUILDINGS,WIDTH,HEIGHT} from './model.ts';
import type {UnitKind,BuildingKind,Point} from './model.ts';
import {CELL_SIZE,HABITAT_WIDTH,HABITAT_HEIGHT,RESOURCE_SIZE,makeCell,makeHabitat,makePond,makeResource,makeRock} from './Art.ts';

const TEAM=['#2866b6','#b24b3f'];
const FRAMES=6;
export class Renderer {
 canvas:HTMLCanvasElement;ctx:CanvasRenderingContext2D;camera:Camera;scale=.8;fps=30;
 sprites=new Map<string,HTMLCanvasElement>();smallCells=new Map<string,HTMLCanvasElement>();terrain:HTMLCanvasElement;
 marquee:{a:Point;b:Point}|null=null;ghost:{kind:BuildingKind;p:Point;valid:boolean}|null=null;
 ping:Point|null=null;pingUntil=0;reduced=false;
 constructor(canvas:HTMLCanvasElement,camera:Camera){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false})!;this.camera=camera;this.terrain=document.createElement('canvas');this.makeTerrain();this.makeSprites();}
 resize(width:number,height:number){this.camera.width=width;this.camera.height=height;this.canvas.width=Math.round(width*this.scale);this.canvas.height=Math.round(height*this.scale);this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';this.ctx.imageSmoothingEnabled=true;this.ctx.imageSmoothingQuality='low';}
 makeTerrain(){makePond(this.terrain);}
 makeSprites(){
  for(const kind of ['worker','ciliate','amoeba']as UnitKind[])for(let frame=0;frame<FRAMES;frame++){const key=`${kind}:${frame}`,large=makeCell(kind,frame);this.sprites.set(key,large);const small=document.createElement('canvas');small.width=small.height=CELL_SIZE;small.getContext('2d')!.drawImage(large,0,0,CELL_SIZE,CELL_SIZE);this.smallCells.set(key,small);}
  for(const kind of ['colony','garden','nursery']as BuildingKind[])this.sprites.set(kind,makeHabitat(kind));
  for(const kind of ['food','mineral']as const)this.sprites.set(kind,makeResource(kind));
  for(let i=0;i<3;i++)this.sprites.set('rock:'+i,makeRock(i));
 }
 label(text:string,p:Point){const x=this.ctx;x.font='600 11px Arial, sans-serif';x.textAlign='center';x.lineWidth=2.5;x.strokeStyle='#dce5dc';x.strokeText(text,p.x,p.y);x.fillStyle='#475b56';x.fillText(text,p.x,p.y);}
 habitat(kind:BuildingKind,p:Point){this.ctx.drawImage(this.sprites.get(kind)!,p.x-HABITAT_WIDTH/2,p.y-HABITAT_HEIGHT/2,HABITAT_WIDTH,HABITAT_HEIGHT);}
 ring(p:Point,rx:number,ry:number,color:string,width=1.6){const x=this.ctx;x.strokeStyle=color;x.lineWidth=width;x.beginPath();x.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);x.stroke();}
 draw(w:Engine,selected:Set<number>,building:number|null,clock:number,alpha=1){
  const x=this.ctx,c=this.camera,s=this.scale;x.setTransform(s,0,0,s,0,0);x.imageSmoothingEnabled=true;x.fillStyle='#bed2cf';x.fillRect(0,0,c.width,c.height);x.save();x.translate(c.width/2,c.height/2);x.scale(c.zoom,c.zoom);x.translate(-c.x,-c.y);x.drawImage(this.terrain,0,0,WIDTH,HEIGHT);
  const visible=(p:Point,r=80)=>Math.abs(p.x-c.x)<c.width/(2*c.zoom)+r&&Math.abs(p.y-c.y)<c.height/(2*c.zoom)+r;
  for(let i=0;i<w.obstacles.length;i++){const o=w.obstacles[i];if(!visible(o,o.radius+30))continue;const width=o.radius*2.6,height=width*188/220;x.drawImage(this.sprites.get('rock:'+i%3)!,o.x-width/2,o.y-height/2,width,height);}
  for(const r of w.resources){if(r.amount<=0||!visible(r))continue;x.drawImage(this.sprites.get(r.kind)!,r.x-RESOURCE_SIZE/2,r.y-RESOURCE_SIZE/2,RESOURCE_SIZE,RESOURCE_SIZE);this.label(r.kind==='food'?'FOOD':'MINERALS',{x:r.x,y:r.y+47});}
  for(const b of w.buildings){if(!visible(b))continue;const rr=BUILDINGS[b.kind].radius;
   if(b.id===building)this.ring({x:b.x,y:b.y+6},rr+17,rr*.7+13,TEAM[b.team],2);
   if(b.progress<1){x.setLineDash([6,5]);this.ring(b,rr+12,rr*.7+7,'#aa894e',2);x.setLineDash([]);x.globalAlpha=.48;}
   this.habitat(b.kind,b);x.globalAlpha=1;
   this.label(BUILDINGS[b.kind].name.toUpperCase(),{x:b.x,y:b.y-53});
   // Small ownership badge stays outside the organism's natural palette.
   x.fillStyle='#eaf0e3';x.fillRect(b.x-18,b.y+37,36,5);x.fillStyle=TEAM[b.team];x.fillRect(b.x-17,b.y+38,34,3);
   if(b.progress<1||b.id===building||b.hp<BUILDINGS[b.kind].hp){x.fillStyle='#e3e8d9';x.fillRect(b.x-31,b.y+45,62,6);x.fillStyle='#84928a';x.fillRect(b.x-30,b.y+46,60,4);x.fillStyle=b.progress<1?'#bb9454':TEAM[b.team];x.fillRect(b.x-30,b.y+46,60*(b.progress<1?b.progress:b.hp/BUILDINGS[b.kind].hp),4);}
   if(b.rally&&b.id===building){x.strokeStyle=TEAM[b.team];x.lineWidth=1;x.setLineDash([5,6]);x.beginPath();x.moveTo(b.x,b.y);x.lineTo(b.rally.x,b.rally.y);x.stroke();x.setLineDash([]);this.ring(b.rally,5,3,TEAM[b.team]);}
  }
  for(const source of w.units){if(!visible(source,48))continue;const px=source.previous?source.previous.x+(source.x-source.previous.x)*alpha:source.x,py=source.previous?source.previous.y+(source.y-source.previous.y)*alpha:source.y,u=source,r=UNITS[u.kind].radius,sel=selected.has(u.id);
   if(sel)this.ring({x:px,y:py+3},r+10,r*.65+7,TEAM[u.team],1.8);
   const frame=this.reduced||!u.moving&&u.bite<=0?0:Math.floor(w.time*6)%FRAMES;
   x.save();x.translate(px,py);x.rotate(u.angle);x.drawImage((c.zoom*s>1.15?this.sprites:this.smallCells).get(`${u.kind}:${frame}`)!,-CELL_SIZE/2,-CELL_SIZE/2,CELL_SIZE,CELL_SIZE);x.restore();
   x.fillStyle='#edf2e5';x.beginPath();x.arc(px,py+r*.65+8,3,0,Math.PI*2);x.fill();x.fillStyle=TEAM[u.team];x.beginPath();x.arc(px,py+r*.65+8,2.2,0,Math.PI*2);x.fill();
   if(u.cargo>0){x.fillStyle=u.resource==='food'?'#a07b47':'#899ba3';x.beginPath();x.ellipse(px+11,py-8,4.2,3.2,-.4,0,Math.PI*2);x.fill();x.strokeStyle='#e9e9d5';x.lineWidth=.8;x.stroke();}
   if(sel||u.hp<UNITS[u.kind].hp){x.fillStyle='#e9eddf';x.fillRect(px-14,py-r-11,28,5);x.fillStyle='#84958a';x.fillRect(px-13,py-r-10,26,3);x.fillStyle=TEAM[u.team];x.fillRect(px-13,py-r-10,26*u.hp/UNITS[u.kind].hp,3);}
   if(u.bite>0&&u.kind!=='worker'){const q={x:px+Math.cos(u.angle)*r,y:py+Math.sin(u.angle)*r};this.ring(q,5,5,'#7f8f72',1);}
   if(u.flash>0)this.ring({x:px,y:py},r+4,r*.75+3,'#b65442',1.6);
   if(sel&&selected.size<=8&&u.orders[0]&&(u.orders[0].type==='move'||u.orders[0].type==='attackMove')){x.strokeStyle='#4679ac';x.setLineDash([4,7]);x.lineWidth=1;x.beginPath();x.moveTo(px,py);for(const o of u.orders)x.lineTo(o.x,o.y);x.stroke();x.setLineDash([]);}
  }
  if(this.ghost){const g=this.ghost;x.globalAlpha=.75;this.habitat(g.kind,g.p);x.globalAlpha=1;this.ring(g.p,61,45,g.valid?'#315fa6':'#af302d',2);}
  if(this.ping&&clock<this.pingUntil){this.ring(this.ping,8,5,'#306ca8',1.5);x.strokeStyle='#306ca8';x.beginPath();x.moveTo(this.ping.x-12,this.ping.y);x.lineTo(this.ping.x-5,this.ping.y);x.moveTo(this.ping.x+5,this.ping.y);x.lineTo(this.ping.x+12,this.ping.y);x.stroke();}
  x.restore();if(this.marquee){const{a,b}=this.marquee;x.strokeStyle='#2459a6';x.lineWidth=1;x.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);}
 }
 minimap(canvas:HTMLCanvasElement,w:Engine){const x=canvas.getContext('2d')!,sx=canvas.width/WIDTH,sy=canvas.height/HEIGHT;x.imageSmoothingEnabled=true;x.drawImage(this.terrain,0,0,canvas.width,canvas.height);for(const r of w.resources){if(r.amount<=0)continue;x.fillStyle=r.kind==='food'?'#9e7544':'#747c92';x.fillRect(r.x*sx-2,r.y*sy-2,4,4);}for(const b of w.buildings){x.fillStyle=TEAM[b.team];x.fillRect(b.x*sx-3,b.y*sy-3,6,6);}for(const u of w.units){x.fillStyle=TEAM[u.team];x.fillRect(u.x*sx,u.y*sy,2,2);}const c=this.camera;x.strokeStyle='#405d58';x.strokeRect((c.x-c.width/c.zoom/2)*sx,(c.y-c.height/c.zoom/2)*sy,c.width/c.zoom*sx,c.height/c.zoom*sy);}
}
