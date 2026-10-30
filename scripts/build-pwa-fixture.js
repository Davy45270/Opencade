import process from 'node:process';
import { build } from 'vite';
import { mkdir, rm } from 'node:fs/promises';

// Two actual generateSW builds: hashed app assets and the precache differ.
await rm('.pwa-fixtures', { recursive: true, force: true });
await mkdir('.pwa-fixtures', { recursive: true });
for (const [name, version] of [['v1', '0.3.1'], ['v2', '0.3.2']]) {
    process.env.PWA_FIXTURE_VERSION = version;
    await build({ build: { outDir: `.pwa-fixtures/${name}`, emptyOutDir: true } });
}
delete process.env.PWA_FIXTURE_VERSION;
