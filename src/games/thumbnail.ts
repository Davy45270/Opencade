export interface Thumbnail {
    step(): void;
    draw(context: CanvasRenderingContext2D): void;
    readonly restarts: number;
    read(): unknown;
}
export type ThumbnailFactory = (seed?: number) => Thumbnail;
export const colors = ['#65e4d0', '#ffb867', '#f080ab', '#92a8ff', '#d8a4ff', '#ffee91'];
export function rect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
    c.fillStyle = color; c.fillRect(x, y, w, h);
}
export function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
    c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
