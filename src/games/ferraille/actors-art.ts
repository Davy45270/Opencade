import type Phaser from 'phaser';

/** Chunky silhouettes, helmets, rivets and working barrels in a single Graphics. */
export function enemyArt(g: Phaser.GameObjects.Graphics, kind: string, x: number, y: number): void {
    const robot = kind === 'armored' || kind === 'kamikaze', flying = kind === 'drone', turret = kind === 'turret';
    g.lineStyle(4, 0x203344); g.fillStyle(robot ? 0x9dafbe : turret ? 0x60865a : 0xc98445);
    g.fillRoundedRect(x, y, 39, flying ? 25 : 40, 8); g.strokeRoundedRect(x, y, 39, flying ? 25 : 40, 8);
    g.fillStyle(0x253746); g.fillRect(x + 4, y + 9, 31, 10);
    g.fillStyle(robot ? 0xff655a : 0xffe37a); g.fillRect(x + 7, y + 11, 9, 5); g.fillRect(x + 24, y + 11, 8, 5);
    g.fillStyle(0xf6d48e); g.fillCircle(x + 5, y + 4, 2); g.fillCircle(x + 34, y + 4, 2);
    g.fillStyle(0x42596b); g.fillRect(x - 22, y + 22, 33, 10); g.lineStyle(2, 0xb8d9dc); g.lineBetween(x - 20, y + 23, x + 6, y + 23);
    if (flying) { g.lineStyle(4, 0xd9ebda); g.lineBetween(x - 12, y - 6, x + 52, y - 6); g.lineBetween(x + 19, y - 14, x + 19, y); }
    else { g.fillStyle(0x253546); g.fillRoundedRect(x - 4, y + 36, 19, 10, 3); g.fillRoundedRect(x + 25, y + 36, 19, 10, 3); }
    if (robot) { g.fillStyle(0xf4bf49); g.fillRect(x + 13, y + 23, 15, 8); g.lineStyle(3, 0xd1e4e3); g.lineBetween(x + 41, y + 18, x + 48, y + 35); }
}

export function weaponArt(g: Phaser.GameObjects.Graphics, id: string, x: number, y: number, facing: number, firing: boolean, ticks: number, reduced: boolean, angle = facing < 0 ? Math.PI : 0): void {
    g.save(); g.translateCanvas(x, y); g.rotateCanvas(angle);
    x = 0; y = 0; facing = 1;
    const dx = (n: number): number => x + n * facing;
    if (id === 'licorne') {
        g.lineStyle(5, 0xf1acff); g.beginPath(); g.arc(dx(43), y, 27, -Math.PI / 2, Math.PI / 2, facing < 0); g.strokePath();
        g.lineStyle(2, 0xfff0fd); g.lineBetween(dx(43), y - 27, dx(43), y + 27);
    } else {
        g.fillStyle(0x203343); g.fillRoundedRect(Math.min(dx(18), dx(69)), y - 11, 51, 22, 4);
        g.fillStyle(id === 'singe' ? 0xefc54b : id === 'dragon' ? 0xd87944 : 0x90a881); g.fillRect(Math.min(dx(20), dx(56)), y - 8, 36, 16);
        g.lineStyle(3, 0xe2e6c0); for (let i = 0; i < 3; i++) g.lineBetween(dx(38), y - 6 + i * 6, dx(72), y - 6 + i * 6);
        g.fillStyle(0x243747); g.fillEllipse(dx(72), y, 9, 22);
        g.fillStyle(0xf8ce60); g.fillCircle(dx(72), y, 3);
    }
    if (firing) {
        const pulse = reduced ? 0 : ticks % 4 * 3;
        g.fillStyle(id === 'licorne' ? 0xf0a4ff : 0xffa52e); g.fillTriangle(dx(77), y - 15, dx(110 + pulse), y, dx(77), y + 15);
        g.fillStyle(0xfff6b6); g.fillTriangle(dx(77), y - 7, dx(99 + pulse), y, dx(77), y + 7);
    }
    g.restore();
}
