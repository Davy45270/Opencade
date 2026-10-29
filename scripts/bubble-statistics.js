/* global URL, process, setTimeout, clearTimeout */
import './ts-loader.js';
import { Worker } from 'node:worker_threads';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import { createHash } from 'node:crypto';
const { LEVELS } = await import('../src/engines/bubble/levels.ts');
export function fingerprint() {
    return createHash('sha256').update(['levels','engine','solver'].map(name=>readFileSync(new URL(`../src/engines/bubble/${name}.ts`,import.meta.url),'utf8')).join('\n')).digest('hex');
}
const output = new URL('../docs/bubble-validation.json',import.meta.url);
export function readStatistics() {
    return JSON.parse(readFileSync(output,'utf8'));
}
export function writeStatistics(report) {
    const pending=new URL('../docs/bubble-validation.json.tmp',import.meta.url);
    writeFileSync(pending,JSON.stringify(report,null,2)+'\n');
    renameSync(pending,output);
}
async function prepare(slot) {
    const worker=new Worker(new URL('./bubble-validation-worker.js',import.meta.url));
    await new Promise((resolve,reject)=>{
        const ready=message=>{if(message.ready){worker.off('message',ready);worker.off('error',reject);resolve();}};
        worker.on('message',ready);worker.once('error',reject);
    });
    slot.worker=worker;
}
async function run(slot,level,seed) {
    if(!slot.worker) await prepare(slot);
    const worker=slot.worker;
    return new Promise((resolve,reject)=>{
        let partial={won:false,shots:null},settled=false;
        const finish=result=>{
            if(settled)return;settled=true;clearTimeout(timer);
            worker.off('message',message);worker.off('error',error);
            if(result.timedOut){slot.worker=null;void worker.terminate();}
            resolve(result);
        };
        const message=message=>{if(message.partial)partial=message.result;else finish({...message.result,timedOut:false});};
        const error=error=>{clearTimeout(timer);reject(error);};
        const timer=setTimeout(()=>finish({...partial,timedOut:true}),level === 8 || level === 9 ? 30000 : 2000);
        worker.on('message',message);worker.once('error',error);
        worker.postMessage({level,seed});
    });
}
export async function collectStatistics() {
    const started=Date.now();
    const slots=[{worker:null},{worker:null}];
    await Promise.all(slots.map(prepare));
    const report={seed:28,seeds:20,shotCap:160,levelTimeoutMs:2000,historicalSearchTimeoutMs:30000,concurrency:2,fingerprint:fingerprint(),durationMs:0,results:[]};
    writeStatistics(report);
    for(let level=0;level<30;level++) {
        const row={level:level+1,name:LEVELS[level].name,mechanics:LEVELS[level].mechanics??[],runs:[],meanShots:null,winRate:0};
        report.results.push(row);
        for(let seed=0;seed<20;seed+=2) {
            await Promise.all([seed,seed+1].map(async seed=>{
                row.runs.push({seed,...await run(slots[seed % 2],level,seed)});
                row.runs.sort((a,b)=>a.seed-b.seed);
                row.meanShots=row.runs.every(r=>r.shots!==null)?row.runs.reduce((sum,r)=>sum+r.shots,0)/row.runs.length:null;
                row.winRate=row.runs.filter(r=>r.won).length/row.runs.length;
                report.durationMs=Date.now()-started;
                writeStatistics(report);
            }));
        }
    }
    await Promise.all(slots.filter(slot=>slot.worker).map(slot=>slot.worker.terminate()));
    return report;
}
if(process.argv[1] === new URL(import.meta.url).pathname) await collectStatistics();
