import { pistonClosed } from './modules';
import { Engine, solid, TILE } from './engine';
/** Normal controls only: read hazards, keep a firing lane, jump over shots and gaps. */
export function pilot(e: Engine): void {
    const s = e.state, h = s.hero;
    const ahead = Math.floor((h.x + h.w + (s.vehicle ? 22 : 10)) / TILE);
    const obstacle = solid(s, ahead, Math.floor((h.y + h.h - 3) / TILE));
    const gap = !solid(s, ahead, 16);
    const fanBoss = s.boss?.pattern === 'fan' || (s.boss?.pattern === 'reactor' && s.boss.phase === 1);
    const nearBoss = s.boss !== null && s.boss.x - h.x < (fanBoss ? 165 : s.weapon === 'flame' ? 60 : s.weapon === 'grenade' ? 90 : 165);
    const incoming = s.shots.some(p => !p.friendly && p.x > h.x - 45 && p.x < h.x + 45 && p.y > h.y - 15 && p.y < h.y + 30);
    const contact = s.enemies.some(p => Math.abs(p.x - h.x) < 65 && p.y > h.y - 20 && p.y < h.y + 100);
    const armor = s.enemies.find(p => p.kind === 'armored' && p.x > h.x && p.x - h.x < 100);
    const clearingArmor = armor && (armor.turned ?? 0) > 0;
    const cage = s.cages.find(c => !c.rescued && c.x > h.x && c.x - h.x < 42);
    const rearThreat = s.enemies.some(p => p.kind === 'kamikaze' && p.x < h.x && h.x - p.x < 65 && Math.abs(p.y - 242) < 20);
    const sweepingBoss = nearBoss && (s.boss?.pattern === 'sweep' || fanBoss);
    const sweepDefense = sweepingBoss && (!s.boss?.exposed || incoming);
    const highTarget = s.enemies.some(p => p.x > h.x && p.x < h.x + 150 && p.y < h.y - 30);
    const fallingBomb = s.shots.some(p => !p.friendly && p.kind === 'bomb' && Math.abs(p.x - h.x) < 35 && p.y < h.y && p.y > 100);
    // Let overturned armor enter the firing lane instead of landing on it.
    // Keep moving past a cage if a charging enemy is close behind; restore forward aim after dodging bombs.
    const towerTarget = s.grounded && s.enemies.some(p => p.kind === 'turret' && p.x > h.x && p.x - h.x < 90 && Math.abs(p.y - h.y) < 20);
    const module = s.modules?.find(m => h.x + h.w > m.x - 40 && h.x < m.x + m.w);
    const tunnel = module?.kind === 'tunnel';
    const switchDoor = module?.kind === 'gate' && module.value < 18;
    const secret = module?.kind === 'secret' && module.value < 30;
    const waiting = module?.kind === 'piston' && h.x + h.w <= module.x && (pistonClosed(s.ticks + 55) || s.ticks % 180 >= 45 && s.ticks % 180 < 145);
    const bridgeJump = module?.kind === 'bridge' && module.clock >= 24;
    e.input({ x: waiting || switchDoor || secret || towerTarget ? 0 : fallingBomb ? -1 : (nearBoss || (cage && !rearThreat) || clearingArmor) && s.facing > 0 ? 0 : 1, y: towerTarget ? 0 : switchDoor ? -1 : tunnel ? 1 : sweepDefense ? 1 : highTarget && s.grounded ? -1 : s.weapon === 'bounce' && s.grounded && contact ? 1 : 0, fire: true,
        jump: towerTarget || tunnel || waiting || switchDoor || secret ? false : s.grounded ? (bridgeJump || obstacle || gap || (incoming && !sweepingBoss && !clearingArmor) || (contact && !clearingArmor && !cage) || Boolean(armor && !clearingArmor)) : h.vy < 0 });
}
