/** Required entries in the validated, fixed-size race data. */
export function required<T>(value: T | undefined): T {
    if (value === undefined) throw new RangeError('Donnée de course absente');
    return value;
}
