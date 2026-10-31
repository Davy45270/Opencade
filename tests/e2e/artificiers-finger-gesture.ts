import type { Finger, Touch } from './finger-stepped';

/** One complete shot; button taps must finish before this gesture starts. */
export async function aimShot(finger: Pick<Finger, 'touch' | 'release'>, from: Touch, to: Touch, aimed: () => Promise<void>): Promise<void> {
    await finger.touch('touchStart', [from]);
    await finger.touch('touchMove', [to]);
    await aimed();
    await finger.release();
}
