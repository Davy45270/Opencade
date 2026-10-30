import { test, expect } from 'vitest';
import modelSource from '../src/characters/model.ts?raw';
import { ids } from '../src/characters/model';
import { deterministic, distinct, moving, persistence, renderers } from './character-checks';
for (const id of ids) {
    test(`C01 ${id}: all 75 pose/expression/animation combinations`, () => { deterministic(id); });
    test(`C03 ${id}: motion and fixed reduce`, () => { moving(id); });
}
test('C02 distinct silhouettes, accents, orientations and expressions', () => { distinct(); });
test('C04 default, persistence, invalid values and isolated saves', () => { persistence(); });
test('C05 model has no presentation dependency', () => {
    expect(modelSource).not.toMatch(/window|document|phaser|canvas/i);
});

test('C06 both vector adapters consume the list at 32, 160 and 480 px', () => { renderers(); });
