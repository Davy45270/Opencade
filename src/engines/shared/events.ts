/**
 * A fact an engine reports about a step or an action: the scene reads it (sound, effects) and never writes
 * engine state to learn it. `payload` carries what the scene cannot deduce from a snapshot.
 */
export interface EngineEvent<T extends string = string, P = unknown> {
    readonly type: T;
    readonly payload?: P;
}
