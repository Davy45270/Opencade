// Ordinary paddle/launch inputs only. Long searches belong in the Node validator.
export function controller(e, frame, variant = 0) {
    const s = e.state;
    const targets = s.bricks.filter(b => !b.solid);
    const keys = targets.filter(b => b.kind === 'key');
    const pool = keys.length ? keys : targets;
    if (s.ready) {
        const b = pool[(variant + e.level) % pool.length];
        return b ? b.x + b.w / 2 : 180;
    }
    const ball = [...s.balls].filter(b => b.vy > 0).sort((a, b) => b.y - a.y)[0] ?? s.balls[0];
    if (!ball) return 180;
    if (ball.vy <= 0) return ball.x;
    let x = ball.x + ball.vx * Math.max(0, (580 - ball.y) / ball.vy);
    x = ((x - 6) % 696 + 696) % 696;
    x = 6 + (x > 348 ? 696 - x : x);
    const target = pool[Math.floor(frame / 700 + variant * 7 + e.level * 3) % pool.length];
    if (!target) return x;
    const angle = Math.atan2(target.x + target.w / 2 - x, 580 - target.y);
    // Small deterministic variation prevents corner/solid-brick periodic orbits.
    const offset = Math.max(-0.85, Math.min(0.85, angle / (Math.PI / 3) + Math.sin(frame / 311 + variant) * 0.12));
    return x - offset * s.width / 2;
}
export function attempt(Engine, level, seed, variant = 0, cap = 36000) {
    const e = new Engine(level, seed), inputs = [], witnesses = {};
    let last = -1, frame = 0;
    while (e.status === 'playing' && frame < cap) {
        const x = frame % 4 === 0 || sReady(e) ? Math.round(controller(e, frame, variant) * 100) / 100 : last;
        if (x !== last) { inputs.push([frame, x]); last = x; }
        e.move(x); e.launch(); e.step(1000 / 60); frame++;
        for (const event of e.events) witnesses[event] ??= frame;
    }
    return { level: level + 1, seed, variant, frames: frame, inputs, witnesses, status: e.status, score: e.state.score, lives: e.state.lives };
}

function sReady(e) { return e.state.ready; }
