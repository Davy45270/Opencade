import { Sound as ArcadeSound, type AudioFactory, type SoundStorage, type SoundEffects } from '../../shell/sound';
export { browserAudioFactory, SOUND_KEY } from '../../shell/sound';
export const bubbleEffects: SoundEffects = {
    pop: size => ({ frequency: 420 + 35 * Math.min(9, Math.max(0, size - 3)), duration: 0.09, type: 'sine' }),
    fall: () => ({ frequency: 150, duration: 0.16, type: 'triangle' }),
};
/** Compatibility adapter for the original Bubble resolution audio contract. */
export class Sound extends ArcadeSound {
    constructor(factory?: AudioFactory, storage?: SoundStorage) {
        super(factory, storage);
        this.effects = bubbleEffects;
    }
    play(resolution: { popped: unknown[]; fallen: unknown[] }): void {
        if (resolution.popped.length) this.playEffect('pop', resolution.popped.length);
        if (resolution.fallen.length) this.playEffect('fall', resolution.fallen.length);
    }
}
