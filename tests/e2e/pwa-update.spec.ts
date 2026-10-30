import { test, expect } from '@playwright/test';
import { startDeployment } from './pwa-server.js';

// Each scenario owns an origin and a live deployment directory. The browser is
// never mocked: v1 controls the page while real v2 files replace the deployment.
for (const action of ['banner', 'force', 'fallback'] as const) {
    test(`PWA deployment v1 → v2 (${action})`, async ({ page }, info) => {
        const root = info.outputPath('deployment');
        const deployment = await startDeployment(root);
        const origin = deployment.origin;
        try {
            await page.goto(`${origin}/?test=1&pwa=1`);
            await expect(page.locator('#home footer > [data-build]')).toContainText('Opencade 0.3.1');
            await page.evaluate(async () => { await navigator.serviceWorker.ready; });
            await page.reload();
            await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
            await page.evaluate(async () => {
                localStorage.setItem('arcade-lab:pwa-proof', 'saved-in-v1');
                await caches.open('foreign-proof');
            });
            // Replace files in the SAME directory; no new origin or registration.
            await deployment.deployV2();
            if (action === 'fallback') {
                // Pre-activate v2 while retaining the v1 document: force then finds
                // no waiting worker, so it must unregister + clear only app caches.
                await page.evaluate(async () => {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.update();
                    await new Promise<void>(resolve => {
                        const timer = setInterval(() => {
                            if (!reg.waiting) return;
                            clearInterval(timer);
                            navigator.serviceWorker.addEventListener('controllerchange', () => { resolve(); }, { once: true });
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }, 20);
                    });
                });
            }
            if (action === 'banner') {
                await page.evaluate(async () => { await (await navigator.serviceWorker.ready).update(); });
                await expect(page.locator('#pwa-update')).toContainText('Nouvelle version 0.3.2 disponible');
                await page.locator('#pwa-apply').click();
            } else {
                await page.locator('#home-menu summary').click();
                await page.locator('#home-menu [data-force-update]').click();
            }
            await expect(page.locator('#home footer > [data-build]')).toContainText('Opencade 0.3.2');
            await expect(page.locator('#pwa-message')).toContainText('Version obtenue : Opencade 0.3.2');
            expect(await page.evaluate(() => localStorage.getItem('arcade-lab:pwa-proof'))).toBe('saved-in-v1');
            expect(await page.evaluate(() => caches.has('foreign-proof'))).toBe(true);
        } finally {
            await deployment.close();
        }
    });
}
