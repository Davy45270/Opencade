import assert from 'node:assert/strict';
import { Engine, STEP, fieldAt, movingOffset, meteorAt, required, LEVELS } from '../src/engines/alunir/engine';
export function mechanicChecks(Model = Engine): void {
    for (const level of [1, 2, 5, 6, 7, 8]) {
        const passive = new Model(); passive.loadLevel(level); passive.loadState({ x: 180, y: 350 }); passive.step(STEP);
        assert.deepEqual(passive.events, [], 'physical fields cannot invent pilot actions');
    }
    // A-niv-01: independent literal boundary witnesses, one rule at a time.
    assert.deepEqual(fieldAt(['gravite'], 110, 180, 0), { gravity: 0.009, wind: 0, lift: 0 });
    assert.equal(fieldAt(['gravite'], 109, 180, 0).gravity, 0.018);
    assert.equal(fieldAt(['tunnel'], 20, 240, 0).wind, 0.0015);
    assert.equal(fieldAt(['tunnel'], 20, 239, 0).wind, 0);
    assert.equal(fieldAt(['geyser'], 130, 300, 179).lift, 0.012);
    assert.equal(fieldAt(['geyser'], 130, 300, 180).lift, 0);
    assert.equal(fieldAt(['geyser'], 129, 300, 0).lift, 0);
    assert.equal(movingOffset(0), 0); assert.equal(movingOffset(240), 12); assert.equal(movingOffset(480), 0);
    assert.deepEqual(meteorAt(100), { x: 20, y: 310 });
    for (const [mechanic, x, y, key, inside, outside] of [
        ['gravite', 300, 440, 'gravity', 0.009, 0.018],
        ['tunnel', 180, 380, 'wind', 0.0015, 0],
        ['geyser', 230, 480, 'lift', 0.012, 0],
    ] as const) {
        const edge = new Model(); edge.loadLevel({ gravite: 6, tunnel: 7, geyser: 8 }[mechanic]);
        edge.loadState({ x, y, vx: 0, vy: 0 }); edge.step(STEP);
        assert.equal(key === 'wind' ? edge.state.vx : edge.state.vy, key === 'lift' ? 0.018 - inside : inside, `${mechanic} closed upper bounds`);
        assert.equal(fieldAt([mechanic], x, y + 0.001, 0)[key], outside);
        if (mechanic !== 'tunnel') assert.equal(fieldAt([mechanic], x + 0.001, y, 0)[key], outside);
    }
    const gravity = new Model(); gravity.loadLevel(6); gravity.loadState({ x: 180, y: 300, vx: 0, vy: 0 }); gravity.step(STEP); assert.equal(gravity.state.vy, 0.009);
    const wind = new Model(); wind.loadLevel(7); wind.loadState({ x: 180, y: 300, vx: 0, vy: 0 }); wind.step(STEP); assert.equal(wind.state.vx, 0.0015);
    const geyser = new Model(); geyser.loadLevel(8); geyser.loadState({ x: 180, y: 350, ticks: 0, vx: 0, vy: 0 }); geyser.step(STEP); assert.equal(geyser.state.vy, 0.005999999999999998);
    const mobile = new Model(); mobile.loadLevel(2); mobile.loadState({ ticks: 120 }); mobile.step(STEP);
    assert.equal(required(mobile.terrain.pads[0]).x, 156);
    const cave = new Model(); cave.loadLevel(1); cave.loadState({ x: 180, y: 270, vy: -10 }); cave.step(STEP); assert.equal(cave.status, 'lost');
    const meteor = new Model(); meteor.loadLevel(5); meteor.loadState({ x: 180, y: 310, ticks: 233 }); meteor.step(STEP); assert.equal(meteor.status, 'lost');
    const nearMiss = new Model(); nearMiss.loadLevel(5); nearMiss.loadState({ x: 180, y: 340, ticks: 233 }); nearMiss.step(STEP); assert.equal(nearMiss.status, 'playing');
    const beacon = new Model(); beacon.loadLevel(9); beacon.loadState({ x: 180, y: 350 }); beacon.step(STEP); assert.equal(beacon.mission.beacon, true);
    const rescue = new Model(); rescue.loadLevel(10); rescue.loadState({ x: 90, y: 370, vx: -0.2, vy: 0 }); rescue.step(STEP); assert.equal(rescue.mission.rescued, true); assert(rescue.events.includes('recueillir:secours'));
    for (const [level, x, y, flag] of [[9, 218, 350, 'beacon'], [10, 118, 370, 'rescued']] as const) {
        for (const delta of [0, 0.001]) {
            const e = new Model(); e.loadLevel(level); e.loadState({ x: x + delta, y, vx: -0.2, vy: 0 }); e.step(STEP);
            assert.equal(e.mission[flag], delta === 0, `${flag} exact radius`);
        }
    }
    for (const [level, action] of [[3, 'refaire:ravitaillement'], [4, 'prendre:cargo']] as const) {
        const e = new Model(); e.loadLevel(level); e.loadState({ x: 90, y: level === 3 ? 387.9 : 467.9, vx: 0, vy: 0.982, fuel: 12 }); e.step(STEP);
        assert.equal(e.status, 'playing'); assert.equal(e.mission.docked, 1); assert(e.events.includes(action));
        if (level === 3) assert.equal(e.state.fuel, 1800);
        else { assert.equal(e.state.fuel, 12); assert.equal(e.mission.cargo, true); }
        e.input({ thrust: true, left: false, right: false }); e.step(STEP); assert.equal(e.mission.docked, -1); assert(e.state.vy < 0);
    }
    const choice = new Model(); choice.loadState({ x: 65, y: 510.9, vy: 0.982 }); choice.step(STEP); assert.equal(choice.status, 'won'); assert.equal(required(choice.terrain.pads[1]).multiplier, 2); assert.equal(choice.state.score, 2700);
    const ice = new Model(); ice.loadLevel(11); ice.loadState({ x: 180, y: 507.9, vx: 0.5, vy: 0.982 }); ice.step(STEP);
    assert.equal(ice.status, 'playing'); ice.step(STEP); assert.equal(ice.state.vx, 0.47); assert.equal(ice.mission.sliding, true);
    const denied = new Model(); denied.loadLevel(4); denied.loadState({ x: 264, y: 267.9, vx: 0, vy: 0.982 }); denied.step(STEP); assert.equal(denied.status, 'lost');
    const deniedRescue = new Model(); deniedRescue.loadLevel(10); deniedRescue.loadState({ x: 260, y: 517.9, vx: 0, vy: 0.982 }); deniedRescue.step(STEP); assert.equal(deniedRescue.status, 'lost');
    const deniedBeacon = new Model(); deniedBeacon.loadLevel(9); deniedBeacon.loadState({ x: 80, y: 512.9, vx: 0, vy: 0.982 }); deniedBeacon.step(STEP); assert.equal(deniedBeacon.status, 'lost');
}

/** Independent witnesses for written routes, including order, radius and jet phase. */
export function routeChecks(): void {
    const signatures = new Set(LEVELS.map(l => JSON.stringify([l.spawn, l.startY, l.vx, l.vy, l.x, l.y, l.service, l.route])));
    assert.equal(signatures.size, 30);
    for (const [level, expected] of [[1, [65, 300, 0.4, 0.2]], [5, [295, 70, -1, 2]], [10, [310, 410, -0.4, 0]]] as const) {
        const e = new Engine(); e.loadLevel(level);
        assert.deepEqual([e.state.x, e.state.y, e.state.vx, e.state.vy], expected);
    }
    for (const level of [4, 18, 22]) {
        const e = new Engine(); e.loadLevel(level);
        assert(required(e.terrain.pads[1]).y - required(e.terrain.pads[0]).y >= 180, 'cargo demands a real climb');
    }
    const underside = new Engine(); underside.loadLevel(4);
    underside.loadState({ x: 264, y: 310, vx: 0, vy: -20 }); underside.step(STEP);
    assert.equal(underside.status, 'lost', 'a high dock must be approached from above');
    const reversed = new Engine(); reversed.loadLevel(1);
    reversed.loadState({ x: 265, y: 420, vx: 0, vy: 0 }); reversed.step(STEP);
    assert.deepEqual(reversed.events, [], 'second ring cannot bypass the first');
    for (const [x, expected] of [[122, true], [122.001, false]] as const) {
        const e = new Engine(); e.loadLevel(1); e.loadState({ x, y: 440, vx: 0, vy: 0 }); e.step(STEP);
        assert.equal(e.events.includes('passage 0'), expected, 'closed radius 22');
    }
    for (const [ticks, expected] of [[179, false], [180, true], [239, true], [240, false]] as const) {
        const e = new Engine(); e.loadLevel(8); e.loadState({ x: 175, y: 410, vx: 0, vy: 0, ticks }); e.step(STEP);
        assert.equal(e.events.includes('passage 0'), expected, 'cross the jet during its quiet phase');
    }
    const bypass = new Engine(); bypass.loadLevel(1);
    bypass.loadState({ x: 288, y: 497.9, vx: 0, vy: 0.982 }); bypass.step(STEP);
    assert.equal(bypass.status, 'lost', 'a safe direct landing cannot skip the cave crossing');
    const progress = new Engine(); progress.loadLevel(1);
    progress.loadState({ x: 100, y: 440, vx: 0, vy: 0 }); progress.step(STEP);
    const copy = new Engine(); copy.loadState(progress.snapshot());
    assert.deepEqual(copy.nextGate(), [265, 420], 'route progress survives a save');
    const unversioned: Partial<ReturnType<Engine['snapshot']>> = progress.snapshot();
    delete unversioned.catalogueVersion;
    const pass108 = new Engine(); pass108.loadState(unversioned);
    assert.equal(pass108.catalogueVersion, 108, 'unversioned pass 108 keeps its catalogue');
    assert.deepEqual(pass108.nextGate(), [265, 420]);
    copy.loadState({ x: 265, y: 420, vx: 0, vy: 0 }); copy.step(STEP);
    assert.equal(copy.nextGate(), undefined);
}

/** Prerequisites are tested at the first ring with each flag independently missing. */
export function prerequisiteChecks(Model = Engine): void {
    for (const [level, flag] of [[13, 'serviced'], [12, 'beacon'], [15, 'rescued']] as const) {
        for (const ready of [false, true]) {
            const e = new Model(); e.loadLevel(level);
            const gate = required(e.nextGate());
            e.loadState({ x: gate[0], y: gate[1], vx: 0, vy: 0, mission: { ...e.mission, [flag]: ready } });
            e.step(STEP);
            assert.equal(e.events.includes('passage 0'), ready, flag + ' before ring');
        }
    }
    for (const [vx, vy, expected] of [[0, 0, false], [0, 0.8, false], [-0.2, 0.3, false], [-0.2, 0, true], [0.2, 0, true]] as const) {
        const e = new Model(); e.loadLevel(10); e.loadState({ x: 90, y: 342, vx, vy }); e.step(STEP);
        assert.equal(e.mission.rescued, expected, 'rescue requires lateral velocity');
    }
}
