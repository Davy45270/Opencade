import { createDemo } from '../../engines/essaim/demo';
import { rect, circle, type Thumbnail } from '../thumbnail';
export { createDemo };
export function createThumbnail(seed = 28): Thumbnail {
    const demo = createDemo(seed);
    // Start after entry, with the formation and a real diving enemy if available.
    for (let i = 0; i < 90; i++) {
        const enemies = demo.engine.state.enemies;
        if (enemies.some(e => e.phase === 'formation') && enemies.some(e => e.phase === 'dive' && e.y > 180)) break;
        demo.step();
    }
    return { step: () => { demo.step(); }, get restarts() { return demo.restarts; }, read: () => demo.engine.snapshot(), draw(c) {
        c.save(); c.fillStyle = '#101827'; c.fillRect(0, 0, 160, 120); c.scale(160 / 360, 120 / 540); c.translate(0, -40);
        const s = demo.engine.state;
        const hull = (x: number, y: number, w: number, h: number, color: string): void => {
            const gradient = c.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
            gradient.addColorStop(0, '#e0fff2'); gradient.addColorStop(0.35, color); gradient.addColorStop(1, '#285076');
            c.fillStyle = gradient; c.strokeStyle = '#080f25'; c.lineWidth = 3;
            c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
        };
        circle(c, 275, 250, 37, '#28425f'); circle(c, 288, 256, 31, '#101827');
        for (const p of s.enemies) {
            const color = p.type === 'armor' ? '#af90ed' : '#56dfb6';
            hull(p.x - 12, p.y, 19, 13, color); hull(p.x + 12, p.y, 19, 13, color);
            hull(p.x, p.y, 22, 25, color); rect(c, p.x - 7, p.y - 2, 14, 6, '#080f25');
            circle(c, p.x - 3, p.y, 2, '#ffdd90'); circle(c, p.x + 3, p.y, 2, '#ffdd90');
        }
        hull(s.cannon - 9, 565, 7, 18, '#ffbc69'); hull(s.cannon + 9, 565, 7, 18, '#ffbc69');
        hull(s.cannon, 555, 34, 16, '#43d2c0'); hull(s.cannon, 545, 20, 34, '#43d2c0');
        hull(s.cannon, 540, 10, 14, '#4caadd');
        for (const p of s.shots) {
            rect(c, p.x - 3, p.y, 6, 16, p.owner === 'player' ? '#8bcfc3' : '#ff466c');
            if (p.owner === 'enemy') rect(c, p.x - 1, p.y + 2, 2, 10, '#fff8dc');
        }
        c.restore();
    } };
}
