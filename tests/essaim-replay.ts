import { Engine } from '../src/engines/essaim/engine';
import { observeEssaim } from '../scripts/essaim-diversity.js';
export interface EssaimRecording {
    level: number;
    seed: number;
    inputs: [number, number | null, number][];
    checkpoints: [number, number, number][];
    observation: ReturnType<typeof observeEssaim>;
    result: [number, number, number];
}
/** Decimal witnesses, with sub-micro precision removed only for portable comparison. */
export function decimal(value: unknown): string {
    return JSON.stringify(value, (_key, v: unknown) => typeof v === 'number' ? Math.round(v * 1000000) / 1000000 : v);
}
/** Two independent decimal state digests include RNG, timers and all live objects. */
export function stateWitness(e: Engine): [number, number] {
    const source = decimal(e.snapshot());
    let a = 2166136261, b = 5381;
    for (let i = 0; i < source.length; i++) { const c = source.charCodeAt(i); a = Math.imul(a ^ c, 16777619) >>> 0; b = (Math.imul(b, 33) ^ c) >>> 0; }
    return [a, b];
}
export function replay(record: EssaimRecording, E = Engine, observe?: (engine: Engine) => void): ReturnType<typeof observeEssaim> {
    const e = new E(record.level, record.seed);
    let input = 0, checkpoint = 0;
    const verify = (frame: number): void => {
        const expected = record.checkpoints[checkpoint];
        if (expected?.[0] !== frame) return;
        if (decimal(stateWitness(e)) !== decimal(expected.slice(1))) throw new Error(`Essaim divergence level ${String(record.level+1)} seed ${String(record.seed)} frame ${String(frame)}`);
        checkpoint++;
    };
    const observation = observeEssaim(e, record.observation.frames, (engine, frame) => {
        verify(frame);
        observe?.(engine);
        let next = record.inputs[input+1];
        while (next && next[0] <= frame) { input++; next = record.inputs[input+1]; }
        const entry = record.inputs[input];
        if (!entry) throw new Error('Missing recorded input');
        engine.holdFire(entry[2] === 1);
        if (entry[1] !== null) engine.moveTo(entry[1]);
    }, new Set(Object.values(record.observation.witnesses).map(w => w.frame)));
    verify(observation.frames);
    if (checkpoint !== record.checkpoints.length || decimal(observation) !== decimal(record.observation) || decimal([e.state.lives,e.state.score,e.state.fired]) !== decimal(record.result)) throw new Error(`Essaim replay result level ${String(record.level+1)} seed ${String(record.seed)}`);
    return observation;
}
