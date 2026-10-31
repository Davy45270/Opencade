import { test, expect } from './fixture';
import process from 'node:process';
import { performanceMetrics } from './finger-stepped';

const games = ['caisses', 'traverse', 'alunir', 'bubble', 'serpentin', 'dedale', 'orbite', 'empilo', 'ferraille', 'essaim', 'briqueterie', 'derapage'] as const;
for (const game of games) test(`performance ${game} : 5 s réelles`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.goto(`/?test=1#/${game}`);
    await expect.poll(() => page.evaluate(id => Boolean(window.__ARCADE_TEST__?.games[id]), game)).toBe(true);
    if (game !== 'bubble' && game !== 'caisses') await page.locator('#resume').tap();
    const measurement = await page.evaluate(async id => {
        const hook = window.__ARCADE_TEST__?.games[id] as { performance(): { frames: number; gameMs: number }; read(): { status: string } } | undefined;
        if (!hook) throw new Error('Mesure de performance absente');
        const canvas = document.querySelector<HTMLCanvasElement>('#game canvas');
        const probe = document.createElement('canvas');
        const available = Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'));
        const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
        let renderer: string | null = null;
        if (gl) {
            try {
                const extension = gl.getExtension('WEBGL_debug_renderer_info');
                if (extension) renderer = String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL));
            } catch { renderer = null; }
        }
        const before = hook.performance(), start = performance.now();
        // This is intentionally the only real-time test: never call advance here.
        await new Promise(resolve => setTimeout(resolve, 5000));
        const after = hook.performance(), realMs = performance.now() - start;
        const gameMs = after.gameMs - before.gameMs;
        return {
            game: id, clock: 'realtime', realMs, gameMs, renderedFrames: after.frames - before.frames,
            gameTimeSource: id === 'bubble' || id === 'caisses' || id === 'empilo' ? 'scene animation (unpaused game time)' : 'simulation',
            finalStatus: hook.read().status,
            machine: { hardwareConcurrency: navigator.hardwareConcurrency, userAgent: navigator.userAgent },
            rendering: { webglAvailable: available, renderer, mode: renderer && /SwiftShader|llvmpipe|softpipe|software/i.test(renderer) ? 'logiciel' : gl ? 'WebGL' : 'Canvas' },
        };
    }, game);
    const report = { ...measurement, ...performanceMetrics(measurement.renderedFrames, measurement.gameMs, measurement.realMs) };
    await info.attach(`perf-${game}.json`, { body: JSON.stringify(report, null, 2), contentType: 'application/json' });
    if (report.warning) await info.attach(`perf-${game}-avertissement.txt`, { body: report.warning, contentType: 'text/plain' });
    if (process.env.PERF === '1') expect(report.fps, report.warning ?? game).toBeGreaterThanOrEqual(30);
});
