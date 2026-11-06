/** David's horizons, one lazily loaded chunk per file: a circuit downloads only the horizon of its cup; all are
 *  precached for offline play, and the catalogue never downloads them before the game opens. */
export const loaders = import.meta.glob<string>('./horizons/*.webp', { query: '?inline', import: 'default' });
