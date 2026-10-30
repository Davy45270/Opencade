import { Engine, difficulty, TICK } from '../src/engines/essaim/engine.ts';
import { pilot } from '../src/engines/essaim/pilot.ts';
import { essaimDiversity, observeEssaim } from './essaim-diversity.js';
function check(condition, message) { if (!condition) throw new Error(message); }
export function diversity(E = Engine) {
    const r = essaimDiversity(E, difficulty);
    check(r.noveltyCount >= 8, 'E-DIV-01: eight generated novelties');
    check(r.cloneShare < 0.25, 'E-DIV-01: clones below 25 percent');
    let previous = 1;
    for (const level of r.noveltyLevels.filter(n => n <= 25)) { check(level-previous <= 5, 'E-DIV-01: discovery gap'); previous = level; }
    check(25-previous <= 5, 'E-DIV-01: discoveries through 25');
    return r;
}
export function campaign(E, seed) {
    return Array.from({ length:30 }, (_,level) => {
        const e = new E(level,seed); let frame = 0;
        for (; frame < 18000 && e.status === 'playing'; frame++) { pilot(e,frame); e.step(TICK); }
        check(e.status === 'won', `E-PILOT level ${String(level+1)} seed ${String(seed)}: ${e.status}`);
        return { level: level+1, frames: frame, lives: e.state.lives, score: e.state.score };
    });
}
export function generatedWitnesses(E = Engine) {
    const required = [[1,'burst-fan'],[2,'fast-ellipse'],[3,'frontal-block'],[6,'mine-explosion'],[9,'split-fragments'],[12,'spiral-approach'],[15,'guided-turn'],[18,'rescue-present'],[21,'mirror-tracking'],[29,'command-phase-two-fire']];
    for (const [level,behavior] of required) {
        const result = observeEssaim(new E(level,28));
        check(result.status === 'won', 'observation follows full generated attempt');
        check(result.witnesses[behavior], `E-DIV-01 missing observed ${behavior}`);
    }
}
