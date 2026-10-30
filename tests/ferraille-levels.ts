import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Engine, DT, LEVELS, move, type State } from '../src/engines/ferraille/engine';
import { moduleAt, stepModules, pistonClosed, MODULES, type ModuleKind } from '../src/engines/ferraille/modules';
import { measureRepetition, sequenceSimilarity } from '../scripts/ferraille-diversity.js';
import { pilot } from '../src/engines/ferraille/pilot';
import { witness } from './level-catalogue-ferraille-replay';
function present<T>(value: T | undefined): T { assert(value !== undefined); return value; }
export function moduleEffects(step = stepModules, closed = pistonClosed): void {
    const setup = (kind: ModuleKind) => {
        const e = new Engine(), s = e.state;
        s.tiles.fill(false); for (let x = 0; x < s.columns; x++) for (let y = 16; y < 20; y++) s.tiles[y * s.columns + x] = true;
        s.hero = { x: 110, y: 234, w: 12, h: 22, vx: 0, vy: 0 }; s.modules = [moduleAt(kind, 100)];
        s.enemies = []; s.platforms = []; s.bonuses = []; s.cages = []; s.boss = null;
        let deaths = 0;
        return { s, m: present(s.modules[0]), run: () => { step(s, (axis, amount) => { move(s, s.hero, axis, amount); }, () => { deaths++; }); }, deaths: () => deaths };
    };
    { const t = setup('conveyor'); t.run(); assert.equal(t.s.hero.x, 110.4); }
    { const t = setup('wind'); t.run(); assert.equal(t.s.hero.x, 109.4); }
    { const t = setup('piston'); for (const tick of [99, 100, 144, 145, 180]) { t.s.ticks = tick; t.run(); } assert.equal(t.deaths(), 2); assert.equal(closed(100), true); assert.equal(closed(145), false); }
    { const t = setup('piston'); t.s.ticks = 100; for (const [x, y] of [[120, 0], [120, 156], [120, 256], [104, 234], [180, 234]]) { t.s.hero.x = present(x); t.s.hero.y = present(y); t.run(); } assert.equal(t.deaths(), 0); t.s.hero.x = 120; t.s.hero.y = 157; t.run(); assert.equal(t.deaths(), 1); }
    { const t = setup('bridge'); for (let i = 0; i < 35; i++) t.run(); assert.equal(t.s.tiles[16 * t.s.columns + 9], true); t.run(); assert.equal(t.s.tiles[16 * t.s.columns + 9], false); assert.equal(t.m.value, 1); }
    { const t = setup('gate'); t.s.hero.x = 140; t.run(); assert.equal(t.s.hero.x, 133); t.s.input = { x: 0, y: -1, fire: true, jump: false }; for (let i = 0; i < 18; i++) t.run(); assert.equal(t.m.value, 18); t.s.hero.x = 145; t.run(); assert.equal(t.s.hero.x, 145); }
    { const t = setup('secret'); t.s.input.fire = true; for (let i = 0; i < 30; i++) t.run(); assert.equal(t.m.value, 30); t.s.input.fire = false; for (let i = 0; i < 60; i++) t.run(); t.s.input.fire = true; for (let i = 0; i < 30; i++) t.run(); assert.equal(t.m.value, 30); assert.deepEqual(t.s.bonuses, [{ x: 170, y: 232, w: 16, h: 24, kind: 'shield' }]); }
    { const t = setup('crate'); t.s.hero.x = 112; t.s.input.x = 1; t.run(); assert.equal(t.m.value, .8); assert.equal(t.s.hero.x, 112); }
    { const t = setup('spring'); t.run(); assert.equal(t.s.hero.vy, -390); assert.equal(t.s.grounded, false); }
    { const t = setup('rails'); t.s.input.y = -1; t.run(); assert.equal(t.s.hero.x, 111); assert.equal(t.s.hero.vy, -260); }
    { const t = setup('lava'); for (let i = 0; i < 101; i++) t.run(); assert.equal(t.m.value, 40.400000000000006); assert.equal(t.deaths(), 1); }
    { const t = setup('spotlight'); t.s.ticks = 89; t.run(); assert.equal(t.m.value, 0); t.s.ticks = 90; t.run(); assert.equal(t.m.value, 1); }
    for (const kind of ['lift', 'chain', 'tower', 'hut', 'tunnel'] as const) {
        const level = LEVELS.findIndex(l => l.star === kind), e = new Engine(); e.loadLevel(level, 28); const s = e.state;
        const m = present((s.modules ?? []).find(m => m.kind === kind && !m.preview));
        if (kind === 'lift' || kind === 'chain') {
            const p = present(s.platforms.find(p => p.originX === m.x - 32));
            assert(p); s.hero.x = p.x + 12; s.hero.y = p.y - s.hero.h; 
            e.step(DT); assert.equal(s.hero.y + s.hero.h, p.y);
            if (kind === 'lift') assert.equal(p.y, 212.39998639469664); else assert.equal(p.x, 320.3333179014489);
        } else if (kind === 'tower') assert(s.enemies.some(e => e.kind === 'turret' && e.x === m.x + 90 && e.y === 208));
        else if (kind === 'hut') assert(s.cages.some(c => c.x === m.x + 32 && c.hp === 3));
        else { s.hero.x = m.x - 13; s.hero.y = 234; assert.equal(move(s, s.hero, 'x', 8), true); s.hero.y = 242; s.hero.h = 14; assert.equal(move(s, s.hero, 'x', 8), false); }
    }
    {
        const e = new Engine(); e.loadLevel(15, 28); const s = e.state;
        const m = present(s.modules?.find(m => m.kind === 'spotlight' && !m.preview));
        const guard = present(s.enemies.find(e => e.x === m.x + 65));
        s.modules = [m]; s.enemies = [guard]; s.bonuses = []; guard.clock = 1190; s.ticks = 89;
        s.hero.x = m.x - 30; e.step(DT); assert.equal(guard.clock, 1190); assert.equal(s.shots.length, 0);
        s.hero.x = m.x + 4; e.step(DT); assert.equal(guard.clock, 0); assert.equal(s.shots.length, 1);
    }
    assert.equal(Object.keys(MODULES).length, 16);
}
/** The introduction contains the same playable objects, with a shallow bridge catch floor. */
export function introductions(E = Engine): void {
    for (const kind of Object.keys(MODULES) as ModuleKind[]) {
        const level = LEVELS.findIndex(l => l.star === kind), e = new E(); e.loadLevel(level, 28);
        const s = e.state, m = present(s.modules?.find(m => m.preview));
        assert.equal(m.kind, kind); assert.equal(m.x, 128);
        assert(!s.modules?.some(other => other !== m && other.x < 256));
        if (kind === 'lift' || kind === 'chain') {
            const p = present(s.platforms.find(p => p.originX === 96));
            s.hero.x = 108; s.hero.y = p.y - 22; e.step(DT);
            assert.equal(s.hero.y + s.hero.h, p.y);
            assert.equal(kind === 'lift' ? p.y : p.x, kind === 'lift' ? 212.39998639469664 : 96.33331790144891);
        }
        if (kind === 'hut') {
            const cage = present(s.cages.find(c => c.x === 160)); assert.equal(cage.hp, 3);
            s.hero.x = 128; e.input({ fire: true });
            for (let i = 0; i < 70; i++) e.step(DT);
            assert.equal(cage.rescued, true); assert.equal(s.rescued, 1);
        }
        if (kind === 'tunnel') {
            assert.equal(s.tiles[14 * s.columns + 8], true);
            s.hero.x = 115; assert.equal(move(s, s.hero, 'x', 8), true);
            s.hero.y = 242; s.hero.h = 14; assert.equal(move(s, s.hero, 'x', 8), false);
        }
        if (kind === 'tower' || kind === 'spotlight') assert(s.enemies.some(enemy => enemy.x === (kind === 'tower' ? 218 : 193)));
        // Stay in the introduction longer than every hazardous cycle.
        s.vehicle = false; s.hero.x = 168; s.hero.y = 234; s.hero.h = 22; s.hero.vx = s.hero.vy = 0;
        s.grounded = true; s.crouched = false; e.input({ x: 0, y: kind === 'tunnel' ? 1 : 0, fire: false, jump: false });
        for (let i = 0; i < 400; i++) e.step(DT);
        assert.equal(s.lives, 3, kind); assert.equal(e.status, 'playing', kind);
        assert(!s.shots.some(shot => !shot.friendly), kind);
        const traversal = new E(); traversal.loadLevel(level, 28);
        for (let i = 0; i < 1500 && traversal.state.hero.x < 256; i++) { pilot(traversal); traversal.step(DT); }
        assert(traversal.state.hero.x >= 256, kind); assert.equal(traversal.state.lives, 3, kind);
        if (kind === 'bridge') { assert.equal(m.value, 1); assert.equal(s.tiles[16 * s.columns + 10], false); assert.equal(s.tiles[17 * s.columns + 10], true); assert.equal(s.hero.y, 250); }
    }
}
const recordings = JSON.parse(readFileSync(new URL('./fixtures/ferraille-levels-103.json', import.meta.url), 'utf8')) as LevelRecording[];
export function encountered(s: State, star: string) { return { star, modules: [...(s.moduleTrace ?? [])], actions: [...(s.actionTrace ?? [])] }; }
let cachedExperiences: ReturnType<typeof encountered>[] | undefined;
export function experiences(E = Engine) {
    if (E === Engine && cachedExperiences) return structuredClone(cachedExperiences);
    const rows = LEVELS.map((l, i) => {
        const e = new E(); e.loadLevel(i, 28);
        const record = present(recordings.find(r => r.level === i && r.seed === 28 && !r.special));
        for (const [count, input, special] of record.commands) for (let tick = 0; tick < count; tick++) { e.input(input); if (special && tick === 0) e.special(); e.step(DT); if (e.state.moduleTrace?.length) assert.equal(e.state.moduleTrace[0], l.star, 'first physical encounter is the featured module'); }
        const row = encountered(e.state, l.star);
        // Generated but unreachable terrain must never enter the measurement.
        e.state.modules?.push(moduleAt('lava', e.state.door + 1000));
        assert.deepEqual(encountered(e.state, l.star), row);
        return row;
    });
    if (E === Engine) cachedExperiences = structuredClone(rows);
    return rows;
}
export function repetition(E = Engine, measure = measureRepetition): ReturnType<typeof measureRepetition> {
    const rows = experiences(E), result = measure(rows);
    assert(result.passed, result.errors.join('\n')); assert.equal(result.pairs.length, 435); assert.equal(result.consecutive.length, 29);
    assert.equal(sequenceSimilarity(['a', 'b'], ['a', 'b']), 1); assert.equal(sequenceSimilarity(['a', 'b'], ['b', 'a']), .5);
    const base = [
        { star: 'a', modules: ['a', 'b', 'c', 'd', 'e', 'f', 'g'], actions: ['jump', 'wait', 'fire', 'push'] },
        { star: 'h', modules: ['h', 'i', 'j', 'k', 'l', 'm', 'n'], actions: ['jump', 'crouch', 'fire', 'walk'] },
    ];
    const exact = measure(base); assert.deepEqual(exact.errors, []);
    assert.deepEqual(exact.pairs, [{ from: 1, to: 2, moduleDistance: 1, actionDistance: .5, distance: .75 }]);
    const overlap = measure([
        { ...present(base[0]), modules: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'] },
        { ...present(base[1]), star: 'k', modules: ['k', 'a', 'b', 'c', 'd', 'e', 'f', 'l', 'm', 'n'] },
    ]);
    assert.deepEqual(overlap.errors, ['levels 1/2: module overlap exceeds 50%']);
    assert.deepEqual(overlap.pairs, [{ from: 1, to: 2, moduleDistance: .4, actionDistance: .5, distance: .44999999999999996 }]);
    assert.deepEqual(measure([{ star: 'a', modules: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'], actions: [] }]).errors, ['fewer than 14 physical modules']);
    const absent = structuredClone(base); present(absent[1]).star = 'z';
    assert.deepEqual(measure(absent).errors, ['level 2: missing featured encounter']);
    const duplicate = structuredClone(rows); duplicate[1] = structuredClone(present(duplicate[0])); assert.equal(measure(duplicate).passed, false);
    const ignored = structuredClone(rows); present(ignored[1]).star = present(ignored[0]).star;
    assert(measure(ignored).errors.some(e => e.includes('repeated featured module')));
    return result;
}
export function legacyState(): void {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/ferraille-dab7aed.json', import.meta.url), 'utf8')) as { revision: string; level: number; seed: number; state: State };
    assert.equal(fixture.revision, 'dab7aed'); assert.equal(fixture.state.modules, undefined);
    const e = new Engine(); e.loadLevel(fixture.level, fixture.seed); e.loadState(fixture.state);
    const { modules, moduleTrace, actionTrace, ...old } = e.state;
    for (const key of Object.keys(fixture.state) as (keyof State)[]) assert.deepEqual(old[key as keyof typeof old], fixture.state[key]); assert.deepEqual(modules, []); assert.deepEqual(moduleTrace, []); assert.deepEqual(actionTrace, []);
    e.step(DT); assert.equal(e.state.score, fixture.state.score); assert.equal(e.state.lives, fixture.state.lives); assert.equal(e.state.checkpoint, fixture.state.checkpoint);
}
export interface LevelRecording { level: number; seed: number; special: boolean; commands: [number, State['input'], boolean][]; result: number; actions: string[]; modules: string[] }
export function replayLevel(record: LevelRecording, character: string, e = new Engine()): void {
    assert(['panda', 'pandaroux', 'dragon', 'singe', 'licorne'].includes(character));
    e.loadLevel(record.level, record.seed);
    for (const [count, input, special] of record.commands) for (let i = 0; i < count; i++) { e.input(input); if (special && i === 0) assert(e.special()); e.step(DT); }
    assert.equal(e.status, 'won', `${String(record.level + 1)}/${String(record.seed)}/${character}/${String(record.special)}`);
    assert.equal(witness(e), record.result); assert.deepEqual(e.state.actionTrace, record.actions); assert.deepEqual(e.state.moduleTrace, record.modules);
}
