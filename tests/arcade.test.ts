import { test, expect, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scene: class { key = 'mock'; } } }));
import { readSave, writeSave, readValue, SOUND_KEY } from '../src/shell/storage';
import { Progression } from '../src/shell/progression';
import { Sound } from '../src/shell/sound';

test('A03 stockage générique isolé, migration et erreurs', () => {
    const values = new Map<string, string>([['bubble-lab:v1', '{"unlocked":3,"best":42}'], ['bubble-lab:sound:v1', 'off']]);
    const port = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
    expect(readSave(port)).toEqual({ unlocked: 3, best: 42 });
    expect(values.get('arcade-lab:bubble:v1')).toBe(values.get('bubble-lab:v1'));
    expect(readValue(port, SOUND_KEY, 'bubble-lab:sound:v1')).toBe('off');
    expect(values.get(SOUND_KEY)).toBe('off');
    writeSave(port, { unlocked: 2, best: 15 }, 'second');
    expect(readSave(port, 'second', 2)).toEqual({ unlocked: 2, best: 15 });
    expect(readSave(port)).toEqual({ unlocked: 3, best: 42 });
    const defaults = { unlocked: 1, best: 0 };
    expect(readSave()).toEqual(defaults);
    values.set('arcade-lab:second:v1', '{');
    expect(readSave(port, 'second')).toEqual(defaults);
    const broken = { getItem: () => { throw Error('blocked'); }, setItem: () => { throw Error('blocked'); } };
    expect(readSave(broken)).toEqual(defaults);
    expect(() => { writeSave(broken, defaults); }).not.toThrow();
});
test('A03 progression générique à trois niveaux', () => {
    const p = new Progression(undefined, 3);
    p.finish('won', 20); p.next(); p.finish('lost', 80);
    expect(p.total).toBe(20); expect(p.save.unlocked).toBe(2);
    p.retry(); p.finish('won', 30); p.next(); p.finish('won', 40);
    expect(p.total).toBe(90); expect(p.state).toBe('complete');
    expect(p.save).toEqual({ unlocked: 3, best: 90, cleared: 3 });
    expect(() => { p.start(3); }).toThrow();
});
test('A05 catalogue agrandi : le niveau suivant le dernier fini s’ouvre', () => {
    const port = (raw: string) => ({ getItem: () => raw, setItem: () => undefined });
    // Sauvegarde écrite avant la correction : 180 niveaux, le 180e gagné, plafond à 180.
    const legacy = readSave(port('{"unlocked":180,"best":5000}'), 'gourmandises', 240);
    const grown = new Progression(legacy, 240, 180);
    expect(grown.save.unlocked).toBe(181);
    expect(() => { grown.start(180); }).not.toThrow();
    // Après la migration, une sauvegarde arrêtée au 180 sans l’avoir fini ne gagne rien.
    const halfway = new Progression(readSave(port('{"unlocked":180,"best":5000,"cleared":0}'), 'gourmandises', 240), 240, 180);
    expect(halfway.save.unlocked).toBe(180);
    // Nouveau format : finir le dernier niveau le note, et un catalogue plus long l’ouvre.
    const done = new Progression(undefined, 180);
    done.start(179); done.finish('won', 10);
    expect(done.save).toEqual({ unlocked: 180, best: 10, cleared: 180 });
    const stored = new Map<string, string>();
    const storage = { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => { stored.set(key, value); } };
    writeSave(storage, done.save, 'grown');
    const later = new Progression(readSave(storage, 'grown', 240), 240);
    expect(later.save.unlocked).toBe(181);
    // Sans catalogue agrandi, rien ne bouge ; une valeur invalide est ignorée.
    expect(new Progression(readSave(storage, 'grown', 180), 180).save.unlocked).toBe(180);
    expect(readSave(port('{"unlocked":3,"best":1,"cleared":-2}'), 'x', 10)).toEqual({ unlocked: 3, best: 1 });
});
test('A04 effets nommés, déverrouillage et coupure', async () => {
    let contexts = 0, starts = 0;
    const parameter = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} };
    const sound = new Sound(() => {
        contexts++;
        return { resume: () => Promise.resolve(), currentTime: 0, destination: {},
            createOscillator: () => ({ frequency: parameter, connect: () => {}, start: () => { starts++; }, stop: () => {} }),
            createGain: () => ({ gain: parameter, connect: () => {} }),
        } as unknown as AudioContext;
    });
    sound.effects = { bell: () => ({ frequency: 240, duration: 0.1, type: 'sine' }) };
    sound.playEffect('bell'); expect(contexts).toBe(0);
    await sound.unlock(); sound.playEffect('bell'); expect(starts).toBe(1);
    sound.setEnabled(false); sound.playEffect('bell'); expect(starts).toBe(1);
});
test('A09 tous les moteurs restent purs', () => {
    const files = import.meta.glob<string>('../src/engines/**/*.ts', { query: '?raw', import: 'default', eager: true });
    expect(Object.keys(files).length).toBeGreaterThan(0);
    for (const [path, source] of Object.entries(files)) expect(source, path).not.toMatch(/\b(?:phaser|document|window)\b|Math\s*\.\s*random/);
});

test('A01 registre non vide et identifiants uniques', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);
    vi.stubGlobal('navigator', undefined);
    vi.stubGlobal('screen', undefined);
    try {
        const { games } = await import('../src/games/all');
        expect(games.length).toBeGreaterThan(0);
        expect(new Set(games.map(game => game.id)).size).toBe(games.length);
        for (const game of games) {
            expect(game.id).toMatch(/^[a-z][a-z0-9-]*$/);
            expect(game.levelCount).toBeGreaterThan(0);
            expect(game.createScene()).toBeDefined();
        }
    } finally { vi.unstubAllGlobals(); }
});
