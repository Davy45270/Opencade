import { Engine, difficulty } from '../src/engines/essaim/engine';
export function essaimFeatures(engine: Engine): { elements: string[]; layout: string[]; params: { layoutCells: number } };
export function essaimDiversity(engine: typeof Engine, parameters: typeof difficulty): ReturnType<typeof import('./diversity-metrics.js').measureDiversity>;
