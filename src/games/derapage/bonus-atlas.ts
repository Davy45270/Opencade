/** David's drawn bonuses, inlined in their own lazily loaded chunk, like the karts: precached for offline play,
 *  never downloaded by the catalogue before the game opens. */
const files = import.meta.glob<string>('./bonus/*.webp', { eager: true, query: '?inline', import: 'default' });
export const sprites: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, url]) => [path.slice(8, -5), url]));
