import assert from 'node:assert/strict';
import { ids, type Primitive } from '../src/characters/model';
import { arcadeArt, bonusEmblem, bubbleDrawing, bubbleOutline, bubbleStyles, launcherViews, liveries, vehicleDrawing, vehicleViews } from '../src/characters/arcade-art';
import { bubbleWorld } from '../src/games/bubble/backdrop';
import { ArcadePaint } from '../src/characters/arcade-phaser';
import type Phaser from 'phaser';
import { renderCharacter } from '../src/characters/phaser';
import { sceneryKinds, sceneryDrawing, roadside, sceneryTheme, scenerySprites } from '../src/games/derapage/scenery';
import { Engine } from '../src/engines/derapage/engine';
import { nearest } from '../src/engines/derapage/track';
import type { CharacterId } from '../src/characters/model';

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

/** Observe tessellated Graphics geometry, not metadata or vehicle names. */
function recordedVehicle(id: CharacterId, view: 'dessus' | 'arriere') {
    let color=0,stroke=0;
    const fills: {color:number; points:{x:number;y:number}[]}[]=[];
    const graphics={fillStyle(c:number){color=c;}, fillPoints(points:{x:number;y:number}[]){fills.push({color,points});},lineStyle(_w:number,c:number){stroke=c;},strokePoints(points:{x:number;y:number}[]){fills.push({color:stroke,points});}};
    renderCharacter(graphics as unknown as Phaser.GameObjects.Graphics,vehicleDrawing(id,view),0,0,240);
    return fills;
}
export function vehicleLengthAt(id: CharacterId, size: number): number {
    const ys=recordedVehicle(id,'dessus').flatMap(fill=>fill.points.map(p=>p.y));
    return (Math.max(...ys)-Math.min(...ys))*size/240;
}
export function vehicleSignature(id: CharacterId): void {
    for(const view of ['dessus','arriere'] as const) {
        const fills=recordedVehicle(id,view);
        const has=(color:string,vertices:number,minWidth:number)=>fills.some(f=>f.color===Number.parseInt(color.slice(1),16) && f.points.length===vertices && Math.max(...f.points.map(p=>p.x))-Math.min(...f.points.map(p=>p.x))>=minWidth);
        const ellipseVertices=60;
        if(id==='panda') {
            assert(has('#ffffff',ellipseVertices,63),'large white panda bonnet');
            assert(has('#342539',ellipseVertices,15),'dark panda eye patches');
            assert(has('#9bd34e',2,0),'green bamboo rails');
        }
        if(id==='pandaroux') assert(has('#ff7939',13,50),'orange maple lobes');
        if(id==='dragon') {
            assert(has('#b8222a',4,40),'folded red wing membrane');
            if(view==='dessus') assert(has('#d92d29',10,75),'dragon snout contour');
            else assert(has('#ff733b',8,45),'rear dragon tail contour');
            assert(has('#fff1b0',3,10),'paired ivory horns');
        }
        if(id==='singe') {
            assert(has('#ffb9e6',ellipseVertices,20),'tutu petals');
            if(view==='dessus') assert(fills.some(f=>f.color===Number.parseInt('ffb9e6',16) && f.points.some(p=>p.y<50)),'corolla also surrounds front of cockpit');
            assert(fills.some(f=>f.points.length===61 && f.color===Number.parseInt('ff69b8',16)),'curved heart');
        }
        if(id==='licorne') {
            assert(has('#ffffff',4,40),'white feather wings');
            assert(has('#4b90e5',ellipseVertices,70),'blue star medallion');
            assert(has('#ffcd45',10,25),'gold star');
        }
    }
}
export function vehicleSignaturesDistinct(): void {
    for(const view of ['dessus','arriere'] as const) distinct(ids.map(id=>recordedVehicle(id,view)),`Graphics signatures differ: ${view}`);
}
export function ordinaryScenery(): void {
    const themes=new Map<number,Set<string>>();
    let ordinary=0;
    for(let level=0;level<30;level++) {
        const a=new Engine(level,28).track,b=new Engine(level,29).track;
        const items=roadside(a);
        if(a.circuit.theme.kart) {assert.equal(items.length,0);continue;}
        ordinary++;
        const physical=a.circuit.theme.urban ? [] : a.trees;
        const trees=scenerySprites(a).filter(item=>item.kind==='tree');
        assert.deepEqual(trees.map(({x,y,radius})=>({x,y,radius})),physical,'existing physical trees remain visible at exact collider coordinates');

        assert(items.length>=12,'populated roadside for every ordinary circuit');
        assert.strictEqual(roadside(a),items,'one geometry generation per track');
        assert.deepEqual(items,roadside(b),'independent of race seed');
        for(const item of items) {
            const n=nearest(a,item);
            assert(n.distance>=(a.widths[n.index] ?? 28)/2+item.radius+4,'whole decoration outside road with clearance');
        }
        const kinds=new Set(items.map(item=>item.kind));assert.equal(kinds.size,3);
        themes.set(sceneryTheme(a),kinds);
    }
    assert.equal(ordinary,27);assert.equal(themes.size,8);
    distinct([...themes.values()].map(k=>[...k].sort()),'each theme has its own scenery');
    for(const kind of sceneryKinds) assert(sceneryDrawing(kind).length>0,'nonempty procedural scenery');
}
