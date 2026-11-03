import { replayCollierRecording, type CollierRecording } from '../../scripts/collier-finger-replay.js';
import { test, expect } from './fixture';
import { Finger } from './finger-stepped';
import { driveCollier } from './collier-stepped-driver';
import type { CollierHook } from '../../src/games/collier/scene';

for (const level of [0, 4]) {
    test(`Collier doigt bruité niveau ${String(level + 1)}`, async ({ page, isMobile }, info) => {
        test.skip(!isMobile, 'Parcours tactile CDP uniquement');
        test.setTimeout(240000);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(() => { localStorage.setItem('arcade-lab:character:v1', 'panda'); });
        await Finger.prepare(page);
        await page.goto('/?test=1#/collier');
        await expect.poll(() => page.evaluate(() => Boolean(window.__COLLIER_TEST__))).toBe(true);
        const cdp = await page.context().newCDPSession(page);
        const finger = await Finger.create(page, cdp, 300);
        const resume = await page.locator('#resume').boundingBox();
        if (!resume) throw new Error('Reprise absente');
        await finger.press(['#resume']);
        const resumeEvents = await page.evaluate(() => window.__COLLIER_TEST__?.fingerReceipts().events);
        if (!resumeEvents) throw new Error('Reçus de reprise absents');
        const transport = new Map(resumeEvents.map(event => [event.sequence, event]));
        await page.evaluate(level => window.__COLLIER_TEST__?.loadLevel(level, 300), level);
        // loadLevel resets manual mode; freeze again before presenting another frame.
        await finger.read();
        const box = await page.locator('#game canvas').boundingBox();
        const geometry = await page.evaluate(() => window.__COLLIER_TEST__?.geometry());
        if (!box || !geometry) throw new Error('Géométrie absente');
        let swaps: number;
        let recording: Parameters<typeof replayCollierRecording>[0] | undefined;
        try {
            swaps = await driveCollier(finger, { readDriver: async () => {
                const observation = await page.evaluate(() => {
                    const hook = window.__COLLIER_TEST__;
                    return hook && { state: hook.readDriver(), events: hook.fingerReceipts().events };
                });
                if (!observation) throw new Error('État absent');
                for (const event of observation.events) transport.set(event.sequence, event);
                return observation.state;
            } }, geometry, box);
        } finally {
            await finger.release();
            await finger.attach({ attach: async (name, attachment) => {
                if (!attachment?.body) throw new Error('Enregistrement absent');
                const body = typeof attachment.body === 'string' ? attachment.body : attachment.body.toString();
                const receipt = JSON.parse(body) as CollierRecording & { final: ReturnType<CollierHook['read']> };
                // Receipts are no longer part of read(): fetch them from their own hook.
                for (const event of (await page.evaluate(() => window.__COLLIER_TEST__?.fingerReceipts().events)) ?? []) transport.set(event.sequence, event);
                recording = { ...receipt, level, box, resume, resumeEvents, geometry,
                    transport: Array.from(transport.values()).sort((a, b) => a.sequence - b.sequence) };
                await info.attach(name, { ...attachment, body: JSON.stringify(recording, null, 2) });
            } }, `collier-finger-${String(level + 1)}.json`);
        }
        if (!recording) throw new Error('Enregistrement absent');
        const replay = replayCollierRecording(recording);
        expect(recording.fingerprint, 'Empreinte identique au rejeu Node du même pilote').toBe(replay.fingerprint);
        expect(swaps).toBeGreaterThan(0);
        expect(finger.entries.filter(entry => entry.missed)).toEqual([]);
        expect((await finger.read()).status).toBe('won');
    });
}
