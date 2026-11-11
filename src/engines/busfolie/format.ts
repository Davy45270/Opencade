import type { Entry } from './data';
import { GENERATOR_VERSION } from './generator';
import { SCHEMA_VERSION, type Bus, type Color, type Exit, type Facing, type LevelDefinition, type PassengerGroup, type Side } from './rules';
/** The frozen text format of a progression board (data.ts) and back. */
const FACING: Record<string, Facing> = { '>': 'right', '<': 'left', 'v': 'down', '^': 'up' };
const SYMBOL: Record<Facing, string> = { right: '>', left: '<', down: 'v', up: '^' };
/** Reads a frozen entry: one map row per board row ('.' free, '#' cone, a letter per vehicle), one line per vehicle
 * ("rouge 3 >" colour, seats, facing, "!" for one way; "gris" for a parked car), exits ("right 2" or "top 3 bleu"),
 * the waiting line ("rouge 3, bleu 2"). */
export function parseEntry(entry: Entry, id: string): LevelDefinition {
    const h = entry.map.length, w = entry.map[0]?.length ?? 0, cells = new Map<string, [number, number][]>(), obstacles: { x: number; y: number }[] = [];
    entry.map.forEach((row, y) => { row.split('').forEach((ch, x) => {
        if (ch === '#') obstacles.push({ x, y });
        else if (ch !== '.') cells.set(ch, [...cells.get(ch) ?? [], [x, y]]);
    }); });
    const buses: Bus[] = entry.vehicles.map((line, i) => {
        const letter = String.fromCharCode(65 + i), at = cells.get(letter);
        if (!at?.length) throw new Error(`${id} : véhicule ${letter} absent`);
        const [x, y] = at[0] ?? [0, 0], hz = at.length > 1 && (at[1]?.[1] ?? 0) === y, parts = line.split(' ');
        const color = parts[0] as Color, car = color === 'gris';
        const facing = car ? (hz ? 'right' : 'down') : FACING[(parts[2] ?? '').replace('!', '')];
        if (!facing) throw new Error(`${id} : sens de ${letter}`);
        const bus: Bus = { id: car ? `V${letter}` : `B${letter}`, color, x, y, length: at.length === 3 ? 3 : 2, orientation: hz ? 'horizontal' : 'vertical', capacity: car ? 0 : Number(parts[1]), facing };
        if (parts[2]?.endsWith('!')) bus.oneWay = true;
        return bus;
    });
    const exits: Exit[] = entry.exits.map((line, i) => { const [side, index, color] = line.split(' '); return { id: `E${String(i + 1)}`, side: side as Side, index: Number(index), color: (color ?? null) as Exit['color'] }; });
    const passengerQueue: PassengerGroup[] = entry.queue.split(', ').map((g, i) => { const [color, count] = g.split(' '); return { id: `G${String(i + 1)}`, color: color as PassengerGroup['color'], count: Number(count) }; });
    return {
        schemaVersion: SCHEMA_VERSION, id, mode: 'classic', seed: entry.seed, generatorVersion: GENERATOR_VERSION, board: { width: w, height: h },
        buses, passengerQueue, exits, obstacles, rules: { allowReverse: true, allowUndo: true, timeLimitSeconds: null },
    };
}
/** The reverse of parseEntry (used offline to freeze a searched board). */
export function toEntry(level: LevelDefinition, measures: Pick<Entry, 'par' | 'difficulty' | 'solution' | 'trap'>): Entry {
    const w = level.board.width, rows = Array.from({ length: level.board.height }, () => Array.from({ length: w }, () => '.'));
    for (const o of level.obstacles) { const row = rows[o.y]; if (row) row[o.x] = '#'; }
    level.buses.forEach((b, i) => { for (let k = 0; k < b.length; k++) { const row = rows[b.orientation === 'horizontal' ? b.y : b.y + k]; if (row) row[b.orientation === 'horizontal' ? b.x + k : b.x] = String.fromCharCode(65 + i); } });
    return {
        seed: level.seed ?? 0, map: rows.map(r => r.join('')),
        vehicles: level.buses.map(b => b.color === 'gris' ? 'gris' : `${b.color} ${String(b.capacity)} ${SYMBOL[b.facing]}${b.oneWay ? '!' : ''}`),
        exits: level.exits.map(e => `${e.side} ${String(e.index)}${e.color ? ` ${e.color}` : ''}`),
        queue: level.passengerQueue.map(g => `${g.color} ${String(g.count)}`).join(', '),
        ...measures,
    };
}
