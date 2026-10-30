import { isDeepStrictEqual } from 'node:util';
import { Engine as Ferraille, DT } from '../src/engines/ferraille/engine';
import { Engine as Briqueterie, STEP } from '../src/engines/briqueterie/engine';
import { Engine as Essaim, TICK } from '../src/engines/essaim/engine';
import { ids } from '../src/characters/model';
import { selectCharacter } from '../src/characters/selection';
import { createThumbnail } from '../src/games/traverse/thumbnail';
function check(ok: unknown, message: string): asserts ok { if (!ok) throw new Error(message); }
function equal(a: unknown, b: unknown): void { check(isDeepStrictEqual(a, b), `Expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }
export function ferrailleEffect(E = Ferraille): void {
    bossAndCages(E);
    const e = new E();
    e.state.hero = { x: 32, y: 234, w: 12, h: 22, vx: 0, vy: 0 };
    const target = { x: 92, y: 242, w: 14, h: 14, vx: 0, vy: 0, kind: 'armored' as const, hp: 4, clock: 0, originY: 242, phase: 0 };
    e.state.enemies = [target, { ...target, x: 132 }, { ...target, x: 4 }];
    e.state.boss = { x: 76, y: 220, w: 30, h: 36, hp: 8, maxHp: 8, phase: 1, clock: 0, exposed: false };
    check(e.special(), 'P-ferraille-02 discharge'); equal(e.state.enemies.map(e => e.hp), [1, 4, 4]); equal(e.state.boss.hp, 8); equal(e.state.score, 100); equal(e.state.specialCooldown, 600); equal(e.state.specialTicks, 18);
    check(!e.special(), 'P-ferraille-03 no repeat');
    e.state.enemies = []; e.state.boss = null; e.state.bonuses = []; e.state.shots = [];
    e.step(DT * 599); equal(e.state.specialCooldown, 1); check(!e.special(), 'not before ten seconds');
    e.step(DT); equal(e.state.specialCooldown, 0); check(e.special(), 'ten seconds inclusive');
    e.loadLevel(0); equal(e.state.specialCooldown, undefined); check(e.special(), 'new game');
    e.status = 'won'; check(!e.special(), 'no terminal special');
}
export function briqueterieEffect(E = Briqueterie): void {
    brickInteractions(E);
    const e = new E();
    e.loadState({ ...e.state, ready: false, balls: [{ x: 180, y: 190, vx: 0, vy: -100 }], bricks: [
        { x: 164, y: 160, w: 32, h: 10, hp: 1, solid: false },
        { x: 164, y: 130, w: 32, h: 10, hp: 1, solid: false },
        { x: 164, y: 100, w: 32, h: 10, hp: 1, solid: false },
        { x: 164, y: 70, w: 32, h: 10, hp: 1, solid: false },
    ] });
    check(e.special(), 'P-briqueterie-02 next ball'); check(!e.special(), 'P-briqueterie-03 once per life');
    e.step(STEP); equal(e.state.bricks.length, 1); equal(e.state.balls[0]?.vy, -100); equal(e.state.balls[0]?.pierce, 0);
    e.step(STEP); check((e.state.balls[0]?.vy ?? 0) > 0, 'fourth brick rebounds');
    e.loadLevel(0); check(e.special(), 'armed before launch'); e.launch(); equal(e.state.balls[0]?.pierce, 3);
    e.state.balls = [{ x: 180, y: 647, vx: 0, vy: 4 }]; e.step(STEP); equal(e.state.lives, 2); check(e.special(), 'life recharges');
    e.status = 'lost'; check(!e.special(), 'no terminal special');
}
export function essaimEffect(E = Essaim): void {
    escortShield(E);
    const e = new E();
    e.state.enemyTimer = 100000; e.state.diveTimer = 100000;
    check(e.special(), 'P-essaim-02 shield'); equal(e.state.specialTicks, 120); check(!e.special(), 'P-essaim-03 once per wave');
    for (let tick = 0; tick < 120; tick++) { e.state.shots = [{ x: 180, y: 539, owner: 'enemy', vy: 120 }]; e.step(TICK); equal(e.state.lives, 3); }
    equal(e.state.specialTicks, 0); check(!e.special(), 'elapsed time does not recharge');
    e.state.shots = [{ x: 180, y: 539, owner: 'enemy', vy: 120 }]; e.step(TICK); equal(e.state.lives, 2);
    e.state.enemies = []; e.state.shots = []; e.step(TICK); equal(e.state.wave, 2); check(e.special(), 'next wave');
    e.status = 'lost'; check(!e.special(), 'no terminal special');
}
export const effects = { ferraille: ferrailleEffect, briqueterie: briqueterieEffect, essaim: essaimEffect };
export function balance(game: string): void {
    let reference: unknown;
    for (const id of ids) {
        selectCharacter(id, undefined);
        const e = game === 'ferraille' ? new Ferraille() : game === 'briqueterie' ? new Briqueterie() : new Essaim();
        check(e.special(), 'all characters'); e.step(300);
        if (reference) equal(e.snapshot(), reference); else reference = e.snapshot();
    }
}
export function decisiveShield(): void {
    for (const special of [false, true]) {
        const e = new Essaim(); e.state.lives = 1; e.state.shots = [{ x: 180, y: 539, owner: 'enemy', vy: 120 }];
        if (special) e.special(); e.step(TICK); equal(e.status, special ? 'playing' : 'lost');
    }
}
/** Record raster occupancy of actual thumbnail draw commands (no graphics runtime). */
export function thumbnailMotion(): void {
    const demo = createThumbnail(28), pixels = new Uint8Array(160 * 120);
    let color = 0, unchanged = 0, hasPrevious = false;
    const previous = new Uint8Array(160 * 120);
    const context = { save() {}, restore() {}, beginPath() {}, fill() {}, set fillStyle(value: string) { color = Array.from(value).reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 251, 1) + 1; },
        fillRect(x: number, y: number, w: number, h: number) { for (let yy = Math.max(0, Math.ceil(y)); yy < Math.min(120, y + h); yy++) for (let xx = Math.max(0, Math.ceil(x)); xx < Math.min(160, x + w); xx++) pixels[yy * 160 + xx] = color; },
        arc(x: number, y: number, r: number) { this.fillRect(x - r, y - r, r * 2, r * 2); },
    };
    for (let tick = 0; tick < 2000; tick++) {
        demo.step(); demo.draw(context as unknown as CanvasRenderingContext2D);
        const changed = !hasPrevious || pixels.some((value, at) => value !== previous[at]);
        unchanged = changed ? 0 : unchanged + 1;
        check(unchanged < 9, 'Traverse changes inside 600ms even at 15Hz (also <36 steps)'); previous.set(pixels); hasPrevious = true;
    }
}

export function boundaries(): void {
    const runner = new Ferraille();
    runner.state.hero = { x: 32, y: 234, w: 12, h: 22, vx: 0, vy: 0 };
    const enemy = { x: 111, y: 238, w: 14, h: 14, vx: 0, vy: 0, kind: 'crawler' as const, hp: 4, clock: 0, originY: 238, phase: 0 };
    runner.state.enemies = [{ ...enemy }, { ...enemy, x: 111.0001 }];
    check(runner.special(), 'boundary discharge'); equal(runner.state.enemies.map(e => e.hp), [1, 4]);
    runner.loadLevel(0); runner.state.enemies = [{ ...enemy, x: 76 }];
    runner.state.tiles[15 * runner.state.columns + 4] = true;
    check(runner.special(), 'blocked discharge accepted'); equal(runner.state.enemies[0]?.hp, 4);
    runner.loadLevel(0); runner.state.boss = { x: 76, y: 220, w: 30, h: 36, hp: 8, maxHp: 8, phase: 1, clock: 0, exposed: true };
    runner.special(); equal(runner.state.boss.hp, 5);
    const bricks = new Briqueterie();
    bricks.loadState({ ...bricks.state, ready: false, balls: [{ x: 180, y: 120, vx: 0, vy: -8 }], bricks: [{ x: 164, y: 100, w: 32, h: 10, hp: 1, solid: true }, { x: 20, y: 60, w: 20, h: 10, hp: 1, solid: false }] });
    bricks.special(); bricks.step(STEP); equal(bricks.state.balls[0]?.pierce, 3); check((bricks.state.balls[0]?.vy ?? 0) > 0, 'solids still rebound');
    function partition<S>(make: () => { state: S; special(): boolean; loadState(s: S): void; step(ms: number): void; snapshot(): unknown }): void {
        const a = make(), b = make(); check(a.special(), 'partition activation'); b.loadState(JSON.parse(JSON.stringify(a.state)) as S);
        a.step(300); b.step(150); b.step(150); equal(a.snapshot(), b.snapshot());
    }
    partition(() => new Ferraille()); partition(() => new Briqueterie()); piercingResume(); partition(() => new Essaim());
}

export function bossAndCages(E = Ferraille): void {
    for (const [hp, remaining, score, rescuedScore] of [[8, 5, 60, 360], [2, 0, 40, 840]] as const) {
        const e = new E();
        e.state.enemies = []; e.state.bonuses = [];
        e.state.boss = { x: 76, y: 220, w: 30, h: 36, hp, maxHp: 8, phase: 1, clock: 0, exposed: true };
        e.state.cages = [{ x: 76, y: 224, w: 24, h: 32, hp: 3, rescued: false }];
        check(e.special(), 'boss and cage activation'); equal(e.state.boss.hp, remaining); equal(e.state.score, score);
        equal(e.state.cages[0]?.hp, 0);
        e.step(DT); equal(e.state.cages[0]?.rescued, true); equal(e.state.rescued, 1); equal(e.state.score, rescuedScore);
    }
}
export function escortShield(E = Essaim): void {
    for (const active of [false, true]) {
        const e = new E(); e.state.enemyTimer = 100000; e.state.diveTimer = 100000;
        e.state.invulnerable = 1000;
        e.state.rescue = { x: 80, y: 400, hp: 1 };
        e.state.shots = [{ x: 80, y: 387, owner: 'enemy', vy: 120 }];
        if (active) check(e.special(), 'escort shield activation');
        e.step(TICK); equal(e.state.rescue, null); check(e.events.includes('rescue-lost'), 'escort actually destroyed');
        equal(e.state.lives, active ? 3 : 2);
    }
}
export function brickInteractions(E = Briqueterie): void {
    for (const active of [false, true]) for (const [x, y, vx, vy, outX, outY] of [
        [180, 130, 0, -8, 0, 8], [150, 110, 8, 0, -8, 0],
    ] as const) {
        const e = new E();
        e.loadState({ ...e.state, ready: false, balls: [{ x, y, vx, vy }], bricks: [
            { x: 164, y: 104, w: 32, h: 12, hp: 1, solid: false, kind: 'portal' },
            { x: 40, y: 78, w: 32, h: 12, hp: 1, solid: false, kind: 'portal' },
        ] });
        if (active) e.special(); e.step(STEP);
        const ball = e.state.balls[0]; equal([ball?.x, ball?.y, ball?.portalUntil], [56, 97, 21]);
        check(e.events.includes('portal'), 'portal preserved'); equal([ball?.vx, ball?.vy], [outX, outY]);
    }
    for (const kind of ['plain', 'locked'] as const) {
        const e = new E();
        e.loadState({ ...e.state, ready: false, balls: [{ x: 180, y: 130, vx: 0, vy: -8 }], bricks: [
            { x: 164, y: 104, w: 32, h: 12, hp: 1, solid: true, kind },
            { x: 20, y: 60, w: 20, h: 10, hp: 1, solid: false },
        ] });
        e.special(); e.step(STEP); equal(e.state.bricks[0]?.hp, 1); equal(e.state.score, 0);
        equal(e.state.balls[0]?.pierce, 3); equal(e.state.balls[0]?.vy, 8);
        check(e.events.includes(kind === 'locked' ? 'blocked' : 'solid'), 'solid still blocks');
    }
    for (const kind of ['regen', 'explosive', 'key', 'multi', 'anchor', 'angle', 'moving', 'gravity', 'hanging'] as const) {
        const e = new E();
        e.loadState({ ...e.state, ready: false, balls: [{ x: 180, y: 128, vx: 0, vy: -8 }], bricks: [
            { x: 164, y: 104, w: 32, h: 12, hp: kind === 'regen' ? 2 : 1, solid: false, kind },
            { x: 130, y: 104, w: 20, h: 12, hp: 1, solid: kind === 'key', kind: kind === 'key' ? 'locked' : 'hanging' },
            { x: 20, y: 60, w: 20, h: 10, hp: 1, solid: false },
        ] });
        e.special(); e.step(STEP);
        equal(e.state.balls[0]?.pierce, 2);
        if (kind === 'gravity') check(e.events.includes('gravity') && (e.state.balls[0]?.vy ?? 0) < -6.99, 'gravity retained');
        else equal(e.state.balls[0]?.vy, -8);
        if (kind === 'regen') { equal(e.state.bricks[0]?.hp, 1); equal(e.state.bricks[0]?.healAt, 181); equal(e.state.score, 10); }
        else check(!e.state.bricks.some(b => b.kind === kind && b.x > 160 && b.y === 104), `${kind} damaged`);
        if (kind === 'explosive') check(!e.state.bricks.some(b => b.x === 130), 'explosion propagated');
        if (kind === 'key') { equal(e.state.bricks[0]?.solid, false); check(e.events.includes('key'), 'lock opened'); }
        if (kind === 'multi') { equal(e.state.balls.length, 3); check(e.events.includes('multi'), 'multiball preserved'); }
        if (kind === 'anchor') equal(e.state.bricks[0]?.falling, true);
    }
}
export function piercingResume(): void {
    const a = new Briqueterie(), b = new Briqueterie();
    a.loadState({ ...a.state, ready: false, balls: [{ x: 180, y: 130, vx: 0, vy: -8 }], bricks: [
        { x: 164, y: 104, w: 32, h: 12, hp: 2, solid: false, kind: 'regen' },
        { x: 20, y: 60, w: 20, h: 10, hp: 1, solid: false },
    ] });
    a.special(); a.step(STEP);
    equal(a.state.balls[0]?.pierce, 2); equal(a.state.balls[0]?.pierced?.length, 1);
    b.loadState(JSON.parse(JSON.stringify(a.state)) as typeof a.state);
    equal(b.state.balls[0]?.pierced, a.state.balls[0]?.pierced);
    a.step(STEP); b.step(STEP); equal(b.state, a.state); equal(b.events, a.events);
    equal(b.state.bricks[0]?.hp, 1); equal(b.state.balls[0]?.pierce, 2);
}
