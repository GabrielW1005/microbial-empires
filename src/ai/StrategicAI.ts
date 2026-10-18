import type {World} from '../game/World.ts';
import type {Faction} from '../entities/Species.ts';
import {dist} from '../game/math.ts';
import {compatible} from '../simulation/Feeding.ts';
export function strategicThink(w:World,f:Faction){
 const home={x:f===0?240:2360,y:840};const own=w.units.filter(u=>u.faction===f&&u.alive);if(!own.length)return;
 const pressure=w.sites.filter(s=>s.owner===1-f).length;
 const expansion=Math.min(3,Math.max(1+Math.floor(w.time/150),pressure));
 const ranked=[...w.sites].sort((a,b)=>dist(a,home)-dist(b,home));
 const targets=ranked.slice(0,Math.min(2,expansion));
 if(expansion>=3){const others=ranked.slice(2);const score=(s:typeof w.sites[0])=>{let strength=0;for(const u of w.hash.query(s.x,s.y,200))if(u.faction===1-f)strength+=u.species==='amoeba'?4:u.species==='ciliate'?2:u.species==='alga'?1:.15;return strength*120+dist(s,home)*.2+(s.owner===f?-180:0);};others.sort((a,b)=>score(a)-score(b));targets.push(others[0]);}
 let frontier=targets.at(-1)!;
 if(w.communities[1-f].holdTime>0){const threatened=w.sites.filter(s=>s.owner===1-f).sort((a,b)=>dist(a,home)-dist(b,home));if(threatened[0])frontier=threatened[0];}
 for(let i=0;i<own.length;i++){const u=own[i];let site=targets[u.id%targets.length];
 if(u.species==='alga'&&w.env.at(site.x,site.y).light<.5)site=targets[0];
 if(u.species==='amoeba'||u.species==='ciliate'&&u.id%3!==0)site=frontier;
 if(u.energy<25&&(u.species==='ciliate'||u.species==='amoeba')){const prey=w.units.filter(p=>p.faction!==f&&p.alive&&compatible(u,p));prey.sort((a,b)=>dist(a,u)-dist(b,u));if(prey[0]){w.order([u.id],{type:'attack',x:prey[0].x,y:prey[0].y});continue;}}
 const intruders=w.hash.query(u.x,u.y,140).filter(o=>o.faction!==f&&o.faction<2&&compatible(u,o));
 if(intruders.length&&(u.species==='amoeba'||u.species==='ciliate')){const b=intruders[0];w.order([u.id],{type:'attack',x:b.x,y:b.y});continue;}
 if(dist(u,site)>site.radius*.65||(!u.orders.length&&w.rng.next()<.12))w.order([u.id],{type:u.species==='amoeba'||u.species==='ciliate'?'attack':'move',x:site.x+w.rng.range(-60,60),y:site.y+w.rng.range(-60,60)});
 }
}
