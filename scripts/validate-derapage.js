import './ts-loader.js';
/* global console */
const { Engine } = await import('../src/engines/derapage/engine.ts');
const { controller, aiInput, aiSpeed } = await import('../src/engines/derapage/ai.ts');
const { physics } = await import('../src/engines/derapage/physics.ts');
const { checkpoint } = await import('../src/engines/derapage/race.ts');
const { validateTrack, difficulty, nearest, createTrack, shapeSignature, signatureDistance, gateLine, distance, at } = await import('../src/engines/derapage/track.ts');
const { Random } = await import('../src/engines/shared/random.ts');
export function measure(level, ai = false) {
    const e = new Engine(level, 28), k = e.karts[0], r = new Random(28); let error = 0, frames = 0, grass = 0;
    for (; frames < 18000 && k.lap < 3; frames++) {
        const previous = { x: k.x, y: k.y };
        const input = ai ? aiInput(k, e.track, level, r.next() * 2 - 1) : controller(k, e.track);
        physics(k, input, e.track, 1 / 60, difficulty(level).grassGrip, ai ? aiSpeed(k, e.track, level) : 24);
        checkpoint(k, previous, e.track, (frames + 1) * 1000 / 60);
        const n = nearest(e.track, k);
        if (n.distance > e.track.widths[n.index] / 2) grass++;
        error += nearest({ ...e.track, points: e.track.racingLine }, k).distance;
    }
    if (!ai && frames / 60 >= 90) throw new Error(`Z13 circuit ${String(level+1)} trop lent`);
    if (k.lap !== 3) throw new Error(`Z13 circuit ${String(level + 1)} bloqué`);
    if (ai && grass / frames > .05) throw new Error("Z24 herbe IA");
    return { grass: grass / frames * 100, treeHits: k.treeHits ?? 0, lap: frames / 180, error: error / frames };
}
const tracks = Array.from({ length: 30 }, (_, i) => createTrack(i));
const signatures = tracks.map(shapeSignature);
const neighbours = signatures.map((s,i) => Math.min(...signatures.filter((_,j)=>i!==j).map(other=>signatureDistance(s,other))));
console.log(`Distance minimale Z26 : ${Math.min(...neighbours).toFixed(6)} ; seuil : 0.15`);
if (Math.min(...neighbours) <= .15) throw new Error('Z26 diversité insuffisante');
for (const t of tracks) {
    const transformed = { ...t, points: t.points.map(p=>({ x:-p.y*1.3, y:p.x*1.3 })), distances:t.distances.map(d=>d*1.3), length:t.length*1.3 };
    if (signatureDistance(shapeSignature(t),shapeSignature(transformed))>1e-6) throw new Error('Z26 invariance');

    const line = gateLine(t,0), p=t.points[0];
    if (Math.hypot((line.a.x+line.b.x)/2-p.x,(line.a.y+line.b.y)/2-p.y)>1e-6) throw new Error('Z27 centre porte zéro');
    const before=t.points[95], after=t.points[1], len=distance(before,after);
    const dx=(after.x-before.x)/len, dy=(after.y-before.y)/len;
    const k={ ...new Engine().karts[0], x:p.x+dx*.01, y:p.y+dy*.01, gate:0 };
    checkpoint(k,{ x:p.x-dx*.01,y:p.y-dy*.01 },t,100);
    if (k.lap!==1) throw new Error('Z27 franchissement arrivée');
    if (distance(t.finishLine.a,line.a)>1e-6 || distance(t.finishLine.b,line.b)>1e-6 || Math.abs(distance(line.a,line.b)-t.widths[0])>1e-6) throw new Error('Z27 arrivée');
}
console.log('| Niveau | Nom | Famille | Longueur | Largeur min. | Virages | Signature voisine | Tour pilote (s) | Tour IA (s) | Écart IA | Herbe IA (%) | Bandes | Décor | Chocs pilote |');
console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |');
for (let level = 0; level < 30; level++) {
    const e = new Engine(level, 28);
    if (!validateTrack(e.track)) throw new Error(`Z12 circuit ${String(level+1)} invalide`);
    for (const seed of [1,28,999]) {
        const track=createTrack(level,seed);
        for (const decor of track.trees) {
            const n=nearest(track,decor);
            if (n.distance < track.widths[n.index]/2+2*decor.radius) throw new Error('Z21 marge décor');
        }
    }
    const pilot = measure(level), ai = measure(level, true);
    console.log(`| ${String(level + 1)} | ${e.track.circuit.name} | ${e.track.circuit.family} | ${e.track.length.toFixed(1)} | ${Math.min(...e.track.widths).toFixed(2)} | ${signatures[level].turns.length} | ${neighbours[level].toFixed(4)} | ${pilot.lap.toFixed(2)} | ${ai.lap.toFixed(2)} | ${ai.error.toFixed(3)} | ${ai.grass.toFixed(2)} | ${e.track.boosts.length} | ${e.track.trees.length} | ${pilot.treeHits} |`);
}

// Also drive ordinary six-kart races at both endpoints (items and collisions active).
for (const level of [0, 29]) {
    const e = new Engine(level, 28);
    for (let frame = 0; frame < 10800 && e.status === 'playing'; frame++) {
        e.input(controller(e.karts[0], e.track)); e.step(1000 / 60);
    }
    if (e.status !== 'won' || e.karts[0].lap !== 3) throw new Error('Course complète non terminée sur le podium');
}

// Legal finish scenario shared with the interactive hook: steering is necessary.
for (const steer of [0,1]) {
    const e=new Engine(), k=e.karts[0], p=at(e.track,e.track.length-3), q=at(e.track,0);
    Object.assign(k,p,{ angle:Math.atan2(q.y-p.y,q.x-p.x)-1.45, lap:2,gate:0,passed:35 });
    e.input({ steer,drift:false,bonus:false }); e.step(1500);
    if (e.status!==(steer===1?'won':'playing')) throw new Error('Z08 scénario arrivée');
}

// Simulation clocks: the same timestamped controls survive split advances exactly.
{
    const a = new Engine(), b = new Engine();
    for (let frame = 0; frame < 6000 && a.status === 'playing'; frame++) {
        const input = controller(a.karts[0], a.track);
        a.input(input); b.input(input);
        a.step(1000 / 60); b.step(1000 / 120); b.step(1000 / 120);
        if (JSON.stringify(a.snapshot().timing) !== JSON.stringify(b.snapshot().timing)) throw new Error('Z28 rejeu chrono');
    }
    if (a.lapTimesMs.length !== 3 || a.bestLapMs !== Math.min(...a.lapTimesMs)) throw new Error('Z28 meilleur tour');
    const e = new Engine(), k = e.karts[0], p = e.track.points[0], before = e.track.points[95], after = e.track.points[1];
    const angle = Math.atan2(after.y-before.y, after.x-before.x);
    for (const frame of [120,300,390]) {
        e.frames = frame-1;
        Object.assign(k,{ x:p.x-Math.cos(angle)*.1,y:p.y-Math.sin(angle)*.1,angle,vx:Math.cos(angle)*24,vy:Math.sin(angle)*24,gate:0 });
        e.step(1000/60);
    }
    if (JSON.stringify(e.lapTimesMs) !== JSON.stringify([120,180,90].map(n=>n*(1000/60)))) throw new Error('Z28 durée en pas');
    console.log('Z28 : rejeu exact, durées en pas et minimum validés.');
}
{
    const { readSave, recordCircuitLap } = await import('../src/shell/storage.ts');
    let raw = JSON.stringify({ unlocked:1,best:0 }), writes = 0;
    const storage = { getItem:()=>raw,setItem:(_key,value)=>{ raw=value; writes++; } };
    const save = readSave(storage,'derapage',30);
    recordCircuitLap(storage,save,0,2000);
    if (recordCircuitLap(storage,save,0,3000) || recordCircuitLap(storage,save,0,2000) || writes!==1) throw new Error('Z29 record écrasé');
    recordCircuitLap(storage,save,1,4000); recordCircuitLap(storage,save,0,1500);
    const loaded=readSave(storage,'derapage',30);
    if (loaded.circuitRecords['0']!==1500 || loaded.circuitRecords['1']!==4000) throw new Error('Z29 circuits');
    const broken={ getItem:()=>{ throw new Error('read'); },setItem:()=>{ throw new Error('write'); } };
    recordCircuitLap(broken,readSave(broken,'derapage',30),2,1234);
    console.log('Z29 : records stricts par circuit, sauvegarde ancienne et exceptions validés.');
}
