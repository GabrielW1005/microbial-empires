import {Navigation} from '../ai/Pathfinding.ts';
import {UNITS,BUILDINGS,ADVANCE,PEACE,MAX_UNITS,WIDTH,HEIGHT,SAVE_KEY,clamp,distance,canEat} from './model.ts';
import type {Unit,Building,Resource,UnitKind,BuildingKind,Team,Point,Order,Cost} from './model.ts';

export class Engine {
 time=0; nextId=1; units:Unit[]=[]; buildings:Building[]=[]; resources:Resource[]=[];
 stock:Cost[]=[{food:70,mineral:40},{food:70,mineral:40}]; age=[1,1]; winner:Team|null=null;
 ai=true; aiTimer=0; raidTimer=PEACE; deposited=0; made=0; notice=''; noticeTime=-100;
 obstacles=[{x:1050,y:520,radius:76},{x:1490,y:1140,radius:80},{x:1160,y:1350,radius:52},{x:1640,y:390,radius:55}];
 nav=new Navigation(this.obstacles);
 constructor(empty=false){if(empty)return;
  for(const team of [0,1] as Team[]){const x=team?2250:330;this.addBuilding('colony',team,{x,y:830},1);
   for(let i=0;i<3;i++)this.addUnit('worker',team,{x:x+(team?-80:80),y:795+i*34});
  }
  for(const [x,y,kind,amount] of [[530,640,'food',1500],[540,1050,'mineral',1200],[2090,640,'food',1500],[2080,1060,'mineral',1200],[890,950,'food',1800],[1740,830,'food',1800],[1270,670,'mineral',1800],[1240,1060,'food',2200],[750,350,'mineral',1500],[1800,1390,'mineral',1500]] as [number,number,'food'|'mineral',number][])
   this.resources.push({id:this.nextId++,x,y,kind,amount,initial:amount});
 }
 home(team:Team){return this.buildings.find(b=>b.team===team&&b.kind==='colony'&&b.hp>0);}
 unit(id:number){return this.units.find(u=>u.id===id&&u.hp>0);}
 building(id:number){return this.buildings.find(b=>b.id===id&&b.hp>0);}
 entity(id:number){return this.unit(id)||this.building(id)||this.resources.find(r=>r.id===id);}
 addUnit(kind:UnitKind,team:Team,p:Point){const q=this.nav.project(p,UNITS[kind].radius+2);const u:Unit={...q,id:this.nextId++,kind,team,hp:UNITS[kind].hp,angle:team?Math.PI:0,orders:[],path:[],cargo:0,resource:'food',returning:false,cooldown:0,flash:0,moving:false,bite:0};this.units.push(u);return u;}
 addBuilding(kind:BuildingKind,team:Team,p:Point,progress=0){const b:Building={...p,id:this.nextId++,kind,team,hp:BUILDINGS[kind].hp,progress,queue:[],rally:null};this.buildings.push(b);return b;}
 count(team:Team){return this.units.filter(u=>u.team===team&&u.hp>0).length;}
 queued(team:Team){return this.buildings.filter(b=>b.team===team).reduce((n,b)=>n+b.queue.filter(q=>q.kind!=='advance').length,0);}
 capacity(team:Team){return Math.min(MAX_UNITS,10+8*this.buildings.filter(b=>b.team===team&&b.kind==='garden'&&b.progress===1&&b.hp>0).length);}
 canPay(team:Team,c:Cost){return this.stock[team].food>=c.food&&this.stock[team].mineral>=c.mineral;}
 pay(team:Team,c:Cost){this.stock[team].food-=c.food;this.stock[team].mineral-=c.mineral;}
 refund(team:Team,c:Cost){this.stock[team].food+=c.food;this.stock[team].mineral+=c.mineral;}
 message(s:string){this.notice=s;this.noticeTime=this.time;}
 train(id:number,kind:UnitKind|'advance'):string {
  const b=this.building(id);if(!b||b.progress<1)return 'Finish construction first.';
  if(b.queue.length>=5)return 'Production queue is full (5).';
  if(kind==='advance'){
   if(b.kind!=='colony'||this.age[b.team]>1||b.queue.some(q=>q.kind==='advance'))return 'Colony maturation is already complete or queued.';
   if(!this.buildings.some(x=>x.team===b.team&&x.kind==='nursery'&&x.progress===1))return 'Build a grazing pool first.';
  }else{
   if(kind==='worker'?b.kind!=='colony':b.kind!=='nursery')return 'Select the appropriate colony or grazing pool.';
   if(kind==='amoeba'&&this.age[b.team]<2)return 'Mature your home colony to unlock amoebae.';
   if(this.count(b.team)+this.queued(b.team)>=this.capacity(b.team))return 'Population full. Build an algal bed (+8 spaces).';
  }
  const info=kind==='advance'?ADVANCE:UNITS[kind],cost=kind==='advance'?ADVANCE:UNITS[kind].cost;
  if(!this.canPay(b.team,cost))return 'Not enough food or minerals. Send workers to gather.';
  this.pay(b.team,cost);b.queue.push({kind,left:info.time,total:info.time});return '';
 }
 spawnPoint(b:Building){for(let i=0;i<80;i++){const a=(this.made+i)*2.4,r=80+Math.floor(i/12)*22,p={x:b.x+Math.cos(a)*r,y:b.y+Math.sin(a)*r};if(this.nav.clear(p,28)&&!this.units.some(u=>distance(u,p)<38))return p;}return{x:b.x+80,y:b.y+60};}
 cancel(id:number){const b=this.building(id),q=b?.queue.pop();if(b&&q)this.refund(b.team,q.kind==='advance'?ADVANCE:UNITS[q.kind].cost);}
 validBuild(kind:BuildingKind,p:Point){const r=BUILDINGS[kind].radius;return kind!=='colony'&&p.x>r+30&&p.x<WIDTH-r-30&&p.y>r+30&&p.y<HEIGHT-r-30&&this.nav.clear(p,r+12)&&!this.buildings.some(b=>b.hp>0&&distance(b,p)<r+BUILDINGS[b.kind].radius+26)&&!this.resources.some(x=>distance(x,p)<r+47);}
 build(ids:number[],kind:BuildingKind,p:Point,team:Team=0):string {
  const workers=ids.map(id=>this.unit(id)).filter((u):u is Unit=>!!u&&u.team===team&&u.kind==='worker');
  if(!workers.length)return 'Select a worker to construct a habitat.';
  if(this.buildings.filter(b=>b.team===team).length>=12)return 'Habitat limit reached (12).';
  if(!this.validBuild(kind,p))return 'Choose open ground away from other habitats, rocks and resources.';
  if(!this.canPay(team,BUILDINGS[kind].cost))return 'Not enough food or minerals.';
  this.pay(team,BUILDINGS[kind].cost);const b=this.addBuilding(kind,team,p);this.order(workers.map(u=>u.id),{...p,type:'build',target:b.id});return '';
 }
 order(ids:number[],order:Order,queue=false){let i=0;const chosen=ids.map(id=>this.unit(id)).filter((u):u is Unit=>!!u);
  for(const u of chosen){let o={...order};if(u.kind==='worker'&&o.type==='attackMove')o.type='move';if(o.type==='move'||o.type==='attackMove'){const angle=i*2.4,r=chosen.length>1?Math.sqrt(i)*20:0;i++;o={...o,...this.nav.project({x:o.x+Math.cos(angle)*r,y:o.y+Math.sin(angle)*r})};}
   if(queue){if(u.orders.length<12)u.orders.push(o);}else{u.orders=[o];u.path=[];u.routeTarget=undefined;u.returning=false;}
  }
 }
 move(u:Unit,p:Point,dt:number,stop=5){const d=distance(u,p);if(d<=stop){u.moving=false;return true;}
  if(!u.routeTarget||distance(u.routeTarget,p)>40||!u.path.length){u.path=this.nav.find(u,p);u.routeTarget={...p};}
  const goal=u.path[0];if(!goal)return false;const dd=distance(u,goal),step=UNITS[u.kind].speed*dt;
  u.angle=Math.atan2(goal.y-u.y,goal.x-u.x);u.moving=true;
  if(dd<=step){u.x=goal.x;u.y=goal.y;u.path.shift();}else{u.x+=Math.cos(u.angle)*step;u.y+=Math.sin(u.angle)*step;}
  return false;
 }
 next(u:Unit){u.orders.shift();u.path=[];u.routeTarget=undefined;u.moving=false;}
 deposit(u:Unit,dt:number){const homes=this.buildings.filter(b=>b.team===u.team&&b.progress===1&&b.hp>0&&(b.kind==='colony'||b.kind==='nursery')).sort((a,b)=>distance(a,u)-distance(b,u));const home=homes[0];if(!home)return;
  if(this.move(u,home,dt,BUILDINGS[home.kind].radius+15)){this.stock[u.team][u.resource]+=u.cargo;if(u.team===0)this.deposited+=u.cargo;u.cargo=0;u.returning=false;u.path=[];u.routeTarget=undefined;}
 }
 targetFor(u:Unit,r=160){let target:Unit|Building|undefined,best=r;
  for(const enemy of this.units){if(enemy.hp<=0||!canEat(u,enemy))continue;const d=distance(u,enemy);if(d<best){best=d;target=enemy;}}
  if(u.kind!=='worker')for(const b of this.buildings){if(b.team===u.team||b.hp<=0)continue;const d=distance(u,b)-BUILDINGS[b.kind].radius;if(d<best){best=d;target=b;}}
  return target;
 }
 attack(u:Unit,target:Unit|Building,dt:number){const radius='queue' in target?BUILDINGS[target.kind].radius:UNITS[target.kind].radius;
  if(this.move(u,target,dt,UNITS[u.kind].radius+radius+6)&&u.cooldown<=0){target.hp-=UNITS[u.kind].damage;u.cooldown=u.kind==='amoeba'?1.4:.9;u.bite=.6;if('flash' in target)target.flash=.25;
   if(target.team===0&&this.time-this.noticeTime>12)this.message('Your community is under attack. Select defenders or retreat.');
   if(target.hp<=0&&'orders' in target){this.stock[u.team].food+=target.kind==='worker'?6:15;u.hp=Math.min(UNITS[u.kind].hp,u.hp+8);}
  }
 }
 step(dt:number){if(this.winner!==null)return;this.time+=dt;for(const u of this.units)u.previous={x:u.x,y:u.y};
  for(const b of this.buildings){if(b.hp<=0||b.progress<1)continue;
   if(b.kind==='garden')this.stock[b.team].food+=dt*.5;
   const q=b.queue[0];if(!q)continue;
   if(q.kind!=='advance'&&this.count(b.team)>=this.capacity(b.team))continue;
   q.left-=dt;if(q.left<=0){b.queue.shift();if(q.kind==='advance'){this.age[b.team]=2;if(b.team===0)this.message('Colony mature. Amoebae are now available at grazing pools.');}else{const u=this.addUnit(q.kind,b.team,this.spawnPoint(b));this.made++;if(b.rally)this.order([u.id],{...b.rally,type:'move'});}}
  }
  for(const u of this.units){if(u.hp<=0)continue;u.cooldown-=dt;u.flash=Math.max(0,u.flash-dt);u.bite=Math.max(0,u.bite-dt);u.moving=false;const o=u.orders[0];
   if(!o){if(u.cargo>0){u.returning=true;this.deposit(u,dt);}else if(u.kind!=='worker'){const target=this.targetFor(u,90);if(target)this.attack(u,target,dt);}continue;}
   if(o.type==='hold')continue;
   if(o.type==='move'){if(this.move(u,o,dt))this.next(u);continue;}
   if(o.type==='gather'){
    if(u.kind!=='worker'){this.next(u);continue;}const r=this.resources.find(r=>r.id===o.target);
    if(u.returning||u.cargo>=12||(!r||r.amount<=0)&&u.cargo>0){u.returning=true;this.deposit(u,dt);continue;}
    if(!r||r.amount<=0){this.next(u);continue;}
    if(u.cargo>0&&u.resource!==r.kind){u.returning=true;this.deposit(u,dt);continue;}
    if(this.move(u,r,dt,35)){u.resource=r.kind;const n=Math.min(dt*2,r.amount,12-u.cargo);r.amount-=n;u.cargo+=n;u.bite=.15;}continue;
   }
   if(o.type==='build'){
    const b=o.target===undefined?undefined:this.building(o.target);if(!b||u.kind!=='worker'||b.progress>=1){this.next(u);continue;}
    if(this.move(u,b,dt,BUILDINGS[b.kind].radius+15)){b.progress=Math.min(1,b.progress+dt/BUILDINGS[b.kind].time);u.bite=.15;if(b.progress===1&&b.team===0)this.message(`${BUILDINGS[b.kind].name} completed.`);}continue;
   }
   if(u.kind==='worker'){this.next(u);continue;}
   let target=o.target===undefined?undefined:this.unit(o.target)||this.building(o.target);
   if(target&&(target.team===u.team||('orders' in target&&!canEat(u,target))))target=undefined;
   if(o.type==='attack'&&(!target||target.hp<=0)){this.next(u);continue;}
   if(o.type==='attackMove')target=this.targetFor(u);
   if(target)this.attack(u,target,dt);else if(this.move(u,o,dt))this.next(u);
  }
  // Local separation only: bounded spatial buckets, no all-pairs force solver.
  const bins=new Map<string,Unit[]>();for(const u of this.units){if(u.hp<=0)continue;const key=`${u.x>>6},${u.y>>6}`;const list=bins.get(key)||[];list.push(u);bins.set(key,list);}
  for(const u of this.units){if(!u.moving)continue;const bx=u.x>>6,by=u.y>>6;for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const v of bins.get(`${x},${y}`)||[]){if(v.id===u.id)continue;const d=distance(u,v),r=(UNITS[u.kind].radius+UNITS[v.kind].radius)*.7;if(d<r){const a=d>.1?Math.atan2(u.y-v.y,u.x-v.x):u.id*2.4;const n=Math.min(1,(r-d)*dt*2);u.x=clamp(u.x+Math.cos(a)*n,20,WIDTH-20);u.y=clamp(u.y+Math.sin(a)*n,20,HEIGHT-20);}}}
  this.units=this.units.filter(u=>u.hp>0);this.buildings=this.buildings.filter(b=>b.hp>0);
  if(!this.home(0))this.winner=1;else if(!this.home(1))this.winner=0;
  this.aiTimer-=dt;if(this.ai&&this.aiTimer<=0){this.aiTimer=3;this.thinkAI();}
 }
 thinkAI(){const team:Team=1,home=this.home(team);if(!home)return;const workers=this.units.filter(u=>u.team===team&&u.kind==='worker');
  for(const u of workers)if(!u.orders.length){const kind=u.id%3===0?'mineral':'food';const r=this.resources.filter(r=>r.kind===kind&&r.amount>0).sort((a,b)=>distance(a,home)-distance(b,home))[0];if(r)this.order([u.id],{...r,type:'gather',target:r.id});}
  if(workers.length+home.queue.length<7)this.train(home.id,'worker');
  const garden=this.buildings.filter(b=>b.team===team&&b.kind==='garden');
  if(this.time>70&&(garden.length===0||this.count(team)+this.queued(team)>=this.capacity(team)-2)&&garden.length<4){const x=home.x-150-(garden.length%2)*160,y=home.y+130+Math.floor(garden.length/2)*125;this.build(workers.slice(0,1).map(u=>u.id),'garden',{x,y},team);}
  let pool=this.buildings.find(b=>b.team===team&&b.kind==='nursery');
  if(this.time>145&&!pool){this.build(workers.slice(-1).map(u=>u.id),'nursery',{x:home.x-230,y:home.y-300},team);pool=this.buildings.find(b=>b.team===team&&b.kind==='nursery');}
  if(pool&&pool.progress===1&&pool.queue.length<2)this.train(pool.id,this.age[team]>1&&this.units.filter(u=>u.team===team&&u.kind==='amoeba').length<3?'amoeba':'ciliate');
  if(this.time>380&&this.age[team]===1)this.train(home.id,'advance');
  if(this.time>=this.raidTimer){this.raidTimer=this.time+110;const enemy=this.home(0);const fighters=this.units.filter(u=>u.team===team&&u.kind!=='worker');if(enemy&&fighters.length>=3){this.order(fighters.slice(0,5).map(u=>u.id),{...enemy,type:'attackMove'});this.message('A rival group has left its colony. Prepare your defenders.');}}
 }
 save(){return JSON.stringify({game:'Microbial Empires',version:2,time:this.time,nextId:this.nextId,units:this.units,buildings:this.buildings,resources:this.resources,stock:this.stock,age:this.age,winner:this.winner,ai:this.ai,aiTimer:this.aiTimer,raidTimer:this.raidTimer,deposited:this.deposited,made:this.made});}
 static load(text:string){if(text.length>1_000_000)throw new Error('Save too large.');const a=JSON.parse(text);const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);const point=(p:Point)=>p&&finite(p.x)&&finite(p.y)&&p.x>=0&&p.x<=WIDTH&&p.y>=0&&p.y<=HEIGHT;
  if(a.game!=='Microbial Empires'||a.version!==2)throw new Error('This version uses new colony saves. Old v0.1 saves are kept separately.');
  if(!finite(a.time)||a.time<0||!Number.isInteger(a.nextId)||a.nextId<1||!Array.isArray(a.units)||a.units.length>MAX_UNITS*2||!Array.isArray(a.buildings)||a.buildings.length>24||!Array.isArray(a.resources)||a.resources.length!==10||!Array.isArray(a.stock)||a.stock.length!==2||!a.stock.every((c:Cost)=>finite(c.food)&&finite(c.mineral)&&c.food>=0&&c.mineral>=0)||!Array.isArray(a.age)||a.age.length!==2||!a.age.every((n:number)=>n===1||n===2)||![null,0,1].includes(a.winner))throw new Error('Invalid colony save.');
  const ids=new Set<number>();for(const e of [...a.units,...a.buildings,...a.resources]){if(!point(e)||!Number.isInteger(e.id)||e.id<1||e.id>=a.nextId||ids.has(e.id))throw new Error('Invalid entity.');ids.add(e.id);}
  for(const u of a.units){if(!Object.hasOwn(UNITS,u.kind)||![0,1].includes(u.team)||!finite(u.hp)||u.hp<=0||u.hp>UNITS[u.kind as UnitKind].hp||!finite(u.angle)||!finite(u.cargo)||u.cargo<0||u.cargo>12||!['food','mineral'].includes(u.resource)||!finite(u.cooldown)||!finite(u.flash)||!finite(u.bite)||typeof u.returning!=='boolean'||!Array.isArray(u.orders)||u.orders.length>12||!u.orders.every((o:Order)=>point(o)&&['move','gather','build','attack','attackMove','hold'].includes(o.type)&&(o.target===undefined||Number.isInteger(o.target))))throw new Error('Invalid worker or unit.');u.path=[];delete u.routeTarget;delete u.previous;}
  for(const b of a.buildings){if(!Object.hasOwn(BUILDINGS,b.kind)||![0,1].includes(b.team)||!finite(b.hp)||b.hp<=0||b.hp>BUILDINGS[b.kind as BuildingKind].hp||!finite(b.progress)||b.progress<0||b.progress>1||b.rally!==null&&!point(b.rally)||!Array.isArray(b.queue)||b.queue.length>5||!b.queue.every((q:{kind:string;left:number;total:number})=>(Object.hasOwn(UNITS,q.kind)||q.kind==='advance')&&finite(q.left)&&finite(q.total)&&q.total>0&&q.total<=45&&q.left>=0&&q.left<=q.total))throw new Error('Invalid habitat.');}
  for(const r of a.resources)if(!['food','mineral'].includes(r.kind)||!finite(r.amount)||r.amount<0||!finite(r.initial)||r.initial<r.amount)throw new Error('Invalid resource patch.');
  for(const k of ['aiTimer','raidTimer','deposited','made'])if(!finite(a[k]))throw new Error('Invalid match clock.');if(typeof a.ai!=='boolean')throw new Error('Invalid rival.');
  const w=new Engine(true);for(const k of ['time','nextId','units','buildings','resources','stock','age','winner','ai','aiTimer','raidTimer','deposited','made'])Object.assign(w,{[k]:a[k]});return w;
 }
}
export {SAVE_KEY};
