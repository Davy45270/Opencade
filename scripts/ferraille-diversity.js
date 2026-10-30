// Features are read from generated objects, never from the level's discovery label.
export function ferrailleFeatures(s) {
    const elements = new Set(['shoot', 'jump', 'checkpoint']);
    for (const [items, prefix] of [[s.blocks, 'block'], [s.enemies, 'enemy'], [s.bonuses, 'bonus']]) for (const item of items) elements.add(`${prefix}:${item.kind}`);
    const modules = (s.modules ?? []).filter(m => !m.preview).sort((a, b) => a.x - b.x);
    for (const m of modules) elements.add(`mechanic:${m.kind}`);
    for (let i = 1; i < modules.length; i++) elements.add(`encounter:${modules[i - 1].kind}>${modules[i].kind}`);
    if (s.platforms.some(p => p.y < 180)) elements.add('platform:high-route');
    if (s.tiles[12 * s.columns]) elements.add('terrain:descending-steps');
    if (s.vehicle) elements.add('vehicle:auto-scroll-jump');
    if (s.cages.length) elements.add('cage:shoot-to-rescue');
    if (s.boss) elements.add(`boss:${s.boss.pattern}`);
    const layout = modules.map(m => `mechanism:${m.kind}:${m.x},${m.y},${m.w}`);
    s.tiles.forEach((v, i) => { if (v) layout.push(`${i % s.columns},${Math.floor(i / s.columns)}`); });
    for (const p of s.platforms) layout.push(`platform:${p.x},${p.y}`);
    for (const c of s.cages) layout.push(`cage:${c.x},${c.y}`);
    return { elements: [...elements].sort(), layout, params: { ...Object.fromEntries(['conveyor', 'piston', 'bridge', 'lift', 'chain', 'gate', 'secret', 'crate', 'tower', 'hut', 'spotlight', 'rails', 'wind', 'lava', 'tunnel', 'spring'].map(kind => [`module:${kind}`, modules.filter(m => m.kind === kind).length])), columns: s.columns, platforms: s.platforms.length, enemies: s.enemies.length, bonuses: s.bonuses.length, layoutCells: layout.length } };
}

/** Ordered longest common subsequence: reordering an encounter changes the experience. */
export function sequenceSimilarity(a, b) {
    let previous = Array(b.length + 1).fill(0);
    for (const x of a) {
        const next = [0];
        for (let j = 0; j < b.length; j++) next.push(x === b[j] ? previous[j] + 1 : Math.max(previous[j + 1], next[j]));
        previous = next;
    }
    return previous[b.length] / Math.max(a.length, b.length, 1);
}
export function measureRepetition(levels) {
    const pairs = [], errors = [], used = new Set(levels.flatMap(l => l.modules));
    for (let i = 0; i < levels.length; i++) {
        const current = levels[i];
        if (current.modules[0] !== current.star) errors.push(`level ${i + 1}: missing featured encounter`);
        for (const previous of levels.slice(Math.max(0, i - 2), i)) if (previous.star === current.star) errors.push(`level ${i + 1}: repeated featured module`);
        for (let j = 0; j < i; j++) {
            const moduleSimilarity = sequenceSimilarity(levels[j].modules, current.modules);
            const actionSimilarity = sequenceSimilarity(levels[j].actions, current.actions);
            pairs.push({ from: j + 1, to: i + 1, moduleDistance: 1 - moduleSimilarity, actionDistance: 1 - actionSimilarity, distance: 1 - (moduleSimilarity + actionSimilarity) / 2 });
            if (moduleSimilarity > 0.5) errors.push(`levels ${j + 1}/${i + 1}: module overlap exceeds 50%`);
        }
    }
    if (used.size < 14) errors.push('fewer than 14 physical modules');
    return { passed: errors.length === 0, errors, used: used.size, maxModuleSimilarity: Math.max(0, ...pairs.map(p => 1 - p.moduleDistance)), pairs, consecutive: pairs.filter(p => p.to === p.from + 1) };
}
