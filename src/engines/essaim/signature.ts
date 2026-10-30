/** Fixed-step signature simulation. No clock, random draws or rendering dependencies. */
export type SignatureCharacter = 'panda' | 'pandaroux' | 'dragon' | 'singe' | 'licorne';
export type SignatureKind = 'bao' | 'leaves' | 'dragonfire' | 'bananas' | 'stars';
export const SIGNATURES: Record<SignatureCharacter, SignatureKind> = {
    panda: 'bao', pandaroux: 'leaves', dragon: 'dragonfire', singe: 'bananas', licorne: 'stars',
};
export interface SignatureTarget { id: number; x: number; y: number; hp: number; bananaUntil?: number }
export interface SignatureProjectile {
    kind: SignatureKind; stage: 'seed' | 'fragment' | 'orbit' | 'bolt' | 'star' | 'blast';
    x: number; y: number; vx: number; vy: number; age: number; origin: number;
    hits: Record<number, number>; target?: number; terminal?: number; bounces: number;
}
export interface SignatureState {
    character: SignatureCharacter; kind: SignatureKind; charge: number; held: boolean;
    cooldown: number; budget: number; damage: number; uses: number; projectiles: SignatureProjectile[];
}
export function signatureState(character: SignatureCharacter): SignatureState {
    return { character, kind: SIGNATURES[character], charge: 0, held: false, cooldown: 0, budget: 0, damage: 0, uses: 0, projectiles: [] };
}
function projectile(kind: SignatureKind, x: number, y: number, vx = 0, stage: SignatureProjectile['stage'] = 'seed'): SignatureProjectile {
    return { kind, stage, x, y, vx, vy: -240, age: 0, origin: x, hits: {}, bounces: 0 };
}
export function holdSignature(s: SignatureState, held: boolean, x: number): boolean {
    let released = false;
    if (!held && s.held && s.charge >= 0.2 && s.cooldown === 0) {
        s.kind = SIGNATURES[s.character];
        s.budget = 3; s.damage = 0; s.cooldown = 8000; s.uses++;
        s.projectiles = s.kind === 'bananas'
            ? [-150, 0, 150].map(vx => ({ ...projectile(s.kind, x, 526, vx, 'orbit'), vy: -190, bounces: 4 }))
            : [projectile(s.kind, x, 526, 0, s.kind === 'leaves' ? 'orbit' : 'seed')];
        released = true;
    }
    if (!held) s.charge = 0;
    s.held = held;
    return released;
}
/** Hit callback returns actual damage (zero for a blocked escort). Shared budget is per release. */
export function stepSignature(s: SignatureState, targets: readonly SignatureTarget[], tick: number,
    hit: (target: SignatureTarget, damage: number, vx: number, vy: number) => number): void {
    s.cooldown = Math.max(0, s.cooldown - 1000 / 60);
    if (s.cooldown < 0.000001) s.cooldown = 0;
    if (s.held && s.cooldown === 0) s.charge = Math.min(1, (Math.round(s.charge * 90) + 1) / 90);
    const next: SignatureProjectile[] = [];
    const hurt = (p: SignatureProjectile, e: SignatureTarget, amount: number, repeat = false): void => {
        if (e.hp <= 0 || s.budget <= 0 || p.hits[e.id] !== undefined && (!repeat || tick - (p.hits[e.id] ?? 0) < 18)) return;
        p.hits[e.id] = tick;
        const dealt = hit(e, Math.min(s.budget, amount), p.vx, p.vy);
        s.budget = Math.max(0, s.budget - dealt); s.damage += dealt;
    };
    for (const p of s.projectiles) {
        p.age++;
        if (p.stage === 'blast') { if (p.age < 20) next.push(p); continue; }
        const oldY = p.y;
        if (p.kind === 'dragonfire' && p.terminal === undefined) p.terminal = Math.max(36, Math.min(210, ...targets.filter(e => e.hp > 0 && e.y > 0 && Math.abs(e.x-p.x)<72).map(e=>e.y)));
        if (p.kind === 'leaves') { p.x = p.origin + Math.sin(p.age / 12) * 48; p.vy = -115; }
        if (p.kind === 'stars') {
            const target = targets.find(e => e.id === p.target && e.hp > 0)
                ?? [...targets].filter(e => e.hp > 0 && e.y > 0).sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y) || a.id-b.id)[0];
            if (target) {
                p.target = target.id;
                const length = Math.max(1, Math.hypot(target.x-p.x,target.y-p.y));
                p.vx = (target.x-p.x)/length*300; p.vy = (target.y-p.y)/length*300;
            }
        }
        p.x += p.vx / 60; p.y += p.vy / 60;
        if (p.kind === 'bao' && p.stage === 'seed' && p.y <= 320) {
            for (const vx of [-180, -90, 0, 90, 180]) next.push({ ...projectile('bao', p.x, 320, vx, 'fragment'), vy: -170 });
            continue;
        }
        if (p.kind === 'stars' && p.stage === 'seed' && p.age === 30) {
            const nearest = [...targets].filter(e => e.hp > 0 && e.y > 0).sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y) || a.id-b.id);
            for (let i = 0; i < 6; i++) next.push({ ...projectile('stars', p.x, p.y, (i-2.5)*40, 'star'), target: nearest[i % Math.max(1, nearest.length)]?.id });
            continue;
        }
        if (p.kind === 'bananas' && p.bounces > 0 && (p.x < 12 || p.x > 348)) {
            p.x = Math.max(12, Math.min(348, p.x)); p.vx = -p.vx; p.bounces--;
        }
        let consumed = false;
        if (!(p.stage === 'seed' && (p.kind === 'bao' || p.kind === 'stars'))) for (const e of targets) {
            const radius = p.kind === 'leaves' ? 38 : p.kind === 'bao' ? 84 : p.kind === 'bananas' ? 46 : 18;
            if (e.hp <= 0) continue;
            if (Math.abs(e.x-p.x) > radius || e.y < Math.min(oldY,p.y)-radius || e.y > Math.max(oldY,p.y)+radius) continue;
            if (p.kind === 'bananas') e.bananaUntil = tick + 108;
            hurt(p, e, p.kind === 'bao' ? 0.15 : p.kind === 'leaves' ? 0.45 : p.kind === 'bananas' ? 0.175 : p.kind === 'stars' ? 0.4 : 0.5, p.kind === 'leaves' || p.kind === 'bananas');
            if (p.stage === 'star') { consumed = true; break; }
        }
        if (p.kind === 'dragonfire' && (p.y <= (p.terminal ?? 210) || p.age >= 150)) {
            // Final impact: radius 72; piercing and explosion share the three-point budget.
            for (const e of targets) if (Math.hypot(e.x-p.x,e.y-p.y) <= 72) {
                const blast = { ...p, hits: {} }; hurt(blast, e, 1.5);
            }
            next.push({ ...p, stage: 'blast', age: 0 }); continue;
        }
        if (!consumed && p.y > -60 && p.x > -60 && p.x < 420 && p.age < 360) next.push(p);
    }
    // At most six moving projectiles and one fading impact; never tied to particle storage.
    s.projectiles = next;
}
