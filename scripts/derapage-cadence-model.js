// Deterministic piecewise-linear calibration, Graphics calls -> presentations/s.
// Anchors describe the supplied CPU-only mobile observation, not a stopwatch.
export const cadenceTable = [[0,13],[300,13],[400,11],[990,8],[1850,4]];
// 1960 calls / 9.5 Hz (bamboo) is a noisy observation, excluded from the
// monotone interpolation: Graphics methods and painted areas have unequal cost.
export const noisyCadencePoint = [1960,9.5];
export function graphicsFps(calls) {
    for(let i=1;i<cadenceTable.length;i++) {
        const [x,y]=cadenceTable[i], [a,b]=cadenceTable[i-1];
        if(calls<=x) return b+(y-b)*(calls-a)/(x-a);
    }
    return 4;
}
