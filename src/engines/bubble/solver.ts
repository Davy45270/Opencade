import { Engine, center, neighbors, key, type Cell } from './engine';
// Geometry is independent of palette and reserve; bound the shared ray cache.
const rayCache = new Map<string, { angle: number; target: Cell | null }[]>();
function candidates(e: Engine, keepReserve = false) {
    const options: { angle: number; swap: boolean; score: number; engine: Engine }[] = [];
    const targets = new Set<string>();
    const shape = `${String(e.drops)}:${JSON.stringify(e.bumpers)}:${e.grid.map(key).sort().join(';')}`;
    let paths = rayCache.get(shape);
    if (!paths) {
        paths = Array.from({ length: 279 }, (_, i) => {
            const angle = (i - 139) / 100;
            return { angle, target: e.trace(angle).target };
        });
        if (rayCache.size >= 256) { const oldest = rayCache.keys().next().value; if (oldest !== undefined) rayCache.delete(oldest); }
        rayCache.set(shape, paths);
    }
    for (const swap of [false, true]) {
        for (const { angle, target } of paths) {
            if (!target) continue;
            const color = swap ? e.queued : e.next;
            const signature = `${String(target.row)}:${String(target.col)}:${String(color)}`;
            if (targets.has(signature)) continue;
            targets.add(signature);
            const trial = new Engine(e.seed, e);
            if (swap) trial.swap();
            trial.aim(angle); trial.shoot(); trial.advance(10000);
            const adjacent = neighbors(target).filter(n => e.grid.some(c => key(c) === key(n) && c.color === color && !c.kind)).length;
            let potential = 0;
            if (!trial.last.popped.length && adjacent) {
                const cells = new Map(trial.grid.map(c=>[key(c),c]));
                const group = new Set<string>();
                const queue = [{ ...target, color }];
                for (let n=0;n<queue.length;n++) {
                    const cell=queue[n];
                    if (!cell || group.has(key(cell)) || cell.color!==color || cell.kind) continue;
                    group.add(key(cell));
                    for (const neighbor of neighbors(cell)) { const next=cells.get(key(neighbor)); if(next) queue.push(next); }
                }
                const remaining = trial.grid.filter(c=>!group.has(key(c)));
                const anchored = new Set<string>();
                const roots=remaining.filter(c=>c.row===0);
                for(let n=0;n<roots.length;n++) {
                    const cell=roots[n];
                    if(!cell || anchored.has(key(cell)) || group.has(key(cell)))continue;
                    anchored.add(key(cell));
                    for(const neighbor of neighbors(cell)){const next=cells.get(key(neighbor));if(next)roots.push(next);}
                }
                potential = remaining.filter(c=>!anchored.has(key(c))).length;
            }
            const score = (trial.status === 'won' ? 100000 : trial.status === 'lost' ? -100000 : 0)
                + trial.last.popped.length * 12 + trial.last.fallen.length * 24
                + (keepReserve && swap ? 0 : potential) * 18 + adjacent * 8 - center(target).y / 100
                + trial.grid.filter(c => c.color === trial.next && c.kind !== 'stone').length / 1000;
            options.push({ angle, swap, score, engine: trial });
        }
    }
    return options.sort((a, b) => b.score - a.score);
}
export function chooseShot(e: Engine): { angle: number; swap: boolean } {
    const choice = candidates(e)[0];
    return choice ? { angle: choice.angle, swap: choice.swap } : { angle: 0, swap: false };
}
export function greedyLevel(level: number, seed = 28, limit = 160): { won: boolean; shots: number } {
    const e = new Engine(seed); e.loadLevel(level, seed);
    while (e.status === 'playing' && e.shots < limit) {
        const shot = chooseShot(e);
        if (shot.swap) e.swap();
        e.aim(shot.angle); e.shoot(); e.advance(10000);
    }
    return { won: e.status === 'won', shots: e.shots };
}

export function solveLevel(level: number, seed = 28, limit = 160, onDepth?: (depth: number) => void, beamWidth = 64, urgentInterval = 6): { won: boolean; shots: number } {
    const quick = greedyLevel(level, seed, limit);
    if (quick.won) return quick;
    const initial = new Engine(seed); initial.loadLevel(level, seed);
    // Short ceiling cadences favor preparing low pairs before clearing them.
    const urgent = initial.shotsBeforeDrop !== null && initial.shotsBeforeDrop <= urgentInterval;
    let beam = [initial];
    for (let depth = 0; depth < limit; depth++) {
        onDepth?.(depth + 1);
        const expanded = new Map<string, {engine: Engine; rank: number}>();
        for (const state of beam) for (const option of candidates(state, !urgent)) {
            const e = option.engine;
            if (e.status === 'won') return { won: true, shots: e.shots };
            if (e.status !== 'playing') continue;
            const signature = JSON.stringify([e.grid, e.next, e.queued, e.random.state]);
            const colors = new Map(e.grid.map(c => [key(c), c.color]));
            const pairs = e.grid.reduce((sum,c) => sum + neighbors(c).filter(n=>colors.get(key(n)) === c.color).length,0);
            const cost = e.grid.reduce((sum,c)=>sum+Math.exp(center(c,e.drops).y/90),0);
            const discounted = e.grid.reduce((sum,c) => {
                const adjacent = neighbors(c).filter(n=>colors.get(key(n))===c.color).length;
                return sum + Math.exp(center(c,e.drops).y/90) * (1-Math.min(0.8,adjacent*0.45));
            },0);
            const rank = urgent ? -discounted * 4 - e.grid.length * 4 : -cost * 3 - e.grid.length * 8 + pairs * 10 - Math.max(...e.grid.map(c=>center(c,e.drops).y)) / 5;
            expanded.set(signature,{engine:e,rank});
        }
        beam = [...expanded.values()].sort((a,b)=>b.rank-a.rank).slice(0,beamWidth).map(x=>x.engine);
        if (!beam.length) break;
    }
    return quick;
}
