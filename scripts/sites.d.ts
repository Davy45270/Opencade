export interface Site { game: string; name: string; shortName: string; themeColor: string; description: string }
export const SITES: Record<string, Site>;
export function siteOf(game: string): string | undefined;
