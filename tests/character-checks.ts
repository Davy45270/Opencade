import { renderCharacter as render2D } from '../src/characters/canvas';
import { renderCharacter as renderGraphics } from '../src/characters/phaser';
import { ids, poses, expressions, animations, characters, drawList, others, type CharacterId } from '../src/characters/model';
import { selectedCharacter, selectCharacter } from '../src/characters/selection';
function check(value: boolean, message: string): void { if (!value) throw new Error(message); }
const json = (value: unknown): string => JSON.stringify(value);
export function deterministic(id: CharacterId, draw = drawList): void {
    for (const pose of poses) for (const expression of expressions) for (const anim of animations) {
        const a = draw(id, pose, expression, anim, 173);
        check(a.length >= 8, `C01 ${id}/${pose}/${expression}/${anim}: substantial drawing`);
        check(json(a) === json(draw(id, pose, expression, anim, 173)), 'C01 deterministic');
        check(!/null|undefined/.test(json(a)), 'C01 finite geometry');
    }
}
export function distinct(palette = characters, draw = drawList): void {
    const counts = ids.map(id => draw(id).length);
    check(new Set(counts).size === 5, 'C02 five different primitive counts');
    const rgb = (value: string): number[] => [1, 3, 5].map(i => Number.parseInt(value.slice(i, i + 2), 16));
    for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) {
        const a = rgb(palette[ids[i] ?? 'panda'].accent), b = rgb(palette[ids[j] ?? 'panda'].accent);
        check(Math.hypot(...a.map((v, k) => v - (b[k] ?? 0))) > 75, 'C02 RGB distance above 75');
    }
    check(json(others('dragon')) === json(['panda', 'pandaroux', 'singe', 'licorne']), 'C02 stable others');
    for (const id of ids) {
        check(others(id).length === 4 && !others(id).includes(id), 'C02 four others');
        check(json(draw(id, 'face')) !== json(draw(id, 'profil')) && json(draw(id, 'profil')) !== json(draw(id, 'dos')), 'C02 three orientations');
        check(new Set(expressions.map(e => json(draw(id, 'face', e)))).size === 5, 'C02 five expressions');
    }
}
export function moving(id: CharacterId, draw = drawList): void {
    for (const anim of ['repos', 'marche', 'saut', 'celebration', 'special'] as const) {
        check(json(draw(id, 'face', 'joie', anim, 0)) !== json(draw(id, 'face', 'joie', anim, 300)), `C03 ${id}/${anim} moves`);
        for (const pose of poses) for (const expression of expressions) check(json(draw(id, pose, expression, anim, 0, 'reduce')) === json(draw(id, pose, expression, anim, 300, 'reduce')), 'C03 reduce is fixed');
        check(json(draw(id, 'face', 'joie', anim, 300, 'reduce')) === json(draw(id, 'face', 'joie', 'repos', 0, 'reduce')), 'C03 reduce has no special particles');
    }
}
export function persistence(read = selectedCharacter, write = selectCharacter): void {
    const data = new Map([['arcade-lab:bubble:v1', '{"best":123,"unlocked":3}'], ['arcade-lab:sound:v1', 'off'], ['bubble-lab:v1', 'legacy']]);
    const untouched = [...data];
    const calls: string[] = [];
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { calls.push(key); data.set(key, value); } };
    check(read(storage) === 'panda', 'C04 default panda');
    for (const id of ids) {
        write(id, storage);
        check(data.get('arcade-lab:character:v1') === id, 'C04 exact public key');
        check(read(storage) === id, 'C04 persisted selection');
    }
    data.set('arcade-lab:character:v1', 'unknown'); check(read(storage) === 'panda', 'C04 invalid selection');
    data.set('arcade-lab:character:v1', ''); check(read(storage) === 'panda', 'C04 empty selection');
    for (const [key, value] of untouched) check(data.get(key) === value, 'C04 other saves intact');
    check(data.size === 4 && calls.length === 5 && calls.every(key => key === 'arcade-lab:character:v1'), 'C04 only own key written');
    const broken = { getItem(): never { throw new Error('unavailable'); }, setItem(): never { throw new Error('unavailable'); } };
    write('panda', broken); check(read(broken) === 'panda', 'C04 unavailable storage');
}

export function renderers(): void {
    for (const id of ids) {
        const list = drawList(id, 'face', 'joie', 'special', 300), before = json(list);
        for (const size of [32, 160, 480]) {
            const calls: { name: string; args: unknown[] }[] = [];
            const port = new Proxy({}, {
                get: (_target, name) => (...args: unknown[]) => { calls.push({ name: String(name), args }); },
                set: () => true,
            });
            render2D(port as CanvasRenderingContext2D, list, 3, 5, size);
            check(calls[0]?.name === 'save' && calls.at(-1)?.name === 'restore', 'C06 balanced state');
            check(calls.filter(c => c.name === 'beginPath').length === list.length, 'C06 every primitive rendered');
            check(json(calls.find(c => c.name === 'scale')?.args) === json([size / 240, size / 240]), 'C06 destination resolution');
            let vertices = 0, fills = 0, strokes = 0;
            const graphics = {
                fillStyle() {}, lineStyle() {},
                fillPoints(points: { x: number; y: number }[]) { fills++; vertices += points.length; check(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y)), 'C06 finite graphics'); },
                strokePoints() { strokes++; },
            } as unknown as Parameters<typeof renderGraphics>[0];
            renderGraphics(graphics, list, 3, 5, size);
            check(fills === list.filter(p => p.fill).length && strokes === list.filter(p => p.width > 0).length, 'C06 matching paint count');
            check(vertices > 100, 'C06 vector geometry');
            check(json(list) === before, 'C06 renderers leave list intact');
        }
    }
}
