import { describe, expect, it } from 'vitest';
import { Sound, browserAudioFactory, SOUND_KEY } from '../src/games/bubble/sound';
import type { Cell } from '../src/engines/bubble/engine';

const cells = (count: number): Cell[] => Array.from({ length: count }, (_, col) => ({ row: 0, col, color: 0 }));
function fake(failure = '') {
    const frequencies: number[] = [];
    let created = 0, started = 0, contexts = 0;
    const parameter = { setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, cancelScheduledValues: () => {} };
    const factory = (): AudioContext => {
        contexts++;
        if (failure === 'factory') throw new Error('constructor');
        return {
            currentTime: 0, destination: {},
            resume: () => failure === 'resume' ? Promise.reject(new Error('resume')) : Promise.resolve(),
            createOscillator: () => {
                if (failure === 'node') throw new Error('node');
                created++;
                return { frequency: { ...parameter, setValueAtTime: (value: number) => frequencies.push(value) }, connect: () => {}, disconnect: () => {}, start: () => { started++; }, stop: () => {} };
            },
            createGain: () => ({ gain: parameter, connect: () => {}, disconnect: () => {} }),
        } as unknown as AudioContext;
    };
    return { factory, frequencies, counts: () => ({ created, started, contexts }) };
}
describe('Son synthétisé', () => {
    it('S01 un pop par groupe, aucun contexte avant déverrouillage', async () => {
        const audio = fake(), sound = new Sound(audio.factory);
        sound.play({ popped: cells(4), fallen: [] });
        expect(audio.counts()).toEqual({ created: 0, started: 0, contexts: 0 });
        await sound.unlock();
        sound.play({ popped: cells(4), fallen: [] });
        sound.play({ popped: [], fallen: [] });
        expect(audio.counts()).toEqual({ created: 1, started: 1, contexts: 1 });
    });
    it('S02 hauteur varie avec le groupe et reste bornée', async () => {
        const audio = fake(), sound = new Sound(audio.factory);
        await sound.unlock();
        for (const count of [3, 4, 12, 100]) sound.play({ popped: cells(count), fallen: [] });
        expect(audio.frequencies).toEqual([420, 455, 735, 735]);
    });
    it('S03 chute distincte plus grave une seule fois par résolution', async () => {
        const audio = fake(), sound = new Sound(audio.factory);
        await sound.unlock();
        sound.play({ popped: cells(3), fallen: cells(20) });
        expect(audio.frequencies).toEqual([420, 150]);
        expect(audio.counts().started).toBe(2);
    });
    it('S04 coupure persistée, lecture et écritures tolèrent les exceptions', async () => {
        const audio = fake();
        const values = new Map<string, string>();
        const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
        const sound = new Sound(audio.factory, storage);
        await sound.unlock(); sound.setEnabled(false);
        sound.play({ popped: cells(3), fallen: cells(2) });
        expect(audio.counts().started).toBe(0);
        expect(values.get(SOUND_KEY)).toBe('off');
        const reloaded = new Sound(audio.factory, storage);
        await reloaded.unlock();
        expect(reloaded.enabled).toBe(false);
        expect(audio.counts().contexts).toBe(1);
        sound.setEnabled(true); sound.play({ popped: cells(3), fallen: [] });
        expect(audio.counts().started).toBe(1);
        const blocked = new Sound(undefined, { getItem: () => { throw new Error(); }, setItem: () => { throw new Error(); } });
        expect(() => { blocked.setEnabled(false); }).not.toThrow();
        expect(blocked.enabled).toBe(false);
    });
    it('S05 fabrique absente ou défaillante, resume rejeté et nœuds défaillants sans exception', async () => {
        for (const failure of ['factory', 'resume', 'node', 'absent']) {
            const audio = fake(failure);
            const sound = new Sound(failure === 'absent' ? undefined : audio.factory);
            await expect(sound.unlock()).resolves.toBeUndefined();
            expect(() => { sound.play({ popped: cells(3), fallen: cells(3) }); }).not.toThrow();
            expect(audio.counts().started).toBe(0);
        }
        expect(browserAudioFactory({})).toBeUndefined();
    });
});
