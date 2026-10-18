import type {Point} from '../rts/model.ts';
export const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);
