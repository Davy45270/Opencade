import { defineConfig } from '@playwright/test';
// Typage minimal de process (Node) sans dépendre de @types/node.
declare const process: { env: Record<string, string | undefined> };
const ci = Boolean(process.env.CI);
export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    fullyParallel: false,
    forbidOnly: ci,
    reporter: ci ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium'
    },
    projects: [
        {
            name: 'desktop-chromium',
            testMatch: ['game.spec.ts', 'levels.spec.ts', 'sound.spec.ts', 'arcade.spec.ts', 'serpentin.spec.ts', 'briqueterie.spec.ts', 'empilo.spec.ts', 'orbite.spec.ts', 'essaim.spec.ts', 'dedale.spec.ts', 'ferraille.spec.ts'],
            use: {
                viewport: {
                    width: 1280,
                    height: 900
                }
            }
        },
        {
            name: 'mobile-chromium',
            use: {
                viewport: {
                    width: 390,
                    height: 844
                },
                hasTouch: true,
                isMobile: true
            }
        }
    ],
    webServer: {
        command: 'npm run preview -- --host 127.0.0.1 --port 4173 --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: false
    }
});
