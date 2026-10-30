import assert from 'node:assert/strict';
import type Phaser from 'phaser';
import { ids, type Primitive } from '../src/characters/model';
import { actionArt, actionThemes, ballDrawing, craftViews, fighterViews } from '../src/characters/arcade-art';
import { ActionPaint } from '../src/characters/action-phaser';
import { selectCharacter } from '../src/characters/selection';

export function drawings(): void {
    const distinct = (lists: Primitive[][]): void => { assert.equal(new Set(lists.map(l => JSON.stringify(l))).size, lists.length); };
    const weapons = { panda: ['bambou', 'bao'], pandaroux: ['feuille', 'feu'], dragon: ['feu', 'feu'], singe: ['banane', 'etoile'], licorne: ['arc-en-ciel', 'arc-en-ciel'] };
    for (const id of ids) {
        const art = actionArt[id];
        distinct(fighterViews.map(v => art.fighters[v]));
        for (const kind of ['vehicles', 'paddles', 'ships'] as const) {
            distinct(craftViews.map(v => art[kind][v]));
            for (const view of craftViews) {
                const list = art[kind][view]; assert(list.length >= 10 && list.length < 300);
                for (const p of list) assert(p.width >= 0 && Number.isFinite(p.width));
            }
        }
        assert.deepEqual([actionThemes[id].primary, actionThemes[id].special], weapons[id]);
        for (const pose of ['saut', 'accroupi'] as const) {
            const right = art.fighters[pose], left = art.fighters[`${pose}-gauche`];
            assert.equal(left.length, right.length);
            right.forEach((p, i) => {
                const q = left[i]; assert(q);
                if ((p.kind === 'ellipse' || p.kind === 'circle') && (q.kind === 'ellipse' || q.kind === 'circle')) { assert.equal(q.x, 240 - p.x); assert.equal(q.y, p.y); }
                if (p.kind === 'path' && q.kind === 'path') {
                    assert.deepEqual(q.commands, p.commands.map(c => c.op === 'C'
                        ? { ...c, a: [240 - c.a[0], c.a[1]], b: [240 - c.b[0], c.b[1]], p: [240 - c.p[0], c.p[1]] }
                        : { ...c, p: [240 - c.p[0], c.p[1]] }));
                }
                if ((p.kind === 'polygon' || p.kind === 'line') && (q.kind === 'polygon' || q.kind === 'line')) assert.deepEqual(q.points, p.points.map(([x, y]) => [240 - x, y]));
            });
        }
    }
    for (const kind of ['vehicles', 'paddles', 'ships'] as const) distinct(ids.map(id => actionArt[id][kind].face));
    distinct(ids.map(id => ballDrawing(id)));
}

export function atlas(): void {
    const textures = new Set<string>(); let images = 0, destroyed = 0, generations = 0;
    const graphics = new Proxy({}, { get: (_, key) => (...args: unknown[]) => {
        if (key === 'generateTexture') { assert(!textures.has(String(args[0]))); textures.add(String(args[0])); generations++; }
        return graphics;
    } });
    const scene = {
        textures: { exists: (key: string) => textures.has(key) }, make: { graphics: () => graphics },
        add: { image: () => {
            images++;
            const image = { visible: true, texture: { key: '' },
                setVisible(v: boolean) { this.visible = v; return this; }, setTexture(key: string) { this.texture.key = key; return this; },
                setPosition() { return this; }, setDisplaySize() { return this; }, setRotation() { return this; }, setAlpha() { return this; }, setDepth() { return this; },
                destroy() { destroyed++; },
            }; return image;
        } },
    } as unknown as Phaser.Scene;
    for (const id of ids) {
        selectCharacter(id);
        const p = new ActionPaint(scene, 12), initial = generations;
        for (let frame = 0; frame < 200; frame++) {
            p.begin(); p.craft('ships', 'face', 180, 500, 58); p.fighter('saut', 70, 300, 57);
            for (let i = 0; i < 20; i++) p.projectile(100, i * 20, 0, -600, 18, i % 2 === 0);
            assert.equal(p.stats().used, 12); assert.equal(p.stats().capacity, 12); assert.equal(generations, initial);
        }
        p.begin(); assert.equal(p.stats().used, 0); p.destroy();
        const again = new ActionPaint(scene, 1); assert.equal(generations, initial, 'scene restart reuses every texture'); again.destroy();
    }
    assert.equal(images, destroyed); selectCharacter('panda');
}
