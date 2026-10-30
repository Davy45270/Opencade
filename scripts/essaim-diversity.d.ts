import { Engine, difficulty } from '../src/engines/essaim/engine';
export function essaimFeatures(engine: Engine): { elements: string[]; layout: string[]; params: { layoutCells: number } };
export function observeEssaim(engine: Engine, limit?: number, control?: (engine: Engine, frame: number) => void, witnessFrames?: Set<number>): ReturnType<typeof essaimFeatures> & { witnesses: Record<string, { frame: number; [key: string]: unknown }>; frames: number; status: string };
export function essaimDiversity(engine: typeof Engine, parameters: typeof difficulty): ReturnType<typeof import('./diversity-metrics.js').measureDiversity>;
