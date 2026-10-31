import { cardinalDirection } from '../src/games/bombercade/controls';
import { joystickDirection } from '../src/shell/gestures';
import { Engine, FIXED, WIDTH, HEIGHT, LEVELS, difficulty, neighbor, type Actor, type Bomb } from '../src/engines/bombercade/engine';
import { ids } from '../src/characters/model';
import { outcomeRewards, Pilot } from '../src/engines/bombercade/pilot';
import { introductions, layoutAt } from '../src/engines/bombercade/levels';
import { durationFailures } from '../scripts/bombercade-budget';
import { thumbnailMotion, thumbnailLifecycle } from './bombercade-raster';
function required<T>(value: T | undefined): T { if (value === undefined) throw new Error('État incomplet'); return value; }
function check(value: unknown, message = 'Assertion'): asserts value { if (!value) throw new Error(message); }
function equal(actual: unknown, expected: unknown): void { check(JSON.stringify(actual) === JSON.stringify(expected), `Attendu ${JSON.stringify(expected)}, obtenu ${JSON.stringify(actual)}`); }
export function room(): Engine {
    const e = new Engine(); e.board.blocks = []; required(e.actors[1]).at = 130; required(e.actors[1]).from = 130; required(e.actors[1]).queued = null; required(e.actors[1]).think = 1000000;
    return e;
}
function bomb(at: number, owner = 0, fuse = 2500, id = 1, range = 2): Bomb { return { at, owner, fuse, id, range, character: 'panda', slide: null }; }
function center(a: Actor, at: number): void { a.at = at; a.from = at; a.travel = 0; a.queued = null; }
export const oracles: readonly [string, () => void][] = [
    ['B croix tactile : centre, secteurs et bruit de chaque appui', () => {
        equal(cardinalDirection(null), null);
        for (const [dx, dy] of [[0, 0], [11, 0], [0, -11], [8, 8]]) equal(cardinalDirection(joystickDirection(dx ?? 0, dy ?? 0)), null);
        equal(cardinalDirection(joystickDirection(12, 0)), 'right');
        const e = room();
        for (const [direction, x, y] of [['up', 0, -42], ['down', 0, 42], ['left', -42, 0], ['right', 42, 0]] as const) {
            check(60 - Math.hypot(x, y) >= 12, 'Marge au bord supérieure au bruit maximal');
            for (let dx = -12; dx <= 12; dx++) for (let dy = -12; dy <= 12; dy++) {
                check(Math.hypot(x + dx, y + dy) < 60, 'Le toucher reste dans la croix de diamètre 120');
                equal(cardinalDirection(joystickDirection(x + dx, y + dy)), direction);
                e.input(cardinalDirection(joystickDirection(x + dx, y + dy)));
                equal(e.snapshot().actors[0]?.queued, direction); // No simulation tick needed.
            }
        }
        equal(Array.from({ length: 8 }, (_, sector) => cardinalDirection(sector)), ['right', 'down', 'down', 'left', 'left', 'up', 'up', 'right']);
    }],
    ['B croix tactile : anneau extérieur complet et toucher refusé', () => {
        const directions = ['right', 'down', 'down', 'left', 'left', 'up', 'up', 'right'] as const;
        for (let radius = 50; radius <= 60; radius++) for (let sector = 0; sector < 8; sector++) {
            const angle = sector * Math.PI / 4;
            equal(cardinalDirection(joystickDirection(radius * Math.cos(angle), radius * Math.sin(angle))), directions[sector]);
        }
        // Reported rectangle x16 y724, diameter 120; client point (83,730).
        equal(cardinalDirection(joystickDirection(83 - 16 - 60, 730 - 724 - 60)), 'up');
    }],
    ['B boutons tactiles : pose et pouvoir sans pas de simulation', () => {
        const e = room(), before = e.snapshot();
        e.requestBomb();
        equal(e.bombs.map(b => b.at), [e.player.at]);
        equal(e.time, before.time);
        e.player.charges = 1; e.player.direction = 'right';
        check(e.special());
        equal(e.player.charges, 0);
        check(e.bombs.length > 1, 'Le pouvoir pose ses bombes immédiatement');
        equal(e.time, before.time);
    }],
    ['B01 grille et départs', () => {
        for (let l = 0; l < 30; l++) {
            const e = new Engine(); e.loadLevel(l);
            for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) if (x === 0 || y === 0 || x === WIDTH - 1 || y === HEIGHT - 1 || x % 2 === 0 && y % 2 === 0) check(e.board.walls.includes(y * WIDTH + x));
            for (const [at, a, b] of [[12, 13, 23], [20, 19, 31], [122, 111, 123], [130, 119, 129]]) for (const p of [at, a, b]) check(!e.board.blocks.some(b => b.at === p));
        }
    }],
    ['B02 centres et virage mémorisé', () => {
        const e = room(); center(e.player, 13); e.input('right'); e.step(FIXED); equal(e.player.at, 14); check(e.player.travel > 0);
        e.input('down'); e.step(100); equal(e.player.at, 14); check(e.player.travel > 0);
        e.step(200); equal(e.player.at, 25); check(e.player.travel > 0); equal(e.player.direction, 'down');
        e.input(null); e.step(300); equal(e.player.travel, 0); equal(e.player.at, 25);
        const buffered = room(); buffered.input('right'); buffered.step(100); buffered.requestBomb(); check(buffered.pendingBomb > 0); buffered.input(null); buffered.step(200); equal(buffered.bombs[0]?.at, 13);
    }],
    ['B03 capacité minuterie sortie et retour', () => {
        const e = room(); check(e.place()); check(!e.place()); e.input('right'); e.step(300); e.input('left'); e.step(600); equal(e.player.at, 13); check(!e.place());
        equal(e.bombs.length, 1); e.input(null); e.step(1580); equal(e.bombs.length, 1); e.step(20); equal(e.bombs.length, 0); check(e.fires.length > 0);
    }],
    ['B04 croix murs et premier bloc', () => {
        const e = room(); e.board.blocks = [{ at: 16, hp: 1, kind: 'normal' }, { at: 17, hp: 1, kind: 'normal' }];
        equal(e.blast(14, 6), [14, 15, 16, 25, 36, 47, 58, 69, 80, 13, 12]);
        e.bombs = [bomb(14, 0, FIXED, 1, 6)]; e.step(FIXED);
        check(!e.board.blocks.some(b => b.at === 16)); check(e.board.blocks.some(b => b.at === 17)); check(!e.fires.some(f => f.at === 17)); equal(e.score, 10);
    }],
    ['B05 chaînes immédiates et ordre', () => {
        const a = room(), b = room(); const bombs = [bomb(14, 0, FIXED), bomb(16, 1, 2500, 2), bomb(18, 1, 2500, 3)];
        a.bombs = structuredClone(bombs); b.bombs = structuredClone(bombs).reverse(); a.step(FIXED); b.step(FIXED);
        equal(a.bombs.length, 0); equal(a.snapshot(), b.snapshot()); equal(a.events.filter(e => e === 'chain').length, 2); check(a.fires.some(f => f.at === 20));
    }],
    ['B06 cœurs et immunité', () => {
        const e = room(); e.fires = [{ at: 12, owner: 1, character: 'dragon', left: 5000 }]; e.step(FIXED); equal(e.player.hearts, 1); equal(e.player.immune, 2000);
        e.step(1900); equal(e.player.hearts, 1); e.step(120); equal(e.player.hearts, 0); equal(e.status, 'lost');
    }],
    ['B07 bonus plafonds et destruction', () => {
        for (const [kind, key, cap] of [['range', 'range', 6], ['capacity', 'capacity', 4], ['speed', 'speed', 6]] as const) {
            const increment = room(); const before = increment.player[key]; increment.pickups = [{ at: 13, kind }]; increment.input('right'); increment.step(350); equal(increment.player[key], before + 1);
            const e = room(); e.player[key] = cap; e.pickups = [{ at: 13, kind }]; e.input('right'); e.step(350); equal(e.player[key], cap); equal(e.pickups.length, 0); equal(e.score, 25);
        }
        const e = room(); e.pickups = [{ at: 13, kind: 'special' }]; e.input('right'); e.step(350); equal(e.player.charges, 1);
        e.pickups = [{ at: 15, kind: 'range' }, { at: 16, kind: 'special' }]; e.bombs = [bomb(14, 1, FIXED)]; e.step(FIXED); equal(e.pickups.length, 0);
    }],
    ['B08 cinq pouvoirs exacts', () => {
        for (const id of ids) {
            const e = room(); e.player.character = id; e.player.charges = 1; center(e.player, 34); e.player.direction = 'right';
            if (id === 'pandaroux') e.bombs = [bomb(35)];
            check(e.special()); equal(e.player.charges, 0); check(!e.special());
            if (id === 'panda') { equal(e.bombs.map(b => b.at), [35, 36, 37]); equal(e.bombs.map(b => b.range), [2, 2, 2]); }
            if (id === 'pandaroux') { equal(e.bombs[0]?.slide, 'right'); e.step(FIXED * 4); equal(e.bombs[0]?.at, 35); e.step(FIXED); equal(e.bombs[0]?.at, 36); e.step(FIXED * 4); equal(e.bombs[0]?.at, 36); e.step(FIXED); equal(e.bombs[0]?.at, 37); }
            if (id === 'dragon') { equal(e.fires.map(f => f.at), [35, 36, 37, 38, 39, 40]); }
            if (id === 'singe') { equal(e.player.shield, 2000); e.fires = [{ at: 34, owner: 1, character: 'dragon', left: 500 }]; e.step(1500); equal(e.player.hearts, 2); check(e.player.shield > 490); e.fires = [{ at: 34, owner: 1, character: 'dragon', left: 1000 }]; e.step(480); equal(e.player.hearts, 2); e.step(40); equal(e.player.hearts, 1); }
            if (id === 'licorne') equal(e.player.at, 37);
        }
    }],
    ['B08 destinations sûres et collision glissante', () => {
        for (const threat of ['fire', 'bomb'] as const) {
            const e = room(); center(e.player, 34); e.player.character = 'licorne'; e.player.direction = 'right'; e.player.charges = 1;
            if (threat === 'fire') e.fires = [{ at: 37, owner: 1, character: 'dragon', left: 500 }];
            else e.bombs = [bomb(39, 1)];
            const danger = e.danger(); check(e.special()); check(!danger.has(e.player.at), 'Téléportation dangereuse');
        }
        for (const moving of [false, true]) {
            const e = room(); center(e.player, moving ? 37 : 36); if (moving) { e.player.from = 36; e.player.travel = .8; }
            e.bombs = [bomb(35)]; required(e.bombs[0]).slide = 'right'; e.step(100); equal(e.bombs[0]?.at, 35);
        }
        for (const character of ids) {
            const e = room(); const b = bomb(34, 1, FIXED); b.character = character; e.bombs = [b]; e.step(FIXED);
            check(e.fires.length > 0); check(e.fires.every(f => f.character === character), 'Couleur du poseur');
        }
    }],
    ['B08 distance et prévision des bombes glissantes', () => {
        const limit = room(); center(limit.player, 34); limit.player.character = 'licorne'; limit.player.direction = 'right'; limit.player.charges = 1;
        limit.fires = [36, 37].map(at => ({ at, owner: 1, character: 'dragon', left: 500 }));
        check(limit.special()); equal(limit.player.at, 25);
        for (const scenario of ['plain', 'candy', 'block', 'chain'] as const) {
            const e = room(); if (scenario === 'candy') e.loadLevel(27);
            e.board.blocks = scenario === 'block' ? [{ at: 40, hp: 1, kind: 'normal' }] : [];
            for (const a of e.actors.slice(1)) { center(a, 130); a.think = 1000000; }
            e.bombs = [bomb(34, 1, 1000)]; required(e.bombs[0]).slide = 'right';
            if (scenario === 'chain') e.bombs.push(bomb(40, 1, 2300, 2));
            const predicted = e.danger();
            // The oracle advances the real rules, never calls danger to obtain flames.
            e.step(1000);
            for (const fire of e.fires) check(predicted.has(fire.at), `Flamme non prévue ${String(fire.at)}`);
            for (const time of predicted.values()) check(Math.abs(time - 1000) < .001, 'Échéance glissante ou chaîne');
        }
        for (const candy of [false, true]) {
            const e = room(); if (candy) e.loadLevel(27);
            e.board.blocks = []; center(e.player, 38); for (const a of e.actors.slice(1)) { center(a, 130); a.think = 1000000; }
            e.player.character = 'licorne'; e.player.direction = 'right'; e.player.charges = 1;
            e.bombs = [bomb(34, 1, 1000)]; required(e.bombs[0]).slide = 'right';
            const predicted = e.danger(); if (!candy) check(predicted.has(42), 'Trajet glissant absent');
            const actual = new Engine(); actual.restore(e.snapshot()); actual.step(1000);
            const flames = [...new Set(actual.fires.map(f => f.at))].sort((a, b) => a - b);
            check(flames.length > 0); for (const at of flames) check(predicted.has(at), `Flamme future non prévue : ${String(at)}`);
            check(e.special()); const destination = e.player.at;
            e.step(1000); check(!e.fires.some(f => f.at === destination), 'Téléportation dans les flammes futures'); equal(e.player.hearts, candy ? 1 : 2);
        }
    }],
    ['B09 budget égal des cinq identités', () => {
        const states = ids.map(id => { const e = new Engine(id); e.loadLevel(9); const p = e.player; return [p.hearts, p.speed, p.capacity, p.range, p.charges]; });
        for (const state of states) equal(state, [2, 4, 1, 2, 0]);
        for (const id of ids) { const e = room(); e.player.character = id; e.player.charges = 1; check(e.special()); check(!e.special()); equal(e.score, 0); }
    }],
    ['B10 fuite et absence de suicide sur vingt essais', () => {
        let suicides = 0;
        for (let seed = 0; seed < 20; seed++) {
            const e = room(); e.random.state = seed; const a = required(e.actors[1]);
            const [at, block] = required(([[71, 49], [14, 15], [119, 108], [34, 35]] as const)[seed % 4]); center(a, at); a.think = 0;
            e.board.blocks = [{ at: block, hp: 1, kind: 'normal' }]; check(e.canBomb(a)); check(e.place(a)); check(e.escape(a)?.length);
            for (let n = 0; n < 200; n++) e.step(FIXED);
            if (!a.hearts) suicides++;
        }
        check(suicides <= 1, `Suicides : ${String(suicides)}`);
        const playerBomb = room(), runner = required(playerBomb.actors[1]); center(runner, 14); runner.queued = 'right'; runner.think = 1000;
        playerBomb.bombs = [bomb(18)]; playerBomb.step(566.67); check(runner.at !== 17, 'Direction périmée face au joueur');
        const stale = room(), walker = required(stale.actors[1]); center(walker, 25); walker.queued = 'down'; walker.think = 1000;
        stale.bombs = [bomb(34, 1, 100)]; stale.step(300); equal(walker.hearts, 1); check(walker.at !== 36);
        const crossing = room(); crossing.board.portals = [13, 119]; crossing.board.walls.push(23); crossing.fires = [{ at: 12, owner: 1, character: 'dragon', left: 500 }, { at: 13, owner: 1, character: 'dragon', left: 500 }];
        equal(crossing.escape(crossing.player), null);
        const movingBelt = room(); movingBelt.board.conveyors = [{ at: 37, direction: 'right' }]; center(movingBelt.player, 37); movingBelt.player.from = 36; movingBelt.player.travel = .5; movingBelt.board.blocks = [{ at: 40, hp: 1, kind: 'normal' }];
        const intent = movingBelt.policy(movingBelt.player, true); check(intent.bomb, 'Planifier depuis la sortie du tapis');
        const chained = room(); chained.bombs = [bomb(14, 1, 100)]; check(!chained.canBomb(chained.player), 'Fuite trop lente avant chaîne');
        const seeking = room(), seeker = required(seeking.actors[1]); center(seeker, 34); center(seeking.player, 122);
        seeking.pickups = [{ at: 36, kind: 'speed' }]; equal(seeking.policy(seeker).direction, 'right');
        const reveal = room(); reveal.board.blocks = [{ at: 16, hp: 1, kind: 'normal', drop: 'special' }];
        reveal.bombs = [bomb(14, 1, FIXED)]; reveal.step(FIXED);
        equal(reveal.pickups, [{ at: 16, kind: 'special' }]); equal(reveal.score, 0);
        const e = room(); center(e.player, 12); e.board.walls.push(13, 23); check(!e.canBomb(e.player)); equal(e.policy().bomb, false);
        const trapped = room(), ai = required(trapped.actors[1]); center(ai, 14); ai.think = 0; trapped.board.walls.push(13, 25); trapped.board.blocks = [{ at: 15, hp: 1, kind: 'normal' }];
        equal(trapped.policy(ai).bomb, false); trapped.step(1000); equal(trapped.bombs.length, 0);
    }],
    ['B11 fins et anneaux', () => {
        const win = room(); required(win.actors[1]).hearts = 0; win.step(FIXED); equal(win.status, 'won');
        const finish = room(); center(finish.player, 13); const rival = required(finish.actors[1]); center(rival, 15); rival.think = 0; finish.board.walls.push(16, 26, 25);
        finish.place(); finish.input('left'); finish.step(270); finish.input('down'); finish.step(270); finish.input(null); finish.step(2500); equal(finish.status, 'won');
        const danger = new Engine(); danger.loadLevel(10); danger.board.blocks = []; danger.place(); danger.step(2200); equal(danger.status, 'playing'); danger.step(500); equal(danger.status, 'lost');
        const loss = room(); loss.player.hearts = 0; loss.step(FIXED); equal(loss.status, 'lost');
        const scored = room(); const victim = required(scored.actors[1]); center(victim, 15); victim.think = 1000000; scored.board.walls.push(14, 16, 26);
        scored.fires = [{ at: 15, owner: 0, character: 'panda', left: 500 }]; scored.step(FIXED);
        equal(scored.score, 200 + Math.floor((difficulty(0).deadline - FIXED) / 1000));
        const gold = new Engine(); gold.loadLevel(21); center(gold.player, 34); gold.board.blocks = [{ at: 15, hp: 1, kind: 'gold' }]; gold.bombs = [bomb(14, 1, FIXED)]; gold.step(FIXED); equal(gold.status, 'won');
        const cadence = new Engine(); cadence.loadLevel(24); center(cadence.player, 71); for (const a of cadence.actors.slice(1)) center(a, 69); cadence.board.blocks = []; cadence.board.walls.push(70, 72, 60, 82);
        cadence.ticks = difficulty(24).deadline / FIXED - 1; cadence.step(FIXED); equal(cadence.ring, 1);
        cadence.step(3980); equal(cadence.ring, 1); cadence.step(20); equal(cadence.ring, 2);
        const sudden = new Engine(); sudden.loadLevel(24); sudden.ticks = 7000; sudden.step(FIXED); check(sudden.ring > 0); equal(sudden.status, 'lost');
    }],
    ['B12 déterminisme partition et sauvegarde', () => {
        const a = room(), b = room(); a.input('right'); b.input('right'); a.place(); b.place(); a.step(1000); for (let n = 0; n < 60; n++) b.step(FIXED);
        equal(a.snapshot(), b.snapshot());
        const c = new Engine(); c.restore(a.snapshot()); a.step(500); c.step(500); equal(a.snapshot(), c.snapshot());
        const detached = c.snapshot(); required(detached.actors[0]).at = 99; check(c.player.at !== 99);
    }],
    ['B12 partition des pas avec IA et bombes glissantes', () => {
        for (const sliding of [false, true]) {
            const a = new Engine(); a.loadLevel(sliding ? 27 : 20); a.board.blocks = [];
            if (sliding) { a.bombs = [bomb(34, 1, 2500)]; required(a.bombs[0]).slide = 'right'; }
            const b = new Engine(); b.restore(a.snapshot());
            for (let chunk = 0; chunk < 20 && a.status === 'playing'; chunk++) {
                const direction = chunk % 2 ? 'down' : 'right'; a.input(direction); b.input(direction);
                if (chunk % 3 === 0) { a.place(); b.place(); }
                a.step(250); for (let tick = 0; tick < 15; tick++) b.step(FIXED);
                equal(a.snapshot(), b.snapshot());
            }
        }
    }],
    ['B12 recherche déterministe sans mutation du moteur vivant', () => {
        const e = room(); e.bombs = [bomb(14, 1, 1000)];
        const before = e.snapshot(), a = new Pilot(), b = new Pilot();
        equal(a.decide(e), b.decide(e)); equal(e.snapshot(), before);
        const live = new Pilot();
        for (let tick = 0; tick < 180; tick++) { live.play(e); e.step(FIXED); }
        equal(e.player.hearts, 2); equal(e.status, 'playing');
    }],
    ['B08 déplacement réel, longue mèche et restauration du cache', () => {
        for (const fuse of [500, 2200]) {
            const e = room(); center(e.player, 36); e.input('left');
            e.bombs = [bomb(34, 1, fuse)]; required(e.bombs[0]).slide = 'right';
            const predicted = e.danger(); let flames = 0;
            for (let tick = 1; tick <= Math.ceil(fuse / FIXED); tick++) {
                e.step(FIXED);
                for (const fire of e.fires) {
                    flames++;
                    check((predicted.get(fire.at) ?? Infinity) <= tick * FIXED + .001, `Déplacement : échéance tardive ${String(fire.at)}`);
                }
            }
            check(flames > 0);
        }
        const chained = room(); center(chained.player, 36); chained.input('left');
        chained.bombs = [bomb(34, 1, 2200), bomb(12, 1, 100, 2)]; required(chained.bombs[0]).slide = 'right';
        const predicted = chained.danger(), firstFlames = new Map<number, number>();
        for (let tick = 1; tick <= 132; tick++) {
            chained.step(FIXED);
            for (const fire of chained.fires) if (!firstFlames.has(fire.at)) firstFlames.set(fire.at, tick * FIXED);
        }
        for (const at of [35, 36, 45, 56]) check((firstFlames.get(at) ?? Infinity) <= 100 + .001, 'Chaîne réelle à 100 ms');
        for (const [at, time] of firstFlames) check((predicted.get(at) ?? Infinity) <= time + .001, `Échéance tardive ${String(at)}`);
        const reused = room(); reused.bombs = [bomb(34, 1, 500)]; required(reused.bombs[0]).slide = 'right';
        reused.danger();
        const state = reused.snapshot(); state.ticks = 5; state.time = 5 * FIXED; required(state.bombs[0]).fuse -= 5 * FIXED;
        reused.restore(state); const fresh = new Engine(); fresh.restore(state);
        equal([...reused.danger()], [...fresh.danger()]);
        // Same cells, different resistance: an early blast opens the sliding path only at hp=1.
        const resistant = room(); resistant.board.blocks = [{ at: 36, hp: 1, kind: 'reinforced' }];
        resistant.bombs = [bomb(25, 1, 100, 2), bomb(34, 1, 2000)]; required(resistant.bombs[1]).slide = 'right';
        const first = [...resistant.danger()]; required(resistant.board.blocks[0]).hp = 2;
        const second = [...resistant.danger()]; check(JSON.stringify(first) !== JSON.stringify(second), 'Résistance ignorée par le cache');
    }],
    ['B12 contrat de recherche, cadence et récompenses', () => {
        const e = room(), pilot = new Pilot();
        const decisions: number[] = [];
        pilot.decide = () => { decisions.push(e.ticks); return { direction: null, bomb: false }; };
        for (let tick = 0; tick < 31; tick++) { e.ticks = tick; pilot.play(e); }
        equal(decisions, [0, 15, 30]);
        // Observe real rollout calls without depending on a winning route.
        // eslint-disable-next-line @typescript-eslint/unbound-method -- Saved for restoration; calls below supply the receiver explicitly.
        const originalStep = Engine.prototype.step, originalRestore = Engine.prototype.restore;
        const ends: number[] = []; let restores = 0;
        try {
            Engine.prototype.restore = function(state) { originalRestore.call(this, state); restores++; };
            Engine.prototype.step = function(ms) { this.time += ms; ends[restores - 1] = this.time; };
            new Pilot().decide(room());
            check(restores >= 2, 'Plusieurs actions doivent être simulées');
            check(ends.every(time => time >= 3000), 'Horizon de trois secondes');
        } finally { Engine.prototype.step = originalStep; Engine.prototype.restore = originalRestore; }
        const before = room(), after = room(); before.board.blocks = [{ at: 15, hp: 1, kind: 'normal' }];
        equal(outcomeRewards(before, after), 20);
        before.board.blocks = []; required(after.actors[1]).hearts = 0;
        equal(outcomeRewards(before, after), 2000);
        // The preferred first candidate is deliberately rewarded but loses a heart.
        const danger = room(); let firstDirection: string | null = null, firstBomb = false;
        let roll = 0;
        try {
            Engine.prototype.restore = function(state) { originalRestore.call(this, state); roll++; };
            Engine.prototype.step = function(ms) {
                this.time += ms;
                if (roll === 1) { firstDirection = this.player.queued; firstBomb = this.bombs.length > 0; this.player.hearts--; this.status = 'won'; }
            };
            const action = new Pilot().decide(danger);
            check(action.direction !== firstDirection || action.bomb !== firstBomb, 'Simulation blessante acceptée');
        } finally { Engine.prototype.step = originalStep; Engine.prototype.restore = originalRestore; }
    }],
    ['B12 couverture et score des décisions', () => {
        // Controlled rollouts isolate each reward from incidental engine points.
        // eslint-disable-next-line @typescript-eslint/unbound-method -- Restored in finally, invoked with an explicit receiver.
        const originalStep = Engine.prototype.step, originalRestore = Engine.prototype.restore;
        try {
            for (const reward of ['blocks', 'eliminated', 'points', 'threat', 'distance', 'pressure']) {
                const e = room(); center(e.player, 36);
                let roll = 0;
                const actions: { direction: typeof e.player.queued; bomb: boolean }[] = [];
                Engine.prototype.restore = function(state) { originalRestore.call(this, state); roll++; };
                Engine.prototype.step = function(ms) {
                    if (this.time === 0) actions.push({ direction: this.player.queued, bomb: this.bombs.length > 0 });
                    this.time += ms; this.bombs = [];
                    // Only the first two candidates survive, with identical baseline scores.
                    if (roll > 2) { this.player.hearts = 0; return; }
                    center(this.player, 36); center(required(this.actors[1]), 130);
                    if (reward === 'pressure' && roll === 2 && this.time < 3000) this.bombs = [bomb(130, 0, 1000)];
                    if (this.time >= 3000 && roll === 2) {
                        if (reward === 'blocks') this.board.blocks = [];
                        if (reward === 'eliminated') required(this.actors[1]).hearts = 0;
                        if (reward === 'points') this.score += 10;
                        if (reward === 'threat') this.bombs = [bomb(130, 1, 1000)];
                        if (reward === 'distance') center(required(this.actors[1]), 37);
                    }
                };
                if (reward === 'blocks') e.board.blocks = [{ at: 80, hp: 1, kind: 'normal' }];
                const chosen = new Pilot().decide(e);
                equal({ direction: chosen.direction, bomb: chosen.bomb }, actions[1]);
                check(JSON.stringify(actions[0]) !== JSON.stringify(actions[1]), 'Candidats discriminants');
            }
            const e = room(); center(e.player, 36); e.player.character = 'singe'; e.player.charges = 1;
            const evaluated: { direction: typeof e.player.queued; bomb: boolean; special: boolean }[] = [];
            Engine.prototype.restore = function(state) { originalRestore.call(this, state); };
            Engine.prototype.step = function(ms) {
                if (this.time === 0) evaluated.push({ direction: this.player.queued, bomb: this.bombs.length > 0, special: this.player.charges === 0 });
                this.time += ms;
            };
            new Pilot().decide(e);
            for (const direction of ['up', 'right', 'down', 'left']) {
                check(evaluated.some(a => a.direction === direction && !a.bomb), `Direction absente ${direction}`);
                check(evaluated.some(a => a.direction === direction && a.bomb), `Pose avec fuite absente ${direction}`);
            }
            check(evaluated.some(a => a.direction === null && !a.bomb && !a.special), 'Repos absent');
            check(evaluated.some(a => a.special), 'Pouvoir absent');
        } finally { Engine.prototype.step = originalStep; Engine.prototype.restore = originalRestore; }
    }],
    ['B12 IA active et choix discriminant', () => {
        const e = new Engine(); e.loadLevel(0, 0); e.board.blocks = [];
        center(e.player, 36); center(required(e.actors[1]), 37); required(e.actors[1]).think = 0;
        const before = e.snapshot();
        // The adjacent rival really moves and evades: pretending it is frozen chooses a suicidal trap instead.
        equal(new Pilot().decide(e), { direction: 'up', bomb: false });
        equal(e.snapshot(), before);
    }],
    ['B12 continuations réelles, pouvoirs et variantes', () => {
        const e = room(); center(e.player, 36); e.player.character = 'dragon'; e.player.charges = 3; e.player.direction = 'right';
        e.board.blocks = [{ at: 39, hp: 2, kind: 'reinforced' }];
        // Wrappers observe the real rules; neither AI nor stepping is substituted.
        // eslint-disable-next-line @typescript-eslint/unbound-method -- Restored below, called with an explicit receiver.
        const originalSpecial = Engine.prototype.special, originalPolicy = Engine.prototype.policy;
        const laterPowers: number[] = [], variants = new Set<number>();
        try {
            Engine.prototype.special = function(...args) {
                const used = originalSpecial.apply(this, args);
                if (used && this.time > 0) laterPowers.push(this.time);
                return used;
            };
            Engine.prototype.policy = function(...args) {
                if (this.time > 0 && args[2]) variants.add(args[2]);
                return originalPolicy.apply(this, args);
            };
            const before = e.snapshot(); new Pilot().decide(e); equal(e.snapshot(), before);
            check(laterPowers.length > 0, 'Aucun pouvoir appliqué après le premier pas');
            for (const variant of [1, 2, 3]) check(variants.has(variant), `Continuation absente ${String(variant)}`);
        } finally { Engine.prototype.special = originalSpecial; Engine.prototype.policy = originalPolicy; }
    }],
    ['B12 bonus réellement recherché et ramassé', () => {
        const e = room(); center(e.player, 36); e.pickups = [{ at: 34, kind: 'speed' }];
        const action = new Pilot().decide(e);
        equal(action, { direction: 'left', bomb: false });
        e.input(action.direction); e.step(600);
        equal(e.player.speed, 5); check(!e.pickups.some(p => p.at === 34), 'Bonus ignoré');
    }],
    ['B12 frontière du budget de validation', () => {
        equal(durationFailures({ validationSeconds: 59.999 }), []);
        equal(durationFailures({ validationSeconds: 60 }).length, 1);
    }],
    ['B13 difficulté monotone dans chaque paramètre', () => {
        const up = ['opponents', 'aggression', 'density'] as const, down = ['drops', 'hearts', 'deadline'] as const;
        for (let n = 1; n < 30; n++) { const a = difficulty(n - 1), b = difficulty(n); for (const k of up) check(b[k] >= a[k]); for (const k of down) check(b[k] <= a[k]); }
        for (const k of up) check(difficulty(29)[k] > difficulty(0)[k]); for (const k of down) check(difficulty(29)[k] < difficulty(0)[k]);
    }],
    ['B14 démo vivante deux mille pas', thumbnailMotion],
    ['B14 contrat de vignette, reduce et accueil', thumbnailLifecycle],
    ['B15 diversité des trente salles', () => {
        equal(LEVELS.length, 30); equal(new Set(LEVELS.map(l => l.arena)).size, 4); equal(new Set(LEVELS.map(l => l.layout)).size, 6);
        const layouts = LEVELS.slice(0, 6).map((_, i) => { const e = new Engine(); e.loadLevel(i); return JSON.stringify(e.board.blocks.map(b => b.at)); }); equal(new Set(layouts).size, 6);
        const masks = Array.from({ length: 6 }, (_, layout) => new Set(Array.from({ length: WIDTH * HEIGHT }, (_, at) => at).filter(at => layoutAt(layout, at % WIDTH, Math.floor(at / WIDTH)))));
        for (let i = 0; i < 6; i++) for (let j = i + 1; j < 6; j++) {
            const a = required(masks[i]), b = required(masks[j]); const union = new Set([...a, ...b]); const overlap = [...a].filter(at => b.has(at)).length;
            check(1 - overlap / union.size > .15, 'Disposition trop proche');
        }
        let last = 0; for (const [at, mechanic] of introductions) { check(at - last >= 3 && at - last <= 5); equal(LEVELS[at]?.mechanics, [mechanic]); equal(LEVELS.findIndex(l => l.mechanics.includes(mechanic)), at); last = at; }
        check((LEVELS[29]?.mechanics.length ?? 0) >= 6);
        const e = new Engine(); e.loadLevel(3); check(e.board.blocks.some(b => b.drop === 'special'));
        e.loadLevel(7); check(e.board.blocks.some(b => b.hp === 2)); e.loadLevel(11); equal(e.board.conveyors.length, 4);
        e.loadLevel(15); equal(e.board.portals.length, 2); e.loadLevel(18); check(e.board.blocks.some(b => b.kind === 'ice'));
        e.loadLevel(21); check(e.board.blocks.some(b => b.kind === 'gold')); e.loadLevel(24); check(e.has('sudden')); e.loadLevel(27); check(e.has('candy'));
    }],
    ['B16 mécanismes exacts', () => {
        const e = room(); e.board.blocks = [{ at: 15, hp: 2, kind: 'reinforced' }]; e.bombs = [bomb(14, 1, FIXED)]; e.step(FIXED); equal(e.board.blocks[0]?.hp, 1);
        e.bombs = [bomb(14, 1, FIXED, 2)]; e.step(FIXED); equal(e.board.blocks.length, 0);
        const ice = room(); ice.board.blocks = [{ at: 15, hp: 1, kind: 'ice' }]; ice.bombs = [bomb(14, 1, FIXED)]; ice.step(FIXED); equal(ice.board.blocks[0]?.at, 16); check(!ice.fires.some(f => f.at === 16));
        for (const moving of [false, true]) {
            const occupied = room(); center(occupied.player, moving ? 17 : 16); if (moving) { occupied.player.from = 16; occupied.player.travel = .8; }
            occupied.board.blocks = [{ at: 15, hp: 1, kind: 'ice' }]; occupied.bombs = [bomb(14, 1, FIXED)]; occupied.step(FIXED);
            equal(occupied.board.blocks.length, 0); equal(occupied.player.hearts, 2);
        }
        for (const moving of [false, true]) {
            const occupied = room(), rival = required(occupied.actors[1]); center(rival, moving ? 17 : 16); rival.think = 1000000;
            if (moving) { rival.from = 16; rival.travel = .8; }
            occupied.board.blocks = [{ at: 15, hp: 1, kind: 'ice' }]; occupied.bombs = [bomb(14, 0, FIXED)]; occupied.step(FIXED);
            equal(occupied.board.blocks.length, 0); equal(rival.hearts, 1);
        }
        for (const portal of [false, true]) {
            const occupied = room(), rival = required(occupied.actors[1]); center(rival, portal ? 119 : 14); rival.think = 1000000;
            if (portal) occupied.board.portals = [13, 119]; else occupied.board.conveyors = [{ at: 13, direction: 'right' }];
            occupied.input('right'); occupied.step(200); occupied.input(null); occupied.step(100); equal(occupied.player.at, 13);
        }
        const belt = room(); belt.board.conveyors = [{ at: 13, direction: 'right' }]; belt.input('right'); belt.step(270); belt.input(null); equal(belt.player.from, 14);
        const portal = room(); portal.board.portals = [13, 119]; portal.input('right'); portal.step(270); portal.input(null); equal(portal.player.at, 119);
        const candy = room(); candy.loadLevel(27); candy.board.blocks = []; candy.bombs = [bomb(12)]; required(candy.bombs[0]).slide = 'left'; candy.step(100); equal(candy.bombs[0]?.slide, 'right');
        const push = room(); push.loadLevel(27); push.board.blocks = []; push.bombs = [bomb(13)]; push.input('right'); push.step(FIXED); equal(push.player.at, 12); equal(push.bombs[0]?.slide, 'right');
        equal(neighbor(12, 'right'), 13);
    }],
];
