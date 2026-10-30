import { Engine, STEP, difficulty, type Brick, type Ball } from '../src/engines/briqueterie/engine';
function check(value: unknown, message: string): asserts value { if (!value) throw new Error(message); }
const tile = (extra: Partial<Brick> = {}): Brick => ({ x: 100, y: 100, w: 28, h: 18, hp: 1, solid: false, ...extra });
function setup(E: typeof Engine, bricks: Brick[], ball: Ball = { x: 114, y: 92, vx: 0, vy: 4 }): Engine {
    const e = new E(); e.loadState({ ...e.state, bricks, balls: [ball], ready: false }); return e;
}
export const mechanicCases: Record<string, (E?: typeof Engine) => void> = {
    'K-MEC-01 rangée mobile': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'moving', homeX: 100, phase: 0 }), tile({ x: 134, kind: 'moving', homeX: 134, phase: 0 })], { x: 180, y: 400, vx: 0, vy: 0 });
        e.step(STEP * 30); const [a, b] = e.state.bricks;
        check(a && b && a.x > 104 && a.x < 108 && Math.abs(b.x - a.x - 34) < 0.001, 'row translates together');
        check(e.events.includes('moving'), 'actual displacement event');
    },
    'K-MEC-02 explosion de voisinage': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'explosive' }), tile({ x: 134, hp: 2 }), tile({ x: 134, y: 127 }), tile({ x: 180 }), tile({ x: 100, y: 127, solid: true })]);
        e.step(STEP);
        check(e.state.bricks.length === 3, 'explosion removes diagonal neighbor');
        check(e.state.bricks.find(b => b.x === 134)?.hp === 1, 'adjacent armor damaged');
        check(e.state.bricks.find(b => b.x === 180)?.hp === 1, 'distant tile intact');
        check(e.state.bricks.find(b => b.solid)?.hp === 1, 'solid intact');
    },
    'K-MEC-03 repousse et finition rapide': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'regen', hp: 2 }), tile({ x: 260 })]);
        const hp = () => e.state.bricks[0]?.hp;
        e.step(STEP); check(hp() === 1, 'first damage');
        e.state.balls = [{ x: 180, y: 400, vx: 0, vy: 0 }]; e.step(STEP * 179);
        check(hp() === 1, 'no early healing'); e.step(STEP);
        check(hp() === 2 && e.events.includes('regen'), 'healing at tick 181');
        for (let i = 0; i < 2; i++) { e.state.balls = [{ x: 114, y: 92, vx: 0, vy: 4 }]; e.step(STEP); }
        check(!e.state.bricks.some(b => b.kind === 'regen'), 'quick double hit finishes');
    },
    'K-MEC-04 portail téléporte réellement': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'portal' }), tile({ x: 250, y: 180, kind: 'portal' }), tile({ x: 20 })]);
        e.step(STEP); const ball = e.state.balls[0];
        check(ball && ball.x === 264 && ball.y > 204 && ball.vy > 0, 'exit below paired tile');
        check(ball.portalUntil === 21 && e.events.includes('portal'), 'cooldown and event');
    },
    'K-MEC-05 chicane indestructible': (E = Engine) => {
        const e = setup(E, [tile({ solid: true }), tile({ x: 260 })]); e.step(STEP);
        check(e.state.bricks[0]?.hp === 1 && e.state.score === 0 && e.state.balls[0]?.vy === -4, 'solid reflects without damage');
        check(e.status === 'playing' && e.events.includes('solid'), 'solid impact observed');
    },
    'K-MEC-06 normale inclinée': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'angle' }), tile({ x: 260 })]); e.step(STEP); const ball = e.state.balls[0];
        check(ball && Math.abs(ball.vx - Math.sqrt(12)) < 0.001 && Math.abs(ball.vy + 2) < 0.001, 'inclined reflection vector');
        check(Math.abs(Math.hypot(ball.vx, ball.vy) - 4) < 0.001, 'energy preserved');
    },
    'K-MEC-07 clé libère le coffre': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'key' }), tile({ x: 200, kind: 'locked', solid: true })]); e.step(STEP);
        check(e.state.bricks[0]?.solid === false && e.events.includes('key'), 'key unlocks');
        e.state.balls = [{ x: 214, y: 92, vx: 0, vy: 4 }]; e.step(STEP);
        check(e.status === 'won', 'released zone destructible');
        const locked = setup(E, [tile({ kind: 'locked', solid: true })]); locked.step(STEP);
        check(locked.status === 'playing', 'locked objectives prevent premature win');
    },
    'K-MEC-08 multi-balle par brique': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'multi' }), tile({ x: 260 })]); e.step(STEP);
        check(e.state.balls.length === 3 && e.events.includes('multi'), 'immediate split');
        check(new Set(e.state.balls.map(b => b.vx)).size === 3, 'distinct trajectories');
    },
    'K-MEC-09 zone de gravité inversée': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'gravity' }), tile({ x: 260 })], { x: 114, y: 150, vx: 0, vy: 4 }); e.step(STEP);
        check(Math.abs((e.state.balls[0]?.vy ?? 0) - 3.955) < 0.001 && e.events.includes('gravity'), 'upward acceleration inside zone');
        e.state.balls = [{ x: 200, y: 150, vx: 0, vy: 4 }]; e.step(STEP);
        check(e.state.balls[0]?.vy === 4 && !e.events.includes('gravity'), 'outside zone unchanged');
    },
    'K-MEC-10 rupture de suspension': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'anchor' }), tile({ x: 50, y: 70, kind: 'hanging' }), tile({ x: 260 })]); e.step(STEP * 2);
        check(e.state.bricks.find(b => b.kind === 'hanging')?.y === 71 && e.events.includes('falling'), 'attachment broken then fall');
        e.state.balls = [{ x: 180, y: 500, vx: 0, vy: 0 }]; e.step(STEP * 400);
        check(e.state.bricks.find(b => b.kind === 'hanging')?.y === 370, 'settles above paddle');
    },
    'K-MEC-11 plafond à chaque tick sous gravité': (E = Engine) => {
        for (let level = 0; level < 30; level++) for (const vx of [0, 3]) {
            const e = new E(level), cap = difficulty(level).cap;
            e.loadState({ ...e.state, speed: cap, ready: false, bricks: [tile({ kind: 'gravity' }), tile({ x: 260 })], balls: [{ x: 114, y: 250, vx, vy: -Math.sqrt(cap ** 2 - vx ** 2) }] });
            for (let tick = 0; tick < 8; tick++) {
                e.step(STEP); const ball = e.state.balls[0];
                check(e.events.includes('gravity'), 'ascending ball traverses gravity zone');
                check(ball && ball.vy < 0 && Math.hypot(ball.vx, ball.vy) <= cap, 'speed never exceeds level cap at any tick');
                check(Math.abs(Math.hypot(ball.vx, ball.vy) - cap) < 1e-12, 'clamping preserves capped speed');
            }
        }
    },
    'K-MEC-12 délai du portail et expiration exacte': (E = Engine) => {
        const e = setup(E, [tile({ kind: 'portal', hp: 100 }), tile({ x: 250, y: 180, kind: 'portal', hp: 100 })], { x: 114, y: 90, vx: 0, vy: 4 });
        e.step(STEP); const ball = e.state.balls[0];
        check(ball && Number(ball.portalUntil) === 21, 'first contact starts cooldown');
        for (let tick = 2; tick <= 21; tick++) {
            Object.assign(ball, { x: 114, y: 90, vx: 0, vy: 4 });
            e.step(STEP);
            if (tick < 21) {
                check(!e.events.includes('portal') && ball.x === 114 && Math.abs(ball.y - 94) < 0.00001 && ball.vy < 0, 'contact reflects without teleportation during cooldown');
                check(ball.portalUntil === 21, 'blocked contact does not extend cooldown');
            } else check(e.events.includes('portal') && ball.x === 264 && ball.portalUntil === 41, 'teleportation resumes exactly at expiry');
        }
    },
    'K-MEC-13 maximum neuf balles': (E = Engine) => {
        for (const count of [8, 9]) {
            const e = setup(E, [tile()], { x: 180, y: 400, vx: 0, vy: -4 });
            e.state.balls = Array.from({ length: count }, () => ({ x: 180, y: 400, vx: 0, vy: -4 }));
            e.state.bonuses = [{ x: 180, y: 573, kind: 'multi' }];
            e.step(STEP);
            check(e.events.includes('bonus') && e.state.balls.length === 9, 'ninth accepted, tenth refused');
        }
    },
    'K-MEC-14 bornes exactes du voisinage explosif': (E = Engine) => {
        for (const sign of [-1, 1]) for (const axis of ['x', 'y'] as const) {
            const bound = axis === 'x' ? 38 : 32;
            for (const delta of [bound - 0.001, bound, bound + 0.001]) {
                const neighbor = tile({ [axis]: 100 + sign * delta, hp: 2 });
                const e = setup(E, [tile({ kind: 'explosive' }), neighbor], { x: 114, y: 90, vx: 0, vy: 4 }); e.step(STEP);
                check(e.state.bricks.length === 1 && e.state.bricks[0]?.hp === (delta <= bound ? 1 : 2), `${axis}/${String(sign)}/${String(delta)}: inclusive explosion boundary`);
            }
        }
    },
    'K-MEC-15 frontières exactes de gravité': (E = Engine) => {
        const cases = [
            [62 - 0.001, 150, false], [62, 150, false], [62 + 0.001, 150, true],
            [166 - 0.001, 150, true], [166, 150, false], [166 + 0.001, 150, false],
            [150, 100 - 0.001, false], [150, 100, false], [150, 100 + 0.001, true],
            [114, 260 - 0.001, true], [114, 260, false], [114, 260 + 0.001, false],
        ] as const;
        for (const [x, y, inside] of cases) {
            const e = setup(E, [tile({ kind: 'gravity' })], { x, y, vx: 0, vy: 4 }); e.step(STEP);
            check(e.events.includes('gravity') === inside, `gravity boundary at ${String(x)}/${String(y)}`);
            check(Math.abs((e.state.balls[0]?.vy ?? 0) - (inside ? 3.955 : 4)) < 1e-12, 'acceleration only strictly inside');
        }
    },
    'K-MEC-16 angles multi-balle à ±0,4 rad': (E = Engine) => {
        for (const heading of [0, 0.6, -0.6]) {
            const e = setup(E, [tile()], { x: 180, y: 400, vx: 4 * Math.sin(heading), vy: -4 * Math.cos(heading) });
            e.state.bonuses = [{ x: 180, y: 573, kind: 'multi' }]; e.step(STEP);
            check(e.state.balls.length === 3, 'two new balls');
            for (const [index, angle] of [[1, -0.4], [2, 0.4]] as const) {
                const ball = e.state.balls[index];
                check(ball && Math.abs(ball.vx - 4 * Math.sin(heading + angle)) < 1e-12 && Math.abs(ball.vy + 4 * Math.cos(heading + angle)) < 1e-12, 'exact rotated vector and speed');
            }
        }
    },
    'K-MEC-17 position exacte de sortie du portail': (E = Engine) => {
        // Contact at the end of the tick: no remaining travel can hide an exit offset.
        const e = setup(E, [tile({ kind: 'portal' }), tile({ x: 250, y: 180, kind: 'portal' }), tile({ x: 20 })], { x: 114, y: 90, vx: 0, vy: 4 });
        e.step(STEP); const ball = e.state.balls[0];
        check(e.events.includes('portal') && ball && ball.x === 264 && ball.y === 205 && ball.vx === 0 && ball.vy === 4, 'exit at partner center, one pixel below radius clearance');
    },
};
