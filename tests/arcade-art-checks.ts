import assert from 'node:assert/strict';
import { ids, type Primitive } from '../src/characters/model';
import { arcadeArt, bonusEmblem, bubbleDrawing, bubbleOutline, bubbleStyles, launcherViews, liveries, vehicleDrawing, vehicleViews } from '../src/characters/arcade-art';
import { bubbleWorld } from '../src/games/bubble/backdrop';
import { ArcadePaint } from '../src/characters/arcade-phaser';
import type Phaser from 'phaser';

function distinct(items: unknown[], label: string): void {
    assert.equal(new Set(items.map(item => JSON.stringify(item))).size, items.length, label);
}
function luminance(color: string): number {
    const parts = [1, 3, 5].map(offset => {
        const s = Number.parseInt(color.slice(offset, offset + 2), 16) / 255;
        return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
    });
    return (parts[0] ?? 0) * .2126 + (parts[1] ?? 0) * .7152 + (parts[2] ?? 0) * .0722;
}
function geometry(list: readonly Primitive[]): unknown[] {
    return list.map(p => Object.fromEntries(Object.entries(p).filter(([key]) => key !== 'fill' && key !== 'stroke')));
}
export function vehicles(): void {
    distinct(ids.map(id => liveries[id].name), 'Cinq véhicules nommés');
    distinct(ids.map(id => (['turbo', 'ressort', 'flaque', 'bulle'] as const).map(item => bonusEmblem(id, item))), 'Bonus habillés par personnage');
    for (const view of vehicleViews) distinct(ids.map(id => arcadeArt[id].vehicles[view]), `Cinq véhicules distincts : ${view}`);
    for (const id of ids) {
        assert.deepEqual(Object.keys(arcadeArt[id].vehicles).sort(), [...vehicleViews, 'action'].sort());
        distinct(vehicleViews.map(view => arcadeArt[id].vehicles[view]), `${id} : cinq vues différentes`);
        assert(arcadeArt[id].vehicles.dessus.length > 60, 'Pilote et véhicule présents');
        assert.notDeepEqual(vehicleDrawing(id, 'dessus', 'dodo'), vehicleDrawing(id, 'dessus', 'concentre'), 'Réaction visible sur le pilote');
        assert.notDeepEqual(arcadeArt[id].vehicles.action, arcadeArt[id].vehicles.droite, 'Action avec effet');
    }
}
export function launchersAndBubbles(): void {
    for (const view of launcherViews) distinct(ids.map(id => arcadeArt[id].launchers[view]), `Cinq lanceurs distincts : ${view}`);
    for (const id of ids) {
        distinct(launcherViews.map(view => arcadeArt[id].launchers[view]), `${id} : cinq vues du lanceur`);
        distinct(bubbleStyles.map((_, color) => geometry(bubbleDrawing(id, color))), `${id} : six motifs indépendants de la couleur`);
        assert.equal(arcadeArt[id].bubbles.length, 6);
    }
    for (let color = 0; color < bubbleStyles.length; color++) distinct(ids.map(id => arcadeArt[id].bubbles[color]), `Thème propre à chaque personnage, couleur ${String(color)}`);
    distinct(bubbleStyles.map(s => s.fill), 'Six couleurs');
    distinct(bubbleStyles.map(s => s.pattern), 'Six motifs stables');
    for (const [color, style] of bubbleStyles.entries()) {
        const contrast = (luminance(style.fill) + .05) / (luminance(bubbleOutline) + .05);
        assert(contrast >= 3, `Contours et motif contrastés : ${style.pattern}`);
        for (const id of ids) assert.equal(arcadeArt[id].bubbles[color]?.[0]?.fill, style.fill, 'Teinte conservée pour tous les personnages');
    }
    assert.deepEqual([0, 5, 6, 11, 12, 17, 18, 23, 24, 29].map(bubbleWorld), ['jungle', 'jungle', 'automne', 'automne', 'volcan', 'volcan', 'cirque', 'cirque', 'ciel', 'ciel']);
}

export function boundedTextures(): void {
    const textures = new Set<string>(), images: { visible: boolean; texture: { key: string }; destroyed: boolean }[] = [];
    let generations = 0;
    const graphics = new Proxy({}, { get: (_, key) => (...args: unknown[]) => {
        if (key === 'generateTexture') { textures.add(String(args[0])); generations++; }
        return graphics;
    } });
    const scene = {
        textures: { exists: (key: string) => textures.has(key) }, make: { graphics: () => graphics },
        add: { image: () => {
            const image = {
                visible: true, texture: { key: '' }, destroyed: false,
                setVisible(value: boolean) { this.visible = value; return this; },
                setTexture(key: string) { this.texture.key = key; return this; },
                setPosition() { return this; }, setDisplaySize() { return this; }, setRotation() { return this; }, setAlpha() { return this; }, setDepth() { return this; },
                destroy() { this.destroyed = true; },
            }; images.push(image); return image;
        } },
    } as unknown as Phaser.Scene;
    const pool = new ArcadePaint(scene, 4);
    const key = pool.texture('test', arcadeArt.panda.vehicles.dessus);
    assert.equal(pool.texture('test', arcadeArt.panda.vehicles.dessus), key);
    assert.equal(generations, 1, 'Une génération par texture');
    for (let frame = 0; frame < 30; frame++) {
        pool.begin(); for (let i = 0; i < 10; i++) pool.draw(key, i, frame, 40);
        assert.equal(pool.keys().length, 4); assert.equal(images.length, 4, 'Budget de sprites fixe');
    }
    pool.begin(); assert(images.every(image => !image.visible), 'Pas de sprites résiduels');
    pool.destroy(); assert(images.every(image => image.destroyed), 'Libération des objets de scène');
    const restarted = new ArcadePaint(scene, 1); restarted.texture('test', arcadeArt.panda.vehicles.dessus);
    assert.equal(generations, 1, 'Les redémarrages réutilisent le cache'); restarted.destroy();
}
