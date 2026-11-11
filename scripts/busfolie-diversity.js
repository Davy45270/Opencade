// Bus en folie: board descriptors read from the real levels (size, vehicles, cones, colours, exits, line, one way).
import { measureDiversity } from './diversity-metrics.js';
/** Elements: each mechanism present on the board; layout: the occupied cells; params: sizes and counts. */
export function busfolieFeatures(level) {
    const buses = level.buses.filter(b => b.color !== 'gris'), cars = level.buses.length - buses.length;
    const colours = new Set(buses.map(b => b.color)), elements = new Set(['bus', 'queue', `size:${level.board.width}`]);
    for (const c of colours) elements.add(`colour:${c}`);
    if (cars) elements.add('car');
    if (level.obstacles.length) elements.add('cone');
    if (buses.some(b => b.length === 3)) elements.add('coach');
    if (level.exits.some(e => e.color)) elements.add('coloured-exit');
    const oneWay = buses.filter(b => b.oneWay).length, coaches = buses.filter(b => b.length === 3).length;
    if (oneWay) elements.add('one-way');
    // Counts that change how the yard is read: several one-way buses, several coaches, a lane shared by two buses.
    if (oneWay > 1) elements.add(`one-way:${oneWay}`);
    if (coaches > 2) elements.add(`coaches:${coaches}`);
    // Load thresholds, not gameplay novelties: levels 20-30 add no mechanism and grow by load (five parked cars,
    // nine buses, more buses than the yard is wide); the thresholds keep neighbouring boards measurably apart.
    if (cars >= 5) elements.add('cars:5');
    if (buses.length >= 9) elements.add('buses:9');
    if (buses.length > level.board.width) elements.add('crowded');
    const lanes = buses.map(b => `${b.orientation}${b.orientation === 'horizontal' ? b.y : b.x}`);
    if (new Set(lanes).size < lanes.length) elements.add('shared-lane');
    if (level.exits.some(e => e.color) && level.exits.some(e => !e.color)) elements.add('mixed-exits');
    if (buses.length > colours.size) elements.add('twins');
    if (level.passengerQueue.length > buses.length) elements.add('groups');
    const layout = [...level.buses.map(b => `${b.color}${b.length}${b.orientation[0]}@${b.x},${b.y}`), ...level.obstacles.map(o => `cone@${o.x},${o.y}`)];
    return { elements: [...elements].sort(), layout, params: { width: level.board.width, buses: buses.length, cars, cones: level.obstacles.length, colours: colours.size, groups: level.passengerQueue.length, exits: level.exits.length, par: level.par } };
}
export function busfolieDiversity(levels, indices = levels.map((_, i) => i)) {
    return measureDiversity(indices.map((index, i) => {
        const f = busfolieFeatures(levels[index]);
        return { level: i + 1, parameters: f.params, elements: f.elements, layout: f.layout };
    }));
}
