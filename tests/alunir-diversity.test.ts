import { expect, test } from 'vitest';
import { Engine, LEVELS, difficulty } from '../src/engines/alunir/engine';
import { alunirDiversity, alunirFeatures } from '../scripts/alunir-diversity.js';
// A-DIV-01: the diversity inventory reads Alunir's flight plans, not only its terrain. The terrain
// is the same flat profile on all thirty levels, so a terrain-only reading called levels 6-7, 7-8
// and 27-28 clones although they ask for comets, a light-gravity zone, a wind tunnel or ice.
test('A-DIV-01 la mesure de diversité voit les mécaniques d’Alunir, pas seulement le sol', () => {
    const features = LEVELS.map((_, level) => { const e = new Engine(); e.loadLevel(level, 28); return alunirFeatures(e, difficulty(level)); });
    const terrain = features.map(f => f.layout.filter(t => /^\d+:\d+$/.test(t)).join(' '));
    expect(new Set(terrain).size).toBe(1);
    LEVELS.forEach((level, i) => { for (const m of level.mechanics) expect(features[i]?.elements).toContain(`mechanic:${m}`); });
    const report = alunirDiversity({ Engine, difficulty, LEVELS });
    expect(report.noveltyLevels).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(report.cloneShare).toBe(0);
    for (const t of (report as unknown as { transitions: { distance: number }[] }).transitions) expect(t.distance).toBeGreaterThan(0.15);
});
