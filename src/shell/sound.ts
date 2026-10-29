import { readValue, writeValue, SOUND_KEY } from './storage';
export { SOUND_KEY } from './storage';
export interface Tone { frequency: number; duration: number; type: OscillatorType }
export type SoundEffects = Record<string, (size: number) => Tone>;
export interface SoundStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
}
export type AudioFactory = () => AudioContext;

/** Optional presentation service: every browser audio/storage failure is silent. */
export class Sound {
    enabled = true;
    private context?: AudioContext;
    private unlocked = false;
    private ready = false;
    constructor(private factory?: AudioFactory, private storage?: SoundStorage) {
        this.enabled = readValue(storage, SOUND_KEY, 'bubble-lab:sound:v1') !== 'off';
    }
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
        writeValue(this.storage, SOUND_KEY, enabled ? 'on' : 'off');
        if (!enabled && this.context) {
            // Silence envelopes already scheduled, without suspending the context.
            for (const gain of this.active) {
                try { gain.gain.cancelScheduledValues(this.context.currentTime); gain.gain.setValueAtTime(0, this.context.currentTime); } catch { /* Optional audio. */ }
            }
        }
    }
    private active = new Set<GainNode>();
    async unlock(): Promise<void> {
        this.unlocked = true;
        if (!this.enabled || !this.factory) return;
        try {
            this.context ??= this.factory();
            await this.context.resume();
            this.ready = true;
        } catch { this.ready = false; }
    }
    effects: SoundEffects = {};
    onEffect?: (name: string) => void;
    stop(): void {
        for (const gain of this.active) {
            try { gain.disconnect(); } catch { /* Optional audio. */ }
        }
        this.active.clear();
    }
    playEffect(name: string, size = 1): void {
        if (this.enabled) this.onEffect?.(name);
        if (!this.enabled || !this.unlocked || !this.ready) return;
        const tone = this.effects[name]?.(size);
        if (tone) this.tone(tone.frequency, tone.duration, tone.type);
    }
    private tone(frequency: number, duration: number, type: OscillatorType): void {
        const context = this.context;
        if (!context) return;
        let oscillator: OscillatorNode | undefined;
        let gain: GainNode | undefined;
        try {
            oscillator = context.createOscillator();
            gain = context.createGain();
            const now = context.currentTime;
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, now);
            oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.55, now + duration);
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.005);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            oscillator.connect(gain);
            gain.connect(context.destination);
            const voice = gain;
            const source = oscillator;
            this.active.add(voice);
            oscillator.onended = () => {
                this.active.delete(voice);
                try { source.disconnect(); voice.disconnect(); } catch { /* Optional audio. */ }
            };
            oscillator.start(now);
            oscillator.stop(now + duration);
        } catch {
            if (gain) this.active.delete(gain);
            try { oscillator?.disconnect(); gain?.disconnect(); } catch { /* Optional audio. */ }
        }
    }
}

export function browserAudioFactory(host: { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }): AudioFactory | undefined {
    try {
        const Constructor = host.AudioContext ?? host.webkitAudioContext;
        return Constructor ? () => new Constructor() : undefined;
    } catch { return undefined; }
}
