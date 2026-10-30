import { defineConfig } from '@playwright/test';
// Typage minimal de process (Node) sans dépendre de @types/node.
declare const process: { env: Record<string, string | undefined> };
const ci = Boolean(process.env.CI);
export default defineConfig({
    testDir: 'tests/e2e',
    workers: 1,
    fullyParallel: false,
    // Les scénarios mobiles rendent Phaser en logiciel : sur une machine de 2 cœurs, les plus longs
    // (guidage et victoire d'Orbite, mise en page en 390×600) approchent les 30 s par défaut.
    // Les issues lointaines passent déjà par le crochet advance(ms) ; les attentes d'état restent courtes.
    timeout: 60_000,
    forbidOnly: ci,
    reporter: ci ? [['github'], ['html', { open: 'never' }], ['list']] : 'list',
    use: {
        baseURL: 'http://127.0.0.1:4173',
        browserName: 'chromium'
    },
    projects: [
        {
            name: 'desktop-chromium',
            testMatch: ['collier.spec.ts', 'characters.spec.ts', 'alunir.spec.ts', 'thumbnails.spec.ts', 'offline.spec.ts', 'pwa-update.spec.ts', 'game.spec.ts', 'levels.spec.ts', 'sound.spec.ts', 'arcade.spec.ts', 'serpentin.spec.ts', 'briqueterie.spec.ts', 'empilo.spec.ts', 'orbite.spec.ts', 'essaim.spec.ts', 'dedale.spec.ts', 'ferraille.spec.ts', 'bubble-catalogue.spec.ts'],
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
