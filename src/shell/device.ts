/** Optional browser capabilities, injected so refusals and races can be tested. */
export interface WakeSentinel { release(): Promise<void>; released?: boolean }
export interface DevicePort {
    requestWake?: () => Promise<WakeSentinel>;
    vibrate?: (pattern: number | number[]) => unknown;
    fullscreen?: () => Promise<void>;
    portrait?: () => Promise<void>;
}
export class Device {
    private playing = false;
    private finished = false;
    private visible = true;
    private sentinel?: WakeSentinel;
    private pending = false;
    constructor(private port: DevicePort = {}, private enabled = (): boolean => true) {}
    get fullscreenAvailable(): boolean { return Boolean(this.port.fullscreen); }
    setPlaying(value: boolean): void { if (this.playing === value) return; this.playing = value; void this.sync(); }
    setFinished(value: boolean): void { if (this.finished === value) return; this.finished = value; void this.sync(); }
    setVisible(value: boolean): void { if (this.visible === value) return; this.visible = value; void this.sync(); }
    private wanted(): boolean { return this.playing && !this.finished && this.visible; }
    private async release(sentinel: WakeSentinel): Promise<void> {
        try { await sentinel.release(); } catch { /* Optional capability. */ }
    }
    private async sync(): Promise<void> {
        if (!this.wanted()) {
            const old = this.sentinel; this.sentinel = undefined;
            if (old) await this.release(old);
            return;
        }
        if (this.pending || (this.sentinel && !this.sentinel.released) || !this.port.requestWake) return;
        this.pending = true;
        try {
            const sentinel = await this.port.requestWake();
            if (this.wanted()) this.sentinel = sentinel;
            else await this.release(sentinel);
        } catch { /* Optional capability. */ }
        finally { this.pending = false; }
    }
    effect(name: string): void {
        try {
            if (!this.enabled()) return;
            const pattern = name === 'life' ? 30 : name === 'won' ? [30, 40, 60] : name === 'lost' ? [60, 40, 60] : undefined;
            if (pattern !== undefined) void Promise.resolve(this.port.vibrate?.(pattern)).catch(() => {});
        } catch { /* Optional capability. */ }
    }
    async fullscreen(): Promise<void> {
        try { if (!this.port.fullscreen) return; await this.port.fullscreen(); }
        catch { return; }
        try { await this.port.portrait?.(); } catch { /* Optional capability. */ }
    }
}
export interface BrowserDeviceHost {
    wakeLock?: { request(type: 'screen'): Promise<WakeSentinel> };
    vibrate?: (pattern: number | number[]) => boolean;
}
export function browserDevicePort(nav: BrowserDeviceHost, root: { requestFullscreen?: () => Promise<void> }, orientation: { lock?: (value: 'portrait') => Promise<void> }): DevicePort {
    const port: DevicePort = {};
    try { const wake = nav.wakeLock; if (wake) port.requestWake = () => wake.request('screen'); } catch { /* Optional capability. */ }
    try { if (nav.vibrate) port.vibrate = pattern => nav.vibrate?.(pattern); } catch { /* Optional capability. */ }
    try { if (root.requestFullscreen) port.fullscreen = async () => { await root.requestFullscreen?.(); }; } catch { /* Optional capability. */ }
    try { if (orientation.lock) port.portrait = async () => { await orientation.lock?.('portrait'); }; } catch { /* Optional capability. */ }
    return port;
}
