import { describe, expect, it } from 'vitest';
import { manifest } from '../pwa-manifest';

describe('manifeste installable', () => {
    it('identifie Opencade en portrait et utilise les couleurs du socle', () => {
        expect(manifest.name).toBe('Opencade');
        expect(manifest.short_name).toBe('Opencade');
        expect(manifest.display).toBe('standalone');
        expect(manifest.orientation).toBe('portrait');
        expect(manifest.theme_color).toBe('#101827');
        expect(manifest.background_color).toBe('#101827');
    });
    it('reste relatif au dossier du manifeste, en local comme sur Pages', () => {
        expect(manifest.start_url).toBe('./');
        expect(manifest.scope).toBe('./');
        for (const icon of manifest.icons ?? []) expect(icon.src).toMatch(/^icons\//);
    });
    it('fournit deux tailles et une icône maskable explicite', () => {
        expect(manifest.icons).toEqual(expect.arrayContaining([
            expect.objectContaining({ sizes: '192x192', type: 'image/png', purpose: 'any' }),
            expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'any' }),
            expect.objectContaining({ sizes: '512x512', type: 'image/png', purpose: 'maskable' }),
        ]));
    });
});
