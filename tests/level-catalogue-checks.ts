import assert from 'node:assert/strict';
import { Engine as Runner, DT } from '../src/engines/ferraille/engine';
import { Engine as Bricks } from '../src/engines/briqueterie/engine';
import { Engine as Swarm, LEVELS as swarmLevels } from '../src/engines/essaim/engine';
import { levelCatalogue } from '../src/content/level-catalogue';
import { records } from './level-catalogue-ferraille-recordings';
import { replay as runnerReplay } from './level-catalogue-ferraille-replay';
import { solutions } from './briqueterie-solutions';
import { replay as bricksReplay } from './briqueterie-replay';
import { recordings } from './essaim-recordings';
import { replay as swarmReplay } from './essaim-replay';

export function catalogue(code: string): void {
    const entry = levelCatalogue.find(e => e.code === code); assert(entry);
    if (entry.game === 'ferraille') {
        const e = new Runner(); e.loadLevel(entry.index, 28);
        if (code === 'R01') { assert(e.state.enemies.some(e => e.kind === 'turret')); assert(e.state.platforms.length > 0); }
        if (code === 'R02') {
            const lift = e.state.platforms.find(p => p.originY !== undefined); assert(lift);
            assert(e.state.bonuses.some(b => b.y < 150));
            // Real rider, gravity and collision; the optional route must carry the actor.
            e.state.hero.x = lift.x + 12; e.state.hero.y = lift.y - e.state.hero.h; e.state.hero.vy = 0;
            const initial = lift.y; e.step(DT);
            assert.notEqual(lift.y, initial); assert.equal(e.state.hero.y + e.state.hero.h, lift.y);
        }
        if (code === 'R03') {
            const belt = e.state.modules?.find(m => m.kind === 'conveyor' && !m.preview); assert(belt); assert(e.state.enemies.some(e => e.kind === 'armored'));
            e.state.hero.x = belt.x + 10; e.state.hero.y = belt.y - e.state.hero.h;
            const x = e.state.hero.x; e.input({ x: 0 }); e.step(DT); assert(e.state.hero.x > x);
        }
        const band = records.filter(r => r.level === entry.index); assert.equal(band.length, 2);
        for (const record of band) runnerReplay(record);
    } else if (entry.game === 'briqueterie') {
        const e = new Bricks(entry.index, 28);
        if (code === 'A01') assert(e.state.bricks.length > 20);
        if (code === 'A02') { assert(e.state.bricks.some(b => b.kind === 'moving')); assert(e.state.bricks.some(b => b.kind === 'angle')); }
        if (code === 'A03') { assert(e.state.bricks.some(b => b.kind === 'portal')); assert(e.state.bricks.some(b => b.solid)); }
        const band = solutions.filter(r => r.level === entry.index + 1); assert.equal(band.length, 2);
        for (const record of band) assert.equal(bricksReplay(record).engine.status, 'won');
    } else {
        const e = new Swarm(entry.index, 28), level = swarmLevels[entry.index]; assert(level);
        if (code === 'G01') assert(level.formations.includes('miner'));
        if (code === 'G02') { assert(level.formations.includes('fast')); assert(level.formations.includes('burst')); }
        if (code === 'G03') { assert.equal(level.layout, 'ring'); assert(level.boss > 0);
            const radii = new Set(e.state.enemies.map(enemy => Math.round(Math.hypot((enemy.homeX - 180) / 115, (enemy.homeY - 180) / 80) * 100)));
            assert.deepEqual([...radii].sort(), [72, 100].sort()); }
        assert.equal(e.status, 'playing');
        const band = recordings.filter(r => r.level === entry.index); assert.equal(band.length, 2);
        for (const record of band) {
            const phases = new Set<number>();
            assert.equal(swarmReplay(record, Swarm, engine => {
                if (engine.state.boss) phases.add(engine.state.boss.phase);
            }).status, 'won');
            if (code === 'G03') assert.deepEqual([...phases], [1, 2], 'G03 must transform during both complete winning replays');
        }
    }
}
