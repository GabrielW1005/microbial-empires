import type {Point,Obstacle} from '../entities/Organism.ts';
import {clamp,dist} from '../game/math.ts';
export class Navigation{
 obstacles:Obstacle[];width=41;height=27;cell=64;cache=new Map<string,Point[]|null>();
 constructor(obstacles:Obstacle[]){this.obstacles=obstacles;}
 clear(p:Point,r=25){return p.x>=r&&p.x<=2600-r&&p.y>=r&&p.y<=1700-r&&!this.obstacles.some(o=>dist(o,p)<o.radius+r)}
 project(p:Point,r=26){let q={x:clamp(p.x,r,2600-r),y:clamp(p.y,r,1700-r)};for(let k=0;k<3;k++)for(const o of this.obstacles){const d=dist(q,o);if(d<o.radius+r){const a=Math.atan2(q.y-o.y,q.x-o.x);q={x:o.x+Math.cos(a)*(o.radius+r+1),y:o.y+Math.sin(a)*(o.radius+r+1)};}}return q;}
 line(a:Point,b:Point,r=26){return !this.obstacles.some(o=>{const dx=b.x-a.x,dy=b.y-a.y;const t=clamp(((o.x-a.x)*dx+(o.y-a.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(a.x+dx*t-o.x,a.y+dy*t-o.y)<o.radius+r});}
 center(i:number){return{x:i%41*64+32,y:Math.floor(i/41)*64+32};}
 nearest(p:Point){const ix=clamp(Math.floor(p.x/64),0,40),iy=clamp(Math.floor(p.y/64),0,26);let best=-1,distance=Infinity;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const x=ix+dx,y=iy+dy;if(x<0||x>=41||y<0||y>=27)continue;const i=y*41+x,c=this.center(i),d=dist(c,p);if(d<distance&&this.clear(c)&&this.line(p,c)){best=i;distance=d;}}return best;}
 find(from:Point,to:Point):Point[]{const goal=this.project(to),origin=this.project(from);if(this.line(origin,goal))return dist(from,origin)>1?[origin,goal]:[goal];
 const start=this.nearest(origin),end=this.nearest(goal);if(start<0||end<0)return [];
 const key=start+':'+end;const cached=this.cache.get(key);if(this.cache.has(key))return cached?[origin,...cached.map(p=>({...p})),goal]:[];
 const open=[start],g=new Map([[start,0]]),prev=new Map<number,number>();let final=-1;
 for(let n=0;open.length&&n<1200;n++){open.sort((a,b)=>(g.get(b)!+dist(this.center(b),this.center(end)))-(g.get(a)!+dist(this.center(a),this.center(end))));const i=open.pop()!;if(i===end){final=i;break;}const p=this.center(i);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[-1,1],[1,-1]]){const x=i%41+dx,y=Math.floor(i/41)+dy,j=y*41+x;if(x<0||x>=41||y<0||y>=27)continue;const q=this.center(j);if(!this.clear(q)||!this.line(p,q))continue;const score=g.get(i)!+Math.hypot(dx,dy)*64;if(score<(g.get(j)??Infinity)){prev.set(j,i);g.set(j,score);if(!open.includes(j))open.push(j);}}}
 if(this.cache.size>800)this.cache.clear();if(final<0){this.cache.set(key,null);return [];}
 const path:Point[]=[];let i=end;while(i!==start){path.unshift(this.center(i));i=prev.get(i)!;}path.unshift(this.center(start));this.cache.set(key,path);return [origin,...path,goal];
 }
}
