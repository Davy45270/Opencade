import { Engine, TICK, type Weapon } from '../src/engines/essaim/engine';
import { pilot } from '../src/engines/essaim/pilot';
type EngineClass = typeof Engine;
export const weaponScenarios: Record<Weapon, { level:number; formation:string; metric:'ticks'|'interceptions' }> = {
    beam:{ level:9,formation:'split',metric:'ticks' },
    bounce:{ level:3,formation:'shield',metric:'ticks' },
    drones:{ level:1,formation:'burst',metric:'interceptions' },
    slow:{ level:12,formation:'spiral',metric:'ticks' },
    magnet:{ level:6,formation:'miner',metric:'interceptions' },
    charge:{ level:24,formation:'armor',metric:'ticks' },
};
/** Paired fixed-seed scenarios: identical generated enemies, ordinary controls and
 * pilot. Supplies are removed in both arms to isolate the single measured weapon;
 * enemy positions, timers, waves and health are never altered. */
export function weaponBenchmark(kind: Weapon, E: EngineClass = Engine) {
    const scenario=weaponScenarios[kind];
    const run=(enabled:boolean) => {
        const e=new E(scenario.level,458); e.state.pickups=[];
        if (!e.state.enemies.some(p=>p.type===scenario.formation)) throw new Error('Missing generated benchmark formation');
        if(enabled) e.equip(kind);
        let ticks=0, interceptions=0;
        const limit=scenario.metric==='ticks'?18000:840;
        for(;ticks<limit && e.status==='playing' && (scenario.metric==='interceptions' || e.state.wave===1);ticks++) {
            const reflected=new Set(e.state.shots.filter(p=>p.reflected));
            pilot(e,ticks); e.step(TICK); e.state.pickups=[];
            interceptions+=e.events.filter(event=>event==='intercept').length;
            interceptions+=e.state.shots.filter(p=>p.reflected && !reflected.has(p)).length;
        }
        if(e.status==='lost' || (scenario.metric==='ticks' && e.state.wave===1)) throw new Error(`${kind} benchmark failed to neutralize generated wave`);
        return { ticks, milliseconds:ticks*TICK, interceptions, lives:e.state.lives, wave:e.state.wave };
    };
    const base=run(false), weapon=run(true);
    // Ordinary fire intercepts zero hostile shots. Report that exact zero and the
    // infinite raw ratio; also enforce a conservative finite lower bound using 1.
    const ratioLowerBound=scenario.metric==='ticks'?base.ticks/weapon.ticks:weapon.interceptions/Math.max(1,base.interceptions);
    const ratio=scenario.metric==='interceptions' && base.interceptions===0?'Infinity':ratioLowerBound;
    if (!(ratioLowerBound>=1.3)) throw new Error(`E-WPN-07 ${kind}: ratio ${String(ratioLowerBound)} < 1.3`);
    return { weapon:kind, level:scenario.level+1, seed:458, formation:scenario.formation, metric:scenario.metric, threshold:1.3, base, equipped:weapon, ratio, ratioLowerBound };
}
