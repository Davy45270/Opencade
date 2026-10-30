import { circuitKey, legacyCircuits } from '../engines/derapage/circuits';
export interface StoragePort { getItem(key: string): string | null; setItem(key: string, value: string): void }
export interface Save { unlocked: number; best: number; circuitRecords?: Record<string, number> }
export const SAVE_KEY = 'arcade-lab:bubble:v1';
export const SOUND_KEY = 'arcade-lab:sound:v1';
export function browserStorage(): StoragePort | undefined {
    try { return window.localStorage; } catch { return undefined; }
}
export function readValue(storage: StoragePort | undefined, key: string, legacy?: string): string | null {
    try {
        const current = storage?.getItem(key);
        if (current != null) return current;
        const previous = legacy ? storage?.getItem(legacy) : null;
        if (previous != null) writeValue(storage, key, previous);
        return previous ?? null;
    } catch { return null; }
}
export function writeValue(storage: StoragePort | undefined, key: string, value: string): void {
    try { storage?.setItem(key, value); } catch { /* Persistence is optional. */ }
}
export function readSave(storage?: StoragePort, id = 'bubble', count = 10): Save {
    try {
        const value: unknown = JSON.parse(readValue(storage, `arcade-lab:${id}:v1`, id === 'bubble' ? 'bubble-lab:v1' : undefined) ?? 'null');
        if (typeof value === 'object' && value !== null) {
            const { unlocked, best } = value as Record<string, unknown>;
            if (typeof unlocked === 'number' && Number.isInteger(unlocked) && unlocked >= 1 && unlocked <= count && typeof best === 'number' && Number.isSafeInteger(best) && best >= 0) {
                const records = (value as Record<string, unknown>).circuitRecords;
                const circuitRecords: Record<string, number> = {};
                if (typeof records === 'object' && records !== null)
                    for (const [key, time] of Object.entries(records))
                        if ((id === 'derapage' || /^(?:[0-9]|[12][0-9])$/.test(key)) && typeof time === 'number' && Number.isFinite(time) && time > 0) {
                            const name = id === 'derapage' && /^(?:[0-9]|[12][0-9])$/.test(key) ? legacyCircuits[Number(key)]?.name : key;
                            if (name && (id !== 'derapage' || legacyCircuits.some(c => c.name === name)))
                                circuitRecords[name] = Math.min(circuitRecords[name] ?? Infinity, time);
                        }
                return records === undefined ? { unlocked, best } : { unlocked, best, circuitRecords };
            }
        }
    } catch { /* Invalid JSON. */ }
    return { unlocked: 1, best: 0 };
}
export function writeSave(storage: StoragePort | undefined, save: Save, id = 'bubble'): void {
    try { writeValue(storage, `arcade-lab:${id}:v1`, JSON.stringify(save)); } catch { /* Persistence is optional. */ }
}

/** Returns true only for a strictly improved, valid lap; persists at the crossing. */
export function recordCircuitLap(storage: StoragePort | undefined, save: Save, circuit: number, ms: number): boolean {
    if (!Number.isInteger(circuit) || circuit < 0 || circuit > 29 || !Number.isFinite(ms) || ms <= 0) return false;
    const previous = save.circuitRecords?.[circuitKey(circuit)];
    if (previous !== undefined && ms >= previous) return false;
    save.circuitRecords = { ...save.circuitRecords, [circuitKey(circuit)]: ms };
    writeSave(storage, save, 'derapage');
    return true;
}
