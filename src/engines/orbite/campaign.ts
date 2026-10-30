export type Mechanic = 'rotor' | 'split' | 'asteroid' | 'gravity' | 'stealth' | 'repair' | 'satellite' | 'spiral';
export type Formation = 'rectangle' | 'chevron' | 'wings' | 'arch' | 'diamond' | 'lanes';
export interface Stage { form: Formation; mechanics: Mechanic[]; rest: boolean; boss: number }
const forms: Formation[] = [
    'rectangle', 'chevron', 'wings', 'arch', 'diamond', 'lanes',
    'chevron', 'diamond', 'arch', 'wings', 'lanes', 'rectangle',
    'arch', 'wings', 'diamond', 'lanes', 'rectangle', 'chevron',
    'diamond', 'arch', 'lanes', 'wings', 'chevron', 'rectangle',
    'lanes', 'diamond', 'arch', 'chevron', 'wings', 'diamond',
];
const kits: Mechanic[][] = [
    [], [], [], ['rotor'], ['rotor'], [],
    ['split'], ['rotor', 'split'], ['split'], ['asteroid', 'rotor'],
    ['asteroid'], ['asteroid', 'split'], ['gravity'], ['gravity', 'rotor'], ['gravity', 'split'],
    ['stealth'], ['stealth'], ['stealth', 'asteroid'], ['repair', 'rotor'], ['repair', 'gravity'],
    ['repair'], ['satellite', 'split'], ['satellite', 'stealth'], ['satellite', 'repair'],
    ['spiral', 'gravity'], ['spiral'], ['spiral', 'rotor'], ['spiral', 'satellite', 'asteroid'],
    ['spiral', 'repair', 'stealth'], ['rotor', 'split', 'asteroid', 'gravity', 'stealth', 'repair', 'satellite', 'spiral'],
];
export function stage(level: number): Stage {
    return { form: forms[level] ?? 'rectangle', mechanics: kits[level] ?? [], rest: [5, 10, 16, 20, 25].includes(level), boss: (level + 1) % 5 === 0 ? (level + 1) / 5 : 0 };
}
export function formation(form: Formation, row: number, column: number, columns: number): { x: number; y: number } {
    const u = column - (columns - 1) / 2, a = Math.abs(u);
    switch (form) {
    case 'rectangle': return { x: 180 + u * 28, y: 100 + row * 30 };
    case 'chevron': return { x: 180 + u * 31, y: 100 + row * 28 + a * 15 };
    case 'wings': return { x: 180 + u * 27 + Math.sign(u) * 16, y: 110 + row * 29 - a * 9 };
    case 'arch': return { x: 180 + u * 30, y: 100 + row * 31 + (3 - a) * 17 };
    case 'diamond': return { x: 180 + u * (row === 1 ? 34 : 23), y: 95 + row * 36 + a * 11 };
    case 'lanes': return { x: 180 + u * 36, y: 100 + row * 35 + column % 2 * 25 };
    }
}
