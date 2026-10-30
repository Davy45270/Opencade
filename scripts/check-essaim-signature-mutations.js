/* global console, URL */
import './ts-loader.js';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mutationModule } from './mutation-module.js';
const signature = '../src/engines/essaim/signature.ts', engine = '../src/engines/essaim/engine.ts';
export const signatureMutations = [];
for (const [name,file,before,after,check] of [
    ['default signature for everyone',signature,'s.kind = SIGNATURES[s.character];',"s.kind = SIGNATURES.panda;",'checkSignatureIdentity'],
    ['banana slow ignored',engine,'? 0.45 : 1','? 1 : 1','checkSignatureMechanics'],
    ['fireball final explosion removed',signature,'if (Math.hypot(e.x-p.x,e.y-p.y) <= 72)', 'if (false)', 'checkSignatureMechanics'],
    ['fireball explosion doubled',signature,'hurt(blast, e, 1.5)','hurt(blast, e, 3)','checkSignatureMechanics'],
    ['fireball damage budget doubled',signature,'s.budget = 3;',"s.budget = s.kind === 'dragonfire' ? 6 : 3;",'checkSignatureBoundaries'],
    ['bao doubled',signature,"p.kind === 'bao' ? 0.15","p.kind === 'bao' ? 0.3",'signatureBalance'],
    ['leaf rise doubled',signature,'p.vy = -115;','p.vy = -230;','checkSignatureMechanics'],
    ['leaf repeats at 17',signature,'< 18)) return;','< 17)) return;','checkSignatureMechanics'],
    ['dead target lock retained',signature,'e.id === p.target && e.hp > 0','e.id === p.target','checkSignatureBoundaries'],
    ['right bounce removed',signature,'(p.x < 12 || p.x > 348)','(p.x < 12)','checkSignatureBoundaries'],
    ['projectile lifetime 180',signature,'p.age < 360','p.age < 180','checkSignatureBoundaries'],
    ['recharge shortened',signature,'s.cooldown - 1000 / 60','s.cooldown - 1000 / 59','checkSignatureBoundaries'],
    ['blast lifetime two steps',signature,'p.age < 20','p.age < 2','checkSignatureBoundaries'],
    ['dead collision absorbs star',signature,'if (e.hp <= 0) continue;','if (false) continue;','checkSignatureBoundaries'],
    ['wave retains projectiles',engine,'this.state.signature.projectiles = [];','this.state.signature.projectiles = this.state.signature.projectiles;','checkSignatureBoundaries'],
    ['wave retains budget',engine,'this.state.signature.budget = 0;','this.state.signature.budget = this.state.signature.budget;','checkSignatureBoundaries'],
]) {
    const mutant = await mutationModule(file,before,after);
    const mutatedSignature = file === signature ? mutant.url : undefined;
    const mutatedEngine = file === engine ? mutant.url : (await mutationModule(engine,'export class Engine','export class Engine',{'./signature':mutatedSignature})).url;
    const checks = await mutationModule('../tests/essaim-signature-checks.ts','export const signatureIds','export const signatureIds',{
        'node:assert/strict':'node:assert/strict',
        '../src/engines/essaim/engine':mutatedEngine,
        ...(mutatedSignature ? {'../src/engines/essaim/signature':mutatedSignature} : {}),
    });
    let killed=false;
    try { checks.module[check](); } catch { killed=true; }
    const source=readFileSync(new URL(file,import.meta.url),'utf8');
    const line=source.slice(0,source.indexOf(before)).split('\n').length;
    const result={name,file:file.slice(3),line,killed}; signatureMutations.push(result); console.log(result);
    assert(killed,`Survived: ${name}`);
}
