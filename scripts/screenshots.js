/* global console, process, document, window, localStorage, Image, Buffer, setTimeout, fetch */
// README screenshots: the home screen (phone portrait and desktop) and one in-play view per game.
// Not part of CI. Run after `npm run build`, with Playwright's Chromium available:
//   node scripts/screenshots.js [output-dir]        (default: docs/screenshots)
// BASE_URL=http://127.0.0.1:4173 reuses a running preview server instead of starting one.
// Determinism: fixed level seed, fixed character per game, reduced motion, sound off,
// simulated time through each game's test hook, then a wait for two identical frames.
// Images are encoded to WebP by Chromium itself, so no image tool is required.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const out = process.argv[2] ?? 'docs/screenshots';
const SEED = 28;
const MAX_BYTES = 150 * 1024, TOTAL_BYTES = 2 * 1024 * 1024;
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };
const desktop = { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 };
// [game id, level index, simulated milliseconds of play, character]
const shots = [
    ['bubble', 4, 0, 'panda'],
    ['serpentin', 9, 1500, 'pandaroux'],
    ['briqueterie', 12, 1800, 'dragon'],
    ['empilo', 3, 4000, 'singe'],
    ['orbite', 4, 2500, 'licorne'],
    ['essaim', 3, 3000, 'panda'],
    ['dedale', 2, 1500, 'pandaroux'],
    ['ferraille', 4, 3000, 'dragon'],
    ['alunir', 2, 1500, 'singe'],
    ['caisses', 3, 0, 'licorne'],
    ['traverse', 3, 2000, 'panda'],
    ['derapage', 1, 6000, 'pandaroux'],
];

async function startServer() {
    if (process.env.BASE_URL) return { url: process.env.BASE_URL, stop: () => undefined };
    const child = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], { stdio: 'ignore' });
    const url = 'http://127.0.0.1:4173';
    for (let i = 0; i < 60; i++) {
        try { if ((await fetch(url)).ok) return { url, stop: () => child.kill() }; } catch { /* not up yet */ }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    child.kill(); throw new Error('Preview server did not start');
}

/** Screenshot until two consecutive frames are identical (or fail after a few seconds). */
async function stable(page) {
    let previous = await page.screenshot();
    for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(250);
        const next = await page.screenshot();
        if (next.equals(previous)) return next;
        previous = next;
    }
    throw new Error('Image never settled');
}

/** Encode a PNG to WebP in the page's Chromium, lowering quality until it fits the budget. */
async function webp(page, png) {
    for (const quality of [0.82, 0.74, 0.66, 0.58, 0.5]) {
        const data = await page.evaluate(async ({ src, quality }) => {
            const image = new Image(); image.src = src; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
            canvas.getContext('2d').drawImage(image, 0, 0);
            return canvas.toDataURL('image/webp', quality).split(',')[1];
        }, { src: `data:image/png;base64,${png.toString('base64')}`, quality });
        const bytes = Buffer.from(data, 'base64');
        if (bytes.length <= MAX_BYTES) return bytes;
    }
    throw new Error('Cannot fit the image under 150 KB');
}

async function context(browser, options, character) {
    const ctx = await browser.newContext({ ...options, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await ctx.addInitScript(character => {
        localStorage.setItem('arcade-lab:sound:v1', 'off');
        localStorage.setItem('arcade-lab:character:v1', character);
    }, character);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    return { ctx, page, errors };
}

const server = await startServer();
const browser = await chromium.launch();
const failures = [];
mkdirSync(out, { recursive: true });
const written = [];
async function save(page, errors, name, png) {
    if (errors.length) throw new Error(`${name}: ${errors.join(' | ')}`);
    const bytes = await webp(page, png);
    writeFileSync(join(out, `${name}.webp`), bytes);
    written.push([name, bytes.length]);
    console.log(`${name}.webp ${(bytes.length / 1024).toFixed(1)} KB`);
}
try {
    // Games registered after this list was written still get a capture, with default settings.
    {
        const { ctx, page } = await context(browser, phone, 'panda');
        await page.goto(`${server.url}/?test=1#/`);
        await page.waitForFunction(() => Boolean(window.__ARCADE_TEST__));
        const ids = await page.evaluate(() => Object.keys(window.__ARCADE_TEST__.games));
        const cast = ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'];
        for (const id of ids) if (!shots.some(([known]) => known === id)) {
            console.log(`${id}: not in the list, default settings (level 3, 1500 ms)`);
            shots.push([id, 2, 1500, cast[shots.length % cast.length]]);
        }
        await ctx.close();
    }
    for (const [name, options] of [['home-phone', phone], ['home-desktop', desktop]]) {
        const { ctx, page, errors } = await context(browser, options, 'panda');
        await page.goto(`${server.url}/?test=1#/`);
        await page.locator('.game-card').nth(11).waitFor();
        await save(page, errors, name, await stable(page));
        await ctx.close();
    }
    for (const [id, level, ms, character] of shots) {
        const { ctx, page, errors } = await context(browser, phone, character);
        try {
            await page.goto(`${server.url}/?test=1#/${id}`);
            await page.waitForFunction(id => Boolean(window.__ARCADE_TEST__?.games[id]), id);
            const resume = page.locator('#resume');
            if (await resume.isVisible()) await resume.click();
            // Nobody steers, so a run may end early: replay the same seed and stop 400 ms before the end.
            const played = await page.evaluate(({ id, level, seed, ms }) => {
                const game = window.__ARCADE_TEST__.games[id];
                const run = limit => {
                    game.loadLevel(level, seed);
                    let t = 0;
                    for (; t < limit; t += 50) {
                        game.advance(50);
                        if (['won', 'lost'].includes(game.read().status)) return t;
                    }
                    return t;
                };
                if (ms === 0) { game.loadLevel(level, seed); return { t: 0, status: game.read().status }; }
                const end = run(ms);
                if (end < ms) run(Math.max(0, end - 400));
                return { t: end < ms ? Math.max(0, end - 400) : ms, status: game.read().status };
            }, { id, level, seed: SEED, ms });
            if (['won', 'lost'].includes(played.status)) throw new Error(`${id}: the scene is not in play (${String(played.status)})`);
            console.log(`${id}: level ${String(level + 1)}, ${String(played.t)} ms of play`);
            await save(page, errors, `game-${id}`, await stable(page));
        } catch (error) { failures.push(`${id}: ${error.message}`); console.error(`FAILED ${id}: ${error.message}`); }
        await ctx.close();
    }
} finally {
    await browser.close();
    server.stop();
}
const total = written.reduce((sum, [, bytes]) => sum + bytes, 0);
console.log(`total ${(total / 1024).toFixed(1)} KB for ${String(written.length)} images`);
if (total > TOTAL_BYTES) failures.push('total exceeds 2 MB');
if (failures.length) { console.error(`${String(failures.length)} failure(s)`); process.exit(1); }
