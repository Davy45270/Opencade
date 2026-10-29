export type Direction = 'up' | 'down' | 'left' | 'right';
export function swipeDirection(dx: number, dy: number, threshold = 30): Direction | null {
    if (Math.hypot(dx, dy) < threshold) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
}
export function joystickDirection(dx: number, dy: number, deadzone = 12): number | null {
    if (Math.hypot(dx, dy) < deadzone) return null;
    return (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
}
export function logicalX(screenX: number, left: number, width: number, logicalWidth: number, offset = 0): number {
    return Math.max(0, Math.min(logicalWidth, (screenX - left) / width * logicalWidth + offset));
}
export function holdCount(elapsed: number, delay = 300, interval = 80): number {
    return elapsed < delay ? 0 : 1 + Math.floor((elapsed - delay) / interval);
}
