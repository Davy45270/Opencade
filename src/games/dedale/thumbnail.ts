import { createDemo } from '../../engines/dedale/demo';
import { Engine, WIDTH, HEIGHT } from '../../engines/dedale/engine';
import { route } from '../../engines/dedale/solver';
import { CELL, LEFT, TOP, mazeScenery, mazeWorld, seedLight, sunLight, wispArt } from './art';
import { bake, bakeArt, castSprite, thumbnailHero } from '../thumbnail-art';
import type { Thumbnail } from '../thumbnail';
export { createDemo };
/** The game's maze at its own scale (360 × 640), framed on the hero: same sky, hedges,
 * lights, wisps and character. The maze is baked per board, each light and wisp once. */
const K = 160 / 360, VIEW = 120 / K, RES = K * 2, PAD = (24 - CELL) / 2;
/** The card plays the first maze (the corridors a new player meets) with the game's engine and
 * solver, at the attract mode's pace; it restarts on a win, a loss or after 300 steps. */
function cardDemo(seed: number) {
    const engine = new Engine();
    let restarts = 0, frame = 0, turn = -1;
    engine.loadLevel(0, seed);
    return {
        engine,
        get restarts() { return restarts; },
        step() {
            if (engine.status !== 'playing' || frame >= 300) { engine.loadLevel(0, seed); frame = 0; turn = -1; restarts++; }
            frame++;
            const current = engine.state.journey?.turn ?? 0;
            if (current !== turn) { turn = current; const first = route(engine)?.[0]; if (first) engine.input(first); }
            engine.step(1000 / 15);
        },
    };
}
export function createThumbnail(seed = 28): Thumbnail {
    const demo = cardDemo(seed), hero = thumbnailHero();
    let frame = 0, camera = -1;
    return { step: () => { demo.step(); frame++; }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        const e = demo.engine, s = e.state, world = mazeWorld(e.level);
        const cell = (i: number): { x: number; y: number } => ({ x: LEFT + (i % WIDTH) * CELL, y: TOP + Math.floor(i / WIDTH) * CELL });
        const heroY = TOP + (s.hero.y + .5) * CELL;
        const target = Math.max(TOP - 8, Math.min(TOP + HEIGHT * CELL + 6 - VIEW, heroY - VIEW / 2));
        camera = camera < 0 ? target : camera + (target - camera) * .3;
        const seen = (y: number): boolean => y + CELL + PAD > camera && y - PAD < camera + VIEW;
        c.save(); c.scale(K, K); c.translate(0, -Math.round(camera));
        bake(c, `dedale-${String(e.level)}-${s.maze.map(open => open ? 1 : 0).join('')}`, 0, 0, 360, 640, RES, k => { mazeScenery(k, s.maze, e.level, s.journey); });
        for (const i of s.seeds) { const p = cell(i); if (seen(p.y)) bake(c, `dedale-seed-${String(world)}`, p.x, p.y, CELL, CELL, RES * 2, k => { seedLight(k, 0, e.level, CELL, 0, 0); }); }
        for (const i of s.suns) { const p = cell(i); if (seen(p.y)) bake(c, 'dedale-sun', p.x - PAD, p.y - PAD, 24, 24, RES * 2, k => { sunLight(k, 0, CELL, PAD, PAD); }); }
        const vulnerable = s.vulnerable > 0;
        for (const w of s.wisps) {
            const p = cell(w.x + w.y * WIDTH);
            if (!seen(p.y)) continue;
            bakeArt(c, `dedale-wisp-${w.kind}-${String(vulnerable)}-${String(w.returning)}-${String(w.wait > 0)}`, p.x - PAD, p.y - PAD, 24, 24, RES * 2, g => { wispArt(g, w, 12, 12, vulnerable); });
        }
        const p = cell(s.hero.x + s.hero.y * WIDTH);
        castSprite(c, hero, 'face', 'concentre', 'marche', frame / 2, p.x + CELL / 2 - 14, p.y + CELL / 2 - 14, 28, RES);
        c.restore();
    } };
}
