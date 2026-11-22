import { describe, expect, it } from 'vitest';
import { Engine, DT } from '../src/engines/ferraille/engine';
import { pilot } from '../src/engines/ferraille/pilot';
import { PILOTES, reliefEdite } from '../src/engines/ferraille/pilote';

/** Relief généré (Sturgeon) : chaque niveau pilote est gagné par l'IA du jeu, avec au moins 8 sauts (les 30 niveaux existants : 1 à 12, médiane 3). */
function partie(base: number, seed: number, rows?: readonly string[]) {
    const e = new Engine(); e.terrain = rows ? { rows } : undefined; e.loadLevel(base, seed);
    let sauts = 0, sol = true;
    for (let f = 0; f < 30000 && e.status === 'playing'; f++) {
        pilot(e); e.step(DT);
        const s = e.state; if (sol && !s.grounded && s.hero.vy < 0) sauts++; sol = s.grounded;
    }
    return { status: e.status, sauts };
}

describe('ferraille, niveaux pilotes', () => {
    it('cinq niveaux, chacun gagné par le pilote du jeu', () => {
        expect(PILOTES).toHaveLength(5);
        for (const p of PILOTES) {
            const r = partie(p.base, p.seed, p.rows);
            expect(r.status, p.nom).toBe('won');
            expect(r.sauts, p.nom).toBeGreaterThanOrEqual(8);
        }
    }, 120000);
    it('relief retouché : décodé, et refusé s\'il est invalide', () => {
        const p = PILOTES[0];
        if (!p) throw new Error('aucun pilote');
        const code = btoa(JSON.stringify({ nom: 'x', base: p.base, seed: p.seed, rows: p.rows })).replace(/\+/g, '-').replace(/\//g, '_');
        expect(reliefEdite(code)?.rows).toEqual(p.rows);
        // Nom accentué : l'éditeur encode l'UTF-8 (btoa seul lève une erreur hors Latin-1).
        const utf8 = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify({ nom: 'Pilote 1 (retouché)', base: p.base, seed: p.seed, rows: p.rows })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        expect(reliefEdite(utf8)?.nom).toBe('Pilote 1 (retouché)');
        expect(reliefEdite(btoa(JSON.stringify({ base: 99, rows: ['X'] })))).toBeUndefined();
        expect(reliefEdite(btoa(JSON.stringify({ base: 1, rows: ['<script>'] })))).toBeUndefined();
        expect(reliefEdite('%%%')).toBeUndefined();
    });
});
