import { swipeDirection, joystickDirection, logicalX, holdCount, type Direction } from './gestures';
/** DOM listeners owned by one scene, all released on shutdown. */
export class Inputs {
    private controller = new AbortController();
    on(target: EventTarget | null, type: string, listener: EventListener, options: AddEventListenerOptions = {}): void {
        target?.addEventListener(type, listener, { ...options, signal: this.controller.signal });
    }
    cleanup(callback: () => void): void { this.controller.signal.addEventListener('abort', callback, { once: true }); }
    dispose(): void { this.controller.abort(); }
}
export interface TouchButton {
    id: string;
    label: string;
    ariaLabel: string;
    size: 44 | 56 | 64;
    placement: 'left' | 'center' | 'right';
    mode: 'tap' | 'hold';
    compactMenu?: boolean;
    repeatMs?: number;
    repeatDelayMs?: number;
}
export function renderTouchControls(inputs: Inputs, buttons: readonly TouchButton[], action: (id: string, held: boolean) => void): void {
    const root = document.querySelector('#touch-controls');
    root?.replaceChildren();
    const slots = new Map<string, HTMLElement>();
    for (const placement of ['left', 'center', 'right']) {
        const slot = document.createElement('div'); slot.className = `touch-slot ${placement}`;
        slots.set(placement, slot); root?.append(slot);
    }
    inputs.cleanup(() => { root?.replaceChildren(); });
    for (const spec of buttons) {
        const button = document.createElement('button');
        button.id = spec.id; button.textContent = spec.label;
        button.setAttribute('aria-label', spec.ariaLabel);
        button.style.minWidth = button.style.minHeight = `${String(spec.size)}px`;
        button.style.order = String(['left', 'center', 'right'].indexOf(spec.placement));
        // Secondary commands stay reachable in the menu when six targets cannot fit.
        if (spec.compactMenu) {
            const compact = matchMedia('(width < 380px)');
            const place = (): void => {
                const parent = compact.matches ? document.querySelector('#game-menu') : slots.get(spec.placement);
                parent?.append(button);
                button.classList.toggle('compact-menu-control', compact.matches);
            };
            inputs.on(compact, 'change', place);
            inputs.cleanup(() => { button.remove(); });
            place();
        }
        let pointer: number | null = null;
        let timer: ReturnType<typeof setInterval> | undefined;
        const stop = (): void => {
            if (timer) clearInterval(timer);
            if (pointer !== null && spec.mode === 'hold') action(spec.id, false);
            pointer = null;
        };
        inputs.cleanup(stop);
        inputs.on(button, 'pointerdown', event => {
            if (button.classList.contains('compact-menu-control')) return;
            const e = event as PointerEvent;
            e.preventDefault();
            if (pointer !== null) return;
            pointer = e.pointerId; button.setPointerCapture(e.pointerId);
            action(spec.id, true);
            if (spec.mode === 'hold' && spec.repeatMs) {
                const started = performance.now();
                let count = 0;
                timer = setInterval(() => {
                    const due = holdCount(performance.now() - started, spec.repeatDelayMs ?? 300, spec.repeatMs);
                    while (count < due) { count++; action(spec.id, true); }
                }, Math.min(16, spec.repeatMs));
            }
        });
        for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) inputs.on(button, type, event => {
            if ((event as PointerEvent).pointerId === pointer) stop();
        });
        inputs.on(button, 'click', event => {
            event.preventDefault();
            const inMenu = button.classList.contains('compact-menu-control');
            if (inMenu) document.querySelector<HTMLButtonElement>('#game-menu-toggle')?.click();
            if (inMenu || (event as MouseEvent).detail === 0) { action(spec.id, true); if (spec.mode === 'hold') action(spec.id, false); }
        });
        if (!spec.compactMenu) slots.get(spec.placement)?.append(button);
    }
    inputs.on(document.querySelector('#play-area'), 'touchmove', event => { event.preventDefault(); }, { passive: false });
    inputs.on(document.querySelector('#game'), 'pointerdown', event => {
        if ((event as PointerEvent).pointerType === 'touch') document.body.classList.add('touch');
    });
}

export function directionalSwipe(inputs: Inputs, area: HTMLElement, emit: (direction: Direction) => void, threshold = 30, repeat = false): void {
    trackPointer(inputs, area, (x, y, start) => {
        const direction = swipeDirection(x - start.x, y - start.y, threshold);
        if (!direction || start.done) return;
        emit(direction);
        if (repeat) { start.x = x; start.y = y; } else start.done = true;
    });
}
interface Origin { x: number; y: number; done: boolean }
function trackPointer(inputs: Inputs, area: HTMLElement, move: (x: number, y: number, origin: Origin) => void, end = (): void => {}, begin = false): void {
    let active: number | null = null;
    let origin: Origin = { x: 0, y: 0, done: false };
    inputs.on(area, 'pointerdown', event => {
        const e = event as PointerEvent;
        if (active !== null) return;
        e.preventDefault(); active = e.pointerId; area.setPointerCapture(active);
        origin = { x: e.clientX, y: e.clientY, done: false };
        if (begin) move(e.clientX, e.clientY, origin);
    });
    inputs.on(area, 'pointermove', event => {
        const e = event as PointerEvent;
        if (e.pointerId === active) { e.preventDefault(); move(e.clientX, e.clientY, origin); }
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) inputs.on(area, type, event => {
        if ((event as PointerEvent).pointerId === active) { active = null; end(); }
    });
    inputs.cleanup(end);
}
export function horizontalDrag(inputs: Inputs, area: HTMLElement, width: number, emit: (x: number) => void, offset = 0): void {
    trackPointer(inputs, area, x => {
        const rect = area.getBoundingClientRect();
        emit(logicalX(x, rect.left, rect.width, width, offset));
    }, undefined, true);
}
export function virtualJoystick(inputs: Inputs, parent: HTMLElement, emit: (direction: number | null) => void, diameter = 120): void {
    const stick = document.createElement('div');
    stick.className = 'joystick'; stick.setAttribute('aria-label', 'Joystick directionnel');
    stick.style.width = stick.style.height = `${String(Math.max(120, diameter))}px`;
    parent.append(stick);
    trackPointer(inputs, stick, (x, y) => {
        const rect = stick.getBoundingClientRect();
        emit(joystickDirection(x - rect.left - rect.width / 2, y - rect.top - rect.height / 2));
    }, () => { emit(null); }, true);
    inputs.cleanup(() => { stick.remove(); });
}

export function keyboardControls(inputs: Inputs, aim: (delta: number) => void, shoot: () => void): void {
    inputs.on(document, 'keydown', event => {
        if (!(event instanceof KeyboardEvent)) return;
        if (event.target instanceof HTMLElement && event.target.closest('button')) return;
        if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
        if (event.code === 'ArrowLeft') aim(-0.08);
        if (event.code === 'ArrowRight') aim(0.08);
        if (event.code === 'Space') shoot();
    });
}
