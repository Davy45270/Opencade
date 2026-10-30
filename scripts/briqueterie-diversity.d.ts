import { Engine } from '../src/engines/briqueterie/engine';
import type { Recording, replay } from '../tests/briqueterie-replay';
export function briqueterieDiversity(E: typeof Engine, records: Recording[], play: typeof replay): { score: number; noveltyCount: number; noveltyLevels: number[]; maxGapWithoutNovelty: number; cloneShare: number; levels: { level: number; elements: string[]; layout: string[]; witnesses: Record<string, number>; curve: { status: string } }[] };
