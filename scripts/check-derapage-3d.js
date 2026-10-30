import process from 'node:process';
import { checkEngineUnchanged } from '../tests/derapage-3d-source.ts';
import { viewCases } from '../tests/derapage-3d-cases.ts';
checkEngineUnchanged();
for (const check of viewCases.filter(check=>check.name.startsWith('Y01'))) { check.run(); process.stdout.write(`PASS ${check.name}\n`); }
// Every viewCases object is already executed by derapage-3d.test.ts.
// The offline audit runs the unchanged unit checks before testing their mutants.
if(process.argv.includes('--audit-mutations')) {
for(const check of viewCases.filter(check=>!check.name.startsWith('Y02'))) { check.run(); process.stdout.write(`PASS ${check.name}\n`); }
const {createViewCases}=await import('../tests/derapage-3d-cases.ts');
const {mutationModule}=await import('./mutation-module.js');
const assert=(await import('node:assert/strict')).default;
for(const [name,before,after] of [
    ['seuil_15','this.fps<30-1e-9','this.fps<15'],
    ['miroir','(-dx*Math.sin(camera.angle)+dy*Math.cos(camera.angle))*scale','(dx*Math.sin(camera.angle)-dy*Math.cos(camera.angle))*scale'],
    ['accelerateurs_chaussee','})) color=0x64edbd;','})) color=theme.road ?? 0x38434d;'],
    ['damier_invisible','Math.abs(across)<1','Math.abs(across)<0'],
    ['arbres_supprimes',"t.trees.map(tree=>({...tree,kind:'tree' as const}))","t.trees.filter(tree=>tree.radius<0).map(tree=>({...tree,kind:'tree' as const}))"],
    ['caisses_invisibles','e.crates.filter(c=>c.cooldown===0)','e.crates.filter(c=>c.cooldown<0)'],
    ['flaques_supprimees',"e.puddles.map(c=>({...c,kind:'puddle' as const}))","e.puddles.slice(0,0).map(c=>({...c,kind:'puddle' as const}))"],
    ['portique_inaccessible','if(a && b) {','if(a && b && a.depth<0) {'],
]) {
    const {module}=await mutationModule('../src/games/derapage/view3d.ts',before,after);
    assert.throws(()=>{for(const check of createViewCases(module).filter(c=>!c.name.startsWith('Y02'))) check.run();},{name:'AssertionError'},name);
    process.stdout.write(`Mutation rejected: ${name}\n`);
}
}
await import('./derapage-3d-integration.js');
