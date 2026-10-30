import type { Engine, Direction } from '../src/engines/dedale/engine';
export function dedaleDiversity(engine: typeof Engine, records: { level: number; seed: number; inputs: Direction[] }[]): {
    score: number; noveltyCount: number; noveltyLevels: number[]; cloneShare: number; maxGapWithoutNovelty: number;
    levels: { level: number; elements: string[]; curve: { status: string } }[];
};
