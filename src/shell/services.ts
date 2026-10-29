import { Sound, browserAudioFactory } from './sound';
import { browserStorage } from './storage';
export const sound = new Sound(browserAudioFactory(window), browserStorage());
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
