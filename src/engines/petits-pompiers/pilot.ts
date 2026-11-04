import { Engine, TILE, tileCenter, distance, IDLE, type Intent } from './engine';
import { adjacent, WIDTH } from './levels';
/** Reads state only: every effect still goes through the public input and fixed step. */
export class Pilot {
    private waypoint: number | null = null;
    private objective = '';
    readAction(e: Engine): Intent {
        if (e.job) return { ...IDLE, action: e.job.kind === 'spray' && this.inJet(e) };
        const guide = e.nextObjective(), key = `${guide.type}/${String(guide.at)}`;
        if (key !== this.objective) { this.waypoint = null; this.objective = key; }
        if (guide.type === 'extinguish') {
            const desired = e.has('foam') && e.charges && distance(e.at, guide.at) <= 1 ? 'foam' : 'hose';
            if (e.equipped !== desired) return { ...IDLE, tool: !e.previous.tool };
            const range = e.equipped === 'foam' && e.charges ? 1 : e.character === 'panda' ? 4 : 3;
            if (e.equipped === 'foam' && !e.charges) return { ...IDLE, tool: !e.previous.tool };
            const goals: number[] = [];
            for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
                for (let n = 1; n <= range; n++) {
                    const x = guide.at % WIDTH + (dx ?? 0) * n, y = Math.floor(guide.at / WIDTH) + (dy ?? 0) * n;
                    if (x < 0 || x >= WIDTH || y < 0 || y >= 9) break;
                    const at = y * WIDTH + x;
                    if (e.solid(at)) break;
                    if (n >= Math.min(2, range)) goals.push(at);
                }
            }
            if (goals.includes(e.at) && this.centered(e)) {
                const dx = Math.sign(guide.at % WIDTH - e.at % WIDTH), dy = Math.sign(Math.floor(guide.at / WIDTH) - Math.floor(e.at / WIDTH));
                return { dx, dy, action: !e.previous.action, tool: false };
            }
            const safeGoals = goals.filter(at => !e.smoky(at));
            return this.walk(e, safeGoals.length ? safeGoals : goals);
        }
        if (guide.type === 'tool' || guide.type === 'exit' || guide.type === 'safe') {
            if (guide.type === 'safe' && distance(e.at, guide.at) <= 1 && this.centered(e)) return { ...IDLE, action: !e.previous.action };
            return this.walk(e, [guide.at]);
        }
        const goals = guide.type === 'ladder' ? [guide.at] : adjacent(guide.at).filter(at => !e.solid(at));
        if (goals.includes(e.at) && this.centered(e)) return { ...IDLE, action: !e.previous.action };
        return this.walk(e, goals);
    }
    private inJet(e: Engine): boolean {
        const range = e.character === 'panda' ? 4 : 3;
        for (let n = 0; n <= range; n++) {
            const x = e.at % WIDTH + e.player.dx * n, y = Math.floor(e.at / WIDTH) + e.player.dy * n;
            if (x < 0 || x >= WIDTH || y < 0 || y >= 9) return false;
            const at = y * WIDTH + x;
            if (e.fires.some(f => f.at === at)) return true;
            if (e.solid(at)) return false;
        }
        return false;
    }
    private centered(e: Engine): boolean { const p = tileCenter(e.at); return Math.hypot(e.player.x - p.x, e.player.y - p.y) < 2.5; }
    private walk(e: Engine, goals: number[]): Intent {
        if (this.waypoint !== null) {
            const p = tileCenter(this.waypoint), dx = p.x - e.player.x, dy = p.y - e.player.y;
            if (Math.hypot(dx, dy) > 2.4) return { dx: Math.abs(dx) > 1.6 ? Math.sign(dx) : 0, dy: Math.abs(dx) <= 1.6 ? Math.sign(dy) : 0, action: false, tool: false };
            this.waypoint = null;
        }
        if (!this.centered(e)) { this.waypoint = e.at; return this.walk(e, goals); }
        const path = e.path(e.at, goals, false, true) ?? e.path(e.at, goals);
        if (!path?.length) return { ...IDLE };
        this.waypoint = path[0] ?? null;
        return this.walk(e, goals);
    }
}
export const MAX_PILOT_SECONDS = 600;
export const SIMULATION_TILE_SIZE = TILE;
