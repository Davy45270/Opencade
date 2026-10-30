import { Engine as Race } from '../src/engines/derapage/engine';
import { physics } from '../src/engines/derapage/physics';
import { Engine as Bubble } from '../src/engines/bubble/engine';
import { Engine as Snake } from '../src/engines/serpentin/engine';
import { ids } from '../src/characters/model';
import { selectCharacter } from '../src/characters/selection';
function check(ok: boolean, label: string): void { if (!ok) throw new Error(label); }
function equal(a: unknown, b: unknown, label: string): void { check(JSON.stringify(a) === JSON.stringify(b), label); }
export function derapageEffect(Engine = Race): void {
    const e = new Engine(), k = e.karts[0]; if (!k) throw new Error('kart');
    e.track.trees = []; e.track.boosts = []; e.track.widths.fill(10000); e.track.walls.fill(false);
    Object.assign(k, { x: 0, y: 0, angle: 0, vx: 24, vy: 0, boostMs: 0, item: 'turbo' });
    check(e.special(), 'P-derapage-02 accepted');
    physics(k, { steer: 0, drift: false, bonus: false }, e.track, 0.1, 0.45);
    check(Math.abs(k.vx - 25.712) < 0.000000001 && k.vy === 0 && k.specialMs === 700, 'P-derapage-02 exact acceleration');
    check(k.item === 'turbo' && k.boostMs === 0, 'independent item');
    check(!e.special(), 'P-derapage-03 lap limit'); e.advance(700);
    check((k.specialMs ?? 0) < 0.00000001 && !e.special(), 'P-derapage-03 elapsed cannot refund');
    k.lap = 1; check(e.special(), 'P-derapage-03 next lap'); check(!e.special(), 'P-derapage-03 next lap once');
    k.boostMs = 1800; Object.assign(k, { x: 0, y: 0, angle: 0, vx: 32, vy: 0 });
    physics(k, { steer: 0, drift: false, bonus: false }, e.track, 0.1, 0.45);
    check(Math.abs(k.vx - 33.616) < 0.000000001 && k.boostMs === 1700, 'P-derapage-02 additive bonus');
    check(e.special(1) && e.karts[1]?.specialMs === 800, 'P-derapage-05 equal AI impulse');
    e.loadLevel(0); check(e.special(), 'P-derapage-03 restart');
}
export function bubbleEffect(Engine = Bubble): void {
    const e = new Engine();
    e.load([{ row: 0, col: 4, color: 1 }, { row: 1, col: 4, color: 1 }, { row: 0, col: 0, color: 0 }], 0);
    e.aim(0.05); check(e.special(), 'P-bubble-02 accepted'); check(!e.special(), 'P-bubble-03 single use armed');
    check(e.shoot(), 'shot'); check(e.flight?.color === 1, 'P-bubble-02 exact projectile colour');
    check(!e.special(), 'P-bubble-03 flight'); e.advance(2000);
    equal(e.grid, [{ row: 0, col: 0, color: 0 }], 'P-bubble-02 exact group'); check(e.score === 30, 'P-bubble-02 exact score');
    check(!e.special() && e.specialMs === 0, 'P-bubble-03 no timed refund');
    e.restart(); check(e.specialUses === 1 && !e.specialArmed, 'P-bubble-03 restart');
    // A different-colour bomb must provide its colour, then propagate its blast.
    const bomb = [{ row: 0, col: 4, color: 1 as const }, { row: 1, col: 4, color: 1 as const, kind: 'bomb' as const }, { row: 0, col: 0, color: 0 as const }, { row: 0, col: 5, color: 2 as const }];
    for (const special of [false, true]) {
        e.load(bomb, 0); e.aim(0.05);
        if (special) e.special();
        check(e.trace().struck?.color === 1, 'different colour bomb contact');
        check(e.trace().struck?.kind === 'bomb', 'bomb struck');
        e.shoot(); check(e.flight?.color === (special ? 1 : 0), 'bomb supplies Joker colour'); e.advance(2000);
        check(special ? e.last.popped.some(c => c.kind === 'bomb') && e.last.popped.some(c => c.color === 2) : e.last.popped.length === 0, 'Joker alone triggers bomb chain');
    }

    e.load([{ row: 0, col: 4, color: 1, kind: 'stone' }, { row: 0, col: 0, color: 0 }], 0);
    e.special(); e.shoot(); check(e.flight?.color === 0, 'stone cannot supply colour');
    e.advance(2000); check(!e.specialArmed && !e.special(), 'P-bubble-03 shot always consumes joker');
}
export function serpentinEffect(Engine = Snake): void {
    const e = new Engine();
    e.loadState({ segments: [{ x: 7, y: 10 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 10 }, { x: 9, y: 10 }], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [], eaten: 0, score: 0, crystal: null, crystalUntil: 0 });
    check(e.special(), 'P-serpentin-02 accepted'); check(!e.special(), 'P-serpentin-03 one charge'); e.advance(167);
    equal(e.state.segments, [{ x: 8, y: 10 }, { x: 7, y: 10 }, { x: 7, y: 9 }, { x: 8, y: 9 }, { x: 8, y: 10 }], 'P-serpentin-02 exact crossing');
    check(e.status === 'playing' && !e.specialArmed && e.state.score === 0, 'P-serpentin-02 consumes exactly one collision');
    e.input('up'); e.advance(167); check(e.status === 'lost', 'P-serpentin-03 second body contact lethal'); check(!e.special(), 'terminal rejects');
    e.loadLevel(0); check(e.specialUses === 1, 'P-serpentin-03 restart'); e.special(); e.advance(1000);
    check(e.specialMs === 0 && e.specialArmed && !e.special(), 'P-serpentin-03 armed until body contact, no cooldown refund');
    e.loadState({ segments: [{ x: 7, y: 10 }], direction: 'right', apple: { x: 2, y: 2 }, obstacles: [{ x: 8, y: 10 }], eaten: 0, score: 0, crystal: null, crystalUntil: 0 });
    e.special(); e.advance(167); check(e.status === 'lost', 'P-serpentin-02 obstacle remains fatal');
}
export function balance(): void {
    const results = ids.map(id => {
        selectCharacter(id, undefined);
        const engines = [new Race(), new Bubble(), new Snake()];
        for (const e of engines) { e.special(); e.advance(150); }
        return engines.map(e => e.snapshot());
    });
    for (const result of results) equal(result, results[0], 'P-05 five identities, identical rules');
}
