import type {BuildingKind,UnitKind} from './model.ts';

type Ctx=CanvasRenderingContext2D;
const TAU=Math.PI*2;
export const CELL_SIZE=96, HABITAT_WIDTH=160, HABITAT_HEIGHT=128, RESOURCE_SIZE=112;
const RESOLUTION=2;

/** Supersampled illustrations are generated once. Match rendering only blits these canvases. */
function surface(width:number,height:number){
 const canvas=document.createElement('canvas');canvas.width=width*RESOLUTION;canvas.height=height*RESOLUTION;
 const ctx=canvas.getContext('2d')!;ctx.scale(RESOLUTION,RESOLUTION);ctx.translate(width/2,height/2);ctx.lineCap='round';ctx.lineJoin='round';
 return{canvas,ctx};
}
function random(seed:number){let n=seed;return()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
function ellipse(x:Ctx,cx:number,cy:number,rx:number,ry:number,fill:string|CanvasGradient,stroke?:string,line=1){x.beginPath();x.ellipse(cx,cy,rx,ry,0,0,TAU);x.fillStyle=fill;x.fill();if(stroke){x.strokeStyle=stroke;x.lineWidth=line;x.stroke();}}
function shade(x:Ctx,cx:number,cy:number,r:number,light:string,dark:string){const g=x.createRadialGradient(cx-r*.32,cy-r*.42,r*.04,cx,cy,r);g.addColorStop(0,light);g.addColorStop(.62,light);g.addColorStop(1,dark);return g;}
function blob(x:Ctx,points:number[][]){const last=points.at(-1)!,first=points[0];x.beginPath();x.moveTo((last[0]+first[0])/2,(last[1]+first[1])/2);for(let i=0;i<points.length;i++){const p=points[i],next=points[(i+1)%points.length];x.quadraticCurveTo(p[0],p[1],(p[0]+next[0])/2,(p[1]+next[1])/2);}x.closePath();}
function shadow(x:Ctx,rx:number,ry:number,dy=4){x.save();x.translate(2,dy);x.scale(1,ry/rx);const g=x.createRadialGradient(0,0,rx*.18,0,0,rx);g.addColorStop(0,'rgba(62,78,75,0.22)');g.addColorStop(.75,'rgba(62,78,75,0.11)');g.addColorStop(1,'rgba(62,78,75,0)');ellipse(x,0,0,rx,rx,g);x.restore();}
function vacuole(x:Ctx,cx:number,cy:number,r:number){ellipse(x,cx,cy,r,r*.86,'#e1e9e3','#a9b8b3',.6);ellipse(x,cx-r*.22,cy-r*.25,r*.45,r*.24,'rgba(255,255,250,0.85)');}
function granules(x:Ctx,count:number,rx:number,ry:number,seed:number){const rng=random(seed);for(let i=0;i<count;i++){const a=rng()*TAU,r=Math.sqrt(rng());ellipse(x,Math.cos(a)*rx*r,Math.sin(a)*ry*r,.35+rng()*.6,.35+rng()*.45,i%3?'rgba(117,132,121,.3)':'rgba(255,255,244,.72)');}}
function rod(x:Ctx,length:number,width:number,seed=1){
 const g=x.createLinearGradient(0,-width/2,0,width/2);g.addColorStop(0,'#fff9e8');g.addColorStop(.25,'#eee7d0');g.addColorStop(.62,'#d3ccb9');g.addColorStop(1,'#a39d89');
 x.beginPath();x.roundRect(-length/2,-width/2,length,width,width/2);x.fillStyle=g;x.fill();x.strokeStyle='#778f86';x.lineWidth=.8;x.stroke();
 x.beginPath();x.roundRect(-length/2+1.2,-width/2+.9,length-2.4,width-1.8,Math.max(.2,width/2-1));x.strokeStyle='rgba(251,255,239,.7)';x.lineWidth=.6;x.stroke();
 x.save();x.beginPath();x.roundRect(-length/2+1,-width/2+1,length-2,width-2,width/2-1);x.clip();granules(x,8,length*.4,width*.32,seed);x.restore();
 x.strokeStyle='rgba(106,128,114,.64)';x.lineWidth=.8;x.beginPath();x.moveTo(-length*.24,0);x.bezierCurveTo(-length*.1,-width*.28,length*.08,width*.3,length*.26,-width*.08);x.stroke();
}
function worker(x:Ctx,phase:number){
 shadow(x,18,9,3);x.strokeStyle='#849e96';x.lineWidth=.9;x.beginPath();x.moveTo(-11,0);x.bezierCurveTo(-17,-3+Math.sin(phase)*3,-18,5+Math.cos(phase)*2,-24,2+Math.sin(phase)*3);x.bezierCurveTo(-28,-1,-28,-4+Math.sin(phase)*2,-31,-2);x.stroke();
 rod(x,24,12,83);
 x.strokeStyle='rgba(255,255,245,.85)';x.lineWidth=1;x.beginPath();x.moveTo(-5,-4);x.quadraticCurveTo(0,-5,5,-4);x.stroke();
}
function ciliate(x:Ctx,phase:number){
 shadow(x,27,18,3);
 // Cilia sit outside a shaded pellicle; a few frame variations suggest their metachronal beat.
 x.strokeStyle='#819892';x.lineWidth=.7;for(let i=0;i<38;i++){const a=i*TAU/38,px=Math.cos(a)*22,py=Math.sin(a)*13,sway=Math.sin(phase+i*.7)*1.4;x.beginPath();x.moveTo(px,py);x.quadraticCurveTo(px+Math.cos(a)*2-Math.sin(a)*sway,py+Math.sin(a)*2+Math.cos(a)*sway,px+Math.cos(a)*4.3-Math.sin(a)*sway,py+Math.sin(a)*4.3+Math.cos(a)*sway);x.stroke();}
 x.beginPath();x.moveTo(-21,0);x.bezierCurveTo(-22,-9,-9,-15,5,-13);x.bezierCurveTo(17,-12,24,-5,23,2);x.bezierCurveTo(20,12,5,15,-9,12);x.bezierCurveTo(-18,10,-22,6,-21,0);x.closePath();
 const g=x.createLinearGradient(-7,-14,7,16);g.addColorStop(0,'#f5fbff');g.addColorStop(.45,'#dae8ee');g.addColorStop(1,'#91b3c1');x.fillStyle=g;x.fill();x.strokeStyle='#6b8980';x.lineWidth=1;x.stroke();
 x.save();x.clip();granules(x,48,21,11,113);ellipse(x,-4,-1,6.2,4.2,shade(x,-4,-1,6,'#b2bfb0','#738b80'),'#84998a',.6);ellipse(x,-5,-2,2.7,1.2,'rgba(212,222,201,.6)');ellipse(x,1,-5,1.7,1.4,'#83998b');vacuole(x,10,-4,3.2);vacuole(x,-12,4,2.8);vacuole(x,7,6,2.2);
 x.strokeStyle='#89a49a';x.lineWidth=1.4;x.beginPath();x.moveTo(20,1);x.bezierCurveTo(12,-1,11,4,7,3);x.stroke();x.strokeStyle='#f9fdef';x.lineWidth=.6;x.beginPath();x.moveTo(20,-.3);x.bezierCurveTo(12,-2,11,2.5,7,1.8);x.stroke();
 x.strokeStyle='rgba(255,255,250,.85)';x.lineWidth=1;x.beginPath();x.ellipse(-1,-1,19,10.7,-.05,3.45,5.9);x.stroke();x.restore();
}
function amoeba(x:Ctx,phase:number){
 shadow(x,36,25,4);
 const points:number[][]=[];for(let i=0;i<24;i++){const a=i*TAU/24;const r=23+5*Math.cos(a*3+.6)+4*Math.sin(a*5+1.4)+Math.sin(phase+a*2)*2.1;points.push([Math.cos(a)*r+3*Math.cos(a*2+phase)*.5,Math.sin(a)*r*.81]);}
 blob(x,points);const g=x.createLinearGradient(-14,-25,16,24);g.addColorStop(0,'#fff9eb');g.addColorStop(.44,'#e9e4d4');g.addColorStop(.8,'#cfceb9');g.addColorStop(1,'#aaa890');x.fillStyle=g;x.fill();x.strokeStyle='#708f83';x.lineWidth=1.1;x.stroke();
 x.save();x.clip();
 // The clear outer ectoplasm surrounds granular, organelle-rich endoplasm.
 const inner=points.map(p=>[p[0]*.76,p[1]*.76]);blob(x,inner);x.fillStyle='rgba(163,184,165,.25)';x.fill();x.strokeStyle='rgba(243,250,232,.63)';x.lineWidth=1.8;x.stroke();
 granules(x,80,23,18,422);ellipse(x,-5,-3,6,5.2,shade(x,-5,-3,6,'#b5c1b2','#758d7d'),'#81998a',.7);ellipse(x,-5.8,-3.3,2.1,1.9,'#8eaa93');vacuole(x,10,4,5);vacuole(x,-12,9,3.5);vacuole(x,4,-13,2.6);vacuole(x,14,-7,2.4);ellipse(x,9.8,4.5,1.8,1.4,'#b4b79a');
 x.translate(-1.3,-1.8);blob(x,points);x.strokeStyle='rgba(255,255,249,.88)';x.lineWidth=1.8;x.stroke();x.restore();
}
export function makeCell(kind:UnitKind,frame:number){const{canvas,ctx:x}=surface(CELL_SIZE,CELL_SIZE);const phase=frame*TAU/6;if(kind==='worker')worker(x,phase);else if(kind==='ciliate')ciliate(x,phase);else amoeba(x,phase);return canvas;}

export function makeHabitat(kind:BuildingKind){
 const{canvas,ctx:x}=surface(HABITAT_WIDTH,HABITAT_HEIGHT),rng=random(kind==='colony'?8:kind==='garden'?30:56);shadow(x,65,43,7);
 const pts:number[][]=[];for(let i=0;i<20;i++){const a=i*TAU/20,r=46+5*Math.sin(i*1.7);pts.push([Math.cos(a)*r*1.14,Math.sin(a)*r*.77]);}
 blob(x,pts.map(p=>[p[0],p[1]+4]));x.fillStyle='#859a8a';x.fill();blob(x,pts);const g=x.createLinearGradient(0,-40,0,40);g.addColorStop(0,kind==='garden'?'#d6e8a2':'#f0dbad');g.addColorStop(.45,kind==='garden'?'#a3c979':'#d3b77f');g.addColorStop(1,kind==='garden'?'#68934b':'#ad895b');x.fillStyle=g;x.fill();x.strokeStyle='#8c9d83';x.lineWidth=.8;x.stroke();
 x.save();x.clip();for(let i=0;i<130;i++){const a=rng()*TAU,r=Math.sqrt(rng()),px=Math.cos(a)*53*r,py=Math.sin(a)*36*r;ellipse(x,px,py,.35+rng()*1.2,.3+rng()*.7,i%2?'rgba(99,120,88,.22)':'rgba(255,255,232,.5)');}
 // Baked matrix ribbons give depth without a live fluid or membrane shader.
 for(let i=0;i<5;i++){x.strokeStyle=i%2?'rgba(249,253,224,.60)':'rgba(112,138,107,.21)';x.lineWidth=1.2;x.beginPath();x.ellipse((i-2)*6,(i%2)*3,39-i*3,25-i*2,-.1,Math.PI*.9,TAU*1.02);x.stroke();}
 if(kind==='colony'){
  for(let i=0;i<26;i++){const a=i*2.4,r=4+Math.sqrt(i)*7.5;x.save();x.translate(Math.cos(a)*r,Math.sin(a)*r*.64);x.rotate(a*.7);shadow(x,9,5,2);rod(x,12+rng()*5,5+rng()*2,i+23);x.restore();}
  x.save();x.translate(-2,-5);ellipse(x,0,0,17,11,'rgba(239,246,221,.5)','#bccdb1',.7);for(let i=0;i<4;i++){x.save();x.translate(-9+i*6,(i%2?2:-2));x.rotate(-.5);rod(x,13,6,i+97);x.restore();}x.restore();
 }else if(kind==='garden'){
  for(let i=0;i<28;i++){const a=i*2.4,r=Math.sqrt(i)*7.4,px=Math.cos(a)*r,py=Math.sin(a)*r*.67,rr=4+rng()*3;shadowAt(x,px,py,rr,rr*.75);ellipse(x,px,py,rr,rr*.83,shade(x,px,py,rr,'#bedc67','#3e7737'),'#607e48',.7);ellipse(x,px,py,rr*.67,rr*.56,'#6aa63f');ellipse(x,px-rr*.25,py-rr*.3,rr*.35,rr*.2,'#e3edaa');ellipse(x,px+rr*.2,py+rr*.2,rr*.16,rr*.14,'#bfc994');}
 }else{
  ellipse(x,1,0,38,25,'#718e85','#879e85',1);ellipse(x,0,-2,37,24,shade(x,-4,-5,40,'#ccebf1','#70b3c4'),'#d9e9cc',1.8);
  for(let i=0;i<4;i++){x.save();x.translate((i%2?15:-14)+(i>1?3:0),(i<2?-7:10));x.rotate((i-1)*.7);x.scale(.53,.53);ciliate(x,0);x.restore();}
  x.strokeStyle='rgba(248,255,236,.85)';x.lineWidth=1.8;x.beginPath();x.ellipse(-1,-2,34,21,0,3.5,5.9);x.stroke();
 }
 x.restore();blob(x,pts.map(p=>[p[0]-.8,p[1]-1.3]));x.strokeStyle='rgba(249,252,227,.72)';x.lineWidth=1.2;x.stroke();return canvas;
}
function shadowAt(x:Ctx,px:number,py:number,rx:number,ry:number){x.save();x.translate(px,py);shadow(x,rx+2,ry+2,1.5);x.restore();}
function leaf(x:Ctx,px:number,py:number,size:number,a:number,tone=0){x.save();x.translate(px,py);x.rotate(a);shadow(x,size*.85,size*.38,2);x.beginPath();x.moveTo(-size,0);x.bezierCurveTo(-size*.45,-size*.56,size*.36,-size*.58,size,0);x.bezierCurveTo(size*.38,size*.45,-size*.4,size*.49,-size,0);x.closePath();const g=x.createLinearGradient(0,-size*.4,0,size*.4);const tones=[['#e3bd63','#bd913e','#82632b'],['#d49555','#ad633b','#70462d'],['#e3aa62','#be793d','#80522e']][tone];g.addColorStop(0,tones[0]);g.addColorStop(.55,tones[1]);g.addColorStop(1,tones[2]);x.fillStyle=g;x.fill();x.strokeStyle='#7e6c48';x.lineWidth=.7;x.stroke();x.strokeStyle='#d8b477';x.lineWidth=.8;x.beginPath();x.moveTo(-size*.92,0);x.lineTo(size*.96,0);for(let i=-2;i<=2;i++){const xx=i*size*.22;x.moveTo(xx,0);x.lineTo(xx-size*.18,-size*.27);x.moveTo(xx,0);x.lineTo(xx-size*.14,size*.25);}x.stroke();x.strokeStyle='#756446';x.lineWidth=1;x.beginPath();x.moveTo(-size,0);x.lineTo(-size-7,2);x.stroke();x.restore();}
export function makeResource(kind:'food'|'mineral'){
 const{canvas,ctx:x}=surface(RESOURCE_SIZE,RESOURCE_SIZE);shadow(x,46,29,4);
 if(kind==='food'){
  leaf(x,-12,7,23,-.4,0);leaf(x,14,2,26,.45,1);leaf(x,-3,-10,22,-.1,2);const rng=random(300);for(let i=0;i<24;i++){const a=rng()*TAU,r=15+rng()*25;ellipse(x,Math.cos(a)*r,Math.sin(a)*r*.7,1+rng()*2,.8+rng(),i%2?'#ce9b4d':'#99613e');}
 }else{
  const stones=[[-20,10,16,11],[3,13,15,10],[23,7,13,10],[-13,-5,17,12],[12,-7,18,13],[0,-16,11,8]];for(const [i,[px,py,rx,ry]]of stones.entries()){shadowAt(x,px,py,rx,ry);ellipse(x,px,py,rx,ry,shade(x,px-2,py-2,rx,i%3===0?'#eadbc4':i%3===1?'#d9e4ec':'#c4d1dc',i%3===0?'#b59875':i%3===1?'#879dab':'#6f879c'),'#7d8e94',.7);x.strokeStyle='rgba(255,255,247,.75)';x.lineWidth=.9;x.beginPath();x.ellipse(px-1,py-1,rx*.78,ry*.76,0,3.5,5.7);x.stroke();x.strokeStyle='rgba(101,119,130,.35)';x.lineWidth=.6;x.beginPath();x.moveTo(px-3,py-ry*.5);x.lineTo(px+2,py);x.lineTo(px-1,py+ry*.5);x.stroke();}
 }return canvas;
}
export function makeRock(variant:number){const{canvas,ctx:x}=surface(220,188),rng=random(71+variant);shadow(x,105,79,9);const pts:number[][]=[];for(let i=0;i<14;i++){const a=i*TAU/14,r=77+rng()*15;pts.push([Math.cos(a)*r,Math.sin(a)*r*.78]);}blob(x,pts);const g=x.createLinearGradient(-50,-65,65,70);const palette=[['#d1dce6','#a0b7c7','#6e8c9f'],['#e0c6a2','#bba07b','#8a775e'],['#d2d4da','#a8abb9','#7f8397']][variant%3];g.addColorStop(0,palette[0]);g.addColorStop(.32,palette[1]);g.addColorStop(1,palette[2]);x.fillStyle=g;x.fill();x.strokeStyle='#81978e';x.lineWidth=1;x.stroke();x.save();x.clip();for(let i=0;i<120;i++){const px=(rng()-.5)*190,py=(rng()-.5)*140;ellipse(x,px,py,rng()*1.6+.3,rng()*.8+.2,i%2?'rgba(247,249,224,.22)':'rgba(54,80,69,.12)');}for(let i=0;i<3;i++){x.strokeStyle=i===0?'rgba(238,245,218,.35)':'rgba(81,112,95,.17)';x.lineWidth=1.3;x.beginPath();x.moveTo(-70+i*27,-35);x.bezierCurveTo(-35+i*22,-45,-15+i*26,-2,20+i*20,0);x.stroke();}x.restore();return canvas;}

/** Decorative pigment-bearing communities are scenery, not simulated/resource units. */
function algalPatch(x:Ctx,px:number,py:number,size:number,seed:number){
 const rng=random(seed);x.save();x.translate(px,py);
 x.save();x.scale(1,.64);const wash=x.createRadialGradient(0,0,3,0,0,size);wash.addColorStop(0,'rgba(92,145,64,.25)');wash.addColorStop(.6,'rgba(124,163,79,.13)');wash.addColorStop(1,'rgba(124,163,79,0)');x.fillStyle=wash;x.fillRect(-size,-size,size*2,size*2);x.restore();
 // Curving, segmented green filaments: chloroplast-rich green algae.
 for(let i=0;i<19;i++){const bx=(rng()-.5)*size*1.35,by=(rng()-.5)*size*.75,len=8+rng()*17,angle=rng()*TAU;x.save();x.translate(bx,by);x.rotate(angle);x.strokeStyle=i%3?'rgba(75,126,52,.56)':'rgba(123,163,69,.65)';x.lineWidth=1.3;x.beginPath();x.moveTo(-len/2,0);x.bezierCurveTo(-len*.2,-3,len*.2,3,len/2,0);x.stroke();x.strokeStyle='rgba(203,222,130,.65)';x.lineWidth=.5;for(let j=0;j<5;j++){const xx=-len/2+j*len/4;x.beginPath();x.moveTo(xx,-.9);x.lineTo(xx,.9);x.stroke();}x.restore();}
 // A few gold-brown diatoms among the green filaments, with two golden plastid bands.
 for(let i=0;i<9;i++){x.save();x.translate((rng()-.5)*size*1.5,(rng()-.5)*size);x.rotate(rng()*TAU);ellipse(x,0,0,4+rng()*2,1.6,'rgba(185,137,52,.65)','rgba(131,105,55,.35)',.4);x.strokeStyle='rgba(242,210,125,.8)';x.lineWidth=.4;x.beginPath();x.moveTo(-3,0);x.lineTo(3,0);x.stroke();x.restore();}
 x.restore();
}
export function makePond(canvas:HTMLCanvasElement){
 canvas.width=1300;canvas.height=850;const x=canvas.getContext('2d')!,rng=random(13479);x.fillStyle='#a5cfdf';x.fillRect(0,0,1300,850);
 // Baked illumination and substrate color. Water tint is a readable game backdrop.
 for(let i=0;i<90;i++){const px=rng()*1300,py=rng()*850,r=35+rng()*130,g=x.createRadialGradient(px,py,0,px,py,r);g.addColorStop(0,i%4===0?'rgba(231,209,149,.25)':i%3?'rgba(194,232,232,.18)':'rgba(78,155,186,.16)');g.addColorStop(1,'rgba(160,206,217,0)');x.fillStyle=g;x.fillRect(px-r,py-r,r*2,r*2);}
 // Warm silt and sand at the shallows, transitioning to blue reflected light.
 for(const side of [0,1]){x.save();if(side){x.translate(1300,850);x.rotate(Math.PI);}x.beginPath();x.moveTo(0,0);x.lineTo(39,0);for(let y=0;y<=850;y+=30)x.lineTo(26+Math.sin(y*.019)*7+Math.sin(y*.037)*3,y);x.lineTo(0,850);x.closePath();const g=x.createLinearGradient(0,0,52,0);g.addColorStop(0,'#b79158');g.addColorStop(.55,'#dcc38b');g.addColorStop(1,'#bdcfba');x.fillStyle=g;x.fill();x.restore();}
 // Sparse mats sit well away from the opening's food, minerals, and home colony.
 for(const [px,py,size,seed]of [[65,350,42,31],[76,610,48,32],[440,355,38,33],[470,625,45,34],[1195,250,47,35],[1210,600,48,36],[760,160,38,37],[690,740,35,38]])algalPatch(x,px,py,size,seed);
 // A thin blue-green cyanobacterial film along selected bits of shoreline; no chloroplasts.
 for(const [px,py]of [[44,205],[55,490],[1248,360],[1252,710]]){const g=x.createRadialGradient(px,py,1,px,py,23);g.addColorStop(0,'rgba(53,130,116,.23)');g.addColorStop(1,'rgba(67,146,127,0)');ellipse(x,px,py,24,38,g);}
 for(let i=0;i<4500;i++){const px=rng()*1300,py=rng()*850,r=.2+rng()*.7;x.fillStyle=i%4===0?'rgba(111,132,99,.21)':i%3===0?'rgba(255,238,188,.42)':'rgba(163,134,84,.16)';x.beginPath();x.ellipse(px,py,r,r*.65,0,0,TAU);x.fill();}
 for(let i=0;i<80;i++){const px=60+rng()*1180,py=20+rng()*810;x.strokeStyle='rgba(132,143,92,.16)';x.lineWidth=.4;x.beginPath();x.moveTo(px,py);x.bezierCurveTo(px+5,py-3,px+8,py+2,px+12,py-2);x.stroke();}
}
