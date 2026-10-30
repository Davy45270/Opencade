import { URL } from 'node:url';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

export async function startDeployment(root) {
    await mkdir(root, { recursive: true });
    await cp('.pwa-fixtures/v1', root, { recursive: true });
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
    const server = createServer((req, res) => {
        const path = resolve(root, '.' + new URL(req.url ?? '/', 'http://localhost').pathname);
        if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
        void readFile(path === root ? resolve(root, 'index.html') : path).then(bytes => {
            res.writeHead(200, { 'Content-Type': mime[extname(path)] ?? 'text/html', 'Cache-Control': 'no-store' });
            res.end(bytes);
        }).catch(() => { res.writeHead(404).end(); });
    });
    await new Promise(resolve => { server.listen(0, '127.0.0.1', resolve); });
    return {
        origin: `http://127.0.0.1:${server.address().port}`,
        async deployV2({ keepWorker = false } = {}) {
            // Keep the actual v1 worker byte-identical to exercise recovery, not activation.
            const worker = keepWorker ? await readFile(resolve(root, 'sw.js')) : undefined;
            await cp('.pwa-fixtures/v2', root, { recursive: true });
            if (worker) await writeFile(resolve(root, 'sw.js'), worker);
        },
        async close() {
            // A controlled page and its service worker may keep connections open: close them all and
            // do not wait for the 'close' callback, which can outlive the test.
            server.close(); server.closeAllConnections();
            await rm(root, { recursive: true, force: true });
        },
    };
}
