import type { State, Rect } from './engine';

export const MODULES = {
    conveyor: { name: 'Convoyeur', action: 'contre-braquer' },
    piston: { name: 'Piston', action: 'attendre-cycle' },
    bridge: { name: 'Pont fragile', action: 'traverser-sans-arrêt' },
    lift: { name: 'Ascenseur', action: 'monter' },
    chain: { name: 'Chaîne oscillante', action: 'sauter-plateforme' },
    gate: { name: 'Porte à interrupteur', action: 'tirer-interrupteur' },
    secret: { name: 'Mur secret', action: 'détruire-mur' },
    crate: { name: 'Caisse mobile', action: 'pousser' },
    tower: { name: 'Tour', action: 'tirer-en-haut' },
    hut: { name: 'Cabane à otage', action: 'libérer' },
    spotlight: { name: 'Projecteur', action: 'éviter-faisceau' },
    rails: { name: 'Aiguillage', action: 'choisir-hauteur' },
    wind: { name: 'Vent contraire', action: 'compenser-vent' },
    lava: { name: 'Lave montante', action: 'fuir-en-hauteur' },
    tunnel: { name: 'Conduit bas', action: 'accroupir' },
    spring: { name: 'Tremplin', action: 'rebondir' },
} as const;
export type ModuleKind = keyof typeof MODULES;
export interface TerrainModule extends Rect {
    kind: ModuleKind; preview: boolean; clock: number; active: boolean; value: number;
}
export function moduleAt(kind: ModuleKind, x: number, preview = false): TerrainModule {
    return { kind, x, y: 256, w: 96, h: 8, preview, clock: 0, active: false, value: 0 };
}
export function pistonBox(m: TerrainModule): Rect { return { x: m.x + 16, y: m.y - 78, w: m.w - 32, h: 78 }; }
export function pistonClosed(ticks: number): boolean { return ticks % 180 >= 100 && ticks % 180 < 145; }
/** Physical effects use fixed ticks and literal distances, shared by play and replays. */
export function stepModules(s: State, shift: (axis: 'x' | 'y', amount: number) => void, crush: () => void): void {
    const h = s.hero;
    for (const m of s.modules ?? []) {
        const inside = h.x + h.w > m.x && h.x < m.x + m.w;
        const foot = h.y + h.h;
        if (inside && !m.active) { m.active = true; s.moduleTrace?.push(m.kind); }
        if (m.active) m.clock++;
        if (m.kind === 'conveyor' && inside && s.grounded && Math.abs(foot - m.y) < 1) shift('x', 0.4);
        if (m.kind === 'wind' && inside) shift('x', -0.6);
        if (m.kind === 'piston') {
            m.value = pistonClosed(s.ticks) ? 1 : 0;
            const box = pistonBox(m);
            if (h.x + h.w > box.x && h.x < box.x + box.w && h.y + h.h > box.y && h.y < box.y + box.h && m.value && !m.preview) crush();
        }
        if (m.kind === 'bridge' && m.active && m.clock === 36) {
            for (let x = Math.floor((m.x + 32) / 16); x < Math.floor((m.x + 80) / 16); x++) for (let y = 16; y < (m.preview ? 17 : 20); y++) s.tiles[y * s.columns + x] = false;
            m.value = 1;
        }
        if (m.kind === 'gate' || m.kind === 'secret') {
            const previous = m.value;
            if (s.input.fire && m.value < (m.kind === 'gate' ? 18 : 30) && h.x > m.x - 100 && h.x < m.x + m.w && (m.kind === 'secret' || s.input.y < 0)) m.value++;
            if (m.value < (m.kind === 'gate' ? 18 : 30) && h.x + h.w > m.x + 45 && h.x < m.x + 64) { h.x = m.x + 45 - h.w; h.vx = 0; }
            if (m.kind === 'secret' && previous < 30 && m.value === 30) { s.bonuses.push({ x: m.x + 70, y: 232, w: 16, h: 24, kind: 'shield' }); }
        }
        if (m.kind === 'crate' && inside && s.grounded && h.x + h.w >= m.x + 24 + m.value && m.value < 48) {
            if (s.input.x > 0) m.value += 0.8;
            h.x = Math.min(h.x, m.x + 24 + m.value - h.w);
        }
        if (m.kind === 'spring' && inside && s.grounded) { h.vy = -390; s.grounded = false; m.value++; }
        if (m.kind === 'rails' && inside && s.grounded) { shift('x', 1); if (s.input.y < 0) { h.vy = -260; s.grounded = false; m.value = 1; } }
        if (m.kind === 'lava' && m.active && inside) {
            m.value = Math.min(80, m.clock * 0.4);
            if (m.clock > 100 && foot > 296 - m.value && !m.preview) crush();
        }
        if (m.kind === 'spotlight') m.value = Math.floor(s.ticks / 90) % 2;
    }
}
