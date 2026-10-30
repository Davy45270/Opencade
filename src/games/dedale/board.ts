/** Exact wall cells painted by the scene, in display order (19 × 23). */
export function displayedWalls(maze: readonly boolean[]): number[] {
    return maze.flatMap((floor, at) => floor ? [] : [at]);
}
