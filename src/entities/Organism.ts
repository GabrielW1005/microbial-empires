import type {SpeciesId,Faction} from './Species.ts';
export interface Point{x:number;y:number}
export type OrderType='move'|'attack'|'feed'|'hold';
export interface Order extends Point{type:OrderType;target?:number}
export interface Organism extends Point {
 id:number; species:SpeciesId; faction:Faction; angle:number; mass:number; energy:number; health:number; age:number;
 reproduce:boolean; division:number; born:number; orders:Order[]; path:Point[]; target:number|null; huntPath:Point[]; feeding:number; digest:number;
 think:number; wander:Point; anchor:Point; alive:boolean; moving:boolean; stress:number;
}
export interface Site extends Point{id:number;name:string;kind:'light'|'detritus'|'mineral';radius:number;owner:number;capture:number;challenger:number;contested:boolean}
export interface Obstacle extends Point{radius:number}
export interface Matrix extends Point{faction:Faction;mass:number;radius:number}
export interface Event extends Point{text:string;time:number;kind:'info'|'danger'|'good'}
export type Policy='conservation'|'sustainable'|'unrestricted';
export interface Community {policy:Policy;reserve:number;targets:Record<SpeciesId,number>;holdTime:number}
