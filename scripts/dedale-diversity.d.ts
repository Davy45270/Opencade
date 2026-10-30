import type { Engine, Direction } from '../src/engines/dedale/engine';
export function dedaleDiversity(engine: typeof Engine, records: { level: number; seed: number; inputs: Direction[] }[]): {
    score: number; noveltyCount: number; noveltyLevels: number[]; cloneShare: number; maxGapWithoutNovelty: number;
    levels: { level: number; positions: number[]; witnesses: Record<string, unknown>; elements: string[]; curve: { status: string } }[];
};

export function routeOverlap(a: number[], b: number[]): number;
export function mechanicForEvent(event: string): string;
