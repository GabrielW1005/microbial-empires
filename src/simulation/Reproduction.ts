import {SPECIES} from '../entities/Species.ts';
import type {Organism} from '../entities/Organism.ts';
export function divisionReady(u:Organism){const s=SPECIES[u.species];return u.reproduce&&u.mass>=s.mass*1.94&&u.energy>40&&u.age>s.cycle&&u.digest===0;}
export function partition(parent:Organism,id:number,time:number):Organism{
 parent.mass/=2;parent.energy/=2;parent.age=0;parent.division=0;parent.born=time;
 return {...parent,id,orders:parent.orders.map(o=>({...o})),path:parent.path.map(p=>({...p})),target:null,huntPath:[],feeding:0,wander:{...parent.wander},anchor:{...parent.anchor},born:time};
}
