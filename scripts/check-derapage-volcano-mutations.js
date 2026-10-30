/* global process, console */
import assert from 'node:assert/strict';
process.argv.push('--harness-only');
const {sceneFingerRun}=await import('./derapage-mobile-scene.js');
process.argv.pop();
const {circuits,legacyCircuits}=await import('../src/engines/derapage/circuits.ts');
const {kartMechanic}=await import('../tests/level-catalogue-kart-checks.ts');
const original=circuits[26];
try {
    circuits[26]={...original,bypassEntryInset:undefined};
    assert.throws(()=>kartMechanic('K03',26),{name:'AssertionError',message:/bypass reverse/});
    console.log('Mutation rejected: lateral bypass entry sends the kart backwards');

    circuits[26]={...original,forwardRails:false};
    const impact=await sceneFingerRun(26,'play',150,72,3251,400,12,true);
    assert(impact.collisionInjected && impact.diagnostics.some(row=>row.rail>0),'mutation exercised a real rail collision');
    assert.throws(()=>assert(impact.diagnostics.every(row=>row.backwardRailRebounds===0)),{name:'AssertionError'});
    console.log('Mutation rejected: rail selects the reverse tangent');

    circuits[26]={...original,controls:legacyCircuits[26].controls,jumps:[40],gap:[41],forwardRails:false,jumpLanes:false,bypassEntryInset:undefined};
    const bamboo=await sceneFingerRun(17),volcano=await sceneFingerRun(26,'play',150,72,3251,400,12);
    assert.throws(()=>assert(volcano.raceMs<1.5*bamboo.raceMs),{name:'AssertionError'});
    console.log('Mutation rejected: original narrow bend around the jump');
} finally {circuits[26]=original;}
