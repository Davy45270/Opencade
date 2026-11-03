import assert from 'node:assert/strict';
import { bounded } from './artificiers-budget';
import { Engine, chooseShot, doseAimError, searchShot, type Shot } from '../src/engines/artificiers/engine';
import searches from './fixtures/artificiers-aim-search.json' with { type: 'json' };
export const AIM_SEEDS = [19, 37, 73, 101, 149, 220, 307, 401] as const;
export interface AccuracyRow { level: number; difficulty: 0 | 1 | 2; hits: number; attempts: number; rate: number; kills: number; totalKillTurns: number; meanTurns: number | null }
/** Same real flight/damage protocol for the CLI and regression checks. */
export function measureAccuracy(level: number, cached = false, stronger = false): AccuracyRow {
    let hits = 0, attempts = 0, kills = 0, turns = 0;
    for (const [index, seed] of AIM_SEEDS.entries()) {
        const e = new Engine(level, seed, 'duo');
        e.active = e.units.findIndex(u => u.team === 1);
        const target = e.units.find(u => u.team === 0); assert.ok(target);
        e.units = e.units.filter(u => u === target || u === e.actor);
        e.units.forEach((u, i) => { u.id = i; }); e.active = 1;
        const mask = e.terrain.mask.slice(), material = e.terrain.material.slice(), hardness = e.terrain.hardness.slice();
        let hp = 100;
        for (let turn = 0; turn < 12; turn++) {
            e.turn = turn * 2 + 1;
            e.wind = Math.round((e.random.next() * 2 - 1) * e.config.wind);
            const difficulty = stronger ? Math.min(2, e.config.ai + 1) as 0 | 1 | 2 : e.config.ai;
            let shot: Shot;
            if (cached) {
                const sample = searches[level]?.[index], frame = sample?.shots[turn]; assert.ok(sample && frame);
                assert.equal(sample.seed, seed); assert.equal(frame.turn, e.turn); assert.equal(frame.wind + 0, e.wind + 0);
                const ideal = frame.shot as Shot;
                // Revalidate one complete search on every map. The remaining
                // golden searches save work; every dosed flight/explosion runs live.
                if (!stronger && turn === 0 && index === level % AIM_SEEDS.length) assert.deepEqual(searchShot(e, false), ideal);
                shot = doseAimError(e, ideal, difficulty);
            } else shot = chooseShot(e, difficulty, false);
            const p = e.trace(shot, 400, false);
            if (p.result === 'impact') e.explode(p.x, p.y, shot.weapon);
            const damage = 100 - target.hp;
            e.terrain.mask.set(mask); e.terrain.material.set(material); e.terrain.hardness.set(hardness); e.terrain.dirty.length = 0;
            e.units.forEach(u => { u.hp = 100; u.vx = 0; u.vy = 0; });
            e.status = 'playing'; e.winner = null; e.blasts = []; e.destroyed = 0;
            attempts++; if (damage > 0) hits++; hp -= damage;
            if (hp <= 0) { kills++; turns += turn + 1; break; }
        }
    }
    return { level: level + 1, difficulty: new Engine(level).config.ai, hits, attempts, rate: 100 * hits / attempts,
        kills, totalKillTurns: turns, meanTurns: kills ? turns / kills : null };
}
export function assertTier(rows: AccuracyRow[], low: number, high: number, early = false): void {
    const hits = rows.reduce((n, r) => n + r.hits, 0), attempts = rows.reduce((n, r) => n + r.attempts, 0);
    assert.ok(hits / attempts >= low && hits / attempts <= high, `Précision du palier : ${String(100 * hits / attempts)} %`);
    if (early) {
        const kills = rows.reduce((n, r) => n + r.kills, 0), turns = rows.reduce((n, r) => n + r.totalKillTurns, 0);
        assert.ok(turns / kills >= 5 && turns / kills <= 7, 'Élimination initiale en 5 à 7 tours');
    }
}
export function aiCurve(): void {
    const measureBounded = (level: number, stronger = false): AccuracyRow => {
        let row: AccuracyRow | undefined;
        bounded(() => { row = measureAccuracy(level, true, stronger); });
        assert.ok(row); return row;
    };
    const rows = Array.from({ length: 30 }, (_, level) => measureBounded(level));
    assertTier(rows.slice(0, 7), .35, .55, true); assertTier(rows.slice(7, 16), .55, .75); assertTier(rows.slice(16), .75, .95);
    for (let i = 3; i < rows.length; i++) {
        const previous = rows.slice(i - 3, i).reduce((n, r) => n + r.rate, 0) / 3;
        const current = rows.slice(i - 2, i + 1).reduce((n, r) => n + r.rate, 0) / 3;
        assert.ok(current >= previous, `Courbe décroissante N${String(i + 1)}`);
    }
    for (let i = 1; i < rows.length; i++) {
        const current = rows[i], previous = rows[i - 1]; assert.ok(current && previous);
        assert.ok(Math.abs(current.rate - previous.rate) <= 8, 'Marche de précision supérieure à huit points');
    }
    // Actual stronger aiming on the SAME lower maps must fail their upper bound.
    for (const [start, end, low, high] of [[0, 7, .35, .55], [7, 16, .55, .75]] as const) {
        const stronger = Array.from({ length: end - start }, (_, i) => measureBounded(start + i, true));
        assert.throws(() => { assertTier(stronger, low, high); }, /Précision du palier/);
    }
}
