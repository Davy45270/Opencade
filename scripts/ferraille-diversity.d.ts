import type { State } from '../src/engines/ferraille/engine';
export function ferrailleFeatures(s: State): { elements: string[]; layout: string[]; params: Record<string, number> };
export interface Experience { star: string; modules: string[]; actions: string[] }
export function sequenceSimilarity(a: string[], b: string[]): number;
export function measureRepetition(levels: Experience[]): { passed: boolean; errors: string[]; used: number; maxModuleSimilarity: number; pairs: {from: number; to: number; moduleDistance: number; actionDistance: number; distance: number}[]; consecutive: {from: number; to: number; moduleDistance: number; actionDistance: number; distance: number}[] };
