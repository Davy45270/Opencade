import type Phaser from 'phaser';
import { Engine as Caisses } from '../src/engines/caisses/engine';
import { Engine as Traverse } from '../src/engines/traverse/engine';
import { Engine as Alunir } from '../src/engines/alunir/engine';
import { GameCharacter } from '../src/characters/game';
import { selectCharacter } from '../src/characters/selection';
import { ids, drawList } from '../src/characters/model';
import { renderCharacter } from '../src/characters/phaser';

function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
function equal(a: unknown, b: unknown, message: string): void { check(JSON.stringify(a) === JSON.stringify(b), message); }

export function rendered(Actor = GameCharacter): void {
    for (const id of ids) {
        selectCharacter(id, undefined);
        const actor = new Actor();
        const actual: unknown[] = [], expected: unknown[] = [];
        const graphics = (calls: unknown[]) => ({
            fillStyle: (...args: unknown[]) => calls.push(args), lineStyle: (...args: unknown[]) => calls.push(args),
            fillPoints: (...args: unknown[]) => calls.push(args), strokePoints: (...args: unknown[]) => calls.push(args),
        }) as unknown as Phaser.GameObjects.Graphics;
        actor.draw(graphics(actual), 10, 20, 38);
        renderCharacter(graphics(expected), drawList(id, 'face', 'concentre', 'repos', 0), 10, 20, 38);
        equal(actual, expected, 'P-01 selected identity reaches actual graphics geometry');
        actor.move(-1); actor.advance(0, false, 'playing', false);
        equal(actor.snapshot(), { id, pose: 'profil', expression: 'concentre', animation: 'marche' }, 'P-01 walk');
        actor.move(1, true); actor.advance(0, false, 'playing', false);
        check(actor.animation === 'saut' && actor.pose === 'profil' && !actor.flip, 'P-01 jump right');
        actor.move(-1, true); actor.advance(0, false, 'playing', false);
        check(actor.animation === 'saut' && actor.flip, 'P-01 jump left');
        actor.impact = 300; actor.advance(0, false, 'playing', false); check(actor.expression === 'surprise', 'P-01 impact');
        actor.advance(0, true, 'playing', false); check(actor.expression === 'dodo', 'P-01 pause');
        actor.advance(0, false, 'won', false); check(actor.expression === 'joie', 'P-01 win');
        actor.advance(400, false, 'lost', false); check(actor.expression === 'triste', 'P-01 lose');
        actor.advance(0, false, 'playing', true);
        const special: unknown[] = [], expectedSpecial: unknown[] = [];
        actor.draw(graphics(special), 10, 20, 38);
        renderCharacter(graphics(expectedSpecial), drawList(id, 'profil', 'concentre', 'special', 400), 10, 20, 38, true);
        equal(special, expectedSpecial, 'P-01 selected special geometry');
    }
}
export function caissesEffect(Engine = Caisses): void {
    const e = new Engine(); e.loadPuzzle('#######\n# .$@ #\n#     #\n#######');
    check(e.special('left'), 'P-caisses-02 pull accepted');
    equal({ player: e.state.player, boxes: e.state.boxes, moves: e.state.moves, pushes: e.state.pushes }, { player: 12, boxes: [11], moves: 1, pushes: 0 }, 'P-caisses-02 exact pull');
    check(!e.special('left'), 'P-caisses-03 single use');
    e.undo(); check(!e.special('left'), 'P-caisses-03 undo cannot refund');
    e.advance(800); check(e.specialMs === 0, 'P-caisses-03 visual duration');
    e.restart(); check(e.specialUses === 1, 'P-caisses-03 restart');
    e.loadPuzzle('#####\n#@$.#\n#####');
    check(!e.special('right') && e.specialUses === 1, 'P-caisses-03 invalid pull preserves charge');
}
export function traverseEffect(Engine = Traverse): void {
    const e = new Engine(); e.board = { lanes: [], shelters: [1, 4, 7] };
    check(e.special(), 'P-traverse-02 accepted'); e.advance(500);
    equal(e.state.player, { x: 4, y: 12 }, 'P-traverse-02 exactly two cells');
    check(!e.special(), 'P-traverse-03 one per life');
    e.loadState({ player: { x: 4, y: 14 }, previous: { x: 4, y: 14 }, lives: 3, occupied: [], time: 1, phase: 0, score: 0 });
    e.advance(17); check(e.state.lives === 2 && e.specialUses === 1, 'P-traverse-03 death refunds');
    e.loadLevel(0); check(e.specialUses === 1, 'P-traverse-03 level resets');
    e.board = { lanes: [{ y: 13, kind: 'road', direction: 1, offset: 4, diver: false }], shelters: [1, 4, 7] };
    e.special(); e.advance(500); check(e.state.lives === 3 && e.state.player.y === 12, 'P-traverse-02 skips intermediate hazard');
}
export function alunirEffect(Engine = Alunir): void {
    const e = new Engine(); e.loadState({ x: 180, y: 100, vx: 0.8, vy: 0, angle: 0.4, fuel: 100 });
    check(e.special(), 'P-alunir-02 accepted');
    equal({ vx: e.state.vx, vy: e.state.vy, angle: e.state.angle, fuel: e.state.fuel }, { vx: 0.4, vy: 0, angle: 0, fuel: 70 }, 'P-alunir-02 exact effect');
    check(!e.special(), 'P-alunir-03 cooldown');
    e.input({ thrust: false, left: false, right: true }); e.advance(1000);
    check(e.state.angle === 0 && e.specialTicks === 0, 'P-alunir-03 lock lasts 60 ticks');
    check(e.special(), 'P-alunir-03 second use'); e.advance(1000);
    check(!e.special(), 'P-alunir-03 exhausted');
    e.loadLevel(0); e.loadState({ fuel: 29 }); check(!e.special() && e.specialUses === 2, 'P-alunir-03 insufficient fuel');
    e.loadState({ fuel: 30 }); check(e.special() && e.state.fuel === 0, 'P-alunir-03 fuel boundary');
    const a = new Engine(), b = new Engine(); a.special(); b.special(); a.advance(1000);
    for (let i = 0; i < 60; i++) b.advance(1000 / 60);
    equal(a.snapshot(), b.snapshot(), 'P-alunir-03 deterministic advance partition');
}
export function balance(): void {
    const results = ids.map(id => {
        selectCharacter(id, undefined);
        const c = new Caisses(); c.loadPuzzle('#######\n# .$@ #\n#     #\n#######'); c.special('left'); c.advance(500);
        const t = new Traverse(); t.special(); t.advance(500);
        const a = new Alunir(); a.special(); a.advance(500);
        return [c.snapshot(), t.snapshot(), a.snapshot()];
    });
    for (const result of results) equal(result, results[0], 'P-05 identical simulation for five selections');
}
