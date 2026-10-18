import {SPECIES,IDS,type SpeciesId,type Faction} from '../entities/Species.ts';
import type {Organism,Point,Site,Obstacle,Matrix,Event,Community,Order} from '../entities/Organism.ts';
import {Random,dist,clamp} from './math.ts';
import {SpatialHash} from './SpatialHash.ts';
import {Navigation} from '../ai/Pathfinding.ts';
import {Environment} from '../simulation/Environment.ts';
import {metabolize} from '../simulation/Metabolism.ts';
import {canFeed,compatible} from '../simulation/Feeding.ts';
import {divisionReady,partition} from '../simulation/Reproduction.ts';
import {updateVictory} from '../simulation/Objectives.ts';
import {strategicThink} from '../ai/StrategicAI.ts';
export class World {
 width=2600;height=1700;time=0;tick=0;nextId=1;seed:number;rng:Random;units:Organism[]=[];matrices:Matrix[]=[];events:Event[]=[];
 sites:Site[];obstacles:Obstacle[];env:Environment;nav:Navigation;hash=new SpatialHash();winner:number|null=null;reason='';cap=150;aiEnabled=true;aiBoth=false;aiInterval=16;
 communities:Community[];counts:Record<string,number>={};byId=new Map<number,Organism>();born=0;deaths=0;eaten=0;
 constructor(seed=81731,cap=150,empty=false){
 this.seed=seed;this.rng=new Random(seed);this.cap=cap;
 this.sites=[{x:580,y:420,name:'Lily Reach',kind:'light'},{x:1960,y:420,name:'Reed Shelf',kind:'mineral'},{x:1300,y:840,name:'Sunwell',kind:'light'},{x:650,y:1300,name:'Fallen Leaf',kind:'detritus'},{x:1930,y:1280,name:'Silt Basin',kind:'detritus'}].map((s,id)=>({...s,id,radius:145,owner:-1,capture:0,challenger:-1,contested:false})) as Site[];
 this.obstacles=[{x:890,y:620,radius:100},{x:1700,y:1040,radius:105},{x:1040,y:1170,radius:65},{x:1570,y:400,radius:78},{x:365,y:1180,radius:55},{x:2200,y:620,radius:70}];
 this.env=new Environment(this.sites);this.nav=new Navigation(this.obstacles);
 this.communities=[0,1,2].map(()=>({policy:'sustainable',reserve:12,targets:{alga:20,recycler:32,builder:12,ciliate:8,amoeba:4},holdTime:0}));
 if(!empty){for(const f of [0,1] as Faction[]){const center={x:f===0?240:2360,y:840};for(const [sp,n] of [['alga',10],['recycler',18],['builder',6],['ciliate',3],['amoeba',2]] as [SpeciesId,number][]){for(let i=0;i<n;i++){const p=this.nav.project({x:center.x+this.rng.range(-140,140),y:center.y+this.rng.range(-165,165)});this.spawn(sp,f,p);}}}
 for(const s of this.sites)for(let i=0;i<7;i++)this.spawn('recycler',2,{x:s.x+this.rng.range(-90,90),y:s.y+this.rng.range(-90,90)});
 this.alert('Establish your food web. Hold three habitats for 90 seconds.',{x:240,y:840},'info');}
 this.refresh();
 }
 spawn(species:SpeciesId,faction:Faction,p:Point){const s=SPECIES[species];const u:Organism={id:this.nextId++,species,faction,x:p.x,y:p.y,angle:this.rng.range(0,Math.PI*2),mass:s.mass*(1+this.rng.range(0,.3)),energy:85,health:100,age:this.rng.range(0,20),reproduce:true,division:0,born:-10,orders:[],path:[],target:null,huntPath:[],feeding:0,digest:0,think:this.rng.range(0,1),wander:{...p},anchor:{...p},alive:true,moving:false,stress:0};this.units.push(u);return u;}
 refresh(){this.hash.rebuild(this.units);this.byId=new Map(this.units.map(u=>[u.id,u]));this.counts={};for(const u of this.units)if(u.alive)this.counts[u.faction+u.species]=(this.counts[u.faction+u.species]||0)+1;}
 count(f:number,sp?:SpeciesId){return sp?this.counts[f+sp]||0:IDS.reduce((n,s)=>n+(this.counts[f+s]||0),0)}
 alert(text:string,p:Point,kind:Event['kind']='info'){this.events.push({...p,text,kind,time:this.time});if(this.events.length>30)this.events.shift();}
 order(ids:number[],order:Order,queue=false){const us=ids.map(id=>this.byId.get(id)).filter((u):u is Organism=>!!u&&u.alive);let index=0;for(const u of us){const spread=order.target?0:Math.min(70,10*Math.sqrt(us.length));const a=index++*2.39996;const r=spread*Math.sqrt(index/Math.max(1,us.length));const p=this.nav.project({x:order.x+Math.cos(a)*r,y:order.y+Math.sin(a)*r},SPECIES[u.species].radius+2);const o={...order,...p};if(queue&&u.orders.length<16){u.orders.push(o);continue;}u.orders=[o];u.anchor={x:o.x,y:o.y};u.target=null;u.feeding=0;u.path=o.type==='hold'?[]:this.nav.find(u,o);}}
 kill(u:Organism,detritus=true){if(!u.alive)return;u.alive=false;this.deaths++;this.counts[u.faction+u.species]=Math.max(0,(this.counts[u.faction+u.species]||1)-1);if(detritus)this.env.at(u.x,u.y).detritus+=u.mass;}
 eat(a:Organism,b:Organism){if(!compatible(a,b))return;const t=this.env.at(a.x,a.y),capacity=Math.max(0,SPECIES[a.species].mass*2.05-a.mass),kept=Math.min(capacity,b.mass*.65);a.mass+=kept;t.detritus+=b.mass-kept;a.energy=clamp(a.energy+b.mass*(a.species==='ciliate'?7:1.6),0,100);a.digest=a.species==='amoeba'?7:1.2;a.feeding=0;a.target=null;this.kill(b,false);this.eaten++;}
 totalMatter(){return this.env.matter()+this.units.reduce((n,u)=>n+(u.alive?u.mass:0),0)+this.matrices.reduce((n,m)=>n+m.mass,0)}
 matrixAt(p:Point,f:number){let mass=0;for(const m of this.matrices)if(m.faction===f&&dist(m,p)<m.radius)mass+=m.mass;return Math.min(1,mass/8);}
 step(dt=.1){if(this.winner!==null)return;this.time+=dt;this.tick++;this.refresh();
 if(this.aiEnabled&&this.tick%Math.round(this.aiInterval/dt)===0){strategicThink(this,1);if(this.aiBoth)strategicThink(this,0);}
 if(this.tick%10===0){this.env.update(dt*10);this.updateMatrices(dt*10);}
 for(const u of this.units){if(!u.alive)continue;metabolize(u,this.env,dt);if(u.health<=0||u.mass<SPECIES[u.species].mass*.25){this.kill(u);continue;}
 u.think-=dt;if(u.think<=0){this.think(u);const prey=u.target?this.byId.get(u.target):null;u.huntPath=prey&&!this.nav.line(u,prey,SPECIES[u.species].radius+2)?this.nav.find(u,prey):[];u.think=.6+this.rng.next()*.4;}
 this.act(u,dt);
 if(divisionReady(u)&&this.count(0)+this.count(1)+this.count(2)<this.cap&&this.count(u.faction)<(u.faction===2?35:Math.floor((this.cap-25)/2))&&this.count(u.faction,u.species)<this.communities[u.faction].targets[u.species]){
 u.division+=dt/3;if(u.division>=1){const child=partition(u,this.nextId++,this.time);const a=u.angle+Math.PI/2;const r=SPECIES[u.species].radius*.7;Object.assign(child,this.nav.project({x:u.x+Math.cos(a)*r,y:u.y+Math.sin(a)*r},SPECIES[u.species].radius+1));Object.assign(u,this.nav.project({x:u.x-Math.cos(a)*r,y:u.y-Math.sin(a)*r},SPECIES[u.species].radius+1));this.units.push(child);this.counts[u.faction+u.species]++;this.born++;}
 }else u.division=Math.max(0,u.division-dt);
 }
 this.units=this.units.filter(u=>u.alive);this.updateSites(dt);const v=updateVictory(this.sites,this.communities,dt);if(v!==null){this.winner=v;this.reason='Three habitats held continuously for 90 seconds.';}
 if(this.time>30)for(let f=0;f<2;f++)if(this.count(f)===0){this.winner=1-f;this.reason='The opposing community has no surviving cells.';}
 if(this.tick%200===0){const hungry=this.units.filter(u=>u.faction===0&&u.energy<20);if(hungry.length>3)this.alert(`${hungry.length} cells are hungry. Move grazers to prey; check reserves.`,hungry[0],'danger');}
 }
 think(u:Organism){const s=SPECIES[u.species],order=u.orders[0];const nearby=this.hash.query(u.x,u.y,u.species==='amoeba'?140:110);
 const current=u.target?this.byId.get(u.target):undefined;if(current&&(!current.alive||dist(u,current)>200||!canFeed(u,current,this.communities[u.faction],this.count(current.faction,current.species)))){u.target=null;u.feeding=0;}
 if(order?.target){const target=this.byId.get(order.target);if(target?.alive&&canFeed(u,target,this.communities[u.faction],this.count(target.faction,target.species))){u.target=target.id;return;}else if(!target?.alive){u.orders.shift();u.path=[];}}
 if(order?.type==='move'){u.target=null;return;}
 if(s.prey.length&&u.digest===0&&(u.energy<85||order?.type==='attack')){
 const eligible=nearby.filter(b=>canFeed(u,b,this.communities[u.faction],this.count(b.faction,b.species))&&(order?.type!=='hold'||dist(u,b)<s.radius+SPECIES[b.species].radius+7));
 eligible.sort((a,b)=>((a.faction===u.faction?500:0)+(a.faction===2?50:0)+dist(u,a))-((b.faction===u.faction?500:0)+(b.faction===2?50:0)+dist(u,b)));
 if(eligible.length)u.target=eligible[0].id;
 }
 if(order||u.target)return;
 const threat=nearby.find(b=>b.faction!==u.faction&&b.faction!==2&&compatible(b,u)&&dist(b,u)<70);
 if(threat){const a=Math.atan2(u.y-threat.y,u.x-threat.x);u.wander=this.nav.project({x:u.x+Math.cos(a)*80,y:u.y+Math.sin(a)*80},s.radius+1);return;}
 if(dist(u,u.anchor)>110){u.wander={...u.anchor};return;}
 if(dist(u,u.wander)<8||this.rng.next()<.15){let best=this.nav.project({x:u.x+this.rng.range(-55,55),y:u.y+this.rng.range(-55,55)},s.radius+1);let value=-Infinity;for(let i=0;i<5;i++){const p=this.nav.project({x:u.x+this.rng.range(-75,75),y:u.y+this.rng.range(-75,75)},s.radius+1);const tile=this.env.at(p.x,p.y);const score=u.species==='alga'?tile.light+tile.mineral*.002:u.species==='recycler'?tile.doc*.01+tile.detritus*.005:tile.doc*.01;if(score>value&&dist(p,u.anchor)<95){value=score;best=p;}}u.wander=dist(best,u.anchor)<110?best:{...u.anchor};}
 }
 act(u:Organism,dt:number){const s=SPECIES[u.species],order=u.orders[0];let dest:Point|undefined;
 const prey=u.target?this.byId.get(u.target):undefined;
 if(prey?.alive&&u.digest===0){const reach=s.radius+SPECIES[prey.species].radius+5;if(dist(u,prey)<reach){u.moving=false;u.angle=Math.atan2(prey.y-u.y,prey.x-u.x);const protection=this.matrixAt(prey,prey.faction);u.feeding+=dt/(u.species==='amoeba'?3.5:1.4)/(1+protection*3);if(u.feeding>=1){if(canFeed(u,prey,this.communities[u.faction],this.count(prey.faction,prey.species)))this.eat(u,prey);else{u.target=null;u.feeding=0;}}return;}u.feeding=Math.max(0,u.feeding-dt);if(order?.type!=='hold'){while(u.huntPath.length&&dist(u,u.huntPath[0])<10)u.huntPath.shift();dest=this.nav.line(u,prey,s.radius+2)?prey:u.huntPath[0];}}
 if(!dest&&order){if(order.type==='hold'){u.moving=false;return;}if(!u.path.length){if(dist(u,order)<40){if(order.type==='feed'){u.orders=[{...order,type:'hold'}];u.moving=false;return;}u.anchor={x:order.x,y:order.y};u.orders.shift();const next=u.orders[0];if(next)u.path=this.nav.find(u,next);else u.wander={x:u.x,y:u.y};}else u.path=this.nav.find(u,order);}if(u.path.length){dest=u.path[0];if(dist(u,dest)<10){u.path.shift();dest=u.path[0];}}}
 if(!dest&&!u.orders.length){if(u.species==='builder'){u.moving=false;return;}dest=u.wander;}
 if(!dest||dist(u,dest)<3){u.moving=false;return;}
 const d=dist(u,dest);let vx=(dest.x-u.x)/d,vy=(dest.y-u.y)/d;
 let checks=0;for(const other of this.hash.query(u.x,u.y,s.radius+28)){if(other.id===u.id||other.id===u.target)continue;if(checks++>24)break;const dd=dist(u,other),rr=s.radius+SPECIES[other.species].radius;if(dd<rr&&dd>.01){const push=(rr-dd)/rr*.6;vx+=(u.x-other.x)/dd*push;vy+=(u.y-other.y)/dd*push;}}
 const l=Math.hypot(vx,vy)||1;vx/=l;vy/=l;let slow=1;for(const m of this.matrices)if(m.faction!==u.faction&&dist(u,m)<m.radius)slow=Math.min(slow,.55);
 const velocity=s.speed*(u.energy<20?.4:1)*(u.digest>0?.65:1)*slow;const p={x:u.x+vx*Math.min(d,velocity*dt),y:u.y+vy*Math.min(d,velocity*dt)};
 const q=this.nav.project(p,s.radius+1);u.moving=dist(u,q)>.05;u.x=q.x;u.y=q.y;u.angle=Math.atan2(vy,vx);
 }
 updateMatrices(dt:number){for(const m of this.matrices){const loss=Math.min(m.mass,m.mass*.002*dt);m.mass-=loss;this.env.at(m.x,m.y).doc+=loss;m.radius=16+Math.sqrt(m.mass)*10;}
 this.matrices=this.matrices.filter(m=>{if(m.mass<=.0001){this.env.at(m.x,m.y).doc+=m.mass;return false;}return true;});
 for(const u of this.units)if(u.species==='builder'&&!u.moving&&u.energy>35&&u.mass>1.6){let m=this.matrices.find(m=>m.faction===u.faction&&dist(m,u)<40);if(!m){m={x:u.x,y:u.y,faction:u.faction,mass:0,radius:20};this.matrices.push(m);}if(m.mass<12){const cost=Math.min(u.mass-1.6,.012*dt*(u.faction===1?1.4:1));u.mass-=cost;m.mass+=cost;u.energy-=cost*2;}}
 }
 updateSites(dt:number){for(const s of this.sites){const weight=[0,0];for(const u of this.hash.query(s.x,s.y,s.radius)){if(u.faction<2)weight[u.faction]+=u.species==='amoeba'?2.5:u.species==='ciliate'?1.6:u.species==='alga'?.6:.2;}
 
 const f=weight[0]>=1&&weight[0]>weight[1]*1.5?0:weight[1]>=1&&weight[1]>weight[0]*1.5?1:-1;
 s.contested=(weight[0]>.5&&weight[1]>.5&&f<0)||(f>=0&&s.owner>=0&&f!==s.owner);
 if(f>=0&&f!==s.owner){if(s.challenger!==f){s.challenger=f;s.capture=0;}s.capture+=dt/32;if(s.capture>=1){s.owner=f;s.capture=0;s.challenger=-1;this.alert(`${s.name} · ${f===0?'habitat secured':'Sediment expanding'}`,s,f===0?'good':'danger');}}else if(f===s.owner||f===-1){s.capture=Math.max(0,s.capture-dt/40);if(s.capture===0)s.challenger=-1;}
 }}
}
