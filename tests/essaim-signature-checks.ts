import assert from 'node:assert/strict';
import { Engine, TICK } from '../src/engines/essaim/engine';
import { pilotWithSignature } from '../src/engines/essaim/pilot';
import { SIGNATURES, signatureState, holdSignature, stepSignature, type SignatureCharacter, type SignatureState, type SignatureTarget } from '../src/engines/essaim/signature';
function item<T>(value: T | undefined): T { assert(value !== undefined); return value; }
export const signatureIds: SignatureCharacter[] = ['panda', 'pandaroux', 'dragon', 'singe', 'licorne'];
export const referenceFormations = {
    rows: [[40,180],[180,180],[320,180],[40,300],[180,300],[320,300]],
    chevron: [[180,120],[110,210],[250,210],[40,300],[320,300],[180,390]],
    ring: [[180,100],[310,175],[310,325],[180,400],[50,325],[50,175]],
};
function targets(points: number[][]): SignatureTarget[] { return points.map(([x,y],id) => ({ id, x: x ?? 0, y: y ?? 0, hp: 100 })); }
function launch(id: SignatureCharacter): SignatureState {
    const s = signatureState(id); holdSignature(s,true,180);
    for (let i=0; i<90; i++) stepSignature(s,[],i,()=>0);
    assert.equal(s.charge,1); assert(holdSignature(s,false,180)); return s;
}
function step(s: SignatureState, enemies: SignatureTarget[], tick: number): void {
    stepSignature(s,enemies,tick,(e,damage)=>{ const actual=Math.min(e.hp,damage); e.hp-=actual; return actual; });
}
export function checkSignatureIdentity(): void {
    for (const id of signatureIds) {
        const e = new Engine(); e.enableSignature(id); e.state.pickups=[];
        e.holdSignature(true); e.step(300); assert.equal(e.state.signature?.charge,0.2);
        assert(e.holdSignature(false)); assert.equal(e.state.signature.kind,SIGNATURES[id]);
        assert(e.state.signature.projectiles.every(p=>p.kind===SIGNATURES[id]));
        assert.equal(e.state.signature.cooldown,8000); assert.equal(e.state.weapons.length,0);
        e.holdSignature(true); e.step(400); assert(!e.holdSignature(false));
        const short = new Engine(); short.enableSignature(id); short.holdSignature(true); short.step(250); assert(!short.holdSignature(false));
        const restored = new Engine(); restored.loadState(e.state); assert.deepEqual(restored.state.signature,e.state.signature);
    }
}
export function checkSignatureMechanics(): void {
    const bao=launch('panda');
    for(let i=0;i<52;i++) step(bao,[],i);
    assert.equal(bao.projectiles.length,5); assert(bao.projectiles.every(p=>p.stage==='fragment' && p.y===320));
    assert.deepEqual(bao.projectiles.map(p=>p.vx),[-180,-90,0,90,180]);
    for (const fragment of bao.projectiles) {
        const isolated=signatureState('panda'); isolated.budget=3;
        isolated.projectiles=[{...fragment,hits:{}}];
        const victim=targets([[fragment.x,fragment.y]]);
        step(isolated,victim,53);
        assert(Math.abs(item(victim[0]).hp-99.85)<0.000001, 'each bao fragment removes exactly 0.15 HP');
    }
    const cluster=targets([[180,310],[182,312]]); step(bao,cluster,53);
    for (const e of cluster) assert(Math.abs(e.hp - 99.25) < 0.000001, 'five fragments each inflict exactly 0.15');
    const leaves=launch('pandaroux'), leafTarget=targets([[210,500]]);
    const leaf=item(leaves.projectiles[0]);
    for(let tick=0;tick<=18;tick++) {
        const previousY=leaf.y; step(leaves,leafTarget,tick);
        assert(Math.abs(leaf.y-previousY+115/60)<0.000001, 'leaf rises at 115 px/s');
        assert(Math.abs(leaves.damage-(tick<18 ? 0.45 : 0.9))<0.000001, `repeat boundary at step ${String(tick)}`);
    }
    assert.notEqual(leaf.x,180,'spiral displacement');
    const fire=launch('dragon'), line=targets([[180,450],[180,350],[230,215]]);
    for(let i=0;i<80;i++) step(fire,line,i);
    assert(item(line[0]).hp<100 && item(line[1]).hp<100,'pierces two separate targets');
    assert.equal(item(line[2]).hp,98.5,'final explosion radius reaches off-axis target');
    assert(fire.projectiles.some(p=>p.stage==='blast'));
    const banana=launch('singe'); item(banana.projectiles[0]).x=13;
    const slowTarget=targets([[13,522]]); step(banana,slowTarget,10);
    assert.equal(banana.projectiles[0]?.vx,150); assert.equal(item(banana.projectiles[0]).bounces,3);
    assert.equal(slowTarget[0]?.bananaUntil,118);
    const e=new Engine(); const first=item(e.state.enemies[0]);
    e.state.enemies=[{...first,phase:'formation',age:0,x:180,y:200,homeX:180,homeY:200,bananaUntil:109}];
    e.step(TICK); assert.equal(item(e.state.enemies[0]).slow,0.45); assert.equal(item(e.state.enemies[0]).age,TICK*0.45);
    e.state.ticks=109; e.step(TICK); assert.equal(item(e.state.enemies[0]).slow,1);
    const star=launch('licorne'), locks=targets([[180,350],[210,350],[150,350],[180,300],[210,300],[150,300],[340,20]]);
    for(let i=0;i<30;i++) step(star,locks,i);
    assert.equal(star.projectiles.length,6); assert(star.projectiles.every(p=>p.stage==='star' && p.target!==6));
    assert.equal(new Set(star.projectiles.map(p=>p.target)).size,6);
    const p=item(star.projectiles[0]), target=item(locks.find(e=>e.id===p.target));
    target.x+=30; const old=p.vx; step(star,locks,31); assert.notEqual(p.vx,old,'tracing recomputes guidance');
}
/** Local regressions: no campaign outcome is needed to detect these rules. */
export function checkSignatureBoundaries(): void {
    const capped=launch('dragon');
    assert.equal(capped.budget,3, 'safety budget is exactly 3 HP');
    const dense=targets([[180,300],[180,280],[180,260],[180,240],[180,220],[180,200]]);
    for(let tick=0;tick<150;tick++) step(capped,dense,tick);
    assert.equal(capped.damage,3); assert.equal(capped.budget,0);
    const blocked=launch('dragon');
    for(let tick=0;tick<150;tick++) stepSignature(blocked,dense,tick,()=>0);
    assert.equal(blocked.budget,3); assert.equal(blocked.damage,0);
    const cooldown=launch('panda');
    for(let tick=0;tick<479;tick++) step(cooldown,[],tick);
    assert(cooldown.cooldown>16 && cooldown.cooldown<17, 'not ready before 8000 ms');
    holdSignature(cooldown,true,180); assert(!holdSignature(cooldown,false,180));
    step(cooldown,[],479); assert.equal(cooldown.cooldown,0);
    holdSignature(cooldown,true,180);
    for(let tick=480;tick<498;tick++) step(cooldown,[],tick);
    assert(holdSignature(cooldown,false,180), 'available after full recharge and new charge');
    const banana=launch('singe'), right=item(banana.projectiles[2]); right.x=347;
    step(banana,[],0); assert.equal(right.x,348); assert.equal(right.vx,-150); assert.equal(right.bounces,3);
    const life=launch('singe'); life.projectiles=[item(life.projectiles[1])];
    const stationary=item(life.projectiles[0]); stationary.vx=0; stationary.vy=0;
    for(let tick=0;tick<359;tick++) step(life,[],tick);
    assert.equal(life.projectiles.length,1); assert.equal(stationary.age,359);
    step(life,[],359); assert.equal(life.projectiles.length,0);
    const fire=launch('dragon'); const bolt=item(fire.projectiles[0]); bolt.y=211; bolt.terminal=210;
    step(fire,[],0); assert.equal(fire.projectiles[0]?.stage,'blast');
    for(let tick=1;tick<=19;tick++) { step(fire,[],tick); assert.equal(fire.projectiles.length,1); }
    step(fire,[],20); assert.equal(fire.projectiles.length,0, 'blast expires at age 20');
    const stars=launch('licorne'); const seed=item(stars.projectiles[0]);
    stars.projectiles=[{...seed,stage:'star',target:0,x:180,y:300}, {...seed,stage:'star',target:0,x:180,y:300}];
    const enemies=targets([[180,300],[190,300]]); item(enemies[0]).hp=0.2;
    step(stars,enemies,0);
    assert(item(enemies[0]).hp<=0); assert.equal(stars.projectiles.length,0);
    assert(Math.abs(item(enemies[1]).hp-99.6)<0.000001, 'dead collision cannot consume retargeted star');
    // A distant replacement proves that the dead lock is discarded before movement.
    const guidance=launch('licorne'); guidance.projectiles=[{...seed,stage:'star',target:0,x:180,y:300}];
    const distant=targets([[180,200],[280,300]]); item(distant[0]).hp=0;
    step(guidance,distant,0); assert.equal(item(guidance.projectiles[0]).target,1);
    assert.equal(item(guidance.projectiles[0]).vx,300); assert.equal(item(guidance.projectiles[0]).vy,0);
    const engine=new Engine(); engine.enableSignature('panda');
    const enemy=item(engine.state.enemies[0]);
    engine.state.enemies=[{...enemy,x:180,y:300,homeX:180,homeY:300,phase:'formation',hp:0.1,captured:false}];
    const signature=item(engine.state.signature); signature.budget=3; signature.cooldown=4000;
    signature.projectiles=[{...seed,hits:{},kind:'bao',stage:'fragment',x:180,y:300,vx:0,vy:0}];
    engine.step(TICK); assert.equal(engine.state.wave,2);
    assert.equal(signature.budget,0); assert.deepEqual(signature.projectiles,[]);
    assert(signature.cooldown>3900, 'wave transition preserves recharge');
}

export function signatureBalance(): Record<SignatureCharacter, number[]> {
    const result={} as Record<SignatureCharacter,number[]>;
    for(const id of signatureIds) result[id]=Object.values(referenceFormations).map(points=>{
        const s=launch(id), enemies=targets(points);
        for(let i=0;i<360;i++) step(s,enemies,i);
        assert(s.budget>0, 'reference must never exhaust the shared budget');
        assert(enemies.every(e=>e.hp>90), 'high HP targets must survive');
        const actual=enemies.reduce((sum,e)=>sum+100-e.hp,0);
        assert(Math.abs(actual-s.damage)<0.000001, 'measure actual HP removed');
        return Math.round(actual*1000)/1000;
    });
    for(let i=0;i<3;i++) {
        const mean=signatureIds.reduce((sum,id)=>sum+(result[id][i] ?? 0),0)/5;
        assert(mean>2,'reference must exercise substantial damage');
        for(const id of signatureIds) assert(Math.abs((result[id][i] ?? 0)-mean)<=mean*0.15,`${id} formation ${String(i)} ${JSON.stringify(result)}`);
    }
    return result;
}
export function checkSignatureCampaign(ids = signatureIds, levels = [0,9,19,29]): void {
    for(const id of ids) for(const level of levels) {
        const e=new Engine(level,458); e.enableSignature(id);
        for(let frame=0;frame<18000 && e.status==='playing';frame++) {
            pilotWithSignature(e,frame);
            e.step(TICK);
        }
        assert.equal(e.status,'won',`${id} level ${String(level+1)}`); assert((e.state.signature?.uses ?? 0)>0);
    }
}
