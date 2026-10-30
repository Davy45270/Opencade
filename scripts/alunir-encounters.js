/** Replay observations describe encountered rules, never pretend they are commands. */
export function encounters(e) {
    const { x, y, ticks } = e.state, found = [];
    if (e.has('mobile')) found.push('mobile');
    if (e.has('grotte') && y >= 250) found.push('grotte');
    if (e.has('meteores')) found.push('meteores');
    if (e.has('gravite') && x >= 110 && x <= 300 && y >= 180 && y <= 440) found.push('gravite');
    if (e.has('tunnel') && y >= 240 && y <= 380) found.push('tunnel');
    if (e.has('geyser') && x >= 130 && x <= 230 && y >= 300 && y <= 480 && ticks % 240 < 180) found.push('geyser');
    for (const event of e.events) if (event.includes(':')) found.push(event.split(':')[1]);
    return found;
}
