/** Pure campaign data. Coordinates are row-major, tiles measure 32 simulation units. */
export const GAME_ID = 'petits-pompiers';
export const GAME_NAME = 'Petits Pompiers';
export const WIDTH = 14, HEIGHT = 9;
export type Tool = 'hose' | 'foam' | 'axe' | 'ladder' | 'kit' | 'megaphone';
export const LEGEND: Readonly<Record<string, string>> = {
    '.': 'road', g: 'grass', H: 'floor', W: 'wall', D: 'door', T: 'tree', '~': 'water',
    X: 'crate', b: 'planks', B: 'blocked-door', '#': 'rubble', U: 'upperWindow', R: 'hydrant', S: 'safe', E: 'exit',
    P: 'start', F: 'fire', V: 'person', C: 'cat', O: 'dog', I: 'injured', '?': 'hidden',
    a: 'axe', l: 'ladder', k: 'kit', m: 'megaphone', f: 'foam', s: 'snow',
};
export const PICKUPS: Readonly<Record<string, Tool>> = { a: 'axe', l: 'ladder', k: 'kit', m: 'megaphone', f: 'foam' };
export type ObjectiveKind = 'extinguish' | 'rescue_person' | 'rescue_animal' | 'heal';
export interface Level {
    id: string; name: string; world: string; novelty: string; map: readonly string[];
    objectives: Partial<Record<ObjectiveKind, number>>;
    spreadIntervalSeconds: number; maxIntensity: number; baseExtinguishUnits: number;
    intensity: number; smoke: boolean; seconds: number;
}
const maps = [
    [
        'gggggggggggggg',
        'gWWWWWggTTgggg',
        'gWHFHWggTggggg',
        'gWHVHWgggggggg',
        'gWWDWWgggggggg',
        'ggg....Cgggggg',
        'gggPR........E',
        'gggS...ggggggg',
        'gggggggggggggg',
    ],
    [
        '...ggTgTgTC...',
        'Tgg....g..gEg.',
        '.g...gWWWWW.gg',
        'T.ggggWVFHW.gT',
        '.g.g.gWHHHWggg',
        '......WWDWW...',
        'gggg.g.g.g...T',
        'ggg.gg.gg.gS.T',
        'g.ggP..gggRg.T',
    ],
    [
        'gWWWWWgg..gg..',
        '.WVFHW........',
        'TWHHHW.T..ggg.',
        '.WWDWW.ggg.g.T',
        'ggT.g..g.T....',
        'T.gEgggg.ggP.g',
        'g.gRgg.ggg..g.',
        '....gg.g.g.T.T',
        '.TgTgggTCS.g.g',
    ],
    [
        'WWWW..........',
        'WHHW..WWWWW.E.',
        'WHHW..WVHHW...',
        'WWDW..WHHHW...',
        '......WWXWW...',
        'TggFgg........',
        'TggggS.....C..',
        '....a.........',
        '.......R...P..',
    ],
    [
        'WWWW.ggggggggg',
        'WHHW.gggWWWWWg',
        'WHHW.gggWHFHWg',
        'WWDW.gggWHHHWg',
        'TTgg.gggWWDUWg',
        '...........g..',
        '....SE........',
        '....l.........',
        'gg.R.C.PgggTTg',
    ],
    [
        'WWWWW..ggggggg',
        'WIFHW..gTTTTgg',
        'WHHHW..ggTgggg',
        'WWDWW...WWWWWW',
        '....P...WHHHHW',
        'ggggggCSWHHHHW',
        'gTkgggggWWDWWW',
        'ggggRggg......',
        'gggggggggggggE',
    ],
    [
        '.gTT.TTTTTT.TT',
        '.Pf.......E..R',
        'TggTT.WWWWWTgg',
        'g..ggTWVFHWT.g',
        '.Tg.TgWHHHWT..',
        'ggg.gTWWDWWTgT',
        'T.TTgggg.Tg..g',
        'gTTT.gTT.TgTTC',
        'g.T.TgTSg.T...',
    ],
    [
        'gggggTWWWWWgTT',
        'TgT.gTW?FHWgT.',
        'g..gTTWHHHWgT.',
        'g.gg.TWWDWWTgg',
        'TTgT.T.TSTTggg',
        'TT..gmTgCTggPg',
        '.R............',
        'TTTE.g.TTgTgTT',
        'gggTTTTTTggT..',
    ],
    [
        '.WWWWWggTTg.TT',
        'TW?FHWTgTTTTTT',
        'TWHHHWg..ggTgT',
        'gWWDWWTTgT.TTT',
        'Tgg.gTggRTgS..',
        'CgF.TTgTgT.TT.',
        '.....P....E...',
        'Tgg..TggTggmTT',
        'TTgg...TTaTT..',
    ],
    [
        'gs.gsgsTsssTs.',
        'sgSF.s...sP..s',
        '.s.s...sWWWWWT',
        'sTss.TssWVFHWs',
        '........WHHHW.',
        's.s.TgssWWDWWs',
        'ss.Tg..sf.sTEs',
        '..gs.T.s.ss.sg',
        '..ggs.s.ORs..s',
    ],
    [
        'S.OssTsgssTass',
        's.sWWWWWW.s.sg',
        's..WHIHHWs.sTs',
        'g.sWHHHHW.s.ss',
        '.T.WW#WWW.sss.',
        'PTsT.gss.sTs.s',
        '...E.F....R...',
        '.gs.k....s.s..',
        '.F.s.ss.T.sT..',
    ],
    [
        'WWWWWssEssssss',
        'WHHHWsssWWWWWW',
        'WHHHWsssWHFVHW',
        'WWDUWsssWHHHHW',
        'ssssssssWWDWWW',
        '..............',
        'TTSs.RFgs..OTT',
        '..............',
        'ssslsssTTPssss',
    ],
    [
        '~WWWWW~~~~~~~~',
        '~WVFHW~~~~~~~~',
        '~WHHHW~~~~~~~~',
        '~WWDWW~~~~....',
        '.......gFg..X.',
        '.......ggg.XX.',
        '...S..f.......',
        'PO.......R..E.',
        '~~~~~....~~~~~',
    ],
    [
        '~~~~.R.WWWWWW.',
        '~~~~...W?FHHW.',
        '~~~~...WHHHHW.',
        '~~~~...WWDWWW.',
        '~~~~..X...X...',
        '~~~~P....f....',
        '~~~~gFgS...E..',
        '~~~~ggg.m.....',
        '~~~~....O.~~~~',
    ],
    [
        '....ggg~~~~~~~',
        '....Fgg~~~....',
        'WWWWW...WWWWWW',
        'WIHHW...W?HHHW',
        'WHHHW...WHHHHW',
        'WWbUW...WWDWWW',
        'OS.gl....EgFg.',
        '..R..akm.Fgg..',
        '..P..~~~~~.XX.',
    ],
] as const;
const novelties = ['premiers secours', 'propagation', 'fumée', 'caisse et hache', 'fenêtre et échelle', 'soin et trousse', 'extincteur', 'appel et personnes cachées', 'combinaison en forêt', 'neige', 'gravats', 'deux bâtiments', 'eau et quai', 'borne éloignée', 'sauvetage combiné'];
// Triple of the slowest recorded challenge pilot, rounded up to 10 s, minimum 60 s.
export const CHALLENGE_SECONDS = [60, 60, 80, 60, 60, 60, 120, 60, 100, 160, 110, 150, 90, 70, 230];
export const LEVELS: readonly Level[] = maps.map((map, i) => {
    const cells = map.join('');
    const count = (symbols: string) => Array.from(cells).filter(c => symbols.includes(c)).length;
    return { id: `secours-${String(i + 1).padStart(2, '0')}`, name: `Secours ${String(i + 1)}`, world: ['quartier résidentiel', 'centre-ville', 'forêt', 'montagne enneigée', 'port'][Math.floor(i / 3)] ?? 'port', novelty: novelties[i] ?? '', map,
        objectives: { extinguish: count('F'), rescue_person: count('VI?U'), rescue_animal: count('CO'), ...(count('I') ? { heal: count('I') } : {}) },
        spreadIntervalSeconds: i === 0 ? 0 : 22 - Math.floor(i / 3) * 2,
        maxIntensity: 3, baseExtinguishUnits: 12, intensity: i < 6 ? 1 : i < 10 ? 2 : 3,
        smoke: i >= 2, seconds: CHALLENGE_SECONDS[i] ?? 600 };
});
export function adjacent(at: number): number[] {
    const x = at % WIDTH, y = Math.floor(at / WIDTH);
    return [y > 0 ? at - WIDTH : -1, x < WIDTH - 1 ? at + 1 : -1, y < HEIGHT - 1 ? at + WIDTH : -1, x > 0 ? at - 1 : -1].filter(p => p >= 0);
}
/** Structural proof includes acquisition of tools before crossing their gates. */
export function validateLevel(level: Level): string[] {
    const errors: string[] = [], cells = level.map.join('');
    if (level.map.length !== HEIGHT || level.map.some(row => row.length !== WIDTH)) return ['dimensions'];
    if (Array.from(cells).some(c => !LEGEND[c])) errors.push('legend');
    for (const c of ['P', 'S', 'E', 'R']) if (Array.from(cells).filter(t => t === c).length !== 1) errors.push(`unique ${c}`);
    if (![level.intensity, level.maxIntensity].every(Number.isInteger) || level.intensity < 1 || level.maxIntensity > 3 || level.intensity > level.maxIntensity ||
        ![level.seconds, level.spreadIntervalSeconds, level.baseExtinguishUnits].every(Number.isFinite) || level.seconds <= 0 || level.spreadIntervalSeconds < 0 || level.baseExtinguishUnits <= 0) errors.push('parameters');
    const seen = new Set<number>(), tools = new Set<Tool>();
    let change = true;
    while (change) {
        change = false;
        const queue = [cells.indexOf('P')];
        const visited = new Set<number>();
        while (queue.length) {
            const at = queue.shift(); if (at === undefined || visited.has(at)) continue;
            visited.add(at);
            const tile = cells[at] ?? 'W';
            if ('W~TU'.includes(tile) || 'XbB#'.includes(tile) && !tools.has('axe')) continue;
            if (!seen.has(at)) { seen.add(at); change = true; }
            const pickup = PICKUPS[tile]; if (pickup && !tools.has(pickup)) { tools.add(pickup); change = true; }
            queue.push(...adjacent(at));
        }
    }
    for (let at = 0; at < cells.length; at++) {
        const c = cells[at] ?? 'W';
        if ('PRSEVCIO?F'.includes(c) && !seen.has(at)) errors.push(`unreachable ${c}@${String(at)}`);
        if (c === 'U' && (!tools.has('ladder') || !seen.has(at + WIDTH) || !'g.s'.includes(cells[at + WIDTH] ?? 'W') || !'HVI?F'.includes(cells[at - WIDTH] ?? 'W'))) errors.push(`facade@${String(at)}`);
        if (c === 'I' && !tools.has('kit')) errors.push(`kit@${String(at)}`);
        if (c === '?' && !tools.has('megaphone')) errors.push(`megaphone@${String(at)}`);
    }
    for (const [kind, symbols] of [['extinguish', 'F'], ['rescue_person', 'VI?U'], ['rescue_animal', 'CO'], ['heal', 'I']] as const) {
        const n = Array.from(cells).filter(c => symbols.includes(c)).length;
        if (!Number.isInteger(level.objectives[kind] ?? 0) || (level.objectives[kind] ?? 0) > n || (level.objectives[kind] ?? 0) < 0) errors.push(`objective ${kind}`);
    }
    return errors;
}

export function levelAt(index: number): Level {
    const level = LEVELS[index]; if (!level) throw new RangeError('Niveau absent'); return level;
}
