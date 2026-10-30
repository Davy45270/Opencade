import { type Engine, CANNON_Y, difficulty } from './engine';
/** Ordinary controls only. Lead a moving target and evade imminent cannon hits. */
export function pilot(e: Engine): void {
    const s = e.state;
    const candidates = e.bottomProbes().sort((a, b) => b.y - a.y || a.id - b.id);
    const p = candidates.find(p => e.visible(p) && p.kind === 'repair') ?? candidates.find(p => e.visible(p)) ?? candidates[0];
    let target = 180; const aimY = p?.y ?? s.boss?.y ?? 80;
    if (p) {
        const time = Math.max(0, (CANNON_Y - 29 - p.y) / 480);
        const left = Math.min(...s.probes.map(p => p.x)), right = Math.max(...s.probes.map(p => p.x));
        let dx = s.direction * e.speed() * time;
        if (right + dx > 337) dx = 2 * (337 - right) - dx;
        if (left + dx < 23) dx = 2 * (23 - left) - dx;
        target = p.x + dx;
    } else if (s.boss) {
        const b = s.boss, flight = (CANNON_Y - 33 - b.y) / 480 * 60;
        target = 180 + Math.sin((s.ticks + flight) / (b.phase === 2 ? 48 : 85)) * 110;
    }
    // Invert the same deterministic field integration for the initial shot abscissa.
    if ((s.wells?.length ?? 0) + (s.asteroids?.length ?? 0) > 0) {
        let best = Infinity, solution = target;
        for (let start = 18; start <= 342; start += 3) {
            let x = start, y = CANNON_Y - 15, vx = 0, deflected = false;
            while (y > aimY + 14) {
                for (const well of s.wells ?? []) if (Math.abs(y - well.y) < 100) vx = Math.max(-90, Math.min(90, vx + (well.x - x) * 0.012));
                for (const rock of s.asteroids ?? []) if (!deflected && Math.hypot(x - rock.x, y - rock.y) < 24) { vx = x < rock.x ? -110 : 110; deflected = true; }
                x += vx / 60; y -= 8;
            }
            const error = Math.abs(x - target) + Math.abs(start - s.cannon) * 0.001;
            if (error < best) { best = error; solution = start; }
        }
        target = solution;
    }
    const satellite = s.satellite;
    if (satellite) {
        const threat = s.shots.filter(p => {
            if (p.owner !== 'enemy' || p.y >= satellite.y) return false;
            const time = (satellite.y - p.y) / difficulty(e.level).enemySpeed;
            const future = 180 + Math.sin((s.ticks + time * 60) / 100) * 55;
            return Math.abs(p.x + (p.vx ?? 0) * time - future) < 20;
        }).sort((a, b) => b.y - a.y)[0];
        if (threat) target = threat.x + (threat.vx ?? 0) * (CANNON_Y - 15 - threat.y) / (480 + difficulty(e.level).enemySpeed);
    }
    const danger = s.shots.find(p => p.owner === 'enemy' && p.y > 500 && p.y < 608 && Math.abs(p.x - s.cannon) < 24);
    if (danger && s.invulnerable === 0) target = s.cannon + (s.cannon < danger.x ? -42 : 42);
    e.moveTo(Math.round(target)); e.holdFire(true);
}
