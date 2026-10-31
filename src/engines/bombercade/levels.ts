export const GAME_NAME = 'Bombercade';
export type Mechanic = 'special' | 'reinforced' | 'conveyor' | 'portal' | 'ice' | 'gold' | 'sudden' | 'candy';
export const introductions: readonly [number, Mechanic][] = [[3, 'special'], [7, 'reinforced'], [11, 'conveyor'], [15, 'portal'], [18, 'ice'], [21, 'gold'], [24, 'sudden'], [27, 'candy']];
export function difficulty(level: number) {
    if (!Number.isInteger(level) || level < 0 || level >= 30) throw new RangeError('Niveau');
    return { opponents: 1 + Math.floor(level / 8), aggression: level === 18 ? .59 : .25 + level * .018, density: .28 + level * .005,
        drops: .7 - level * .012, hearts: level < 10 ? 2 : 1, deadline: 150000 - level * 2000 };
}
export function layoutAt(layout: number, x: number, y: number): boolean {
    return [x === 5, y === 5 || y === 9, x === 3 || x === 7, y % 4 === 3, (x + y) % 4 === 0, (x * 3 + y) % 5 === 0][layout] ?? false;
}
export const layoutNames = ['Clairières', 'Éperons', 'Couronnes', 'Galeries', 'Éventails', 'Traverses'] as const;
export const LEVELS = Array.from({ length: 30 }, (_, i) => {
    const latest = introductions.filter(([at]) => at <= i).at(-1);
    // An introduction stands alone. The following rooms combine everything learned.
    const mechanics = latest?.[0] === i ? [latest[1]] : introductions.filter(([at]) => at <= i).map(([, m]) => m);
    return { name: `${layoutNames[i % 6] ?? 'Clairières'} ${String(i + 1)}`, layout: i % 6,
        arena: i < 8 ? 'jungle' : i < 16 ? 'château' : i < 24 ? 'volcan' : 'sucré', mechanics, ...difficulty(i) };
});
