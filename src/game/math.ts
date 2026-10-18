import type {Point} from '../entities/Organism.ts';
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
export class Random {state:number; constructor(seed=81731){this.state=seed>>>0;} next(){let t=this.state+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);this.state>>>=0;return ((t^t>>>14)>>>0)/4294967296;} range(a:number,b:number){return a+(b-a)*this.next();}}
