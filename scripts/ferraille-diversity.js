// Features are read from generated objects, never from the level's discovery label.
export function ferrailleFeatures(s) {
    const elements = new Set(['shoot', 'jump', 'checkpoint']);
    for (const [items, prefix] of [[s.blocks, 'block'], [s.enemies, 'enemy'], [s.bonuses, 'bonus']]) for (const item of items) elements.add(`${prefix}:${item.kind}`);
    if (s.platforms.some(p => p.y < 180)) elements.add('platform:high-route');
    if (s.tiles[12 * s.columns]) elements.add('terrain:descending-steps');
    if (s.vehicle) elements.add('vehicle:auto-scroll-jump');
    if (s.cages.length) elements.add('cage:shoot-to-rescue');
    if (s.boss) elements.add(`boss:${s.boss.pattern}`);
    const layout = [];
    s.tiles.forEach((v, i) => { if (v) layout.push(`${i % s.columns},${Math.floor(i / s.columns)}`); });
    for (const p of s.platforms) layout.push(`platform:${p.x},${p.y}`);
    for (const c of s.cages) layout.push(`cage:${c.x},${c.y}`);
    return { elements: [...elements].sort(), layout, params: { columns: s.columns, platforms: s.platforms.length, enemies: s.enemies.length, bonuses: s.bonuses.length, layoutCells: layout.length } };
}
