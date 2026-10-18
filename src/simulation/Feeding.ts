import {SPECIES} from '../entities/Species.ts';
import type {Organism,Community} from '../entities/Organism.ts';
export function compatible(a:Organism,b:Organism){return a.alive&&b.alive&&a.id!==b.id&&SPECIES[a.species].prey.includes(b.species)&&b.mass<a.mass*.95;}
export function canFeed(a:Organism,b:Organism,community:Community,count:number){if(!compatible(a,b))return false;if(a.faction!==b.faction)return true;if(community.policy==='conservation')return false;if(community.policy==='unrestricted')return true;const reserve=b.species==='alga'?Math.ceil(community.reserve*.65):b.species==='ciliate'?Math.ceil(community.reserve*.25):community.reserve;return count>reserve;}
