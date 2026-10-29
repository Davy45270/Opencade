import { required } from './access';
import { Random } from '../shared/random';
import { distance } from './track';
import type { Item, Kart } from './physics';
export interface Crate {
    x: number;
    y: number;
    cooldown: number;
}
export interface Puddle {
    x: number;
    y: number;
    owner: number;
    remaining: number;
}
export function drawItem(r: Random, place: number): Item {
    const weights = [1 + place * .7, 1 + place * .2, 3 - place * .3, 2], total = weights.reduce((a, b) => a + b, 0);
    let value = r.next() * total;
    const items: Item[] = ['turbo', 'ressort', 'flaque', 'bulle'];
    for (let i = 0; i < 4; i++) {
        value -= required(weights[i]);
        if (value < 0)
            return required(items[i]);
    }
    return 'bulle';
}
export function useItem(k: Kart, puddles: Puddle[]): void {
    if (k.item === 'turbo')
        k.boostMs = 1800;
    if (k.item === 'ressort')
        k.jumpMs = 1600;
    if (k.item === 'bulle')
        k.shield = true;
    if (k.item === 'flaque')
        puddles.push({ x: k.x - Math.cos(k.angle) * 4, y: k.y - Math.sin(k.angle) * 4, owner: k.id, remaining: 6000 });
    k.item = null;
}
export function updateItems(karts: Kart[], crates: Crate[], puddles: Puddle[], order: number[], r: Random, ms: number): void {
    for (const c of crates) {
        c.cooldown = Math.max(0, c.cooldown - ms);
        if (c.cooldown === 0)
            for (const k of karts)
                if (!k.item && distance(k, c) < 3) {
                    k.item = drawItem(r, order.indexOf(k.id));
                    c.cooldown = 5000;
                    break;
                }
    }
    for (const p of puddles) {
        p.remaining -= ms;
        for (const k of karts)
            if (k.id !== p.owner && distance(k, p) < 3 && k.jumpMs === 0) {
                if (k.shield) {
                    k.shield = false;
                    p.remaining = 0;
                }
                else
                    k.slipMs = 1100;
            }
    }
    for (let i = puddles.length - 1; i >= 0; i--)
        if (required(puddles[i]).remaining <= 0)
            puddles.splice(i, 1);
}
