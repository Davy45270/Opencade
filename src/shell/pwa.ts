import { registerSW } from 'virtual:pwa-register';
import { clearAppWorker, formatBuild } from './pwa-utils';

const label = formatBuild(__APP_VERSION__, __BUILD_DATE__);
document.querySelectorAll('[data-build]').forEach(node => { node.textContent = label; });
const notice = document.querySelector<HTMLElement>('#pwa-update');
const message = document.querySelector<HTMLElement>('#pwa-message');
const forceButtons = document.querySelectorAll<HTMLButtonElement>('[data-force-update]');
const params = new URLSearchParams(location.search);
const enabled = 'serviceWorker' in navigator && (params.get('test') !== '1' || params.get('pwa') === '1');
let registration: ServiceWorkerRegistration | undefined;
let applying = false;
let checking: Promise<void> | undefined;
const confirmationKey = 'opencade:pwa-update';

function report(text: string): void {
    if (message) message.textContent = text;
    if (notice) notice.hidden = false;
}
function markReload(): void {
    try { sessionStorage.setItem(confirmationKey, '1'); } catch { /* Storage can be unavailable. */ }
}
function canAnnounce(): boolean { return Boolean(registration?.waiting) && !applying; }
async function announce(): Promise<void> {
    if (!canAnnounce() || !registration) return;
    let version = '';
    try {
        const response = await fetch(new URL('version.json', registration.scope), { cache: 'no-store' });
        const data: unknown = await response.json();
        if (response.ok && typeof data === 'object' && data !== null && 'version' in data && typeof data.version === 'string') version = data.version;
    } catch { /* An offline update can still be activated. */ }
    if (!canAnnounce()) return;
    report(`Nouvelle version${version ? ` ${version}` : ''} disponible —`);
    const button = document.querySelector<HTMLButtonElement>('#pwa-apply');
    if (button) button.hidden = false;
}
function check(): Promise<void> {
    if (!registration) return Promise.resolve();
    checking ??= registration.update().then(() => announce()).catch(() => {
        // Automatic checks are silent offline; force-update reports its errors separately.
    }).finally(() => { checking = undefined; });
    return checking;
}
function activate(): void {
    const waiting = registration?.waiting;
    if (!waiting) return;
    applying = true;
    markReload();
    // generateSW handles SKIP_WAITING, then clientsClaim claims existing clients.
    navigator.serviceWorker.addEventListener('controllerchange', () => { location.reload(); }, { once: true });
    waiting.postMessage({ type: 'SKIP_WAITING' });
}
async function force(): Promise<void> {
    if (!registration || applying) return;
    forceButtons.forEach(button => { button.disabled = true; });
    try {
        // A worker already downloaded can be activated even while offline.
        if (canAnnounce()) { activate(); return; }
        try { await registration.update(); } catch (error) {
            if (registration.waiting) { activate(); return; }
            throw error;
        }
        if (registration.installing) {
            const installing = registration.installing;
            await new Promise<void>((resolve, reject) => {
                const timeout = window.setTimeout(() => { installing.removeEventListener('statechange', changed); reject(new Error('Installation trop longue')); }, 30000);
                const changed = (): void => {
                    if (installing.state === 'installed' || installing.state === 'redundant') {
                        clearTimeout(timeout); installing.removeEventListener('statechange', changed); resolve();
                    }
                };
                installing.addEventListener('statechange', changed); changed();
            });
        }
        if (registration.waiting) { activate(); return; }
        await clearAppWorker(registration, caches);
        markReload();
        location.reload();
    } catch {
        report('Mise à jour impossible. Vérifiez votre connexion et réessayez.');
        forceButtons.forEach(button => { button.disabled = false; });
    }
}
if (enabled) {
    registerSW({
        // Our controllerchange listener owns reload and confirmation, including
        // updates initiated by the menu. Suppress the plugin’s parallel reload.
        onNeedReload() { /* Reload only for an explicit activation below. */ },
        onRegisteredSW(_url, value) {
            if (!value) return;
            registration = value;
            forceButtons.forEach(button => { button.hidden = false; });
            void check();
            window.setInterval(() => { void check(); }, 30 * 60 * 1000);
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') void check(); });
            try {
                if (sessionStorage.getItem(confirmationKey)) {
                    sessionStorage.removeItem(confirmationKey);
                    report(`Version obtenue : ${label}`);
                }
            } catch { /* Confirmation is optional when storage is blocked. */ }
        },
        onNeedRefresh() { void announce(); },
    });
}
forceButtons.forEach(button => { button.addEventListener('click', () => { void force(); }); });
document.querySelector('#pwa-apply')?.addEventListener('click', activate);
document.querySelector('#pwa-dismiss')?.addEventListener('click', () => {
    if (notice?.contains(document.activeElement)) {
        const target = document.querySelector<HTMLElement>(document.body.classList.contains('playing') ? '#sound' : '#home-menu summary');
        target?.focus();
    }
    if (notice) notice.hidden = true;
});
