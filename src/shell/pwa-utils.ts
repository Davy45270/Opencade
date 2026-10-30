/** UTC build instant displayed in the user's local timezone. */
export function formatBuild(version: string, instant: string, timeZone?: string): string {
    const parts = new Intl.DateTimeFormat('sv-SE', {
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
        hourCycle: 'h23', ...(timeZone ? { timeZone } : {}),
    }).format(new Date(instant));
    return `Opencade ${version} · ${parts}`;
}

// Workbox generateSW cacheId is used as the cache-name prefix.
export function isAppCache(name: string): boolean { return name.startsWith('opencade-'); }

export async function clearAppWorker(registration: Pick<ServiceWorkerRegistration, 'unregister'>, cacheStorage: Pick<CacheStorage, 'keys' | 'delete'>): Promise<void> {
    await registration.unregister();
    const names = await cacheStorage.keys();
    await Promise.all(names.filter(isAppCache).map(name => cacheStorage.delete(name)));
}
