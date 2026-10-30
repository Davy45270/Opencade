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
