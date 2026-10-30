/* global console, process, URL */
import { writeFileSync, readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transpile } from './transpile.js';
process.argv.push('--harness-only');
const { mount, useSceneModule } = await import('./derapage-mobile-scene.js');
process.argv.pop();
// An optional baseline is an explicitly supplied source tree, independent of version control.
const modules=new Map();
function startingModule(file) {
    if(modules.has(file)) return modules.get(file);
    const argument=process.argv.indexOf('--source-root');
    if(argument<0 || !process.argv[argument+1]) throw new Error('--baseline requires --source-root <source tree>');
    const root=pathToFileURL(resolve(process.argv[argument+1])+'/');
    const source=readFileSync(new URL(file,root),'utf8');
    const code=source.replace(/from '([^']+)'/g,(_,name)=>{
        if(!name.startsWith('.')) return `from '${name}'`;
        const url=new URL(`${name}.ts`,new URL(file,root));
        const path=fileURLToPath(url).slice(fileURLToPath(root).length);
        return `from ${JSON.stringify(path.startsWith('src/games/derapage/') ? startingModule(path) : url.href)}`;
    });
    const url='data:text/javascript,'+encodeURIComponent(transpile(code));modules.set(file,url);return url;
}
export async function measureAll() {
    const rows=[];
    if(process.argv.includes('--baseline')) {
        useSceneModule(await import(startingModule('src/games/derapage/scene.ts')));
    }
    for(let level=0;level<30;level++) {
        const h=await mount('derapage','dragon',false);h.session.send('start');h.engine.loadLevel(level,28);h.frame();
        const row={level:level+1,name:h.engine.track.circuit.name,top:0,view3d:0,topMean:0,view3dMean:0,topIndex:0,view3dIndex:0};
        for(const [key,value] of [['top',false],['view3d',true]]) {
            h.scene.view3d=value;
            for(const [index,p] of h.engine.track.points.entries()) {
                Object.assign(h.engine.karts[0],p);h.frame();if(h.calls.length>row[key]) {row[key]=h.calls.length;row[key+'Index']=index;}row[key+'Mean']+=h.calls.length/96;
            }
        }
        h.cleanup();rows.push(row);
    }
    useSceneModule(undefined);
    return rows;
}
if(process.argv.includes('--report')) {
    const rows=await measureAll();
    if(process.argv.includes('--save')) writeFileSync(process.argv[process.argv.indexOf('--save')+1],JSON.stringify(rows,null,2)+'\n');
    if(process.argv.includes('--check')) {
        const profile=JSON.parse(readFileSync(new URL('../tests/derapage-graphics-budget.json',import.meta.url),'utf8'));
        const reference=profile[process.argv.includes('--baseline')?'before':'after'];
        assert.equal(rows.length,30);
        for(const row of rows) for(const view of ['top','view3d']) {
            assert.equal(row[view],reference[row.level-1][view],`complete sweep ${row.level}/${view}`);
            assert.throws(()=>assert(row[view]+1<=reference[row.level-1][view]),{name:'AssertionError'},'inflated sweep rejected');
        }
    }
    console.log(JSON.stringify(rows));
}
