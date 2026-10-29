import './ts-loader.js';
import { parentPort } from 'node:worker_threads';
const { greedyLevel, solveLevel } = await import('./bubble-solver.ts');
const summary = ({ won, shots }) => ({ won, shots });
parentPort.on('message',({level,seed})=>{
    const quick=greedyLevel(level,seed,160);
    parentPort.postMessage({partial:true,result:summary(quick)});
    const result=quick.won?quick:solveLevel(level,seed,160);
    parentPort.postMessage({result:summary(result)});
});
parentPort.postMessage({ready:true});
