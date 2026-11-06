import { expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { BONUS_SPRITES, bonusIcon, pickupPanel } from '../src/games/derapage/bonus-sprites';

/** Width and height of a lossy or lossless WebP with alpha (VP8X header). */
function webpSize(path: string): { w: number; h: number } {
    const b = readFileSync(path);
    expect(b.toString('ascii', 0, 4)).toBe('RIFF');
    expect(b.toString('ascii', 12, 16)).toBe('VP8X');
    return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
}

test('Z43 David\'s bonuses: one square WebP with alpha per sprite, about twice its screen size, 40 kB in all at most', () => {
    let bytes = 0;
    for (const [key, side] of Object.entries(BONUS_SPRITES)) {
        const path = `src/games/derapage/bonus/${key}.webp`;
        expect(webpSize(path)).toEqual({ w: side, h: side });
        bytes += readFileSync(path).length;
    }
    expect(bytes).toBeLessThan(40_000);
});

test('Z43 the bonus in hand has one icon per bonus, the same for every mascot; the box is the capsule, the puddle the cloud', () => {
    expect((['turbo', 'ressort', 'flaque', 'bulle'] as const).map(item => bonusIcon(item))).toEqual(['icon_turbo', 'icon_ressort', 'icon_flaque', 'icon_bulle']);
    expect(bonusIcon('turbo', true)).toBe('icon_turbo_small');
    // 3D panels: the near reduction from 24 px on screen, the far one below.
    expect(pickupPanel('crate', 44)).toBe('capsule');
    expect(pickupPanel('crate', 13)).toBe('capsule_far');
    expect(pickupPanel('puddle', 30)).toBe('icon_flaque');
    expect(pickupPanel('puddle', 15)).toBe('icon_flaque_small');
});
