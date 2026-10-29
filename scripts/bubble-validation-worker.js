import './ts-loader.js';
import { parentPort } from 'node:worker_threads';
const { greedyLevel, solveLevel } = await import('../src/engines/bubble/solver.ts');
parentPort.on('message',({level,seed})=>{
    const quick=greedyLevel(level,seed,160);
    parentPort.postMessage({partial:true,result:quick});
    const result=quick.won?quick:solveLevel(level,seed,160);
    parentPort.postMessage({result});
});
parentPort.postMessage({ready:true});
