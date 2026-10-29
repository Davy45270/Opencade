const CLONE = 0.08, FLAT = 0.08;
const mean = a => a.length ? a.reduce((s,x) => s+x,0)/a.length : 0;
export const jaccard = (a,b) => { const x=new Set(a),y=new Set(b); return 1-[...x].filter(v=>y.has(v)).length/(new Set([...x,...y]).size||1); };
export function measureDiversity(rows, layoutMetric = jaccard) {
    const available = rows.filter(r => !r.unavailable), keys = Object.keys(available[0].parameters);
    const ranges = Object.fromEntries(keys.map(k => [k, { min: Math.min(...available.map(r => r.parameters[k])), max: Math.max(...available.map(r => r.parameters[k])) }]));
    for (const r of available) r.normalizedParameters = Object.fromEntries(keys.map(k => [k, ranges[k].max === ranges[k].min ? 0 : (r.parameters[k] - ranges[k].min) / (ranges[k].max - ranges[k].min)]));
    const varyingKeys = keys.filter(k => ranges[k].max !== ranges[k].min);
    const seen = new Set(), novelty = [], transitions = []; let gap = 0, maxGap = 0;
    for (const [i, r] of available.entries()) {
        r.newElements = r.elements.filter(x => !seen.has(x)); r.elements.forEach(x => seen.add(x));
        if (r.newElements.length) novelty.push({ level: r.level, elements: r.newElements, baseline: i === 0 });
        if (i) { gap = r.newElements.length ? 0 : gap + 1; maxGap = Math.max(maxGap, gap);
            const prev = available[i - 1], parameterDistance = mean(varyingKeys.map(k => Math.abs(r.normalizedParameters[k] - prev.normalizedParameters[k])));
            const layoutDistance = layoutMetric(r.layout, prev.layout);
            transitions.push({ from: prev.level, to: r.level, parameterDistance, layoutDistance, distance: (parameterDistance + layoutDistance) / 2, clone: (parameterDistance + layoutDistance) / 2 < CLONE });
        }
    }
    // Maximal windows with <= FLAT range in EVERY normalized parameter, no new element.
    const plateaus = [];
    for (let start = 1; start < available.length; start++) {
        let end = start;
        while (end < available.length && !available[end].newElements.length && keys.every(k => {
            const v = available.slice(start, end + 1).map(r => r.normalizedParameters[k]); return Math.max(...v) - Math.min(...v) <= FLAT + 1e-12;
        })) end++;
        if (end - start >= 3 && !plateaus.some(p => p.from <= available[start].level && p.to >= available[end - 1].level)) plateaus.push({ from: available[start].level, to: available[end - 1].level, length: end - start });
    }
    const noveltyCount = novelty.filter(n => !n.baseline).length, cloneShare = transitions.filter(t => t.clone).length / transitions.length;
    const score = Math.round(1000 * (0.5 * cloneShare + 0.25 * (1 - noveltyCount / (available.length - 1)) + 0.25 * maxGap / (available.length - 1))) / 10;
    return { coverage: `${available.length}/30`, partial: available.length !== 30, ranges, novelty, noveltyCount, noveltyLevels: novelty.filter(n => !n.baseline).map(n => n.level), maxGapWithoutNovelty: maxGap, cloneShare, clones: transitions.filter(t => t.clone), transitions, plateaus, longestPlateau: Math.max(0, ...plateaus.map(p => p.length)), plateauBasis: 'normalized configuration proxy; not a measured human difficulty plateau', score, levels: rows };
}
