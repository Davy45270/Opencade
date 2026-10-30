import { ArtPool, ensureArtTextures } from '../src/games/essaim/art-pool';
import { createDemo } from '../src/engines/essaim/demo';
function check(ok: boolean, message: string): void { if (!ok) throw new Error(message); }
export function checkArtPool(): void {
    const demo = createDemo(458), pool = new ArtPool(), slots = [...pool.particles];
    let peak = 0;
    for (let i = 0; i < 2000; i++) {
        demo.step();
        const s = demo.engine.state;
        for (const e of s.enemies) pool.burst(e.x, e.y, false, i % 7 === 0);
        pool.step(100, false);
        peak = Math.max(peak, pool.active);
        check(pool.particles.length === 96 && pool.active <= 96, 'Budget littéral 96 dépassé');
        check(pool.particles.every((p, index) => p === slots[index]), 'Le pool a remplacé un objet');
    }
    check(peak === 96, 'La pression de test doit saturer le budget');
    pool.step(0, true);
    for (let i = 0; i < 2000; i++) {
        pool.burst(180, 200, true, true); pool.step(16, true);
        check(pool.active <= 4, 'Budget réduit littéral 4 dépassé');
        check(pool.particles.every(p => !p.active || p.kind === 'ring'), 'Particules mobiles en mode réduit');
    }
    pool.step(1000, true); check(pool.active === 0, 'Les effets ne sont pas libérés');
    pool.burst(10, 10, false); pool.clear(); check(pool.active === 0, 'Reset incomplet');
}
export function checkArtTextures(): void {
    const textures = new Map<string, number>(); let calls = 0;
    const ensure = (): void => { ensureArtTextures(key => textures.has(key), (key, color) => {
        check(!textures.has(key), 'Texture générée plusieurs fois'); textures.set(key, color); calls++;
    }); };
    for (let i = 0; i < 2000; i++) ensure();
    check(calls === 2 && textures.size === 2, 'Deux textures, une génération chacune, même après réentrée');
}
