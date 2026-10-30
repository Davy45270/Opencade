import { Engine, W, H, index, parseMine, MINES, type State, type Tile } from '../src/engines/pepites/engine';
import { pepitesDiversity } from '../scripts/pepites-diversity.js';
// Pépites oracles. Literal positions through loadState; every outcome uses the ordinary rules.
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function equal(a: unknown, b: unknown, label: string): void { check(JSON.stringify(a) === JSON.stringify(b), `${label}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`); }
/** A bedrock box with the given cells; everything else empty. */
export function room(cells: Record<string, Tile>, player = { x: 1, y: 14 }, level = 0): Engine {
    const grid: Tile[] = Array.from({ length: W * H }, (_, i) => (i % W === 0 || i % W === W - 1 || i < W || i >= W * (H - 1) ? '#' : ' '));
    grid[index(10, 14)] = 'E';
    for (const [k, t] of Object.entries(cells)) { const [x, y] = k.split(',').map(Number); grid[index(x ?? 0, y ?? 0)] = t; }
    const e = new Engine(level);
    const s: State = { grid, player, enemies: [], falling: [], nuggets: 0, score: 0, turns: 0, timeLeft: 60000, sorting: -1 };
    e.loadState(s); return e;
}
export const cases: Record<string, () => void> = {
    'P01 gravité : un rocher tombe d\'une case par tour dans le vide, s\'arrête sur la terre': () => {
        const e = room({ '5,3': 'o', '5,7': '.' }); e.turn(); equal(e.at(5, 4), 'o', 'chute'); e.turn(); e.turn(); equal([e.at(5, 6), e.at(5, 7)], ['o', '.'], 'arrêt sur terre');
        e.turn(); equal(e.at(5, 6), 'o', 'reste'); equal(e.state.falling, [], 'plus en chute');
    },
    'P02 roulement : sur un objet rond ou une brique, vers la gauche d\'abord, jamais sur la terre': () => {
        const e = room({ '5,5': 'o', '5,6': 'o', '5,7': '.' }); e.turn(); equal([e.at(4, 5), e.at(5, 5)], ['o', ' '], 'roule à gauche');
        const r = room({ '5,5': '*', '5,6': '=', '4,5': '.', '5,7': '.' }); r.turn(); equal(r.at(6, 5), '*', 'roule à droite si gauche pleine');
        const d = room({ '5,5': 'o', '5,6': '.' }); d.turn(); equal(d.at(5, 5), 'o', 'terre : pas de roulement');
    },
    'P03 écrasement : un objet en chute tue, un objet posé sur la tête non': () => {
        const e = room({ '5,10': 'o' }, { x: 5, y: 13 }); e.turn(); e.turn(); equal(e.status, 'playing', 'encore en l\'air'); e.turn(); equal([e.status, e.reason], ['lost', 'crushed'], 'écrasé');
        const s = room({ '5,12': 'o' }, { x: 5, y: 13 }); s.turn(); s.turn(); equal(s.status, 'playing', 'posé sur la tête');
        s.input('left'); s.turn(); equal([s.status, s.at(5, 13)], ['playing', 'o'], 'le rocher suit après le départ');
    },
    'P04 pousser : un rocher immobile, sur le côté, si la case suivante est vide': () => {
        const e = room({ '3,14': 'o' }, { x: 2, y: 14 }); e.input('right'); e.turn(); equal([e.state.player, e.at(4, 14)], [{ x: 3, y: 14 }, 'o'], 'poussé');
        const b = room({ '3,14': 'o', '4,14': '.' }, { x: 2, y: 14 }); b.input('right'); b.turn(); equal(b.state.player, { x: 2, y: 14 }, 'bloqué par la terre');
        const up = room({ '2,13': 'o', '2,12': '.' }, { x: 2, y: 14 }); up.input('up'); up.turn(); equal(up.state.player, { x: 2, y: 14 }, 'jamais vers le haut');
    },
    'P05 creuser et ramasser ; la sortie s\'ouvre au quota et termine la mine': () => {
        const e = room({ '2,14': '.', '3,14': '*' }); e.input('right'); e.turn(); equal(e.events, ['dig'], 'creuse'); e.input('right'); e.turn();
        equal([e.state.nuggets, e.state.score], [1, 10], 'pépite');
        const g = room({}, { x: 9, y: 14 }); g.state.nuggets = MINES[0]?.goal ?? 0; g.input('right'); g.turn(); equal(g.status, 'won', 'sortie ouverte');
        const c = room({}, { x: 9, y: 14 }); c.input('right'); c.turn(); equal([c.status, c.state.player], ['playing', { x: 9, y: 14 }], 'sortie fermée');
        // Real crossing of the quota, then the exit and the time bonus (60 s left × level 1).
        const q = room({ '8,14': '*' }, { x: 7, y: 14 }); q.state.nuggets = (MINES[0]?.goal ?? 1) - 1; q.input('right'); q.turn(); equal(q.events.includes('open'), true, 'quota franchi');
        q.input('right'); q.turn(); q.input('right'); q.turn(); equal(q.status, 'won', 'sortie'); equal(q.state.score, 10 + Math.floor(q.state.timeLeft / 1000), 'bonus du temps restant');
    },
    'P06 lucioles et papillons : longe-murs gauche ou droite ; contact = explosion ; écrasés, ils explosent': () => {
        const e = room({}); e.state.enemies = [{ x: 5, y: 5, kind: 'f', heading: 'left' }]; e.turn(); equal({ x: e.state.enemies[0]?.x, y: e.state.enemies[0]?.y }, { x: 5, y: 6 }, 'luciole tourne à gauche (vers le bas)');
        const m = room({}); m.state.enemies = [{ x: 5, y: 5, kind: 'b', heading: 'left' }]; m.turn(); equal({ x: m.state.enemies[0]?.x, y: m.state.enemies[0]?.y }, { x: 5, y: 4 }, 'papillon tourne à droite (vers le haut)');
        const t = room({ '4,6': '=', '6,6': '=', '4,7': '=', '6,7': '=', '4,8': '=', '6,8': '=' }, { x: 5, y: 9 }); t.state.enemies = [{ x: 5, y: 6, kind: 'f', heading: 'down' }];
        t.turn(); equal(t.status, 'playing', 'à deux cases'); t.turn(); equal([t.status, t.reason], ['lost', 'blast'], 'contact');
        const c = room({ '5,2': 'o', '4,5': '=', '6,5': '=', '5,6': '=' }); c.state.enemies = [{ x: 5, y: 5, kind: 'b', heading: 'down' }];
        for (let i = 0; i < 3; i++) c.turn(); equal([c.state.enemies.length, c.at(5, 5), c.at(4, 4)], [0, '*', '*'], 'papillon écrasé → pépites');
    },
    'P07 mur trieur : un rocher en chute ressort en pépite dessous, tant qu\'il est actif': () => {
        const level = MINES.findIndex(m => m.sortTurns > 0), turns = MINES[level]?.sortTurns ?? 0;
        const e = room({ '5,3': 'o', '5,5': 'm' }, { x: 1, y: 14 }, level); for (let i = 0; i < 2; i++) e.turn(); equal([e.at(5, 6), e.state.sorting], ['*', turns - 1], 'rocher → pépite, mur actif');
        const late = room({ '5,3': 'o', '5,5': 'm' }, { x: 1, y: 14 }, level); late.state.sorting = 0; for (let i = 0; i < 2; i++) late.turn(); equal(late.at(5, 6), ' ', 'mur éteint : l\'objet disparaît');
    },
    'P08 mousse : grandit dans le vide ou la terre, enfermée elle donne des pépites': () => {
        const level = MINES.findIndex(m => m.mossEvery > 0);
        const e = room({ '5,5': 'a', '4,5': '=', '6,5': '=', '5,4': '=', '5,6': '=' }, { x: 1, y: 14 }, level);
        for (let i = 0; i < (MINES[level]?.mossEvery ?? 1); i++) e.turn(); equal(e.at(5, 5), '*', 'enfermée → pépite');
        const g = room({ '5,5': 'a' }, { x: 1, y: 14 }, level); for (let i = 0; i < (MINES[level]?.mossEvery ?? 1); i++) g.turn();
        equal(g.state.grid.filter(t => t === 'a').length, 2, 'grandit d\'une case');
    },
    'P12 dynamite : un objet qui tombe dessus ouvre un trou 3 × 3, briques comprises': () => {
        const e = room({ '5,3': 'o', '5,5': 'x', '4,6': '=', '6,6': '=', '5,6': '*' }); for (let i = 0; i < 2; i++) e.turn();
        equal([e.at(5, 5), e.at(4, 6), e.at(6, 6), e.at(5, 6)], [' ', ' ', ' ', ' '], 'trou'); equal(e.events.includes('blast'), true, 'explosion');
        const still = room({ '5,4': 'o', '5,5': 'x' }); still.turn(); equal(still.at(5, 5), 'x', 'posé sans chute : rien');
    },
    'P09 étai : rochers et créatures figés 12 tours, une charge par mine': () => {
        const e = room({ '5,3': 'o' }); e.state.enemies = [{ x: 8, y: 5, kind: 'f', heading: 'left' }]; check(e.special(), 'accepté'); check(!e.special(), 'une charge');
        for (let i = 0; i < 12; i++) e.turn(); equal([e.at(5, 3), e.state.enemies[0]?.x, e.state.enemies[0]?.y, e.state.score], ['o', 8, 5, 0], 'rochers et créatures figés, aucun bonus'); e.turn(); equal(e.at(5, 4), 'o', 'libéré');
    },
    'P10 chrono, pas fixe et déterminisme': () => {
        const e = new Engine(0); e.loadState({ ...e.state, timeLeft: 50 }); e.step(1000 / 60 * 2); equal(e.status, 'playing', 'avant'); e.step(1000 / 60); equal([e.status, e.reason], ['lost', 'time'], 'à zéro');
        const a = new Engine(11, 7), b = new Engine(11, 7); for (const d of ['down', 'right', 'down'] as const) { a.input(d); b.input(d); a.step(500); for (let i = 0; i < 30; i++) b.step(1000 / 60); }
        equal(a.snapshot(), b.snapshot(), 'même état quel que soit le découpage');
    },
    'P13 contact : arriver à côté d\'une créature ou entrer dessus déclenche l\'explosion': () => {
        const e = room({}, { x: 3, y: 5 }); e.state.enemies = [{ x: 5, y: 5, kind: 'f', heading: 'left' }]; e.input('right'); e.turn();
        equal([e.status, e.reason, e.events.includes('blast')], ['lost', 'blast', true], 'arrivée voisine');
        const m = room({}, { x: 4, y: 5 }); m.state.enemies = [{ x: 5, y: 5, kind: 'b', heading: 'up' }]; m.input('right'); m.turn();
        equal([m.status, m.reason, m.state.enemies.length, m.at(6, 5)], ['lost', 'blast', 0, '*'], 'entrée sur un papillon : pépites');
    },
    'P14 mur trieur : pépite → rocher ; débouché occupé par une créature ou terminé : l\'objet disparaît sans superposition': () => {
        const level = MINES.findIndex(m => m.sortTurns > 0);
        const g = room({ '5,3': '*', '5,5': 'm' }, { x: 1, y: 14 }, level); for (let i = 0; i < 2; i++) g.turn(); equal(g.at(5, 6), 'o', 'pépite → rocher');
        const c = room({ '5,3': 'o', '5,5': 'm', '4,6': '=', '6,6': '=', '5,7': '=' }, { x: 1, y: 14 }, level); c.state.enemies = [{ x: 5, y: 6, kind: 'b', heading: 'down' }];
        for (let i = 0; i < 2; i++) c.turn(); equal([c.at(5, 6), c.state.enemies.length], [' ', 1], 'débouché occupé');
        const t = room({ '5,1': 'o', '5,3': 'o', '5,5': 'm' }, { x: 1, y: 14 }, level); for (let i = 0; i < 4 + (MINES[level]?.sortTurns ?? 0); i++) t.turn();
        equal(t.state.sorting, 0, 'mur éteint après sa durée');
    },
    'P15 eau : se répand d\'abord vers le bas, jamais vers le haut, noie le personnage': () => {
        const level = MINES.findIndex(m => m.waterEvery > 0), every = MINES[level]?.waterEvery ?? 1;
        const e = room({ '5,5': 'w', '5,4': ' ' }, { x: 1, y: 14 }, level); for (let i = 0; i < every; i++) e.turn();
        equal([e.at(5, 6), e.at(5, 4)], ['w', ' '], 'dessous, pas dessus');
        const side = room({ '5,5': 'w', '5,6': '=' }, { x: 1, y: 14 }, level); for (let i = 0; i < every; i++) side.turn();
        equal(side.at(4, 5) === 'w' || side.at(6, 5) === 'w', true, 'de côté quand le dessous est plein');
        const d = room({ '5,5': 'w' }, { x: 5, y: 6 }, level); for (let i = 0; i < every; i++) d.turn(); equal([d.status, d.reason], ['lost', 'drown'], 'noyé');
    },
    'P16 grosse pépite : tombe comme une pépite et compte triple': () => {
        const e = room({ '3,10': 'g' }, { x: 3, y: 14 }); for (let i = 0; i < 2; i++) e.turn(); equal(e.at(3, 12), 'g', 'tombe');
        const c = room({ '2,14': 'g' }, { x: 1, y: 14 }); c.input('right'); c.turn(); equal([c.state.nuggets, c.state.score], [3, 30], 'triple');
    },
    'P17 mousse : au seuil, elle devient rochers ; elle pousse dans la terre': () => {
        const level = MINES.findIndex(m => m.mossEvery > 0), m = MINES[level];
        const cells: Record<string, Tile> = {}; for (let x = 1; x <= (m?.mossLimit ?? 1) && x < 11; x++) cells[`${String(x)},3`] = 'a';
        const limit = Math.min(10, m?.mossLimit ?? 1);
        const big = room(cells, { x: 1, y: 14 }, level); const saved = m?.mossLimit; if (m) (m as { mossLimit: number }).mossLimit = limit;
        try { for (let i = 0; i < (m?.mossEvery ?? 1); i++) big.turn(); } finally { if (m && saved !== undefined) (m as { mossLimit: number }).mossLimit = saved; }
        equal(big.state.grid.filter(t => t === 'o').length >= limit, true, 'rochers au seuil');
        const soil = room({ '5,5': 'a', '4,5': '=', '6,5': '=', '5,4': '=', '5,6': '.' }, { x: 1, y: 14 }, level); for (let i = 0; i < (m?.mossEvery ?? 1); i++) soil.turn(); equal(soil.at(5, 6), 'a', 'dans la terre');
    },
    'P11 analyseur et campagne : 30 mines fermées, une sortie, un départ, objectifs atteignables par le nombre de pépites possibles': () => {
        for (const m of MINES) { const p = parseMine(m.rows); check(p.grid.filter(t => t === 'E').length === 1, m.name); }
        for (const bad of [[...(MINES[0]?.rows ?? [])].map((r, i) => i === 3 ? r.replace('#', '.') : r)]) { let thrown = false; try { parseMine(bad); } catch { thrown = true; } check(thrown, 'bord ouvert refusé'); }
        check(new Set(MINES.map(m => m.name)).size === MINES.length, 'noms uniques'); equal(MINES.length, 30, 'trente mines');
        // Introductions: falling 2, push 3, fireflies 4, moth 6, sorting wall 9, moss 12, dynamite 17, water 21, big nugget 26.
        const first = (c: string) => MINES.findIndex(m => m.rows.some(r => r.includes(c))) + 1;
        equal(['f', 'b', 'm', 'a', 'x', 'w', 'g'].map(first), [4, 6, 9, 12, 17, 21, 26], 'calendrier des nouveautés');
        equal(MINES.flatMap((m, i) => m.seconds < 130 ? [i + 1] : []), [5, 10, 15, 20, 25, 30], 'défis chronométrés');
        const r = pepitesDiversity(MINES); check(r.score <= 25 && r.cloneShare === 0 && r.maxGapWithoutNovelty <= 5, `diversité ${String(r.score)}`);
        check(pepitesDiversity(Array<unknown>(30).fill(MINES[6])).cloneShare === 1, 'mines identiques détectées');
    },
};
