import { readFileSync } from 'node:fs';
import { test, expect } from 'vitest';
import { Engine, STEP, LEVELS, required } from '../src/engines/alunir/engine';
import { migrationChecks, hudChecks, fingerChecks } from './alunir-regression-checks';
import gust from './fixtures/alunir-legacy-gust.json';
import { mechanicChecks, routeChecks } from './alunir-levels-checks';
import { measureAlunir, type FlightRow } from '../scripts/alunir-diversity.js';
import recordings from './fixtures/alunir-campaigns.json';
import old from './fixtures/alunir-head.json';
test('A-niv-01 effets littéraux des douze mécaniques', () => { mechanicChecks(); });
for (let level = 0; level < 30; level++) test(`A-niv-02 niveau ${String(level + 1)} : trois graines, deux modes`, () => {
    const proofs = recordings.filter(r => r.level === level); expect(proofs).toHaveLength(6);
    for (const proof of proofs) {
        const e = new Engine(); e.loadLevel(level, proof.seed); if (proof.special) expect(e.special()).toBe(true);
        for (const [bits = 0, count = 0] of proof.controls) {
            e.input({ thrust: Boolean(bits & 1), left: Boolean(bits & 2), right: Boolean(bits & 4) });
            for (let tick = 0; tick < count; tick++) e.step(STEP);
        }
        expect(e.status).toBe('won'); expect(e.state.score).toBe(proof.score); expect(e.events).toEqual(proof.events);
    }
});
test('A-niv-03 négatifs isolés à 60 %, neuf mécaniques, vedette répétée', () => {
    const base: FlightRow[] = Array.from({ length: 10 }, (_, i) => ({ star: String(i), mechanics: [String(i)], actions: [String(i)] }));
    expect(measureAlunir(base).valid).toBe(true);
    const sixty = structuredClone(base); required(sixty[0]).mechanics = ['a', 'b', 'c', 'd']; required(sixty[1]).mechanics = ['a', 'b', 'c', 'e'];
    expect(measureAlunir(sixty).maxSimilarity).toBe(0.6); expect(measureAlunir(sixty).valid).toBe(false);
    const disguised = structuredClone(base); for (const row of disguised) row.controls = [[1, 100]];
    expect(measureAlunir(disguised).valid).toBe(false); expect(measureAlunir(disguised).maxSimilarity).toBe(1);
    expect(measureAlunir(base.slice(0, 9)).valid).toBe(false);
    const repeated = structuredClone(base); required(repeated[2]).star = '0'; expect(measureAlunir(repeated).repeatedStars).toEqual([3]); expect(measureAlunir(repeated).valid).toBe(false);
});
test('A-niv-04 vrai état HEAD et continuation exacte', () => {
    const e = new Engine(); e.loadState(old.saved as Parameters<Engine['loadState']>[0]); e.step(STEP * 40);
    expect(e.snapshot()).toMatchObject(old.after);
    const copy = new Engine(); copy.loadLevel(e.level, e.seed); copy.loadState(e.snapshot()); e.step(STEP * 5); copy.step(STEP * 5); expect(copy.snapshot()).toEqual(e.snapshot());
});

test('A-niv-04b restauration après amarrage, grotte suivante et rafales historiques', () => {
    migrationChecks(old as Parameters<typeof migrationChecks>[0]);
    migrationChecks(gust as Parameters<typeof migrationChecks>[0]);
});
test('A-niv-HUD nom et idée aux pas 0, 1, 119 ; retirés à 120 et 121', () => {
    hudChecks(readFileSync('src/games/alunir/scene.ts', 'utf8'));
});
test('A-niv-03 gate des commandes réelles de la campagne', () => {
    const rows = recordings.filter(r => r.seed === 28 && !r.special).map(r => ({ star: LEVELS[r.level]?.star ?? '', mechanics: [...(LEVELS[r.level]?.mechanics ?? [])], actions: r.events, controls: r.controls }));
    expect(measureAlunir(rows).valid).toBe(true);
});

test('A-niv-doigt niveau 1 avec latence 150 ms, sans et avec spécial', () => { fingerChecks(); });

test('A-niv-05 départs, remontées, passages ordonnés et phase du geyser', () => { routeChecks(); });
