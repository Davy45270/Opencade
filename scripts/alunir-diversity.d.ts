import { Engine, difficulty } from '../src/engines/alunir/engine';
export interface FlightRow { name?: string; star: string; mechanics: string[]; actions: string[]; controls?: number[][] }
export function controlSimilarity(a: number[][], b: number[][]): number;
export function similarity(a: string[], b: string[]): number;
export function measureAlunir(rows: FlightRow[]): { valid: boolean; maxSimilarity: number; mechanicCount: number; repeatedStars: number[]; pairs: { a: number; b: number; mechanics: number; controls: number; similarity: number }[]; levels: FlightRow[] };
export function alunirFeatures(engine: Engine, data: ReturnType<typeof difficulty>): { elements: string[]; layout: string[]; params: Record<string, number> };
export function alunirDiversity(mod: { Engine: typeof Engine; difficulty: typeof difficulty; LEVELS: readonly unknown[] }): ReturnType<typeof import('./diversity-metrics.js').measureDiversity>;
