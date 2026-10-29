import './ts-loader.js';
import { parentPort, workerData } from 'node:worker_threads';
const { greedyLevel, solveLevel } = await import('../src/engines/bubble/solver.ts');
const quick = greedyLevel(workerData.level, workerData.seed, 160);
// Keep a completed attempt when the parent interrupts the more expensive search.
parentPort.postMessage({partial:true,result:quick});
const result = quick.won ? quick : solveLevel(workerData.level, workerData.seed, 160);
parentPort.postMessage({result});
parentPort.close();
