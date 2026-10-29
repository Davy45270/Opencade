import { Device, browserDevicePort } from './device';
import { Sound, browserAudioFactory } from './sound';
import { browserStorage } from './storage';
export const sound = new Sound(browserAudioFactory(typeof window === 'undefined' ? {} : window), browserStorage());
export const device = new Device(
    typeof document === 'undefined' || typeof navigator === 'undefined' ? {}
        : browserDevicePort(navigator, document.documentElement, typeof screen === 'undefined' ? {} : screen.orientation),
    () => sound.enabled,
);
sound.onEffect = name => { device.effect(name); };
export function setupSound(): void {
    const button = document.querySelector<HTMLButtonElement>('#sound');
    const sync = (): void => {
        button?.setAttribute('aria-pressed', String(sound.enabled));
        if (button) {
            const label = sound.enabled ? 'Son activé' : 'Son coupé';
            button.setAttribute('aria-label', label);
            button.replaceChildren();
            const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.className = 'sound-icon';
            const text = document.createElement('span'); text.className = 'sr-only'; text.textContent = label;
            button.append(icon, text);
        }
    };
    document.addEventListener('pointerdown', () => { void sound.unlock(); });
    document.addEventListener('keydown', () => { void sound.unlock(); });
    button?.addEventListener('click', () => {
        sound.setEnabled(!sound.enabled);
        void sound.unlock();
        sync();
    });
    sync();
}
