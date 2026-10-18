import type {Community,Site} from '../entities/Organism.ts';
export function updateVictory(sites:Site[],communities:Community[],dt:number){for(let f=0;f<2;f++){const held=sites.filter(s=>s.owner===f&&!s.contested).length;communities[f].holdTime=held>=3?communities[f].holdTime+dt:0;if(communities[f].holdTime>=90)return f;}return null;}
