export type Team = 0 | 1;
export type UnitKind = 'worker' | 'ciliate' | 'amoeba';
export type BuildingKind = 'colony' | 'garden' | 'nursery';
export type ResourceKind = 'food' | 'mineral';
export interface Point { x:number; y:number }
export interface Cost { food:number; mineral:number }
export interface Order extends Point { type:'move'|'gather'|'build'|'attack'|'attackMove'|'hold'; target?:number }
export interface Unit extends Point { previous?:Point; id:number; kind:UnitKind; team:Team; hp:number; angle:number; orders:Order[]; path:Point[]; cargo:number; resource:ResourceKind; returning:boolean; cooldown:number; flash:number; moving:boolean; bite:number; routeTarget?:Point }
export interface Task { kind:UnitKind|'advance'; left:number; total:number }
export interface Building extends Point { id:number; kind:BuildingKind; team:Team; hp:number; progress:number; queue:Task[]; rally:Point|null }
export interface Resource extends Point { id:number; kind:ResourceKind; amount:number; initial:number }
export const UNITS:Record<UnitKind,{name:string; role:string; hp:number; speed:number; radius:number; damage:number; cost:Cost; time:number; description:string}> = {
 worker:{name:'Worker bacterium',role:'Gather / construct',hp:40,speed:68,radius:10,damage:0,cost:{food:40,mineral:0},time:14,description:'A decomposer bacterium. Gathers organic matter and minerals, returns them to the colony, and establishes biofilm sites. Worker logistics are an RTS abstraction.'},
 ciliate:{name:'Ciliate',role:'Fast bacterial grazer',hp:105,speed:78,radius:16,damage:8,cost:{food:70,mineral:20},time:24,description:'Cilia propel this mostly colorless protist. It grazes enemy bacteria and bacterial colonies. It cannot engulf another ciliate or an amoeba.'},
 amoeba:{name:'Amoeba',role:'Slow engulfing predator',hp:190,speed:42,radius:24,damage:14,cost:{food:130,mineral:45},time:38,description:'A mostly colorless crawling protist. Pseudopodia surround smaller prey. It can engulf bacteria and ciliates, but not an equal-sized amoeba.'}
};
export const BUILDINGS:Record<BuildingKind,{name:string; hp:number; radius:number; cost:Cost; time:number; description:string}> = {
 colony:{name:'Home colony',hp:900,radius:46,cost:{food:0,mineral:0},time:0,description:'Your starting biofilm colony. Receives gathered resources and grows workers. Protect it: losing this colony ends the match.'},
 garden:{name:'Algal bed',hp:280,radius:32,cost:{food:70,mineral:25},time:22,description:'A sunlit patch of green algae. Adds 8 population spaces and produces 1 food every 2 seconds. This is a simplified resource model of photosynthesis and cross-feeding.'},
 nursery:{name:'Grazing pool',hp:420,radius:37,cost:{food:100,mineral:60},time:30,description:'An established microbial habitat. Grow ciliates here. Mature your colony to support amoebae. Receives workers’ gathered resources too.'}
};
export const ADVANCE={food:160,mineral:100,time:45};
export const WIDTH=2600, HEIGHT=1700, PEACE=300, MAX_UNITS=48;
export const SAVE_KEY='microbial-empires.v2.match', SETTINGS_KEY='microbial-empires.v2.settings';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function canEat(a:Unit,b:Unit){return a.team!==b.team&&(a.kind==='ciliate'?b.kind==='worker':a.kind==='amoeba'?b.kind!=='amoeba':false);}
