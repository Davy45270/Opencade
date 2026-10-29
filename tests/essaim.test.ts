import { expect, test } from 'vitest';
import { Engine, difficulty, TICK, CANNON_Y, type Enemy } from '../src/engines/essaim/engine';
function first(e: Engine): Enemy { const p = e.state.enemies[0]; if (!p) throw new Error("Ennemi absent"); return p; }
function enemy(e: Engine, phase: Enemy['phase'] = 'formation', type: Enemy['type'] = 'scout'): Enemy { return { ...first(e), x: 180, y: 400, homeX: 180, homeY: 400, phase, age: 0, type, hp: 1, captured: false, curve: 0, originX: 180, originY: 400 }; }
function prepared(level = 0): Engine { const e = new Engine(level); e.state.enemies = [enemy(e)]; e.state.wave = difficulty(level).waves; e.state.enemyTimer = e.state.diveTimer = 1e6; return e; }
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
test('G07 nacelle libérée et double canon temporaire', () => { const e = prepared(); e.state.enemies.push({ ...enemy(e), id: 99, x: 300, homeX: 300 }); first(e).captured = true; hit(e); expect(e.state.double).toBe(8000); e.fire(); expect(e.state.shots.filter(p => p.owner === 'player')).toHaveLength(2); e.step(8000); expect(e.state.double).toBe(0); });
test('G08 scindeur produit exactement deux fragments sans récursion', () => { const e = prepared(); first(e).type = 'split'; hit(e); expect(e.state.enemies).toHaveLength(2); expect(e.state.enemies.every(p => p.type === 'fragment' && p.phase === 'dive' && p.hp === 1)).toBe(true); });
test('G09 défi sans tirs ennemis et bonus précision', () => { const e = prepared(4); e.state.enemyTimer = 0; e.step(TICK); expect(e.state.shots).toHaveLength(0); e.state.fired = 2; e.state.hits = 0; hit(e); expect(e.state.score).toBe(110); });
test('G10 victoire après dernière vague et défaite sans vie', () => { const e = prepared(); hit(e); expect(e.status).toBe('won'); const b = prepared(); b.state.lives = 1; b.state.shots = [{ x: 180, y: CANNON_Y - 12, owner: 'enemy' }]; b.step(TICK); expect(b.status).toBe('lost'); });
test('G11 chaque paramètre croît sur trente niveaux', () => { const first = difficulty(0), last = difficulty(29); for (const key of Object.keys(first) as (keyof typeof first)[]) { expect(last[key]).toBeGreaterThan(first[key]); for (let i = 1; i < 30; i++) expect(difficulty(i)[key]).toBeGreaterThanOrEqual(difficulty(i - 1)[key]); } });
test('G12 cadence indépendante, entrées horodatées et témoin graine', () => { const a = new Engine(), b = new Engine(); for (let i = 0; i < 20; i++) { a.moveTo(i * 13); b.moveTo(i * 13); a.holdFire(true); b.holdFire(true); a.step(100); for (let j = 0; j < 6; j++) b.step(TICK); } expect(a.snapshot()).toEqual(b.snapshot()); expect(new Engine(0, 9).snapshot()).not.toEqual(new Engine().snapshot()); expect(() => JSON.stringify(a.snapshot())).not.toThrow(); });
test('G10 G11 politique viser et esquiver gagne aux niveaux 1, 15 et 30', () => {
    for (const level of [0, 14, 29]) {
        let wins = 0;
        for (const seed of [11, 458, 2026]) {
            const e = new Engine(level, seed); e.holdFire(true);
            for (let tick = 0; tick < 24000 && e.status === 'playing'; tick++) {
                const target = e.state.enemies.filter(p => p.y > 60).sort((a, b) => Math.abs(a.x - e.state.cannon) - Math.abs(b.x - e.state.cannon))[0];
                const diver = e.state.enemies.find(p => p.phase === 'dive' && p.y > 410 && Math.abs(p.x - e.state.cannon) < 65);
                const threat = e.state.shots.find(p => p.owner === 'enemy' && p.y > 440 && Math.abs(p.x - e.state.cannon) < 28);
                if (diver) e.moveTo(diver.x < 180 ? 330 : 30);
                else if (threat) e.moveTo(e.state.cannon < 180 ? e.state.cannon + 60 : e.state.cannon - 60);
                else if (target) e.moveTo(target.x);
                e.step(TICK);
            }
            if (e.status === 'won') wins++;
        }
        expect(wins, `niveau ${String(level + 1)}`).toBeGreaterThanOrEqual(1);
    }
});
test('G07 G08 génération sans superposition, un capteur par vague et fréquence des types', () => {
    let armor = 0, split = 0, count = 0;
    for (let seed = 0; seed < 200; seed++) {
        const e = new Engine(29, seed), cells = new Set<string>();
        expect(e.state.enemies.filter(p => p.captured)).toHaveLength(1);
        for (const p of e.state.enemies) { expect(p.homeX).toBeGreaterThan(30); expect(p.homeX).toBeLessThan(330); cells.add(`${String(p.homeX)},${String(p.homeY)}`); if (p.type !== 'sensor') { count++; if (p.type === 'armor') armor++; if (p.type === 'split') split++; } }
        expect(cells.size).toBe(e.state.enemies.length);
    }
    expect(armor / count).toBeGreaterThan(0.25); expect(armor / count).toBeLessThan(0.33);
    expect(split / count).toBeGreaterThan(0.17); expect(split / count).toBeLessThan(0.25);
});
