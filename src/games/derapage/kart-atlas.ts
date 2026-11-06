/** The drawn karts, inlined in their own lazily loaded chunk: the offline build precaches it like any script,
 *  and the catalogue never downloads it before the game opens. */
const files = import.meta.glob<string>('./karts/*.webp', { eager: true, query: '?inline', import: 'default' });
export const sprites: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice(8, -5), url]));
