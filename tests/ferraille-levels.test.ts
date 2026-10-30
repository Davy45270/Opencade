import { describe, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { moduleEffects, introductions, repetition, legacyState, replayLevel, type LevelRecording } from './ferraille-levels';
const records = JSON.parse(readFileSync(new URL('./fixtures/ferraille-levels-103.json', import.meta.url), 'utf8')) as LevelRecording[];
describe('Ferraille passe 103', () => {
    it('F-niv-01 effets littéraux des seize modules', () => { moduleEffects(); });
    it('F-intro démonstrations jouables et sans danger', () => { introductions(); });
    it('F-niv-03 ordre, gestes et cas négatifs', () => { repetition(); });
    it('F-niv-04 ancien état moteur', () => { legacyState(); });
    for (const record of records) it(`F-niv-02 ${String(record.level + 1)}/${String(record.seed)}/${String(record.special)} cinq personnages`, () => {
        for (const character of ['panda', 'pandaroux', 'dragon', 'singe', 'licorne']) replayLevel(record, character);
    });
});
