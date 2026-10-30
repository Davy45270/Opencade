import { measureDiversity } from './diversity-metrics.js';
const { pilot } = await import('../src/engines/essaim/pilot.ts');
const TICK = 1000 / 60;
/** Only facts visible in this state; no level-plan declarations. */
export function essaimFeatures(engine) {
    const s = engine.state, elements = new Set();
    if (s.shots.some(p => p.owner === 'player')) elements.add('shoot');
    for (const pickup of s.weapons) elements.add(`weapon:${pickup.kind}`);
    if (s.rescue) elements.add('rescue-present');
    const layout = s.enemies.map(e => `${e.homeX},${e.homeY}:${e.type}`);
    return { elements: [...elements].sort(), layout, params: { layoutCells: layout.length } };
}
/** Full generated attempt, controlled exclusively through the public pilot inputs.
 * Witnesses require motion, collisions or emitted shots, rather than enemy labels. */
export function observeEssaim(engine, limit = 18000) {
    const elements = new Set(), witnesses = {}, layout = essaimFeatures(engine).layout;
    const see = (name, frame, evidence) => { elements.add(name); witnesses[name] ??= { frame, ...evidence }; };
    let frame = 0;
    for (; frame < limit && engine.status === 'playing'; frame++) {
        const s = engine.state;
        const enemies = new Map(s.enemies.map(e => [e.id, { ...e }]));
        const shots = new Set(s.shots), oldShots = s.shots.map(p => ({ ref: p, ...p }));
        const boss = s.boss ? { ...s.boss } : null;
        pilot(engine, frame); engine.step(TICK);
        const fresh = s.shots.filter(p => !shots.has(p) && p.owner === 'enemy');
        for (const p of s.weapons) see(`weapon:${p.kind}`, frame, { remaining: p.remaining });
        if (engine.events.includes('fire')) see('shoot', frame, { fired: s.fired });
        if (s.rescue) see('rescue-present', frame, { wave: s.wave, hp: s.rescue.hp });
        if (engine.events.includes('rescue')) see('rescue-saved', frame, { score: s.score });
        if (engine.events.includes('rescue-lost')) see('rescue-lost', frame, { lives: s.lives });
        for (const e of s.enemies) {
            const old = enemies.get(e.id);
            if (!old) { if (e.type === 'fragment') see('split-fragments', frame, { id: e.id, x: e.x, y: e.y }); continue; }
            if (e.phase !== 'formation' || old.phase !== 'formation') continue;
            if (e.type === 'fast' && Math.abs(e.y-old.y) > 0.1 && Math.abs(e.x-old.x) > 0.1) see('fast-ellipse', frame, { dx: e.x-old.x, dy: e.y-old.y });
            if (e.type === 'spiral' && e.y > old.y && Math.abs(e.x-old.x) > 0.1) see('spiral-approach', frame, { dx:e.x-old.x, dy:e.y-old.y });
            if (e.type === 'mirror' && Math.abs(e.x-old.x) > 0.1 && Math.abs(e.x-Math.max(20,Math.min(340,e.homeX+(s.cannon-180)*0.65))) < 1e-6) see('mirror-tracking', frame, { x:e.x, cannon:s.cannon });
            if (e.type === 'shield' && engine.events.includes('armor') && old.hp === e.hp) see('frontal-block', frame, { id:e.id, hp:e.hp });
        }
        if (fresh.filter(p => p.vy === 150 && [-45,0,45].includes(p.vx)).length >= 3) see('burst-fan', frame, { velocities:fresh.map(p=>[p.vx,p.vy]) });
        if (fresh.some(p => p.mine !== undefined)) see('mine-laid', frame, { y:fresh.find(p=>p.mine !== undefined).y });
        if (fresh.filter(p => p.vy === 170 && [-100,0,100].includes(p.vx)).length >= 3) see('mine-explosion', frame, { count:fresh.length });
        if (oldShots.some(p => p.seeking && p.y < 300 && p.ref.owner === 'enemy' && p.ref.vx !== p.vx)) see('guided-turn', frame, { cannon:s.cannon });
        if (boss && s.boss) {
            const launched = fresh.filter(p => Math.abs(p.y-(boss.y+20+((p.vy ?? 0)/60))) < 1e-6);
            const vx = launched.map(p => p.vx).sort((a,b)=>a-b).join(',');
            const aimed = launched.some(p => p.vy === 160 && Math.abs(p.vx-(s.cannon-s.boss.x)*0.5)<1e-6);
            const motif = vx === '-90,90' ? 1 : launched.some(p=>p.mine !== undefined && p.vy===45) ? 2 : aimed && boss.phase===1 ? 3 : launched.some(p=>p.turnY===300) ? 4 : launched.some(p=>p.seeking && p.vy===180) ? 5 : vx === '-80,80' ? 6 : 0;
            if (motif) see(`guardian:${motif}`, frame, { phase:boss.phase, velocities:launched.map(p=>[p.vx,p.vy]) });
            if (boss.phase === 2 && aimed) see('command-phase-two-fire', frame, { vx:launched[0].vx, cannon:s.cannon });
        }
    }
    return { elements:[...elements].sort(), layout, params:{ layoutCells:layout.length }, witnesses, frames:frame, status:engine.status };
}
export function essaimDiversity(Engine, difficulty) {
    return measureDiversity(Array.from({ length: 30 }, (_, level) => {
        const f = observeEssaim(new Engine(level, 28));
        return { level: level+1, parameters: { ...difficulty(level), ...f.params }, elements: f.elements.filter(name => !name.startsWith('weapon:')), layout: f.layout, observation:f };
    }));
}
