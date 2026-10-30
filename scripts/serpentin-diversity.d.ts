export function serpentinDiversity(mod: unknown, levels?: number[]): {
    score: number; noveltyCount: number; noveltyLevels: number[]; cloneShare: number; maxGapWithoutNovelty: number;
    levels: { level: number; elements: string[]; newElements: string[] }[];
};
export function serpentinFeatures(e: unknown, d: unknown, layoutOf?: (level: number) => unknown): { elements: string[]; layout: string[]; params: Record<string, number> };
