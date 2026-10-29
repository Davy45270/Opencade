import './ts-loader.js';
/* global console */
const { Engine } = await import('../src/engines/derapage/engine.ts');
const { controller, aiInput, aiSpeed } = await import('../src/engines/derapage/ai.ts');
const { physics } = await import('../src/engines/derapage/physics.ts');
const { checkpoint } = await import('../src/engines/derapage/race.ts');
const { validateTrack, difficulty, nearest } = await import('../src/engines/derapage/track.ts');
const { Random } = await import('../src/engines/shared/random.ts');
export function measure(level, ai = false) {
    const e = new Engine(level, 28), k = e.karts[0], r = new Random(28); let error = 0, frames = 0, grass = 0;
    for (; frames < 18000 && k.lap < 3; frames++) {
        const previous = { x: k.x, y: k.y };
        const input = ai ? aiInput(k, e.track, level, r.next() * 2 - 1) : controller(k, e.track);
        physics(k, input, e.track, 1 / 60, difficulty(level).grassGrip, ai ? aiSpeed(k, e.track, level) : 24);
        checkpoint(k, previous, e.track, (frames + 1) * 1000 / 60);
        const n = nearest(e.track, k);
        if (n.distance > e.track.widths[n.index] / 2) grass++;
        error += nearest({ ...e.track, points: e.track.racingLine }, k).distance;
    }
    if (k.lap !== 3) throw new Error(`Z13 circuit ${String(level + 1)} bloqué`);
    if (ai && [0, 14, 29].includes(level) && grass / frames > .05) throw new Error("Z24 herbe IA");
    return { grass: grass / frames * 100, treeHits: k.treeHits ?? 0, lap: frames / 180, error: error / frames };
}
console.log('| Niveau | Longueur | Largeur min. | Virages | Tour pilote (s) | Tour IA (s) | Écart IA | Herbe IA (%) | Bandes | Arbres | Chocs arbres pilote |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (let level = 0; level < 30; level++) {
    const e = new Engine(level, 28);
    if (!validateTrack(e.track)) throw new Error('Z12 circuit invalide');
    const pilot = measure(level), ai = measure(level, true);
    let turns = 0;
    for (let i = 0; i < 96; i++) {
        const a = e.track.points[(i + 95) % 96], b = e.track.points[i], c = e.track.points[(i + 1) % 96];
        const angle = Math.atan2((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x), (b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y));
        if (Math.abs(angle) > .06) turns++;
    }
    console.log(`| ${String(level + 1)} | ${e.track.length.toFixed(1)} | ${Math.min(...e.track.widths).toFixed(2)} | ${String(turns)} | ${pilot.lap.toFixed(2)} | ${ai.lap.toFixed(2)} | ${ai.error.toFixed(3)} | ${ai.grass.toFixed(2)} | ${e.track.boosts.length} | ${e.track.trees.length} | ${pilot.treeHits} |`);
}

// Also drive ordinary six-kart races at both endpoints (items and collisions active).
for (const level of [0, 29]) {
    const e = new Engine(level, 28);
    for (let frame = 0; frame < 10800 && e.status === 'playing'; frame++) {
        e.input(controller(e.karts[0], e.track)); e.step(1000 / 60);
    }
    if (e.status !== 'won' || e.karts[0].lap !== 3) throw new Error('Course complète non terminée sur le podium');
}
