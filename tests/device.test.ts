import { it, expect, vi } from 'vitest';
import { Device, browserDevicePort, type WakeSentinel } from '../src/shell/device';
const flush = async (): Promise<void> => { await Promise.resolve(); await Promise.resolve(); };
it('T01 demande et libère en pause, fin, sortie et arrière-plan puis reprend', async () => {
    const release = vi.fn(async () => {});
    const requestWake = vi.fn(() => Promise.resolve({ release }));
    const device = new Device({ requestWake });
    expect(requestWake).not.toHaveBeenCalled();
    for (const reason of ['pause', 'fin', 'sortie', 'arrière-plan']) {
        device.setFinished(false); device.setVisible(true); device.setPlaying(true); await flush();
        expect(requestWake).toHaveBeenCalledTimes(['pause', 'fin', 'sortie', 'arrière-plan'].indexOf(reason) + 1);
        if (reason === 'fin') device.setFinished(true);
        else if (reason === 'arrière-plan') device.setVisible(false);
        else device.setPlaying(false);
        await flush();
        expect(release).toHaveBeenCalledTimes(['pause', 'fin', 'sortie', 'arrière-plan'].indexOf(reason) + 1);
    }
});
it('T01 libère aussi une demande accordée après la pause sans doubler les demandes', async () => {
    let grant: ((sentinel: WakeSentinel) => void) | undefined;
    const release = vi.fn(async () => {});
    const requestWake = vi.fn(() => new Promise<WakeSentinel>(resolve => { grant = resolve; }));
    const device = new Device({ requestWake });
    device.setPlaying(true); device.setPlaying(true); device.setPlaying(false);
    grant?.({ release }); await flush();
    expect(requestWake).toHaveBeenCalledTimes(1); expect(release).toHaveBeenCalledTimes(1);
});
it('T02 vie 30 ms, victoire et défaite courtes, silence si son coupé', () => {
    let enabled = true;
    const vibrate = vi.fn();
    const device = new Device({ vibrate }, () => enabled);
    for (const name of ['life', 'won', 'lost', 'fire']) device.effect(name);
    expect(vibrate.mock.calls).toEqual([[30], [[30, 40, 60]], [[60, 40, 60]]]);
    enabled = false;
    for (const name of ['life', 'won', 'lost']) device.effect(name);
    expect(vibrate).toHaveBeenCalledTimes(3);
});
it('T03 plein écran puis portrait, refus portrait absorbé', async () => {
    const calls: string[] = [];
    const device = new Device({ fullscreen: async () => { await Promise.resolve(); calls.push('fullscreen'); }, portrait: async () => { await Promise.resolve(); calls.push('portrait'); throw Error('refus'); } });
    expect(device.fullscreenAvailable).toBe(true); await device.fullscreen();
    expect(calls).toEqual(['fullscreen', 'portrait']);
});
it('T07 API absentes, exceptions synchrones et rejets restent silencieux', async () => {
    const portrait = vi.fn();
    for (const port of [{}, {
        requestWake: () => Promise.reject(Error('refus')),
        vibrate: () => { throw Error('refus'); },
        fullscreen: () => Promise.reject(Error('refus')), portrait,
    }, {
        requestWake: () => { throw Error('refus'); },
        vibrate: () => Promise.reject(Error('refus')),
        fullscreen: () => { throw Error('refus'); }, portrait,
    }]) {
        const device = new Device(port);
        device.setPlaying(true); device.effect('life'); await device.fullscreen(); await flush();
        device.setPlaying(false);
        expect(device.fullscreenAvailable).toBe(Boolean(port.fullscreen));
    }
    expect(portrait).not.toHaveBeenCalled();
    expect(browserDevicePort({}, {}, {})).toEqual({});
});
it('T07 refus de libération absorbé', async () => {
    const release = vi.fn(() => Promise.reject(Error('refus')));
    const device = new Device({ requestWake: () => Promise.resolve({ release }) });
    device.setPlaying(true); await flush(); device.setPlaying(false); await flush();
    expect(release).toHaveBeenCalledTimes(1);
});

it('T01 T03 adaptateur navigateur : écran demandé et receveurs conservés', async () => {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    const nav = { wakeLock: { request }, vibrate: vi.fn(() => true) };
    const fullscreen = vi.fn(() => Promise.resolve());
    const portrait = vi.fn(() => Promise.resolve());
    const device = new Device(browserDevicePort(nav, { requestFullscreen: fullscreen }, { lock: portrait }));
    device.setPlaying(true); await flush(); device.effect('life'); await device.fullscreen();
    expect(request).toHaveBeenCalledWith('screen'); expect(nav.vibrate).toHaveBeenCalledWith(30);
    expect(fullscreen).toHaveBeenCalledTimes(1); expect(portrait).toHaveBeenCalledWith('portrait');
    device.setPlaying(false); await flush(); expect(release).toHaveBeenCalledTimes(1);
});
