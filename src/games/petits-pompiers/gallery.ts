import { ids, characters } from '../../characters/model';
import { canvasGraphics } from '../thumbnail-art';
import { mascotPose } from './actors';
import { firefighter } from './art';
import { SPRITES } from './sprites';
/** A single visible row; the same uniform and character geometry as gameplay. The drawn mascots replace
 *  their vector figure once the sprite chunk has loaded; Tutu keeps the vector art. */
export function mascotGallery(): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.id = 'pompiers-mascots'; canvas.width = 700; canvas.height = 210;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', ids.map(id => characters[id].fr).join(', '));
    canvas.style.width = '100%'; canvas.style.maxWidth = '700px'; canvas.style.minWidth = '0'; canvas.style.flex = '0 0 100%'; canvas.style.height = 'auto';
    const c = canvas.getContext('2d');
    if (!c) return canvas;
    const paint = (images: Partial<Record<string, HTMLImageElement>>): void => {
        c.fillStyle = '#eaf4ed'; c.fillRect(0, 0, 700, 210);
        const g = canvasGraphics(c);
        for (const [i, id] of ids.entries()) {
            const x = 70 + i * 140, pose = mascotPose(id, 1, 1), image = pose ? images[pose.key] : undefined;
            if (pose && image) {
                // Feet just above the name; 140 px for a 36-unit mascot, so that Lumi's horn stays in the frame.
                const s = SPRITES[pose.key], k = 140 / 108;
                c.drawImage(image, x - s.ox * s.w * k, 168 - s.oy * s.h * k, s.w * k, s.h * k);
            } else firefighter(g, id, x, 140, 150, 0, 0, 1, false, false, false);
            c.fillStyle = '#263c51'; c.font = 'bold 20px system-ui'; c.textAlign = 'center'; c.fillText(characters[id].fr, x, 190);
        }
    };
    paint({});
    void import('./atlas').then(({ sprites }) => {
        const keys = ids.map(id => mascotPose(id, 1, 1)?.key).filter((k): k is NonNullable<typeof k> => Boolean(k && sprites[k]));
        const images: Record<string, HTMLImageElement> = {};
        let left = keys.length;
        for (const key of keys) {
            const image = new Image();
            image.onload = () => { images[key] = image; if (--left === 0) paint(images); };
            image.onerror = () => { if (--left === 0) paint(images); };
            image.src = sprites[key] ?? '';
        }
    });
    return canvas;
}
