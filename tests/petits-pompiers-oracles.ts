import { readFileSync, readdirSync } from 'node:fs';
import { Engine, FIXED, TILE, ABILITIES, RELAXED_MARGIN, FOLLOW_LIMIT, IDLE, LEVELS, tileCenter, distance, type Intent, type Victim } from '../src/engines/petits-pompiers/engine';
import { validateLevel, WIDTH, adjacent } from '../src/engines/petits-pompiers/levels';
import { ids, type CharacterId } from '../src/characters/model';
import { Pilot } from '../src/engines/petits-pompiers/pilot';
export function check(value: unknown, message = 'Assertion PP'): asserts value { if (!value) throw new Error(message); }
function required<T>(value: T | undefined): T { check(value !== undefined, 'État absent'); return value; }
function equal(a: unknown, b: unknown): void { check(JSON.stringify(a) === JSON.stringify(b), `${JSON.stringify(a)} != ${JSON.stringify(b)}`); }
export function createOracles(E: typeof Engine = Engine, V: typeof validateLevel = validateLevel, boards = LEVELS): [string, () => void][] {
    function room(character: CharacterId = 'panda', mode: 'detente' | 'defi' = 'detente', seed = 28): Engine {
        const e = new E(character); e.loadLevel(0, seed, mode);
        e.tiles = e.tiles.map((_, i) => i < WIDTH || i >= WIDTH * 8 || i % WIDTH === 0 || i % WIDTH === WIDTH - 1 ? 'W' : 'H');
        e.tiles[87] = 'S'; e.tiles[94] = 'E'; e.tiles[30] = 'R';
        e.fires = []; e.victims = []; e.pickups = []; e.level.smoke = false;
        Object.assign(e.player, tileCenter(60)); return e;
    }
    function victim(e: Engine, at: number, properties: Partial<Victim> = {}): Victim {
        const v: Victim = { id: e.victims.length, at, ...tileCenter(at), kind: 'person', species: 'person', injured: false, hidden: false, upper: false, following: false, saved: false, waypoint: null, ...properties }; e.victims.push(v); return v;
    }
    function press(e: Engine, intent: Partial<Intent> = {}, ms = FIXED): void {
        e.input({ ...IDLE }); e.step(FIXED); e.input({ ...IDLE, action: true, ...intent }); e.step(ms);
    }
    function fire(e: Engine, at = 62, intensity = 1): void { e.fires = [{ at, intensity, units: 0 }]; e.initialFires = 1; }
    return [
        ['PP-01 déterminisme partie complète et lecture pure du pilote', () => {
            const a = new E(), b = new E(), pilot = new Pilot(); a.loadLevel(0, 77); b.loadLevel(0, 77);
            while (a.status === 'playing' && a.time < 90000) {
                const before = a.snapshot(), input = pilot.readAction(a); equal(a.snapshot(), before);
                a.input(input); b.input(input); a.step(FIXED); b.step(FIXED);
            }
            equal(a.status, 'won'); equal(a.snapshot(), b.snapshot()); check(a.time < 90000);
        }],
        ['PP-02 aucune source du moteur ne tire un aléa global', () => {
            const directory = new URL('../src/engines/petits-pompiers/', import.meta.url);
            for (const file of readdirSync(directory)) if (file.endsWith('.ts')) check(!/Math\s*\.\s*random\b/.test(readFileSync(new URL(file, directory), 'utf8')), file);
        }],
        ['PP-03 collisions et déplacement continu normalisé', () => {
            for (const tile of ['W', '~']) { const e = room(); e.tiles[61] = tile; e.input({ ...IDLE, dx: 1 }); e.step(3000); check(e.player.x < tileCenter(61).x - TILE / 2); }
            const e = room(); const x = e.player.x; e.input({ ...IDLE, dx: 1 }); e.step(FIXED); check(e.player.x > x && e.player.x < x + TILE);
            const a = room(), b = room(); a.input({ ...IDLE, dx: 1 }); b.input({ ...IDLE, dx: 1, dy: 1 }); a.step(200); b.step(200);
            const p = tileCenter(60); check(Math.abs(Math.hypot(b.player.x - p.x, b.player.y - p.y) - (a.player.x - p.x)) < .001);
        }],
        ['PP-04 propagation intervalle, voisin inflammable et graines', () => {
            const run = (seed: number) => { const e = room('panda', 'detente', seed); fire(e, 60); e.level.spreadIntervalSeconds = 1; e.step(983); equal(e.fires.length, 1); e.step(34); check(e.fires.length > 1); check(e.fires.slice(1).every(f => adjacent(60).includes(f.at) && e.flammable(f.at))); return e.fires; };
            equal(run(28), run(28)); check(JSON.stringify(run(1)) !== JSON.stringify(run(100000))); const e = room(); fire(e, 60); e.level.spreadIntervalSeconds = 1;
            for (const p of adjacent(60)) e.tiles[p] = 'W'; e.step(4000); equal(e.fires.length, 1);
        }],
        ['PP-05 brûlé non inflammable et intensité bornée', () => {
            const e = room(); fire(e, 62, 3); press(e, { dx: 1 }, 1000); press(e, { dx: 1 }, 1000); check(e.burned.includes(62)); check(!e.flammable(62));
            fire(e, 61); e.level.spreadIntervalSeconds = .1; e.step(6000); check(e.fires.every(f => f.intensity <= 3 && f.at !== 62));
        }],
        ['PP-06 plafond détente et propagation complète défi', () => {
            const a = room(), b = room('panda', 'defi'); for (const e of [a, b]) { fire(e, 40); e.level.spreadIntervalSeconds = .25; e.step(10000); }
            check(a.fires.length <= 1 + RELAXED_MARGIN); check(b.fires.length > a.fires.length);
        }],
        ['PP-07 unités eau intensité et consommation', () => {
            const e = room(); fire(e, 62, 3); press(e, { dx: 1 }, 250); equal(e.fires[0]?.intensity, 3); check(Math.abs(e.player.water - 114) < .01);
            e.step(250); equal(e.fires[0]?.intensity, 2); check(required(e.fires[0]).units < .001);
        }],
        ['PP-08 réserve vide événement et aucun jet', () => {
            const e = room(); fire(e); e.player.water = 1; press(e, { dx: 1 }, 1000); equal(e.player.water, 0); check(required(e.fires[0]).intensity === 1);
            press(e); check(e.events.some(ev => ev.type === 'empty')); check(!e.job);
        }],
        ['PP-09 borne remplit sans dépasser capacité', () => {
            const e = room(); Object.assign(e.player, tileCenter(31)); e.player.water = 0; press(e, {}, 1600); equal(e.player.water, 120);
        }],
        ['PP-10 priorité dépôt secours soin borne obstacle et jet', () => {
            const e = room(); e.tiles[60] = 'S'; e.tiles[59] = 'R'; e.tiles[61] = 'X'; e.tools.push('axe', 'kit', 'foam'); e.selected = 3; e.charges = 6; e.player.water = 20;
            const a = victim(e, 60), b = victim(e, 60, { injured: true }); e.player.carried = a.id;
            press(e); equal(e.job?.kind, 'deposit'); e.step(700); check(a.saved);
            press(e); equal(e.job?.kind, 'heal'); e.step(900); check(!b.injured);
            press(e); equal(e.job?.kind, 'pickup'); e.step(700); equal(e.player.carried, b.id);
            e.tiles[60] = 'H'; press(e); equal(e.job?.kind, 'refill'); e.step(1600);
            press(e); equal(e.job?.kind, 'break'); e.step(1100); e.selected = 0; press(e); equal(e.job?.kind, 'spray');
        }],
        ['PP-11 fronts montants action et outil', () => {
            const e = room(); e.tools.push('axe', 'kit'); e.input({ ...IDLE, tool: true }); e.step(1000); equal(e.selected, 1);
            e.input({ ...IDLE }); e.step(FIXED); e.input({ ...IDLE, tool: true }); e.step(FIXED); equal(e.selected, 2);
            e.input({ ...IDLE, action: true }); e.step(2200); equal(e.job?.kind, 'spray'); check(e.player.water < 68); e.input({ ...IDLE }); e.step(1100); check(!e.job);
        }],
        ['PP-12 un seul porté et dépôt compté une fois', () => {
            const e = room(); const a = victim(e, 60), b = victim(e, 60); press(e, {}, 700); equal(e.player.carried, a.id);
            press(e, {}, 1100); equal(e.player.carried, a.id); check(!b.saved);
            e.tiles[60] = 'S'; press(e, {}, 700); equal(e.player.carried, -1); equal(e.progress.rescue_person, 1);
            e.victims = [a]; press(e, {}, 700); equal(e.progress.rescue_person, 1);
        }],
        ['PP-13 blessure exige un soin avant évacuation', () => {
            const e = room(); const v = victim(e, 60, { injured: true }); press(e); check(e.job?.kind !== 'pickup'); e.step(1100); equal(e.player.carried, -1); check(v.injured);
            e.tools.push('kit'); press(e); equal(e.job?.kind, 'heal'); e.step(900); equal(e.progress.heal, 1); press(e, {}, 700); equal(e.player.carried, v.id);
        }],
        ['PP-14 ouvrages cassables et jamais mur', () => {
            for (const tile of ['X', 'b', 'B', '#', 'W']) { const e = room(); e.tools.push('axe'); e.tiles[61] = tile; press(e, {}, 2200); equal(e.tiles[61], tile === 'W' ? 'W' : 'H'); }
            const e = room(); e.tiles[61] = 'X'; press(e, {}, 1100); equal(e.tiles[61], 'X');
        }],
        ['PP-15 fenêtre exige échelle au pied et montée', () => {
            const e = room(); const v = victim(e, 46, { upper: true }); e.tiles[46] = 'U'; press(e, {}, 2100); equal(e.player.carried, -1); check(v.upper);
            e.tools.push('ladder'); press(e); equal(e.job?.kind, 'climb'); check(e.ladders.includes(46)); e.step(1000); equal(e.player.carried, -1); e.step(1100); equal(e.player.carried, v.id);
        }],
        ['PP-16 mégaphone révèle, rassure et respecte chemin et limite', () => {
            const e = room(); e.tools.push('megaphone'); const v = victim(e, 63, { hidden: true }); press(e, {}, 500); check(!v.hidden && v.following);
            for (let i = 0; i < 6; i++) victim(e, 62, { hidden: true }); press(e, {}, 500); equal(e.victims.filter(v => v.following).length, FOLLOW_LIMIT);
            const b = room(); b.tools.push('megaphone'); const trapped = victim(b, 62, { hidden: true }); for (const at of adjacent(62)) b.tiles[at] = 'W'; press(b, {}, 500); check(!trapped.hidden && !trapped.following);
        }],
        ['PP-17 victoire objectifs ET sortie, étoiles positives', () => {
            const e = room(); Object.assign(e.player, tileCenter(94)); e.step(FIXED); equal(e.status, 'playing');
            e.progress = { extinguish: 1, rescue_person: 1, rescue_animal: 1, heal: 0 }; Object.assign(e.player, tileCenter(60)); e.step(FIXED); equal(e.status, 'playing');
            Object.assign(e.player, tileCenter(94)); e.step(FIXED); equal(e.status, 'won'); equal(e.stars, 3);
        }],
        ['PP-18 temps défi seulement et détente dix minutes', () => {
            const a = room(), b = room('panda', 'defi'); a.level.seconds = b.level.seconds = 1; a.step(601000); b.step(1500); equal(a.status, 'playing'); equal(b.status, 'lost');
        }],
        ['PP-19 fumée ralentit, dégâts défi et invulnérabilité', () => {
            const a = room(), b = room('panda', 'defi'); for (const e of [a, b]) { e.level.smoke = true; fire(e, 61); e.step(FIXED); }
            equal(a.player.hearts, 3); equal(b.player.hearts, 2); b.step(1000); equal(b.player.hearts, 2); b.step(4000); equal(b.status, 'lost');
            a.step(601000); equal(a.status, 'playing'); equal(a.player.hearts, 3);
            const c = room(), d = room(); c.level.smoke = true; fire(c, 61); for (const e of [c, d]) { e.input({ ...IDLE, dy: -1 }); e.step(200); } check(c.player.y > d.player.y);
        }],
        ['PP-20 Boubou réserve portée et précision distinctives', () => {
            for (const id of ids) { const e = room(id); fire(e, 64); press(e, { dx: 1 }, 600); equal(e.fires.length === 0, id === 'panda'); equal(ABILITIES[id].water === 120, id === 'panda'); }
            const amounts = ids.map(id => { const e = room(id); fire(e, 62, 3); press(e, { dx: 1 }, 500); return e.fires[0]?.intensity; }); equal(amounts, [2, 3, 3, 3, 3]);
        }],
        ['PP-21 CaliRoux vitesse et montée double distinctives', () => {
            const moved = ids.map(id => { const e = room(id); e.input({ ...IDLE, dx: 1 }); e.step(500); return e.player.x; }); check(required(moved[1]) > Math.max(...moved.filter((_, i) => i !== 1)));
            const durations = ids.map(id => { const e = room(id); if (!e.has('ladder')) e.tools.push('ladder'); victim(e, 46, { upper: true }); press(e); let ticks = 1; while (e.player.carried < 0 && ticks < 200) { e.step(FIXED); ticks++; } return ticks; });
            equal(durations, [120, 60, 120, 120, 120]);
        }],
        ['PP-22 Pestouille déblaiement sans hache et plus rapide', () => {
            for (const tile of ['X', '#']) for (const id of ids) { const e = room(id); e.tools = ['hose']; e.tiles[61] = tile; press(e, {}, 400); equal(e.tiles[61] === 'H', id === 'dragon'); }
            for (const id of ids) { const e = room(id); if (!e.has('axe')) e.tools.push('axe'); e.tiles[61] = '#'; press(e, {}, 400); equal(e.tiles[61] === 'H', id === 'dragon'); }
        }],
        ['PP-23 Tutu gestes rapides et port sans ralentissement', () => {
            for (const id of ids) { const e = room(id); victim(e, 60); press(e, {}, 250); equal(e.player.carried >= 0, id === 'singe');
                e.step(700); e.tiles[60] = 'S'; press(e, {}, 250); equal(e.progress.rescue_person > 0, id === 'singe');
                const a = room(id), b = room(id); victim(a, 60); a.player.carried = 0; for (const r of [a, b]) { r.input({ ...IDLE, dx: 1 }); r.step(500); }
                equal(Math.abs(a.player.x - b.player.x) < .001, id === 'singe'); }
        }],
        ['PP-24 Lumi halo révèle et rassure sans outil', () => {
            for (const id of ids) { const e = room(id); e.tools = ['hose']; const v = victim(e, 63, { hidden: true }); e.step(FIXED); equal(!v.hidden && v.following, id === 'licorne'); }
        }],
        ['PP-25 validation des quinze cartes et erreurs réelles', () => {
            equal(LEVELS.length, 15); for (const level of LEVELS) equal(V(level), []);
            const bad = structuredClone(required(LEVELS[0])); bad.map = ['?']; check(V(bad).includes('dimensions'));
            const blocked = structuredClone(required(LEVELS[0])); blocked.map = blocked.map.map(row => row.replace('P', 'W')); check(V(blocked).length > 0);
            const unknown = structuredClone(required(LEVELS[0])); unknown.map = unknown.map.map(row => row.replace('C', '!')); check(V(unknown).includes('legend'));
            const sealed = structuredClone(required(LEVELS[3])); sealed.map = sealed.map.map(row => row.replace('X', 'W')); check(V(sealed).some(error => error.startsWith('unreachable V')));
            const missingTool = structuredClone(required(LEVELS[4])); missingTool.map = missingTool.map.map(row => row.replace('l', '.')); check(V(missingTool).some(error => error.startsWith('facade')));
        }],
        ['PP-26 flèche définie et prérequis outils sur toute la campagne', () => {
            for (let i = 0; i < LEVELS.length; i++) { const e = new E(); e.loadLevel(i); check(e.nextObjective().at >= 0); e.fires = []; e.progress.extinguish = 100; const g = e.nextObjective(); check(g.at >= 0 && g.type !== 'exit'); }
            const e = new E(); e.loadLevel(4); e.fires = []; equal(e.nextObjective().tool, 'ladder');
        }],
        ['PP-27 extincteur six charges puissance portée et recharge', () => {
            const e = room(); e.pickups.push({ at: 60, tool: 'foam' }); e.step(FIXED); equal(e.charges, 6); check(e.has('foam')); e.selected = e.tools.indexOf('foam'); fire(e, 61, 3);
            press(e, { dx: 1 }, 300); equal(e.charges, 5); equal(e.fires[0]?.intensity, 2); press(e); check(!e.job); equal(e.charges, 5);
            e.step(700); press(e, { dx: 1 }, 300); check(!e.fires.length || required(e.fires[0]).intensity <= 1); e.charges = 0; e.step(1000); press(e); check(e.events.some(ev => ev.type === 'foam-empty'));
            const b = room(); b.tools.push('foam'); b.selected = 1; b.charges = 6; fire(b, 62); press(b, { dx: 1 }, 400); equal(b.fires[0]?.intensity, 1);
        }],
        ['PP-28 suiveurs contournent obstacles et dépôt commun', () => {
            const e = room('licorne'); const v = victim(e, 63, { hidden: true }); e.tiles[62] = 'W'; for (let tick = 0; tick < 120; tick++) { e.step(FIXED); check(!e.solid(v.at)); } check(v.following);
            e.tiles[60] = 'S'; e.step(3000); press(e, {}, 700); check(v.saved); equal(e.progress.rescue_person, 1);
        }],
        ['PP-29 neige ralentit et outils initiaux exacts', () => {
            const a = room(), b = room(); a.tiles[60] = 's'; for (const e of [a, b]) { e.input({ ...IDLE, dx: 1 }); e.step(200); } check(a.player.x < b.player.x);
            for (const id of ids) { const e = new E(id), extra = ABILITIES[id].extra; equal(e.tools, extra ? ['hose', extra] : ['hose']); }
        }],
        ['PP-30 états finis stables et instantané détaché', () => {
            const e = room(); const s = e.snapshot(); s.player.water = -5; check(e.player.water > 0); e.status = 'won'; const before = e.snapshot(); e.step(1000); equal(e.snapshot(), before);
            check(distance(60, 62) === 2); check(e.nextObjective().at >= 0);
        }],
        ['PP-31 accès cardinal réel y compris angle fermé', () => {
            for (const kind of ['pickup', 'heal', 'break', 'refill', 'deposit', 'climb'] as const) {
                const e = room(); Object.assign(e.player, tileCenter(59)); e.player.x += TILE * .27; e.player.y -= TILE * .27;
                e.tiles[32] = e.tiles[45] = e.tiles[47] = 'W'; e.tiles[60] = 'X'; e.tools.push('axe', 'kit', 'ladder');
                const v = victim(e, kind === 'climb' ? 32 : 46, { injured: kind === 'heal', upper: kind === 'climb' });
                if (kind === 'break') { e.tiles[46] = 'X'; e.tiles[60] = 'W'; }
                if (kind === 'refill') { e.tiles[46] = 'R'; e.player.water = 0; }
                if (kind === 'deposit') { e.tiles[46] = 'S'; e.player.carried = v.id; }
                press(e); check(e.job?.kind !== kind, kind);
            }
            const e = room(); Object.assign(e.player, tileCenter(59)); victim(e, 46); e.tiles[32] = e.tiles[45] = e.tiles[47] = 'W'; e.tiles[60] = 'X';
            press(e, {}, 700); equal(e.player.carried, -1);
            e.tiles[60] = 'H'; e.job = null; Object.assign(e.player, tileCenter(60)); press(e, {}, 700); equal(e.player.carried, 0);
        }],
        ['PP-32 paramètres finis et domaines stricts', () => {
            for (const [key, value] of [['intensity', 0], ['intensity', -1], ['intensity', 1.5], ['intensity', NaN], ['maxIntensity', 0], ['maxIntensity', 4], ['maxIntensity', 2.5], ['seconds', NaN], ['seconds', 0], ['seconds', -1], ['seconds', Infinity], ['baseExtinguishUnits', NaN], ['baseExtinguishUnits', 0], ['baseExtinguishUnits', -1], ['spreadIntervalSeconds', -1], ['spreadIntervalSeconds', NaN], ['spreadIntervalSeconds', Infinity]] as const) {
                const level = { ...structuredClone(required(LEVELS[0])), [key]: value }; check(V(level).includes('parameters'), `${key}/${String(value)}`);
            }
        }],
        ['PP-33 objectifs réalisables et services uniques', () => {
            const impossible = structuredClone(required(LEVELS[0])); impossible.objectives.rescue_person = 99; check(V(impossible).includes('objective rescue_person'));
            for (const c of 'SRE') for (const duplicate of [false, true]) {
                const level = structuredClone(required(LEVELS[0])); const cells = Array.from(level.map.join(''));
                if (duplicate) cells[cells.indexOf('g')] = c; else cells[cells.indexOf(c)] = 'g';
                level.map = Array.from({ length: 9 }, (_, y) => cells.slice(y * WIDTH, (y + 1) * WIDTH).join(''));
                check(V(level).includes(`unique ${c}`));
            }
        }],
        ['PP-34 trousse mégaphone et pied extérieur accessibles', () => {
            for (const [index, symbol, prefix] of [[5, 'k', 'kit'], [7, 'm', 'megaphone'], [4, 'l', 'facade']] as const) {
                const level = structuredClone(required(LEVELS[index])); level.map = level.map.map(row => row.replace(symbol, '.'));
                check(V(level).some(error => error.startsWith(prefix)), prefix);
            }
            for (const tile of ['W', 'H', '~']) {
                const level = structuredClone(required(LEVELS[4])); const cells = Array.from(level.map.join('')), foot = cells.indexOf('U') + WIDTH; cells[foot] = tile;
                level.map = Array.from({ length: 9 }, (_, y) => cells.slice(y * WIDTH, (y + 1) * WIDTH).join(''));
                check(V(level).some(error => error.startsWith('facade')), tile);
            }
            const floating = structuredClone(required(LEVELS[4])); const cells = Array.from(floating.map.join('')); cells[cells.indexOf('U') - WIDTH] = 'g';
            floating.map = Array.from({ length: 9 }, (_, y) => cells.slice(y * WIDTH, (y + 1) * WIDTH).join(''));
            check(V(floating).some(error => error.startsWith('facade')), 'façade sans intérieur');
        }],
        ['PP-35 jet bloqué et bois inflammable', () => {
            const e = room(); fire(e, 63, 3); e.tiles[62] = 'W'; press(e, { dx: 1 }, 2200); equal(e.fires[0]?.intensity, 3); equal(e.fires[0]?.units, 0);
            for (const tile of ['b', 'B', 'W']) {
                const b = room(); b.tiles[61] = tile; equal(b.flammable(61), tile !== 'W');
                fire(b, 60); for (const at of adjacent(60)) if (at !== 61) b.tiles[at] = 'W'; b.level.spreadIntervalSeconds = .1; b.step(200);
                equal(b.fires.some(f => f.at === 61), tile !== 'W');
            }
        }],
        ['PP-36 diversité Hamming et positions des services', () => {
            for (let i = 0; i < boards.length; i++) for (let j = 0; j < i; j++) {
                const a = required(boards[i]).map.join(''), b = required(boards[j]).map.join('');
                check(Array.from(a).filter((c, at) => c !== b[at]).length / a.length >= .35, `cartes ${String(i + 1)}/${String(j + 1)}`);
                check(Array.from('PSRE').every(c => a.indexOf(c) !== b.indexOf(c)), 'position de service répétée');
            }
            const first = required(boards[0]).map.join(''); check(first.includes('D') && first.includes('H')); check(distance(first.indexOf('P'), first.indexOf('R')) <= 1);
        }],
        ['PP-37 chaque carte propage réellement et détente plafonnée', () => {
            for (let i = 1; i < boards.length; i++) for (const mode of ['detente', 'defi'] as const) {
                const e = new E(); e.loadLevel(required(boards[i]), 28, mode); let spread = 0;
                for (let tick = 0; tick < 3600; tick++) { e.step(FIXED); spread += e.events.filter(ev => ev.type === 'spread').length; }
                check(spread > 0, `${String(i + 1)}/${mode}`); if (mode === 'detente') check(e.fires.length <= e.initialFires + RELAXED_MARGIN);
            }
        }],
        ['PP-38 défi deux fois plus fréquent et croissance seule en défi', () => {
            const a = room(), b = room('panda', 'defi');
            for (const e of [a, b]) { fire(e, 40); e.level.spreadIntervalSeconds = 10; e.step(3000); }
            equal(a.fires[0]?.intensity, 1); equal(b.fires[0]?.intensity, 2);
            a.step(2000); b.step(2000); equal(a.fires.length, 1); check(b.fires.length > 1);
            b.step(7000); check(b.fires.every(f => f.intensity <= b.level.maxIntensity));
            const treated = room('panda', 'defi'); fire(treated, 62); treated.level.baseExtinguishUnits = 100; press(treated, { dx: 1 }, 3000); equal(treated.fires[0]?.intensity, 1);
            treated.input({ ...IDLE }); treated.step(3100); equal(treated.fires[0]?.intensity, 2);
        }],
        ['PP-39 maintenir jet et mousse sans répéter les secours', () => {
            const e = room(); e.input({ ...IDLE, action: true }); e.step(2500); check(e.player.water < 61); equal(e.job?.kind, 'spray');
            const f = room(); f.tools.push('foam'); f.selected = 1; f.charges = 6; f.input({ ...IDLE, action: true }); f.step(2000); equal(f.charges, 3); victim(f, 60); f.step(1000); equal(f.player.carried, -1); check(f.job?.kind !== 'pickup');
            const p = room(); victim(p, 60); victim(p, 60); p.tiles[60] = 'S'; p.input({ ...IDLE, action: true }); p.step(2500); equal(p.player.carried, 0); equal(p.progress.rescue_person, 0);
            const guide = room(); guide.level.id = 'arbitrary'; guide.pickups.push({ at: 70, tool: 'foam' }); equal(guide.nextObjective(), { type: 'tool', at: 70, tool: 'foam' });
        }],
        ['PP-40 étoiles exactes sur parties construites', () => {
            for (const [mode, hurt, remaining, fast, stars] of [['detente', 0, false, true, 3], ['detente', 1, false, true, 2], ['detente', 0, true, true, 2], ['detente', 1, true, true, 1], ['defi', 1, true, true, 2], ['defi', 1, true, false, 1]] as const) {
                const e = room('panda', mode); e.progress = { extinguish: 99, rescue_person: 99, rescue_animal: 99, heal: 99 }; e.heartsLost = hurt;
                if (remaining) fire(e, 40); e.time = e.level.seconds * (fast ? 100 : 800); Object.assign(e.player, tileCenter(94)); e.step(FIXED);
                equal(e.status, 'won'); equal(e.stars, stars);
            }
        }],
    ];
}
export const oracles = createOracles();
