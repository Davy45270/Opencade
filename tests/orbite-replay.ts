import { Engine, TICK } from '../src/engines/orbite/engine';
export interface Recording {
    level: number; seed: number; commands: [number, number][]; frames: number;
    signature: number; events: string[]; layout: string[];
    witnesses: Record<string, { frame: number; shots: number[][]; phase: number; probes: number }>;
}
export function signature(e: Engine): number {
    let hash = 2166136261;
    for (const ch of JSON.stringify(e.snapshot())) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
    return hash >>> 0;
}
export function layout(e: Engine): string[] {
    return e.state.probes.map(p => `${String(p.x)},${String(p.y)}:${p.kind ?? 'probe'}`);
}
const elements: Record<string, string> = {
    fire: 'shoot', probe: 'probe-hit', shield: 'erodible-shield', edge: 'formation-bounce',
    'rotor-block': 'rotating-shield-block', split: 'split-fragments', deflect: 'asteroid-deflection',
    gravity: 'gravity-curve', 'stealth-hide': 'intermittent-stealth', repair: 'neighbor-heal',
    'satellite-threat': 'satellite-defense', spiral: 'coordinated-swarm', 'boss-phase': 'boss-phase-two',
};
export function observe(e: Engine, frame: number, seen: Set<string>, witnesses: Recording['witnesses']): void {
    for (const event of e.events) {
        seen.add(event);
        const name = event === 'boss-fire' ? `guardian-motif:${String(e.state.boss?.motif)}` : elements[event];
        if (name && !witnesses[name]) witnesses[name] = { frame, shots: e.state.shots.filter(s => s.owner === 'enemy').map(s => [s.vx ?? 0, s.y]), phase: e.state.boss?.phase ?? 0, probes: e.state.probes.length };
    }
}
export function replay(record: Recording, E = Engine): { events: string[]; signature: number } {
    const e = new E(record.level, record.seed), seen = new Set<string>(), witnesses: Recording['witnesses'] = {};
    if (JSON.stringify(layout(e)) !== JSON.stringify(record.layout)) throw new Error('Changed formation');
    e.holdFire(true);
    let frames = 0;
    for (const [target, count] of record.commands) {
        e.moveTo(target);
        for (let f = 0; f < count; f++) {
            if (e.status !== 'playing') throw new Error('Premature terminal state');
            e.step(TICK); frames++; observe(e, frames, seen, witnesses);
        }
    }
    const events = [...seen].sort(), hash = signature(e);
    if (e.status !== 'won' || frames !== record.frames || hash !== record.signature || JSON.stringify(witnesses) !== JSON.stringify(record.witnesses) || JSON.stringify(events) !== JSON.stringify(record.events)) throw new Error(`Replay drift ${String(record.level + 1)}/${String(record.seed)}`);
    return { events, signature: hash };
}
