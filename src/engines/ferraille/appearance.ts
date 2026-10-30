import type { Boss } from './engine';
import type { Theme } from './levels';

export const PALETTES: Record<Theme, [number, number, number]> = {
    factory: [0x101e30, 0x182e43, 0x5e8d91], desert: [0x392a25, 0x76513b, 0xd4a568],
    jungle: [0x102d28, 0x1d4b38, 0x83ae68], night: [0x121329, 0x292949, 0x8b8fc1],
};
export function backdropX(index: number, camera: number, layer: number): number {
    return ((index * 90 - camera * layer) % 720 + 720) % 720 - 90;
}
type Part = { shape: 'rect' | 'ellipse' | 'triangle'; x: number; y: number; w: number; h: number };
const DESIGNS = {
    fan: { name: 'ÉVENTREUR', shape: 'five-blade-fan', colors: [0xe8a449, 0x75401d], parts: [
        { shape: 'ellipse', x: -4, y: -4, w: 38, h: 38 },
        ...[-12, 0, 12, 24, 36].map(x => ({ shape: 'triangle' as const, x, y: -18 + Math.abs(x - 12) / 2, w: 12, h: 28 })),
        { shape: 'rect', x: 2, y: 24, w: 26, h: 12 },
    ] },
    stomp: { name: 'PILON', shape: 'twin-legged-hammer', colors: [0xd9cf92, 0x8b673a], parts: [
        { shape: 'rect', x: -14, y: -12, w: 58, h: 18 }, { shape: 'rect', x: 5, y: 4, w: 20, h: 22 },
        { shape: 'rect', x: -8, y: 24, w: 18, h: 12 }, { shape: 'rect', x: 20, y: 24, w: 18, h: 12 },
    ] },
    bombs: { name: 'SCARABOMBE', shape: 'winged-beetle', colors: [0x95c94f, 0x375b35], parts: [
        { shape: 'triangle', x: -22, y: -16, w: 30, h: 42 }, { shape: 'triangle', x: 22, y: -16, w: 30, h: 42 },
        { shape: 'ellipse', x: 0, y: -6, w: 30, h: 42 },
        { shape: 'ellipse', x: -8, y: 28, w: 12, h: 8 }, { shape: 'ellipse', x: 26, y: 28, w: 12, h: 8 },
    ] },
    sweep: { name: 'FAUCHEUSE', shape: 'scythe-tripod', colors: [0xb7a1f0, 0x4b326e], parts: [
        { shape: 'triangle', x: -12, y: 14, w: 54, h: 22 }, { shape: 'rect', x: 8, y: -16, w: 14, h: 42 },
        { shape: 'triangle', x: -30, y: -20, w: 66, h: 16 },
    ] },
    crossfire: { name: 'TENAILLE', shape: 'opposed-cannons', colors: [0xef779e, 0x692e49], parts: [
        { shape: 'rect', x: -24, y: -6, w: 16, h: 38 }, { shape: 'rect', x: 38, y: -6, w: 16, h: 38 },
        { shape: 'rect', x: -24, y: 18, w: 78, h: 10 }, { shape: 'ellipse', x: 2, y: -2, w: 26, h: 32 },
        { shape: 'rect', x: -34, y: 0, w: 28, h: 8 }, { shape: 'rect', x: 36, y: 0, w: 28, h: 8 },
    ] },
    reactor: { name: 'RÉACTEUR', shape: 'containment-tower', colors: [0x66d9ec, 0x235878], parts: [
        { shape: 'rect', x: -10, y: -28, w: 50, h: 64 }, { shape: 'triangle', x: -18, y: -44, w: 66, h: 20 },
        { shape: 'rect', x: -18, y: 26, w: 66, h: 10 },
    ] },
} satisfies Record<NonNullable<Boss['pattern']>, { name: string; shape: string; colors: number[]; parts: Part[] }>;
/** Shared by the actual drawing and the scene inspection hook. Coordinates are world pixels. */
export function bossAppearance(boss: Boss, ticks: number, reducedMotion: boolean) {
    const design = DESIGNS[boss.pattern ?? 'fan'];
    let shape = design.shape, colors = [...design.colors], parts: Part[] = design.parts;
    if (boss.pattern === 'reactor' && boss.phase === 2) {
        shape = 'split-reactor'; colors = [0xf29bca, 0x763556];
        parts = [{ shape: 'triangle', x: -26, y: -28, w: 30, h: 64 }, { shape: 'triangle', x: 26, y: -28, w: 30, h: 64 }, { shape: 'rect', x: -10, y: 24, w: 50, h: 12 }];
    } else if (boss.pattern === 'reactor' && boss.phase === 3) {
        shape = 'ruptured-reactor'; colors = [0xffe27e, 0x9e443d];
        parts = [{ shape: 'triangle', x: -20, y: -38, w: 70, h: 32 }, { shape: 'triangle', x: -20, y: 8, w: 70, h: 28 }, { shape: 'rect', x: -18, y: -10, w: 12, h: 28 }, { shape: 'rect', x: 36, y: -10, w: 12, h: 28 }];
    }
    return { name: design.name, shape, colors, parts,
        core: { x: 15, y: 12, radius: boss.exposed ? 8 : 5, exposed: Boolean(boss.exposed),
            color: boss.exposed ? 0x74f1c7 : 0xff6b8b,
            alpha: !boss.exposed || reducedMotion || ticks % 24 < 12 ? 1 : 0.35 },
        health: { hp: boss.hp, maxHp: boss.maxHp }, phase: boss.phase,
    };
}
