import { expect, test } from 'vitest';
import { Engine, difficulty, TICK, WIDTH, HEIGHT, PRIORITY, HOME, START, index, neighbor, target, choose, opposite, type Wisp, type Direction } from '../src/engines/dedale/engine';
function arena(): Engine {
    const e = new Engine(); e.state.maze = Array<boolean>(WIDTH * HEIGHT).fill(true);
    e.state.journey = undefined; e.state.wisps = []; e.state.seeds = [index({ x: 17, y: 21 })]; e.state.suns = []; e.state.grace = 0;
    e.state.hero = { x: 5, y: 5, direction: 'right' }; e.state.requested = 'right'; return e;
}
function wisp(x = 5, y = 5): Wisp { return { x, y, kind: 'tracker', direction: 'up', wait: 0, returning: false }; }
function move(e: Engine, d: Direction): void { e.input(d); e.step(1000 / 6); }
test('D02 direction mémorisée jusqu’au prochain passage, mur et déplacement', () => {
    const e = arena(); e.state.maze[index({ x: 5, y: 4 })] = false;
    move(e, 'up'); expect(e.state.hero).toEqual({ x: 6, y: 5, direction: 'right' }); expect(e.state.requested).toBe('up');
    e.step(1000 / 6); expect(e.state.hero).toEqual({ x: 6, y: 4, direction: 'up' });
    e.state.maze[index({ x: 6, y: 3 })] = false; e.step(1000 / 6); expect(e.state.hero.y).toBe(4);
});
test('D03 tunnel bilatéral limité à la rangée 11', () => {
    const e = arena(); e.state.hero = { x: 0, y: 11, direction: 'left' }; move(e, 'left'); expect(e.state.hero.x).toBe(18);
    move(e, 'right'); expect(e.state.hero.x).toBe(0); expect(neighbor(e.state.maze, { x: 0, y: 10 }, 'left')).toBeUndefined();
});
test('D04 graines à 10 et soleils à 50, collecte unique et durée exacte', () => {
    const e = arena(); e.state.seeds = [index({ x: 6, y: 5 }), index({ x: 17, y: 21 })]; e.state.suns = [index({ x: 7, y: 5 })];
    move(e, 'right'); expect(e.state.score).toBe(10); move(e, 'right'); expect(e.state.score).toBe(60); expect(e.state.vulnerable).toBe(8000);
    move(e, 'left'); expect(e.state.score).toBe(60); expect(e.state.vulnerable).toBeCloseTo(8000 - 1000 / 6, 6);
});
test('D05 les quatre cibles, dispersion et alternance du rôdeur', () => {
    const e = arena(), s = e.state; s.mode = 'chase';
    const w = wisp(10, 10); expect(target(s, w)).toEqual(s.hero);
    w.kind = 'seer'; expect(target(s, w)).toEqual({ x: 8, y: 5 });
    w.kind = 'roamer'; expect(target(s, w)).toEqual(s.hero); s.ticks = 240; expect(target(s, w)).toEqual({ x: 17, y: 21 });
    w.kind = 'shy'; expect(target(s, w)).toEqual(s.hero); w.x = w.y = 6; expect(target(s, w)).toEqual({ x: 1, y: 21 });
    s.mode = 'scatter'; w.kind = 'tracker'; expect(target(s, w)).toEqual({ x: 1, y: 1 });
});
test('D06 distance, priorité haut gauche bas droite, jamais demi-tour', () => {
    const e = arena(), s = e.state, w = wisp(); s.mode = 'chase'; s.hero = { x: 4, y: 4, direction: 'up' };
    expect(choose(s, w)).toBe('up'); w.direction = 'down'; expect(choose(s, w)).toBe('left');
    s.hero = { x: 5, y: 3, direction: 'up' }; expect(choose(s, w)).not.toBe('up');
    for (const d of PRIORITY) { w.direction = d; expect(choose(s, w)).not.toBe(opposite[d]); }
});
test('D07 calendrier à graine, transition exacte et inversion de direction', () => {
    const e = arena(); e.state.wisps = [{ ...wisp(), wait: 1e6 }]; e.state.schedule = [TICK * 2, TICK * 3];
    e.step(TICK); expect(e.state.mode).toBe('scatter'); e.step(TICK); expect(e.state.mode).toBe('chase'); expect(e.state.wisps[0]?.direction).toBe('down');
    e.step(TICK * 3); expect(e.state.mode).toBe('scatter'); expect(e.state.phase).toBe(2);
    expect(new Engine(0, 2).state.schedule).not.toEqual(new Engine(0, 3).state.schedule);
});
test('D08 chaîne 200 400 800 1600, expiration et retour effectif à la base', () => {
    const e = arena(); e.state.vulnerable = 8000;
    e.state.wisps = Array.from({ length: 4 }, () => wisp(6, 5)); move(e, 'right');
    expect(e.state.score).toBe(3000); expect(e.state.chain).toBe(4); expect(e.state.wisps.every(w => w.returning)).toBe(true);
    const w = wisp(HOME.x, HOME.y + 1); w.returning = true; e.state.wisps = [w]; e.state.wispClock = 220;
    e.step(TICK); expect(index(w)).toBe(index(HOME)); e.step(250); expect(w.returning).toBe(false); expect(w.wait).toBeGreaterThan(0);
    e.state.vulnerable = TICK; e.step(TICK); expect(e.state.vulnerable).toBe(0);
});
test('D09 collision perd une vie, conserve la collecte, réinitialise les positions et protège', () => {
    const e = arena(); e.state.wisps = [wisp(6, 5)]; e.state.score = 70; move(e, 'right');
    expect(e.state.lives).toBe(2); expect(e.state.hero).toEqual({ ...START, direction: 'left' }); expect(e.state.wisps.every(w => index(w) === index(HOME))).toBe(true); expect(e.state.score).toBe(70); expect(e.state.grace).toBe(1800); expect(e.state.mode).toBe('scatter'); expect(e.state.phase).toBe(0); expect(e.state.modeTime).toBe(0);
    e.state.wisps = [wisp(START.x - 1, START.y)]; move(e, 'left'); expect(e.state.lives).toBe(2);
});
test('D10 victoire après les deux collectes, défaite et gel des états terminaux', () => {
    const e = arena(); e.state.seeds = [index({ x: 6, y: 5 })]; e.state.suns = [index({ x: 7, y: 5 })]; move(e, 'right'); expect(e.status).toBe('playing'); move(e, 'right'); expect(e.status).toBe('won'); const won = e.snapshot(); e.step(1000); expect(e.snapshot()).toEqual(won);
    const b = arena(); b.state.lives = 1; b.state.wisps = [wisp(6, 5)]; move(b, 'right'); expect(b.status).toBe('lost'); const lost = b.snapshot(); b.step(1000); expect(b.snapshot()).toEqual(lost);
});
test('D11 chaque paramètre évolue dans son sens aux trente niveaux', () => {
    const signs = { wispRatio: 1, vulnerableMs: -1, chaseMs: 1 } as const;
    expect(Object.keys(difficulty(0)).sort()).toEqual(Object.keys(signs).sort());
    for (const key of Object.keys(signs) as (keyof typeof signs)[]) {
        expect(difficulty(29)[key] * signs[key]).toBeGreaterThan(difficulty(0)[key] * signs[key]);
        for (let i = 1; i < 30; i++) expect(difficulty(i)[key] * signs[key]).toBeGreaterThanOrEqual(difficulty(i - 1)[key] * signs[key]);
    }
    expect(difficulty(0).wispRatio).toBe(0.75); expect(difficulty(29).wispRatio).toBe(1.05); expect(difficulty(29).vulnerableMs).toBe(1000);
});
test('D12 mêmes entrées horodatées, cadence indépendante, snapshot sérialisable', () => {
    const a = new Engine(14, 17), b = new Engine(14, 17);
    for (let i = 0; i < 40; i++) { const d = PRIORITY[i % 4]; if (!d) throw new Error('Direction absente'); a.input(d); b.input(d); a.step(100); for (let j = 0; j < 6; j++) b.step(TICK); }
    expect(a.snapshot()).toEqual(b.snapshot()); expect(() => JSON.stringify(a.snapshot())).not.toThrow(); expect(new Engine(14, 18).snapshot()).not.toEqual(new Engine(14, 17).snapshot());
});

test('D09 croisement simultané : contact normal et follet vulnérable mangé', () => {
    for (const vulnerable of [0, 1000]) {
        const e = arena(); e.state.maze.fill(false);
        for (const x of [5, 6]) e.state.maze[index({ x, y: 5 })] = true;
        e.state.wisps = [{ ...wisp(6, 5), direction: 'up' }];
        e.state.heroClock = 1000 / 6 - TICK; e.state.wispClock = 1000 / (6 * difficulty(0).wispRatio) - TICK;
        e.state.vulnerable = vulnerable; e.step(TICK);
        expect(e.state.lives).toBe(vulnerable ? 3 : 2);
        expect(e.state.score).toBe(vulnerable ? 200 : 0);
        if (vulnerable) { expect(e.state.hero.x).toBe(6); expect(e.state.wisps[0]?.x).toBe(5); expect(e.state.wisps[0]?.returning).toBe(true); }
    }
});
