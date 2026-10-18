import {SPECIES} from '../entities/Species.ts';
import type {Organism} from '../entities/Organism.ts';
import type {Environment} from './Environment.ts';
import {clamp} from '../game/math.ts';
export function metabolize(u:Organism,env:Environment,dt:number){
 const s=SPECIES[u.species],t=env.at(u.x,u.y),aerobic=u.species!=='recycler'&&u.species!=='builder';
 u.age+=dt;u.energy-=s.upkeep*(u.moving?1.25:1)*dt;u.digest=Math.max(0,u.digest-dt);
 if(u.species==='alga'){
 const capacity=Math.max(0,s.mass*2.05-u.mass),gain=Math.min(capacity,.075*t.light*(u.faction===0?1.25:1)*dt,t.carbon/.8,t.mineral/.2);
 t.carbon-=gain*.8;t.mineral-=gain*.2;u.mass+=gain;u.energy=clamp(u.energy+t.light*.28*dt,0,100);t.oxygen=clamp(t.oxygen+gain*.012,0,1);
 const leak=Math.min(u.mass,.0018*u.mass*dt);u.mass-=leak;t.doc+=leak;
 } else if(u.species==='recycler'||u.species==='builder'){
 const factor=u.faction===1?1.25:1;
 if(u.species==='recycler'){const decay=Math.min(t.detritus,.028*factor*dt);t.detritus-=decay;t.doc+=decay*.75;env.returnMineral(t,decay*.25);}
 const capacity=Math.max(0,s.mass*2.05-u.mass),eat=Math.min(t.doc,.035*factor*dt,capacity/.6+.012*dt);
 t.doc-=eat;const growth=Math.min(capacity,eat*.6);u.mass+=growth;env.returnMineral(t,eat-growth);u.energy=clamp(u.energy+eat*8,0,100);t.oxygen=clamp(t.oxygen-eat*.008,0,1);
 }
 if(aerobic){const stress=Math.max(0,.2-t.oxygen);u.energy-=stress*.4*dt;t.oxygen=clamp(t.oxygen-.00008*s.mass*dt,0,1);u.stress=stress;}
 if(u.energy<12){const catabolism=Math.min(u.mass,s.mass*.0014*dt);u.mass-=catabolism;env.returnMineral(t,catabolism);u.energy+=catabolism*2;u.health-=.12*dt;}else u.health=clamp(u.health+.08*dt,0,100);
 u.energy=clamp(u.energy,0,100);
}
