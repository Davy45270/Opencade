import { Engine, difficulty, TICK, type Shot } from '../src/engines/essaim/engine';
import { pilot } from '../src/engines/essaim/pilot';
import { observeEssaim } from '../scripts/essaim-diversity.js';
type EngineClass = typeof Engine;
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
function tick(e: Engine): void { e.step(TICK); }
function until(e: Engine, predicate: () => boolean, limit = 18000): number {
    let f = 0;
    for (; f < limit && e.status === 'playing' && !predicate(); f++) { pilot(e, f); tick(e); }
    check(predicate(), `generated level ${String(e.level+1)}: missing observation after ${String(f)} frames (${e.status})`);
    return f;
}
export const generatedBehaviors: Record<string, (E: EngineClass) => void> = {
    'E-GEN-01 all six bosses actually spawn on the last wave': E => {
        for (const seed of [458,28]) for (const level of [4,9,14,19,24,29]) {
            const e = new E(level,seed);
            check(!e.state.boss, 'no boss on first wave');
            until(e, () => e.state.boss !== null);
            check(e.state.wave === difficulty(level).waves, 'boss on final generated wave');
            const boss=e.snapshot().boss; check(boss,'generated guardian snapshot');
            check(boss.pattern === (level+1)/5, 'correct guardian');
            check(boss.hp === (level === 29 ? 24 : 10), 'generated boss health');
        }
    },
    'E-GEN-02 pilot encounters generated rescue ship': E => {
        for (const seed of [458,28]) {
            const e = new E(18,seed); let seen = false;
            for (let f = 0; f < 180 && e.status === 'playing'; f++) {
                pilot(e,f); tick(e);
                if (e.state.rescue && e.state.enemies.some(p => p.phase === 'formation')) seen = true;
            }
            check(seen, 'rescue remains present with arrived generated enemies');
        }
    },
    'E-GEN-03 diversity witnesses come from simulated behavior': E => {
        const required: [number,string][] = [[1,'burst-fan'],[2,'fast-ellipse'],[3,'frontal-block'],[6,'mine-explosion'],[9,'split-fragments'],[12,'spiral-approach'],[15,'guided-turn'],[18,'rescue-present'],[21,'mirror-tracking'],[29,'command-phase-two-fire']];
        for (const [level,behavior] of required) {
            const result = observeEssaim(new E(level,28));
            check(result.status === 'won', 'observation follows full generated attempt');
            check(result.witnesses[behavior], `E-DIV-01 missing observed ${behavior}`);
        }
    },
    'E-GEN-04 fast ellipse and three-shot burst fan': E => {
        const fast = new E(2,458);
        fast.holdFire(false);
        let samples = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let f = 0; f < 180; f++) {
            tick(fast);
            const e = fast.state.enemies.find(p => p.type === 'fast' && p.phase === 'formation');
            if (!e) continue;
            check(Math.abs(e.x-e.homeX-Math.sin(e.age/180)*42) < 1e-6, 'fast horizontal trajectory');
            check(Math.abs(e.y-e.homeY-Math.cos(e.age/300)*24) < 1e-6, 'fast vertical trajectory');
            minX=Math.min(minX,e.x); maxX=Math.max(maxX,e.x); minY=Math.min(minY,e.y); maxY=Math.max(maxY,e.y); samples++;
        }
        check(samples > 40 && maxX-minX > 60 && maxY-minY > 25, 'observed two-axis ellipse amplitude');
        const burst = new E(1,458); let fan: Shot[] = [];
        for (let f = 0; f < 180 && !fan.length; f++) {
            const old = new Set(burst.state.shots); tick(burst);
            const fresh = burst.state.shots.filter(p => !old.has(p) && p.vy === 150);
            if (fresh.length >= 3) fan = fresh.slice(0,3);
        }
        check(fan.length === 3, 'generated burst fires');
        check(fan.map(p=>p.vx).join(',') === '-45,0,45', 'symmetric fan velocities');
        const positions = fan.map(p=>p.x); const y = fan[0]?.y;
        check(fan.every(p=>p.y === y), 'fan launched at common height');
        for (let f=0; f<12; f++) tick(burst);
        check(fan.every((p,i)=>Math.abs(p.x-(positions[i] ?? 0)-(p.vx ?? 0)*12/60) < 1e-6), 'fan actually spreads');
        check((fan[2]?.x ?? 0)-(fan[0]?.x ?? 0) > 18, 'diverging fan width');
    },
    'E-GEN-05 guidance follows moved player then freezes at y300': E => {
        const e = new E(15,458); e.moveTo(20); let shot: Shot | undefined;
        for (let f=0; f<240 && !shot; f++) { tick(e); shot=e.state.shots.find(p=>p.seeking && p.y<250); }
        check(shot, 'generated carried turret launches');
        const initial = shot.vx ?? 0; e.moveTo(340);
        for (let f=0; f<55; f++) {
            const x=shot.x, y=shot.y; tick(e);
            if (y < 300) check(Math.abs((shot.vx ?? 0)-Math.max(-110,Math.min(110,(e.state.cannon-x)*0.8))) < 1e-6, 'steering recomputed toward moved player');
        }
        check((shot.vx ?? 0) > initial+30, 'effective turn after player displacement');
        while (shot.y < 300 && e.status === 'playing') tick(e);
        check(shot.y >= 300 && e.state.shots.includes(shot), 'guided shot reaches cutoff');
        const vx=shot.vx, x=shot.x; e.moveTo(20);
        for (let f=0; f<30; f++) tick(e);
        check(shot.vx === vx && Math.abs(shot.x-x-(vx ?? 0)*30/60)<1e-6, 'velocity frozen beyond y300 despite player move');
    },
    'E-GEN-06 normal fire survives charging and short tap': E => {
        const e = new E(24,458);
        until(e,()=>e.has('charge'));
        e.holdFire(false);
        for (let f=0; f<100 && e.state.shots.some(p=>p.owner==='player'); f++) tick(e);
        check(!e.state.shots.some(p=>p.owner==='player'),'prior ordinary volley has cleared');
        // A fresh press must emit ordinary shots while the charge gauge is growing.
        const fired=e.state.fired; e.holdFire(true);
        for (let f=0; f<15; f++) tick(e);
        check(e.state.fired > fired && e.state.shots.some(p=>p.owner==='player' && p.radius===undefined), 'normal fire during sub300ms charge');
        const ordinary=e.state.shots.filter(p=>p.owner==='player' && p.radius===undefined), before=e.state.fired;
        e.holdFire(false);
        check(e.state.fired === before && ordinary.every(p=>e.state.shots.includes(p)), 'short release preserves normal shots without charged shot');
        e.holdFire(true); const start=e.state.fired;
        for (let f=0; f<90; f++) tick(e);
        check(e.state.fired > start, 'normal fire continues through full charge');
        e.holdFire(false);
        check(e.state.shots.some(p=>p.radius===18 && p.pierce===5), 'full charge released alongside ordinary fire');
    },
    'E-GEN-07 generated command phase two cadence and aim': E => {
        const e=new E(29,458);
        until(e,()=>e.state.boss?.phase===2);
        const boss=e.state.boss; check(boss, 'generated command'); e.holdFire(false);
        const launches: { tick:number; vx:number; cannon:number }[]=[];
        for (let f=0; f<190 && e.status==='playing' && e.state.boss===boss; f++) {
            e.moveTo(f<95 ? 20 : 340);
            const old=new Set(e.state.shots); tick(e);
            for (const p of e.state.shots.filter(p=>!old.has(p) && p.owner==='enemy' && p.vy===160 && Math.abs(p.y-boss.y-20-160/60)<1e-6 && Math.abs(p.x-boss.x-(p.vx ?? 0)/60)<1e-6)) {
                check(Math.abs((p.vx ?? 0)-(e.state.cannon-boss.x)*0.5)<1e-6, 'phase two aims at current player');
                launches.push({ tick:e.state.ticks, vx:p.vx ?? 0, cannon:e.state.cannon });
            }
        }
        check(launches.length >= 3, 'observed at least three phase two shots');
        for(let i=1;i<launches.length;i++) check((launches[i]?.tick ?? 0)-(launches[i-1]?.tick ?? 0)===45, 'phase two cadence exactly45 frames');
        check(launches.some(p=>p.vx<0) && launches.some(p=>p.vx>0), 'aim follows displacement to both sides');
    },
    'E-GEN-08 generated rescue damage loss and per-hp reward': E => {
        // Let actual generated bursts hit the ally; no injected ship or projectiles.
        const lost=new E(18,458); lost.moveTo(20); let damage=0, loss=false;
        for(let f=0;f<3000 && lost.status==='playing' && !loss;f++) {
            const hp=lost.state.rescue?.hp, lives=lost.state.lives; tick(lost);
            if(hp !== undefined && lost.state.rescue && lost.state.rescue.hp<hp) { damage++; check(lost.state.lives===lives,'ally absorbs nonfatal impact'); }
            if(lost.events.includes('rescue-lost')) { loss=true; check(lost.state.lives===lives-1,'fatal ally impact costs one life'); }
        }
        check(damage===3 && loss,'all four naturally generated rescue impacts');
        const rewards=new Set<number>();
        for(const seed of [458,28]) {
            const e=new E(18,seed);
            for(let f=0; f<18000 && e.status==='playing'; f++) {
                const hp=e.state.rescue?.hp, score=e.state.score;
                const enemies=new Map(e.state.enemies.map(p=>[p.id,p.phase]));
                pilot(e,f); tick(e);
                if(e.events.includes('rescue')) {
                    check(hp !== undefined,'generated ally before rescue');
                    const kills=[...enemies].filter(([id])=>!e.state.enemies.some(p=>p.id===id)).reduce((n,[,phase])=>n+(phase==='dive'?30:10),0);
                    check(e.state.score-score-kills===hp*50,'reward exactly50 per surviving hp'); rewards.add(hp);
                }
            }
            check(e.status==='won','rescue campaign completes');
        }
        check(rewards.has(3) && rewards.has(4),'observed different rewards for three and four surviving hp');
    },
    'E-P2 rescue penalty ignores invulnerability including final life': E => {
        for(const lives of [1,3]) {
            const e=new E(18,458); check(e.state.rescue,'generated rescue');
            e.state.rescue.hp=1; e.state.invulnerable=1000; e.state.lives=lives;
            e.state.shots=[{ x:180,y:450,owner:'enemy',vy:600 }]; tick(e);
            check(e.snapshot().rescue === null && e.events.includes('rescue-lost'),'rescue destroyed');
            check(e.state.lives===lives-1 && e.events.includes('life'),'penalty through invulnerability');
            check(e.status===(lives===1?'lost':'playing'),'fatal rescue loss ends game');
        }
    },
    'E-SHIELD geometry independent of projectile flags and orientation': E => {
        for(const facing of [Math.PI/2,0,Math.PI]) for(const flags of [{},{ bounces:2 },{ bounces:1 },{ bounces:0 },{ radius:18,pierce:5 },{ reflected:true }]) for(const side of ['front','side','rear']) {
            const e=new E(3,458), target=e.state.enemies.find(p=>p.type==='shield'); check(target,'generated escort');
            Object.assign(target,{ x:180,y:200,homeX:180,homeY:200,phase:'formation',age:0,clock:0,facing });
            const angle=facing+(side==='front'?Math.PI:side==='side'?Math.PI/2:0), vx=Math.cos(angle)*600, vy=Math.sin(angle)*600;
            e.state.shots=[{ x:180-vx/60,y:200-vy/60,owner:'player',vx,vy,...flags }]; tick(e);
            check(e.state.enemies.includes(target)===(side==='front'),`${side} impact facing ${String(facing)} flags ${JSON.stringify(flags)}`);
        }
    },
};
