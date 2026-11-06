/** David's crate seen from above (decision of 06/11), inlined in its own lazily loaded chunk like Pistouille's
 *  drawings: precached for offline play, never downloaded by the catalogue before the game opens. */
const files = import.meta.glob<string>('./crate/*.webp', { eager: true, query: '?inline', import: 'default' });
export const crate: string | undefined = files['./crate/caisse.webp'];
