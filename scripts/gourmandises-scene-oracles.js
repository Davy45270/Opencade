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
        scene.engine = fixture();
        scene.ready = false;
        const commands = [];
        const context = new Proxy({}, {
            get(target, key) {
                if (key === 'createLinearGradient') return () => ({ addColorStop() {} });
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
    } finally {
        sound.playEffect = playEffect;
        if (previous) Object.defineProperty(globalThis, 'document', previous);
        else Reflect.deleteProperty(globalThis, 'document');
    }
}
