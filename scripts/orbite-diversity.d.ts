import type { Engine } from '../src/engines/orbite/engine';
import type { Recording } from '../tests/orbite-replay';
import type { measureDiversity } from './diversity-metrics.js';
export function orbiteDiversity(E: typeof Engine, recordings: Recording[]): ReturnType<typeof measureDiversity>;
export function verifyOrbiteDiversity(d: ReturnType<typeof measureDiversity>): void;
