import { ids, characters } from '../../characters/model';
import { canvasGraphics } from '../thumbnail-art';
import { firefighter } from './art';
/** A single visible row; the same uniform and character geometry as gameplay. */
export function mascotGallery(): HTMLCanvasElement {
    const canvas = document.createElement('canvas'); canvas.id = 'pompiers-mascots'; canvas.width = 700; canvas.height = 210;
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', ids.map(id => characters[id].fr).join(', '));
    canvas.style.width = '100%'; canvas.style.maxWidth = '700px'; canvas.style.minWidth = '0'; canvas.style.flex = '0 0 100%'; canvas.style.height = 'auto';
    const c = canvas.getContext('2d');
    if (c) {
        c.fillStyle = '#eaf4ed'; c.fillRect(0, 0, 700, 210);
        const g = canvasGraphics(c);
        for (const [i, id] of ids.entries()) {
            firefighter(g, id, 70 + i * 140, 140, 150, 0, 0, 1, false, false, false);
            c.fillStyle = '#263c51'; c.font = 'bold 20px system-ui'; c.textAlign = 'center'; c.fillText(characters[id].fr, 70 + i * 140, 190);
        }
    }
    return canvas;
}
