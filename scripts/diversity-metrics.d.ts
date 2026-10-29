export interface DiversityRow {
    level: number;
    parameters: Record<string, number>;
    elements: string[];
    layout: string[];
}
export function jaccard(a: string[], b: string[]): number;
export function measureDiversity(rows: DiversityRow[]): {
    noveltyCount: number;
    noveltyLevels: number[];
    cloneShare: number;
    maxGapWithoutNovelty: number;
    score: number;
};
