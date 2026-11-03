// The 15 s timeout is only a runner safety net; counted work is the oracle.
import { bounded } from './artificiers-budget';
import { test } from 'vitest';
import { cases, fingerWin, playerWin } from './artificiers-cases';
import { replayWin } from './artificiers-replay';
for (const [name, check] of Object.entries(cases)) test(`Artificiers : ${name}`, () => { bounded(check); }, 15000);
for (let level = 0; level < 30; level++) test(`Artificiers : rejeu gagnant ${String(level + 1)}`, () => { bounded(() => { replayWin(level); }); }, 15000);
for (const level of [0, 9]) for (const seed of [220, 19, 37, 101]) {
    test(`Artificiers : pilote ${String(level + 1)}, graine ${String(seed)}`, () => { bounded(() => { playerWin(level, seed); }); }, 15000);
    test(`Artificiers : doigt bruité ${String(level + 1)}, graine ${String(seed)}`, () => { bounded(() => { fingerWin(level, seed); }); }, 15000);
}
