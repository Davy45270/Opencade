/** David's drawn marbles (sheets 17139 and 17140), inlined in their own lazily loaded chunk: the offline build
 *  precaches it like any script, and the catalogue never downloads it before the game opens.
 *  c0-c5 are the engine colours (green, orange, pink, violet, yellow, blue); `prism` is the wild bubble. */
const files = import.meta.glob<string>('./marbles/*.webp', { eager: true, query: '?inline', import: 'default' });
export const marbles: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice(10, -5), url]));
