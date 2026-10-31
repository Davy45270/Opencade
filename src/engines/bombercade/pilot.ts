import { Engine, WIDTH, HEIGHT, directions, neighbor, distance, type Intent } from './engine';
export type Action = Intent & { special?: boolean };
/** Explicit tactical rewards, independently checked from incidental engine points. */
export function outcomeRewards(engine: Engine, m: Engine): number {
    const eliminated = engine.actors.filter(a => a.id > 0 && a.hearts > 0).length - m.actors.filter(a => a.id > 0 && a.hearts > 0).length;
    return eliminated * 2000 + (engine.board.blocks.length - m.board.blocks.length) * 20;
}
/** Deterministic receding-horizon pilot. Forecasts use the same rules and AI. */
export class Pilot {
    private model = new Engine();
    private forecast?: Engine;
    constructor(private explore = true) {}
    specials = 0;
    private nextDecision = -1;
    private visits = new Uint16Array(WIDTH * HEIGHT);
    play(engine: Engine): Action | undefined {
        if (engine.ticks < this.nextDecision && engine.ticks !== 0) return;
        this.nextDecision = engine.ticks + 15;
        const chosen = this.decide(engine, 250);
        this.apply(engine, chosen);
        return chosen;
    }
    /** Read a decision without applying input or advancing the live engine. */
    readAction(engine: Engine): Action {
        this.forecast ??= new Engine();
        this.forecast.restore(engine.snapshot()); this.forecast.step(150);
        return this.decide(this.forecast, 150);
    }
    decide(engine: Engine, interval = 250): Action {
        const actor = engine.player;
        this.visits[actor.at] = Math.min(1000, (this.visits[actor.at] ?? 0) + 1);
        const preferred = this.preference(engine);
        const candidates: (Action & { variant?: number })[] = [preferred,
            { direction: null, bomb: false }, ...directions.map(direction => ({ direction, bomb: false }))];
        const escapes = new Set<string>();
        if (engine.canBomb(actor)) {
            const fake = { id: engine.nextBomb, at: actor.at, owner: 0, character: actor.character, range: actor.range, fuse: 2500, slide: null };
            const forecast = engine.danger(fake);
            for (let variant = 0; variant < 4; variant++) {
                const path = engine.escape(actor, fake, variant, forecast);
                if (path?.length && !escapes.has(path[0] ?? '')) { escapes.add(path[0] ?? ''); candidates.push({ direction: path[0] ?? null, bomb: true, variant }); }
            }
        }
        if (actor.charges && actor.travel === 0) candidates.push({ direction: null, bomb: false, special: true });
        const snapshot = engine.snapshot();
        let best = -Infinity, chosen: Action = engine.policy(actor, true);
        // Eleven restores at most per decision; every rollout retains the live AI.
        const cloneBudget = 11;
        const unique = candidates.filter((a, i) => candidates.findIndex(b => a.direction === b.direction && a.bomb === b.bomb && a.special === b.special && (a.variant ?? 0) === (b.variant ?? 0)) === i);
        for (const [index, intent] of unique.slice(0, cloneBudget).entries()) {
            if (intent.direction && actor.travel === 0 && !engine.walkable(neighbor(actor.at, intent.direction), actor)) continue;
            this.model.restore(snapshot);
            const m = this.model;
            m.input(intent.direction); if (intent.bomb) m.place(); if (intent.special) m.special();
            let harmed = false, pressure = 0;
            while (m.status === 'playing' && m.time < engine.time + 3000) {
                m.step(Math.min(interval, 250));
                const attacks = m.bombs.filter(b => b.owner === 0).flatMap(b => m.blast(b.at, b.range));
                pressure += m.actors.filter(a => a.id > 0 && a.hearts > 0 && attacks.includes(a.at)).length;
                if (m.player.hearts < actor.hearts) { harmed = true; break; }
                if (m.time >= engine.time + 3000) break;
                const next = this.preference(m, intent.variant ?? 0);
                m.input(next.direction);
                if (next.bomb) m.place();
                if (next.special) m.special();
            }
            if (harmed || m.player.hearts < actor.hearts || m.status === 'lost') continue;
            const rivals = m.actors.filter(a => a.id > 0 && a.hearts > 0);
            const threatened = rivals.filter(a => m.danger().has(a.at)).length;
            const score = (m.status === 'won' ? 100000 : 0) + outcomeRewards(engine, m) + threatened * 30 + pressure * 8
                + (m.score - engine.score) * .5
                - Math.min(30, ...rivals.map(a => distance(a.at, m.player.at))) * 3
                - Math.min(30, this.visits[m.player.at] ?? 0) * .2 - index * .001;
            if (score > best) { best = score; chosen = intent; }
        }
        return chosen;
    }
    private hunt(engine: Engine, variant: number): Intent {
        const actor = engine.player, danger = engine.danger();
        if (danger.has(actor.at)) return engine.policy(actor, true, variant, danger);
        const rivals = engine.actors.filter(a => a.id > 0 && a.hearts > 0);
        const blast = engine.blast(actor.at, actor.range);
        if (rivals.some(a => blast.includes(a.at) || this.explore && variant === 1 && distance(actor.at, a.at) <= actor.range + 2) && engine.canBomb(actor)) return { direction: null, bomb: true };
        const costs = new Map<number, number>([[actor.at, 0]]);
        const queue: { at: number; cost: number; first: number; direction: Intent['direction'] }[] = [{ at: actor.at, cost: 0, first: actor.at, direction: null }];
        const order = [...directions.slice(variant), ...directions.slice(0, variant)];
        while (queue.length) {
            queue.sort((a, b) => a.cost - b.cost);
            const node = queue.shift(); if (!node) break;
            const valuable = engine.pickups.some(p => p.at === node.at && (p.kind === 'special' || p.kind === 'speed' && actor.speed < 6 || p.kind === 'capacity' && actor.capacity < 4 || p.kind === 'range' && actor.range < 4));
            if (node.direction && (rivals.some(a => a.at === node.at) || valuable && node.cost <= 4 || engine.has('gold') && engine.board.blocks.some(b => b.at === node.at && b.kind === 'gold'))) {
                if (engine.board.blocks.some(b => b.at === node.first)) return { direction: null, bomb: engine.canBomb(actor) };
                return { direction: node.direction, bomb: false };
            }
            for (const direction of order) {
                const entry = neighbor(node.at, direction);
                if (entry < 0 || entry >= WIDTH * HEIGHT || engine.board.walls.includes(entry) || engine.bombs.some(b => b.at === entry) || danger.has(entry)) continue;
                const block = engine.board.blocks.find(b => b.at === entry);
                const at = block ? entry : engine.landing(entry, actor);
                if (danger.has(at)) continue;
                const cost = node.cost + (block ? 4 * block.hp : 1) + (this.explore && variant === 1 ? Math.min(10, this.visits[at] ?? 0) * .1 : 0);
                if ((costs.get(at) ?? Infinity) <= cost) continue;
                costs.set(at, cost); queue.push({ at, cost, first: node.direction ? node.first : entry, direction: node.direction ?? direction });
            }
        }
        return engine.policy(actor, true, variant, danger);
    }
    private preference(engine: Engine, variant = 0): Action {
        const actor = engine.player;
        let preferred: Action = this.explore && variant === 2 ? engine.policy(actor, true, variant) : this.hunt(engine, variant);
        const front = neighbor(actor.at, actor.direction);
        const offensive = engine.blast(front, actor.character === 'dragon' ? 6 : actor.range).some(p => engine.board.blocks.some(b => b.at === p) || engine.actors.some(a => a.id > 0 && a.hearts > 0 && a.at === p));
        if (actor.charges && (actor.character === 'singe' || actor.character === 'licorne' ? engine.danger().has(actor.at) : actor.character === 'pandaroux' ? engine.bombs.some(b => b.at === front) : offensive)) preferred = { direction: null, bomb: false, special: true };
        return preferred;
    }
    private apply(engine: Engine, chosen: Action): void {
        engine.input(chosen.direction); if (chosen.special && engine.special()) this.specials++; if (chosen.bomb) engine.place();
    }
}
