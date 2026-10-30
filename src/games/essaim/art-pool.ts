/** Fixed storage: effects never allocate particles during play. */
export const PARTICLE_BUDGET = 96;
export const REDUCED_PARTICLE_BUDGET = 4;
export interface ArtParticle {
    active: boolean; x: number; y: number; vx: number; vy: number;
    age: number; life: number; size: number; kind: 'shard' | 'smoke' | 'ring';
}
export class ArtPool {
    readonly particles: ArtParticle[] = Array.from({ length: PARTICLE_BUDGET }, () => ({
        active: false, x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, kind: 'shard',
    }));
    get active(): number { let count = 0; for (const p of this.particles) if (p.active) count++; return count; }
    clear(): void { for (const p of this.particles) p.active = false; }
    burst(x: number, y: number, reduced: boolean, large = false): void {
        const limit = reduced ? REDUCED_PARTICLE_BUDGET : PARTICLE_BUDGET;
        let remaining = reduced ? 1 : large ? 28 : 15;
        for (let i = 0; i < limit && remaining > 0; i++) {
            const p = this.particles[i]; if (!p || p.active) continue;
            const index = remaining--, angle = index * 2.399963;
            p.active = true; p.x = x; p.y = y; p.age = 0;
            p.kind = reduced || index === 1 ? 'ring' : index % 4 === 0 ? 'smoke' : 'shard';
            p.life = p.kind === 'smoke' ? 650 : p.kind === 'ring' ? 280 : 420;
            p.size = p.kind === 'smoke' ? 5 : p.kind === 'ring' ? 3 : 2;
            p.vx = reduced ? 0 : Math.cos(angle) * (30 + index * 3);
            p.vy = reduced ? 0 : Math.sin(angle) * (30 + index * 3);
        }
    }
    step(ms: number, reduced: boolean): void {
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i]; if (!p?.active) continue;
            if (reduced && (i >= REDUCED_PARTICLE_BUDGET || p.kind !== 'ring')) { p.active = false; continue; }
            p.age += ms;
            if (p.age >= p.life) { p.active = false; continue; }
            p.x += p.vx * ms / 1000; p.y += p.vy * ms / 1000;
        }
    }
}

/** The texture manager is the owner, so scene restarts also reuse the textures. */
export function ensureArtTextures(exists: (key: string) => boolean, generate: (key: string, color: number) => void): void {
    for (const [key, color] of [['essaim-nebula-v1', 0x7247bf], ['essaim-haze-v1', 0x167d99]] as const) {
        if (!exists(key)) generate(key, color);
    }
}
