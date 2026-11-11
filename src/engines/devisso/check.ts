import { CRATE_HALF, coveredBy, initial, plateDistance, screwXY, type Board } from './rules';
/** Layout checks shared by the offline search and the validator: what a player reads must be unambiguous.
 *   - holes stay on the board (x 0–7, y 0–8, with the plates' own margin);
 *   - two plates of one layer never overlap;
 *   - two screws closer than 0.95 (a finger's width) only when one of them starts covered (stacked screws);
 *   - a plate above a screw either covers it or leaves it free with a margin (free screws are drawn on top). */
export const MIN_GAP = 0.95;
export const CLEAR = 0.1;
export function layoutProblems(board: Board): string[] {
    const s = initial(board), out: string[] = [];
    const pos = board.screws.map((_, i) => screwXY(board, s, i));
    pos.forEach(([x, y], i) => { if (x < -0.3 || x > 7.3 || y < -0.3 || y > 8.3) out.push(`vis ${String(i)} hors plateau (${String(x)}, ${String(y)})`); });
    for (let x = -1; x <= 8.01; x += 0.1) for (let y = -1; y <= 9.01; y += 0.1) {
        const layers = new Map<number, number>();
        board.plates.forEach((p, k) => { if (plateDistance(board, s, k, x, y) < -0.03) layers.set(p.z, (layers.get(p.z) ?? 0) + 1); });
        for (const [z, n] of layers) if (n > 1) { out.push(`chevauchement couche ${String(z)} vers (${x.toFixed(1)}, ${y.toFixed(1)})`); x = 99; y = 99; }
    }
    const z = (i: number): number => board.plates[board.screws[i]?.plate ?? 0]?.z ?? 0;
    for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const [xi, yi] = pos[i] ?? [0, 0], [xj, yj] = pos[j] ?? [0, 0];
        if (Math.hypot(xi - xj, yi - yj) >= MIN_GAP) continue;
        const hidden = (k: number): boolean => { const c = coveredBy(board, s, k); return c.plates.length + c.crates.length > 0; };
        if (z(i) === z(j) || (!hidden(i) && !hidden(j))) out.push(`vis ${String(i)} et ${String(j)} trop proches`);
    }
    pos.forEach(([x, y], i) => {
        board.plates.forEach((p, k) => {
            if (p.z <= z(i)) return;
            const d = plateDistance(board, s, k, x, y);
            if (Math.abs(d) < CLEAR) out.push(`vis ${String(i)} au bord de la plaque ${String(k)} (${d.toFixed(2)})`);
        });
        board.crates.forEach((c, k) => {
            const d = Math.max(Math.abs(x - c.x), Math.abs(y - c.y)) - CRATE_HALF;
            if (Math.abs(d) < CLEAR) out.push(`vis ${String(i)} au bord de la caisse ${String(k)}`);
        });
    });
    return out;
}
