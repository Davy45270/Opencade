/* global console, process, URL */
import { readFileSync, writeFileSync } from 'node:fs';
process.argv.push('--harness-only');
const {sceneFingerRun}=await import('./derapage-mobile-scene.js');
process.argv.pop();
const {circuits,legacyCircuits}=await import('../src/engines/derapage/circuits.ts');
const budgets=JSON.parse(readFileSync(new URL('../tests/derapage-graphics-budget.json',import.meta.url),'utf8'));
const report={};
for(const phase of process.argv.includes('--ablate') ? ['before','width','path','after'] : ['before','after']) {
    const rows=[];
    for(const level of process.argv.includes('--ablate') ? [17,19] : [0,4,9,17,19,26]) {
        const controls=circuits[level].controls;
        try {
            // Before: exact starting geometry, current fixed-step scene and mechanics.
            // This does not pretend to reproduce an older browser's smoothed delta.
            if(process.argv.includes('--ablate') && phase==='before' && [17,19].includes(level)) circuits[level].controls=legacyCircuits[level].controls;
            if(phase==='width') circuits[level].controls=legacyCircuits[level].controls.map(([x,y,w])=>[x,y,w+6]);
            if(phase==='path') circuits[level].controls=controls.map(([x,y,w])=>[x,y,w-6]);
            rows.push(await sceneFingerRun(level,'play',150,72,3251,budgets[phase==='after' && !process.argv.includes('--ablate')?'after':'before'][level].top));
        } finally {circuits[level].controls=controls;}
    }
    report[phase]=rows;
    console.log(phase,JSON.stringify(rows));
}
if(!process.argv.includes('--ablate')) {
    report.calibration = {
        observed: { level:5, graphicsCalls:1850, fps:4, finished:false },
        modeled: await sceneFingerRun(4,'play',150,72,3251,1850),
    };
    console.log('Calibration Le Rocher',JSON.stringify(report.calibration));
}
if(process.argv.includes('--save')) writeFileSync(process.argv[process.argv.indexOf('--save')+1],JSON.stringify(report,null,2)+'\n');
