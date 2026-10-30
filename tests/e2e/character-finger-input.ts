import type { Page, CDPSession } from '@playwright/test';
type Touch = { id: number; x: number; y: number };

/** Only CDP touch packets produce gameplay/menu input. Seeded noise is reproducible. */
export class Finger {
    entries: { selectors: string[]; points: Touch[]; timeMs: number; missed: boolean }[] = [];
    private seed = 70;
    private active = false;
    constructor(private page: Page, private cdp: CDPSession, private started = Date.now()) {}
    private noise(): number { this.seed = (this.seed * 16807) % 2147483647; return this.seed % 25 - 12; }
    async release(): Promise<void> {
        if (!this.active) return;
        await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        this.active = false;
    }
    async touch(type: 'touchStart' | 'touchMove', points: Touch[]): Promise<void> {
        if (!points.length) throw new Error('A touch needs at least one point');
        if (type === 'touchStart') await this.release();
        else if (!this.active) throw new Error('A drag needs a touchStart');
        await this.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points });
        this.active = true;
    }
    async steer(selectors: string[]): Promise<void> {
        const targets = selectors.map(selector => ({ selector, dx: this.noise(), dy: this.noise() }));
        const { points, missed } = await this.page.evaluate(targets => {
            let missed = false;
            const points = targets.map(({ selector, dx, dy }, id) => {
                const r = document.querySelector(selector)?.getBoundingClientRect();
                if (!r) throw new Error(`Missing touch target ${selector}`);
                const x = r.x + r.width / 2 + dx, y = r.y + r.height / 2 + dy;
                missed ||= !document.elementFromPoint(x, y)?.closest(selector);
                return { id, x, y };
            });
            return { points, missed };
        }, targets);
        // Previous held controls remain active during decision latency.
        await this.page.waitForTimeout(150);
        await this.release();
        if (points.length) await this.touch('touchStart', points);
        this.entries.push({ selectors, points, timeMs: Date.now() - this.started, missed });
    }

    async press(selectors: string[], during: () => Promise<void> = async () => {}, latencyMs = 150): Promise<void> {
        const points: Touch[] = []; let missed = false;
        for (const [id, selector] of selectors.entries()) {
            const r = await this.page.locator(selector).boundingBox();
            if (!r) throw new Error(`Missing touch target ${selector}`);
            const x = r.x + r.width / 2 + this.noise(), y = r.y + r.height / 2 + this.noise();
            const hit = await this.page.evaluate(({ x, y, selector }) => Boolean(document.elementFromPoint(x, y)?.closest(selector)), { x, y, selector });
            missed ||= !hit; points.push({ id, x, y });
        }
        if (latencyMs > 0) await this.page.waitForTimeout(latencyMs);
        if (points.length) await this.touch('touchStart', points);
        try { await during(); }
        finally { await this.release(); }
        this.entries.push({ selectors, points, timeMs: Date.now() - this.started, missed });
    }
}
