/* global console, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
const ids = ['derapage','traverse','caisses','alunir','ferraille','dedale','essaim','orbite','empilo','briqueterie','bubble','serpentin'];
let total = 0;
for (const id of ids) {
    const { createThumbnail, createDemo } = await import(`../src/games/${id}/thumbnail.ts`);
    for (const [kind, factory] of [['thumbnail',createThumbnail],['demo',createDemo]]) {
        const sample = factory(28);
        for(let i=0;i<200;i++) sample.step();
        const started=performance.now();
        for(let i=0;i<2000;i++) sample.step();
        const elapsed=performance.now()-started;
        console.log(`${id} ${kind}: ${(elapsed/2000).toFixed(6)} ms/step (${elapsed.toFixed(2)} ms / 2000)`);
    }
    const started=performance.now();
    for (const status of ['won','lost']) {
        const demo=createDemo(28); demo.engine.status=status; demo.step();
        assert.equal(demo.restarts,1); assert.equal(demo.engine.status,'playing');
    }
    const thumbnail=createThumbnail(28), initial=thumbnail.read();
    thumbnail.step(); assert.notDeepEqual(thumbnail.read(),initial);
    for(let i=1;i<2000;i++) thumbnail.step();
    assert.ok(thumbnail.restarts>0,id);
    const caseTime = performance.now()-started;
    console.log(`V02 ${id}: ${caseTime.toFixed(2)} ms`);
    total+=caseTime;
}
console.log(`V02: ${total.toFixed(2)} ms`);
// V02 is parameterized by game; this also retains the aggregate budget.
assert.ok(total<5000,'V02 must finish in 5 seconds');
