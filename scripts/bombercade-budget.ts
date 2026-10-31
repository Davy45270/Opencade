/** Kept pure so the validation deadline is tested without waiting a minute. */
export function durationFailures(report: { validationSeconds: number }): string[] {
    if (report.validationSeconds >= 60) return [`Validateur trop lent : ${String(report.validationSeconds)} s (limite 60 s)`];
    return [];
}
