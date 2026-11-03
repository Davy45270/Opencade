import type { Finger } from '../tests/e2e/finger-stepped';
import type { CollierHook } from '../src/games/collier/scene';
type Box = { x: number; y: number; width: number; height: number };
type Receipt = { type: string; x: number; y: number };
export function replayCollier(level: number, box?: Box, resume?: Box, resumeEvents?: Receipt[], geometry?: ReturnType<CollierHook['geometry']>): Promise<{
    fingerprint: number;
    outcome: string;
    misses: number;
    swaps: number;
    gameMs: number;
    final: { shots: number };
}>;

export type CollierRecording = {
    level: number;
    box: Box;
    resume: Box;
    seed: number;
    geometry: ReturnType<CollierHook['geometry']>;
    entries: Finger['entries'];
    advances: Finger['advances'];
    resumeEvents?: Receipt[];
    transport: Receipt[];
    fingerprint: number;
    final: Record<string, unknown>;
};
export function replayCollierRecording(recording: CollierRecording): { fingerprint: number; final: Record<string, unknown> };
