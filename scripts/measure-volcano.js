/* global process, console */
import { writeFileSync } from 'node:fs';
process.argv.push('--harness-only');
const {sceneFingerRun}=await import('./derapage-mobile-scene.js');
process.argv.pop();
const {circuits,legacyCircuits}=await import('../src/engines/derapage/circuits.ts');
const {Engine}=await import('../src/engines/derapage/engine.ts');
const {physics}=await import('../src/engines/derapage/physics.ts');
const {at,nearest,wrap,inKartHole}=await import('../src/engines/derapage/track.ts');
function bypassProbes() {
    const e=new Engine(26),t=e.track,ramp=t.circuit.jumps[0],gap=t.circuit.gap[0],rows=[];
    for(const speed of [0,6,12,15,24,32]) for(const side of [-1,0,1]) for(const index of side===0 ? [ramp] : [ramp,gap]) {
        const a=t.points[index],b=t.points[index+1],length=Math.hypot(b.x-a.x,b.y-a.y),u=index===ramp ? .7 : .3;
        const angle=Math.atan2(b.y-a.y,b.x-a.x),offset=side*t.widths[index]*.43;
        const k={...e.karts[0],x:a.x+(b.x-a.x)*u-(b.y-a.y)/length*offset,y:a.y+(b.y-a.y)*u+(b.x-a.x)/length*offset,angle,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed};
        const row={speed,side,index,launches:0,bypassSide:undefined,route:[],reverseMs:0,maxReverseMs:0,groundHoleFrames:0,steps:0};
        let reverse=0,used=false,launched=false;
        for(let frame=0;frame<600;frame++) {
            const n=nearest(t,k),target=at(t,n.along+8),before=k.bypassIndex,jump=k.jumpMs;
            physics(k,{steer:0,drift:false,bonus:false,mode:'joystick',heading:Math.atan2(target.y-k.y,target.x-k.x)},t,1/60,.43);
            used ||= k.bypassIndex!==undefined;launched ||= k.jumpMs>0;
            if(jump===0 && k.jumpMs>0) row.launches++;
            if(k.bypassIndex!==before) row.route.push({frame,target:k.bypassIndex??null,entry:k.bypassEntry,section:nearest(t,k).index});
            if(k.bypassSide!==undefined) row.bypassSide=k.bypassSide;
            const section=nearest(t,k),backwards=Math.abs(wrap(k.angle-Math.atan2(-section.nx,section.ny)))>Math.PI/2;
            reverse=backwards ? reverse+1000/60 : 0;
            row.reverseMs+=backwards ? 1000/60 : 0;row.maxReverseMs=Math.max(row.maxReverseMs,reverse);
            row.groundHoleFrames+=Number(k.jumpMs===0 && inKartHole(t,k));row.steps++;
            if((used||launched) && k.bypassIndex===undefined && section.index>gap) break;
        }
        rows.push(row);
    }
    return rows;
}
const original=circuits[26];
// Frozen starting layout; the mechanics and pilot are the current real engine.
if(process.argv.includes('--before')) circuits[26]={...original,controls:legacyCircuits[26].controls,jumps:[40],gap:[41],forwardRails:false,jumpLanes:false,bypassEntryInset:undefined};
const rows=[];
try {
    if(process.argv.includes('--routes')) {rows.push(...bypassProbes());console.log(JSON.stringify(rows));}
    else for(const fps of [11,12,13,15,20]) {
        const row=await sceneFingerRun(26,'play',150,72,3251,400,fps);rows.push(row);
        console.log(JSON.stringify(row));
    }
} finally {circuits[26]=original;}
if(process.argv.includes('--save')) writeFileSync(process.argv[process.argv.indexOf('--save')+1],JSON.stringify(rows,null,2)+'\n');
