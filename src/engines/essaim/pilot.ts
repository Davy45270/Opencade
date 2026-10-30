import { CANNON_Y, difficulty, type Engine } from './engine';
/** Uses only the visible state and ordinary controls, including charge release. */
export function pilot(e: Engine, frame: number): void {
    const s = e.state;
    e.holdFire(!e.has('charge') || frame % 100 < 92);
    const pickup = s.pickups.find(p => p.y > 450 && p.y < 570);

    const target = s.enemies.filter(p => p.y > 25 && p.y < 440).sort((a,b) => Math.abs(a.x-s.cannon)-Math.abs(b.x-s.cannon))[0] ?? s.boss;
    if (!target && !pickup) return;
    let x = pickup?.x ?? (target?.x ?? s.cannon);
    if (target && !pickup && e.has('bounce')) {
        const travel = (CANNON_Y - 16 - target.y) / 350 * 420;
        let best = 1000;
        for (let aim = 20; aim <= 340; aim += 4) {
            const raw = aim - 8 + travel, folded = ((raw % 688) + 688) % 688;
            const end = 8 + (folded > 344 ? 688-folded : folded), error = Math.abs(end-target.x);
            if (error < best) { best = error; x = aim; }
        }
    }
    // Predictions do not depend on the candidate cannon position.
    const threats: { time: number; x: number }[] = [];
    const diveSpeed = difficulty(e.level).diveSpeed;
    for (const enemy of s.enemies) if (enemy.y > 280) {
        for (const time of [0, 0.15, 0.3, 0.5, 0.8, 1.1]) {
            let ex = enemy.x, ey = enemy.y;
            if (enemy.phase === 'dive') {
                const t = (enemy.age+time*1000)/(1000*560/diveSpeed);
                ex = enemy.originX+(enemy.targetX-enemy.originX)*Math.min(1,t)+Math.sin(t*Math.PI*2)*enemy.curve/4;
                ey = enemy.originY+t*560;
            } else if (enemy.type === 'spiral') {
                const t = (enemy.age+time*1000)/900;
                ex = enemy.homeX+Math.sin(t*3)*Math.min(80,t*18); ey = enemy.homeY+t*65;
            }
            if (Math.abs(ey-CANNON_Y) < 70) threats.push({ time, x: ex });
        }
    }
    const shots: { time: number; x: number }[] = [];
    for (const p of s.shots) {
        if (p.owner !== 'enemy') continue;
        const factor = e.inWave(p.x,p.y) ? (s.beam ? 0.2 : 0.35) : 1;
        const vy = (p.vy ?? (120+e.level*2))*factor, time = Math.max(1/60, (CANNON_Y-p.y)/vy);
        if (p.y > 564 || time > 1.3) continue;
        if (e.has('magnet') && p.y > 380) continue;
        shots.push({ time, x: p.x+(p.vx ?? 0)*time*factor });
    }
    let safest = s.cannon, bestScore = Infinity;
    for (let candidate = 20; candidate <= 340; candidate += 5) {
        let cost = Math.abs(candidate-x) * 0.12 + Math.abs(candidate-s.cannon) * 0.02;
        for (const shot of shots) {
            const playerX = s.cannon+Math.sign(candidate-s.cannon)*Math.min(Math.abs(candidate-s.cannon),300*shot.time);
            cost += Math.max(0,42-Math.abs(playerX-shot.x))*12/(shot.time+0.15);
        }
        for (const threat of threats) {
            const px = s.cannon+Math.sign(candidate-s.cannon)*Math.min(Math.abs(candidate-s.cannon),300*threat.time);
            cost += Math.max(0,65-Math.abs(px-threat.x))*25;
        }
        if (cost < bestScore) { bestScore = cost; safest = candidate; }
    }
    e.moveTo(safest);
}
