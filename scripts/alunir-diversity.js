import { measureDiversity } from './diversity-metrics.js';
export function similarity(a, b) {
    // Ordered Jaccard: longest common subsequence / ordered union.
    // Deduplicate prolonged encounters, while preserving their first occurrence.
    const x = [...new Set(a)], y = [...new Set(b)];
    const previous = Array(y.length + 1).fill(0);
    for (const value of x) {
        let diagonal = 0;
        for (let j = 1; j <= y.length; j++) {
            const old = previous[j];
            previous[j] = value === y[j - 1] ? diagonal + 1 : Math.max(previous[j], previous[j - 1]);
            diagonal = old;
        }
    }
    const common = previous[y.length];
    return common / (x.length + y.length - common || 1);
}
/** Exact commands at the same simulated tick, divided by the longer flight.
 * Run lengths carry duration, including coast and sustained thrust. No labels.
 */
export function controlSimilarity(a, b) {
    let i = 0, j = 0, left = a[0]?.[1] ?? 0, right = b[0]?.[1] ?? 0, common = 0;
    const duration = runs => runs.reduce((sum, [, count]) => sum + count, 0);
    while (i < a.length && j < b.length) {
        const count = Math.min(left, right);
        if (a[i][0] === b[j][0]) common += count;
        left -= count; right -= count;
        if (!left) left = a[++i]?.[1] ?? 0;
        if (!right) right = b[++j]?.[1] ?? 0;
    }
    return common / (Math.max(duration(a), duration(b)) || 1);
}
export function measureAlunir(rows) {
    const mechanics = new Set(rows.flatMap(r => r.mechanics));
    const pairs = [];
    for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i], b = rows[j];
        const mechanics = similarity(a.mechanics, b.mechanics), controls = controlSimilarity(a.controls ?? [], b.controls ?? []);
        pairs.push({ a: i + 1, b: j + 1, mechanics, controls, similarity: Math.max(mechanics, controls) });
    }
    const repeatedStars = rows.flatMap((r, i) => rows.slice(Math.max(0, i - 2), i).some(p => p.star === r.star) ? [i + 1] : []);
    const maxSimilarity = Math.max(0, ...pairs.map(p => p.similarity));
    return { valid: maxSimilarity <= 0.5 && mechanics.size >= 10 && repeatedStars.length === 0, maxSimilarity, mechanicCount: mechanics.size, repeatedStars, pairs, levels: rows };
}

// Alunir descriptors: the terrain profile alone is flat on every level since the authored
// campaign (pass 108), so the inventory also reads what each flight plan actually asks for:
// its mechanics, the pads (role, position, width), the mission points those mechanics use
// (beacon, castaway, transit rings, local field zones) and the entry (spawn, height, drift).
const bin = v => Math.floor(v / 12);
/** Field zones of `fieldAt` and the obstacles each mechanic adds, as fixed tokens. */
const ZONES = { gravite: 'zone:light:110-300x180-440', tunnel: 'zone:wind:y240-380', geyser: 'zone:geyser:130-230x300-480', meteores: 'zone:comets', grotte: 'zone:cave', glace: 'zone:ice', mobile: 'zone:moving-pad' };
export function alunirFeatures(engine, data) {
    const s = engine.snapshot(), plan = engine.plan(), elements = new Set(['terrain', 'landing-pad', 'thrust', 'fuel']), layout = [];
    if (data.wind) elements.add('wind'); if (data.gust) elements.add('gust');
    for (const m of plan.mechanics) elements.add(`mechanic:${m}`);
    // Fixed screen bins, not per-level rescaling: retain relief and pad width.
    for (let x = 0; x <= 360; x += 12) {
        const p = s.terrain.points; let i = 0; while (i < p.length - 2 && p[i + 1].x < x) i++;
        const a = p[i], b = p[i + 1], y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
        layout.push(`${x}:${bin(y)}`);
    }
    for (const pad of s.terrain.pads) layout.push(`pad:${pad.role ?? 'arrival'}:${bin(pad.x)},${bin(pad.y)}:${bin(pad.width)}:x${pad.multiplier}`);
    if (plan.mechanics.includes('balise')) layout.push(`beacon:${bin(plan.beacon[0])},${bin(plan.beacon[1])}`);
    if (plan.mechanics.includes('secours')) layout.push(`rescue:${bin(plan.rescue[0])},${bin(plan.rescue[1])}`);
    for (const [x, y] of plan.route) layout.push(`ring:${bin(x)},${bin(y)}`);
    for (const m of plan.mechanics) if (ZONES[m]) layout.push(ZONES[m]);
    layout.push(`spawn:${bin(plan.spawn)},${bin(plan.startY)}`);
    const params = { width: data.width, fuel: data.fuel, offset: data.offset, padY: plan.y, startY: plan.startY, vx: plan.vx, vy: plan.vy, padMultiplier: s.terrain.pads[0].multiplier, layoutCells: layout.length };
    return { elements: [...elements].sort(), layout, params };
}
/** Initial flight plans only (no pilot): enough to tell authored levels apart. */
export function alunirDiversity(mod) {
    return measureDiversity(mod.LEVELS.map((_, level) => {
        const e = new mod.Engine(); e.loadLevel(level, 28);
        const f = alunirFeatures(e, mod.difficulty(level));
        return { level: level + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
