import { test } from 'vitest';
import { engineCases } from './collier-cases';
import { createC15 } from './collier-thumbnail';
for (const [id, oracle] of Object.entries(engineCases))
    test(`${id} collier : règles pures et états littéraux`, () => { oracle(); }, 2000);
const images = createC15();
for (let batch = 0; batch < 4; batch++)
    test(`C15 vignette : pas ${String(batch * 500)}–${String((batch + 1) * 500)}, aucune fenêtre de 36 images immobiles`, images, 2000);
