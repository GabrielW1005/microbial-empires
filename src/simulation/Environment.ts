import {clamp} from '../game/math.ts';
import type {Site} from '../entities/Organism.ts';
export interface Tile{carbon:number;mineral:number;doc:number;detritus:number;oxygen:number;light:number}
export class Environment{
 width=26;height=17;size=100;tiles:Tile[]=[];
 constructor(sites:Site[]){for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){
 const px=x*100+50,py=y*100+50;let light=.35+.5*Math.max(0,1-Math.abs(py-540)/1200),doc=8,detritus=12,mineral=32;
 for(const s of sites){const f=Math.max(0,1-Math.hypot(px-s.x,py-s.y)/300);if(s.kind==='light')light+=f*.5;if(s.kind==='detritus'){detritus+=f*180;doc+=f*35;}if(s.kind==='mineral')mineral+=f*80;}
 this.tiles.push({carbon:180,mineral,doc,detritus,oxygen:clamp(.45+light*.4,0,1),light:clamp(light,0,1)});
 }}
 index(x:number,y:number){return clamp(Math.floor(y/100),0,16)*26+clamp(Math.floor(x/100),0,25)}
 at(x:number,y:number){return this.tiles[this.index(x,y)]}
 returnMineral(t:Tile,mass:number){t.carbon+=mass*.8;t.mineral+=mass*.2;}
 update(dt:number){
 const changes=this.tiles.map(()=>({carbon:0,mineral:0,doc:0,oxygen:0}));
 for(let i=0;i<this.tiles.length;i++){
 const t=this.tiles[i];for(const j of [i%26<25?i+1:-1,i<416?i+26:-1])if(j>=0){for(const k of ['carbon','mineral','doc','oxygen'] as const){const flow=(t[k]-this.tiles[j][k])*.018*dt;changes[i][k]-=flow;changes[j][k]+=flow;}}
 }
 this.tiles.forEach((t,i)=>{for(const k of ['carbon','mineral','doc','oxygen'] as const)t[k]+=changes[i][k];t.oxygen=clamp(t.oxygen+(.8-t.oxygen)*.008*dt,0,1);});
 }
 matter(){return this.tiles.reduce((v,t)=>v+t.carbon+t.mineral+t.doc+t.detritus,0)}
}
