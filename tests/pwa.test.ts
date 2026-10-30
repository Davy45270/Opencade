import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearAppWorker, formatBuild, isAppCache } from '../src/shell/pwa-utils';

describe('PWA build and recovery', () => {
    afterEach(() => { vi.unstubAllGlobals(); });
    it('formats the build instant locally with an explicit timezone oracle', () => {
        expect(formatBuild('0.3.2', '2026-10-30T14:05:00Z', 'UTC')).toBe('Opencade 0.3.2 · 2026-10-30 14:05');
        expect(formatBuild('0.3.2', '2026-10-30T14:05:00Z', 'Europe/Paris')).toBe('Opencade 0.3.2 · 2026-10-30 15:05');
    });
    it('only selects app cache names, leaving other Workbox apps intact', () => {
        const names = ['opencade-precache-v2-http://localhost:4173/', 'opencade-runtime', 'workbox-precache-v2-other', 'other-app-runtime', 'opencade2-precache', 'opencade'];
        expect(names.filter(isAppCache)).toEqual(['opencade-precache-v2-http://localhost:4173/', 'opencade-runtime']);
    });
    it('unregisters before deleting app caches and never touches saved games', async () => {
        const localStorage = new Map([['arcade-lab:dedale', '{"best":42}'], ['arcade-lab:orbite', 'saved']]);
        const before = [...localStorage];
        vi.stubGlobal('localStorage', {
            getItem: (key: string) => localStorage.get(key) ?? null,
            setItem: (key: string, value: string) => localStorage.set(key, value),
            removeItem: (key: string) => localStorage.delete(key),
            clear: () => { localStorage.clear(); },
        });
        const calls: string[] = [];
        await clearAppWorker({ unregister: () => { calls.push('unregister'); return Promise.resolve(true); } }, {
            keys: () => Promise.resolve(['foreign', 'opencade-precache-v2-scope', 'workbox-precache-v2-foreign']),
            delete: name => { calls.push(name); return Promise.resolve(true); },
        });
        expect(calls).toEqual(['unregister', 'opencade-precache-v2-scope']);
        expect([...localStorage]).toEqual(before);
    });
});
