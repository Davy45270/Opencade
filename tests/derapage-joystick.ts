import { Engine } from '../src/engines/derapage/engine';
import { physics, joystickHeading, resolveRail, assistedHeading } from '../src/engines/derapage/physics';
import { at, nearest, wrap } from '../src/engines/derapage/track';
import { required } from '../src/engines/derapage/access';
import { circuitKey } from '../src/engines/derapage/circuits';
import { readSave, recordCircuitLap, type StoragePort } from '../src/shell/storage';
import { recordings } from './derapage-recordings';
import { sameReplayStep } from './derapage-replay';
import { mobileCases } from './derapage-mobile';
type Check = (ok: boolean, message: string) => void;
// A complete deterministic replay supplies a witness; corrupt metadata is checked
// against that same witness instead of driving the identical race six more times.
// Controls are part of the key, and mutated Engine classes never share a witness.
const humanWitnesses=new WeakMap<typeof Engine, Map<string, {lap:number;longest:number;off:number;frames:number;x:number;y:number;angle:number}>>();
export function replayHuman(tape: typeof recordings[number], check: Check, EngineType: typeof Engine = Engine, measureNearest: typeof nearest = nearest): void {
    check(Number.isInteger(tape.frames) && tape.frames > 0 && tape.frames <= 6000, 'budget déterministe : 1 à 6000 images');
    check(tape.events.length === Math.ceil(tape.frames / 9), 'budget déterministe : un cap pour neuf images');
    const key=JSON.stringify([tape.level,tape.frames,tape.events]);
    let witnesses=humanWitnesses.get(EngineType);
    if(!witnesses) {witnesses=new Map();humanWitnesses.set(EngineType,witnesses);}
    let result=witnesses.get(key);
    // An explicit instrumented nearest query must always inspect the complete run.
    if(!result || measureNearest!==nearest) {
        const e = new EngineType(tape.level, 28), k = required(e.karts[0]);
        let off = 0, stopped = 0, longest = 0;
        for (let frame = 0; frame < tape.frames; frame++) {
            e.input({ steer: 0, drift: false, bonus: false, mode: 'joystick', heading: required(tape.events[Math.floor(frame / 9)]), assist: true });
            e.step(1000 / 60);
            const n = measureNearest(e.track, k);
            if (n.distance > required(e.track.widths[n.index]) / 2) off++;
            stopped = Math.hypot(k.vx, k.vy) < 2 ? stopped + 1 : 0;
            longest = Math.max(longest, stopped);
        }
        result={lap:k.lap,longest:longest/60,off:off/tape.frames,get frames(){return e.frames;},x:k.x,y:k.y,angle:k.angle};
        witnesses.set(key,result);
    }
    check(result.lap === 3, 'trois tours');
    check(result.longest < .5, 'arrêt < 0,5 s');
    check(result.off < .15, 'hors piste < 15 %');
    check(result.frames === tape.frames && result.longest === tape.longestStop && result.off === tape.off, 'rejeu des mesures exact');
    check(result.x === tape.final.x && result.y === tape.final.y && result.angle === tape.final.angle, 'rejeu du cap et de la position exact');
}
export const joystickCases: { name: string; run: (check: Check) => void }[] = [
    ...mobileCases,
    { name: 'Z36 budgets en images et en événements', run(check) {
        const tape = required(recordings[0]);
        const invalid: [typeof tape, string][] = [
            [{ ...tape, frames: 0 }, 'budget déterministe : 1 à 6000 images'],
            [{ ...tape, frames: 6001 }, 'budget déterministe : 1 à 6000 images'],
            [{ ...tape, frames: 1.5 }, 'budget déterministe : 1 à 6000 images'],
            [{ ...tape, events: [...tape.events, 0] }, 'budget déterministe : un cap pour neuf images'],
            [{ ...tape, events: [] }, 'budget déterministe : un cap pour neuf images'],
        ];
        for (const frames of [1, 6000]) {
            let admitted = false;
            const boundary = { ...tape, frames, events: Array<number>(Math.ceil(frames / 9)).fill(0) };
            const stop = new Error('budgets vérifiés');
            try {
                replayHuman(boundary, (ok, message) => {
                    check(ok, `borne ${String(frames)} admise : ${message}`);
                    if (message === 'budget déterministe : un cap pour neuf images') { admitted = ok; throw stop; }
                });
            } catch (error) { if (error !== stop) throw error; }
            check(admitted, `borne ${String(frames)} admise avant simulation`);
        }
        for (const [altered, expected] of invalid) {
            let failure = '';
            try { replayHuman(altered, (ok, message) => { if (!ok) throw new Error(message); }); }
            catch (error) { if (error instanceof Error) failure = error.message; else throw error; }
            check(failure === expected, 'bande invalide rejetée avant la simulation');
        }
    } },
    ...(['angle', 'x', 'y', 'longestStop', 'off', 'frames'] as const).map(field => ({
        name: `Z36 rejeu : ${field} altéré détecté exactement`,
        run(check: Check) {
            const tape = required(recordings[0]);
            const altered = { ...tape, final: { ...tape.final } };
            if (field === 'angle' || field === 'x' || field === 'y') altered.final[field] += 1e-9;
            else if (field !== 'frames') altered[field] += 1e-9;
            class ObservedEngine extends Engine {
                static current: Engine | undefined;
                constructor(level: number, seed: number) { super(level, seed); ObservedEngine.current = this; }
            }
            const failures: string[] = [];
            replayHuman(altered, (ok, message) => {
                // Change only the executed-frame count, after the real simulation.
                if (field === 'frames' && message === 'trois tours' && ObservedEngine.current) ObservedEngine.current.frames++;
                if (!ok) failures.push(message);
            }, field==='frames' ? ObservedEngine : Engine);
            const expected = field === 'angle' || field === 'x' || field === 'y'
                ? 'rejeu du cap et de la position exact' : 'rejeu des mesures exact';
            check(failures.length === 1 && failures[0] === expected, `le vrai rejeu rejette uniquement ${field} altéré`);
        },
    })),
    { name: 'Z37 direction absolue progressive, bornée, diagonales et zone morte', run(check) {
        for (const [dx, dy] of [[0, 0], [10, 0], [-10, 0], [6, 8]]) check(joystickHeading(required(dx), required(dy)) === undefined, 'zone morte 10 px');
        for (const [dx, dy] of [[0,-40],[-40,0],[40,0],[0,40],[40,-40],[-40,40]]) {
            const target = required(joystickHeading(required(dx), required(dy)));
            const e = new Engine(), k = required(e.karts[0]), t = e.track;
            t.trees = []; t.boosts = []; t.walls.fill(false); t.widths.fill(10000);
            Object.assign(k, { angle: target - 1, vx: 0, vy: 0 });
            let lastError = 1;
            for (let frame = 0; frame < 90; frame++) {
                const before = k.angle;
                physics(k, { steer: 0, mode: 'joystick', heading: target, drift: false, bonus: false }, t, 1 / 60, .45);
                const error = Math.abs(wrap(target - k.angle));
                check(Math.abs(wrap(k.angle - before)) <= 3.2 / 60 + 1e-12, 'vitesse maximale 3,2 rad/s');
                check(error < lastError, 'convergence sans saut'); lastError = error;
            }
            check(lastError < .002, 'converge en 1,5 s');
            const angle = k.angle;
            physics(k, { steer: 1, mode: 'joystick', heading: joystickHeading(5, 0), drift: false, bonus: false }, t, 1 / 60, .45);
            check(k.angle === angle, 'relâché ou zone morte : conserve le cap');
        }
    } },
    { name: 'Z37 rejeu joystick au pas près avec avances divisées', run(check) {
        const a = new Engine(4), b = new Engine(4);
        for (let frame = 0; frame < 90; frame++) {
            const input = { steer: 0, mode: 'joystick' as const, heading: frame < 45 ? -.7 : 1.2, assist: true, drift: false, bonus: false };
            a.input(input); b.input(input);
            a.step(1000 / 60); b.step(1000 / 120); b.step(1000 / 120);
            check(sameReplayStep(a, b, frame, frame === 89), 'snapshot exact à chaque pas');
        }
    } },
    { name: 'Z38 rail : renvoi intérieur, vitesse résiduelle et départ sans collage', run(check) {
        for (const side of [-1, 1]) for (const initialSpeed of [0, 24]) {
            const e = new Engine(4), t = e.track, k = required(e.karts[0]);
            const p = at(t, 20), n = nearest(t, p), half = required(t.widths[n.index]) / 2;
            Object.assign(k, { x: p.x + side * n.nx * (half + 2), y: p.y + side * n.ny * (half + 2), angle: Math.atan2(side * n.ny, side * n.nx), vx: side * n.nx * initialSpeed, vy: side * n.ny * initialSpeed });
            resolveRail(k, t);
            check(Math.hypot(k.vx, k.vy) >= 8, 'minimum 8');
            check(side * (k.vx * n.nx + k.vy * n.ny) < 0, 'vitesse vers la piste');
            check(nearest(t, k).distance < half, 'position intérieure');
            check(Math.abs(k.vx * Math.cos(k.angle) + k.vy * Math.sin(k.angle) - Math.hypot(k.vx, k.vy)) < 1e-9, 'cap aligné sur la vitesse');
            let stopped = 0, longest = 0;
            for (let frame = 0; frame < 120; frame++) {
                physics(k, { steer: 0, drift: false, bonus: false }, t, 1 / 60, .45);
                stopped = Math.hypot(k.vx, k.vy) < 2 ? stopped + 1 : 0;
                longest = Math.max(longest, stopped);
            }
            check(longest / 60 < .5, 'aucun blocage');
        }
    } },
    { name: 'Z39 records historiques attachés aux noms, migration idempotente', run(check) {
        let raw = JSON.stringify({ unlocked: 7, best: 42, circuitRecords: { 0: 2100, 1: 3100, 4: 4100 } });
        const storage: StoragePort = { getItem: () => raw, setItem: (_key, value) => { raw = value; } };
        const save = readSave(storage, 'derapage', 30);
        check(save.circuitRecords?.[circuitKey(4)] === 2100, 'Le Rocher garde son ancien record 0');
        check(save.circuitRecords?.[circuitKey(0)] === 4100, 'La Flèche garde son ancien record 4');
        check(save.circuitRecords?.[circuitKey(1)] === 3100 && save.unlocked === 7 && save.best === 42, 'progression conservée');
        check(recordCircuitLap(storage, save, 4, 2000), 'amélioration au nouvel index');
        check(!recordCircuitLap(storage, save, 4, 2200), 'pas de régression');
        const again = readSave(storage, 'derapage', 30);
        check(again.circuitRecords?.['Le Rocher'] === 2000 && again.circuitRecords[circuitKey(0)] === 4100, 'second chargement par identité');
    } },
    { name: 'Z36 aide locale : correction légère et inactive sur la ligne', run(check) {
        const e = new Engine(4), t = e.track, k = required(e.karts[0]), p = at(t, 20), n = nearest(t, p);
        Object.assign(k, p, { vx: 20 * n.ny, vy: -20 * n.nx, angle: Math.atan2(-n.nx, n.ny) });
        check(assistedHeading(k, t, k.angle) === k.angle, 'aucune aide au centre');
        Object.assign(k, { x: n.x + n.nx * 12, y: n.y + n.ny * 12 });
        const target = at(t, n.along + 12), requested = k.angle + .5;
        const error = wrap(Math.atan2(target.y - k.y, target.x - k.x) - requested);
        const correction = wrap(assistedHeading(k, t, requested) - requested);
        check(Math.abs(correction) > .01 && Math.sign(correction) === Math.sign(error), 'correction vers la ligne');
        check(Math.abs(correction) <= .3 + 1e-12 && Math.abs(correction) <= Math.abs(error) * .25 + 1e-12, 'au plus 25 % et 0,3 rad');
    } },
];
