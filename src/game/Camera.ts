import {clamp} from './math.ts';
import type {Point} from '../entities/Organism.ts';
export class Camera{
 x=650;y=840;zoom=.85;width=1000;height=650;
 world(p:Point){return {x:(p.x-this.width/2)/this.zoom+this.x,y:(p.y-this.height/2)/this.zoom+this.y}}
 screen(p:Point){return {x:(p.x-this.x)*this.zoom+this.width/2,y:(p.y-this.y)*this.zoom+this.height/2}}
 pan(dx:number,dy:number){this.x=clamp(this.x+dx/this.zoom,0,2600);this.y=clamp(this.y+dy/this.zoom,0,1700)}
 zoomAt(factor:number,p:Point){const before=this.world(p);this.zoom=clamp(this.zoom*factor,.3,2.4);const after=this.world(p);this.pan((before.x-after.x)*this.zoom,(before.y-after.y)*this.zoom)}
}
