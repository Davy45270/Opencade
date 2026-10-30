/* global console, process, performance */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const { Engine } = await import('../src/engines/derapage/engine.ts');
const { controller } = await import('../src/engines/derapage/ai.ts');
const started=performance.now(), digests=[];
for(let level=0;level<30;level++) {
    const e=new Engine(level,28), digest=createHash('sha256');
    for(let frame=0;frame<600;frame++) {
        e.input(controller(e.karts[0],e.track)); e.step(1000/60);
        digest.update(JSON.stringify(e.snapshot(false)));
    }
    digests.push(digest.digest('hex'));
}
const path=process.argv[3];
assert.ok(path,'Pass --record or --compare and a baseline path');
if(process.argv[2]==='--record') writeFileSync(path,JSON.stringify(digests));
else {assert.equal(process.argv[2],'--compare');assert.deepEqual(digests,JSON.parse(readFileSync(path,'utf8')));}
console.log(`Z15: 18000 snapshots, ${process.argv[2]}, ${(performance.now()-started).toFixed(0)} ms`);
