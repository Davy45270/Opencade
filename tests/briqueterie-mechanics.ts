import { Engine, STEP, type Brick, type Ball } from '../src/engines/briqueterie/engine';
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
};
