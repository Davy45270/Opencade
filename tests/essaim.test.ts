import { expect, test } from 'vitest';
import { behaviors } from './essaim-behavior';
import { recordings } from './essaim-recordings';
import { replay } from './essaim-replay';
import { measureDiversity } from '../scripts/diversity-metrics.js';
import { Engine, difficulty, TICK, CANNON_Y, type Enemy } from '../src/engines/essaim/engine';
function first(e: Engine): Enemy { const p = e.state.enemies[0]; if (!p) throw new Error("Ennemi absent"); return p; }
function enemy(e: Engine, phase: Enemy['phase'] = 'formation', type: Enemy['type'] = 'scout'): Enemy { return { ...first(e), x: 180, y: 400, homeX: 180, homeY: 400, phase, age: 0, type, hp: 1, captured: false, curve: 0, originX: 180, originY: 400 }; }
function prepared(level = 0): Engine { const e = new Engine(level); e.state.enemies = [enemy(e)]; e.state.wave = difficulty(level).waves; e.state.enemyTimer = e.state.diveTimer = 1e6; e.state.pickups = []; return e; }
function hit(e: Engine): void { e.state.shots.push({ x: first(e).x, y: first(e).y + 15, owner: 'player' }); e.step(TICK); }
test('G01 entrée déterministe rejoint exactement sa place', () => { const a = new Engine(), b = new Engine(); a.step(1500); b.step(1500); expect(a.snapshot()).toEqual(b.snapshot()); const p = first(a); expect(p.phase).toBe('formation'); expect(p.x).toBe(p.homeX); expect(p.y).toBe(p.homeY); });
test('G02 oscillation bornée de formation', () => { const e = prepared(); e.step(TICK); expect(first(e).x).not.toBe(180); expect(Math.abs(first(e).x - 180)).toBeLessThanOrEqual(difficulty(0).amplitude); });
test('G03 le piqué vise la position initiale puis revient en entrée', () => {
    for (const targetX of [40, 180, 320]) {
        const e = prepared();
        // Une origine haute permet de suivre toute la composante de visée avant le retour.
        first(e).y = first(e).homeY = 40;
        first(e).curve = 80;
        e.state.cannon = targetX; e.state.diveTimer = 0;
        e.step(TICK);
        expect(first(e).phase).toBe('dive');
        expect(first(e).targetX).toBe(targetX);
        e.state.diveTimer = 1e6;
        e.moveTo(targetX === 40 ? 320 : 40);
        const duration = 1000 * 560 / difficulty(0).diveSpeed;
        for (let tick = 1; tick < Math.ceil(duration / TICK); tick++) {
            e.step(TICK);
            const p = first(e), t = p.age / duration;
            expect(p.targetX).toBe(targetX);
            const aimingX = p.x - Math.sin(t * Math.PI * 2) * p.curve / 4;
            expect(aimingX).toBeCloseTo(p.originX + (targetX - p.originX) * Math.min(1, t), 8);
        }
        const p = first(e), t = p.age / duration;
        expect(p.phase).toBe('dive');
        expect(p.x - Math.sin(t * Math.PI * 2) * p.curve / 4).toBeCloseTo(targetX, 8);
        expect(e.state.cannon).not.toBe(targetX);
        e.step(1000);
        expect(first(e).phase).not.toBe('dive');
    }
});
test('G04 score formation et piqué, blindage', () => { for (const phase of ['formation', 'dive'] as const) { const e = prepared(); e.state.enemies = [enemy(e, phase)]; hit(e); expect(e.state.score).toBe(phase === 'dive' ? 30 : 10); } const e = prepared(); first(e).hp = 2; hit(e); expect(e.state.score).toBe(0); expect(first(e).hp).toBe(1); });
test('G05 trois projectiles maximum même avec double canon', () => { const e = prepared(); e.state.double = 1000; for (let i = 0; i < 8; i++) { e.state.cooldown = 0; e.fire(); } expect(e.state.shots).toHaveLength(3); e.state.cooldown = 0; expect(e.fire()).toBe(false); });
test('G06 tirs ennemis, une seconde invulnérable', () => { const e = prepared(); e.state.enemyTimer = 0; e.step(TICK); expect(e.state.shots.some(p => p.owner === 'enemy')).toBe(true); const damage = () => { e.state.shots = [{ x: e.state.cannon, y: CANNON_Y - 12, owner: 'enemy' }]; e.step(TICK); }; damage(); expect(e.state.lives).toBe(2); damage(); expect(e.state.lives).toBe(2); e.step(1000); damage(); expect(e.state.lives).toBe(1); });
test('G07 capteur libère une arme à ramasser', () => { const e = prepared(); e.state.enemies.push({ ...enemy(e), id: 99, x: 300, homeX: 300 }); first(e).captured = true; hit(e); expect(e.state.double).toBe(0); expect(e.state.pickups.map(p => p.kind)).toEqual(['beam']); e.step(1000); expect(e.has('beam')).toBe(true); });
test('G08 scindeur produit exactement deux fragments sans récursion', () => { const e = prepared(); first(e).type = 'split'; hit(e); expect(e.state.enemies).toHaveLength(2); expect(e.state.enemies.every(p => p.type === 'fragment' && p.phase === 'dive' && p.hp === 1)).toBe(true); });
test('G09 mini-boss à la dernière vague du défi', () => { const e = new Engine(4); expect(e.challenge).toBe(true); expect(e.state.boss).toBeNull(); });
test('G10 victoire après dernière vague et défaite sans vie', () => { const e = prepared(); hit(e); expect(e.status).toBe('won'); const b = prepared(); b.state.lives = 1; b.state.shots = [{ x: 180, y: CANNON_Y - 12, owner: 'enemy' }]; b.step(TICK); expect(b.status).toBe('lost'); });
test('G11 chaque paramètre croît sur trente niveaux', () => { const first = difficulty(0), last = difficulty(29); for (const key of Object.keys(first) as (keyof typeof first)[]) { expect(last[key]).toBeGreaterThan(first[key]); for (let i = 1; i < 30; i++) expect(difficulty(i)[key]).toBeGreaterThanOrEqual(difficulty(i - 1)[key]); } });
test('G12 cadence indépendante, entrées horodatées et témoin graine', () => { const a = new Engine(), b = new Engine(); for (let i = 0; i < 20; i++) { a.moveTo(i * 13); b.moveTo(i * 13); a.holdFire(true); b.holdFire(true); a.step(100); for (let j = 0; j < 6; j++) b.step(TICK); } expect(a.snapshot()).toEqual(b.snapshot()); expect(new Engine(0, 9).snapshot()).not.toEqual(new Engine().snapshot()); expect(() => JSON.stringify(a.snapshot())).not.toThrow(); });
for (const [name, run] of Object.entries(behaviors)) test(name, () => { run(Engine); });
const requiredWitnesses: [number, string][] = [[1,'burst-fan'],[2,'fast-ellipse'],[3,'frontal-block'],[6,'mine-explosion'],[9,'split-fragments'],[12,'spiral-approach'],[15,'guided-turn'],[18,'rescue-present'],[21,'mirror-tracking'],[29,'command-phase-two-fire']];
for (const [level, behavior] of requiredWitnesses) test(`E-GEN-03 ${behavior}`, () => {
    const record = recordings.find(r => r.level === level && r.seed === 28);
    if (!record) throw new Error('Missing observed recording');
    const result = replay(record);
    expect(result.status).toBe('won');
    expect(result.witnesses[behavior]).toBeDefined();
});
for (let level = 0; level < 30; level++) test(`E-DIV-01 rejeu niveau ${String(level+1)}`, () => {
    const record = recordings.find(r => r.level === level && r.seed === 28);
    if (!record) throw new Error('Missing diversity recording');
    replay(record);
});
test('E-DIV-01 campagne variée', () => {
    const records = recordings.filter(r => r.seed === 28);
    expect(records.map(r => r.level)).toEqual(Array.from({ length: 30 }, (_, i) => i));
    const result = measureDiversity(records.map(record => {
        const f = record.observation;
        return { level: record.level+1, parameters: { ...difficulty(record.level), ...f.params }, elements: f.elements.filter(name => !name.startsWith('weapon:')), layout: f.layout, observation: f };
    }));
    expect(result.noveltyCount).toBeGreaterThanOrEqual(8);
    expect(result.cloneShare).toBeLessThan(0.25);
    let previous = 1;
    for (const level of result.noveltyLevels.filter(n => n <= 25)) { expect(level-previous).toBeLessThanOrEqual(5); previous = level; }
    expect(25-previous).toBeLessThanOrEqual(5);
});
for (const seed of [458,28]) for (let level = 0; level < 30; level++) test(`E-PILOT niveau ${String(level+1)}, graine ${String(seed)}`, () => {
    const record = recordings.find(r => r.seed === seed && r.level === level);
    if (!record) throw new Error('Missing campaign recording');
    expect(replay(record).status).toBe('won');
});
test('G07 génération sans superposition et un capteur par vague', () => {
    for (let level = 0; level < 30; level++) {
        const e = new Engine(level,28), cells = new Set<string>();
        expect(e.state.enemies.filter(p => p.captured)).toHaveLength(1);
        for (const p of e.state.enemies) { expect(p.homeX).toBeGreaterThan(30); expect(p.homeX).toBeLessThan(330); cells.add(`${String(p.homeX)},${String(p.homeY)}`); }
        expect(cells.size).toBe(e.state.enemies.length);
    }
});
