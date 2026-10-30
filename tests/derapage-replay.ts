import { Engine } from '../src/engines/derapage/engine';

// Tag numbers and strings separately so signed zero and non-finite values stay
// distinct, without collisions with strings or undefined properties.
function exactValue(_key: string, value: unknown): unknown {
    if (typeof value === 'number') return `number:${Object.is(value, -0) ? '-0' : String(value)}`;
    if (typeof value === 'string') return `string:${value}`;
    if (value === undefined) return 'undefined:';
    return value;
}

// Snapshots contain plain objects and arrays. Preserve keys, prototypes and every
// leaf (including signed zero and NaN), independently of the compact encoding.
function sameSnapshot(a: unknown, b: unknown): boolean {
    if (Object.is(a, b)) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
    const keys = Reflect.ownKeys(a);
    return keys.length === Reflect.ownKeys(b).length
        && keys.every(key => Object.hasOwn(b, key)
            && sameSnapshot(Reflect.get(a, key), Reflect.get(b, key)));
}
export function replayState(e: Engine): string {
    return JSON.stringify({ ...e.snapshot(false), track: undefined }, exactValue);
}

export function sameReplayStep(a: Engine, b: Engine, frame: number, last: boolean): boolean {
    return replayState(a) === replayState(b)
        && (!(frame % 60 === 0 || last) || sameSnapshot(a.snapshot(), b.snapshot()));
}

export function checkReplayComparison(check: (ok: boolean, message: string) => void): void {
    const a = new Engine(), b = new Engine();
    check(sameSnapshot(a.snapshot(false), a.snapshot()), 'projection et snapshot complet strictement identiques');
    check(sameReplayStep(a, b, 1, false), 'états initiaux identiques');
    const changes: [string, (e: Engine) => void][] = [
        ['cap', e => { if (e.karts[0]) e.karts[0].angle += 1e-9; }],
        ['score', e => { e.score++; }],
        ['status', e => { e.status = 'lost'; }],
        ['position IA x', e => { if (e.karts[1]) e.karts[1].x += 1e-9; }],
        ['position IA y', e => { if (e.karts[1]) e.karts[1].y += 1e-9; }],
        ['vitesse IA vx', e => { if (e.karts[1]) e.karts[1].vx += 1e-9; }],
        ['vitesse IA vy', e => { if (e.karts[1]) e.karts[1].vy += 1e-9; }],
        ['random', e => { const snapshot = e.snapshot.bind(e); e.snapshot = (clone?: boolean) => { const value = snapshot(clone); return { ...value, random: value.random + 1 }; }; }],
        ['time', e => { e.time += 1e-9; }],
    ];
    for (const [name, change] of changes) {
        const altered = new Engine();
        change(altered);
        check(!sameReplayStep(a, altered, 1, false), `${name} exact entre deux snapshots complets`);
    }
    for (const value of [0, -0, NaN, Infinity, -Infinity]) {
        const equalA = new Engine(), equalB = new Engine();
        if (!equalA.karts[0] || !equalB.karts[0]) throw new Error('kart absent');
        equalA.karts[0].vx = value; equalB.karts[0].vx = value;
        check(sameReplayStep(equalA, equalB, 60, true), 'nombres spéciaux identiques acceptés');
    }
    for (const [left, right] of [[0, -0], [NaN, Infinity], [Infinity, -Infinity], [NaN, -Infinity]]) {
        if (!a.karts[0] || !b.karts[0]) throw new Error('kart absent');
        a.karts[0].vx = left ?? 0; b.karts[0].vx = right ?? 0;
        check(!sameReplayStep(a, b, 1, false), 'nombres spéciaux distingués dans la comparaison compacte');
        // Put the divergent leaf only in the circuit: the compact path is equal,
        // so these checks must exercise the independent full comparison.
        a.karts[0].vx = 0; b.karts[0].vx = 0;
        if (!a.track.points[0] || !b.track.points[0]) throw new Error('point absent');
        a.track.points[0].x = left ?? 0; b.track.points[0].x = right ?? 0;
        check(!sameReplayStep(a, b, 60, false), 'nombres spéciaux distingués au contrôle périodique');
        check(!sameReplayStep(a, b, 1, true), 'nombres spéciaux distingués au contrôle final');
    }
    const periodicA = new Engine(), periodicB = new Engine();
    for (let frame = 0; frame <= 240; frame++) {
        if (frame === 180) {
            const point = periodicB.track.points[0];
            if (!point) throw new Error('point absent');
            point.x += 1e-9;
        }
        check(sameReplayStep(periodicA, periodicB, frame, false) === !(frame >= 180 && frame % 60 === 0),
            `circuit complet vérifié au multiple de 60 : ${String(frame)}`);
    }
    check(!sameReplayStep(periodicA, periodicB, 241, true), 'circuit complet vérifié au dernier pas');
}
