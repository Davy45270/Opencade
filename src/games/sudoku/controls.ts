/** Keyboard of the Sudoku (AC12): arrows move, digits enter (Shift: note), Delete/Backspace/0 erase, N notes, Ctrl+Z or U undo, H or ? hint. */
export type KeyAction =
    | { type: 'move'; dx: number; dy: number }
    | { type: 'digit'; value: number; note: boolean }
    | { type: 'erase' } | { type: 'notes' } | { type: 'undo' } | { type: 'hint' } | { type: 'deselect' };
export interface KeyInput { code: string; key: string; ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean; altKey?: boolean }
const moves: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
/** Pure mapping; digits come from the physical key (`code`), so AZERTY rows work without Shift. */
export function keyAction(e: KeyInput, size: number): KeyAction | null {
    if (e.altKey) return null;
    const move = moves[e.code]; if (move) return { type: 'move', dx: move[0], dy: move[1] };
    if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') return { type: 'undo' };
    if (e.ctrlKey || e.metaKey) return null;
    const digit = /^(?:Digit|Numpad)([0-9])$/.exec(e.code)?.[1] ?? (/^[0-9]$/.test(e.key) ? e.key : undefined);
    if (digit !== undefined) {
        const value = Number(digit);
        if (value === 0) return { type: 'erase' };
        return value <= size ? { type: 'digit', value, note: Boolean(e.shiftKey) } : null;
    }
    if (e.code === 'Backspace' || e.code === 'Delete') return { type: 'erase' };
    if (e.code === 'KeyN') return { type: 'notes' };
    if (e.code === 'KeyU') return { type: 'undo' };
    if (e.code === 'KeyH' || e.key === '?') return { type: 'hint' };
    if (e.code === 'Escape') return { type: 'deselect' };
    return null;
}
