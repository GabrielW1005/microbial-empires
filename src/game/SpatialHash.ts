import type {Organism} from '../entities/Organism.ts';
export class SpatialHash{
 cells=new Map<number,Organism[]>();size=80;
 rebuild(units:Organism[]){this.cells.clear();for(const u of units)if(u.alive){const k=Math.floor(u.y/this.size)*100+Math.floor(u.x/this.size);const a=this.cells.get(k);if(a)a.push(u);else this.cells.set(k,[u]);}}
 query(x:number,y:number,r:number){const out:Organism[]=[];const loX=Math.floor((x-r)/80),hiX=Math.floor((x+r)/80),loY=Math.floor((y-r)/80),hiY=Math.floor((y+r)/80);for(let cy=loY;cy<=hiY;cy++)for(let cx=loX;cx<=hiX;cx++){const a=this.cells.get(cy*100+cx);if(a)for(const u of a)if(u.alive&&(u.x-x)**2+(u.y-y)**2<r*r)out.push(u);}return out;}
}
