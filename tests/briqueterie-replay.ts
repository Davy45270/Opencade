import { Engine, STEP } from '../src/engines/briqueterie/engine';
export interface Recording {
    level: number; seed: number; variant: number; frames: number; inputs: [number, number][];
    witnesses: Record<string, number>; status: string; score: number; lives: number;
}
export function replay(record: Recording, E = Engine) {
    const e = new E(record.level - 1, record.seed), witnesses: Record<string, number> = {};
    let cursor = 0;
    for (let frame = 0; frame < record.frames; frame++) {
        const input = record.inputs[cursor];
        if (input?.[0] === frame) { e.move(input[1]); cursor++; }
        e.launch(); e.step(STEP);
        for (const event of e.events) witnesses[event] ??= frame + 1;
    }
    if (e.status !== 'won' || e.state.score !== record.score || e.state.lives !== record.lives || JSON.stringify(witnesses) !== JSON.stringify(record.witnesses)) throw new Error(`Replay diverged: ${String(record.level)}/${String(record.seed)}`);
    return { engine: e, witnesses };
}
