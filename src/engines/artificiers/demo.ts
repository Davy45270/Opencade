import { Engine, chooseShot } from './engine';
export function createDemo(seed = 220) {
    const engine = new Engine(1, seed, 'duo'); let restarts = 0;
    return {
        engine,
        get restarts() { return restarts; },
        step() {
            if (engine.status !== 'playing') { restarts++; engine.loadLevel((restarts % 3) * 10 + 1, seed + restarts, 'duo'); }
            if (engine.phase === 'aim') { const s = chooseShot(engine, 1); engine.aim(s.angle, s.power); engine.selectWeapon(s.weapon); engine.shoot(); }
            engine.step(100);
        },
    };
}
