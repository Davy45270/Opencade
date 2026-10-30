import assert from 'node:assert/strict';
import { test } from 'vitest';
import { characters, ids } from '../src/characters/model';

test('official character names, subtitles and mottos are stable', () => {
    assert.deepEqual(Array.from(ids, id => characters[id].fr), ['Boubou', 'CaliRoux', 'Pestouille', 'Tutu', 'Lumi']);
    assert.deepEqual(Array.from(ids, id => characters[id].subtitle), ['Panda glouton', 'Panda roux joueur et câlin', 'Dragon assidu', 'Singe en tutu', 'Licorne joueuse']);
    assert.deepEqual(Array.from(ids, id => characters[id].motto), ['Manger, foncer, recommencer !', 'Des câlins et des dérapages !', 'Toujours plus loin, toujours plus fort !', 'Des pirouettes plein la piste !', 'La magie au service de la victoire !']);
});
