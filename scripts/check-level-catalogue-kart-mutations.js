/* global console, process, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { spawnSync } from 'node:child_process';
import { transpile } from './transpile.js';
const grip='const grip = (leaves ? .12 : snow ? .6 : 1) * bermGrip;';
const cases=[
    ['feuilles_sans_effet_pendant_derapage','src/engines/derapage/physics.ts',grip,'const grip = (leaves && !drifting ? .12 : snow ? .6 : 1) * bermGrip;','K02'],
    ['tas_de_feuilles_invisibles','src/games/derapage/kart-art.ts','if (t.circuit.leaves?.includes(i)) {','if (t.circuit.leaves?.includes(i) && i < 0) {','art'],
    ['plaques_de_lave_invisibles','src/games/derapage/kart-art.ts','if (t.circuit.lava?.includes(i)) {','if (t.circuit.lava?.includes(i) && i < 0) {','art'],
    ['animations_de_piste_figees','src/games/derapage/scene.ts','kartRoadArt(g,t,project,scale,artTime);','kartRoadArt(g,t,project,scale,0);','art'],
    ['tunnel_automne_non_dessine','src/games/derapage/scene.ts','for (const section of t.circuit.tunnel) {',"for (const section of t.circuit.tunnel.filter(() => t.circuit.theme.kart !== 'autumn')) {",'art'],
    ['generateur_joystick_avance_de_150ms','scripts/record-level-catalogue-kart.js','heading:human.events[Math.floor(frame/9)]','heading:human.events[Math.min(Math.floor(frame/9)+1,human.events.length-1)]','art'],
    ['controle_suppression_adherence_reduite','src/engines/derapage/physics.ts',grip,'const grip = (leaves ? 1 : snow ? .6 : 1) * bermGrip;','K02'],
    ['controle_lave_conserve_objet','src/engines/derapage/physics.ts','if (lava) { k.boostMs = 0; k.specialMs = 0; k.driftMs = 0; k.item = null; }','if (lava) { k.boostMs = 0; k.specialMs = 0; k.driftMs = 0; }','K03'],
    ['contournement_cote_unique','src/engines/derapage/physics.ts','(k.bypassSide ?? 1)','1','K03'],
    ['tremplin_sans_largeur','src/engines/derapage/physics.ts',"t.circuit.jumps.some(i=>kartFootprint(t,i,'ramp').contains(k,.8))",'t.circuit.jumps.includes(n.index) && rampTail','K03'],
];
const chosen=process.argv.find(arg=>arg.startsWith('--case='))?.slice(7);
if(chosen) {
    const row=cases.find(c=>c[0]===chosen);assert(row);
    const [,file,old,replacement,check]=row;
    const url=new URL('../'+file,import.meta.url).href,source=readFileSync(new URL(url),'utf8');
    assert.equal(source.split(old).length,2,'mutation anchor occurs once');
    registerHooks({load(target,context,next){
        if(target!==url) return next(target,context);
        const mutated=source.replace(old,replacement);
        return {format:'module',source:file.endsWith('.ts') ? transpile(mutated) : mutated,shortCircuit:true};
    }});
    if(check==='art') await import('./check-level-catalogue-kart.js');
    else {
        const {kartMechanic}=await import('../tests/level-catalogue-kart-checks.ts');
        kartMechanic(check,check==='K02' ? 19 : 26);
    }
} else {
    for(const row of cases) {
        const result=spawnSync(process.execPath,[new URL(import.meta.url).pathname,`--case=${row[0]}`],{encoding:'utf8',timeout:30_000});
        const output=(result.stderr ?? '')+(result.stdout ?? '');
        // A syntax/load/timeout error is not a killed mutation: require an assertion.
        assert(result.status!==0 && /AssertionError/.test(output),`${row[0]} survived or failed outside an assertion:\n${output}`);
        const reason=output.match(/AssertionError[^\n]*(?:\n[^\n]+)?/)?.[0].replace(/\n/g,' ');
        console.log(`KILLED ${row[0]}: ${reason}`);
    }
}
