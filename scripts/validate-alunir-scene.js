import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
registerHooks({ resolve(name, context, next) {
    if (name === 'phaser') return { shortCircuit: true, url: 'data:text/javascript,export default {Scene:class{}};' };
    if (/\/shell\/services(?:\.ts)?$/.test(name)) return { shortCircuit: true, url: 'data:text/javascript,export const sound={playEffect(){},stop(){}};' };
    return next(name, context);
} });
const { AlunirScene } = await import('../src/games/alunir/scene.ts');
const { Engine, LEVELS } = await import('../src/engines/alunir/engine.ts');
export function objectiveDrawingChecks(Scene = AlunirScene) {
    const previous = globalThis.document;
    globalThis.document = { querySelector: () => null };
    try {
        for (let level = 0; level < 30; level++) for (const progressed of [false, true]) {
            const scene = new Scene(), e = new Engine(); e.loadLevel(level);
            if (progressed) e.events = ['passage 0'];
            scene.engine = e; scene.hero = { draw() {} };
            const calls = [], g = new Proxy({}, { get: (_, method) => (...args) => { calls.push([method, ...args]); return g; } });
            scene.graphics = g; scene.draw();
            const plan = LEVELS[level];
            const circles = calls.filter(c => c[0] === 'strokeCircle' && c[3] !== 38);
            assert.deepEqual(circles, plan.route.map(([x, y]) => ['strokeCircle', x, y, 22]), 'visible ring radius/position');
            for (const [i, gate] of plan.route.entries()) {
                const index = calls.findIndex(c => c[0] === 'strokeCircle' && c[1] === gate[0] && c[2] === gate[1]);
                assert.deepEqual(calls[index - 1], ['lineStyle', 2, progressed && i === 0 ? 0x64e4cc : 0xffdd66], 'ring progress colour');
                const cross = [['lineBetween', gate[0] - 6, gate[1], gate[0] + 6, gate[1]], ['lineBetween', gate[0], gate[1] - 6, gate[0], gate[1] + 6]];
                for (const line of cross) assert.equal(calls.some(c => JSON.stringify(c) === JSON.stringify(line)), gate === e.nextGate(), 'cross only on current ring');
            }
            if (e.has('balise')) assert(calls.some(c => JSON.stringify(c) === JSON.stringify(['strokeCircle', ...plan.beacon, 38])), 'beacon at authored position');
            if (e.has('secours')) assert(calls.some(c => JSON.stringify(c) === JSON.stringify(['fillCircle', plan.rescue[0], plan.rescue[1] - 4, 5])), 'rescue head at authored position');
            // Decode the actual seven-segment strokes against an independent digit table.
            const digits = { 1:[[6,0,6,5],[6,5,6,10]], 2:[[0,0,6,0],[6,0,6,5],[0,5,6,5],[0,5,0,10],[0,10,6,10]], 3:[[0,0,6,0],[6,0,6,5],[6,5,6,10],[0,10,6,10],[0,5,6,5]] };
            for(const p of e.terrain.pads) {
                const x=p.x+p.width/2+1, y=p.y+7;
                const actual=calls.filter(c=>c[0]==='lineBetween'&&c[1]>=x&&c[1]<=x+6&&c[3]>=x&&c[3]<=x+6&&c[2]>=y&&c[2]<=y+10&&c[4]>=y&&c[4]<=y+10).map(c=>c.slice(1).map((v,i)=>v-(i%2?y:x)));
                const sorted=a=>a.map(v=>v.join(',')).sort();
                assert.deepEqual(sorted(actual),sorted(digits[p.multiplier]),'drawn pad multiplier');
            }
            if(e.has('geyser')) for(const ticks of [0,179,180,239,240]) {
                e.state.ticks=ticks;calls.length=0;scene.draw();
                const jets=calls.filter(c=>c[0]==='fillEllipse'&&c[3]>=5&&c[3]<=8&&c[4]===14);
                assert.equal(jets.length,18,'eighteen painted geyser jets');
                for(const [i,jet] of jets.entries()) {
                    assert.deepEqual(jet,['fillEllipse',145+i*31%76,475-i*(ticks%240<180?9:2),5+i%4,14],'geyser jet phase and position');
                    const at=calls.indexOf(jet);assert.equal(calls[at-1][2],ticks%240<180?.8:.3,'active jet opacity');
                }
            }

        }
    } finally { globalThis.document = previous; }
}
objectiveDrawingChecks();
const mutations = [
    ['multiplicateur_faux', 'scoreMark(g, p.x + p.width / 2 - 9, p.y + 7, p.multiplier);', 'scoreMark(g, p.x + p.width / 2 - 9, p.y + 7, 1);'],
    ['geyser_toujours_repos', 'const active = e.state.ticks % 240 < 180, x = 145', 'const active = e.state.ticks % 240 < 0, x = 145'],
    ['rayon_visible_incorrect', 'g.strokeCircle(gate[0], gate[1], 22);', 'g.strokeCircle(gate[0], gate[1], 12);'],
    ['croix_sur_les_mauvais_cercles', 'if (gate === e.nextGate()) {', 'if (gate !== e.nextGate()) {'],
    ['couleurs_de_progression_inversees', "e.events.includes('passage ' + String(i)) ? 0x64e4cc : 0xffdd66", "e.events.includes('passage ' + String(i)) ? 0xffdd66 : 0x64e4cc"],
    ['balise_dessinee_aux_anciennes_coordonnees', 'g.strokeCircle(plan.beacon[0], plan.beacon[1], 38);', 'g.strokeCircle(180, 350, 38);'],
    ['tete_du_secours_aux_anciennes_coordonnees', 'g.fillCircle(plan.rescue[0], plan.rescue[1] - 4, 5);', 'g.fillCircle(90, 366, 5);'],
];
const source = readFileSync('src/games/alunir/scene.ts', 'utf8');
for (const [name, before, after] of mutations) {
    assert.equal(source.split(before).length, 2, name);
    const { module } = await mutationModule('../src/games/alunir/scene.ts', before, after, { phaser: 'data:text/javascript,export default {Scene:class{}};' });
    assert.throws(() => objectiveDrawingChecks(module.AlunirScene), undefined, name);
}
