import { Engine } from '../src/engines/derapage/engine';
import { at, createTrack } from '../src/engines/derapage/track';
import { legacyCircuits, type Circuit } from '../src/engines/derapage/circuits';
import { required } from '../src/engines/derapage/access';
/** Restore the frozen geometry and its starting grid/crates together. */
export function restoreHistoricalGeometry(e: Engine, circuit: Circuit): void {
    e.track=createTrack(e.level,e.seed,circuit);
    for(const k of e.karts) {
        const p=at(e.track,-3-Math.floor(k.id/2)*4),next=at(e.track,1-Math.floor(k.id/2)*4);
        const angle=Math.atan2(next.y-p.y,next.x-p.x),offset=k.id%2===0 ? -2 : 2;
        Object.assign(k,{x:p.x-Math.sin(angle)*offset,y:p.y+Math.cos(angle)*offset,angle});
    }
    e.crates=[16,40,64,88].map(i=>({...required(e.track.points[i]),cooldown:0}));
}
/** Test-only circular pads for the frozen K01–K03 evidence. Never imported by production. */
export class HistoricalBoostEngine extends Engine {
    override loadLevel(level: number, seed=28): void {
        super.loadLevel(level,seed);
        if([17,19].includes(level)) restoreHistoricalGeometry(this,{...this.track.circuit,controls:required(legacyCircuits[level]).controls});
        if(level===26) restoreHistoricalGeometry(this,{...this.track.circuit,controls:required(legacyCircuits[level]).controls,jumps:[40],gap:[41],forwardRails:false,jumpLanes:false,bypassEntryInset:undefined});
        this.track.circuit={...this.track.circuit,hazardWidthFraction:1};
        for (const boost of this.track.boosts) delete boost.length;
    }
}
