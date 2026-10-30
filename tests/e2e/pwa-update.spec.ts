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
            await deployment.deployV2({ keepWorker: action === 'fallback' });
            if (action === 'fallback') {
                await page.evaluate(async () => {
                    const reg = await navigator.serviceWorker.ready;
                    await reg.update();
                    if (reg.waiting || reg.installing) throw new Error('Recovery requires v1 alone');
                    // Observe the real API call across the ensuing navigation.
                    const unregister = ServiceWorkerRegistration.prototype.unregister.bind(reg);
                    ServiceWorkerRegistration.prototype.unregister = async function () {
                        const result = await unregister();
                        sessionStorage.setItem('pwa-unregistered', String(result));
                        return result;
                    };
                    await caches.open('opencade-recovery-proof');
                });
                await expect(page.locator('#home footer > [data-build]')).toContainText('Opencade 0.3.1');
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
            if (action === 'fallback') {
                expect(await page.evaluate(() => sessionStorage.getItem('pwa-unregistered'))).toBe('true');
                expect(await page.evaluate(() => caches.has('opencade-recovery-proof'))).toBe(false);
            }
            // Compare every build label with the metadata emitted by this actual build.
            const metadata = await (await page.request.get(`${origin}/version.json`)).json() as { version: string; builtAt: string };
            const label = await page.evaluate(({ version, builtAt }) => {
                const date = new Intl.DateTimeFormat('sv-SE', {
                    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
                }).format(new Date(builtAt));
                return `Opencade ${version} · ${date}`;
            }, metadata);
            await page.locator('#home-menu summary').click();
            await expect(page.locator('#home-menu [data-build]')).toHaveText(label);
            const labels = await page.locator('[data-build]').allTextContents();
            expect(labels.length).toBeGreaterThanOrEqual(3);
            expect(labels.every(value => value === label)).toBe(true);
        } finally {
            await deployment.close();
        }
    });
}
