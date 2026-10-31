import assert from 'node:assert/strict';
import { sound } from '../src/shell/services.ts';
import { fixture } from '../tests/gourmandises-oracles.ts';

/** Exercise the real scene methods, recording drawing commands instead of pixels. */
export function sceneFeedback(module) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
    const playEffect = sound.playEffect;
    const sounds = [];
    Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: { querySelector: () => null, createElement: () => ({ getContext: () => null }) },
    });
    sound.playEffect = name => { sounds.push(name); };
    try {
        const scene = new module.GourmandisesScene();
        // Board feedback is independent of the actor, measured by graphicsReplayChecks.
        scene.drawHero = () => {};
        scene.engine = fixture();
        scene.ready = false;
        const commands = [];
        const context = new Proxy({}, {
            get(target, key) {
                if (key === 'createLinearGradient') return () => ({ addColorStop: (...args) => commands.push({ op: 'colorStop', args }) });
                if (key in target) return target[key];
                return (...args) => { commands.push({ op: key, args, stroke: target.strokeStyle, fill: target.fillStyle, width: target.lineWidth }); };
            },
        });
        scene.texture = { context, refresh() {} };
        const key = code => scene.keydown({ code, repeat: false, preventDefault() {} });
        scene.cursor = 7;
        key('ArrowLeft');
        assert.equal(scene.cursor, 6, 'Flèche gauche');
        key('ArrowRight');
        assert.equal(scene.cursor, 7, 'Flèche droite');
        key('Space');
        assert.equal(scene.selected, 7);
        key('ArrowUp');
        assert.equal(scene.engine.state.moves, 1, 'Espace puis flèche permute');
        assert.equal(scene.cursor, 1);
        scene.animation = 0;
        for (const [code, tool] of [['Digit1', 'hammer'], ['Digit2', 'rocket'], ['Digit3', 'rainbow']]) {
            key(code);
            assert.equal(scene.tool, tool, code);
            key('Space');
            assert.equal(scene.engine.state.tools[tool], 0, 'Le raccourci applique son outil');
            scene.animation = 0;
        }
        assert.ok(sounds.includes('match'), 'Alignement sonore');

        scene.engine = fixture();
        scene.engine.state.mode = 'discovery';
        scene.selected = 7;
        commands.length = 0;
        scene.draw();
        const highlights = () => commands.filter(c => c.op === 'strokeRect' && c.stroke === '#fff8b2' && c.width === 3);
        const b = scene.board();
        assert.deepEqual(highlights().map(c => c.args), [[b.x + b.unit + 2, b.y + b.unit + 2, b.unit - 4, b.unit - 4]], 'Sélection visible');
        scene.selected = -1;
        for (const [idle, count] of [[4999, 0], [5400, 2], [5700, 0], [6000, 2]]) {
            scene.engine.state.idle = idle;
            commands.length = 0;
            scene.draw();
            assert.equal(highlights().length, count, `Clignotement à ${idle} ms`);
        }
        scene.engine.state.idle = 0;
        scene.falls = new Map([[7, 2]]);
        const yAt = animation => {
            scene.animation = animation;
            commands.length = 0;
            scene.draw();
            return commands.filter(c => c.op === 'translate' && c.args[0] > 0)[7].args[1];
        };
        const rest = yAt(0);
        assert.equal(yAt(280), rest - 2 * b.unit, 'Départ de chute');
        assert.equal(yAt(140), rest - .5 * b.unit, 'Milieu de chute');
        assert.equal(yAt(0), rest, 'Fin de chute');

        // The real G23 swap delivers gold at 6, then refills 6 with a sweet.
        scene.engine = fixture();
        scene.engine.state.cells[0].piece = { color: 2, drop: true };
        scene.engine.state.cells[6].exit = true;
        for (const i of [6, 8, 13]) scene.engine.state.cells[i].piece = { color: 4 };
        scene.engine.state.cells[7].piece = { color: 1 };
        scene.engine.swap(7, 13);
        assert.equal(scene.engine.state.dropped, 1);
        assert.equal(scene.engine.state.cells[6].piece.drop, undefined);
        scene.feedback();
        const goldPosition = animation => {
            scene.animation = animation;
            commands.length = 0;
            scene.draw();
            const gold = commands.findIndex(c => c.op === 'fill' && c.fill === '#eaa827');
            if (gold < 0) return null;
            return commands.slice(0, gold).findLast(c => c.op === 'translate').args;
        };
        const x = b.x + b.unit / 2;
        assert.deepEqual(goldPosition(280), [x, b.y + b.unit / 2], 'Objet au départ');
        assert.deepEqual(goldPosition(140), [x, b.y + b.unit * 1.25], 'Objet en descente');
        assert.deepEqual(goldPosition(1), [x, b.y + (1.5 - (1 / 280) ** 2) * b.unit], 'Objet à la sortie');
        assert.equal(goldPosition(0), null, 'Objet livré retiré après son trajet');
        scene.reducedMotion = true;
        assert.equal(goldPosition(280), null, 'Mouvement réduit');
        scene.reducedMotion = false;

        scene.engine = fixture();
        scene.engine.state.cells[7].piece = { color: 2, drop: true };
        scene.engine.state.cells[7].ice = 2;
        scene.engine.state.cells[8].ice = 1;
        scene.engine.state.cells[7].exit = true;
        scene.falls.clear();
        scene.deliveries = [];
        assert.ok(goldPosition(0), 'Objet doré dessiné sur le plateau');
        assert.ok(commands.some(c => c.op === 'strokeRect' && c.width === 3
            && c.args[0] === b.x + b.unit + 4 && c.args[1] === b.y + b.unit + 4), 'Glace double transmise au dessin');
        assert.ok(commands.some(c => c.op === 'strokeRect' && c.width === 1
            && c.args[0] === b.x + 2 * b.unit + 4), 'Glace simple transmise au dessin');
        assert.ok(commands.some(c => c.op === 'stroke' && c.stroke === '#fff0a0' && c.width === 4), 'Sortie visible');
        scene.engine = fixture();
        scene.engine.state.cells[18].chocolate = true;
        scene.engine.state.cells[18].piece = null;
        scene.engine.state.cells[19].hedge = true;
        scene.engine.state.cells[20].belt = { band: 0, direction: 'right' };
        commands.length = 0;
        scene.draw();
        assert.ok(commands.some(c => c.op === 'fill' && c.fill === '#653725'), 'Chocolat dessiné');
        assert.ok(commands.some(c => c.op === 'fill' && c.fill === '#388047'), 'Haie dessinée');
        assert.ok(commands.some(c => c.op === 'stroke' && c.stroke === '#ffe59b99'), 'Flèche dessinée');
        const arrows = reduced => {
            scene.reducedMotion = reduced;
            scene.beltClock = 600;
            commands.length = 0;
            scene.draw();
            return commands.filter(c => c.op === 'moveTo' && c.stroke === '#ffe59b99').map(c => c.args);
        };
        assert.notDeepEqual(arrows(false), arrows(true), 'Flèches fixes en mouvement réduit');
        scene.reducedMotion = false;
        scene.ready = false;
        scene.beltClock = 0;
        scene.update(0, 300);
        assert.equal(scene.beltClock, 300, 'update avance les flèches');
        scene.update(300, 1000);
        assert.equal(scene.beltClock, 100, 'Horloge cyclique');
        scene.reducedMotion = true;
        scene.update(1300, 200);
        assert.equal(scene.beltClock, 100, 'Horloge fixe en mouvement réduit');
        scene.reducedMotion = false;

        // Four literal bands cover both axes, both signs and the two wrap copies.
        for (const direction of ['right', 'left', 'down', 'up']) {
            scene.engine = fixture();
            const horizontal = direction === 'right' || direction === 'left';
            const indices = horizontal ? [12, 13, 14, 15, 16, 17] : [2, 8, 14, 20, 26, 32];
            const step = direction === 'left' || direction === 'up' ? -1 : 1;
            for (const i of indices) {
                scene.engine.state.cells[i].belt = { band: 0, direction };
                scene.engine.state.cells[i].piece = { color: 4, special: 'row' };
            }
            scene.motionOrigin = scene.engine.state.cells.map(cell => cell.piece);
            scene.engine.events = indices.map((from, offset) => ({ type: 'belt', cells: [], multiplier: 1,
                from, to: indices[(offset + step + indices.length) % indices.length], piece: { color: 4, special: 'row' } }));
            scene.feedback();
            for (const remaining of [1, .25, .0625]) {
                scene.animation = 280 * Math.sqrt(remaining);
                commands.length = 0;
                scene.draw();
                const clips = commands.flatMap((command, i) => command.op === 'clip' && commands[i - 1].args[0] >= 0 ? [i] : []).slice(1);
                assert.equal(clips.length, 6, 'Chaque transport est découpé sur sa bande');
                const rect = horizontal ? [b.x, b.y + 2 * b.unit, 6 * b.unit, b.unit]
                    : [b.x + 2 * b.unit, b.y, b.unit, 6 * b.unit];
                for (const [offset, clip] of clips.entries()) {
                    assert.deepEqual(commands[clip - 1].args, rect, 'Découpe limitée à la bande');
                    let depth = 1;
                    let end = clip + 1;
                    for (; end < commands.length; end++) {
                        if (commands[end].op === 'save') depth++;
                        if (commands[end].op === 'restore') depth--;
                        if (depth === 0) break;
                    }
                    const segment = commands.slice(clip + 1, end);
                    const from = indices[offset];
                    const to = indices[(offset + step + indices.length) % indices.length];
                    const wrap = Math.abs(to - from) > (horizontal ? 1 : 6);
                    const start = wrap ? from : to;
                    const displacement = wrap ? step * (1 - remaining) : -step * remaining;
                    const position = [b.x + (start % 6 + .5 + (horizontal ? displacement : 0)) * b.unit,
                        b.y + (Math.floor(start / 6) + .5 + (horizontal ? 0 : displacement)) * b.unit];
                    const positions = segment.filter(c => c.op === 'translate').map(c => c.args);
                    assert.deepEqual(positions[0], position, `${direction} : position interpolée`);
                    assert.equal(positions.length, wrap ? 2 : 1, 'Deux copies seulement au bouclage');
                    if (wrap) assert.deepEqual(positions[1], [
                        b.x + (to % 6 + .5 - (horizontal ? step * remaining : 0)) * b.unit,
                        b.y + (Math.floor(to / 6) + .5 - (horizontal ? 0 : step * remaining)) * b.unit]);
                    assert.equal(segment.filter(c => c.op === 'stroke' && c.stroke === '#ffffff' && c.width === 3).length,
                        wrap ? 2 : 1, 'Rayures conservées pendant le trajet');
                }
            }
            scene.animation = 0;
            commands.length = 0;
            scene.draw();
            assert.equal(commands.filter((c, i) => c.op === 'clip' && commands[i - 1].args[0] >= 0).length, 1, 'Transport terminé');
            scene.reducedMotion = true;
            scene.animation = 280;
            commands.length = 0;
            scene.draw();
            assert.equal(commands.filter((c, i) => c.op === 'clip' && commands[i - 1].args[0] >= 0).length, 1, 'Transport fixe en mouvement réduit');
            scene.reducedMotion = false;
        }

        // Adverse reproduction: the second ordinary move causes matches after the belt.
        scene.engine.loadLevel(160, 8, 'discovery');
        scene.animation = 0;
        scene.act(...scene.engine.validMoves()[0]);
        scene.animation = 0;
        scene.act(...scene.engine.validMoves()[0]);
        const frames = scene.transportFrames;
        assert.ok(frames.length >= 3, 'Transport puis deux cascades animées');
        assert.equal(frames[0].pieces[27].color, 4);
        assert.equal(frames[0].pieces[35].color, 4);
        assert.notEqual(scene.engine.state.cells[27].piece.color, 4);
        assert.deepEqual(frames.at(-1).pieces, scene.engine.state.cells.map(cell => cell.piece), 'Dernière chute fidèle au plateau final');
        for (let i = 1; i < frames.length; i++) {
            const frame = frames[i];
            assert.equal(frame.belts.length, 0, 'Anciennes pièces retirées après transport');
            const [to, distance] = [...frame.falls].find(([to, distance]) => distance > 0 && !frame.pieces[to]?.special);
            const unit = scene.board().unit;
            scene.animation = (frames.length - i - 1) * 280 + 140;
            commands.length = 0;
            scene.draw();
            const x = scene.board().x + (to % 8 + .5) * unit;
            const y = scene.board().y + (Math.floor(to / 8) + .5 - distance * .25) * unit;
            const at = commands.findIndex(c => c.op === 'translate' && c.args[0] === x && c.args[1] === y);
            assert.ok(at >= 0, 'Nouvelle pièce en chute après transport');
            assert.ok(commands.slice(at + 1, at + 8).some(c => c.op === 'colorStop'
                && c.args[0] === .25 && c.args[1] === ['#f85a79', '#ffd75e', '#64cde9', '#70ce8c', '#b58af2', '#f48bc4', '#ffac59'][frame.pieces[to].color]),
            'Couleur de la pièce de chute, sans substitution');
        }
        // A dead board can reshuffle before or after transport. Its inventory
        // must also be replayed, including cells outside the moving bands.
        scene.engine.loadLevel(162, 8, 'discovery');
        for (let step = 0; step < 5; step++) {
            scene.animation = 0;
            scene.act(...scene.engine.validMoves()[0]);
            assert.deepEqual(scene.transportFrames.at(-1).pieces, scene.engine.state.cells.map(cell => cell.piece),
                'Rebattage et transport conservent tout le plateau visuel');
        }
        assert.ok(scene.engine.events.some(event => event.type === 'shuffle'), 'Rebattage réellement exercé');
    } finally {
        sound.playEffect = playEffect;
        if (previous) Object.defineProperty(globalThis, 'document', previous);
        else Reflect.deleteProperty(globalThis, 'document');
    }
}
