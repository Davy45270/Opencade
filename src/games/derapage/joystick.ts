import { joystickHeading, THUMB_DEAD_ZONE, FULL_DEFLECTION } from '../../engines/derapage/physics';
export interface Thumb { id: number; x: number; y: number; dx: number; dy: number }
export function beginThumb(id: number, x: number, y: number): Thumb { return { id,x,y,dx:0,dy:0 }; }
export function moveThumb(thumb: Thumb, x: number, y: number): void { thumb.dx=x-thumb.x; thumb.dy=y-thumb.y; }
export function thumbDirection(thumb: Thumb | null): number | undefined { return thumb ? joystickHeading(thumb.dx,thumb.dy) : undefined; }
export function thumbIntensity(thumb: Thumb): number { return Math.min(1,Math.max(0,Math.hypot(thumb.dx,thumb.dy)-THUMB_DEAD_ZONE)/(FULL_DEFLECTION-THUMB_DEAD_ZONE)); }
/** Canvas hit testing excludes separate action buttons. Coordinates are CSS pixels. */
export function acceptsThumb(canvasTarget: boolean, clientY: number, top: number, height: number, fixed: boolean): boolean {
    return canvasTarget && (!fixed || (clientY-top)*640/height>=96);
}
