import { setupCharacters } from '../src/characters/panel';
import { Inputs } from '../src/shell/input';
import { characters, ids } from '../src/characters/model';

/** Small event/DOM port: exercises the real panel without a browser or raster assets. */
export function panelLifecycle(setup = setupCharacters, legacyMedia = false): void {
    const check = (value: boolean, message: string): void => { if (!value) throw new Error(message); };
    class Element extends EventTarget {
        id = ''; textContent = ''; className = ''; hidden = false; open = false;
        width = 0; height = 0; parent?: Element;
        dataset: Record<string, string> = {};
        style = { width: '', height: '', setProperty() {} };
        children: Element[] = [];
        attributes = new Map<string, string>();
        paints: unknown[][] = [];
        context = new Proxy({}, { get: (_, key) => (...args: unknown[]) => { this.paints.push([key, ...args]); }, set: () => true });
        constructor(readonly tag: string) { super(); }
        append(...elements: Element[]): void { for (const e of elements) { e.parent = this; this.children.push(e); } }
        replaceChildren(...elements: Element[]): void { this.children = []; this.append(...elements); }
        setAttribute(key: string, value: string): void { this.attributes.set(key, value); }
        getContext(): object { return this.context; }
        focus(): void {}
        closest(): Element | null { return null; }
        showModal(): void { this.open = true; }
        close(): void { this.open = false; this.dispatchEvent(new Event('close')); }
        remove(): void { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
    }
    const toggle = new Element('button'), body = new Element('body');
    toggle.id = 'character-toggle';
    const doc = Object.assign(new Element('document'), { body, createElement: (tag: string) => new Element(tag), querySelector: () => toggle });
    const mediaEvents = new EventTarget();
    const media = {
        matches: false,
        addEventListener: legacyMedia ? undefined : (type: string, listener: EventListener, options?: AddEventListenerOptions): void => {
            check(!options?.signal, 'C07 media listener works without AbortSignal support');
            mediaEvents.addEventListener(type, listener);
        },
        removeEventListener: (type: string, listener: EventListener): void => { mediaEvents.removeEventListener(type, listener); },
        addListener: (listener: EventListener): void => { mediaEvents.addEventListener('change', listener); },
        removeListener: (listener: EventListener): void => { mediaEvents.removeEventListener('change', listener); },
        dispatchEvent: (event: Event): boolean => mediaEvents.dispatchEvent(event),
    };
    let next = 0;
    const frames = new Map<number, FrameRequestCallback>();
    const globals: Record<string, unknown> = {
        document: doc, window: { devicePixelRatio: 1 }, matchMedia: () => media,
        requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; },
        cancelAnimationFrame: (id: number) => { frames.delete(id); },
    };
    const originals = Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
    const inputs = new Inputs();
    const tick = (time: number): void => { const batch = [...frames.values()]; frames.clear(); for (const callback of batch) callback(time); };
    try {
        for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { value, configurable: true });
        setup(inputs, true);
        check(!toggle.hidden && frames.size === 0, 'C07 home starts without animation');
        toggle.dispatchEvent(new Event('click'));
        const dialog = body.children[0];
        const grid = dialog?.children.find(c => c.className === 'character-grid');
        check(!!dialog?.open && frames.size === 1, 'C07 opening starts exactly one frame loop');
        check(grid?.children.length === 5, 'C08 all five character cards rendered');
        for (const id of ids) {
            const card = grid?.children.find(c => c.dataset.character === id);
            check(card?.children.find(c => c.tag === 'h3')?.textContent === characters[id].fr, `C08 ${id} official name rendered`);
            for (const text of [characters[id].subtitle, characters[id].motto]) {
                check(card?.children.some(c => c.tag === 'p' && c.textContent === text) === true, `C08 ${id} subtitle/motto rendered`);
            }
            const equipment = card?.children.find(c => c.tag === 'details');
            check(equipment?.children.length === 1, 'Galerie différée');
            // One DOM lifecycle is enough here; the pure art checks cover every identity.
            if (equipment && id === ids[0]) {
                equipment.open = true; equipment.dispatchEvent(new Event('toggle'));
                const figures = equipment.children.flatMap(sheet => sheet.children).filter(child => child.tag === 'figure');
                check(figures.length === 10, `${id} : cinq vues de véhicule et cinq vues de lanceur`);
                check(figures.every(figure => (figure.children[0]?.paints.length ?? 0) > 0), 'Vues réellement dessinées');
                equipment.dispatchEvent(new Event('toggle'));
                check(equipment.children.length === 3, 'Galerie créée une seule fois');
            }
        }
        for (const card of grid?.children ?? []) {
            const preview = card.children[0];
            check(!!preview, 'C07 preview exists');
            if (!preview) continue;
            for (const event of ['pointerenter', 'pointerdown', 'touchstart', 'click', 'focusin']) {
                card.dispatchEvent(new Event('pointerleave'));
                check(preview.dataset.animation === 'repos', 'C07 pointer leave restores rest');
                card.dispatchEvent(new Event(event));
                check(preview.dataset.animation === 'special', `C07 ${event} starts special`);
            }
            card.dispatchEvent(new Event('pointerdown'));
            card.dispatchEvent(new Event('pointerup'));
            card.dispatchEvent(Object.assign(new Event('pointerleave'), { pointerType: 'touch' }));
            check(preview.dataset.animation === 'special', 'C07 touch release keeps special');
            card.dispatchEvent(new Event('pointercancel'));
            check(preview.dataset.animation === 'repos', 'C07 cancellation restores rest');
        }
        const preview = grid?.children[0]?.children[0];
        if (!preview || !dialog) throw new Error('C07 missing panel');
        tick(300); const animatedCount = Number(preview.dataset.paintCount);
        tick(400); check(Number(preview.dataset.paintCount) > animatedCount, 'C07 full motion paints frames');
        media.matches = true; media.dispatchEvent(new Event('change'));
        const reducedCount = preview.dataset.paintCount;
        check(preview.dataset.motion === 'reduce' && frames.size === 0, 'C07 live reduce cancels frame');
        tick(600); check(preview.dataset.paintCount === reducedCount, 'C07 reduced preview stays fixed');
        media.matches = false; media.dispatchEvent(new Event('change'));
        check(preview.dataset.motion === 'full' && frames.size === 1, 'C07 live full motion restarts');
        media.matches = true; tick(700);
        check(preview.dataset.motion === 'reduce' && frames.size === 0, 'C07 missed media event still paints reduce before stopping');
        media.matches = false; media.dispatchEvent(new Event('change'));
        dialog.close(); check(frames.size === 0, 'C07 close cancels frame');
        toggle.dispatchEvent(new Event('click')); check(frames.size === 1, 'C07 reopen restarts');
        doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));
        check(frames.size === 0, 'C07 hidden document cancels frame');
        doc.hidden = false; doc.dispatchEvent(new Event('visibilitychange'));
        check(frames.size === 1, 'C07 visible document restarts');
        inputs.dispose();
        const finalCount = preview.dataset.paintCount;
        check(frames.size === 0 && body.children.length === 0 && toggle.hidden, 'C07 leaving home removes panel and cancels animation');
        tick(1000); media.dispatchEvent(new Event('change')); toggle.dispatchEvent(new Event('click'));
        check(frames.size === 0 && preview.dataset.paintCount === finalCount, 'C07 no listeners or rendering survive shutdown');
    } finally {
        inputs.dispose();
        for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
    }
}
