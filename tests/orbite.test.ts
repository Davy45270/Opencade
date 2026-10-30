import { test, expect } from 'vitest';
import { Engine, difficulty, shields, TICK, SHIELD_Y, CANNON_Y, type Probe, type State } from '../src/engines/orbite/engine';
const probe = (x = 180, y = 200, row = 0, column = 0, hp = 1): Probe => ({ id: column * 10 + row, x, y, row, column, hp });
function position(e: Engine, probes = [probe()]): State {
    return { ...e.state, swarm: false, asteroids: [], wells: [], satellite: null, boss: null, probes, initialCount: probes.length, shots: [], shields: [], lives: 3, score: 0, invulnerable: 0, direction: 1, enemyTimer: 1e6, cometTimer: 1e6 };
}
test('V01 flotte en bloc, bord droit et gauche, descente unique et inversion', () => {
    const e = new Engine(); e.loadState(position(e, [probe(336.9), probe(306.9, 230, 1)])); e.step(TICK);
    expect(e.state.direction).toBe(-1); expect(e.state.probes.map(p => p.y)).toEqual([218, 248]); expect(e.state.probes[0]?.x).toBe(337);
    e.step(TICK); expect(e.state.probes[0]?.x).toBeCloseTo(336.7); expect(e.state.probes[0]?.y).toBe(218);
    const s = position(e, [probe(23.1)]); s.direction = -1; e.loadState(s); e.step(TICK);
    expect(e.state.direction).toBe(1); expect(e.state.probes[0]?.x).toBe(23); expect(e.state.probes[0]?.y).toBe(218);
    e.move(-1); e.step(1000); expect(e.state.cannon).toBe(16); e.moveTo(999); e.step(2000); expect(e.state.cannon).toBe(344);
});
test('V02 accélération mesurée suivant la proportion restante', () => {
    const e = new Engine(); const s = position(e, [probe(150), probe(180), probe(210)]); e.loadState(s);
    const full = e.speed(); e.state.probes.pop(); expect(e.speed()).toBeCloseTo(full * (1 + 2 / 3));
    e.state.probes.pop(); expect(e.speed()).toBeCloseTo(full * (1 + 4 / 3)); const x = e.state.probes[0]?.x ?? 0;
    e.step(TICK); expect((e.state.probes[0]?.x ?? 0) - x).toBeCloseTo(e.speed() / 60);
});
test('V03 limite un projectile puis deux dès le niveau 15, cadence et sortie écran', () => {
    for (const level of [0, 13, 14, 29]) {
        const e = new Engine(level); e.loadState(position(e, [probe(30, 100)]));
        expect(e.fire()).toBe(true); expect(e.fire()).toBe(false); e.step(200);
        expect(e.fire()).toBe(level >= 14); e.step(200); expect(e.fire()).toBe(false);
        e.step(1300); expect(e.state.shots.filter(s => s.owner === 'player')).toHaveLength(0); expect(e.fire()).toBe(true);
    }
});
test('V04 collision balayée, première cible et score distinct pour chaque rangée', () => {
    for (let row = 0; row < 3; row++) {
        const e = new Engine(29), s = position(e, [probe(180, 200, row), probe(30, 100)]);
        s.shots = [{ x: 180, y: 220, owner: 'player' }]; e.loadState(s); e.step(TICK);
        expect(e.state.probes).toHaveLength(1); expect(e.state.shots).toHaveLength(0); expect(e.state.score).toBe((3 - row) * 300);
    }
    const e = new Engine(), s = position(e, [probe(180, 200), probe(180, 240, 1)]); s.shots = [{ x: 180, y: 260, owner: 'player' }]; e.loadState(s); e.step(TICK);
    expect(e.state.probes.map(p => p.row)).toEqual([0]);
});
test('V05 seules les sondes les plus basses tirent, colonnes vides et saturation', () => {
    const seen = new Set<number>();
    for (let seed = 0; seed < 100; seed++) {
        const e = new Engine(0, seed * 7919), s = position(e, [probe(70, 160, 0, 0), probe(70, 230, 2, 0), probe(250, 180, 0, 3)]); s.enemyTimer = 0;
        e.loadState(s); e.step(TICK); const shot = e.state.shots[0]; expect(shot?.owner).toBe('enemy');
        expect(shot?.y).toBeCloseTo((shot && shot.x < 100 ? 242 : 192) + difficulty(0).enemySpeed / 60); seen.add(shot && shot.x < 100 ? 0 : 3);
        expect(e.state.enemyTimer).toBeGreaterThanOrEqual(750 / difficulty(0).fireRate); expect(e.state.enemyTimer).toBeLessThanOrEqual(1250 / difficulty(0).fireRate);
        const saturated = position(e); saturated.enemyTimer = 0; saturated.shots = Array.from({ length: 12 }, () => ({ x: 320, y: 300, owner: 'enemy' as const })); e.loadState(saturated); e.step(TICK); expect(e.state.shots).toHaveLength(12);
    }
    expect([...seen].sort()).toEqual([0, 3]);
    const e = new Engine(); e.loadState(position(e, [])); e.state.enemyTimer = 0; e.step(TICK); expect(e.state.shots).toHaveLength(0);
});
test('V06 boucliers quatre groupes, cellules 4 px et érosion exacte dans les deux sens', () => {
    const cells = shields(); expect(new Set(cells.map(c => Math.floor(c.x / 90))).size).toBe(4);
    expect(cells.every(c => c.x % 4 === 0 && c.y % 4 === 0)).toBe(true);
    for (const owner of ['player', 'enemy'] as const) {
        const e = new Engine(), s = position(e); s.shields = [{ x: 180, y: 488 }, { x: 184, y: 488 }, { x: 180, y: 492 }];
        s.shots = [{ x: 181, y: owner === 'player' ? 507 : 477, owner }]; e.loadState(s); e.step(100);
        expect(e.state.shields).toHaveLength(2); expect(e.state.shields.some(c => c.x === 184)).toBe(true); expect(e.state.shots).toHaveLength(0);
        expect(e.state.shields.some(c => c.x === 180 && c.y === (owner === 'player' ? 492 : 488))).toBe(false);
    }
});
test('V07 vies, invulnérabilité temporaire, défaite à zéro et invasion avant tirs', () => {
    const e = new Engine(), s = position(e); s.shots = [{ x: 180, y: CANNON_Y - 14, owner: 'enemy' }]; e.loadState(s); e.step(TICK);
    expect(e.state.lives).toBe(2); expect(e.status).toBe('playing'); expect(e.state.invulnerable).toBe(1200);
    e.state.shots = [{ x: 180, y: CANNON_Y - 14, owner: 'enemy' }]; e.step(TICK); expect(e.state.lives).toBe(2);
    e.step(1200); e.state.lives = 1; e.state.shots = [{ x: e.state.cannon, y: CANNON_Y - 14, owner: 'enemy' }]; e.step(TICK); expect(e.status).toBe('lost'); expect(e.state.lives).toBe(0);
    const lost = e.snapshot(); expect(e.fire()).toBe(false); e.step(500); expect(e.snapshot()).toEqual(lost);
    e.loadState(position(e, [probe(337, SHIELD_Y - 29)])); e.step(TICK); expect(e.status).toBe('lost'); expect(e.state.lives).toBe(3);
});
test('V08 dernière sonde détruite gagne, aucune victoire anticipée', () => {
    const e = new Engine(), s = position(e, [probe(180, 550)]); e.loadState({ ...s, probes: [probe(180, 460)] });
    expect(e.status).toBe('playing'); e.fire(); e.step(300); expect(e.status).toBe('won'); expect(e.state.score).toBe(30); expect(e.state.probes).toHaveLength(0);
    const won = e.snapshot(); expect(e.fire()).toBe(false); e.step(500); expect(e.snapshot()).toEqual(won);
});
test('V09 comète : fréquence déterministe, deux sens, zone interdite et saturation', () => {
    // Short seeded spawn recordings; the 400-seed distribution audit lives in the script.
    for (const [seed, expected] of [[0, 0], [7919, 1], [15838, 0], [47514, -1], [102947, -1], [142542, 1], [197975, 1], [237570, 1]]) {
        const e = new Engine(0, seed), s = position(e); s.cometTimer = 0; e.loadState(s); e.step(TICK);
        expect(e.state.comet?.direction ?? 0).toBe(expected);
        if (e.state.comet) { expect(e.state.comet.y).toBe(56); expect(e.state.comet.x < 0 || e.state.comet.x > 360).toBe(true); }
        const occupied = position(e); occupied.cometTimer = 0; occupied.comet = { x: 180, y: 56, direction: 1 };
        e.loadLevel(0, seed); e.loadState(occupied); e.step(TICK); expect(e.state.comet?.x).toBeCloseTo(180 + 95 / 60);
        e.loadLevel(0, seed); const forbidden = position(e, [probe(180, 56)]); forbidden.cometTimer = 0; e.loadState(forbidden); e.step(TICK); expect(e.state.comet).toBeNull();
    }
});
test('V09 comète : traversée, expiration, collision et bonus unique', () => {
    const e = new Engine(), s = position(e); s.comet = { x: 100, y: 56, direction: 1 }; s.shots = [{ x: 101, y: 72, owner: 'player' }]; e.loadState(s); e.step(TICK);
    expect(e.state.comet).toBeNull(); expect(e.state.score).toBe(150); expect(e.state.shots).toHaveLength(0); e.step(TICK); expect(e.state.score).toBe(150);
    for (const direction of [-1, 1] as const) { const state = position(e); state.comet = { x: direction === 1 ? 388 : -28, y: 56, direction }; e.loadState(state); e.step(TICK); expect(e.state.comet).toBeNull(); }
});
test('V10 blindage : deux impacts, score seulement à destruction, seuil niveau 10', () => {
    const e = new Engine(9), s = position(e, [probe(180, 200, 0, 0, 2)]); s.shots = [{ x: 180, y: 220, owner: 'player' }]; e.loadState(s); e.step(TICK);
    expect(e.state.probes[0]?.hp).toBe(1); expect(e.state.score).toBe(0); expect(e.status).toBe('playing');
    e.state.shots = [{ x: e.state.probes[0]?.x ?? 180, y: 220, owner: 'player' }]; e.step(TICK); expect(e.status).toBe('won'); expect(e.state.score).toBe(300);
    let armored = 0, total = 0;
    for (let seed = 0; seed < 60; seed++) { expect(new Engine(8, seed).state.probes.every(p => p.hp === 1)).toBe(true); const probes = new Engine(9, seed * 7919).state.probes; armored += probes.filter(p => p.hp === 2).length; total += probes.length; }
    expect(armored / total).toBeGreaterThan(0.12); expect(armored / total).toBeLessThan(0.18);
});
test('V11 formations écrites légales et respirations', () => {
    const layouts = new Set<string>();
    for (let level = 0; level < 30; level++) {
        const e = new Engine(level), d = difficulty(level);
        expect(e.state.probes).toHaveLength(d.rows * d.columns);
        expect(e.state.probes.every(p => p.x >= 23 && p.x <= 337 && p.y >= 78 && p.y + 11 < SHIELD_Y)).toBe(true);
        expect(new Set(e.state.probes.map(p => `${String(p.x)},${String(p.y)}`)).size).toBe(e.state.probes.length);
        layouts.add(JSON.stringify(e.state.probes.map(p => [p.x, p.y])));
    }
    expect(layouts.size).toBeGreaterThanOrEqual(6);
    expect(difficulty(5).fireRate).toBeLessThan(difficulty(4).fireRate);
    expect(() => difficulty(30)).toThrow(); expect(() => difficulty(-1)).toThrow();
});
test('V12 entrées horodatées, pas indépendant de l’affichage, graine témoin, copie', () => {
    const a = new Engine(14, 42), b = new Engine(14, 42);
    a.holdFire(true); b.holdFire(true);
    for (const direction of [-1, 0, 1, 0, -1] as const) {
        a.move(direction); b.move(direction); a.step(600); for (let i = 0; i < 36; i++) b.step(TICK); expect(a.snapshot()).toEqual(b.snapshot());
    }
    expect(new Engine(14, 43).snapshot()).not.toEqual(new Engine(14, 42).snapshot()); const copy = a.snapshot(); copy.probes.splice(0); expect(a.state.probes.length).toBeGreaterThan(0);
    expect(() => { a.step(-1); }).toThrow(); expect(() => { a.step(Infinity); }).toThrow(); expect(JSON.parse(JSON.stringify(a.snapshot()))).toEqual(a.snapshot());
});

test('O-SAVE anciennes positions sans champs optionnels et sérialisation', () => {
    const e = new Engine();
    e.loadState({
        probes: [probe()], shots: [], shields: [], comet: null, cannon: 180, direction: 1,
        initialCount: 1, lives: 3, score: 0, enemyTimer: 1000000, cometTimer: 1000000,
        cooldown: 0, invulnerable: 0, move: 0, target: null, firing: false, ticks: 0,
    });
    e.step(TICK); expect(e.state.probes[0]?.x).toBeCloseTo(180.3);
    expect(e.status).toBe('playing'); expect(JSON.parse(JSON.stringify(e.snapshot()))).toEqual(e.snapshot());
});
