import {SPECIES,FACTIONS} from '../entities/Species.ts';
import type {Organism} from '../entities/Organism.ts';
export type Quality='performance'|'balanced'|'detailed';
const TAU=Math.PI*2;
function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,fill:string,stroke?:string){c.beginPath();c.ellipse(x,y,rx,ry,0,0,TAU);c.fillStyle=fill;c.fill();if(stroke){c.strokeStyle=stroke;c.stroke();}}
export function drawCell(c:CanvasRenderingContext2D,u:Organism,time:number,quality:Quality,zoom=1,inspect=false){
 const s=SPECIES[u.species];const growth=Math.sqrt(u.mass/s.mass),r=s.radius*growth;const detail=inspect||quality==='detailed'||(quality==='balanced'&&zoom>.65);const motion=time+(u.id%97);
 c.save();c.translate(u.x,u.y);c.rotate(u.angle);c.lineWidth=.8/Math.max(.7,zoom);
 if(!inspect&&zoom<.48&&s.radius<8){oval(c,0,0,3.3,2,s.color);c.restore();return;}
 c.globalAlpha=u.energy<15?.6:1;
 const pinch=u.division>0?Math.sin(u.division*Math.PI)*.4:0;
 if(u.species==='amoeba'){
 const pts:{x:number;y:number}[]=[];for(let i=0;i<20;i++){const a=i/20*TAU;const wave=1+Math.sin(a*3+motion*.7)*.14+Math.sin(a*5-motion*.47)*.10;const front=u.moving?Math.pow(Math.max(0,Math.cos(a)),6)*.35:0;pts.push({x:Math.cos(a)*r*(wave+front),y:Math.sin(a)*r*wave});}
 c.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i],n=pts[(i+1)%pts.length];if(i===0)c.moveTo((pts[19].x+p.x)/2,(pts[19].y+p.y)/2);c.quadraticCurveTo(p.x,p.y,(p.x+n.x)/2,(p.y+n.y)/2);}c.closePath();c.fillStyle='#b4a7d12b';c.fill();c.strokeStyle='#d7c7e6bb';c.lineWidth=1.5;c.stroke();
 c.save();c.scale(.87,.87);c.strokeStyle='#e9e0fb33';c.lineWidth=2;c.stroke();c.restore();
 if(u.feeding>0){const reach=r+12,wrap=u.feeding;for(const sign of [-1,1]){c.beginPath();c.moveTo(r*.4,sign*r*.7);c.bezierCurveTo(reach,sign*r*.8,reach+16,sign*(20-17*wrap),reach+9,sign*(14-13*wrap));c.strokeStyle='#d8cae8a8';c.lineWidth=7;c.stroke();c.strokeStyle='#f4e9ff80';c.lineWidth=1.2;c.stroke();}}
 oval(c,-r*.2,0,r*.23,r*.2,'#afa3c55c','#e0d0eb88');oval(c,-r*.23,-r*.02,r*.09,r*.08,'#ddd2ed78');
 if(detail){for(let i=0;i<12;i++){const a=i*2.399;oval(c,Math.cos(a)*r*(.3+i%3*.14),Math.sin(a)*r*(.3+i%3*.12),1.5+i%3,1.1+i%2,'#c0b9db3a');}oval(c,r*.35,-r*.15,r*.19,r*.16,u.digest>0?'#d2b57590':'#afbecb29','#d1d2dc77');}
 }else if(u.species==='ciliate'){
 const rx=r*1.5,ry=r*.7*(1-pinch);
 if(detail){c.strokeStyle='#b9e5df88';c.lineWidth=.7;for(let i=0;i<26;i++){const a=i/26*TAU;const x=Math.cos(a)*rx,y=Math.sin(a)*ry;const beat=Math.sin(motion*11-i*.55)*.5;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a+beat)*4.5,y+Math.sin(a+beat)*4.5);c.stroke();}}
 oval(c,0,0,rx,ry,'#8ac9ca35','#c1e9deaa');oval(c,-r*.05,0,r*.42,r*.26,'#8eaab478','#d8e8df88');oval(c,-r*.13,0,r*.13,r*.12,'#c9dfd19a');
 if(detail){c.strokeStyle='#a4e1d277';c.beginPath();c.moveTo(rx*.25,ry*.6);c.quadraticCurveTo(rx*.8,0,rx*.2,-ry*.25);c.stroke();for(let i=0;i<7;i++){const x=Math.sin(i*5.3)*rx*.65,y=Math.cos(i*3.7)*ry*.65;oval(c,x,y,1.6+i%2,1.6,'#d7d3aa44','#bdd2c555');}}
 if(u.feeding>0){c.strokeStyle='#d9d9a7';c.beginPath();c.arc(rx*.55,0,5+u.feeding*3,-1.4,1.4);c.stroke();}
 }else if(u.species==='alga'){
 c.strokeStyle='#c7e6ab99';c.lineWidth=.9;for(const sign of [-1,1]){c.beginPath();c.moveTo(r*.7,sign*r*.4);c.bezierCurveTo(r*1.6,sign*(r*.8+Math.sin(motion*8)*3),r*2.2,sign*(r*.1+Math.cos(motion*8)*5),r*2.5,sign*r*.6);c.stroke();}
 oval(c,0,0,r*1.05,r*(1-pinch),'#7cbf6d45','#d4eab6c0');c.beginPath();c.ellipse(-r*.15,0,r*.72,r*.78,0,.55,TAU-.55);c.lineWidth=r*.30;c.strokeStyle='#87bd5ca0';c.stroke();oval(c,r*.16,0,r*.27,r*.25,'#bed6b878','#e7eed188');oval(c,r*.55,-r*.36,r*.14,r*.11,'#e0a763');
 if(detail){for(let i=0;i<5;i++)oval(c,-r*.3+Math.sin(i*2)*r*.3,Math.cos(i*2)*r*.53,r*.13,r*.1,'#b9da785c');}
 }else{
 if(u.species==='recycler'&&detail){c.strokeStyle='#ddc895aa';c.lineWidth=.65;c.beginPath();c.moveTo(-r*1.6,0);c.bezierCurveTo(-r*3,Math.sin(motion*9)*r,-r*4.4,-Math.sin(motion*9)*r,-r*5,0);c.stroke();}
 c.save();c.scale(1+u.division*.4,1-pinch);c.beginPath();c.roundRect(-r*1.6,-r*.65,r*3.2,r*1.3,r*.65);c.fillStyle=u.species==='builder'?'#9baecb70':'#ddc18470';c.fill();c.strokeStyle=u.species==='builder'?'#d3dceccc':'#e3d2accc';c.stroke();
 if(detail){c.strokeStyle='#e6e0b780';c.lineWidth=.6;c.beginPath();c.moveTo(-r,0);c.bezierCurveTo(0,-r,r,r,-r*.2,0);c.stroke();}c.restore();
 }
 if(u.division>0){c.strokeStyle='#e1eccca0';c.lineWidth=.7;c.setLineDash([1.5,1.5]);c.beginPath();c.moveTo(0,-r);c.lineTo(0,r);c.stroke();c.setLineDash([]);}
 if(!inspect){const marker=Math.max(4.5,r*.28);c.globalAlpha=.95;c.fillStyle=FACTIONS[u.faction].color;c.beginPath();if(u.faction===1){c.moveTo(-r-5,0);c.lineTo(-r-5-marker/2,-marker/2);c.lineTo(-r-5-marker,0);c.lineTo(-r-5-marker/2,marker/2);}else c.arc(-r-6,0,marker*.34,0,TAU);c.fill();}
 c.restore();
}
